"use client";

import type { Location } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LocationForm,
  locationToFormData,
  type LocationFormData,
} from "./location-form";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLocation: Location | null;
  onSubmit: (form: LocationFormData) => Promise<void>;
}

export function LocationFormDialog({
  open,
  onOpenChange,
  editingLocation,
  onSubmit,
}: LocationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingLocation ? "Editar Local" : "Novo Local"}
          </DialogTitle>
          <DialogDescription>
            {editingLocation
              ? "Atualize os dados do local parceiro."
              : "Preencha os dados do novo local parceiro."}
          </DialogDescription>
        </DialogHeader>

        <LocationForm
          key={editingLocation?.id ?? "new"}
          initialData={
            editingLocation ? locationToFormData(editingLocation) : undefined
          }
          isEditing={!!editingLocation}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
