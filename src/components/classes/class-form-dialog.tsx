"use client";

import type { Location, ClassWithLocation } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClassForm,
  classToFormData,
  type ClassFormData,
} from "./class-form";

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClass: ClassWithLocation | null;
  locations: Location[];
  onSubmit: (form: ClassFormData) => Promise<void>;
}

export function ClassFormDialog({
  open,
  onOpenChange,
  editingClass,
  locations,
  onSubmit,
}: ClassFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          initialData={editingClass ? classToFormData(editingClass) : undefined}
          isEditing={!!editingClass}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
