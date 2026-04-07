"use client";

import type { ClassWithLocation, StudentWithEnrollments } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  StudentForm,
  studentToFormData,
  type StudentFormData,
} from "./student-form";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStudent: StudentWithEnrollments | null;
  classes: ClassWithLocation[];
  onSubmit: (form: StudentFormData) => Promise<void>;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  editingStudent,
  classes,
  onSubmit,
}: StudentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingStudent ? "Editar Aluna" : "Nova Aluna"}
          </DialogTitle>
          <DialogDescription>
            {editingStudent
              ? "Atualize os dados da aluna."
              : "Preencha os dados da aluna e selecione a turma para matrícula."}
          </DialogDescription>
        </DialogHeader>

        <StudentForm
          key={editingStudent?.id ?? "new"}
          classes={classes}
          initialData={
            editingStudent ? studentToFormData(editingStudent) : undefined
          }
          isEditing={!!editingStudent}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
