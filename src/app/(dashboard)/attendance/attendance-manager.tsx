"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { AttendanceRow, AttendanceStatus, ClassWithLocation } from "@/types/database";
import { getClassesWithLocation } from "@/app/actions/classes";
import { getAttendanceByClassAndDate, saveAttendance } from "@/app/actions/attendance";
import { AttendanceList } from "@/components/attendance/attendance-list";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderIcon } from "lucide-react";

const NONE = "__none__";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AttendanceManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // URL state
  const urlDate = searchParams.get("date") ?? todayISO();
  const urlClassId = searchParams.get("class") ?? NONE;

  // Data
  const [classes, setClasses] = useState<ClassWithLocation[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [values, setValues] = useState<Map<string, AttendanceStatus>>(new Map());
  const [justifications, setJustifications] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  // URL helpers
  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === NONE) params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/attendance", { scroll: false });
    },
    [router, searchParams]
  );

  // Load class options
  useEffect(() => {
    startTransition(async () => {
      const res = await getClassesWithLocation();
      if (res.success) setClasses(res.data);
    });
  }, [startTransition]);

  // Fetch attendance when class or date changes
  const fetchAttendance = useCallback(() => {
    startTransition(async () => {
      if (urlClassId === NONE) {
        setRows([]);
        setValues(new Map());
        setJustifications(new Map());
        return;
      }
      const result = await getAttendanceByClassAndDate(urlClassId, urlDate);
      if (result.success) {
        setRows(result.data);
        const initialValues = new Map<string, AttendanceStatus>();
        const initialJustifications = new Map<string, string>();
        for (const row of result.data) {
          if (row.status) initialValues.set(row.enrollmentId, row.status);
          if (row.justification) initialJustifications.set(row.enrollmentId, row.justification);
        }
        setValues(initialValues);
        setJustifications(initialJustifications);
      } else {
        toast.error("Erro ao carregar chamada", { description: result.error });
      }
    });
  }, [urlClassId, urlDate, startTransition]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Handlers
  function handleStatusChange(enrollmentId: string, status: AttendanceStatus) {
    setValues((prev) => {
      const next = new Map(prev);
      if (next.get(enrollmentId) === status) {
        next.delete(enrollmentId);
      } else {
        next.set(enrollmentId, status);
      }
      return next;
    });
    // Clear justification when switching away from justified
    if (status !== "justified") {
      setJustifications((prev) => {
        const next = new Map(prev);
        next.delete(enrollmentId);
        return next;
      });
    }
  }

  function handleJustificationChange(enrollmentId: string, text: string) {
    setJustifications((prev) => {
      const next = new Map(prev);
      if (text) {
        next.set(enrollmentId, text);
      } else {
        next.delete(enrollmentId);
      }
      return next;
    });
  }

  async function handleSave() {
    const records = Array.from(values.entries()).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
      justification: status === "justified" ? (justifications.get(enrollmentId) ?? null) : null,
    }));

    setSaving(true);
    const result = await saveAttendance(urlDate, records);
    setSaving(false);

    if (result.success) {
      toast.success("Chamada salva!");
    } else {
      toast.error("Erro ao salvar chamada", { description: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">Chamada</h1>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={urlDate}
          onChange={(e) => setParams({ date: e.target.value || undefined })}
        />
        <Select
          value={urlClassId}
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

      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AttendanceList
          rows={rows}
          values={values}
          justifications={justifications}
          onStatusChange={handleStatusChange}
          onJustificationChange={handleJustificationChange}
          onSave={handleSave}
          saving={saving}
          hasClass={urlClassId !== NONE}
        />
      )}
    </div>
  );
}
