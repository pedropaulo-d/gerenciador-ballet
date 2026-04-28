"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Location, ClassWithLocation } from "@/types/database";
import {
  createClass,
  updateClass,
  deleteClass,
} from "@/app/actions/classes";
import {
  formDataToPayload,
  type ClassFormData,
} from "@/components/classes/class-form";
import { ClassesTable } from "@/components/classes/classes-table";
import { ClassFormDialog } from "@/components/classes/class-form-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlParams } from "@/lib/use-url-params";
import { PlusIcon, MapPinIcon } from "lucide-react";

const ALL_LOCATIONS = "__all__";

interface ClassListProps {
  initialClasses: ClassWithLocation[];
  initialLocations: Location[];
}

export function ClassList({
  initialClasses,
  initialLocations,
}: ClassListProps) {
  const router = useRouter();
  const { searchParams, setParams } = useUrlParams("/classes", ALL_LOCATIONS);
  const [, startTransition] = useTransition();

  // URL é a única fonte de verdade — mesmo padrão do /finances e /students.
  const urlLocationId = searchParams.get("location") ?? ALL_LOCATIONS;

  // Props são a fonte de dados — sem useState/useEffect para fetch.
  const classes = initialClasses;
  const locations = initialLocations;

  // Dialog & UI-only state.
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithLocation | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassWithLocation | null>(null);

  // -- CRUD handlers --

  function openCreate() {
    if (locations.length === 0) {
      toast.error("Cadastre um local antes de criar uma turma.");
      return;
    }
    setEditingClass(null);
    setFormDialogOpen(true);
  }

  async function handleFormSubmit(formData: ClassFormData) {
    const payload = formDataToPayload(formData);
    const result = editingClass
      ? await updateClass(editingClass.id, payload)
      : await createClass(payload);

    if (!result.success) {
      toast.error("Erro ao salvar turma", { description: result.error });
      return;
    }

    toast.success(editingClass ? "Turma atualizada!" : "Turma cadastrada!");
    setFormDialogOpen(false);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    const result = await deleteClass(id);
    if (!result.success) {
      toast.error("Erro ao excluir turma", { description: result.error });
      return;
    }
    toast.success("Turma excluída!");
    setDeleteDialogOpen(false);
    setDeletingClass(null);
    startTransition(() => router.refresh());
  }

  // -- Render --

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-shadow-gold">
          Turmas
        </h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Nova Turma
        </Button>
      </div>

      {locations.length > 0 && (
        <Select
          value={urlLocationId}
          onValueChange={(v) => setParams({ location: v })}
        >
          <SelectTrigger className="w-full">
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LOCATIONS}>Todos os Locais</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <ClassesTable
        classes={classes}
        hasLocationFilter={urlLocationId !== ALL_LOCATIONS}
        onEdit={(cls) => {
          setEditingClass(cls);
          setFormDialogOpen(true);
        }}
        onDelete={(cls) => {
          setDeletingClass(cls);
          setDeleteDialogOpen(true);
        }}
        onCreateFirst={openCreate}
      />

      <ClassFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingClass={editingClass}
        locations={locations}
        onSubmit={handleFormSubmit}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Turma"
        description={
          <>
            Tem certeza que deseja excluir{" "}
            <strong>{deletingClass?.name}</strong>? Todas as matrículas
            vinculadas também serão removidas.
          </>
        }
        itemId={deletingClass?.id ?? null}
        onConfirm={handleDelete}
      />
    </div>
  );
}
