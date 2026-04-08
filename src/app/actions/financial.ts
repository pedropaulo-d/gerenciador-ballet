"use server";

import { getServiceSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";

const supabase = getServiceSupabase();
import type { MonthlyFeeWithDetails } from "@/types/database";
import { nowBrasilia } from "@/lib/formatters";

// ---------- Types ----------

export type FinancialSummary = {
  totalNetReceived: number;
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

/** Shape returned by markOverdueFees select: "id, enrollment:enrollments(due_day)" */
type PendingFeeRow = {
  id: string;
  enrollment: { due_day: number }[];
};

/** Shape returned by getFinancialByMonth enrollment pre-filter: "id, class:classes(location_id)" */
type EnrollmentFilterRow = {
  id: string;
  class: { location_id: string }[];
};

/** Shape returned by generateFeesForMonth select: "id, base_fee, class:classes(location:locations(fee_per_student))" */
type EnrollmentWithLocationFee = {
  id: string;
  base_fee: number;
  class: { location: { fee_per_student: number }[] }[];
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
          ? typed.filter((e) => e.class?.[0]?.location_id === filters.locationId)
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
        // No matching enrollments — return empty
        const summary = await computeSummary(referenceMonth);
        return { success: true, data: { fees: [], total: 0, summary } };
      }
      query = query.in("enrollment_id", enrollmentIds);
    }

    const { data, error, count } = await query
      .order("created_at")
      .range(from, to);

    if (error) return { success: false, error: error.message };

    const fees = data as MonthlyFeeWithDetails[];

    // Summary uses a separate query for totals (all fees, not just current page)
    const summary = await computeSummary(referenceMonth);

    return {
      success: true,
      data: { fees, total: count ?? 0, summary },
    };
  } catch {
    return { success: false, error: "Falha ao buscar dados financeiros." };
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
    const dueDay = fee.enrollment?.[0]?.due_day ?? 5;
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
 * Compute summary for all fees in a month (not paginated).
 */
async function computeSummary(referenceMonth: string): Promise<FinancialSummary> {
  const { data } = await supabase
    .from("monthly_fees")
    .select("status, gross_amount, net_amount")
    .eq("reference_month", referenceMonth);

  const summary: FinancialSummary = {
    totalNetReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    feesCount: 0,
    paidCount: 0,
  };

  if (!data) return summary;

  summary.feesCount = data.length;

  for (const fee of data) {
    if (fee.status === "paid") {
      summary.totalNetReceived += Number(fee.net_amount);
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
    // Fetch active enrollments with location fee data
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, base_fee, class:classes(location:locations(fee_per_student))")
      .eq("status", "active");

    if (enrollError) return { success: false, error: enrollError.message };
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

      const locationFee =
        enrollment.class?.[0]?.location?.[0]?.fee_per_student ?? 0;

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

      if (insertError) return { success: false, error: insertError.message };
    }

    return {
      success: true,
      data: {
        created: toInsert.length,
        skipped: enrollments.length - toInsert.length,
      },
    };
  } catch {
    return { success: false, error: "Falha ao gerar mensalidades." };
  }
}

/**
 * Undo a paid fee: revert status to pending and clear payment fields.
 */
export async function undoPayment(
  feeId: string
): Promise<ActionResult> {
  try {
    const { error } = await supabase
      .from("monthly_fees")
      .update({
        status: "pending",
        paid_at: null,
        asaas_fee: 0,
        location_fee: 0,
      })
      .eq("id", feeId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Falha ao desfazer pagamento." };
  }
}

/**
 * Manual payment: mark a fee as paid with current timestamp.
 */
export async function payFeeManually(
  feeId: string
): Promise<ActionResult> {
  try {
    const { error } = await supabase
      .from("monthly_fees")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", feeId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Falha ao registrar pagamento." };
  }
}
