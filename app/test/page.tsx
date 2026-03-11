"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Badge } from "components/ui/badge";
import {
  FlaskConical,
  Phone,
  PhoneCall,
  PhoneOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquareText,
  RefreshCw,
  Clock,
  User,
  Bot,
} from "lucide-react";
import { toast } from "components/toast/use-toast";
import { cn, normalizePhone, formatPhoneDisplay } from "lib/utils";
import {
  getApiKey,
  getElevenLabsSettings,
} from "lib/store";
import Link from "next/link";

interface TranscriptEntry {
  role: string;
  message: string;
  time_in_call_secs?: number;
}

interface ConversationDetail {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript?: TranscriptEntry[];
  metadata?: Record<string, unknown>;
  analysis?: {
    summary?: string;
    evaluation_criteria_results?: Record<string, { result: string; rationale: string }>;
    data_collection_results?: Record<string, { value: string; rationale: string }>;
  };
  call_duration_secs?: number;
  start_time_unix_secs?: number;
}

interface CallLog {
  id: string;
  timestamp: string;
  toNumber: string;
  customerName: string;
  employeeName: string;
  companyName: string;
  status: "pending" | "success" | "error";
  response?: string;
  request?: string;
  error?: string;
  conversationId?: string;
  conversationDetail?: ConversationDetail;
  loadingTranscript?: boolean;
}

