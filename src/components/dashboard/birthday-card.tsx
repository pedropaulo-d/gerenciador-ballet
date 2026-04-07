"use client";

import type { BirthdayStudent } from "@/app/actions/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { CakeIcon } from "lucide-react";

interface BirthdayCardProps {
  students: BirthdayStudent[];
}

export function BirthdayCard({ students }: BirthdayCardProps) {
  if (students.length === 0) return null;

  return (
    <Card size="sm" className="border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950">
      <CardContent className="flex items-start gap-3 py-3">
        <CakeIcon className="mt-0.5 size-5 shrink-0 text-pink-500" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-pink-700 dark:text-pink-300">
            {students.length === 1
              ? "Aniversariante do dia!"
              : `${students.length} aniversariantes hoje!`}
          </p>
          {students.map((s) => (
            <p key={s.id} className="text-sm text-pink-600 dark:text-pink-400">
              {s.fullName}
              {s.className && (
                <span className="text-pink-400 dark:text-pink-500">
                  {" "}
                  — {s.className}
                </span>
              )}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
