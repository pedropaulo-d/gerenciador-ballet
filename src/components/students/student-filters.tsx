"use client";

import { useState, useEffect } from "react";
import type { Location, ClassWithLocation } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";

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
  const [searchInput, setSearchInput] = useState(search);

  // Sync when URL changes externally (browser back)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const filteredClasses =
    locationId !== ALL
      ? classes.filter((c) => c.location_id === locationId)
      : classes;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  }

  return (
    <>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, responsável, telefone ou CPF..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Buscar
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2">
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
