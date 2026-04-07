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
import { LoaderIcon } from "lucide-react";

interface PayFeeDialogProps {
  fee: MonthlyFeeWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (feeId: string) => Promise<void>;
}

export function PayFeeDialog({
  fee,
  open,
  onOpenChange,
  onConfirm,
}: PayFeeDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!fee) return;
    setLoading(true);
    await onConfirm(fee.id);
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento</DialogTitle>
          <DialogDescription>
            Registrar pagamento manual da mensalidade?
          </DialogDescription>
        </DialogHeader>
        {fee && (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium">Aluna:</span>{" "}
              {fee.enrollment.student.full_name}
            </p>
            <p>
              <span className="font-medium">Turma:</span>{" "}
              {fee.enrollment.class.name} — {fee.enrollment.class.location.name}
            </p>
            <p>
              <span className="font-medium">Valor bruto:</span>{" "}
              {formatCurrency(Number(fee.gross_amount))}
            </p>
          </div>
        )}
        <DialogFooter>
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
              "Confirmar Pagamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
