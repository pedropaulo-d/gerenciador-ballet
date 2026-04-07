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
    <div className="grid grid-cols-3 gap-2">
      <Card size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 text-green-600" />
            Recebido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-green-600">
            {formatCurrency(summary.totalNetReceived)}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.paidCount} de {summary.feesCount}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ClockIcon className="size-3.5 text-yellow-600" />
            Pendente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-yellow-600">
            {formatCurrency(summary.totalPending)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlertTriangleIcon className="size-3.5 text-red-500" />
            Vencido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold text-red-500">
            {formatCurrency(summary.totalOverdue)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
