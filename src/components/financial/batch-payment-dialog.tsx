"use client";

import { useState } from "react";
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

interface BatchPaymentDialogProps {
  fees: MonthlyFeeWithDetails[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    payments: { feeId: string; amountPaid: number }[],
    paymentDate: string,
  ) => Promise<void>;
}

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildInitialAmounts(fees: MonthlyFeeWithDetails[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const f of fees) next[f.id] = Number(f.gross_amount).toFixed(2);
  return next;
}

export function BatchPaymentDialog({
  fees,
  open,
  onOpenChange,
  onConfirm,
}: BatchPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(todayIsoLocal());
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    buildInitialAmounts(fees),
  );

  // Reset amounts/date when the selection changes (different fees passed in)
  // or when the dialog reopens. Adjust-during-render pattern.
  const signature = `${open ? "1" : "0"}|${fees.map((f) => f.id).join(",")}`;
  const [prevSignature, setPrevSignature] = useState(signature);
  if (prevSignature !== signature) {
    setPrevSignature(signature);
    setAmounts(buildInitialAmounts(fees));
    setPaymentDate(todayIsoLocal());
  }

  function setAmount(id: string, v: string) {
    setAmounts((prev) => ({ ...prev, [id]: v }));
  }

  const rows = fees.map((fee) => {
    const raw = amounts[fee.id] ?? "";
    const value = parseFloat(raw);
    const isValid = !isNaN(value) && value > 0;
    return { fee, raw, value, isValid };
  });

  const allValid = rows.length > 0 && rows.every((r) => r.isValid);
  const total = rows.reduce((acc, r) => acc + (r.isValid ? r.value : 0), 0);

  async function handleConfirm() {
    if (!allValid) return;
    setLoading(true);
    const payments = rows.map((r) => ({ feeId: r.fee.id, amountPaid: r.value }));
    await onConfirm(payments, paymentDate);
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Receber {fees.length} Mensalidade{fees.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Edite o valor recebido individualmente, se necessario, e confirme.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 pb-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="batch-payment-date"
              className="text-sm font-semibold"
            >
              Data do Recebimento
            </label>
            <Input
              id="batch-payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-10 sm:max-w-xs"
            />
          </div>

          <div className="flex flex-col gap-2">
            {rows.map(({ fee, raw, value, isValid }) => {
              const original = Number(fee.gross_amount);
              const diff = isValid ? value - original : 0;
              const refMonth = fee.reference_month.slice(0, 7);
              return (
                <div
                  key={fee.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-md border border-border/60 px-3 py-2"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-medium text-sm">
                      {fee.enrollment.student.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {refMonth} &middot; original {formatCurrency(original)}
                      {isValid && diff !== 0 && (
                        <>
                          {" "}
                          &middot;{" "}
                          {diff < 0
                            ? `desconto ${formatCurrency(Math.abs(diff))}`
                            : `acrescimo ${formatCurrency(diff)}`}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="relative shrink-0 sm:w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={raw}
                      onChange={(e) => setAmount(fee.id, e.target.value)}
                      aria-label={`Valor recebido de ${fee.enrollment.student.full_name}`}
                      className="h-10 pl-9 nums"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t bg-muted/30 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total a receber</span>
            <span className="text-xl font-semibold nums">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !allValid}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                "Confirmar Recebimentos"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
