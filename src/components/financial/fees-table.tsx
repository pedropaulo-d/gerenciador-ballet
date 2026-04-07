"use client";

import type { MonthlyFeeWithDetails, PaymentStatus } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSignIcon,
  GraduationCapIcon,
  MapPinIcon,
  LoaderIcon,
  HandCoinsIcon,
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
  loading: boolean;
  onPayManually?: (fee: MonthlyFeeWithDetails) => void;
}

export function FeesTable({ fees, loading, onPayManually }: FeesTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fees.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <DollarSignIcon className="size-10 opacity-50" />
        <p>Nenhuma mensalidade neste mês.</p>
        <p className="text-xs">Use o botão &quot;Gerar Mensalidades&quot; para criar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {fees.map((fee) => {
        const { label, variant } = STATUS_CONFIG[fee.status];
        const student = fee.enrollment.student;
        const cls = fee.enrollment.class;
        const canPay = fee.status === "pending" || fee.status === "overdue";

        return (
          <Card key={fee.id} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                {student.full_name}
                <Badge variant={variant}>{label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <GraduationCapIcon className="size-3.5 shrink-0" />
                <span>{cls.name}</span>
                <MapPinIcon className="size-3 shrink-0" />
                <Badge variant="secondary">{cls.location.name}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>Bruto: {formatCurrency(Number(fee.gross_amount))}</span>
                {fee.status === "paid" && (
                  <>
                    <span>Asaas: -{formatCurrency(Number(fee.asaas_fee))}</span>
                    <span>Local: -{formatCurrency(Number(fee.location_fee))}</span>
                    <span className="font-semibold text-green-600">
                      Líquido: {formatCurrency(Number(fee.net_amount))}
                    </span>
                  </>
                )}
                <span>Venc: dia {String(fee.enrollment.due_day).padStart(2, "0")}</span>
              </div>
              {canPay && onPayManually && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 w-fit"
                  onClick={() => onPayManually(fee)}
                >
                  <HandCoinsIcon className="size-3.5" />
                  Receber Manualmente
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
