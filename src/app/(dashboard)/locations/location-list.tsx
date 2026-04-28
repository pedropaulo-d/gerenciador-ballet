"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Location } from "@/types/database";
import {
  createLocation,
  updateLocation,
  deleteLocation,
} from "@/app/actions/locations";
import {
  formDataToPayload,
  type LocationFormData,
} from "@/components/locations/location-form";
import { LocationsTable } from "@/components/locations/locations-table";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface LocationListProps {
  initialLocations: Location[];
}

export function LocationList({ initialLocations }: LocationListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Props são a fonte de dados — sem useState/useEffect para fetch.
  const locations = initialLocations;

  // Dialog & UI-only state.
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

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
    startTransition(() => router.refresh());
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
    startTransition(() => router.refresh());
  }

  // -- Render --

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-shadow-gold">
          Locais
        </h1>
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Novo Local
        </Button>
      </div>

      <LocationsTable
        locations={locations}
        onEdit={(loc) => {
          setEditingLocation(loc);
          setFormDialogOpen(true);
        }}
        onDelete={(loc) => {
          setDeletingLocation(loc);
          setDeleteDialogOpen(true);
        }}
        onCreateFirst={openCreate}
      />

      <LocationFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingLocation={editingLocation}
        onSubmit={handleFormSubmit}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Local"
        description={
          <>
            Tem certeza que deseja excluir{" "}
            <strong>{deletingLocation?.name}</strong>? Todas as turmas
            vinculadas também serão removidas.
          </>
        }
        itemId={deletingLocation?.id ?? null}
        onConfirm={handleDelete}
      />
    </div>
  );
}
