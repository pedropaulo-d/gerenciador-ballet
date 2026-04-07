"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface FeesPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function FeesPagination({
  page,
  totalPages,
  onPageChange,
}: FeesPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t pt-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon className="size-4" />
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próximo
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
