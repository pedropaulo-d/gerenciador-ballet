"use client";

import { useState } from "react";
import type { MonthlyFeeWithDetails } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoaderIcon, Undo2Icon } from "lucide-react";

interface UndoPaymentsDialogProps {
  fees: MonthlyFeeWithDetails[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function UndoPaymentsDialog({
  fees,
  open,
  onOpenChange,
  onConfirm,
}: UndoPaymentsDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Desfazer {fees.length} Recebimento{fees.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            As mensalidades abaixo voltarao ao status pendente (ou vencido,
            conforme o vencimento) e o valor original sera restaurado.
          </DialogDescription>
        </DialogHeader>

        <ul className="mx-6 mb-2 flex flex-col max-h-72 overflow-y-auto rounded-md border border-border/60 px-3 py-2 text-sm">
          {fees.map((fee) => (
            <li
              key={fee.id}
              className="flex items-center justify-between gap-3 py-1"
            >
              <span className="truncate font-medium">
                {fee.enrollment.student.full_name}
              </span>
              <span className="text-muted-foreground text-xs nums shrink-0">
                {fee.reference_month.slice(0, 7)} &middot;{" "}
                {formatCurrency(Number(fee.gross_amount))}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex flex-row justify-end gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <Undo2Icon className="size-4" />
            )}
            Confirmar Estorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
