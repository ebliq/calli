"use client";

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Button } from "components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";
import { useToast } from "components/toast/use-toast";
import { addContacts, generateId } from "lib/store";
import { Contact } from "lib/types";
import { cn, normalizePhone, formatPhoneDisplay } from "lib/utils";
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, CheckCircle2, MinusCircle } from "lucide-react";

const CONTACT_FIELDS: { value: keyof Contact | ""; label: string }[] = [
  { value: "", label: "-- Überspringen --" },
  { value: "firstName", label: "Vorname" },
  { value: "lastName", label: "Nachname" },
  { value: "phone", label: "Telefon" },
  { value: "email", label: "E-Mail" },
  { value: "company", label: "Firma" },
  { value: "notes", label: "Notizen" },
  { value: "tags", label: "Tags" },
  { value: "status", label: "Status" },
];

const AUTO_DETECT_MAP: Record<string, keyof Contact> = {
  vorname: "firstName",
  firstname: "firstName",
  "first name": "firstName",
  "first_name": "firstName",
  name: "firstName",
  nachname: "lastName",
  lastname: "lastName",
  "last name": "lastName",
  "last_name": "lastName",
  surname: "lastName",
  telefon: "phone",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  telefonnummer: "phone",
  mobilnummer: "phone",
  handy: "phone",
  mobile: "phone",
  email: "email",
  "e-mail": "email",
  mail: "email",
  firma: "company",
  company: "company",
  unternehmen: "company",
  organisation: "company",
  organization: "company",
  notizen: "notes",
  notes: "notes",
  bemerkung: "notes",
  kommentar: "notes",
  tags: "tags",
  status: "status",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === ";") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  return { headers, rows };
}

function autoDetectMapping(header: string): keyof Contact | "" {
  const normalized = header.toLowerCase().trim();
  return AUTO_DETECT_MAP[normalized] || "";
}

