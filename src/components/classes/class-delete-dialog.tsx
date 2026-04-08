"use client";

import type { ClassWithLocation } from "@/types/database";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface ClassDeleteDialogProps {
  classItem: ClassWithLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
}

export function ClassDeleteDialog({
  classItem,
  open,
  onOpenChange,
  onConfirm,
}: ClassDeleteDialogProps) {
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir Turma"
      description={
        <>
          Tem certeza que deseja excluir{" "}
          <strong>{classItem?.name}</strong>? Todas as matrículas
          vinculadas também serão removidas.
        </>
      }
      itemId={classItem?.id ?? null}
      onConfirm={onConfirm}
    />
  );
}
