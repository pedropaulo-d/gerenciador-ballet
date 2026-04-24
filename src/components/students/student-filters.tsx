"use client";

import { useState, useEffect, useRef } from "react";
import type { Location, ClassWithLocation } from "@/types/database";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";

const ALL = "__all__";
const SEARCH_DEBOUNCE_MS = 300;

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
  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantém o input em sincronia quando a URL muda externamente (voltar do
  // browser, reset de filtros, etc).
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Limpa qualquer timeout pendente no unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filteredClasses =
    locationId !== ALL
      ? classes.filter((c) => c.location_id === locationId)
      : classes;

  function handleChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const normalized = value.trim();
      if (normalized !== search) onSearchChange(normalized);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <>
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, responsável, telefone ou CPF..."
          value={searchInput}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-8"
        />
      </div>

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
