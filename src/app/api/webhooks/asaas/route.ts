import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const supabase = getServiceSupabase();

/**
 * Asaas Webhook handler.
 *
 * Configure this URL in the Asaas dashboard:
 *   POST https://<your-domain>/api/webhooks/asaas
 *
 * Required env var: ASAAS_WEBHOOK_TOKEN
 */

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

type AsaasEvent =
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_REFUNDED";

const VALID_EVENTS = new Set<string>([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
]);

type AsaasWebhookPayload = {
  event: AsaasEvent;
  payment: {
    id: string;
    value: number;
    netValue: number;
    status: string;
    confirmedDate: string | null;
    externalReference: string | null;
  };
};

export async function POST(request: NextRequest) {
  // --- 1. Validate webhook token ---
  if (!ASAAS_WEBHOOK_TOKEN) {
    console.error("[Asaas Webhook] ASAAS_WEBHOOK_TOKEN not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const token = request.headers.get("asaas-access-token");
  if (token !== ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- 2. Parse and validate payload ---
  let body: AsaasWebhookPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment } = body;

  if (!event || !VALID_EVENTS.has(event)) {
    return NextResponse.json({ error: "Invalid or unsupported event" }, { status: 400 });
  }

  if (
    !payment?.id ||
    typeof payment.id !== "string" ||
    typeof payment.value !== "number" ||
    typeof payment.netValue !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
  }

  // --- 3. Find the monthly_fee by asaas_payment_id ---
  const { data: fee, error: findError } = await supabase
    .from("monthly_fees")
    .select("id, status, gross_amount, location_fee")
    .eq("asaas_payment_id", payment.id)
    .maybeSingle();

  if (findError) {
    console.error("[Asaas Webhook] DB lookup error:", findError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!fee) {
    console.warn("[Asaas Webhook] No fee found for payment:", payment.id);
    return NextResponse.json({ status: "ignored", reason: "fee_not_found" });
  }

  // --- 4. Handle events ---
  switch (event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED": {
      // Idempotency: skip if already paid (Asaas may retry)
      if (fee.status === "paid") {
        return NextResponse.json({ status: "already_processed" });
      }

      const asaasFee = Math.max(0, payment.value - payment.netValue);

      // Update gross_amount from payment.value to reflect the actual charged
      // amount (may differ from original due to Asaas discounts/fines).
      const { error: updateError } = await supabase
        .from("monthly_fees")
        .update({
          status: "paid",
          gross_amount: payment.value,
          asaas_fee: asaasFee,
          paid_at: payment.confirmedDate ?? new Date().toISOString(),
        })
        .eq("id", fee.id);

      if (updateError) {
        console.error("[Asaas Webhook] Update error:", updateError.message);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
      }
      break;
    }

    case "PAYMENT_OVERDUE": {
      // Idempotency: skip if already overdue or already paid
      if (fee.status === "overdue" || fee.status === "paid") {
        return NextResponse.json({ status: "already_processed" });
      }
      await supabase
        .from("monthly_fees")
        .update({ status: "overdue" })
        .eq("id", fee.id);
      break;
    }

    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED": {
      if (fee.status === "cancelled") {
        return NextResponse.json({ status: "already_processed" });
      }
      await supabase
        .from("monthly_fees")
        .update({ status: "cancelled" })
        .eq("id", fee.id);
      break;
    }
  }

  return NextResponse.json({ status: "ok" });
}
