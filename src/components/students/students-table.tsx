"use client";

import type { StudentWithEnrollments } from "@/types/database";
import { validityLabel } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PencilIcon,
  Trash2Icon,
  UsersIcon,
  GraduationCapIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  EyeIcon,
} from "lucide-react";

interface StudentsTableProps {
  students: StudentWithEnrollments[];
  hasFilters: boolean;
  onEdit: (student: StudentWithEnrollments) => void;
  onDelete: (student: StudentWithEnrollments) => void;
  onViewProfile: (student: StudentWithEnrollments) => void;
  onCreateFirst: () => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export function StudentsTable({
  students,
  hasFilters,
  onEdit,
  onDelete,
  onViewProfile,
  onCreateFirst,
  selectedIds,
  onToggleSelect,
}: StudentsTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        {hasFilters ? (
          <>
            <SearchIcon className="size-10 opacity-50" />
            <p>Nenhuma aluna encontrada com esses filtros.</p>
          </>
        ) : (
          <>
            <UsersIcon className="size-10 opacity-50" />
            <p>Nenhuma aluna cadastrada.</p>
            <Button variant="outline" size="sm" onClick={onCreateFirst}>
              Cadastrar primeira aluna
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {students.map((student) => {
        const activeEnrollments = student.enrollments.filter(
          (e) => e.status === "active"
        );

        const isSelected = selectedIds?.includes(student.id) ?? false;

        return (
          <Card key={student.id} size="sm">
            <CardContent className="flex gap-3 py-5 px-5">
              {onToggleSelect && (
                <div className="flex items-start pt-1 shrink-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(student.id)}
                    aria-label={`Selecionar ${student.full_name}`}
                  />
                </div>
              )}
              <div className="flex flex-col gap-3 min-w-0 flex-1">
              {/* Row: Name + Actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  {/* The star: student name */}
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onViewProfile(student)}
                  >
                    <h3 className="truncate text-lg sm:text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
                      {student.full_name}
                    </h3>
                  </button>
                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {!student.is_active && (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                    <Badge variant={student.is_internal ? "default" : "outline"}>
                      {student.is_internal ? "Interna" : "Externa"}
                    </Badge>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onViewProfile(student)}
                  >
                    <EyeIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEdit(student)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(student)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>

              {/* Supporting details */}
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {student.guardian_phone ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <PhoneIcon className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {student.guardian_name} · {student.guardian_phone}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <UsersIcon className="size-3.5 shrink-0" />
                    <span className="truncate">Resp: {student.guardian_name}</span>
                  </div>
                )}
                {activeEnrollments.length > 0 ? (
                  activeEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <GraduationCapIcon className="size-3.5 shrink-0" />
                      <span className="truncate max-w-[10rem] sm:max-w-none">{enrollment.class.name}</span>
                      <MapPinIcon className="size-3 shrink-0" />
                      <Badge variant="secondary" className="truncate max-w-[8rem] sm:max-w-none">
                        {enrollment.class.location.name}
                      </Badge>
                      <Badge variant="outline">
                        {validityLabel(enrollment.validity_type)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <GraduationCapIcon className="size-3.5 shrink-0" />
                    <span>Sem matricula ativa</span>
                  </div>
                )}
              </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
