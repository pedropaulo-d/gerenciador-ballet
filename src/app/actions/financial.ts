"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";

const supabase = getServiceSupabase();
import type { MonthlyFeeWithDetails } from "@/types/database";
import { nowBrasilia } from "@/lib/formatters";

// ---------- Validation Schemas ----------

const uuidSchema = z.string().uuid();
const referenceMonthSchema = z.string().regex(/^\d{4}-\d{2}-01$/, "Formato invalido. Use YYYY-MM-01.");
const positiveAmount = z.number().positive().max(99_999_999.99);
const pageSchema = z.number().int().min(1).max(10_000);
const pageSizeSchema = z.number().int().min(1).max(100);
const statusSchema = z.enum(["pending", "paid", "overdue", "cancelled"]);

// ---------- Types ----------

export type FinancialSummary = {
  totalGrossReceived: number;
  totalLocationFees: number;
  totalPending: number;
  totalOverdue: number;
  feesCount: number;
  paidCount: number;
};

export type FinancialPageData = {
  fees: MonthlyFeeWithDetails[];
  total: number;
  summary: FinancialSummary;
};

// ---------- Query-specific row shapes ----------

// ---------- Supabase join shape helpers ----------
// PostgREST returns objects for many-to-one joins (FK on source table)
// and arrays for one-to-many. We handle both defensively.

/** Unwrap a PostgREST join that may be object or array */
function unwrapJoin<T>(value: T | T[] | null | undefined): T | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/** Shape returned by markOverdueFees: "id, enrollment:enrollments(due_day)" */
type PendingFeeRow = {
  id: string;
  enrollment: { due_day: number } | { due_day: number }[] | null;
};

/** Shape returned by enrollment pre-filter: "id, class:classes(location_id)" */
type EnrollmentFilterRow = {
  id: string;
  class: { location_id: string } | { location_id: string }[] | null;
};

/** Shape returned by generateFeesForMonth: "id, base_fee, class:classes(location:locations(fee_per_student))" */
type EnrollmentWithLocationFee = {
  id: string;
  base_fee: number;
  class: { location: { fee_per_student: number } | { fee_per_student: number }[] | null } | { location: { fee_per_student: number } | { fee_per_student: number }[] | null }[] | null;
};

// ---------- Filter types ----------

export type FinancialFilters = {
  status?: string;
  locationId?: string;
  classId?: string;
};

// ---------- Actions ----------

/**
 * Fetch monthly fees for a given month with pagination, filters, and full enrollment details.
 * Also auto-marks pending fees as overdue based on enrollment.due_day.
 */
export async function getFinancialByMonth(
  referenceMonth: string,
  page = 1,
  pageSize = 15,
  filters?: FinancialFilters
): Promise<ActionResult<FinancialPageData>> {
  try {
    await requireAdmin();

    const parsed = referenceMonthSchema.safeParse(referenceMonth);
    if (!parsed.success) return { success: false, error: "Mes de referencia invalido." };
    if (!pageSchema.safeParse(page).success) return { success: false, error: "Pagina invalida." };
    if (!pageSizeSchema.safeParse(pageSize).success) return { success: false, error: "Tamanho de pagina invalido." };
    if (filters?.status && !statusSchema.safeParse(filters.status).success) return { success: false, error: "Status invalido." };
    if (filters?.locationId && !uuidSchema.safeParse(filters.locationId).success) return { success: false, error: "ID do local invalido." };
    if (filters?.classId && !uuidSchema.safeParse(filters.classId).success) return { success: false, error: "ID da turma invalido." };

    // Auto-mark overdue fees before fetching
    await markOverdueFees(referenceMonth);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Pre-filter enrollment IDs when filtering by location or class.
    // Supabase PostgREST can't filter parent rows by nested relations,
    // so we resolve the IDs first and use .in() on enrollment_id.
    let enrollmentIds: string[] | null = null;

    if (filters?.classId || filters?.locationId) {
      let enrollQuery = supabase
        .from("enrollments")
        .select("id, class:classes(location_id)");

      if (filters.classId) {
        enrollQuery = enrollQuery.eq("class_id", filters.classId);
      }

      const { data: enrollRows } = await enrollQuery;

      if (enrollRows) {
        const typed = enrollRows as EnrollmentFilterRow[];
        const filtered = filters.locationId
          ? typed.filter((e) => unwrapJoin(e.class)?.location_id === filters.locationId)
          : typed;
        enrollmentIds = filtered.map((e) => e.id);
      } else {
        enrollmentIds = [];
      }
    }

    let query = supabase
      .from("monthly_fees")
      .select(
        "*, enrollment:enrollments(id, due_day, student:students(full_name), class:classes(name, location:locations(name)))",
        { count: "exact" }
      )
      .eq("reference_month", referenceMonth);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (enrollmentIds !== null) {
      if (enrollmentIds.length === 0) {
        // No matching enrollments — return empty with zeroed summary
        const summary = await computeSummary(referenceMonth, enrollmentIds);
        return { success: true, data: { fees: [], total: 0, summary } };
      }
      query = query.in("enrollment_id", enrollmentIds);
    }

    const { data, error, count } = await query
      .order("created_at")
      .range(from, to);

    if (error) return { success: false, error: "Falha ao buscar mensalidades." };

    const fees = data as MonthlyFeeWithDetails[];

    // Summary uses a separate query for totals (all fees, not just current page)
    // Pass enrollmentIds so summary respects location/class filters
    const summary = await computeSummary(referenceMonth, enrollmentIds);

    return {
      success: true,
      data: { fees, total: count ?? 0, summary },
    };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao buscar dados financeiros." };
  }
}

