"use client";

import { useState } from "react";
import type { MonthlyFeeWithDetails, PaymentStatus } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BabyIcon,
  DollarSignIcon,
  GraduationCapIcon,
  MapPinIcon,
  LoaderIcon,
  HandCoinsIcon,
  Undo2Icon,
} from "lucide-react";

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  paid: { label: "Pago", variant: "success" },
  pending: { label: "Pendente", variant: "warning" },
  overdue: { label: "Vencido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

interface FeesTableProps {
  fees: MonthlyFeeWithDetails[];
  onPayManually?: (fee: MonthlyFeeWithDetails) => void;
  onUndoPayment?: (feeId: string) => Promise<void>;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  /**
   * Locks the selection group so the user cannot mix paid and pending/overdue
   * in the same batch. `null` (default) = both groups enabled.
   */
  selectionMode?: "pay" | "undo" | null;
}

export function FeesTable({ fees, onPayManually, onUndoPayment, selectedIds, onToggleSelect, selectionMode }: FeesTableProps) {
  const [undoingId, setUndoingId] = useState<string | null>(null);

  if (fees.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <DollarSignIcon className="size-10 opacity-50" />
        <p>Nenhuma mensalidade neste m&ecirc;s.</p>
        <p className="text-xs">Use o bot&atilde;o &quot;Gerar Mensalidades&quot; para criar.</p>
      </div>
    );
  }

  async function handleUndo(feeId: string) {
    if (!onUndoPayment) return;
    setUndoingId(feeId);
    await onUndoPayment(feeId);
    setUndoingId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {fees.map((fee) => {
        const { label, variant } = STATUS_CONFIG[fee.status];
        const student = fee.enrollment?.student;
        const cls = fee.enrollment?.class;
        const canPay = fee.status === "pending" || fee.status === "overdue";
        const canUndo = fee.status === "paid";
        const isUndoing = undoingId === fee.id;

        const isSelected = selectedIds?.includes(fee.id) ?? false;
        const canSelect = canPay || canUndo;
        const lockedByMode =
          (selectionMode === "pay" && !canPay) ||
          (selectionMode === "undo" && !canUndo);

        return (
          <Card key={fee.id} size="sm">
            <CardContent className="flex gap-3 py-5 px-5">
              {onToggleSelect && canSelect && (
                <div className="flex items-start pt-1 shrink-0">
                  <Checkbox
                    checked={isSelected}
                    disabled={lockedByMode}
                    onCheckedChange={() => onToggleSelect(fee.id)}
                    aria-label={`Selecionar mensalidade de ${student?.full_name ?? "aluna"}`}
                  />
                </div>
              )}
              <div className="flex flex-col gap-3 min-w-0 flex-1">
              {/* The star: guardian (responsavel) name + status badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {student?.guardian_name ?? "\u2014"}
                  </h3>
                  <span className="text-xs text-muted-foreground">Responsavel</span>
                </div>
                <Badge variant={variant} className="shrink-0 mt-1">{label}</Badge>
              </div>

              {/* Amount */}
              <p className="text-xl md:text-2xl font-semibold nums tracking-tight text-foreground">
                {formatCurrency(Number(fee.gross_amount))}
              </p>

              {/* Supporting details */}
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <BabyIcon className="size-3.5 shrink-0" />
                  <span>
                    Aluna:{" "}
                    <span className="font-medium text-foreground/80">
                      {student?.full_name ?? "\u2014"}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <GraduationCapIcon className="size-3.5 shrink-0" />
                  <span className="truncate max-w-[10rem] sm:max-w-none">{cls?.name ?? "\u2014"}</span>
                  <MapPinIcon className="size-3 shrink-0" />
                  <Badge variant="secondary" className="truncate max-w-[8rem] sm:max-w-none">{cls?.location?.name ?? "\u2014"}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {fee.status === "paid" && (
                    <>
                      <span>Asaas: <span className="nums font-medium">-{formatCurrency(Number(fee.asaas_fee))}</span></span>
                      <span>Local: <span className="nums font-medium">-{formatCurrency(Number(fee.location_fee))}</span></span>
                      <span>Liquido: <span className="nums font-semibold">{formatCurrency(Number(fee.net_amount))}</span></span>
                    </>
                  )}
                  <span className="text-foreground/70">Venc: dia <span className="nums font-semibold">{String(fee.enrollment?.due_day ?? "\u2014").padStart(2, "0")}</span></span>
                </div>
              </div>

              {/* Actions */}
              {(canPay || canUndo) && (
                <div className="flex items-center gap-2 pt-1">
                  {canPay && onPayManually && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => onPayManually(fee)}
                    >
                      <HandCoinsIcon className="size-3.5" />
                      Receber Manualmente
                    </Button>
                  )}
                  {canUndo && onUndoPayment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit text-muted-foreground"
                      disabled={isUndoing}
                      onClick={() => handleUndo(fee.id)}
                    >
                      {isUndoing ? (
                        <LoaderIcon className="size-3.5 animate-spin" />
                      ) : (
                        <Undo2Icon className="size-3.5" />
                      )}
                      Desfazer
                    </Button>
                  )}
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
