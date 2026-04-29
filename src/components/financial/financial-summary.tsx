"use client";

import type { FinancialSummary as SummaryData } from "@/app/actions/financial";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2Icon, ClockIcon, AlertTriangleIcon } from "lucide-react";

interface FinancialSummaryProps {
  summary: SummaryData;
}

export function FinancialSummary({ summary }: FinancialSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Card size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 text-primary" />
            Recebido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold nums text-primary">
            {formatCurrency(summary.totalGrossReceived)}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="nums font-medium">{summary.paidCount}</span> de <span className="nums font-medium">{summary.feesCount}</span>
          </p>
          {summary.totalLocationFees > 0 && (
            <p className="text-xs text-muted-foreground">
              Repasses: <span className="nums font-medium">{formatCurrency(summary.totalLocationFees)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ClockIcon className="size-3.5 text-secondary-foreground" />
            Pendente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold nums text-secondary-foreground">
            {formatCurrency(summary.totalPending)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlertTriangleIcon className="size-3.5 text-destructive" />
            Vencido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold nums text-destructive">
            {formatCurrency(summary.totalOverdue)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