/**
 * Auto-mark pending fees as overdue when current date > due_day of reference month.
 */
async function markOverdueFees(referenceMonth: string): Promise<void> {
  const now = nowBrasilia();
  const [year, month] = referenceMonth.split("-").map(Number);

  // Only mark overdue if we're in or past the reference month
  const refDate = new Date(year, month - 1, 1);
  if (now < refDate) return;

  // Get pending fees for this month with their enrollment's due_day
  const { data: pendingFees } = await supabase
    .from("monthly_fees")
    .select("id, enrollment:enrollments(due_day)")
    .eq("reference_month", referenceMonth)
    .eq("status", "pending");

  if (!pendingFees || pendingFees.length === 0) return;

  const overdueIds: string[] = [];
  for (const fee of pendingFees as PendingFeeRow[]) {
    const dueDay = unwrapJoin(fee.enrollment)?.due_day ?? 5;
    const dueDate = new Date(year, month - 1, dueDay, 23, 59, 59);
    if (now > dueDate) {
      overdueIds.push(fee.id);
    }
  }

  if (overdueIds.length > 0) {
    await supabase
      .from("monthly_fees")
      .update({ status: "overdue" })
      .in("id", overdueIds);
  }
}

/**
 * Compute summary for fees in a month (not paginated).
 * When enrollmentIds is provided, only those fees are included —
 * this ensures KPIs recalculate when filtering by location or class.
 */
async function computeSummary(
  referenceMonth: string,
  enrollmentIds: string[] | null = null,
): Promise<FinancialSummary> {
  let query = supabase
    .from("monthly_fees")
    .select("status, gross_amount, location_fee, net_amount")
    .eq("reference_month", referenceMonth);

  if (enrollmentIds !== null) {
    if (enrollmentIds.length === 0) {
      return { totalGrossReceived: 0, totalLocationFees: 0, totalPending: 0, totalOverdue: 0, feesCount: 0, paidCount: 0 };
    }
    query = query.in("enrollment_id", enrollmentIds);
  }

  const { data } = await query;

  const summary: FinancialSummary = {
    totalGrossReceived: 0,
    totalLocationFees: 0,
    totalPending: 0,
    totalOverdue: 0,
    feesCount: 0,
    paidCount: 0,
  };

  if (!data) return summary;

  summary.feesCount = data.length;

  for (const fee of data) {
    if (fee.status === "paid") {
      summary.totalGrossReceived += Number(fee.gross_amount);
      summary.totalLocationFees += Number(fee.location_fee);
      summary.paidCount++;
    } else if (fee.status === "overdue") {
      summary.totalOverdue += Number(fee.gross_amount);
    } else if (fee.status === "pending") {
      summary.totalPending += Number(fee.gross_amount);
    }
  }

  return summary;
}

/**
 * Generate monthly fee records for all active enrollments for a given month.
 * Skips enrollments that already have a fee for that month.
 */
