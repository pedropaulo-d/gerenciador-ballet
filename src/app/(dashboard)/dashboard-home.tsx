"use client";

import { useEffect, useState, useTransition } from "react";
import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import { getFinancialByMonth, type FinancialSummary } from "@/app/actions/financial";
import { getTodayAbsencesCount } from "@/app/actions/student-profile";
import { getTodayBirthdays, type BirthdayStudent } from "@/app/actions/dashboard";
import { BirthdayCard } from "@/components/dashboard/birthday-card";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardFinancial } from "@/components/dashboard/dashboard-financial";
import { getCurrentMonth, todayISO } from "@/lib/formatters";

const emptySummary: FinancialSummary = {
  totalGrossReceived: 0,
  totalLocationFees: 0,
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

  const monthLabel = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-heading text-5xl font-bold tracking-tight text-shadow-gold-lg">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground capitalize">
          {monthLabel}
        </p>
      </div>

      {!isPending && <BirthdayCard students={birthdays} />}

      <DashboardMetrics
        locationsCount={locationsCount}
        classesCount={classesCount}
        absencesToday={absencesToday}
        isPending={isPending}
      />

      <DashboardFinancial summary={summary} isPending={isPending} />
    </div>
  );
}