export default function TestPage() {
  const [agentId, setAgentId] = useState("");
  const [agentPhoneNumberId, setAgentPhoneNumberId] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [isCalling, setIsCalling] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [apiKey, setApiKeyState] = useState("");

  // Track polling intervals per conversation
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    const settings = getElevenLabsSettings();
    setAgentId(settings.agentId);
    setAgentPhoneNumberId(settings.agentPhoneNumberId);
    setApiKeyState(getApiKey());
    return () => {
      // Cleanup polling on unmount
      Object.values(pollingRef.current).forEach(clearInterval);
    };
  }, []);

  const isConfigured = agentId.trim() && agentPhoneNumberId.trim() && apiKey.trim();

  // Fetch transcript for a specific conversation
  const fetchTranscript = useCallback(async (conversationId: string, isAuto = false) => {
    if (!apiKey) return;

    // Mark as loading
    setCallLogs((prev) =>
      prev.map((l) =>
        l.conversationId === conversationId ? { ...l, loadingTranscript: true } : l
      )
    );

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
        { headers: { "xi-api-key": apiKey } }
      );
      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setCallLogs((prev) =>
          prev.map((l) =>
            l.conversationId === conversationId
              ? { ...l, conversationDetail: data, loadingTranscript: false }
              : l
          )
        );

        // Stop polling if conversation is done
        if (data.status === "done" || data.status === "failed") {
          if (pollingRef.current[conversationId]) {
            clearInterval(pollingRef.current[conversationId]);
            delete pollingRef.current[conversationId];
          }
        }
      } else {
        setCallLogs((prev) =>
          prev.map((l) =>
            l.conversationId === conversationId ? { ...l, loadingTranscript: false } : l
          )
        );
        if (!isAuto) {
          toast({
            title: "Fehler beim Laden",
            description: data?.detail || data?.message || `HTTP ${res.status}`,
            variant: "destructive",
          });
        }
      }
    } catch {
      setCallLogs((prev) =>
        prev.map((l) =>
          l.conversationId === conversationId ? { ...l, loadingTranscript: false } : l
        )
      );
    }
  }, [apiKey]);

  // Start auto-polling for a conversation
  const startPolling = useCallback((conversationId: string) => {
    if (pollingRef.current[conversationId]) return; // already polling

    // First fetch immediately
    fetchTranscript(conversationId, true);

    // Then poll every 10 seconds
    pollingRef.current[conversationId] = setInterval(() => {
      fetchTranscript(conversationId, true);
    }, 10000);

    // Stop polling after 5 minutes max
    setTimeout(() => {
      if (pollingRef.current[conversationId]) {
        clearInterval(pollingRef.current[conversationId]);
        delete pollingRef.current[conversationId];
      }
    }, 5 * 60 * 1000);
  }, [fetchTranscript]);

  const handleCall = async () => {
    if (!phoneNumber.trim()) {
      toast({ title: "Telefonnummer erforderlich", variant: "destructive" });
      return;
    }
    if (!customerName.trim()) {
      toast({ title: "Kundenname (customer) erforderlich", variant: "destructive" });
      return;
    }
    if (!isConfigured) {
      toast({
        title: "Konfiguration fehlt",
        description: "Bitte Agent-ID, Telefon-ID und API-Schlüssel konfigurieren.",
        variant: "destructive",
      });
      return;
    }

    const normalized = normalizePhone(phoneNumber);
    const apiNumber = normalized.startsWith("00")
      ? "+" + normalized.slice(2)
      : normalized;

    const logEntry: CallLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      toNumber: normalized,
      customerName: customerName.trim(),
      employeeName: employeeName.trim(),
      companyName: companyName.trim(),
      status: "pending",
    };

    setCallLogs((prev) => [logEntry, ...prev]);
    setIsCalling(true);

    const requestBody = {
      agent_id: agentId.trim(),
      agent_phone_number_id: agentPhoneNumberId.trim(),
      to_number: apiNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          customer: customerName.trim(),
          employee: employeeName.trim(),
          name: companyName.trim(),
        },
      },
    };

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        const convId = data?.conversation_id;
        setCallLogs((prev) =>
          prev.map((l) =>
            l.id === logEntry.id
              ? {
                  ...l,
                  status: "success" as const,
                  response: JSON.stringify(data, null, 2),
                  request: JSON.stringify(requestBody, null, 2),
                  conversationId: convId,
                }
              : l
          )
        );
        toast({
          title: "Anruf gestartet",
          description: `Anruf an ${formatPhoneDisplay(normalized)} (${customerName.trim()}) wurde initiiert.`,
        });

        // Auto-start polling for transcript
        if (convId) {
          // Wait 15s before first poll (call needs time to connect)
          setTimeout(() => startPolling(convId), 15000);
        }
      } else {
        const errMsg = data?.detail || data?.message || `HTTP ${res.status}: ${JSON.stringify(data)}`;
        setCallLogs((prev) =>
          prev.map((l) =>
            l.id === logEntry.id
              ? { ...l, status: "error" as const, error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg), request: JSON.stringify(requestBody, null, 2) }
              : l
          )
        );
        toast({
          title: "Fehler beim Anruf",
          description: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
          variant: "destructive",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setCallLogs((prev) =>
        prev.map((l) =>
          l.id === logEntry.id ? { ...l, status: "error" as const, error: message } : l
        )
      );
      toast({ title: "Netzwerkfehler", description: message, variant: "destructive" });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                <FlaskConical className="h-6 w-6" />
                Test — Calli-Agent Anruf
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Testanruf über Calli-Agent starten
              </p>
            </div>

            {/* Status Indicator */}
            {!isConfigured && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Konfiguration unvollständig. Bitte{" "}
                  <Link href="/settings" className="underline font-medium">
                    Einstellungen
                  </Link>{" "}
                  öffnen und API-Schlüssel, Agent-ID und Telefon-ID konfigurieren.
                </span>
              </div>
            )}

            {/* Call Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-5 w-5 text-orange-500" />
                  Anruf erstellen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefonnummer *</label>
                  <Input
                    placeholder="+49 171 1234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  {phoneNumber.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Gespeichert als: <code className="bg-muted px-1 rounded">{normalizePhone(phoneNumber)}</code>
                      {" "}— Anzeige: <span className="font-medium">{formatPhoneDisplay(normalizePhone(phoneNumber))}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Customer * <code className="text-[10px] bg-muted px-1 rounded font-normal">customer</code>
                    </label>
                    <Input placeholder="z.B. Marco" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Employee <code className="text-[10px] bg-muted px-1 rounded font-normal">employee</code>
                    </label>
                    <Input placeholder="z.B. Max" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Name <code className="text-[10px] bg-muted px-1 rounded font-normal">name</code>
                    </label>
                    <Input placeholder="z.B. TechWerk GmbH" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                </div>

                <Button
                  onClick={handleCall}
                  disabled={isCalling || !isConfigured}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                >
                  {isCalling ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Anruf wird gestartet...</>
                  ) : (
                    <><PhoneCall className="h-5 w-5 mr-2" />Anruf starten</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Call Log — only calls made from this UI */}
            {callLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-green-500" />
                    Meine Anrufe & Transkripte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {callLogs.map((log) => (
                      <CallLogEntry
                        key={log.id}
                        log={log}
                        onFetchTranscript={() => log.conversationId && fetchTranscript(log.conversationId)}
                        isPolling={!!log.conversationId && !!pollingRef.current[log.conversationId]}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}

// Single call log entry with transcript
function CallLogEntry({
  log,
  onFetchTranscript,
  isPolling,
}: {
  log: CallLog;
  onFetchTranscript: () => void;
  isPolling: boolean;
}) {
  const detail = log.conversationDetail;
  const transcript = detail?.transcript;
  const hasTranscript = transcript && transcript.length > 0;
  const isDone = detail?.status === "done" || detail?.status === "failed";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        log.status === "success"
          ? "border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10"
          : log.status === "error"
            ? "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10"
            : "border-orange-200 bg-orange-50/30 dark:border-orange-800 dark:bg-orange-950/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {log.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          {log.status === "error" && <PhoneOff className="h-4 w-4 text-red-600" />}
          {log.status === "pending" && <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />}
          <span className="font-medium text-sm">{log.customerName}</span>
          {log.companyName && (
            <Badge className="text-[10px] bg-muted text-muted-foreground">{log.companyName}</Badge>
          )}
          {log.employeeName && (
            <span className="text-xs text-muted-foreground">via {log.employeeName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {formatPhoneDisplay(log.toNumber)}
          </span>
          <Badge
            className={cn(
              "text-[10px]",
              log.status === "success"
                ? "bg-green-100 text-green-700"
                : log.status === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
            )}
          >
            {log.status === "success" ? "Gestartet" : log.status === "error" ? "Fehler" : "Läuft..."}
          </Badge>
        </div>
      </div>

      {/* Timestamp & conversation ID */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {new Date(log.timestamp).toLocaleString("de-DE")}
        {log.conversationId && (
          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{log.conversationId}</code>
        )}
        {detail && (
          <Badge className={cn(
            "text-[9px]",
            isDone ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
          )}>
            {detail.status}
          </Badge>
        )}
        {detail?.call_duration_secs != null && (
          <span>
            {Math.floor(detail.call_duration_secs / 60)}:{Math.floor(detail.call_duration_secs % 60).toString().padStart(2, "0")} Min
          </span>
        )}
        {isPolling && !isDone && (
          <span className="flex items-center gap-1 text-orange-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-Refresh
          </span>
        )}
      </div>

      {/* Error */}
      {log.error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-2 font-mono">
          {log.error}
        </div>
      )}

      {/* Transcript fetch button */}
      {log.conversationId && log.status === "success" && !hasTranscript && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onFetchTranscript}
          disabled={log.loadingTranscript}
        >
          {log.loadingTranscript ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          {detail ? "Transkript aktualisieren" : "Transkript laden"}
        </Button>
      )}

      {/* Analysis / Summary */}
      {detail?.analysis?.summary && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Zusammenfassung</p>
          <p className="text-sm text-blue-900 dark:text-blue-200">{detail.analysis.summary}</p>
        </div>
      )}

      {/* Data collection results */}
      {detail?.analysis?.data_collection_results && Object.keys(detail.analysis.data_collection_results).length > 0 && (
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 px-3 py-2">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Erfasste Daten</p>
          <div className="space-y-1">
            {Object.entries(detail.analysis.data_collection_results).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="font-medium text-purple-800 dark:text-purple-300 min-w-[80px]">{key}:</span>
                <span className="text-purple-700 dark:text-purple-200">{val.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {hasTranscript && (
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 max-h-[400px] overflow-y-auto space-y-1.5">
          {transcript.map((entry, idx) => {
            const isAgent = entry.role === "agent" || entry.role === "ai";
            return (
              <div key={idx} className="flex items-start gap-2 text-[12px] leading-relaxed">
                <span className={cn(
                  "inline-flex items-center gap-1 font-semibold shrink-0 min-w-[70px]",
                  isAgent
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-green-600 dark:text-green-400"
                )}>
                  {isAgent ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {isAgent ? "Agent" : "Kunde"}
                </span>
                <span className="text-foreground/80">{entry.message}</span>
                {entry.time_in_call_secs != null && (
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto tabular-nums">
                    {Math.floor(entry.time_in_call_secs / 60)}:{Math.floor(entry.time_in_call_secs % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh button when transcript exists */}
      {hasTranscript && !isDone && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] text-muted-foreground"
          onClick={onFetchTranscript}
          disabled={log.loadingTranscript}
        >
          {log.loadingTranscript ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Aktualisieren
        </Button>
      )}

      {/* Request/Response details */}
      {log.request && (
        <details className="text-xs" open={log.status === "error"}>
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            Request & Response
          </summary>
          <pre className="mt-1 bg-muted rounded-lg px-3 py-2 font-mono overflow-x-auto text-[11px]">
            {log.request}
          </pre>
          {log.response && (
            <pre className="mt-1 bg-muted rounded-lg px-3 py-2 font-mono overflow-x-auto text-[11px]">
              {log.response}
            </pre>
          )}
        </details>
      )}

      {/* Raw conversation data */}
      {detail && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            Rohdaten anzeigen
          </summary>
          <pre className="mt-1 bg-muted rounded-lg px-3 py-2 font-mono overflow-x-auto text-[11px] max-h-[300px] overflow-y-auto">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
