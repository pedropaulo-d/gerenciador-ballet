"use client";

import { useState } from "react";
import type { Class, Location } from "@/types/database";
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
import { cn } from "@/lib/utils";

const DAY_OPTIONS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
] as const;

export type ClassFormData = {
  name: string;
  location_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  max_students: string;
};

const emptyForm: ClassFormData = {
  name: "",
  location_id: "",
  days_of_week: [],
  start_time: "",
  end_time: "",
  max_students: "",
};

export function classToFormData(cls: Class): ClassFormData {
  return {
    name: cls.name,
    location_id: cls.location_id,
    days_of_week: cls.days_of_week,
    start_time: cls.start_time.slice(0, 5),
    end_time: cls.end_time.slice(0, 5),
    max_students: cls.max_students != null ? String(cls.max_students) : "",
  };
}

export function formDataToPayload(form: ClassFormData) {
  return {
    name: form.name.trim(),
    location_id: form.location_id,
    days_of_week: form.days_of_week,
    start_time: form.start_time,
    end_time: form.end_time,
    max_students: form.max_students ? parseInt(form.max_students) : null,
    is_active: true,
  };
}

interface ClassFormProps {
  locations: Location[];
  initialData?: ClassFormData;
  isEditing: boolean;
  onSubmit: (form: ClassFormData) => Promise<void>;
}

export function ClassForm({
  locations,
  initialData,
  isEditing,
  onSubmit,
}: ClassFormProps) {
  const [form, setForm] = useState<ClassFormData>(initialData ?? emptyForm);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    const next = form.days_of_week.includes(day)
      ? form.days_of_week.filter((d) => d !== day)
      : [...form.days_of_week, day];
    setForm({ ...form, days_of_week: next });
  }

  const isValid =
    form.name.trim() &&
    form.location_id &&
    form.days_of_week.length > 0 &&
    form.start_time &&
    form.end_time;

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
        <Label htmlFor="class-name">Nome da turma *</Label>
        <Input
          id="class-name"
          placeholder="Ex: Baby Ballet - Manhã"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Local *</Label>
        <Select
          value={form.location_id}
          onValueChange={(v) => setForm({ ...form, location_id: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o local" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Dias da semana *</Label>
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map(({ value, label }) => {
            const selected = form.days_of_week.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start-time">Início *</Label>
          <Input
            id="start-time"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end-time">Término *</Label>
          <Input
            id="end-time"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="max-students">Máx. de alunas</Label>
        <Input
          id="max-students"
          type="number"
          min="1"
          placeholder="Opcional"
          value={form.max_students}
          onChange={(e) => setForm({ ...form, max_students: e.target.value })}
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
