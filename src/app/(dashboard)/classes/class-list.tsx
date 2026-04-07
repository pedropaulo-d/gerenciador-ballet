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
import { formDataToPayload, type ClassFormData } from "@/components/classes/class-form";
import { ClassesTable } from "@/components/classes/classes-table";
import { ClassFormDialog } from "@/components/classes/class-form-dialog";
import { ClassDeleteDialog } from "@/components/classes/class-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, MapPinIcon } from "lucide-react";

const ALL_LOCATIONS = "__all__";

export function ClassList() {
  const [classes, setClasses] = useState<ClassWithLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(ALL_LOCATIONS);

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithLocation | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassWithLocation | null>(null);

  // -- Data fetching --

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

  useEffect(() => { fetchLocations(); }, [fetchLocations]);
  useEffect(() => { fetchClasses(selectedLocationId); }, [fetchClasses, selectedLocationId]);

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
    fetchClasses(selectedLocationId);
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

      {locations.length > 0 && (
        <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
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
        loading={loading}
        hasLocationFilter={selectedLocationId !== ALL_LOCATIONS}
        onEdit={(cls) => { setEditingClass(cls); setFormDialogOpen(true); }}
        onDelete={(cls) => { setDeletingClass(cls); setDeleteDialogOpen(true); }}
        onCreateFirst={openCreate}
      />

      <ClassFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingClass={editingClass}
        locations={locations}
        onSubmit={handleFormSubmit}
      />

      <ClassDeleteDialog
        classItem={deletingClass}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
