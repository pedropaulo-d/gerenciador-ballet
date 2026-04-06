"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { Location, ClassWithLocation } from "@/types/database";
import { getLocations } from "@/app/actions/locations";
import {
  getClassesWithLocation,
  createClass,
  updateClass,
  deleteClass,
} from "@/app/actions/classes";
import {
  ClassForm,
  classToFormData,
  formDataToPayload,
  type ClassFormData,
} from "@/components/classes/class-form";
import {
  ClassesTable,
  ALL_LOCATIONS,
} from "@/components/classes/classes-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusIcon, LoaderIcon } from "lucide-react";

export function ClassList() {
  const [classes, setClasses] = useState<ClassWithLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(ALL_LOCATIONS);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithLocation | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassWithLocation | null>(null);

  const fetchLocations = useCallback(async () => {
    const result = await getLocations();
    if (result.success) setLocations(result.data);
    else toast.error("Erro ao carregar locais", { description: result.error });
  }, []);

  const fetchClasses = useCallback(async (locationId?: string) => {
    setLoading(true);
    const result = await getClassesWithLocation(
      locationId === ALL_LOCATIONS ? undefined : locationId
    );
    if (result.success) setClasses(result.data);
    else toast.error("Erro ao carregar turmas", { description: result.error });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchClasses(selectedLocationId);
  }, [fetchClasses, selectedLocationId]);

  // -- Handlers de abertura dos dialogs --

  function openCreate() {
    if (locations.length === 0) {
      toast.error("Cadastre um local antes de criar uma turma.");
      return;
    }
    setEditingClass(null);
    setFormDialogOpen(true);
  }

  function openEdit(cls: ClassWithLocation) {
    setEditingClass(cls);
    setFormDialogOpen(true);
  }

  function openDelete(cls: ClassWithLocation) {
    setDeletingClass(cls);
    setDeleteDialogOpen(true);
  }

  // -- Handlers de ação --

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
    fetchClasses(selectedLocationId);
  }

  async function handleDelete() {
    if (!deletingClass) return;
    setDeleting(true);

    const result = await deleteClass(deletingClass.id);
    setDeleting(false);

    if (!result.success) {
      toast.error("Erro ao excluir turma", { description: result.error });
      return;
    }

    toast.success("Turma excluída!");
    setDeleteDialogOpen(false);
    setDeletingClass(null);
    fetchClasses(selectedLocationId);
  }

  // -- Render --

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Turmas</h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Nova Turma
        </Button>
      </div>

      <ClassesTable
        classes={classes}
        locations={locations}
        loading={loading}
        selectedLocationId={selectedLocationId}
        onLocationChange={setSelectedLocationId}
        onEdit={openEdit}
        onDelete={openDelete}
        onCreateFirst={openCreate}
      />

      {/* Dialog: Criar / Editar */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClass ? "Editar Turma" : "Nova Turma"}
            </DialogTitle>
            <DialogDescription>
              {editingClass
                ? "Atualize os dados da turma."
                : "Preencha os dados da nova turma."}
            </DialogDescription>
          </DialogHeader>

          <ClassForm
            key={editingClass?.id ?? "new"}
            locations={locations}
            initialData={
              editingClass ? classToFormData(editingClass) : undefined
            }
            isEditing={!!editingClass}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Turma</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{deletingClass?.name}</strong>? Todas as matrículas
              vinculadas também serão removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
