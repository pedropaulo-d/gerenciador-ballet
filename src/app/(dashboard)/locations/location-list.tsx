"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { Location } from "@/types/database";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "@/app/actions/locations";
import { formDataToPayload, type LocationFormData } from "@/components/locations/location-form";
import { LocationsTable } from "@/components/locations/locations-table";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { LocationDeleteDialog } from "@/components/locations/location-delete-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export function LocationList() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

  const fetchLocations = useCallback(() => {
    startTransition(async () => {
      const result = await getLocations();
      if (result.success) setLocations(result.data);
      else toast.error("Erro ao carregar locais", { description: result.error });
    });
  }, [startTransition]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  // -- CRUD handlers --

  function openCreate() {
    setEditingLocation(null);
    setFormDialogOpen(true);
  }

  async function handleFormSubmit(formData: LocationFormData) {
    const payload = formDataToPayload(formData);
    const result = editingLocation
      ? await updateLocation(editingLocation.id, payload)
      : await createLocation(payload);

    if (!result.success) {
      toast.error("Erro ao salvar local", { description: result.error });
      return;
    }

    toast.success(editingLocation ? "Local atualizado!" : "Local cadastrado!");
    setFormDialogOpen(false);
    fetchLocations();
  }

  async function handleDelete(id: string) {
    const result = await deleteLocation(id);
    if (!result.success) {
      toast.error("Erro ao excluir local", { description: result.error });
      return;
    }
    toast.success("Local excluído!");
    setDeleteDialogOpen(false);
    setDeletingLocation(null);
    fetchLocations();
  }

  // -- Render --

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Locais</h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Novo Local
        </Button>
      </div>

      <LocationsTable
        locations={locations}
        loading={isPending}
        onEdit={(loc) => { setEditingLocation(loc); setFormDialogOpen(true); }}
        onDelete={(loc) => { setDeletingLocation(loc); setDeleteDialogOpen(true); }}
        onCreateFirst={openCreate}
      />

      <LocationFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingLocation={editingLocation}
        onSubmit={handleFormSubmit}
      />

      <LocationDeleteDialog
        location={deletingLocation}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
