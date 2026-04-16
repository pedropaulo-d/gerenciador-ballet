"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";
import { safeDbError } from "@/lib/safe-error";

const supabase = getServiceSupabase();
import type { Location, LocationInsert, LocationUpdate } from "@/types/database";

const uuidSchema = z.string().uuid();

const locationInsertSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatorio.").max(200),
  address: z.string().max(500).nullish(),
  fee_per_student: z.number().nonnegative().max(99_999_999.99),
  is_active: z.boolean(),
});

const locationUpdateSchema = locationInsertSchema.partial().strict();

export async function getLocations(): Promise<ActionResult<Location[]>> {
  try {
    await requireAdmin();

    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name");

    if (error) return { success: false, error: safeDbError(error, "getLocations") };
    return { success: true, data: data as Location[] };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao buscar locais." };
  }
}

export async function createLocation(
  payload: LocationInsert
): Promise<ActionResult<Location>> {
  try {
    await requireAdmin();

    const parsed = locationInsertSchema.safeParse(payload);
    if (!parsed.success) return { success: false, error: "Dados do local invalidos." };

    const { data, error } = await supabase
      .from("locations")
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: safeDbError(error, "createLocation") };
    revalidatePath("/locations");
    return { success: true, data: data as Location };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao cadastrar local." };
  }
}

export async function updateLocation(
  id: string,
  payload: LocationUpdate
): Promise<ActionResult<Location>> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID do local invalido." };

    const parsedPayload = locationUpdateSchema.safeParse(payload);
    if (!parsedPayload.success) return { success: false, error: "Dados do local invalidos." };

    const { data, error } = await supabase
      .from("locations")
      .update(parsedPayload.data)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: safeDbError(error, "updateLocation") };
    revalidatePath("/locations");
    return { success: true, data: data as Location };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao atualizar local." };
  }
}

export async function deleteLocation(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID do local invalido." };

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: safeDbError(error, "deleteLocation") };
    revalidatePath("/locations");
    return { success: true, data: null };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao excluir local." };
  }
}
