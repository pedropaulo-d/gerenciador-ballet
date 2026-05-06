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

interface StudentFiltersProps {
  search: string;
  locationId: string;
  classId: string;
  locations: Location[];
  classes: ClassWithLocation[];
  onSearchChange: (search: string) => void;
  onLocationChange: (locationId: string) => void;
  onClassChange: (classId: string) => void;
}

export function StudentFilters({
  search,
  locationId,
  classId,
  locations,
  classes,
  onSearchChange,
  onLocationChange,
  onClassChange,
}: StudentFiltersProps) {
  const filteredClasses =
    locationId !== ALL
      ? classes.filter((c) => c.location_id === locationId)
      : classes;

  return (
    <>
      <DebouncedSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por nome, responsável, telefone ou CPF..."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={locationId} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os Locais</SelectItem>
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
            <SelectItem value={ALL}>Todas as Turmas</SelectItem>
            {filteredClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} — {cls.location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
