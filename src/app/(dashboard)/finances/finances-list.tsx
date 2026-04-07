"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import type { MonthlyFeeWithDetails } from "@/types/database";
import {
  getFinancialByMonth,
  generateFeesForMonth,
  payFeeManually,
  type FinancialSummary as SummaryData,
} from "@/app/actions/financial";
import { MonthSelector } from "@/components/financial/month-selector";
import { FinancialSummary } from "@/components/financial/financial-summary";
import { FeesTable } from "@/components/financial/fees-table";
import { FeesPagination } from "@/components/financial/fees-pagination";
import { PayFeeDialog } from "@/components/financial/pay-fee-dialog";
import { Button } from "@/components/ui/button";
import { LoaderIcon, PlusCircleIcon } from "lucide-react";

const PAGE_SIZE = 15;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const emptySummary: SummaryData = {
  totalNetReceived: 0,
  totalPending: 0,
  totalOverdue: 0,
  feesCount: 0,
  paidCount: 0,
};

export function FinancesList() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [page, setPage] = useState(1);
  const [fees, setFees] = useState<MonthlyFeeWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SummaryData>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [payingFee, setPayingFee] = useState<MonthlyFeeWithDetails | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getFinancialByMonth(month, page, PAGE_SIZE);
    if (result.success) {
      setFees(result.data.fees);
      setTotal(result.data.total);
      setSummary(result.data.summary);
    } else {
      toast.error("Erro ao carregar financeiro", { description: result.error });
    }
    setLoading(false);
  }, [month, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page when month changes
  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    setPage(1);
  }

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateFeesForMonth(month);
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

    setPage(1);
    fetchData();
  }

  async function handlePayManually(feeId: string) {
    const result = await payFeeManually(feeId);
    if (result.success) {
      toast.success("Pagamento registrado!");
      fetchData();
    } else {
      toast.error("Erro ao registrar pagamento", { description: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Financeiro</h1>
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

      <MonthSelector value={month} onChange={handleMonthChange} />

      {!loading && <FinancialSummary summary={summary} />}

      <FeesTable
        fees={fees}
        loading={loading}
        onPayManually={setPayingFee}
      />

      <FeesPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
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
