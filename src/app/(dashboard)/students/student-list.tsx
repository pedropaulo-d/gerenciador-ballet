"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
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
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { StudentDeleteDialog } from "@/components/students/student-delete-dialog";
import { StudentProfileSheet } from "@/components/students/student-profile-sheet";
import { useUrlParams } from "@/lib/use-url-params";
import { Button } from "@/components/ui/button";
import { PlusIcon, UploadIcon } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 10;
const ALL = "__all__";

export function StudentList() {
  const { searchParams, setParams } = useUrlParams("/students", ALL);
  const urlSearch = searchParams.get("q") ?? "";
  const urlLocationId = searchParams.get("location") ?? ALL;
  const urlClassId = searchParams.get("class") ?? ALL;
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;

  const [isPending, startTransition] = useTransition();

  // Data
  const [students, setStudents] = useState<StudentWithEnrollments[]>([]);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassWithLocation[]>([]);

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] =
    useState<StudentWithEnrollments | null>(null);
  const [deletingStudent, setDeletingStudent] =
    useState<StudentWithEnrollments | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);

  // -- Data fetching --

  useEffect(() => {
    startTransition(async () => {
      const [locRes, clsRes] = await Promise.all([
        getLocations(),
        getClassesWithLocation(),
      ]);
      if (locRes.success) setLocations(locRes.data);
      if (clsRes.success) setClasses(clsRes.data);
    });
  }, [startTransition]);

  const fetchStudents = useCallback(() => {
    startTransition(async () => {
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
    });
  }, [urlSearch, urlLocationId, urlClassId, urlPage, startTransition]);

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-shadow-gold">Alunas</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/import">
              <UploadIcon className="size-4" />
              <span className="hidden sm:inline">Importar</span>
            </Link>
          </Button>
          <Button onClick={openCreate} size="sm">
            <PlusIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Nova Aluna</span>
          </Button>
        </div>
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

      {!isPending && (
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "aluna encontrada" : "alunas encontradas"}
        </p>
      )}

      <StudentsTable
        students={students}
        loading={isPending}
        hasFilters={hasFilters}
        onEdit={(s) => { setEditingStudent(s); setFormDialogOpen(true); }}
        onDelete={(s) => { setDeletingStudent(s); setDeleteDialogOpen(true); }}
        onViewProfile={(s) => setProfileStudentId(s.id)}
        onCreateFirst={openCreate}
      />

      <PaginationControls
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

      <StudentProfileSheet
        studentId={profileStudentId}
        open={profileStudentId !== null}
        onOpenChange={(open) => !open && setProfileStudentId(null)}
      />
    </div>
  );
}
