"use client";

import type { Location } from "@/types/database";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface LocationDeleteDialogProps {
  location: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
}

export function LocationDeleteDialog({
  location,
  open,
  onOpenChange,
  onConfirm,
}: LocationDeleteDialogProps) {
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir Local"
      description={
        <>
          Tem certeza que deseja excluir{" "}
          <strong>{location?.name}</strong>? Todas as turmas
          vinculadas também serão removidas.
        </>
      }
      itemId={location?.id ?? null}
      onConfirm={onConfirm}
    />
  );
}
