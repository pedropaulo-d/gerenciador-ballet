"use server";

import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAuth, requireAdmin, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";

const supabase = getServiceSupabase();
import type {
  Class,
  ClassInsert,
  ClassUpdate,
  ClassWithLocation,
} from "@/types/database";

const uuidSchema = z.string().uuid();

const classInsertSchema = z.object({
  location_id: uuidSchema,
  name: z.string().trim().min(1, "Nome obrigatorio.").max(200),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  max_students: z.number().int().positive().nullish(),
  is_active: z.boolean(),
});

export async function getClassesWithLocation(
  locationId?: string
): Promise<ActionResult<ClassWithLocation[]>> {
  try {
    await requireAuth();

    let query = supabase
      .from("classes")
      .select("*, location:locations(*)")
      .order("location_id")
      .order("name");

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ClassWithLocation[] };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao buscar turmas." };
  }
}

export async function createClass(
  payload: ClassInsert
): Promise<ActionResult<Class>> {
  try {
    await requireAdmin();

    const parsed = classInsertSchema.safeParse(payload);
    if (!parsed.success) return { success: false, error: "Dados da turma invalidos." };

    const { data, error } = await supabase
      .from("classes")
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Class };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao cadastrar turma." };
  }
}

export async function updateClass(
  id: string,
  payload: ClassUpdate
): Promise<ActionResult<Class>> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID da turma invalido." };

    const { data, error } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Class };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao atualizar turma." };
  }
}

export async function deleteClass(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return { success: false, error: "ID da turma invalido." };

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao excluir turma." };
  }
}
