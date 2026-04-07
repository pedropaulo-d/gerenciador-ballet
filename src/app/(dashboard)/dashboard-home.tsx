"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import { getFinancialByMonth, type FinancialSummary } from "@/app/actions/financial";
import { getTodayAbsencesCount } from "@/app/actions/student-profile";
import { getTodayBirthdays, type BirthdayStudent } from "@/app/actions/dashboard";
import { BirthdayCard } from "@/components/dashboard/birthday-card";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPinIcon,
  GraduationCapIcon,
  DollarSignIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "lucide-react";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [absencesToday, setAbsencesToday] = useState(0);
  const [birthdays, setBirthdays] = useState<BirthdayStudent[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [locRes, clsRes, finRes, absRes, bdayRes] = await Promise.all([
        getLocations(),
        getClassesWithLocation(),
        getFinancialByMonth(getCurrentMonth(), 1, 1),
        getTodayAbsencesCount(todayISO()),
        getTodayBirthdays(),
      ]);
      if (locRes.success) setLocationsCount(locRes.data.length);
      if (clsRes.success) setClassesCount(clsRes.data.length);
      if (finRes.success) setSummary(finRes.data.summary);
      if (absRes.success) setAbsencesToday(absRes.data);
      if (bdayRes.success) setBirthdays(bdayRes.data);
    });
  }, [startTransition]);

  const month = new Date();
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
      </div>

      {/* Birthday alert */}
      {!isPending && <BirthdayCard students={birthdays} />}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
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
                {isPending ? "—" : locationsCount}
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
                {isPending ? "—" : classesCount}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/attendance">
          <Card
            size="sm"
            className={
              !isPending && absencesToday > 0
                ? "border-red-200 transition-colors hover:border-red-300"
                : "transition-colors hover:border-foreground/20"
            }
          >
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <XCircleIcon className="size-3.5 text-red-500" />
                Faltas Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${!isPending && absencesToday > 0 ? "text-red-600" : ""}`}>
                {isPending ? "—" : absencesToday}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Financial summary */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Financeiro do Mes
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
                {isPending ? "—" : formatCurrency(summary.totalNetReceived)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPending ? "" : `${summary.paidCount} de ${summary.feesCount}`}
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
                {isPending ? "—" : formatCurrency(summary.totalPending)}
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
                {isPending ? "—" : formatCurrency(summary.totalOverdue)}
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
