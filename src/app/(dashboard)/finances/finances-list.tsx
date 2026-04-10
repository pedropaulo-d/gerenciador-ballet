"use client";

import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";
import type { MonthlyFeeWithDetails, Location, ClassWithLocation } from "@/types/database";
import {
  getFinancialByMonth,
  generateFeesForMonth,
  payFeeManually,
  undoPayment,
  type FinancialSummary as SummaryData,
  type FinancialFilters,
} from "@/app/actions/financial";
import { getLocations } from "@/app/actions/locations";
import { getClassesWithLocation } from "@/app/actions/classes";
import { MonthSelector } from "@/components/financial/month-selector";
import { FinancialSummary } from "@/components/financial/financial-summary";
import { FinancialFilters as FinancialFiltersUI } from "@/components/financial/financial-filters";
import { FeesTable } from "@/components/financial/fees-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PayFeeDialog } from "@/components/financial/pay-fee-dialog";
import { useUrlParams } from "@/lib/use-url-params";
import { Button } from "@/components/ui/button";
import { getCurrentMonth } from "@/lib/formatters";
import { LoaderIcon, PlusCircleIcon } from "lucide-react";

const PAGE_SIZE = 15;
const ALL = "__all__";

const emptySummary: SummaryData = {
  totalGrossReceived: 0,
  totalLocationFees: 0,
  totalPending: 0,
  totalOverdue: 0,
  feesCount: 0,
  paidCount: 0,
};

export function FinancesList() {
  const { searchParams, setParams } = useUrlParams("/finances", ALL);
  const [isPending, startTransition] = useTransition();

  // URL state
  const urlMonth = searchParams.get("month") ?? getCurrentMonth();
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const urlStatus = searchParams.get("status") ?? ALL;
  const urlLocationId = searchParams.get("location") ?? ALL;
  const urlClassId = searchParams.get("class") ?? ALL;

  // Data
  const [fees, setFees] = useState<MonthlyFeeWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SummaryData>(emptySummary);
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassWithLocation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [payingFee, setPayingFee] = useState<MonthlyFeeWithDetails | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Derive filters from URL (no state needed)
  const filters: FinancialFilters = useMemo(() => ({
    status: urlStatus !== ALL ? urlStatus : undefined,
    locationId: urlLocationId !== ALL ? urlLocationId : undefined,
    classId: urlClassId !== ALL ? urlClassId : undefined,
  }), [urlStatus, urlLocationId, urlClassId]);

  // -- Data fetching --

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const result = await getFinancialByMonth(urlMonth, urlPage, PAGE_SIZE, filters);
      if (result.success) {
        setFees(result.data.fees);
        setTotal(result.data.total);
        setSummary(result.data.summary);
      } else {
        toast.error("Erro ao carregar financeiro", { description: result.error });
      }
    });
  }, [urlMonth, urlPage, filters, startTransition]);

  // Load filter options once
  useEffect(() => {
    startTransition(async () => {
      const [locRes, clsRes] = await Promise.all([
        getLocations(),
        getClassesWithLocation(),
      ]);
      if (locRes.success) setLocations(locRes.data);
      if (clsRes.success) setClasses(clsRes.data);
    });
  }, [startTransition]);

  // Re-fetch when URL params change
  useEffect(() => { fetchData(); }, [fetchData]);

  // -- Handlers --

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateFeesForMonth(urlMonth);
    setGenerating(false);

    if (!result.success) {
      toast.error("Erro ao gerar mensalidades", { description: result.error });
      return;
    }

    const { created, skipped } = result.data;
    if (created === 0) {
      toast.info("Nenhuma mensalidade nova para gerar.", {
        description: `${skipped} já existiam.`,
      });
    } else {
      toast.success(`${created} mensalidades geradas!`, {
        description: skipped > 0 ? `${skipped} já existiam.` : undefined,
      });
    }

    setParams({ page: undefined });
    fetchData();
  }

  async function handlePayManually(feeId: string, receivedAmount: number) {
    const result = await payFeeManually(feeId, receivedAmount);
    if (result.success) {
      toast.success("Pagamento registrado!");
      fetchData();
    } else {
      toast.error("Erro ao registrar pagamento", { description: result.error });
    }
  }

  async function handleUndoPayment(feeId: string) {
    const result = await undoPayment(feeId);
    if (result.success) {
      toast.success("Pagamento desfeito!");
      fetchData();
    } else {
      toast.error("Erro ao desfazer pagamento", { description: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-shadow-gold">Financeiro</h1>
        <Button
          onClick={handleGenerate}
          size="sm"
          variant="outline"
          disabled={generating}
        >
          {generating ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <PlusCircleIcon className="size-4" />
          )}
          Gerar Mensalidades
        </Button>
      </div>

      <MonthSelector
        value={urlMonth}
        onChange={(m) => setParams({ month: m, page: undefined })}
      />

      <FinancialFiltersUI
        status={urlStatus}
        locationId={urlLocationId}
        classId={urlClassId}
        locations={locations}
        classes={classes}
        onStatusChange={(v) => setParams({ status: v })}
        onLocationChange={(v) => setParams({ location: v, class: undefined })}
        onClassChange={(v) => setParams({ class: v })}
      />

      {!isPending && <FinancialSummary summary={summary} />}

      <FeesTable
        fees={fees}
        loading={isPending}
        onPayManually={setPayingFee}
        onUndoPayment={handleUndoPayment}
      />

      <PaginationControls
        page={urlPage}
        totalPages={totalPages}
        onPageChange={(p) => setParams({ page: p > 1 ? String(p) : undefined })}
      />

      <PayFeeDialog
        fee={payingFee}
        open={payingFee !== null}
        onOpenChange={(open) => !open && setPayingFee(null)}
        onConfirm={handlePayManually}
      />
    </div>
  );
}
