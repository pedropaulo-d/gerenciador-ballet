"use server";

import { supabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";
import type {
  Class,
  ClassInsert,
  ClassUpdate,
  ClassWithLocation,
} from "@/types/database";

export async function getClassesWithLocation(
  locationId?: string
): Promise<ActionResult<ClassWithLocation[]>> {
  try {
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
  } catch {
    return { success: false, error: "Falha ao buscar turmas." };
  }
}

export async function createClass(
  payload: ClassInsert
): Promise<ActionResult<Class>> {
  try {
    const { data, error } = await supabase
      .from("classes")
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Class };
  } catch {
    return { success: false, error: "Falha ao cadastrar turma." };
  }
}

export async function updateClass(
  id: string,
  payload: ClassUpdate
): Promise<ActionResult<Class>> {
  try {
    const { data, error } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Class };
  } catch {
    return { success: false, error: "Falha ao atualizar turma." };
  }
}

export async function deleteClass(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Falha ao excluir turma." };
  }
}
