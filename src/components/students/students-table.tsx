"use client";

import type { StudentWithEnrollments } from "@/types/database";
import { validityLabel } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  PencilIcon,
  Trash2Icon,
  UsersIcon,
  GraduationCapIcon,
  MapPinIcon,
  PhoneIcon,
  LoaderIcon,
  SearchIcon,
} from "lucide-react";

interface StudentsTableProps {
  students: StudentWithEnrollments[];
  loading: boolean;
  hasFilters: boolean;
  onEdit: (student: StudentWithEnrollments) => void;
  onDelete: (student: StudentWithEnrollments) => void;
  onCreateFirst: () => void;
}

export function StudentsTable({
  students,
  loading,
  hasFilters,
  onEdit,
  onDelete,
  onCreateFirst,
}: StudentsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

        return (
          <Card key={student.id} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                {student.full_name}
                {!student.is_active && (
                  <Badge variant="secondary">Inativa</Badge>
                )}
                <Badge variant={student.is_internal ? "default" : "outline"}>
                  {student.is_internal ? "Interna" : "Externa"}
                </Badge>
              </CardTitle>
              <CardAction>
                <div className="flex gap-1">
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
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {student.guardian_phone ? (
                <div className="flex items-center gap-2">
                  <PhoneIcon className="size-3.5 shrink-0" />
                  <span>
                    {student.guardian_name} · {student.guardian_phone}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-3.5 shrink-0" />
                  <span>Resp: {student.guardian_name}</span>
                </div>
              )}
              {activeEnrollments.length > 0 ? (
                activeEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center gap-2">
                    <GraduationCapIcon className="size-3.5 shrink-0" />
                    <span>{enrollment.class.name}</span>
                    <MapPinIcon className="size-3 shrink-0" />
                    <Badge variant="secondary">
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
                  <span>Sem matrícula ativa</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
