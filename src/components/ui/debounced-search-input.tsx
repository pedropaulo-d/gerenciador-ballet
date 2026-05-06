"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

const DEBOUNCE_MS = 300;

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Search input with 300ms debounce, synced to an external value (URL param).
 * Calls onChange with the trimmed value once the user stops typing.
 */
export function DebouncedSearchInput({
  value,
  onChange,
  placeholder,
}: DebouncedSearchInputProps) {
  const [input, setInput] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input when the external value changes (back/forward, filter reset).
  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setInput(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const normalized = next.trim();
      if (normalized !== value) onChange(normalized);
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative">
      <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
