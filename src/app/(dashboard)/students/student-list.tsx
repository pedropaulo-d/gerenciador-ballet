"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type {
  Location,
  ClassWithLocation,
  StudentWithEnrollments,
} from "@/types/database";
import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import {
  getStudentsPaginated,
  createStudentWithEnrollment,
  updateStudent,
  deleteStudent,
} from "@/app/actions/students";
import {
  formDataToStudentPayload,
  formDataToEnrollmentPayload,
  type StudentFormData,
} from "@/components/students/student-form";
import { StudentFilters } from "@/components/students/student-filters";
import { StudentsTable } from "@/components/students/students-table";
import { StudentPagination } from "@/components/students/student-pagination";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { StudentDeleteDialog } from "@/components/students/student-delete-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

const PAGE_SIZE = 10;
const ALL = "__all__";

export function StudentList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const urlSearch = searchParams.get("q") ?? "";
  const urlLocationId = searchParams.get("location") ?? ALL;
  const urlClassId = searchParams.get("class") ?? ALL;
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;

  // Data
  const [students, setStudents] = useState<StudentWithEnrollments[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassWithLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] =
    useState<StudentWithEnrollments | null>(null);
  const [deletingStudent, setDeletingStudent] =
    useState<StudentWithEnrollments | null>(null);

  // -- URL helpers --

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === ALL) params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/students", { scroll: false });
    },
    [router, searchParams]
  );

  // -- Data fetching --

  const fetchOptions = useCallback(async () => {
    const [locRes, clsRes] = await Promise.all([
      getLocations(),
      getClassesWithLocation(),
    ]);
    if (locRes.success) setLocations(locRes.data);
    if (clsRes.success) setClasses(clsRes.data);
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const result = await getStudentsPaginated({
      search: urlSearch || undefined,
      locationId: urlLocationId !== ALL ? urlLocationId : undefined,
      classId: urlClassId !== ALL ? urlClassId : undefined,
      page: urlPage,
      pageSize: PAGE_SIZE,
    });
    if (result.success) {
      setStudents(result.data.students);
      setTotal(result.data.total);
    } else {
      toast.error("Erro ao carregar alunas", { description: result.error });
    }
    setLoading(false);
  }, [urlSearch, urlLocationId, urlClassId, urlPage]);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // -- Filter handlers --

  const hasFilters = !!(urlSearch || urlLocationId !== ALL || urlClassId !== ALL);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // -- CRUD handlers --

  function openCreate() {
    if (classes.length === 0) {
      toast.error("Cadastre uma turma antes de matricular uma aluna.");
      return;
    }
    setEditingStudent(null);
    setFormDialogOpen(true);
  }

  async function handleFormSubmit(formData: StudentFormData) {
    if (editingStudent) {
      const result = await updateStudent(editingStudent.id, formDataToStudentPayload(formData));
      if (!result.success) { toast.error("Erro ao salvar aluna", { description: result.error }); return; }
      toast.success("Aluna atualizada!");
    } else {
      const result = await createStudentWithEnrollment(
        formDataToStudentPayload(formData),
        formDataToEnrollmentPayload(formData)
      );
      if (!result.success) { toast.error("Erro ao cadastrar aluna", { description: result.error }); return; }
      toast.success("Aluna cadastrada e matriculada!");
    }
    setFormDialogOpen(false);
    fetchStudents();
  }

  async function handleDelete(id: string) {
    const result = await deleteStudent(id);
    if (!result.success) {
      toast.error("Erro ao excluir aluna", { description: result.error });
      return;
    }
    toast.success("Aluna excluída!");
    setDeleteDialogOpen(false);
    setDeletingStudent(null);
    fetchStudents();
  }

  // -- Render --

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Alunas</h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Nova Aluna
        </Button>
      </div>

      <StudentFilters
        search={urlSearch}
        locationId={urlLocationId}
        classId={urlClassId}
        locations={locations}
        classes={classes}
        onSearchChange={(q) => setParams({ q: q || undefined })}
        onLocationChange={(v) => setParams({ location: v, class: undefined })}
        onClassChange={(v) => setParams({ class: v })}
      />

      {!loading && (
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "aluna encontrada" : "alunas encontradas"}
        </p>
      )}

      <StudentsTable
        students={students}
        loading={loading}
        hasFilters={hasFilters}
        onEdit={(s) => { setEditingStudent(s); setFormDialogOpen(true); }}
        onDelete={(s) => { setDeletingStudent(s); setDeleteDialogOpen(true); }}
        onCreateFirst={openCreate}
      />

      <StudentPagination
        page={urlPage}
        totalPages={totalPages}
        onPageChange={(p) => setParams({ page: p > 1 ? String(p) : undefined })}
      />

      <StudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingStudent={editingStudent}
        classes={classes}
        onSubmit={handleFormSubmit}
      />

      <StudentDeleteDialog
        student={deletingStudent}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
