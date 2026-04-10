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
    <Card
      className="border-2 border-primary/30 bg-gradient-to-r from-secondary to-secondary/60 shadow-md shadow-primary/[0.06]"
    >
      <CardContent className="flex flex-col gap-4 py-6 px-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <CakeIcon className="size-5 text-primary" />
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {students.length === 1
              ? "Aniversariante do dia!"
              : `${students.length} aniversariantes hoje!`}
          </p>
        </div>

        {/* Names — protagonistas */}
        <div className="flex flex-col gap-3 pl-13">
          {students.map((s) => (
            <div key={s.id} className="flex flex-col">
              <p className="font-heading text-2xl font-bold tracking-tight text-foreground text-shadow-gold">
                {s.fullName}
              </p>
              {s.className && (
                <p className="text-sm text-muted-foreground">
                  {s.className}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
