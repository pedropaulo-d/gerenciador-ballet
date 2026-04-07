"use server";

import { supabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";
import type { AttendanceStatus } from "@/types/database";

// ---------- Return type ----------

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
};

// ---------- Query row shapes ----------

type EnrollmentJoinRow = {
  id: string;
  class: { name: string; location: { name: string } | null } | null;
};

type FeeStatusRow = {
  status: string;
};

type AttendanceCountRow = {
  status: AttendanceStatus;
};

// ---------- Helpers ----------

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// ---------- Action ----------

export async function getStudentSummary(
  studentId: string
): Promise<ActionResult<StudentSummary>> {
  try {
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

    // 3. Financial: current month fee status + any overdue in history
    const referenceMonth = getCurrentMonth();
    let currentMonthStatus: string | null = null;
    let hasOverdueHistory = false;

    if (enrollmentId) {
      const { data: currentFees } = await supabase
        .from("monthly_fees")
        .select("status")
        .eq("enrollment_id", enrollmentId)
        .eq("reference_month", referenceMonth)
        .limit(1);

      currentMonthStatus = (currentFees as FeeStatusRow[] | null)?.[0]?.status ?? null;

      const { count } = await supabase
        .from("monthly_fees")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_id", enrollmentId)
        .eq("status", "overdue");

      hasOverdueHistory = (count ?? 0) > 0;
    }

    // 4. Attendance counts for current month
    const { start, end } = getCurrentMonthRange();
    const attendanceCounts = { present: 0, absent: 0, justified: 0 };

    if (enrollmentId) {
      const { data: records } = await supabase
        .from("attendance")
        .select("status")
        .eq("enrollment_id", enrollmentId)
        .gte("date", start)
        .lte("date", end);

      for (const r of (records ?? []) as AttendanceCountRow[]) {
        if (r.status in attendanceCounts) {
          attendanceCounts[r.status]++;
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
