"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  importStudentsFromCsv,
  getClassesForImport,
  type ImportResult,
  type ImportRowResult,
} from "@/app/actions/import-students";
import {
  findClassMatch,
  uniqueTurmas,
  type ClassLookupEntry,
  type CsvRow,
} from "@/lib/csv-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadIcon,
  LoaderIcon,
  CheckCircle2Icon,
  XCircleIcon,
  FileSpreadsheetIcon,
} from "lucide-react";

type RawRow = Record<string, string>;

export function ImportTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<RawRow[] | null>(null);
  const [classes, setClasses] = useState<ClassLookupEntry[] | null>(null);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const turmas = useMemo(() => {
    if (!csvRows) return [];
    return uniqueTurmas(csvRows as unknown as CsvRow[]);
  }, [csvRows]);

  const turmaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!csvRows) return counts;
    for (const row of csvRows) {
      const t = (row.TURMA || "").trim();
      if (t) counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [csvRows]);

  const allMapped = turmas.length > 0 && turmas.every((t) => classMap[t]);

  async function loadClasses() {
    setLoadingClasses(true);
    try {
      const res = await getClassesForImport();
      if (!res.success) {
        toast.error("Falha ao carregar turmas", { description: res.error });
        setClasses(null);
        return;
      }
      setClasses(res.data);
      return res.data;
    } finally {
      setLoadingClasses(false);
    }
  }

  function autoSuggest(rows: RawRow[], entries: ClassLookupEntry[]) {
    const next: Record<string, string> = {};
    const unique = uniqueTurmas(rows as unknown as CsvRow[]);
    for (const t of unique) {
      const match = findClassMatch(t, entries);
      if (match) next[t] = match.classId;
    }
    setClassMap(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setClassMap({});

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: async (parsed) => {
        if (parsed.errors.length > 0) {
          toast.error("Erro ao ler CSV", {
            description: parsed.errors[0].message,
          });
          setCsvRows(null);
          return;
        }
        const rows = parsed.data;
        setCsvRows(rows);
        toast.success(`${rows.length} linhas carregadas do CSV.`);

        const loaded = classes ?? (await loadClasses());
        if (loaded) autoSuggest(rows, loaded);
      },
    });
  }

  async function handleImport() {
    if (!csvRows || csvRows.length === 0 || !allMapped) return;

    setImporting(true);
    setResult(null);

    try {
      const res = await importStudentsFromCsv(
        csvRows as unknown as CsvRow[],
        classMap,
      );

      if (!res.success) {
        toast.error("Falha na importacao", { description: res.error });
        return;
      }

      setResult(res.data);

      if (res.data.failed === 0) {
        toast.success(`${res.data.imported} alunas importadas com sucesso!`);
      } else {
        toast.error(`${res.data.imported} importadas, ${res.data.failed} com erro.`);
      }
    } catch {
      toast.error("Erro inesperado na importacao.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-shadow-gold">
          Importar Alunas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ferramenta para importar alunas via arquivo CSV.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 px-5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            1. Selecionar arquivo
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="size-4" />
            {fileName ?? "Escolher CSV"}
          </Button>

          {csvRows && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheetIcon className="size-4" />
              <span>{csvRows.length} linhas prontas para importacao</span>
            </div>
          )}
        </CardContent>
      </Card>

      {csvRows && !result && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5 px-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                2. Confirmar mapeamento de turmas
              </h2>
              {loadingClasses && (
                <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {classes && classes.length === 0 && (
              <p className="text-sm text-destructive">
                Nenhuma turma cadastrada. Cadastre as turmas em /classes antes
                de importar.
              </p>
            )}

            {classes && classes.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Cada valor único da coluna TURMA do CSV precisa ser
                  vinculado a uma turma do sistema. Sugestões automáticas já
                  foram preenchidas — confira antes de importar.
                </p>

                <div className="flex flex-col gap-3">
                  {turmas.map((turma) => {
                    const selected = classMap[turma];
                    const isUnmapped = !selected;
                    return (
                      <div
                        key={turma}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {turma}
                            </span>
                            <Badge variant="secondary" className="shrink-0">
                              {turmaCounts[turma]} aluna
                              {turmaCounts[turma] === 1 ? "" : "s"}
                            </Badge>
                            {isUnmapped && (
                              <Badge
                                variant="destructive"
                                className="shrink-0"
                              >
                                não mapeada
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Select
                          value={selected ?? ""}
                          onValueChange={(value) =>
                            setClassMap((prev) => ({
                              ...prev,
                              [turma]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="sm:w-80">
                            <SelectValue placeholder="Selecionar turma..." />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((c) => (
                              <SelectItem key={c.classId} value={c.classId}>
                                {c.className}
                                {c.locationName ? ` — ${c.locationName}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {csvRows && !result && (
        <Button
          onClick={handleImport}
          disabled={importing || !allMapped}
          size="lg"
          className="w-full"
        >
          {importing ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>Importar {csvRows.length} alunas</>
          )}
        </Button>
      )}

      {result && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5 px-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              3. Resultado da Importacao
            </h2>

            <div className="flex gap-3 text-sm">
              <Badge variant="secondary">Total: {result.total}</Badge>
              <Badge variant="default">
                Importadas: {result.imported}
              </Badge>
              {result.failed > 0 && (
                <Badge variant="destructive">Erros: {result.failed}</Badge>
              )}
            </div>

            <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
              {result.results.map((row: ImportRowResult) => (
                <div
                  key={row.row}
                  className="flex items-start gap-2 py-2 border-b last:border-0"
                >
                  {row.success ? (
                    <CheckCircle2Icon className="size-4 shrink-0 text-primary mt-0.5" />
                  ) : (
                    <XCircleIcon className="size-4 shrink-0 text-destructive mt-0.5" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">
                      <span className="text-base font-bold tracking-tight text-foreground">
                        {row.studentName}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{row.row}
                      </span>
                    </span>
                    {row.error && (
                      <span className="text-xs text-destructive">
                        {row.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
