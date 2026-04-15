"use server";

import { getServiceSupabase } from "@/lib/supabase";
import { requireAuth, handleAuthError } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/action-result";
import { nowBrasilia } from "@/lib/formatters";

const supabase = getServiceSupabase();

export type BirthdayStudent = {
  id: string;
  fullName: string;
  className: string | null;
};

type BirthdayRow = {
  id: string;
  full_name: string;
  birth_date: string;
  enrollments: {
    class: { name: string } | null;
  }[];
};

export async function getTodayBirthdays(): Promise<
  ActionResult<BirthdayStudent[]>
> {
  try {
    await requireAuth();

    const now = nowBrasilia();
    const day = now.getDate();
    const month = now.getMonth() + 1;

    // Supabase PostgREST doesn't support EXTRACT on date parts,
    // so we use an RPC-less approach: fetch students with birth_date
    // and filter by day/month using a raw filter.
    const { data, error } = await supabase
      .from("students")
      .select(
        "id, full_name, birth_date, enrollments(class:classes(name))"
      )
      .eq("is_active", true)
      .not("birth_date", "is", null);

    if (error) return { success: false, error: error.message };

    const rows = (data ?? []) as unknown as BirthdayRow[];

    const birthdays = rows
      .filter((s) => {
        const [, m, d] = s.birth_date.split("-").map(Number);
        return d === day && m === month;
      })
      .map((s) => {
        const activeEnrollment = s.enrollments?.[0];
        return {
          id: s.id,
          fullName: s.full_name,
          className: activeEnrollment?.class?.name ?? null,
        };
      });

    return { success: true, data: birthdays };
  } catch (e) {
    return handleAuthError(e) ?? { success: false, error: "Falha ao buscar aniversariantes." };
  }
}
