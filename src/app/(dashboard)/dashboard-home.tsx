import type { FinancialSummary } from "@/app/actions/financial";
import type { BirthdayStudent } from "@/app/actions/dashboard";
import { BirthdayCard } from "@/components/dashboard/birthday-card";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardFinancial } from "@/components/dashboard/dashboard-financial";

interface DashboardHomeProps {
  isAdmin: boolean;
  locationsCount: number;
  classesCount: number;
  absencesToday: number;
  birthdays: BirthdayStudent[];
  summary: FinancialSummary;
}

export function DashboardHome({
  isAdmin,
  locationsCount,
  classesCount,
  absencesToday,
  birthdays,
  summary,
}: DashboardHomeProps) {
  const monthLabel = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-shadow-gold-lg">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground capitalize">
          {monthLabel}
        </p>
      </div>

      <BirthdayCard students={birthdays} />

      <DashboardMetrics
        locationsCount={locationsCount}
        classesCount={classesCount}
        absencesToday={absencesToday}
        isPending={false}
      />

      {isAdmin && <DashboardFinancial summary={summary} isPending={false} />}
    </div>
  );
}
