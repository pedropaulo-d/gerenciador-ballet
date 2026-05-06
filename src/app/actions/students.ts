"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAuth, requireAdmin, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";
import { safeDbError } from "@/lib/safe-error";
import { startPerf } from "@/lib/perf";
import { studentInsertSchema } from "@/lib/student-schemas";
import type {
  Student,
  StudentInsert,
  StudentUpdate,
  StudentWithEnrollments,
  EnrollmentInsert,
} from "@/types/database";

// ---------- Validation ----------

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const enrollmentInsertSchema = z.object({
  class_id: uuidSchema,
  status: z.enum(["active", "inactive", "pending"]),
  validity_type: z.enum(["semester", "annual"]),
  starts_at: isoDateSchema,
  ends_at: isoDateSchema,
  base_fee: z.number().nonnegative().max(99_999_999.99),
  due_day: z.union([z.literal(5), z.literal(7)]),
});

// Strict partial: whitelists editable fields and rejects unknown keys to
// prevent mass-assignment (e.g. client forging created_at or unrelated cols).
const studentUpdateSchema = studentInsertSchema.partial().strict();

// ---------- Paginated list with filters ----------

export type StudentsPage = {
  students: StudentWithEnrollments[];
  total: number;
};

export type StudentFilters = {
  search?: string;
  locationId?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
};

export async function getStudentsPaginated(
  filters: StudentFilters
): Promise<ActionResult<StudentsPage>> {
  const { search, locationId, classId, page = 1, pageSize = 10 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const endPerf = startPerf("getStudentsPaginated");

  try {
    await requireAuth();
    const supabase = getServiceSupabase();
    // When filtering by location or class, we need to find matching student IDs first
    // because Supabase doesn't support filtering parents by nested child relations well.
    let studentIds: string[] | null = null;

    if (locationId || classId) {
      // Find matching class IDs first, then filter enrollments
      let classIds: string[] | null = null;

      if (locationId) {
        const { data: locClasses } = await supabase
          .from("classes")
          .select("id")
          .eq("location_id", locationId);
        classIds = (locClasses ?? []).map((c) => c.id);
        if (classIds.length === 0) {
          return { success: true, data: { students: [], total: 0 } };
        }
      }

      let enrollmentQuery = supabase
        .from("enrollments")
        .select("student_id");

      if (classId) {
        enrollmentQuery = enrollmentQuery.eq("class_id", classId);
      } else if (classIds) {
        enrollmentQuery = enrollmentQuery.in("class_id", classIds);
      }

      const { data: enrollments, error: enrollError } = await enrollmentQuery;
      if (enrollError) return { success: false, error: safeDbError(enrollError, "getStudentsPaginated:enrollments") };

      studentIds = [
        ...new Set(
          (enrollments ?? []).map((e) => e.student_id as string)
        ),
      ];

      if (studentIds.length === 0) {
        return { success: true, data: { students: [], total: 0 } };
      }
    }

    // Build the main query
    let query = supabase
      .from("students")
      .select(
        "*, enrollments(*, class:classes(*, location:locations(*)))",
        { count: "exact" }
      )
      .order("full_name");

    // Filter by student IDs from enrollment filter
    if (studentIds) {
      query = query.in("id", studentIds);
    }

    // Search across multiple fields
    // Sanitize via allowlist (defesa em profundidade): aceita apenas letras
    // Unicode, dígitos, espaço, @, ., _ e - — qualquer outro char que possa
    // virar operador PostgREST (`,`, `:`, `(`, `)`, `*`, `=`, `"`) é cortado.
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[^\p{L}\p{N}\s@._-]/gu, "");
      if (sanitized) {
        const term = `%${sanitized}%`;
        query = query.or(
          `full_name.ilike.${term},guardian_name.ilike.${term},guardian_phone.ilike.${term},guardian_cpf.ilike.${term}`
        );
      }
    }

    // Paginate
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) return { success: false, error: safeDbError(error, "getStudentsPaginated:students") };

    return {
      success: true,
      data: {
        students: data as StudentWithEnrollments[],
        total: count ?? 0,
      },
    };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao buscar alunas." };
  } finally {
    endPerf();
  }
}

// ---------- CRUD ----------

export async function createStudentWithEnrollment(
  studentPayload: StudentInsert,
  enrollmentPayload: Omit<EnrollmentInsert, "student_id">
): Promise<ActionResult<Student>> {
  try {
    await requireAdmin();

    const parsedStudent = studentInsertSchema.safeParse(studentPayload);
    if (!parsedStudent.success) return { success: false, error: "Dados da aluna invalidos." };

    const parsedEnrollment = enrollmentInsertSchema.safeParse(enrollmentPayload);
    if (!parsedEnrollment.success) return { success: false, error: "Dados da matricula invalidos." };

    const supabase = getServiceSupabase();
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert(parsedStudent.data)
      .select()
      .single();

    if (studentError) return { success: false, error: safeDbError(studentError, "createStudentWithEnrollment:student") };

    const { error: enrollmentError } = await supabase
      .from("enrollments")
      .insert({
        ...parsedEnrollment.data,
        student_id: student.id,
      });

    if (enrollmentError) {
      await supabase.from("students").delete().eq("id", student.id);
      return { success: false, error: safeDbError(enrollmentError, "createStudentWithEnrollment:enrollment") };
    }

    revalidatePath("/students");
    return { success: true, data: student as Student };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao cadastrar aluna." };
  }
}

export async function updateStudent(
  id: string,
  payload: StudentUpdate
): Promise<ActionResult<Student>> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID da aluna invalido." };

    const parsedPayload = studentUpdateSchema.safeParse(payload);
    if (!parsedPayload.success) return { success: false, error: "Dados da aluna invalidos." };

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("students")
      .update(parsedPayload.data)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: safeDbError(error, "updateStudent") };
    revalidatePath("/students");
    return { success: true, data: data as Student };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao atualizar aluna." };
  }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID da aluna invalido." };

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) return { success: false, error: safeDbError(error, "deleteStudent") };
    revalidatePath("/students");
    return { success: true, data: null };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao excluir aluna." };
  }
}

/**
 * Delete students in batch (admin only).
 * CASCADE in the schema handles enrollments, monthly_fees and attendance automatically.
 */
export async function deleteStudents(
  ids: string[]
): Promise<ActionResult<{ deleted: number }>> {
  try {
    await requireAdmin();

    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "Nenhuma aluna selecionada." };
    }

    if (ids.length > 500) {
      return { success: false, error: "Maximo de 500 alunas por vez." };
    }

    const parsedIds = z.array(uuidSchema).safeParse(ids);
    if (!parsedIds.success) {
      return { success: false, error: "ID de aluna invalido." };
    }

    const supabase = getServiceSupabase();
    const { error, count } = await supabase
      .from("students")
      .delete({ count: "exact" })
      .in("id", parsedIds.data);

    if (error) return { success: false, error: safeDbError(error, "deleteStudents") };
    revalidatePath("/students");
    return { success: true, data: { deleted: count ?? parsedIds.data.length } };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao excluir alunas." };
  }
}
