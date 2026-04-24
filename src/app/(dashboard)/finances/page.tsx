import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import {
  getFinancialByMonth,
  type FinancialFilters,
  type FinancialSummary,
} from "@/app/actions/financial";
import { getCurrentMonth } from "@/lib/formatters";
import { FinancesList } from "./finances-list";

const PAGE_SIZE = 15;
const ALL = "__all__";

const emptySummary: FinancialSummary = {
  totalGrossReceived: 0,
  totalLocationFees: 0,
  totalPending: 0,
  totalOverdue: 0,
  feesCount: 0,
  paidCount: 0,
};

type SearchParams = Promise<{
  month?: string;
  page?: string;
  status?: string;
  location?: string;
  class?: string;
}>;

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const month = sp.month || getCurrentMonth();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const filters: FinancialFilters = {
    status: sp.status && sp.status !== ALL ? sp.status : undefined,
    locationId: sp.location && sp.location !== ALL ? sp.location : undefined,
    classId: sp.class && sp.class !== ALL ? sp.class : undefined,
  };

  const [locRes, clsRes, finRes] = await Promise.all([
    getLocations(),
    getClassesWithLocation(),
    getFinancialByMonth(month, page, PAGE_SIZE, filters),
  ]);

  return (
    <FinancesList
      fees={finRes.success ? finRes.data.fees : []}
      total={finRes.success ? finRes.data.total : 0}
      summary={finRes.success ? finRes.data.summary : emptySummary}
      locations={locRes.success ? locRes.data : []}
      classes={clsRes.success ? clsRes.data : []}
    />
  );
}
