"use client";

import Link from "next/link";
import type { FinancialSummary } from "@/app/actions/financial";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSignIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from "lucide-react";

interface DashboardFinancialProps {
  summary: FinancialSummary;
}

export function DashboardFinancial({ summary }: DashboardFinancialProps) {
  return (
    <>
      <div className="rounded-xl border-2 border-primary/20 bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="mb-4 sm:mb-5 text-2xl sm:text-3xl font-bold tracking-tight text-shadow-gold">
          Financeiro do Mes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2Icon className="size-5 text-primary" />
                <span className="text-lg font-semibold text-primary">
                  Recebido
                </span>
              </div>
              <p className="text-xl md:text-2xl font-semibold nums text-primary leading-tight tracking-tight">
                {formatCurrency(summary.totalGrossReceived)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="nums font-medium">{summary.paidCount}</span> de <span className="nums font-medium">{summary.feesCount}</span>
              </p>
              {summary.totalLocationFees > 0 && (
                <p className="text-xs text-muted-foreground">
                  Repasses provisionados: <span className="nums font-medium">{formatCurrency(summary.totalLocationFees)}</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="size-5 text-secondary-foreground" />
                <span className="text-lg font-semibold text-secondary-foreground">
                  Pendente
                </span>
              </div>
              <p className="text-xl md:text-2xl font-semibold nums text-secondary-foreground leading-tight tracking-tight">
                {formatCurrency(summary.totalPending)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="size-5 text-destructive" />
                <span className="text-lg font-semibold text-destructive">
                  Vencido
                </span>
              </div>
              <p className="text-xl md:text-2xl font-semibold nums text-destructive leading-tight tracking-tight">
                {formatCurrency(summary.totalOverdue)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Link href="/finances">
        <Card className="border-2 border-primary/20 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.06]">
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="flex items-center gap-2.5">
              <DollarSignIcon className="size-5 text-primary" />
              <span className="text-base sm:text-xl font-semibold text-foreground">
                Ver Financeiro Completo
              </span>
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </>
  );
}
