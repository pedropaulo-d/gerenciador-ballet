"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  Location,
  ClassWithLocation,
  StudentWithEnrollments,
} from "@/types/database";
import {
  createStudentWithEnrollment,
  updateStudentWithEnrollment,
  deleteStudent,
  deleteStudents,
} from "@/app/actions/students";
import {
  formDataToStudentPayload,
  formDataToEnrollmentPayload,
  formDataToEnrollmentEditPayload,
  type StudentFormData,
} from "@/components/students/student-form";
import { StudentFilters } from "@/components/students/student-filters";
import { StudentsTable } from "@/components/students/students-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { StudentProfileSheet } from "@/components/students/student-profile-sheet";
import { useUrlParams } from "@/lib/use-url-params";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusIcon, UploadIcon, Trash2Icon, LoaderIcon } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 10;
const ALL = "__all__";

interface StudentListProps {
  initialStudents: StudentWithEnrollments[];
  initialTotal: number;
  initialLocations: Location[];
  initialClasses: ClassWithLocation[];
}

export function StudentList({
  initialStudents,
  initialTotal,
  initialLocations,
  initialClasses,
}: StudentListProps) {
  const router = useRouter();
  const { searchParams, setParams } = useUrlParams("/students", ALL);
  const [, startTransition] = useTransition();

  // URL é a única fonte de verdade — igual ao padrão do /finances.
  const urlSearch = searchParams.get("q") ?? "";
  const urlLocationId = searchParams.get("location") ?? ALL;
  const urlClassId = searchParams.get("class") ?? ALL;
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;

  // Props são a fonte de dados; sem useState para students/total/locations/classes.
  const students = initialStudents;
  const total = initialTotal;
  const locations = initialLocations;
  const classes = initialClasses;

  // Dialog & seleção — UI-only.
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] =
    useState<StudentWithEnrollments | null>(null);
  const [deletingStudent, setDeletingStudent] =
    useState<StudentWithEnrollments | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Reset de seleção quando a prop `students` muda (nova página, filtro ou
  // refresh pós-mutação). Padrão oficial React: ajuste de estado durante render
  // — evita cascading renders que o lint react-hooks/set-state-in-effect flaga.
  const [prevStudents, setPrevStudents] = useState(students);
  if (prevStudents !== students) {
    setPrevStudents(students);
    setSelectedIds([]);
  }

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
      const result = await updateStudentWithEnrollment(
        editingStudent.id,
        formDataToStudentPayload(formData),
        formDataToEnrollmentEditPayload(formData)
      );
      if (!result.success) {
        toast.error("Erro ao salvar aluna", { description: result.error });
        return;
      }
      toast.success("Aluna atualizada!");
    } else {
      const result = await createStudentWithEnrollment(
        formDataToStudentPayload(formData),
        formDataToEnrollmentPayload(formData)
      );
      if (!result.success) {
        toast.error("Erro ao cadastrar aluna", { description: result.error });
        return;
      }
      toast.success("Aluna cadastrada e matriculada!");
    }
    setFormDialogOpen(false);
    startTransition(() => router.refresh());
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
    startTransition(() => router.refresh());
  }

  // -- Batch selection --

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleToggleAll() {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  }

  async function handleDeleteBatch() {
    setDeletingBatch(true);
    const result = await deleteStudents(selectedIds);
    setDeletingBatch(false);
    setShowDeleteBatchDialog(false);

    if (result.success) {
      toast.success(`${result.data.deleted} aluna(s) excluída(s).`);
      setSelectedIds([]);
      startTransition(() => router.refresh());
    } else {
      toast.error("Erro ao excluir alunas", { description: result.error });
    }
  }

  const allSelected = students.length > 0 && selectedIds.length === students.length;
  const someSelected = selectedIds.length > 0;

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

      <p className="text-xs text-muted-foreground">
        {total} {total === 1 ? "aluna encontrada" : "alunas encontradas"}
      </p>

      {students.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleToggleAll}
              aria-label="Selecionar todas as alunas"
            />
            <span className="text-muted-foreground">Selecionar todas</span>
          </label>
          {someSelected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteBatchDialog(true)}
            >
              <Trash2Icon className="size-3.5" />
              Excluir ({selectedIds.length})
            </Button>
          )}
        </div>
      )}

      <StudentsTable
        students={students}
        hasFilters={hasFilters}
        onEdit={(s) => { setEditingStudent(s); setFormDialogOpen(true); }}
        onDelete={(s) => { setDeletingStudent(s); setDeleteDialogOpen(true); }}
        onViewProfile={(s) => setProfileStudentId(s.id)}
        onCreateFirst={openCreate}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
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

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Aluna"
        description={
          <>
            Tem certeza que deseja excluir{" "}
            <strong>{deletingStudent?.full_name}</strong>? Todas as matrículas
            vinculadas também serão removidas.
          </>
        }
        itemId={deletingStudent?.id ?? null}
        onConfirm={handleDelete}
      />

      <StudentProfileSheet
        studentId={profileStudentId}
        open={profileStudentId !== null}
        onOpenChange={(open) => !open && setProfileStudentId(null)}
      />

      <AlertDialog open={showDeleteBatchDialog} onOpenChange={setShowDeleteBatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir alunas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedIds.length}</strong>{" "}
              aluna(s)? Esta ação apagará permanentemente o cadastro, além de
              todo o histórico de faltas e mensalidades associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBatch}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteBatch}
              disabled={deletingBatch}
            >
              {deletingBatch ? (
                <LoaderIcon className="size-3.5 animate-spin" />
              ) : (
                <Trash2Icon className="size-3.5" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
