"use server";

import { supabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";
import type { Location, LocationInsert, LocationUpdate } from "@/types/database";

export async function getLocations(): Promise<ActionResult<Location[]>> {
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name");

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Location[] };
  } catch (err) {
    return { success: false, error: "Falha ao buscar locais." };
  }
}

export async function createLocation(
  payload: LocationInsert
): Promise<ActionResult<Location>> {
  try {
    const { data, error } = await supabase
      .from("locations")
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Location };
  } catch (err) {
    return { success: false, error: "Falha ao cadastrar local." };
  }
}

export async function updateLocation(
  id: string,
  payload: LocationUpdate
): Promise<ActionResult<Location>> {
  try {
    const { data, error } = await supabase
      .from("locations")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Location };
  } catch (err) {
    return { success: false, error: "Falha ao atualizar local." };
  }
}

export async function deleteLocation(
  id: string
): Promise<ActionResult> {
  try {
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: "Falha ao excluir local." };
  }
}
