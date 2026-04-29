"use client";

import type { AttendanceRow, AttendanceStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    activeClass: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    value: "absent",
    label: "F",
    icon: XIcon,
    activeClass: "bg-destructive text-white hover:bg-destructive/90",
  },
  {
    value: "justified",
    label: "J",
    icon: AlertTriangleIcon,
    activeClass: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
];

interface AttendanceListProps {
  rows: AttendanceRow[];
  values: Map<string, AttendanceStatus>;
  justifications: Map<string, string>;
  onStatusChange: (enrollmentId: string, status: AttendanceStatus) => void;
  onJustificationChange: (enrollmentId: string, text: string) => void;
  onSave: () => void;
  saving: boolean;
  hasClass: boolean;
  hasChanges: boolean;
}

export function AttendanceList({
  rows,
  values,
  justifications,
  onStatusChange,
  onJustificationChange,
  onSave,
  saving,
  hasClass,
  hasChanges,
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
        <span className="nums font-semibold">{filledCount}</span> de <span className="nums font-semibold">{totalCount}</span> registradas
      </p>

      {rows.map((row) => {
        const current = values.get(row.enrollmentId) ?? null;
        const showJustification = current === "justified";

        return (
          <Card key={row.enrollmentId} size="sm">
            <CardContent className="flex flex-col gap-3 py-4 px-5">
              <div className="flex items-center justify-between gap-3">
                {/* The star: student name */}
                <h3 className="min-w-0 flex-1 truncate text-base sm:text-xl font-bold tracking-tight text-foreground">
                  {row.studentName}
                </h3>
                {/* Status buttons */}
                <div className="flex shrink-0 gap-1.5">
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
              </div>
              {showJustification && (
                <Input
                  placeholder="Qual o motivo da falta?"
                  value={justifications.get(row.enrollmentId) ?? ""}
                  onChange={(e) => onJustificationChange(row.enrollmentId, e.target.value)}
                  className="text-sm"
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button
        className="mt-2 w-full"
        size="lg"
        disabled={saving || !hasChanges}
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
