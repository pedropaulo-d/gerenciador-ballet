"use client";

import { useState } from "react";
import type { StudentWithEnrollments } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoaderIcon } from "lucide-react";

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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!student) return;
    setDeleting(true);
    await onConfirm(student.id);
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Aluna</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir{" "}
            <strong>{student?.full_name}</strong>? Todas as matrículas
            vinculadas também serão removidas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
