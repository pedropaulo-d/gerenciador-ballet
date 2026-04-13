"use server";

import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";

const supabase = getServiceSupabase();
import type { AttendanceStatus } from "@/types/database";
import { getCurrentMonth, getCurrentMonthRange } from "@/lib/formatters";

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------- Return type ----------

export type AbsenceRecord = {
  date: string;
  status: "absent" | "justified";
  justification: string | null;
};

export type StudentSummary = {
  student: {
    id: string;
    fullName: string;
    birthDate: string | null;
    guardianName: string;
    guardianPhone: string | null;
    medicalNotes: string | null;
    internalObservations: string | null;
  };
  enrollment: {
    className: string;
    locationName: string;
  } | null;
  financial: {
    currentMonthStatus: string | null; // 'paid' | 'pending' | 'overdue' | null
    hasOverdueHistory: boolean;
  };
  attendance: {
    present: number;
    absent: number;
    justified: number;
  };
  absenceHistory: AbsenceRecord[];
};

// ---------- Query row shapes ----------

type EnrollmentJoinRow = {
  id: string;
  class: { name: string; location: { name: string } | null } | null;
};

type FeeStatusRow = {
  status: string;
};

type AttendanceDetailRow = {
  date: string;
  status: AttendanceStatus;
  justification: string | null;
};

// ---------- Action ----------

export async function getStudentSummary(
  studentId: string
): Promise<ActionResult<StudentSummary>> {
  try {
    const parsedId = uuidSchema.safeParse(studentId);
    if (!parsedId.success) return { success: false, error: "ID da aluna invalido." };

    // 1. Student data
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, birth_date, guardian_name, guardian_phone, medical_notes, internal_observations")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return { success: false, error: studentError?.message ?? "Aluna não encontrada." };
    }

    // 2. Active enrollment with class + location
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, class:classes(name, location:locations(name))")
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1);

    const enrollmentRow = (enrollments as EnrollmentJoinRow[] | null)?.[0] ?? null;
    const enrollmentId = enrollmentRow?.id ?? null;

    const enrollmentInfo = enrollmentRow?.class
      ? {
          className: enrollmentRow.class.name,
          locationName:
            (Array.isArray(enrollmentRow.class.location)
              ? enrollmentRow.class.location[0]?.name
              : enrollmentRow.class.location?.name) ?? "—",
        }
      : null;

    // 3–5. Financial + Attendance (parallel when enrollment exists)
    const referenceMonth = getCurrentMonth();
    const { start, end } = getCurrentMonthRange();
    let currentMonthStatus: string | null = null;
    let hasOverdueHistory = false;
    const attendanceCounts = { present: 0, absent: 0, justified: 0 };
    const absenceHistory: AbsenceRecord[] = [];

    if (enrollmentId) {
      const [feeRes, overdueRes, attendanceRes] = await Promise.all([
        // Current month fee status
        supabase
          .from("monthly_fees")
          .select("status")
          .eq("enrollment_id", enrollmentId)
          .eq("reference_month", referenceMonth)
          .limit(1),
        // Any overdue fees in history
        supabase
          .from("monthly_fees")
          .select("id", { count: "exact", head: true })
          .eq("enrollment_id", enrollmentId)
          .eq("status", "overdue"),
        // All attendance records (used for both counts and history)
        supabase
          .from("attendance")
          .select("date, status, justification")
          .eq("enrollment_id", enrollmentId)
          .order("date", { ascending: false }),
      ]);

      currentMonthStatus = (feeRes.data as FeeStatusRow[] | null)?.[0]?.status ?? null;
      hasOverdueHistory = (overdueRes.count ?? 0) > 0;

      // Single pass: compute monthly counts + build absence history
      for (const r of (attendanceRes.data ?? []) as AttendanceDetailRow[]) {
        if (r.date >= start && r.date <= end && r.status in attendanceCounts) {
          attendanceCounts[r.status]++;
        }
        if (r.status === "absent" || r.status === "justified") {
          if (absenceHistory.length < 20) {
            absenceHistory.push({
              date: r.date,
              status: r.status,
              justification: r.justification,
            });
          }
        }
      }
    }

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          fullName: student.full_name,
          birthDate: student.birth_date,
          guardianName: student.guardian_name,
          guardianPhone: student.guardian_phone,
          medicalNotes: student.medical_notes,
          internalObservations: student.internal_observations,
        },
        enrollment: enrollmentInfo,
        financial: {
          currentMonthStatus,
          hasOverdueHistory,
        },
        attendance: attendanceCounts,
        absenceHistory,
      },
    };
  } catch {
    return { success: false, error: "Falha ao buscar perfil da aluna." };
  }
}

/**
 * Count students with 'absent' attendance status on a given date.
 */
export async function getTodayAbsencesCount(
  date: string
): Promise<ActionResult<number>> {
  try {
    const parsedDate = dateSchema.safeParse(date);
    if (!parsedDate.success) return { success: false, error: "Data invalida." };

    const { count, error } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .eq("status", "absent");

    if (error) return { success: false, error: error.message };
    return { success: true, data: count ?? 0 };
  } catch {
    return { success: false, error: "Falha ao contar faltas." };
  }
}
