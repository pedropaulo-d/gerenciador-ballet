"use server";

import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";
import type { AttendanceStatus } from "@/types/database";
import { getCurrentMonth, getCurrentMonthRange } from "@/lib/formatters";
import { safeDbError } from "@/lib/safe-error";

const supabase = getServiceSupabase();

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Maximum number of past absences/justifications shown in the student profile timeline.
const ABSENCE_HISTORY_LIMIT = 20;

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
    if ((r.status === "absent" || r.status === "justified") && history.length < ABSENCE_HISTORY_LIMIT) {
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

    // Auth first: role gates both financial data and internal_observations.
    const { role: callerRole } = await requireAuth();
    const isAdmin = callerRole === "admin";

    // 1. Student data — internal_observations is admin-only
    // (disciplinary/admin notes; teacher must not see it).
    const studentColumns = isAdmin
      ? "id, full_name, birth_date, guardian_name, guardian_phone, medical_notes, internal_observations"
      : "id, full_name, birth_date, guardian_name, guardian_phone, medical_notes";

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(studentColumns)
      .eq("id", studentId)
      .single<{
        id: string;
        full_name: string;
        birth_date: string | null;
        guardian_name: string;
        guardian_phone: string | null;
        medical_notes: string | null;
        internal_observations?: string | null;
      }>();

    if (studentError || !student) {
      return { success: false, error: safeDbError(studentError, "getStudentSummary:fetch") };
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

    // 3. Financial + Attendance (role resolved above gates financial visibility)
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

      let attendanceRows: AttendanceDetailRow[];

      if (isAdmin) {
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
        attendanceRows = (attendanceRes.data ?? []) as AttendanceDetailRow[];
      } else {
        const attendanceRes = await attendancePromise;
        attendanceRows = (attendanceRes.data ?? []) as AttendanceDetailRow[];
      }

      const processed = processAttendance(attendanceRows, start, end);
      attendanceCounts = processed.counts;
      absenceHistory = processed.history;
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
          internalObservations: isAdmin ? student.internal_observations ?? null : null,
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

    const parsedDate = isoDateSchema.safeParse(date);
    if (!parsedDate.success) return { success: false, error: "Data invalida." };

    const { count, error } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .eq("status", "absent");

    if (error) return { success: false, error: safeDbError(error, "getTodayAbsencesCount") };
    return { success: true, data: count ?? 0 };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao contar faltas." };
  }
}
