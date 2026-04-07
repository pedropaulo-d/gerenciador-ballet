import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Asaas Webhook handler.
 *
 * Configure this URL in the Asaas dashboard:
 *   POST https://<your-domain>/api/webhooks/asaas
 *
 * Asaas sends events like PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc.
 * Docs: https://docs.asaas.com/docs/webhooks
 */

// TODO: Store in .env as ASAAS_WEBHOOK_TOKEN and validate on every request
// const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

type AsaasEvent =
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_REFUNDED";

type AsaasWebhookPayload = {
  event: AsaasEvent;
  payment: {
    id: string;              // Asaas payment ID (e.g. "pay_abc123")
    value: number;           // Gross amount charged
    netValue: number;        // Amount after Asaas fees
    status: string;          // Asaas status
    confirmedDate: string | null;
    externalReference: string | null; // Our monthly_fee.id or enrollment reference
  };
};

export async function POST(request: NextRequest) {
  // --- 1. Validate webhook token ---
  // TODO: Uncomment after configuring ASAAS_WEBHOOK_TOKEN in .env
  // const token = request.headers.get("asaas-access-token");
  // if (token !== ASAAS_WEBHOOK_TOKEN) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  let body: AsaasWebhookPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment } = body;

  if (!event || !payment?.id) {
    return NextResponse.json({ error: "Missing event or payment" }, { status: 400 });
  }

  // --- 2. Find the monthly_fee by asaas_payment_id ---
  // The asaas_payment_id should be set when creating the charge in Asaas,
  // or use externalReference to match our records.
  const { data: fee, error: findError } = await supabase
    .from("monthly_fees")
    .select("id, gross_amount, location_fee")
    .eq("asaas_payment_id", payment.id)
    .maybeSingle();

  if (findError) {
    console.error("[Asaas Webhook] DB lookup error:", findError.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!fee) {
    // Not found — could be a payment we don't track, or asaas_payment_id not yet linked.
    // Return 200 so Asaas doesn't retry indefinitely.
    console.warn("[Asaas Webhook] No fee found for payment:", payment.id);
    return NextResponse.json({ status: "ignored", reason: "fee_not_found" });
  }

  // --- 3. Handle events ---
  switch (event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED": {
      // Calculate Asaas fee: gross charged minus net received from Asaas
      const asaasFee = Math.max(0, payment.value - payment.netValue);

      const { error: updateError } = await supabase
        .from("monthly_fees")
        .update({
          status: "paid",
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
      await supabase
        .from("monthly_fees")
        .update({ status: "overdue" })
        .eq("id", fee.id);
      break;
    }

    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED": {
      await supabase
        .from("monthly_fees")
        .update({ status: "cancelled" })
        .eq("id", fee.id);
      break;
    }

    default:
      // Unknown event — acknowledge but do nothing
      break;
  }

  return NextResponse.json({ status: "ok" });
}
