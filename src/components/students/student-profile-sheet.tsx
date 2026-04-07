"use client";

import { useEffect, useState, useTransition } from "react";
import type { StudentSummary } from "@/app/actions/student-profile";
import { getStudentSummary } from "@/app/actions/student-profile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  LoaderIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  GraduationCapIcon,
  MessageCircleIcon,
  ClipboardListIcon,
  HeartPulseIcon,
} from "lucide-react";

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function formatBirthDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

const FINANCIAL_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  paid: { label: "Pago", variant: "success" },
  pending: { label: "Pendente", variant: "warning" },
  overdue: { label: "Vencido", variant: "destructive" },
};

interface StudentProfileSheetProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentProfileSheet({
  studentId,
  open,
  onOpenChange,
}: StudentProfileSheetProps) {
  const [data, setData] = useState<StudentSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      if (!studentId || !open) {
        setData(null);
        return;
      }
      const result = await getStudentSummary(studentId);
      if (result.success) setData(result.data);
    });
  }, [studentId, open, startTransition]);

  const fStatus = data?.financial.currentMonthStatus
    ? FINANCIAL_STATUS_MAP[data.financial.currentMonthStatus]
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {isPending || !data ? (
          <div className="flex h-full items-center justify-center">
            <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data.student.fullName}</SheetTitle>
              {data.enrollment && (
                <SheetDescription className="flex items-center gap-1.5">
                  <GraduationCapIcon className="size-3.5" />
                  {data.enrollment.className} — {data.enrollment.locationName}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              {/* Birth date */}
              {data.student.birthDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  <span>Nascimento: {formatBirthDate(data.student.birthDate)}</span>
                </div>
              )}

              {/* Financial */}
              <Card size="sm">
                <CardContent className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">Financeiro do mes</span>
                  <div className="flex items-center gap-2">
                    {fStatus ? (
                      <Badge variant={fStatus.variant}>{fStatus.label}</Badge>
                    ) : (
                      <Badge variant="secondary">Sem mensalidade</Badge>
                    )}
                    {data.financial.hasOverdueHistory && (
                      <Badge variant="destructive">Historico devedor</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance */}
              <Card size="sm">
                <CardContent className="py-3">
                  <p className="mb-2 text-sm font-medium">Frequencia do mes</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2Icon className="size-3.5" />
                      {data.attendance.present} P
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircleIcon className="size-3.5" />
                      {data.attendance.absent} F
                    </span>
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertTriangleIcon className="size-3.5" />
                      {data.attendance.justified} J
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Observations */}
              {(data.student.medicalNotes || data.student.internalObservations) && (
                <Card size="sm">
                  <CardContent className="flex flex-col gap-2 py-3">
                    <p className="text-sm font-medium">Observacoes Importantes</p>
                    {data.student.medicalNotes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <HeartPulseIcon className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                        <span>{data.student.medicalNotes}</span>
                      </div>
                    )}
                    {data.student.internalObservations && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ClipboardListIcon className="mt-0.5 size-3.5 shrink-0" />
                        <span>{data.student.internalObservations}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Guardian contact */}
              <Card size="sm">
                <CardContent className="flex flex-col gap-2 py-3">
                  <p className="text-sm font-medium">Responsavel</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PhoneIcon className="size-3.5" />
                    <span>{data.student.guardianName}</span>
                  </div>
                  {data.student.guardianPhone && (
                    <div className="flex gap-2">
                      <a
                        href={`tel:${data.student.guardianPhone}`}
                        className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm transition-colors hover:bg-muted/80"
                      >
                        <PhoneIcon className="size-3.5" />
                        {data.student.guardianPhone}
                      </a>
                      <a
                        href={`https://wa.me/55${formatPhone(data.student.guardianPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-700"
                      >
                        <MessageCircleIcon className="size-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
