"use client";

import { useEffect, useState, useTransition } from "react";
import type { StudentSummary } from "@/app/actions/student-profile";
import { getStudentSummary } from "@/app/actions/student-profile";
import { useIsAdmin } from "@/lib/user-role-context";
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

/**
 * Retorna o telefone reduzido a digitos se for um numero brasileiro
 * valido (10 ou 11 digitos — fixo ou celular). Devolve null caso
 * contrario, para que o caller esconda os links de tel:/wa.me em
 * vez de gerar URLs quebradas.
 */
function sanitizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? digits : null;
}

function formatDateBR(date: string): string {
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

  const isAdmin = useIsAdmin();

  const fStatus = data?.financial.currentMonthStatus
    ? FINANCIAL_STATUS_MAP[data.financial.currentMonthStatus]
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {isPending || !data ? (
          <div className="flex h-full items-center justify-center">
            <SheetHeader className="sr-only">
              <SheetTitle>Carregando perfil</SheetTitle>
            </SheetHeader>
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

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
              {/* Birth date */}
              {data.student.birthDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  <span>Nascimento: <span className="nums font-medium">{formatDateBR(data.student.birthDate)}</span></span>
                </div>
              )}

              {/* Financial — admin only */}
              {isAdmin && (
                <Card size="sm">
                  <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium">Financeiro do mes</span>
                    <div className="flex flex-wrap items-center gap-2">
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
              )}

              {/* Attendance */}
              <Card size="sm">
                <CardContent className="py-3">
                  <p className="mb-2 text-sm font-medium">Frequencia do mes</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2Icon className="size-3.5" />
                      <span className="text-base font-semibold nums">{data.attendance.present}</span> P
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircleIcon className="size-3.5" />
                      <span className="text-base font-semibold nums">{data.attendance.absent}</span> F
                    </span>
                    <span className="flex items-center gap-1 text-secondary-foreground">
                      <AlertTriangleIcon className="size-3.5" />
                      <span className="text-base font-semibold nums">{data.attendance.justified}</span> J
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Absence history */}
              {data.absenceHistory.length > 0 && (
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3 py-3">
                    <p className="text-sm font-semibold tracking-tight">
                      Historico de Faltas
                    </p>
                    <div className="flex flex-col gap-2">
                      {data.absenceHistory.map((record) => (
                        <div
                          key={record.date}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="shrink-0 w-[4.5rem] nums font-medium text-muted-foreground">
                            {formatDateBR(record.date)}
                          </span>
                          <Badge
                            variant={record.status === "justified" ? "warning" : "destructive"}
                            className="shrink-0"
                          >
                            {record.status === "justified" ? "J" : "F"}
                          </Badge>
                          {record.justification && (
                            <span className="text-muted-foreground">
                              {record.justification}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Observations */}
              {(data.student.medicalNotes || data.student.internalObservations) && (
                <Card size="sm">
                  <CardContent className="flex flex-col gap-2 py-3">
                    <p className="text-sm font-medium">Observacoes Importantes</p>
                    {data.student.medicalNotes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <HeartPulseIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
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
                  {(() => {
                    const phone = data.student.guardianPhone;
                    if (!phone) return null;
                    const safe = sanitizePhone(phone);
                    if (!safe) {
                      // Numero malformado — mostra texto sem botao clicavel
                      // para nao gerar URL invalida em tel:/wa.me.
                      return (
                        <p className="text-sm text-muted-foreground">{phone}</p>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <a
                          href={`tel:+55${safe}`}
                          className="flex items-center justify-center gap-1.5 rounded-md bg-muted px-3 py-2 text-sm nums font-semibold transition-colors hover:bg-muted/80"
                        >
                          <PhoneIcon className="size-3.5 shrink-0" />
                          {phone}
                        </a>
                        <a
                          href={`https://wa.me/55${safe}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <MessageCircleIcon className="size-3.5 shrink-0" />
                          WhatsApp
                        </a>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
