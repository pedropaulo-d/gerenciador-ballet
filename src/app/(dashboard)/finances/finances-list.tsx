"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  MonthlyFeeWithDetails,
  Location,
  ClassWithLocation,
} from "@/types/database";
import {
  generateFeesForMonth,
  payFeeManually,
  payFeesBatchManually,
  undoPayment,
  undoPaymentsBatch,
  deleteMonthlyFees,
  type FinancialSummary as SummaryData,
} from "@/app/actions/financial";
import { MonthSelector } from "@/components/financial/month-selector";
import { FinancialSummary } from "@/components/financial/financial-summary";
import { FinancialFilters as FinancialFiltersUI } from "@/components/financial/financial-filters";
import { FeesTable } from "@/components/financial/fees-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PayFeeDialog } from "@/components/financial/pay-fee-dialog";
import { BatchPaymentDialog } from "@/components/financial/batch-payment-dialog";
import { UndoPaymentsDialog } from "@/components/financial/undo-payments-dialog";
import { useUrlParams } from "@/lib/use-url-params";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCurrentMonth } from "@/lib/formatters";
import {
  HandCoinsIcon,
  LoaderIcon,
  PlusCircleIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";

const PAGE_SIZE = 15;
const ALL = "__all__";

interface FinancesListProps {
  fees: MonthlyFeeWithDetails[];
  total: number;
  summary: SummaryData;
  locations: Location[];
  classes: ClassWithLocation[];
}

export function FinancesList({
  fees,
  total,
  summary,
  locations,
  classes,
}: FinancesListProps) {
  const router = useRouter();
  const { searchParams, setParams } = useUrlParams("/finances", ALL);
  const [, startTransition] = useTransition();

  // URL é a única fonte de verdade para busca/paginação.
  const urlMonth = searchParams.get("month") ?? getCurrentMonth();
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const urlStatus = searchParams.get("status") ?? ALL;
  const urlLocationId = searchParams.get("location") ?? ALL;
  const urlClassId = searchParams.get("class") ?? ALL;

  // UI-only state (nada relacionado a fetch de dados).
  const [generating, setGenerating] = useState(false);
  const [payingFee, setPayingFee] = useState<MonthlyFeeWithDetails | null>(null);
  const [selectedFees, setSelectedFees] = useState<MonthlyFeeWithDetails[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showUndoDialog, setShowUndoDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Quando uma operacao em lote falha parcialmente, guardamos os IDs que NAO
  // foram processados para que o reset de selecao (acionado pelo refresh) os
  // preserve, permitindo retry sem selecionar tudo de novo.
  const [pendingFailedIds, setPendingFailedIds] = useState<string[] | null>(null);

  // Reset de seleção quando a prop `fees` muda (nova página, filtro ou refresh
  // pós-mutation). Padrão oficial do React para "resetar estado quando prop muda"
  // sem useEffect — ajuste durante render evita renders em cascata.
  const [prevFees, setPrevFees] = useState(fees);
  if (prevFees !== fees) {
    setPrevFees(fees);
    if (pendingFailedIds && pendingFailedIds.length > 0) {
      const restored = fees.filter((f) => pendingFailedIds.includes(f.id));
      setSelectedFees(restored);
      setPendingFailedIds(null);
    } else {
      setSelectedFees([]);
    }
  }

  // Grupos: "pay" (pendente/vencido -> receber) e "undo" (pago -> desfazer).
  // O lote precisa ser homogeneo, entao travamos o modo pelo primeiro item selecionado.
  const payFees = fees.filter(
    (f) => f.status === "pending" || f.status === "overdue",
  );
  const undoFees = fees.filter((f) => f.status === "paid");
  const someSelected = selectedFees.length > 0;
  const activeGroup: "pay" | "undo" = someSelected
    ? selectedFees[0].status === "paid"
      ? "undo"
      : "pay"
    : payFees.length > 0
      ? "pay"
      : "undo";
  const groupCandidates = activeGroup === "undo" ? undoFees : payFees;
  const selectionMode = someSelected ? activeGroup : null;
  const selectedIds = selectedFees.map((f) => f.id);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

    // Volta pra página 1 e força re-render do Server Component
    // (revalidatePath já disparou dentro da action).
    setParams({ page: undefined });
    startTransition(() => router.refresh());
  }

  async function handlePayManually(feeId: string, receivedAmount: number) {
    const result = await payFeeManually(feeId, receivedAmount);
    if (result.success) {
      toast.success("Pagamento registrado!");
      startTransition(() => router.refresh());
    } else {
      toast.error("Erro ao registrar pagamento", { description: result.error });
    }
  }

  async function handleUndoPayment(feeId: string) {
    const result = await undoPayment(feeId);
    if (result.success) {
      toast.success("Pagamento desfeito!");
      startTransition(() => router.refresh());
    } else {
      toast.error("Erro ao desfazer pagamento", { description: result.error });
    }
  }

  function handleToggleSelect(id: string) {
    setSelectedFees((prev) => {
      if (prev.some((f) => f.id === id)) {
        return prev.filter((f) => f.id !== id);
      }
      const fee = fees.find((f) => f.id === id);
      if (!fee) return prev;
      return [...prev, fee];
    });
  }

  function handleToggleAll() {
    if (
      groupCandidates.length > 0 &&
      selectedFees.length === groupCandidates.length
    ) {
      setSelectedFees([]);
    } else {
      setSelectedFees(groupCandidates);
    }
  }

  async function handlePayBatch(
    payments: { feeId: string; amountPaid: number }[],
    paymentDate: string,
  ) {
    const result = await payFeesBatchManually(payments, paymentDate);
    if (result.success) {
      toast.success(`${result.data.paid} mensalidade(s) recebidas!`);
      setSelectedFees([]);
      startTransition(() => router.refresh());
    } else {
      toast.error("Erro ao registrar pagamentos", { description: result.error });
    }
  }

  async function handleUndoBatch() {
    const result = await undoPaymentsBatch(selectedIds);
    if (!result.success) {
      toast.error("Erro ao desfazer pagamentos", { description: result.error });
      return;
    }

    const { undoneIds, failedIds } = result.data;

    if (undoneIds.length === 0 && failedIds.length > 0) {
      toast.error(`Nenhum recebimento foi desfeito. ${failedIds.length} falharam.`);
      return;
    }

    if (failedIds.length > 0) {
      toast.warning(
        `${undoneIds.length} desfeito(s), ${failedIds.length} falharam.`,
      );
      setPendingFailedIds(failedIds);
    } else {
      toast.success(`${undoneIds.length} recebimento(s) desfeito(s)!`);
    }

    startTransition(() => router.refresh());
  }

  async function handleDeleteSelected() {
    setDeleting(true);
    const result = await deleteMonthlyFees(selectedIds);
    setDeleting(false);
    setShowDeleteDialog(false);

    if (result.success) {
      toast.success(`${result.data.deleted} mensalidade(s) excluída(s).`);
      setSelectedFees([]);
      startTransition(() => router.refresh());
    } else {
      toast.error("Erro ao excluir mensalidades", { description: result.error });
    }
  }

  const allSelected =
    groupCandidates.length > 0 &&
    selectedFees.length === groupCandidates.length;
  const hasSelectable = payFees.length > 0 || undoFees.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-shadow-gold">Financeiro</h1>
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
          <span className="hidden sm:inline">Gerar Mensalidades</span>
          <span className="sm:hidden">Gerar</span>
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

      <FinancialSummary summary={summary} />

      {hasSelectable && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleToggleAll}
              aria-label="Selecionar todas as mensalidades do grupo ativo"
            />
            <span className="text-muted-foreground">
              Selecionar todas
              {someSelected && activeGroup === "undo" ? " (pagas)" : ""}
            </span>
          </label>
          {someSelected && activeGroup === "pay" && (
            <>
              <Button
                size="sm"
                onClick={() => setShowBatchDialog(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <HandCoinsIcon className="size-3.5" />
                Receber {selectedFees.length} Selecionada
                {selectedFees.length === 1 ? "" : "s"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2Icon className="size-3.5" />
                Excluir ({selectedFees.length})
              </Button>
            </>
          )}
          {someSelected && activeGroup === "undo" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUndoDialog(true)}
            >
              <Undo2Icon className="size-3.5" />
              Desfazer {selectedFees.length} Recebimento
              {selectedFees.length === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      )}

      <FeesTable
        fees={fees}
        onPayManually={setPayingFee}
        onUndoPayment={handleUndoPayment}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        selectionMode={selectionMode}
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

      <BatchPaymentDialog
        fees={selectedFees}
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        onConfirm={handlePayBatch}
      />

      <UndoPaymentsDialog
        fees={selectedFees}
        open={showUndoDialog}
        onOpenChange={setShowUndoDialog}
        onConfirm={handleUndoBatch}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensalidades</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente{" "}
              <strong>{selectedIds.length}</strong> mensalidade(s)? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? (
                <LoaderIcon className="size-3.5 animate-spin" />
              ) : (
                <Trash2Icon className="size-3.5" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
