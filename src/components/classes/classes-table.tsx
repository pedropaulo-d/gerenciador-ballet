"use client";

import type { ClassWithLocation } from "@/types/database";
import { DAY_LABELS, sortedDays, formatTime } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  PencilIcon,
  Trash2Icon,
  GraduationCapIcon,
  ClockIcon,
  MapPinIcon,
  LoaderIcon,
} from "lucide-react";

interface ClassesTableProps {
  classes: ClassWithLocation[];
  loading: boolean;
  hasLocationFilter: boolean;
  onEdit: (cls: ClassWithLocation) => void;
  onDelete: (cls: ClassWithLocation) => void;
  onCreateFirst: () => void;
}

export function ClassesTable({
  classes,
  loading,
  hasLocationFilter,
  onEdit,
  onDelete,
  onCreateFirst,
}: ClassesTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <GraduationCapIcon className="size-10 opacity-50" />
        <p>
          {hasLocationFilter
            ? "Nenhuma turma neste local."
            : "Nenhuma turma cadastrada."}
        </p>
        <Button variant="outline" size="sm" onClick={onCreateFirst}>
          Cadastrar primeira turma
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {classes.map((cls) => (
        <Card key={cls.id} size="sm">
          <CardContent className="flex flex-col gap-3 py-5 px-5">
            {/* Name + Actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {cls.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {sortedDays(cls.days_of_week).map((day) => (
                    <Badge key={day} variant="outline">
                      {DAY_LABELS[day]}
                    </Badge>
                  ))}
                  {!cls.is_active && (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onEdit(cls)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(cls)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPinIcon className="size-3.5 shrink-0" />
                <Badge variant="secondary">{cls.location.name}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="size-3.5 shrink-0" />
                <span>
                  {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                </span>
                {cls.max_students && (
                  <span className="text-muted-foreground/60">
                    (max. {cls.max_students} alunas)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
