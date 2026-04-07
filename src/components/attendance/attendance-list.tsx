"use client";

import type { AttendanceRow, AttendanceStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon, AlertTriangleIcon, LoaderIcon, SaveIcon, ClipboardListIcon } from "lucide-react";

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  icon: typeof CheckIcon;
  activeClass: string;
}[] = [
  {
    value: "present",
    label: "P",
    icon: CheckIcon,
    activeClass: "bg-green-600 text-white hover:bg-green-700",
  },
  {
    value: "absent",
    label: "F",
    icon: XIcon,
    activeClass: "bg-red-600 text-white hover:bg-red-700",
  },
  {
    value: "justified",
    label: "J",
    icon: AlertTriangleIcon,
    activeClass: "bg-yellow-500 text-white hover:bg-yellow-600",
  },
];

interface AttendanceListProps {
  rows: AttendanceRow[];
  values: Map<string, AttendanceStatus>;
  onStatusChange: (enrollmentId: string, status: AttendanceStatus) => void;
  onSave: () => void;
  saving: boolean;
  hasClass: boolean;
}

export function AttendanceList({
  rows,
  values,
  onStatusChange,
  onSave,
  saving,
  hasClass,
}: AttendanceListProps) {
  if (!hasClass) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <ClipboardListIcon className="size-10 opacity-50" />
        <p>Selecione uma turma para iniciar a chamada.</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <ClipboardListIcon className="size-10 opacity-50" />
        <p>Nenhuma aluna matriculada nesta turma.</p>
      </div>
    );
  }

  const filledCount = values.size;
  const totalCount = rows.length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {filledCount} de {totalCount} registradas
      </p>

      {rows.map((row) => {
        const current = values.get(row.enrollmentId) ?? null;

        return (
          <Card key={row.enrollmentId} size="sm">
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {row.studentName}
              </span>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = current === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      variant="outline"
                      size="icon-xs"
                      className={cn(
                        "size-9 rounded-full transition-colors",
                        isActive && opt.activeClass
                      )}
                      onClick={() => onStatusChange(row.enrollmentId, opt.value)}
                    >
                      <opt.icon className="size-4" />
                      <span className="sr-only">{opt.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        className="mt-2 w-full"
        size="lg"
        disabled={saving || filledCount === 0}
        onClick={onSave}
      >
        {saving ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <SaveIcon className="size-4" />
        )}
        Salvar Chamada
      </Button>
    </div>
  );
}
