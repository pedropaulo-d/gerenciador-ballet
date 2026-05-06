"use client";

import type { Location, ClassWithLocation } from "@/types/database";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

interface FinancialFiltersProps {
  search: string;
  status: string;
  locationId: string;
  classId: string;
  locations: Location[];
  classes: ClassWithLocation[];
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onLocationChange: (locationId: string) => void;
  onClassChange: (classId: string) => void;
}

export function FinancialFilters({
  search,
  status,
  locationId,
  classId,
  locations,
  classes,
  onSearchChange,
  onStatusChange,
  onLocationChange,
  onClassChange,
}: FinancialFiltersProps) {
  const filteredClasses =
    locationId !== ALL
      ? classes.filter((c) => c.location_id === locationId)
      : classes;

  return (
    <div className="flex flex-col gap-2">
      <DebouncedSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por aluna, responsável, telefone ou CPF..."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Recebido</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationId} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classId} onValueChange={onClassChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {filteredClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} — {cls.location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
