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
  isPending: boolean;
}

export function DashboardFinancial({ summary, isPending }: DashboardFinancialProps) {
  return (
    <>
      <div className="rounded-xl border-2 border-primary/20 bg-card p-6 shadow-sm">
        <h2 className="font-heading mb-5 text-3xl font-bold tracking-tight text-shadow-gold">
          Financeiro do Mes
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-green-200/60">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2Icon className="size-5 text-green-600" />
                <span className="font-heading text-lg font-semibold text-green-600">
                  Recebido
                </span>
              </div>
              <p className="font-heading text-3xl font-bold text-green-600 leading-tight">
                {isPending ? "\u2014" : formatCurrency(summary.totalNetReceived)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPending ? "" : `${summary.paidCount} de ${summary.feesCount}`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200/60">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="size-5 text-yellow-600" />
                <span className="font-heading text-lg font-semibold text-yellow-600">
                  Pendente
                </span>
              </div>
              <p className="font-heading text-3xl font-bold text-yellow-600 leading-tight">
                {isPending ? "\u2014" : formatCurrency(summary.totalPending)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200/60">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="size-5 text-red-500" />
                <span className="font-heading text-lg font-semibold text-red-500">
                  Vencido
                </span>
              </div>
              <p className="font-heading text-3xl font-bold text-red-500 leading-tight">
                {isPending ? "\u2014" : formatCurrency(summary.totalOverdue)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Link href="/finances">
        <Card className="border-2 border-gold/20 transition-all hover:border-gold/40 hover:shadow-md hover:shadow-gold/[0.06]">
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="flex items-center gap-2.5">
              <DollarSignIcon className="size-5 text-gold" />
              <span className="font-heading text-xl font-semibold text-foreground">
                Ver Financeiro Completo
              </span>
            </div>
            <ArrowRightIcon className="size-4 text-gold-muted" />
          </CardContent>
        </Card>
      </Link>
    </>
  );
}
