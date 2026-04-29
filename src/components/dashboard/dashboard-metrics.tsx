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
}

const METRIC_CARD =
  "border-2 border-primary/30 shadow-md shadow-primary/[0.06] transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/[0.1]";

export function DashboardMetrics({
  locationsCount,
  classesCount,
  absencesToday,
}: DashboardMetricsProps) {
  const hasAbsences = absencesToday > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Link href="/locations">
        <Card className={METRIC_CARD}>
          <CardContent className="flex items-center justify-between gap-3 py-4 px-4 sm:flex-col sm:items-center sm:justify-start sm:gap-2 sm:py-6 sm:px-3 sm:text-center">
            <div className="flex items-center gap-2.5 sm:flex-col sm:gap-2">
              <MapPinIcon className="size-5 text-primary" />
              <p className="text-base sm:text-lg font-semibold text-foreground">
                Locais
              </p>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold nums leading-none text-foreground">
              {locationsCount}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/classes">
        <Card className={METRIC_CARD}>
          <CardContent className="flex items-center justify-between gap-3 py-4 px-4 sm:flex-col sm:items-center sm:justify-start sm:gap-2 sm:py-6 sm:px-3 sm:text-center">
            <div className="flex items-center gap-2.5 sm:flex-col sm:gap-2">
              <GraduationCapIcon className="size-5 text-primary" />
              <p className="text-base sm:text-lg font-semibold text-foreground">
                Turmas
              </p>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold nums leading-none text-foreground">
              {classesCount}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/attendance">
        <Card
          className={
            hasAbsences
              ? "border-2 border-destructive/40 shadow-md shadow-destructive/[0.06] transition-all hover:border-destructive/60 hover:shadow-lg"
              : METRIC_CARD
          }
        >
          <CardContent className="flex items-center justify-between gap-3 py-4 px-4 sm:flex-col sm:items-center sm:justify-start sm:gap-2 sm:py-6 sm:px-3 sm:text-center">
            <div className="flex items-center gap-2.5 sm:flex-col sm:gap-2">
              <XCircleIcon className={`size-5 ${hasAbsences ? "text-destructive" : "text-primary"}`} />
              <p className="text-base sm:text-lg font-semibold text-foreground">
                Faltas Hoje
              </p>
            </div>
            <p
              className={`text-2xl sm:text-3xl md:text-4xl font-semibold nums leading-none ${
                hasAbsences ? "text-destructive" : "text-foreground"
              }`}
            >
              {absencesToday}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