export default function ImporterPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, keyof Contact | "">>({});
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte laden Sie eine CSV-Datei hoch.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: csvHeaders, rows: csvRows } = parseCSV(text);

      if (csvHeaders.length === 0) {
        toast({
          title: "Leere Datei",
          description: "Die CSV-Datei scheint leer zu sein.",
        });
        return;
      }

      setFileName(file.name);
      setHeaders(csvHeaders);
      setRows(csvRows);
      setImportComplete(false);
      setImportedCount(0);

      const autoMappings: Record<string, keyof Contact | ""> = {};
      csvHeaders.forEach((header) => {
        autoMappings[header] = autoDetectMapping(header);
      });
      setMappings(autoMappings);
    };
    reader.readAsText(file);
  }, [toast]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleMappingChange = (csvColumn: string, field: string) => {
    setMappings((prev) => ({
      ...prev,
      [csvColumn]: field as keyof Contact | "",
    }));
  };

  const handleImport = () => {
    const hasPhoneMapping = Object.values(mappings).includes("phone");
    if (!hasPhoneMapping) {
      toast({
        title: "Telefon-Feld erforderlich",
        description:
          "Bitte ordnen Sie mindestens die Telefon-Spalte zu, bevor Sie importieren.",
      });
      return;
    }

    const now = new Date().toISOString();
    const contacts: Contact[] = rows
      .map((row) => {
        const contact: Partial<Contact> = {
          id: generateId(),
          status: "new",
          createdAt: now,
          updatedAt: now,
        };

        headers.forEach((header, index) => {
          const field = mappings[header];
          if (!field || index >= row.length) return;

          const value = row[index];
          if (!value) return;

          if (field === "tags") {
            contact.tags = value.split(",").map((t) => t.trim());
          } else if (field === "phone" || field === "phoneMobile") {
            (contact as Record<string, unknown>)[field] = normalizePhone(value);
          } else {
            (contact as Record<string, unknown>)[field] = value;
          }
        });

        return contact as Contact;
      })
      .filter((c) => c.phone && c.phone.trim().length > 0);

    if (contacts.length === 0) {
      toast({
        title: "Keine gültigen Kontakte",
        description:
          "Keine Zeile enthielt eine gültige Telefonnummer. Überprüfen Sie die Zuordnung.",
      });
      return;
    }

    addContacts(contacts);
    setImportedCount(contacts.length);
    setImportComplete(true);
    toast({
      title: "Import erfolgreich",
      description: `${contacts.length} Kontakt${contacts.length !== 1 ? "e" : ""} erfolgreich importiert.`,
    });
  };

  const previewRows = rows.slice(0, 5);

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-orange-600">
                CSV-Importer
              </h1>
              <p className="text-muted-foreground mt-1">
                Laden Sie eine CSV-Datei hoch, um Kontakte ins System zu importieren.
              </p>
            </div>

            {/* Upload Zone */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-orange-500" />
                  CSV-Datei hochladen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                      : "border-muted-foreground/25 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/10",
                    fileName && !importComplete && "border-orange-400 bg-orange-50/30 dark:bg-orange-950/10",
                    importComplete && "border-green-500 bg-green-50/30 dark:bg-green-950/10"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {importComplete ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-lg font-medium text-green-700 dark:text-green-400">
                        {importedCount} Kontakt{importedCount !== 1 ? "e" : ""}{" "}
                        erfolgreich importiert
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Klicken oder neue Datei ablegen, um weitere zu importieren
                      </p>
                    </div>
                  ) : fileName ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-4">
                        <FileSpreadsheet className="h-8 w-8 text-orange-600" />
                      </div>
                      <p className="text-lg font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {rows.length} Zeile{rows.length !== 1 ? "n" : ""} gefunden
                        mit {headers.length} Spalte
                        {headers.length !== 1 ? "n" : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-muted p-4">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium">
                        CSV-Datei hier ablegen
                      </p>
                      <p className="text-sm text-muted-foreground">
                        oder klicken, um Dateien zu durchsuchen
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Column Mapping Matrix */}
            {headers.length > 0 && !importComplete && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-orange-500" />
                    Spaltenzuordnung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ordnen Sie jede CSV-Spalte dem entsprechenden Kontaktfeld zu.
                    Automatisch erkannte Zuordnungen sind hervorgehoben.
                  </p>

                  {/* Matrix header */}
                  <div className="rounded-xl border overflow-hidden">
                    <div className="grid grid-cols-[1fr_32px_1fr_1fr] md:grid-cols-[1fr_40px_1fr_1.5fr] gap-0 bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                      <span>CSV-Spalte</span>
                      <span />
                      <span>Zugeordnet zu</span>
                      <span className="hidden md:block">Beispielwert</span>
                    </div>

                    {/* Matrix rows */}
                    {headers.map((header, idx) => {
                      const mapped = mappings[header];
                      const isMapped = !!mapped;
                      const sampleValue = rows[0]?.[idx] || "";
                      const fieldLabel = CONTACT_FIELDS.find(
                        (f) => f.value === mapped
                      )?.label;

                      return (
                        <div
                          key={header}
                          className={cn(
                            "grid grid-cols-[1fr_32px_1fr_1fr] md:grid-cols-[1fr_40px_1fr_1.5fr] gap-0 items-center px-4 py-2.5 transition-colors",
                            idx !== headers.length - 1 && "border-b",
                            isMapped
                              ? "bg-green-50/50 dark:bg-green-950/10"
                              : "bg-background"
                          )}
                        >
                          {/* CSV column name */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0",
                                isMapped
                                  ? "text-green-600"
                                  : "text-muted-foreground/40"
                              )}
                            >
                              {isMapped ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <MinusCircle className="h-4 w-4" />
                              )}
                            </span>
                            <span
                              className="text-sm font-medium truncate"
                              title={header}
                            >
                              {header}
                            </span>
                          </div>

                          {/* Arrow */}
                          <div className="flex justify-center">
                            <ArrowRight
                              className={cn(
                                "h-4 w-4",
                                isMapped
                                  ? "text-green-500"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          </div>

                          {/* Dropdown */}
                          <div>
                            <Select
                              value={mappings[header] || "_skip"}
                              onValueChange={(value) =>
                                handleMappingChange(
                                  header,
                                  value === "_skip" ? "" : value
                                )
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-9 text-sm",
                                  isMapped
                                    ? "border-green-300 dark:border-green-700"
                                    : "border-dashed"
                                )}
                              >
                                <SelectValue placeholder="-- Überspringen --" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTACT_FIELDS.map((field) => (
                                  <SelectItem
                                    key={field.value || "_skip"}
                                    value={field.value || "_skip"}
                                  >
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Sample value */}
                          <div className="hidden md:block">
                            <span
                              className={cn(
                                "text-xs truncate block px-2 py-1 rounded-lg max-w-[200px]",
                                sampleValue
                                  ? "bg-muted/60 text-foreground/70 font-mono"
                                  : "text-muted-foreground/40 italic"
                              )}
                              title={sampleValue}
                            >
                              {sampleValue || "leer"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mapping summary */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        {Object.values(mappings).filter(Boolean).length} zugeordnet
                      </span>
                      <span className="flex items-center gap-1">
                        <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                        {Object.values(mappings).filter((v) => !v).length} übersprungen
                      </span>
                    </div>
                  </div>

                  {!Object.values(mappings).includes("phone") && (
                    <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Bitte ordnen Sie mindestens das &quot;Telefon&quot;-Feld zu, um
                      Kontakte zu importieren.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Preview Table */}
            {headers.length > 0 && !importComplete && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Vorschau (erste {Math.min(previewRows.length, 5)} Zeilen)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHead key={header}>
                              <div className="flex flex-col gap-0.5">
                                <span>{header}</span>
                                {mappings[header] && (
                                  <span className="text-xs font-normal text-orange-600">
                                    {
                                      CONTACT_FIELDS.find(
                                        (f) => f.value === mappings[header]
                                      )?.label
                                    }
                                  </span>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {headers.map((header, colIndex) => (
                              <TableCell
                                key={`${rowIndex}-${colIndex}`}
                                className={cn(
                                  "max-w-[200px] truncate",
                                  mappings[header]
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {(mappings[header] === "phone" || mappings[header] === "phoneMobile") && row[colIndex]
                                  ? formatPhoneDisplay(normalizePhone(row[colIndex]))
                                  : (row[colIndex] || "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Button */}
            {headers.length > 0 && !importComplete && (
              <div className="flex justify-end">
                <Button
                  onClick={handleImport}
                  size="lg"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {rows.length} Kontakt{rows.length !== 1 ? "e" : ""} importieren
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
