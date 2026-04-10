"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPinIcon,
  GraduationCapIcon,
  XCircleIcon,
} from "lucide-react";

interface DashboardMetricsProps {
  locationsCount: number;
  classesCount: number;
  absencesToday: number;
  isPending: boolean;
}

const GOLD_CARD =
  "border-2 border-gold/30 shadow-md shadow-gold/[0.06] transition-all hover:border-gold/50 hover:shadow-lg hover:shadow-gold/[0.1]";

export function DashboardMetrics({
  locationsCount,
  classesCount,
  absencesToday,
  isPending,
}: DashboardMetricsProps) {
  const hasAbsences = !isPending && absencesToday > 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Link href="/locations">
        <Card className={GOLD_CARD}>
          <CardContent className="flex flex-col items-center gap-2 py-6 px-3 text-center">
            <MapPinIcon className="size-5 text-gold" />
            <p className="font-heading text-lg font-semibold text-foreground">
              Locais
            </p>
            <p className="font-heading text-5xl font-bold leading-none text-foreground">
              {isPending ? "\u2014" : locationsCount}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/classes">
        <Card className={GOLD_CARD}>
          <CardContent className="flex flex-col items-center gap-2 py-6 px-3 text-center">
            <GraduationCapIcon className="size-5 text-gold" />
            <p className="font-heading text-lg font-semibold text-foreground">
              Turmas
            </p>
            <p className="font-heading text-5xl font-bold leading-none text-foreground">
              {isPending ? "\u2014" : classesCount}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/attendance">
        <Card
          className={
            hasAbsences
              ? "border-2 border-red-300/60 shadow-md shadow-red-500/[0.06] transition-all hover:border-red-400/60 hover:shadow-lg"
              : GOLD_CARD
          }
        >
          <CardContent className="flex flex-col items-center gap-2 py-6 px-3 text-center">
            <XCircleIcon className={`size-5 ${hasAbsences ? "text-red-500" : "text-gold"}`} />
            <p className="font-heading text-lg font-semibold text-foreground">
              Faltas Hoje
            </p>
            <p
              className={`font-heading text-5xl font-bold leading-none ${
                hasAbsences ? "text-red-600" : "text-foreground"
              }`}
            >
              {isPending ? "\u2014" : absencesToday}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
