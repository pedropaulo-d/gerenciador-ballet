"use client";

import type { Location, ClassWithLocation } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  GraduationCapIcon,
  ClockIcon,
  MapPinIcon,
  LoaderIcon,
} from "lucide-react";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DAY_SORT_ORDER = [1, 2, 3, 4, 5, 6, 0];

function sortedDays(days: number[]) {
  return [...days].sort((a, b) => DAY_SORT_ORDER.indexOf(a) - DAY_SORT_ORDER.indexOf(b));
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

export const ALL_LOCATIONS = "__all__";

interface ClassesTableProps {
  classes: ClassWithLocation[];
  locations: Location[];
  loading: boolean;
  selectedLocationId: string;
  onLocationChange: (locationId: string) => void;
  onEdit: (cls: ClassWithLocation) => void;
  onDelete: (cls: ClassWithLocation) => void;
  onCreateFirst: () => void;
}

export function ClassesTable({
  classes,
  locations,
  loading,
  selectedLocationId,
  onLocationChange,
  onEdit,
  onDelete,
  onCreateFirst,
}: ClassesTableProps) {
  return (
    <>
      {/* Filtro por local */}
      {locations.length > 0 && (
        <Select value={selectedLocationId} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full">
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LOCATIONS}>Todos os Locais</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <GraduationCapIcon className="size-10 opacity-50" />
          <p>
            {selectedLocationId !== ALL_LOCATIONS
              ? "Nenhuma turma neste local."
              : "Nenhuma turma cadastrada."}
          </p>
          <Button variant="outline" size="sm" onClick={onCreateFirst}>
            Cadastrar primeira turma
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => (
            <Card key={cls.id} size="sm">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-1.5">
                  {cls.name}
                  {sortedDays(cls.days_of_week).map((day) => (
                    <Badge key={day} variant="outline">
                      {DAY_LABELS[day]}
                    </Badge>
                  ))}
                  {!cls.is_active && (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                </CardTitle>
                <CardAction>
                  <div className="flex gap-1">
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
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
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
                      (máx. {cls.max_students} alunas)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