export async function generateFeesForMonth(
  referenceMonth: string
): Promise<ActionResult<{ created: number; skipped: number }>> {
  try {
    await requireAdmin();

    const parsed = referenceMonthSchema.safeParse(referenceMonth);
    if (!parsed.success) return { success: false, error: "Mes de referencia invalido." };

    // Fetch active enrollments with location fee data
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, base_fee, class:classes(location:locations(fee_per_student))")
      .eq("status", "active");

    if (enrollError) return { success: false, error: "Falha ao buscar matriculas ativas." };
    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: { created: 0, skipped: 0 } };
    }

    // Check which already have fees for this month
    const { data: existing } = await supabase
      .from("monthly_fees")
      .select("enrollment_id")
      .eq("reference_month", referenceMonth);

    const existingIds = new Set(
      (existing ?? []).map((e) => e.enrollment_id)
    );

    const toInsert: Array<{
      enrollment_id: string;
      reference_month: string;
      gross_amount: number;
      location_fee: number;
      asaas_fee: number;
      status: string;
    }> = [];

    for (const enrollment of enrollments as EnrollmentWithLocationFee[]) {
      if (existingIds.has(enrollment.id)) continue;

      const cls = unwrapJoin(enrollment.class);
      const locationFee = unwrapJoin(cls?.location)?.fee_per_student ?? 0;

      toInsert.push({
        enrollment_id: enrollment.id,
        reference_month: referenceMonth,
        gross_amount: Number(enrollment.base_fee),
        location_fee: Number(locationFee),
        asaas_fee: 0,
        status: "pending",
      });
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("monthly_fees")
        .insert(toInsert);

      if (insertError) return { success: false, error: "Falha ao inserir mensalidades." };
      revalidatePath("/finances");
    }

    return {
      success: true,
      data: {
        created: toInsert.length,
        skipped: enrollments.length - toInsert.length,
      },
    };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao gerar mensalidades." };
  }
}

/**
 * Undo a paid fee: revert status to pending and clear payment fields.
 */
export async function undoPayment(
  feeId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(feeId);
    if (!parsedId.success) return { success: false, error: "ID da mensalidade invalido." };

    // Fetch enrollment base_fee to restore the original gross_amount
    const { data: fee, error: fetchError } = await supabase
      .from("monthly_fees")
      .select("enrollment:enrollments(base_fee)")
      .eq("id", feeId)
      .single();

    if (fetchError || !fee) {
      return { success: false, error: "Mensalidade nao encontrada." };
    }

    const enrollment = unwrapJoin(
      fee.enrollment as unknown as { base_fee: number } | { base_fee: number }[] | null
    );
    const baseFee = Number(enrollment?.base_fee ?? 0);

    // Reset payment fields but PRESERVE location_fee (set at generation time).
    // Zeroing location_fee would corrupt net_amount on subsequent payments.
    const { error } = await supabase
      .from("monthly_fees")
      .update({
        status: "pending",
        gross_amount: baseFee,
        paid_at: null,
        asaas_fee: 0,
      })
      .eq("id", feeId);

    if (error) return { success: false, error: "Falha ao desfazer pagamento." };
    revalidatePath("/finances");
    return { success: true, data: null };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao desfazer pagamento." };
  }
}

/**
 * Delete monthly fees in batch (admin only).
 * Accepts an array of fee IDs and removes them permanently.
 */
export async function deleteMonthlyFees(
  ids: string[]
): Promise<ActionResult<{ deleted: number }>> {
  try {
    await requireAdmin();

    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "Nenhuma mensalidade selecionada." };
    }

    if (ids.length > 500) {
      return { success: false, error: "Maximo de 500 mensalidades por vez." };
    }

    for (const id of ids) {
      if (!uuidSchema.safeParse(id).success) {
        return { success: false, error: "ID de mensalidade invalido." };
      }
    }

    const { error, count } = await supabase
      .from("monthly_fees")
      .delete({ count: "exact" })
      .in("id", ids);

    if (error) return { success: false, error: "Falha ao excluir mensalidades." };

    revalidatePath("/finances");

    return { success: true, data: { deleted: count ?? ids.length } };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao excluir mensalidades." };
  }
}

/**
 * Manual payment: mark a fee as paid with the actual received amount.
 * Sets asaas_fee to 0 (off-gateway) and updates gross_amount to reflect
 * the real value received (may differ from original due to discounts/fines).
 */
export async function payFeeManually(
  feeId: string,
  receivedAmount: number
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(feeId);
    if (!parsedId.success) return { success: false, error: "ID da mensalidade invalido." };

    const parsedAmount = positiveAmount.safeParse(receivedAmount);
    if (!parsedAmount.success) return { success: false, error: "O valor recebido deve ser maior que zero." };

    // Clamp to 2 decimal places to match numeric(10,2) in the database
    const sanitized = Math.round(receivedAmount * 100) / 100;

    const { error } = await supabase
      .from("monthly_fees")
      .update({
        status: "paid",
        gross_amount: sanitized,
        asaas_fee: 0,
        paid_at: new Date().toISOString(),
      })
      .eq("id", feeId);

    if (error) return { success: false, error: "Falha ao registrar pagamento." };
    revalidatePath("/finances");
    return { success: true, data: null };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao registrar pagamento." };
  }
}
