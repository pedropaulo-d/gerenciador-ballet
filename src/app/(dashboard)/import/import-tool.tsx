"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  importStudentsFromCsv,
  type ImportResult,
  type ImportRowResult,
} from "@/app/actions/import-students";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UploadIcon,
  LoaderIcon,
  CheckCircle2Icon,
  XCircleIcon,
  FileSpreadsheetIcon,
} from "lucide-react";

export function ImportTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete(parsed) {
        if (parsed.errors.length > 0) {
          toast.error("Erro ao ler CSV", {
            description: parsed.errors[0].message,
          });
          setCsvRows(null);
          return;
        }
        setCsvRows(parsed.data as Record<string, string>[]);
        toast.success(`${parsed.data.length} linhas carregadas do CSV.`);
      },
    });
  }

  async function handleImport() {
    if (!csvRows || csvRows.length === 0) return;

    setImporting(true);
    setResult(null);

    try {
      const res = await importStudentsFromCsv(csvRows as never);
      setResult(res);

      if (res.failed === 0) {
        toast.success(`${res.imported} alunas importadas com sucesso!`);
      } else {
        toast.error(
          `${res.imported} importadas, ${res.failed} com erro.`
        );
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
        <h1 className="font-heading text-2xl font-bold tracking-tight text-shadow-gold">
          Importar Alunas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ferramenta para importar alunas via arquivo CSV.
        </p>
      </div>

      {/* Step 1 */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 px-5">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
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
              <span>
                {csvRows.length} linhas prontas para importacao
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Import button */}
      {csvRows && !result && (
        <Button onClick={handleImport} disabled={importing} size="lg" className="w-full">
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

      {/* Results */}
      {result && (
        <Card>
          <CardContent className="flex flex-col gap-4 py-5 px-5">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              2. Resultado da Importacao
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
                    <CheckCircle2Icon className="size-4 shrink-0 text-green-600 mt-0.5" />
                  ) : (
                    <XCircleIcon className="size-4 shrink-0 text-red-500 mt-0.5" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">
                      <span className="font-heading text-base font-bold tracking-tight text-foreground">
                        {row.studentName}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{row.row}
                      </span>
                    </span>
                    {row.error && (
                      <span className="text-xs text-red-500">{row.error}</span>
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
