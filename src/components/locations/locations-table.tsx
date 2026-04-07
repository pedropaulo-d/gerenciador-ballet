"use client";

import type { Location } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
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
  MapPinIcon,
  BanknoteIcon,
  LoaderIcon,
} from "lucide-react";

interface LocationsTableProps {
  locations: Location[];
  loading: boolean;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onCreateFirst: () => void;
}

export function LocationsTable({
  locations,
  loading,
  onEdit,
  onDelete,
  onCreateFirst,
}: LocationsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <MapPinIcon className="size-10 opacity-50" />
        <p>Nenhum local cadastrado.</p>
        <Button variant="outline" size="sm" onClick={onCreateFirst}>
          Cadastrar primeiro local
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {locations.map((location) => (
        <Card key={location.id} size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {location.name}
              {!location.is_active && (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </CardTitle>
            <CardAction>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onEdit(location)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(location)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {location.address && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="size-3.5 shrink-0" />
                <span>{location.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <BanknoteIcon className="size-3.5 shrink-0" />
              <span>
                Taxa: {formatCurrency(Number(location.fee_per_student))} / aluna
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
