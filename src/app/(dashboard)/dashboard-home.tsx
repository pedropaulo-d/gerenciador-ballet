"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import { getFinancialByMonth, type FinancialSummary } from "@/app/actions/financial";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPinIcon,
  GraduationCapIcon,
  DollarSignIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
} from "lucide-react";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const emptySummary: FinancialSummary = {
  totalNetReceived: 0,
  totalPending: 0,
  totalOverdue: 0,
  feesCount: 0,
  paidCount: 0,
};

export function DashboardHome() {
  const [locationsCount, setLocationsCount] = useState(0);
  const [classesCount, setClassesCount] = useState(0);
  const [summary, setSummary] = useState<FinancialSummary>(emptySummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [locRes, clsRes, finRes] = await Promise.all([
        getLocations(),
        getClassesWithLocation(),
        getFinancialByMonth(getCurrentMonth(), 1, 1),
      ]);
      if (locRes.success) setLocationsCount(locRes.data.length);
      if (clsRes.success) setClassesCount(clsRes.data.length);
      if (finRes.success) setSummary(finRes.data.summary);
      setLoading(false);
    }
    load();
  }, []);

  const month = new Date();
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/locations">
          <Card size="sm" className="transition-colors hover:border-foreground/20">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPinIcon className="size-3.5" />
                Locais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {loading ? "—" : locationsCount}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/classes">
          <Card size="sm" className="transition-colors hover:border-foreground/20">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <GraduationCapIcon className="size-3.5" />
                Turmas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {loading ? "—" : classesCount}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Financial summary */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Financeiro do M&ecirc;s
        </h2>
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
                {loading ? "—" : formatCurrency(summary.totalNetReceived)}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? "" : `${summary.paidCount} de ${summary.feesCount}`}
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
                {loading ? "—" : formatCurrency(summary.totalPending)}
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
                {loading ? "—" : formatCurrency(summary.totalOverdue)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick link to financial */}
      <Link href="/finances">
        <Card size="sm" className="transition-colors hover:border-foreground/20">
          <CardContent className="flex items-center gap-2 py-3">
            <DollarSignIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ver Financeiro Completo</span>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
