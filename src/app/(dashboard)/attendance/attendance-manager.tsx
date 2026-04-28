"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  AttendanceRow,
  AttendanceStatus,
  ClassWithLocation,
} from "@/types/database";
import { saveAttendance } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/attendance-list";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlParams } from "@/lib/use-url-params";

const NONE = "__none__";

interface AttendanceManagerProps {
  initialClasses: ClassWithLocation[];
  initialRows: AttendanceRow[];
  currentDate: string;
  currentClassId: string;
}

interface FormState {
  values: Map<string, AttendanceStatus>;
  justifications: Map<string, string>;
  initialIds: Set<string>;
}

function buildFormState(rows: AttendanceRow[]): FormState {
  const values = new Map<string, AttendanceStatus>();
  const justifications = new Map<string, string>();
  for (const r of rows) {
    if (r.status) values.set(r.enrollmentId, r.status);
    if (r.justification) justifications.set(r.enrollmentId, r.justification);
  }
  return {
    values,
    justifications,
    initialIds: new Set(values.keys()),
  };
}

export function AttendanceManager({
  initialClasses,
  initialRows,
  currentDate,
  currentClassId,
}: AttendanceManagerProps) {
  const router = useRouter();
  const { setParams } = useUrlParams("/attendance", NONE);
  const [, startTransition] = useTransition();

  // Props are the source of data — no useEffect/useState fetch.
  const classes = initialClasses;
  const rows = initialRows;

  // Reset form state when `initialRows` muda (mudou a data/turma na URL ou
  // chegou um refresh pós-mutation). Padrão "adjust state during render"
  // — evita cascading renders do useEffect.
  const [prevRows, setPrevRows] = useState(initialRows);
  const [state, setState] = useState<FormState>(() => buildFormState(initialRows));
  if (prevRows !== initialRows) {
    setPrevRows(initialRows);
    setState(buildFormState(initialRows));
  }
  const { values, justifications, initialIds } = state;

  const [saving, setSaving] = useState(false);

  // -- Handlers (form state only) --

  function handleStatusChange(enrollmentId: string, status: AttendanceStatus) {
    setState((prev) => {
      const nextValues = new Map(prev.values);
      if (nextValues.get(enrollmentId) === status) {
        nextValues.delete(enrollmentId);
      } else {
        nextValues.set(enrollmentId, status);
      }
      let nextJustifications = prev.justifications;
      if (status !== "justified") {
        const j = new Map(prev.justifications);
        j.delete(enrollmentId);
        nextJustifications = j;
      }
      return { ...prev, values: nextValues, justifications: nextJustifications };
    });
  }

  function handleJustificationChange(enrollmentId: string, text: string) {
    setState((prev) => {
      const j = new Map(prev.justifications);
      if (text) j.set(enrollmentId, text);
      else j.delete(enrollmentId);
      return { ...prev, justifications: j };
    });
  }

  // Removals: enrollments that had a saved status but were cleared in the form.
  const removals = [...initialIds].filter((id) => !values.has(id));
  const hasChanges = values.size > 0 || removals.length > 0;

  async function handleSave() {
    const records = Array.from(values.entries()).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
      justification:
        status === "justified" ? (justifications.get(enrollmentId) ?? null) : null,
    }));

    setSaving(true);
    const result = await saveAttendance(currentDate, records, removals);
    setSaving(false);

    if (result.success) {
      toast.success("Chamada salva!");
      // Refresh do RSC — props chegam atualizadas e o "adjust during render"
      // ressincroniza o form state com o que está persistido.
      startTransition(() => router.refresh());
    } else {
      toast.error("Erro ao salvar chamada", { description: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-shadow-gold">Chamada</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          type="date"
          value={currentDate}
          onChange={(e) => setParams({ date: e.target.value || undefined })}
        />
        <Select
          value={currentClassId}
          onValueChange={(v) => setParams({ class: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Selecionar turma</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} — {cls.location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AttendanceList
        rows={rows}
        values={values}
        justifications={justifications}
        onStatusChange={handleStatusChange}
        onJustificationChange={handleJustificationChange}
        onSave={handleSave}
        saving={saving}
        hasClass={currentClassId !== NONE}
        hasChanges={hasChanges}
      />
    </div>
  );
}
