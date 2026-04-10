"use client";

import { useEffect, useState } from "react";
import type { MonthlyFeeWithDetails } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onConfirm: (feeId: string, receivedAmount: number) => Promise<void>;
}

export function PayFeeDialog({
  fee,
  open,
  onOpenChange,
  onConfirm,
}: PayFeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");

  // Reset amount when a new fee is opened
  useEffect(() => {
    if (fee && open) {
      setAmount(Number(fee.gross_amount).toFixed(2));
    }
  }, [fee, open]);

  async function handleConfirm() {
    if (!fee) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;
    setLoading(true);
    await onConfirm(fee.id, value);
    setLoading(false);
    onOpenChange(false);
  }

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const originalAmount = fee ? Number(fee.gross_amount) : 0;
  const diff = isValid ? parsedAmount - originalAmount : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
            Confirmar Recebimento Manual
          </DialogTitle>
          <DialogDescription>
            Registre o valor efetivamente recebido por fora do gateway.
          </DialogDescription>
        </DialogHeader>

        {fee && (
          <div className="flex flex-col gap-5 py-2">
            {/* Student + class info */}
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Aluna:</span>{" "}
                {fee.enrollment.student.full_name}
              </p>
              <p>
                <span className="font-medium text-foreground">Turma:</span>{" "}
                {fee.enrollment.class.name} — {fee.enrollment.class.location.name}
              </p>
              <p>
                <span className="font-medium text-foreground">Valor original:</span>{" "}
                {formatCurrency(originalAmount)}
              </p>
            </div>

            {/* Editable amount */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="received-amount"
                className="font-heading text-lg font-semibold tracking-tight"
              >
                Valor Efetivamente Recebido
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="received-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 pl-10 text-lg font-semibold"
                  autoFocus
                />
              </div>
              {isValid && diff !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {diff < 0
                    ? `Desconto de ${formatCurrency(Math.abs(diff))}`
                    : `Acrescimo de ${formatCurrency(diff)}`}{" "}
                  sobre o valor original.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !isValid}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              "Confirmar Recebimento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
