"use client";

import { useState } from "react";
import type { Location } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { LoaderIcon } from "lucide-react";

export type LocationFormData = {
  name: string;
  address: string;
  fee_per_student: string;
};

const emptyForm: LocationFormData = {
  name: "",
  address: "",
  fee_per_student: "",
};

/** Converte um Location existente para os valores do formulário. */
export function locationToFormData(location: Location): LocationFormData {
  return {
    name: location.name,
    address: location.address ?? "",
    fee_per_student: String(location.fee_per_student),
  };
}

/** Converte os valores do formulário para o payload de insert/update. */
export function formDataToPayload(form: LocationFormData) {
  return {
    name: form.name.trim(),
    address: form.address.trim() || null,
    fee_per_student: parseFloat(form.fee_per_student) || 0,
    is_active: true,
  };
}

interface LocationFormProps {
  initialData?: LocationFormData;
  isEditing: boolean;
  onSubmit: (form: LocationFormData) => Promise<void>;
}

export function LocationForm({ initialData, isEditing, onSubmit }: LocationFormProps) {
  const [form, setForm] = useState<LocationFormData>(initialData ?? emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          placeholder="Ex: Creche Arco-Íris"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          placeholder="Rua, número, bairro"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fee_per_student">Taxa de repasse por aluna (R$)</Label>
        <Input
          id="fee_per_student"
          type="number"
          step="0.01"
          min="0"
          placeholder="20.00"
          value={form.fee_per_student}
          onChange={(e) => setForm({ ...form, fee_per_student: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving || !form.name.trim()}>
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
