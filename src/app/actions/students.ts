"use server";

import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";

const supabase = getServiceSupabase();
import type {
  Student,
  StudentInsert,
  StudentUpdate,
  StudentWithEnrollments,
  EnrollmentInsert,
} from "@/types/database";

// ---------- Validation ----------

const uuidSchema = z.string().uuid();

const studentInsertSchema = z.object({
  full_name: z.string().trim().min(1, "Nome obrigatorio.").max(200),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  guardian_name: z.string().trim().min(1, "Nome do responsavel obrigatorio.").max(200),
  guardian_phone: z.string().max(30).nullish(),
  guardian_email: z.string().email().max(200).nullish().or(z.literal("")).transform(v => v || null),
  guardian_cpf: z.string().max(20).nullish(),
  is_internal: z.boolean(),
  notes: z.string().max(2000).nullish(),
  is_active: z.boolean(),
});

const enrollmentInsertSchema = z.object({
  class_id: uuidSchema,
  status: z.enum(["active", "inactive", "pending"]),
  validity_type: z.enum(["semester", "annual"]),
  starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base_fee: z.number().nonnegative().max(99_999_999.99),
  due_day: z.union([z.literal(5), z.literal(7)]),
});

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

  try {
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
      if (enrollError) return { success: false, error: enrollError.message };

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
    // Sanitize: remove PostgREST operator chars to prevent filter injection
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[,.()"\\]/g, "");
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

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        students: data as StudentWithEnrollments[],
        total: count ?? 0,
      },
    };
  } catch {
    return { success: false, error: "Falha ao buscar alunas." };
  }
}

// ---------- CRUD ----------

export async function createStudentWithEnrollment(
  studentPayload: StudentInsert,
  enrollmentPayload: Omit<EnrollmentInsert, "student_id">
): Promise<ActionResult<Student>> {
  try {
    const parsedStudent = studentInsertSchema.safeParse(studentPayload);
    if (!parsedStudent.success) return { success: false, error: "Dados da aluna invalidos." };

    const parsedEnrollment = enrollmentInsertSchema.safeParse(enrollmentPayload);
    if (!parsedEnrollment.success) return { success: false, error: "Dados da matricula invalidos." };

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert(studentPayload)
      .select()
      .single();

    if (studentError) return { success: false, error: studentError.message };

    const { error: enrollmentError } = await supabase
      .from("enrollments")
      .insert({
        ...enrollmentPayload,
        student_id: student.id,
      });

    if (enrollmentError) {
      await supabase.from("students").delete().eq("id", student.id);
      return { success: false, error: enrollmentError.message };
    }

    return { success: true, data: student as Student };
  } catch {
    return { success: false, error: "Falha ao cadastrar aluna." };
  }
}

export async function updateStudent(
  id: string,
  payload: StudentUpdate
): Promise<ActionResult<Student>> {
  try {
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID da aluna invalido." };

    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Student };
  } catch {
    return { success: false, error: "Falha ao atualizar aluna." };
  }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  try {
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID da aluna invalido." };

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Falha ao excluir aluna." };
  }
}
