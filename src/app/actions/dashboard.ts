"use server";

import { supabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/action-result";

export type BirthdayStudent = {
  id: string;
  fullName: string;
  className: string | null;
};

type BirthdayRow = {
  id: string;
  full_name: string;
  enrollments: {
    class: { name: string } | null;
  }[];
};

export async function getTodayBirthdays(): Promise<
  ActionResult<BirthdayStudent[]>
> {
  try {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;

    // Supabase PostgREST doesn't support EXTRACT on date parts,
    // so we use an RPC-less approach: fetch students with birth_date
    // and filter by day/month using a raw filter.
    const { data, error } = await supabase
      .from("students")
      .select(
        "id, full_name, enrollments(class:classes(name))"
      )
      .eq("is_active", true)
      .filter(
        "birth_date",
        "not.is",
        null
      );

    if (error) return { success: false, error: error.message };

    const rows = (data ?? []) as unknown as BirthdayRow[];

    const birthdays = rows
      .filter((s) => {
        if (!s.full_name) return false;
        // birth_date comes as "YYYY-MM-DD" string from the select
        // We need to check it from the raw data
        const raw = s as unknown as { birth_date: string | null };
        if (!raw.birth_date) return false;
        const [, m, d] = raw.birth_date.split("-").map(Number);
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
  } catch {
    return { success: false, error: "Falha ao buscar aniversariantes." };
  }
}
