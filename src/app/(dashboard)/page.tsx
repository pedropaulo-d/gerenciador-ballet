import { requireAuth } from "@/lib/auth-guard";
import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import {
  getFinancialByMonth,
  type FinancialSummary,
} from "@/app/actions/financial";
import { getTodayAbsencesCount } from "@/app/actions/student-profile";
import { getTodayBirthdays } from "@/app/actions/dashboard";
import { getCurrentMonth, todayISO } from "@/lib/formatters";
import { DashboardHome } from "./dashboard-home";

const emptySummary: FinancialSummary = {
  totalGrossReceived: 0,
  totalLocationFees: 0,
  totalPending: 0,
  totalOverdue: 0,
  feesCount: 0,
  paidCount: 0,
};

export default async function HomePage() {
  const { role } = await requireAuth();
  const isAdmin = role === "admin";

  // Tudo em paralelo. O financeiro só entra no batch se for admin
  // (caso contrário o guard requireAdmin lançaria erro).
  const [locRes, clsRes, absRes, bdayRes, finRes] = await Promise.all([
    getLocations(),
    getClassesWithLocation(),
    getTodayAbsencesCount(todayISO()),
    getTodayBirthdays(),
    isAdmin ? getFinancialByMonth(getCurrentMonth(), 1, 1) : Promise.resolve(null),
  ]);

  const locationsCount = locRes.success ? locRes.data.length : 0;
  const classesCount = clsRes.success ? clsRes.data.length : 0;
  const absencesToday = absRes.success ? absRes.data : 0;
  const birthdays = bdayRes.success ? bdayRes.data : [];
  const summary =
    finRes && finRes.success ? finRes.data.summary : emptySummary;

  return (
    <DashboardHome
      isAdmin={isAdmin}
      locationsCount={locationsCount}
      classesCount={classesCount}
      absencesToday={absencesToday}
      birthdays={birthdays}
      summary={summary}
    />
  );
}
