"use server";

import { getServiceSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";

const supabase = getServiceSupabase();
import type { AttendanceRow, AttendanceStatus } from "@/types/database";

// ---------- Query row shapes ----------

type StudentJoin = { full_name: string };

type EnrollmentStudentRow = {
  id: string;
  student: StudentJoin | StudentJoin[] | null;
};

type AttendanceRecord = {
  enrollment_id: string;
  status: AttendanceStatus;
  justification: string | null;
};

// ---------- Actions ----------

/**
 * Fetch active enrollments for a class with their attendance status for a given date.
 * Returns one row per enrollment: student name + status (null if not yet recorded).
 */
export async function getAttendanceByClassAndDate(
  classId: string,
  date: string
): Promise<ActionResult<AttendanceRow[]>> {
  try {
    // 1. Get active enrollments for this class with student name
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, student:students(full_name)")
      .eq("class_id", classId)
      .eq("status", "active")
      .order("id");

    if (enrollError) return { success: false, error: enrollError.message };
    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [] };
    }

    const typedEnrollments = enrollments as EnrollmentStudentRow[];
    const enrollmentIds = typedEnrollments.map((e) => e.id);

    // 2. Get existing attendance records for these enrollments on this date
    const { data: records, error: attError } = await supabase
      .from("attendance")
      .select("enrollment_id, status, justification")
      .in("enrollment_id", enrollmentIds)
      .eq("date", date);

    if (attError) return { success: false, error: attError.message };

    const recordMap = new Map<string, { status: AttendanceStatus; justification: string | null }>();
    for (const r of (records ?? []) as AttendanceRecord[]) {
      recordMap.set(r.enrollment_id, { status: r.status, justification: r.justification });
    }

    // 3. Merge: one row per enrollment
    const rows: AttendanceRow[] = typedEnrollments.map((e) => {
      // Supabase returns object for many-to-one, but handle array as fallback
      const s = Array.isArray(e.student) ? e.student[0] : e.student;
      const record = recordMap.get(e.id);
      return {
        enrollmentId: e.id,
        studentName: s?.full_name ?? "—",
        status: record?.status ?? null,
        justification: record?.justification ?? null,
      };
    });

    // Sort alphabetically by student name
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));

    return { success: true, data: rows };
  } catch {
    return { success: false, error: "Falha ao buscar chamada." };
  }
}

/**
 * Save attendance records for a class on a given date.
 * Upserts entries with a status and deletes entries that were cleared.
 */
export async function saveAttendance(
  date: string,
  records: { enrollmentId: string; status: AttendanceStatus; justification?: string | null }[],
  removals: string[] = []
): Promise<ActionResult> {
  try {
    if (records.length === 0 && removals.length === 0) {
      return { success: false, error: "Nenhum registro para salvar." };
    }

    // Delete cleared records
    if (removals.length > 0) {
      const { error: deleteError } = await supabase
        .from("attendance")
        .delete()
        .in("enrollment_id", removals)
        .eq("date", date);

      if (deleteError) return { success: false, error: deleteError.message };
    }

    // Upsert active records
    if (records.length > 0) {
      const rows = records.map((r) => ({
        enrollment_id: r.enrollmentId,
        date,
        status: r.status,
        justification: r.status === "justified" ? (r.justification?.trim() || null) : null,
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "enrollment_id,date" });

      if (error) return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch {
    return { success: false, error: "Falha ao salvar chamada." };
  }
}
