"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface MonthSelectorProps {
  /** Format: "YYYY-MM-01" */
  value: string;
  onChange: (value: string) => void;
}

function parseMonth(value: string): { year: number; month: number } {
  const [y, m] = value.split("-").map(Number);
  return { year: y, month: m };
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const { year, month } = parseMonth(value);

  function prev() {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    onChange(formatMonth(y, m));
  }

  function next() {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    onChange(formatMonth(y, m));
  }

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" size="icon-xs" onClick={prev}>
        <ChevronLeftIcon className="size-4" />
      </Button>
      <span className="text-sm font-medium">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <Button variant="outline" size="icon-xs" onClick={next}>
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
