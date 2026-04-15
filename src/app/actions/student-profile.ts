"use server";

import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";
import type { AttendanceStatus } from "@/types/database";
import { getCurrentMonth, getCurrentMonthRange } from "@/lib/formatters";

const supabase = getServiceSupabase();

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------- Types ----------

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
    currentMonthStatus: string | null;
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

// ---------- Helpers ----------

function processAttendance(
  rows: AttendanceDetailRow[],
  monthStart: string,
  monthEnd: string,
) {
  const counts = { present: 0, absent: 0, justified: 0 };
  const history: AbsenceRecord[] = [];

  for (const r of rows) {
    if (r.date >= monthStart && r.date <= monthEnd && r.status in counts) {
      counts[r.status]++;
    }
    if ((r.status === "absent" || r.status === "justified") && history.length < 20) {
      history.push({ date: r.date, status: r.status, justification: r.justification });
    }
  }

  return { counts, history };
}

// ---------- Actions ----------

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

    // 3. Caller role (determines financial visibility + enforces auth)
    const { role: callerRole } = await requireAuth();

    // 4. Financial + Attendance
    const referenceMonth = getCurrentMonth();
    const { start, end } = getCurrentMonthRange();
    let currentMonthStatus: string | null = null;
    let hasOverdueHistory = false;
    let attendanceCounts = { present: 0, absent: 0, justified: 0 };
    let absenceHistory: AbsenceRecord[] = [];

    if (enrollmentId) {
      const attendancePromise = supabase
        .from("attendance")
        .select("date, status, justification")
        .eq("enrollment_id", enrollmentId)
        .order("date", { ascending: false });

      if (callerRole === "admin") {
        const [feeRes, overdueRes, attendanceRes] = await Promise.all([
          supabase
            .from("monthly_fees")
            .select("status")
            .eq("enrollment_id", enrollmentId)
            .eq("reference_month", referenceMonth)
            .limit(1),
          supabase
            .from("monthly_fees")
            .select("id", { count: "exact", head: true })
            .eq("enrollment_id", enrollmentId)
            .eq("status", "overdue"),
          attendancePromise,
        ]);

        currentMonthStatus = (feeRes.data as FeeStatusRow[] | null)?.[0]?.status ?? null;
        hasOverdueHistory = (overdueRes.count ?? 0) > 0;

        const processed = processAttendance(
          (attendanceRes.data ?? []) as AttendanceDetailRow[],
          start,
          end,
        );
        attendanceCounts = processed.counts;
        absenceHistory = processed.history;
      } else {
        const attendanceRes = await attendancePromise;
        const processed = processAttendance(
          (attendanceRes.data ?? []) as AttendanceDetailRow[],
          start,
          end,
        );
        attendanceCounts = processed.counts;
        absenceHistory = processed.history;
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
        financial: { currentMonthStatus, hasOverdueHistory },
        attendance: attendanceCounts,
        absenceHistory,
      },
    };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao buscar perfil da aluna." };
  }
}

export async function getTodayAbsencesCount(
  date: string
): Promise<ActionResult<number>> {
  try {
    await requireAuth();

    const parsedDate = dateSchema.safeParse(date);
    if (!parsedDate.success) return { success: false, error: "Data invalida." };

    const { count, error } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .eq("status", "absent");

    if (error) return { success: false, error: error.message };
    return { success: true, data: count ?? 0 };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao contar faltas." };
  }
}
