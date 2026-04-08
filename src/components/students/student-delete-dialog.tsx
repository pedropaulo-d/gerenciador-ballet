"use client";

import type { StudentWithEnrollments } from "@/types/database";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface StudentDeleteDialogProps {
  student: StudentWithEnrollments | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
}

export function StudentDeleteDialog({
  student,
  open,
  onOpenChange,
  onConfirm,
}: StudentDeleteDialogProps) {
  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir Aluna"
      description={
        <>
          Tem certeza que deseja excluir{" "}
          <strong>{student?.full_name}</strong>? Todas as matrículas
          vinculadas também serão removidas.
        </>
      }
      itemId={student?.id ?? null}
      onConfirm={onConfirm}
    />
  );
}
