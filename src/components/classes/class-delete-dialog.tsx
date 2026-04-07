"use client";

import { useState } from "react";
import type { ClassWithLocation } from "@/types/database";
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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!classItem) return;
    setDeleting(true);
    await onConfirm(classItem.id);
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Turma</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir{" "}
            <strong>{classItem?.name}</strong>? Todas as matrículas
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
