"use client";

import { useState } from "react";
import type {
  ClassWithLocation,
  StudentWithEnrollments,
} from "@/types/database";
import { computeEnrollmentDates } from "@/lib/enrollment-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { LoaderIcon } from "lucide-react";

export type StudentFormData = {
  full_name: string;
  birth_date: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_cpf: string;
  is_internal: boolean;
  notes: string;
  // Enrollment fields — populated in both create and edit modes.
  class_id: string;
  validity_type: "semester" | "annual";
  base_fee: string;
  due_day: "5" | "7";
};

const emptyForm: StudentFormData = {
  full_name: "",
  birth_date: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_email: "",
  guardian_cpf: "",
  is_internal: true,
  notes: "",
  class_id: "",
  validity_type: "semester",
  base_fee: "",
  due_day: "5",
};

export function studentToFormData(student: StudentWithEnrollments): StudentFormData {
  // Mesma heuristica do server-side update: matricula ativa mais recente, ou,
  // como fallback defensivo, a mais recente de qualquer status. O profile
  // sheet, attendance e o dashboard ja assumem 1 matricula ativa por aluna.
  const activeEnrollments = student.enrollments.filter((e) => e.status === "active");
  const sortByCreatedAtDesc = (a: { created_at: string }, b: { created_at: string }) =>
    b.created_at.localeCompare(a.created_at);
  const enrollment =
    [...activeEnrollments].sort(sortByCreatedAtDesc)[0] ??
    [...student.enrollments].sort(sortByCreatedAtDesc)[0] ??
    null;

  const dueDay: "5" | "7" = enrollment?.due_day === 7 ? "7" : "5";

  return {
    full_name: student.full_name,
    birth_date: student.birth_date ?? "",
    guardian_name: student.guardian_name,
    guardian_phone: student.guardian_phone ?? "",
    guardian_email: student.guardian_email ?? "",
    guardian_cpf: student.guardian_cpf ?? "",
    is_internal: student.is_internal,
    notes: student.notes ?? "",
    class_id: enrollment?.class_id ?? "",
    validity_type: enrollment?.validity_type ?? "semester",
    base_fee: enrollment ? String(enrollment.base_fee) : "",
    due_day: dueDay,
  };
}

export function formDataToStudentPayload(form: StudentFormData) {
  return {
    full_name: form.full_name.trim(),
    birth_date: form.birth_date || null,
    guardian_name: form.guardian_name.trim(),
    guardian_phone: form.guardian_phone.trim() || null,
    guardian_email: form.guardian_email.trim() || null,
    guardian_cpf: form.guardian_cpf.trim() || null,
    is_internal: form.is_internal,
    notes: form.notes.trim() || null,
    is_active: true,
  };
}

export function formDataToEnrollmentPayload(form: StudentFormData) {
  const { startsAt, endsAt } = computeEnrollmentDates(form.validity_type);

  return {
    class_id: form.class_id,
    status: "active" as const,
    validity_type: form.validity_type,
    starts_at: startsAt,
    ends_at: endsAt,
    base_fee: parseFloat(form.base_fee) || 0,
    due_day: parseInt(form.due_day),
  };
}

// Edit-only payload: o servidor decide preservar ou recomputar as datas com
// base na matricula existente, entao o cliente nao envia starts_at/ends_at.
export function formDataToEnrollmentEditPayload(form: StudentFormData) {
  return {
    class_id: form.class_id,
    validity_type: form.validity_type,
    base_fee: parseFloat(form.base_fee) || 0,
    due_day: (parseInt(form.due_day) === 7 ? 7 : 5) as 5 | 7,
  };
}

interface StudentFormProps {
  classes: ClassWithLocation[];
  initialData?: StudentFormData;
  isEditing: boolean;
  onSubmit: (form: StudentFormData) => Promise<void>;
}

export function StudentForm({
  classes,
  initialData,
  isEditing,
  onSubmit,
}: StudentFormProps) {
  const [form, setForm] = useState<StudentFormData>(initialData ?? emptyForm);
  const [saving, setSaving] = useState(false);

  const isValid =
    form.full_name.trim() &&
    form.guardian_name.trim() &&
    form.class_id &&
    form.base_fee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="student-name">Nome da aluna *</Label>
        <Input
          id="student-name"
          placeholder="Ex: Maria Silva"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="birth-date">Data de nascimento</Label>
        <Input
          id="birth-date"
          type="date"
          value={form.birth_date}
          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guardian-name">Nome do responsável *</Label>
        <Input
          id="guardian-name"
          placeholder="Ex: Ana Silva"
          value={form.guardian_name}
          onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guardian-phone">Telefone</Label>
          <Input
            id="guardian-phone"
            placeholder="(11) 99999-9999"
            value={form.guardian_phone}
            onChange={(e) =>
              setForm({ ...form, guardian_phone: e.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guardian-cpf">CPF</Label>
          <Input
            id="guardian-cpf"
            placeholder="000.000.000-00"
            value={form.guardian_cpf}
            onChange={(e) => setForm({ ...form, guardian_cpf: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guardian-email">E-mail</Label>
        <Input
          id="guardian-email"
          type="email"
          placeholder="email@exemplo.com"
          value={form.guardian_email}
          onChange={(e) => setForm({ ...form, guardian_email: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Tipo de aluna</Label>
        <Select
          value={form.is_internal ? "internal" : "external"}
          onValueChange={(v) =>
            setForm({ ...form, is_internal: v === "internal" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">Interna (da creche)</SelectItem>
            <SelectItem value="external">Externa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Enrollment section — exibida em criacao e edicao */}
      <div className="border-t pt-3">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Matrícula
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Turma *</Label>
        <Select
          value={form.class_id}
          onValueChange={(v) => setForm({ ...form, class_id: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a turma" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} — {cls.location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Plano *</Label>
          <Select
            value={form.validity_type}
            onValueChange={(v) =>
              setForm({
                ...form,
                validity_type: v as "semester" | "annual",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">Semestral</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="base-fee">Valor Base (R$) *</Label>
          <Input
            id="base-fee"
            type="number"
            step="0.01"
            min="0"
            placeholder="150.00"
            value={form.base_fee}
            onChange={(e) =>
              setForm({ ...form, base_fee: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Dia de vencimento *</Label>
        <Select
          value={form.due_day}
          onValueChange={(v) =>
            setForm({ ...form, due_day: v as "5" | "7" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Dia 05</SelectItem>
            <SelectItem value="7">Dia 07</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Input
          id="notes"
          placeholder="Alergia, restrição, etc."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving || !isValid}>
          {saving ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : isEditing ? (
            "Salvar"
          ) : (
            "Cadastrar"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
