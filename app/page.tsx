"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhoneDisplay } from "lib/utils";
import { useToast } from "components/toast/use-toast";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Users,
  BarChart3,
  Activity,
  UserCheck,
  ListChecks,
  Play,
  Pause,
  CheckCircle2,
  ExternalLink,
  Trash2,
  User,
  Clock,
  LogIn,
  LogOut,
  Lock,
  Unlock,
} from "lucide-react";
import {
  getCallRecords,
  getActiveCalls,
  setActiveCalls,
  getOperatorAvailability,
  setOperatorAvailability,
  generateId,
  addCallRecord,
} from "lib/store";
import type { ActiveCall, CallRecord } from "lib/types";
import { fetchContacts, fetchCalls, updateCall, fetchOperator, updateOperator, fetchBatches, updateBatch, deleteBatch, fetchSettings, fetchAgents, type ContactDTO, type CallDTO, type BatchDTO } from "@/lib/api-client";
import {
  sampleTranscripts,
  TRANSCRIPT_NO_ANSWER,
  TRANSCRIPT_VOICEMAIL,
  TRANSCRIPT_BUSY,
  TRANSCRIPT_TRANSFER,
} from "lib/sample-transcripts";
import {
  getMockMode,
} from "lib/store";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function Page() {
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockedAt, setLockedAt] = useState<Date | null>(null);
  const [pollKey, setPollKey] = useState(0); // increments each poll to restart animation
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null);
  const [activeCalls, setActiveCallsState] = useState<ActiveCall[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [allContacts, setAllContacts] = useState<ContactDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [tick, setTick] = useState(0);
  const [agentCount, setAgentCount] = useState(2);
  const [queuePaused, setQueuePaused] = useState(false);
  // Transfer state is now driven by operator lock polling (isLocked / lockedBy)
  // No local transferredCall state — the lock API is the source of truth

  const [mockMode, setMockModeState] = useState(true);
  const [recentCalls, setRecentCalls] = useState<CallDTO[]>([]);

  // Track ElevenLabs polling intervals for real calls
  const elevenLabsPollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const transcriptAssignedRef = useRef<Record<string, number>>({});
  const [elevenLabsReady, setElevenLabsReady] = useState(true); // assume configured until proven otherwise

  // Load initial data - clear stale active calls on mount
  useEffect(() => {
    const wasAvailable = getOperatorAvailability();
    setIsAvailable(wasAvailable);
    if (wasAvailable) setCheckedInAt(new Date());
    // Clear any leftover active calls from previous sessions
    setActiveCalls([]);
    setActiveCallsState([]);
    setCallRecords(getCallRecords());
    // Load contacts from API
    async function loadContacts() {
      try {
        const res = await fetchContacts({ limit: 100 });
        setAllContacts(res.data);
        setContactCount(res.total);
      } catch {
        // fallback: leave empty
      }
    }
    loadContacts();
    // Load operator status from API
    async function loadOperator() {
      try {
        const res = await fetchOperator();
        setIsAvailable(res.data.available);
        setIsLocked(res.data.locked);
        setLockedBy(res.data.lockedBy ?? null);
        setLockedAt(res.data.lockedAt ? new Date(res.data.lockedAt) : null);
        setOperatorAvailability(res.data.available);
        if (res.data.available) setCheckedInAt(new Date());
      } catch {
        // fallback: use localStorage value
      }
    }
    loadOperator();
    // Load batches from API (non-completed only)
    fetchBatches({ limit: 100 })
      .then((res) => setBatches(res.data.filter((b) => b.status !== "completed")))
      .catch(() => {});
    setMockModeState(getMockMode());

    // Load settings + agents to check ElevenLabs configuration
    Promise.all([fetchSettings(), fetchAgents()]).then(([settingsRes, agentsRes]) => {
      setAgentCount(settingsRes.data.concurrentAgents ?? 2);
      const hasApiKey = !!settingsRes.data.apiKey;
      const hasAgent = agentsRes.data.some((a) => a.agentId && a.agentPhoneNumberId);
      setElevenLabsReady(hasApiKey && hasAgent);
    }).catch(() => {});

    // Load recent calls from API (exclude planned/not-yet-run calls)
    fetchCalls({ limit: 20 }).then((res) => setRecentCalls(res.data.filter((c) => c.status !== "planned").slice(0, 5))).catch(() => {});

    // Listen for mock mode changes from sidebar
    const handler = (e: Event) => {
      setMockModeState((e as CustomEvent).detail);
    };
    window.addEventListener("mockmode-changed", handler);
    return () => {
      window.removeEventListener("mockmode-changed", handler);
      // Cleanup ElevenLabs polling
      Object.values(elevenLabsPollingRef.current).forEach(clearInterval);
    };
  }, []);

  // Poll for recent calls every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalls({ limit: 20 }).then((res) => setRecentCalls(res.data.filter((c) => c.status !== "planned").slice(0, 5))).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll operator lock status every 5 seconds
  useEffect(() => {
    const pollOperator = async () => {
      try {
        const res = await fetchOperator();
        setIsLocked(res.data.locked);
        setLockedBy(res.data.lockedBy ?? null);
        setLockedAt(res.data.lockedAt ? new Date(res.data.lockedAt) : null);
        setIsAvailable(res.data.available);
        setOperatorAvailability(res.data.available);
      } catch {
        // ignore poll errors
      }
      setPollKey((k) => k + 1);
    };
    const interval = setInterval(pollOperator, 5000);
    return () => clearInterval(interval);
  }, []);

  // Duration tick - update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper: start ElevenLabs polling for a real call
  const startElevenLabsPolling = useCallback((conversationId: string, callRecordId: string, activeCallId: string, contactName: string) => {
    if (elevenLabsPollingRef.current[conversationId]) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/calls/${callRecordId}/poll`, { method: "POST" });
        const result = await res.json();
        if (!res.ok) return;

        const data = result.data;

        if (!data.polling) {
          // Call is done — stop polling
          if (elevenLabsPollingRef.current[conversationId]) {
            clearInterval(elevenLabsPollingRef.current[conversationId]);
            delete elevenLabsPollingRef.current[conversationId];
          }

          const duration = data.duration ?? 0;
          const callStatus = data.status === "failed" ? "failed" as const : "completed" as const;

          // Update local call records state
          setCallRecords((prev) =>
            prev.map((r) =>
              r.id === callRecordId
                ? {
                    ...r,
                    endedAt: new Date().toISOString(),
                    duration,
                    status: callStatus,
                    outcome: callStatus === "completed" ? "answered" as const : undefined,
                    summary: data.summary || `Anruf mit ${contactName}`,
                    elevenLabsTranscript: data.transcript,
                    elevenLabsSummary: data.summary,
                  }
                : r
            )
          );

          // Mark active call as completed/failed
          setActiveCallsState((p) => {
            const next = p.map((c) =>
              c.id === activeCallId ? { ...c, status: callStatus, duration } : c
            );
            setActiveCalls(next);
            return next;
          });

          // Remove from active calls after 4s
          setTimeout(() => {
            setActiveCallsState((p) => {
              const next = p.filter((c) => c.id !== activeCallId);
              setActiveCalls(next);
              return next;
            });
          }, 4000);
        }
      } catch {
        // Network error — will retry on next interval
      }
    };

    // First poll after 5s, then every 5s
    setTimeout(() => {
      poll();
      elevenLabsPollingRef.current[conversationId] = setInterval(poll, 5000);
    }, 5000);

    // Stop after 10 min max
    setTimeout(() => {
      if (elevenLabsPollingRef.current[conversationId]) {
        clearInterval(elevenLabsPollingRef.current[conversationId]);
        delete elevenLabsPollingRef.current[conversationId];
      }
    }, 10 * 60 * 1000);
  }, []);

  // Poll batches from API every 10 seconds to get updated counts and statuses
  useEffect(() => {
    const pollBatches = async () => {
      try {
        const res = await fetchBatches({ limit: 100 });
        setBatches(res.data.filter((b) => b.status !== "completed"));
      } catch {
        // ignore
      }
    };
    const interval = setInterval(pollBatches, 10000);
    return () => clearInterval(interval);
  }, []);

  // Cache of planned calls per batch (fetched from API)
  const batchCallsCache = useRef<Record<string, { contactId: string; callId: string }[]>>({});
  const spawnLockRef = useRef(false); // prevent concurrent spawns

  // Process running batches - auto-spawn calls on free agent slots
  useEffect(() => {
    const runningBatches = batches.filter((b) => b.status === "running");
    if (runningBatches.length === 0 || queuePaused) return;

    const spawnCalls = async () => {
      // Prevent concurrent runs
      if (spawnLockRef.current) return;
      spawnLockRef.current = true;

      try {
        // 1. Check operator availability via API
        let operatorOk = false;
        try {
          const opRes = await fetchOperator();
          const op = opRes.data;
          setIsAvailable(op.available);
          setIsLocked(op.locked);
          setLockedBy(op.lockedBy ?? null);
          setLockedAt(op.lockedAt ? new Date(op.lockedAt) : null);
          operatorOk = op.available && !op.locked;
        } catch {
          // If API fails, use local state
          operatorOk = isAvailable && !isLocked;
        }
        if (!operatorOk || queuePaused) return;

        // 2. Count busy slots
        const currentCalls = getActiveCalls();
        const busyCalls = currentCalls.filter(
          (c) => c.status !== "completed" && c.status !== "failed"
        );
        if (busyCalls.length >= agentCount) return;

        const contactMap = new Map(allContacts.map((c) => [c.id, c]));

        for (const batch of runningBatches) {
          // Check slot availability again inside loop
          const currentBusy = getActiveCalls().filter(
            (c) => c.status !== "completed" && c.status !== "failed"
          );
          if (currentBusy.length >= agentCount) break;

          // 3. Fetch planned calls for this batch (cache them)
          if (!batchCallsCache.current[batch.id]) {
            try {
              const callsRes = await fetchCalls({ batchId: batch.id, status: "planned", limit: 500 });
              batchCallsCache.current[batch.id] = callsRes.data.map((c) => ({
                contactId: c.contactId,
                callId: c.id,
              }));
            } catch {
              continue;
            }
          }

          const plannedCalls = batchCallsCache.current[batch.id];
          if (!plannedCalls || plannedCalls.length === 0) {
            // No more planned calls — mark batch completed
            updateBatch(batch.id, { status: "completed" }).catch(() => {});
            setBatches((prev) => prev.filter((b) => b.id !== batch.id));
            delete batchCallsCache.current[batch.id];
            continue;
          }

          // Pick the next planned call
          const nextPlanned = plannedCalls.shift()!;
          // Persist the shift so we don't re-pick it
          batchCallsCache.current[batch.id] = plannedCalls;

          const contact = contactMap.get(nextPlanned.contactId);
          if (!contact) {
            // Contact not found, skip
            continue;
          }

          // Find free agent slot
          const usedSlots = new Set(currentBusy.map((c) => c.agentId));
          let slot = 0;
          for (let i = 1; i <= agentCount; i++) {
            if (!usedSlots.has(i)) { slot = i; break; }
          }
          if (slot === 0) break;

          const callId = generateId();
          const contactName = `${contact.firstName} ${contact.lastName}`;
          const newCall: ActiveCall = {
            id: callId,
            contactId: contact.id,
            contactName,
            phone: contact.phone,
            status: "ringing",
            startedAt: new Date().toISOString(),
            duration: 0,
            agentId: slot,
          };

          const newCompleted = batch.completedCalls + 1;
          setBatches((prev) =>
            prev.map((b) => b.id === batch.id ? { ...b, completedCalls: newCompleted } : b)
          );

          setActiveCallsState((prev) => {
            const updated = [...prev, newCall];
            setActiveCalls(updated);
            return updated;
          });

          if (mockMode) {
            // ===== MOCK MODE: simulate with sample transcripts =====
            let scriptIndex: number;
            if (isAvailable && Math.random() < 0.15) {
              scriptIndex = TRANSCRIPT_TRANSFER;
            } else {
              const pool = [0, 1, 2, 3, TRANSCRIPT_NO_ANSWER, TRANSCRIPT_VOICEMAIL, TRANSCRIPT_BUSY];
              scriptIndex = pool[Math.floor(Math.random() * pool.length)];
            }

            const isTransfer = scriptIndex === TRANSCRIPT_TRANSFER;
            const isNoAnswer = scriptIndex === TRANSCRIPT_NO_ANSWER;
            const isVoicemail = scriptIndex === TRANSCRIPT_VOICEMAIL;
            const isBusy = scriptIndex === TRANSCRIPT_BUSY;

            const script = sampleTranscripts[scriptIndex];
            const scriptTotalMs = script.reduce((sum, line) => sum + line.delayMs, 0);
            const scriptDurationSec = Math.ceil(scriptTotalMs / 1000) + 4;

            let outcome: CallRecord["outcome"];
            if (isTransfer) outcome = "callback-requested";
            else if (isNoAnswer) outcome = "no-answer";
            else if (isVoicemail) outcome = "voicemail";
            else if (isBusy) outcome = "busy";
            else {
              const goodOutcomes: CallRecord["outcome"][] = ["answered", "meeting-booked", "callback-requested"];
              outcome = goodOutcomes[Math.floor(Math.random() * goodOutcomes.length)];
            }

            transcriptAssignedRef.current[callId] = scriptIndex;

            setTimeout(() => {
              setActiveCallsState((p) => {
                const next = p.map((c) =>
                  c.id === callId ? { ...c, status: "in-progress" as const } : c
                );
                setActiveCalls(next);
                return next;
              });
            }, 3000);

            if (isTransfer) {
              const transferAfterMs = (scriptDurationSec + 3) * 1000;
              const mockConvId = `conv_mock_${callId}`;
              setTimeout(async () => {
                setActiveCallsState((p) => {
                  const next = p.map((c) =>
                    c.id === callId ? { ...c, status: "transferring" as const, conversationId: mockConvId } : c
                  );
                  setActiveCalls(next);
                  return next;
                });

                try {
                  await updateOperator({ locked: true, lockedBy: mockConvId });
                } catch {
                  // operator lock API not available
                }
                setQueuePaused(true);

                const transferRecord: CallRecord = {
                  id: generateId(), contactId: contact.id,
                  startedAt: newCall.startedAt,
                  endedAt: new Date().toISOString(),
                  duration: scriptDurationSec,
                  status: "transferred", outcome: "callback-requested",
                  summary: `Weiterleitung: ${contactName} — Kunde möchte mit Mensch sprechen`,
                };
                addCallRecord(transferRecord);
                setCallRecords((prev) => [transferRecord, ...prev]);
                updateCall(nextPlanned.callId, {
                  status: "transferred", outcome: "callback-requested",
                  duration: scriptDurationSec,
                }).catch(() => {});

                setTimeout(() => {
                  setActiveCallsState((p) => {
                    const next = p.filter((c) => c.id !== callId);
                    setActiveCalls(next);
                    return next;
                  });
                }, 4000);

                toast({
                  title: "Anruf weitergeleitet",
                  description: `${contactName} — Operator blockiert durch ${mockConvId}`,
                });
              }, transferAfterMs);
            } else {
              const completeAfterMs = (scriptDurationSec + 3) * 1000;
              setTimeout(() => {
                const record: CallRecord = {
                  id: generateId(), contactId: contact.id,
                  startedAt: newCall.startedAt,
                  endedAt: new Date().toISOString(),
                  duration: scriptDurationSec,
                  status: "completed", outcome,
                  summary: `Batch call with ${contactName} - ${outcome?.replace("-", " ")}`,
                };
                addCallRecord(record);
                setCallRecords((prev) => [record, ...prev]);
                updateCall(nextPlanned.callId, {
                  status: "completed", outcome,
                  duration: scriptDurationSec,
                }).catch(() => {});

                setActiveCallsState((p) => {
                  const next = p.map((c) =>
                    c.id === callId ? { ...c, status: "completed" as const, duration: scriptDurationSec } : c
                  );
                  setActiveCalls(next);
                  return next;
                });

                setTimeout(() => {
                  setActiveCallsState((p) => {
                    const next = p.filter((c) => c.id !== callId);
                    setActiveCalls(next);
                    return next;
                  });
                }, 4000);
              }, completeAfterMs);
            }
          } else {
            // ===== LIVE MODE: delegate to backend =====
            fetch("/api/calls/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ callId: nextPlanned.callId, contactId: contact.id }),
            }).then(async (res) => {
              const result = await res.json();
              if (res.ok) {
                // Backend started the call and updated the DB
                const convId = result.data?.conversationId;
                setActiveCallsState((p) => {
                  const next = p.map((c) =>
                    c.id === callId ? { ...c, status: "in-progress" as const, ...(convId ? { conversationId: convId } : {}) } : c
                  );
                  setActiveCalls(next);
                  return next;
                });
                toast({
                  title: "Anruf gestartet (LIVE)",
                  description: `${contactName} — ${convId || result.data?.callId}`,
                });
                // Start polling backend for call status updates
                startElevenLabsPolling(convId || nextPlanned.callId, nextPlanned.callId, callId, contactName);
              } else {
                // Backend returned error
                const errMsg = result.error || "Unbekannter Fehler";
                setActiveCallsState((p) => {
                  const next = p.map((c) =>
                    c.id === callId ? { ...c, status: "failed" as const } : c
                  );
                  setActiveCalls(next);
                  return next;
                });
                toast({
                  title: "Anruf fehlgeschlagen",
                  description: errMsg,
                  variant: "destructive",
                });
                setTimeout(() => {
                  setActiveCallsState((p) => {
                    const next = p.filter((c) => c.id !== callId);
                    setActiveCalls(next);
                    return next;
                  });
                }, 4000);
              }
            });
          }

          // Only spawn one call per interval tick
          break;
        }
      } finally {
        spawnLockRef.current = false;
      }
    };

    const interval = setInterval(spawnCalls, 5000);
    return () => clearInterval(interval);
  }, [batches, queuePaused, isAvailable, isLocked, agentCount, mockMode, startElevenLabsPolling, allContacts, toast]);

  // Recalculate durations on tick for active calls
  const getCallDuration = useCallback(
    (call: ActiveCall) => {
      if (call.status === "completed" || call.status === "failed") {
        return call.duration;
      }
      const elapsed = Math.floor(
        (Date.now() - new Date(call.startedAt).getTime()) / 1000
      );
      return elapsed;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  const toggleAvailability = async () => {
    if (isLocked) {
      toast({
        title: "Operator ist gesperrt",
        description: `Gesperrt von: ${lockedBy ?? "Unbekannt"}. Bitte zuerst entsperren.`,
      });
      return;
    }
    const next = !isAvailable;
    setIsAvailable(next);
    setOperatorAvailability(next);
    if (next) {
      setCheckedInAt(new Date());
    } else {
      setCheckedInAt(null);
    }
    try {
      await updateOperator({ available: next });
    } catch {
      // rollback on failure
      setIsAvailable(!next);
      setOperatorAvailability(!next);
    }
    toast({
      title: next ? "Sie sind jetzt verfügbar" : "Sie sind jetzt nicht verfügbar",
      description: next
        ? "Agenten können Anrufe an Sie weiterleiten."
        : "Agenten bearbeiten alle Anrufe selbstständig.",
    });
  };

  const handleUnlock = async () => {
    const prevLockedBy = lockedBy;
    const prevLockedAt = lockedAt;
    setIsLocked(false);
    setLockedBy(null);
    setLockedAt(null);
    try {
      await updateOperator({ locked: false });
    } catch {
      setIsLocked(true);
      setLockedBy(prevLockedBy);
      setLockedAt(prevLockedAt);
    }
    toast({
      title: "Operator entsperrt",
      description: "Alle Agenten können jetzt wieder Anrufe weiterleiten.",
    });
  };

  const handleManualLock = async () => {
    setIsLocked(true);
    setLockedBy("manual");
    setLockedAt(new Date());
    try {
      await updateOperator({ locked: true, lockedBy: "manual" });
    } catch {
      setIsLocked(false);
      setLockedBy(null);
      setLockedAt(null);
    }
    toast({
      title: "Operator manuell gesperrt",
      description: "Kein Agent kann Anrufe weiterleiten bis Sie entsperren.",
    });
  };

  const simulateCall = () => {
    const current = activeCalls.filter(
      (c) => c.status !== "completed" && c.status !== "failed"
    );
    if (current.length >= agentCount) {
      toast({
        title: "Alle Agenten-Slots sind belegt",
        description: "Warten Sie, bis ein Anruf abgeschlossen ist.",
      });
      return;
    }

    let contactName = "Unbekannter Kontakt";
    let contactId = "demo";
    let phone = "+1 (555) 012-3456";

    if (allContacts.length > 0) {
      const c = allContacts[Math.floor(Math.random() * allContacts.length)];
      contactName = `${c.firstName} ${c.lastName}`;
      contactId = c.id;
      phone = c.phone;
    }

    const usedSlots = new Set(current.map((c) => c.agentId));
    let slot = 1;
    for (let i = 1; i <= agentCount; i++) {
      if (!usedSlots.has(i)) {
        slot = i;
        break;
      }
    }

    const callId = generateId();
    const newCall: ActiveCall = {
      id: callId,
      contactId,
      contactName,
      phone,
      status: "ringing",
      startedAt: new Date().toISOString(),
      duration: 0,
      agentId: slot,
    };

    const updated = [...activeCalls, newCall];
    setActiveCallsState(updated);
    setActiveCalls(updated);

    // Pick a random transcript and calculate call duration from it
    const scriptIndex = Math.floor(Math.random() * sampleTranscripts.length);
    const script = sampleTranscripts[scriptIndex];
    const scriptTotalMs = script.reduce((sum, line) => sum + line.delayMs, 0);
    const simDuration = Math.ceil(scriptTotalMs / 1000) + 4;
    transcriptAssignedRef.current[callId] = scriptIndex;

    toast({
      title: "Simulierter Anruf gestartet",
      description: `Rufe ${contactName} auf Agent ${slot} an`,
    });

    // After 3 seconds, move to in-progress
    setTimeout(() => {
      setActiveCallsState((prev) => {
        const next = prev.map((c) =>
          c.id === callId ? { ...c, status: "in-progress" as const } : c
        );
        setActiveCalls(next);
        return next;
      });
    }, 3000);

    // Complete after ringing (3s) + transcript plays out
    const completeAfterMs = (simDuration + 3) * 1000;
    setTimeout(() => {
      const outcomes: CallRecord["outcome"][] = ["answered", "no-answer", "voicemail", "meeting-booked", "callback-requested"];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

      const record: CallRecord = {
        id: generateId(),
        contactId,
        startedAt: newCall.startedAt,
        endedAt: new Date().toISOString(),
        duration: simDuration,
        status: "completed",
        outcome,
        summary: `Simulated call with ${contactName} - ${outcome?.replace("-", " ")}`,
      };
      addCallRecord(record);
      setCallRecords((prev) => [record, ...prev]);

      // Mark completed briefly, then remove from active calls
      setActiveCallsState((prev) => {
        const next = prev.map((c) =>
          c.id === callId
            ? { ...c, status: "completed" as const, duration: simDuration }
            : c
        );
        setActiveCalls(next);
        return next;
      });

      toast({
        title: "Anruf beendet",
        description: `Anruf mit ${contactName} beendet.`,
      });

      // Remove from active calls after 4 seconds so the user sees the "completed" state
      setTimeout(() => {
        setActiveCallsState((prev) => {
          const next = prev.filter((c) => c.id !== callId);
          setActiveCalls(next);
          return next;
        });
      }, 4000);
    }, completeAfterMs);
  };

  // Unlock operator (dismiss block)
  const handleUnlockOperator = async () => {
    try {
      await updateOperator({ locked: false });
      setIsLocked(false);
      setLockedBy(null);
      setLockedAt(null);
      setQueuePaused(false);
      toast({ title: "Operator entsperrt", description: "Warteschlange fortgesetzt." });
    } catch {
      toast({ title: "Fehler beim Entsperren", variant: "destructive" });
    }
  };

  // Queue stats for visualization
  const queueStats = useMemo(() => {
    const runningBatches = batches.filter((b) => b.status === "running");
    let totalQueued = 0;
    let totalProcessed = 0;
    let totalInBatches = 0;
    for (const batch of runningBatches) {
      totalProcessed += batch.completedCalls;
      totalInBatches += batch.totalCalls;
      const remaining = batch.totalCalls - batch.completedCalls;
      totalQueued += Math.max(0, remaining);
    }

    // Determine pause reason
    let pauseReason: string | null = null;
    if (isLocked) {
      pauseReason = `Operator blockiert durch ${lockedBy ?? "unbekannt"}`;
    } else if (!isAvailable && runningBatches.length > 0) {
      pauseReason = "Operator ist nicht verfügbar";
    } else if (queuePaused) {
      pauseReason = "Warteschlange manuell pausiert";
    }

    const isEffectivelyPaused = queuePaused || !isAvailable || isLocked;

    return { totalQueued, totalProcessed, totalInBatches, runningBatches, pauseReason, isEffectivelyPaused };
  }, [batches, tick, isLocked, lockedBy, isAvailable, queuePaused, allContacts]);

  // Contact lookup map for resolving names
  const contactsMap = useMemo(() => {
    const map: Record<string, { name: string }> = {};
    for (const c of allContacts) {
      map[c.id] = { name: `${c.firstName} ${c.lastName}` };
    }
    return map;
  }, [allContacts]);

  // Contact status counts for the overview
  const contactStatusCounts = useMemo(() => {
    const counts: Record<ContactDTO["status"], number> = {
      new: 0, contacted: 0, scheduled: 0, completed: 0, "no-answer": 0, callback: 0,
    };
    for (const c of allContacts) counts[c.status] = (counts[c.status] || 0) + 1;
    return counts;
  }, [allContacts]);

  // Outcome counts from call records
  const outcomeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of callRecords) {
      if (r.outcome) counts[r.outcome] = (counts[r.outcome] || 0) + 1;
    }
    return counts;
  }, [callRecords]);

  // Stats
  const callsToday = callRecords.filter((r) => r.startedAt && isToday(r.startedAt)).length;
  const completedRecords = callRecords.filter(
    (r) => r.status === "completed" || r.status === "failed"
  );
  const successRecords = callRecords.filter(
    (r) => r.outcome === "answered" || r.outcome === "meeting-booked"
  );
  const successRate =
    completedRecords.length > 0
      ? Math.round((successRecords.length / completedRecords.length) * 100)
      : 0;

  // Build agent slots dynamically
  const agentSlots = Array.from({ length: agentCount }, (_, i) => i + 1).map((slotNum) => {
    const call = activeCalls.find(
      (c) =>
        c.agentId === slotNum &&
        c.status !== "completed" &&
        c.status !== "failed"
    );
    return { slotNum, call };
  });

  const statusColor = (status: ActiveCall["status"]) => {
    switch (status) {
      case "ringing":
        return "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
      case "in-progress":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
      case "transferring":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "completed":
      case "failed":
        return "border-l-muted-foreground/30 bg-muted/30 opacity-60";
    }
  };

  const statusBadgeVariant = (status: ActiveCall["status"]) => {
    switch (status) {
      case "ringing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
      case "in-progress":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "transferring":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const statusIcon = (status: ActiveCall["status"]) => {
    switch (status) {
      case "ringing":
        return <Phone className="h-4 w-4" />;
      case "in-progress":
        return <PhoneCall className="h-4 w-4" />;
      case "transferring":
        return <PhoneForwarded className="h-4 w-4" />;
      default:
        return <PhoneOff className="h-4 w-4" />;
    }
  };

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Überwachen Sie Ihre KI-Anrufagenten in Echtzeit.
                </p>
              </div>
              <Badge className={cn(
                "text-sm px-3 py-1",
                mockMode
                  ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                  : "bg-red-100 text-red-800 border-red-300 animate-pulse"
              )}>
                {mockMode ? "DEMO-Modus" : "LIVE-Modus"}
              </Badge>
            </div>

            {/* Live mode warning */}
            {!mockMode && !elevenLabsReady && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                <Activity className="h-4 w-4 shrink-0" />
                <span>
                  LIVE-Modus aktiv, aber ElevenLabs ist nicht konfiguriert.{" "}
                  <Link href="/test" className="underline font-medium">Konfiguration öffnen</Link> oder Mock-Modus aktivieren.
                </span>
              </div>
            )}

            {/* Operator Status Card */}
            <Card className={cn(
              "border-2 transition-all duration-300",
              isLocked
                ? "border-yellow-400 dark:border-yellow-600 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                : isAvailable
                  ? "border-green-400 dark:border-green-600 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : "border-border"
            )}>
              <CardContent className="py-4 space-y-3">
                {/* Top row: status + actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex items-center justify-center h-12 w-12 rounded-full",
                      isAvailable
                        ? "bg-green-100 dark:bg-green-950/40"
                        : "bg-muted"
                    )}>
                      <User className={cn(
                        "h-6 w-6",
                        isAvailable ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          {isAvailable && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          )}
                          <span className={cn(
                            "relative inline-flex rounded-full h-3 w-3",
                            isAvailable ? "bg-green-500" : "bg-muted-foreground/40"
                          )} />
                        </span>
                        <span className="font-semibold">
                          {isAvailable ? "Verfügbar" : "Nicht verfügbar"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {isAvailable
                          ? "Agenten können Anrufe an Sie weiterleiten"
                          : "Agenten bearbeiten alle Anrufe selbstständig"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-6 text-sm">
                      {checkedInAt && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <LogIn className="h-4 w-4" />
                          <span>Eingecheckt: {checkedInAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}
                      {checkedInAt && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Online: {formatDuration(Math.floor((Date.now() - checkedInAt.getTime()) / 1000))}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <PhoneForwarded className="h-4 w-4" />
                        <span>{callRecords.filter(r => r.outcome === "meeting-booked" && r.startedAt && isToday(r.startedAt)).length} Termine heute</span>
                      </div>
                    </div>

                    <Button
                      onClick={toggleAvailability}
                      variant={isAvailable ? "outline" : "default"}
                      disabled={isLocked}
                      className={cn(
                        isLocked
                          ? "opacity-50 cursor-not-allowed"
                          : isAvailable
                            ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                            : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                    >
                      {isAvailable ? (
                        <><LogOut className="h-4 w-4 mr-1.5" />Auschecken</>
                      ) : (
                        <><LogIn className="h-4 w-4 mr-1.5" />Einchecken</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Lock info bar */}
                <div className={cn(
                  "flex items-center justify-between rounded-lg px-4 py-2.5 transition-all",
                  isLocked
                    ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800"
                    : "bg-muted/50 border border-transparent"
                )}>
                  <div className="flex items-center gap-3">
                    {/* Poll indicator: circular progress that fills over 5s */}
                    <div className="relative h-8 w-8 shrink-0 flex items-center justify-center">
                      <svg className="absolute inset-0 h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16" cy="16" r="14"
                          fill="none"
                          strokeWidth="2"
                          className={isLocked ? "stroke-yellow-200 dark:stroke-yellow-900" : "stroke-muted"}
                        />
                        <circle
                          key={pollKey}
                          cx="16" cy="16" r="14"
                          fill="none"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 14}`}
                          strokeDashoffset={`${2 * Math.PI * 14}`}
                          className={isLocked ? "stroke-yellow-500 dark:stroke-yellow-400" : "stroke-muted-foreground/40"}
                          style={{
                            animation: "poll-sweep 5s linear forwards",
                          }}
                        />
                      </svg>
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 relative z-10" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5 text-muted-foreground relative z-10" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isLocked ? "text-yellow-800 dark:text-yellow-300" : "text-muted-foreground"
                        )}>
                          {isLocked
                            ? lockedBy === "manual"
                              ? "Manuell gesperrt"
                              : "Gesperrt durch Anruf"
                            : "Keine Sperre aktiv"}
                        </span>
                        {isLocked && lockedBy && lockedBy !== "manual" && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs font-mono dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700">
                            {lockedBy}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isLocked ? (
                          <>
                            {lockedBy === "manual" ? (
                              "Manuell gesperrt. Kein Anruf kann weitergeleitet werden."
                            ) : (
                              <>Dieser Anruf hat exklusiven Zugriff auf die Weiterleitung. Andere Anrufe versuchen Termine zu vereinbaren.</>
                            )}
                            {lockedAt && (
                              <span className="ml-1">
                                {" "}Gesperrt seit {lockedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                {" "}({formatDuration(Math.floor((Date.now() - lockedAt.getTime()) / 1000))})
                              </span>
                            )}
                          </>
                        ) : (
                          "Kein Anruf hält die Sperre. Jeder Anruf kann an Sie weitergeleitet werden."
                        )}
                      </p>
                    </div>
                  </div>

                  {isLocked ? (
                    <Button
                      onClick={handleUnlock}
                      variant="outline"
                      size="sm"
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-950/30 shrink-0"
                    >
                      <Unlock className="h-4 w-4 mr-1.5" />Entsperren
                    </Button>
                  ) : (
                    <Button
                      onClick={handleManualLock}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Lock className="h-4 w-4 mr-1.5" />Manuell sperren
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main 3-column layout: Active Calls (2 cols) + Queue/Batches (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Active Calls - 2 columns wide */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-green-500" />
                  Aktive Anrufe ({agentCount} Agenten)
                </h2>

                {/* Agent Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {agentSlots.map(({ slotNum, call }) => (
                  <Card
                    key={slotNum}
                    className={cn(
                      "border-l-4 transition-all duration-500",
                      call
                        ? statusColor(call.status)
                        : "border-l-muted-foreground/20 opacity-50"
                    )}
                  >
                    <CardContent className="py-3">
                      {call ? (
                        <>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Agent {slotNum}
                              </span>
                              <Badge
                                className={cn(
                                  "text-[10px] px-1.5 py-0 border-0",
                                  statusBadgeVariant(call.status)
                                )}
                              >
                                <span className="flex items-center gap-1">
                                  {statusIcon(call.status)}
                                  {call.status}
                                </span>
                              </Badge>
                            </div>
                            <Link
                              href={`/contacts/${call.contactId}`}
                              className="font-semibold text-sm hover:text-primary transition-colors"
                            >
                              {call.contactName}
                              <ExternalLink className="inline h-3 w-3 ml-1 opacity-40" />
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {formatPhoneDisplay(call.phone)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-mono font-bold tabular-nums">
                              {formatDuration(getCallDuration(call))}
                            </p>
                          </div>
                        </div>
                        {/* Conversation ID (shown on transfer) */}
                        {call.conversationId && (
                          <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                            {call.conversationId}
                          </p>
                        )}
                        </>
                      ) : (
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Agent {slotNum}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground italic">
                            Agent bereit
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>

              {/* Queue & Batches Panel - Right column */}
              <div className="lg:col-span-1 flex flex-col">
              {(queueStats.runningBatches.length > 0 || batches.length > 0) ? (
              <Card className={cn(
                "border-2 flex-1",
                queueStats.isEffectivelyPaused && queueStats.runningBatches.length > 0
                  ? "border-orange-300 dark:border-orange-700"
                  : queueStats.runningBatches.length > 0
                  ? "border-green-300 dark:border-green-700"
                  : "border-border"
              )}>
                <CardContent className="py-4 space-y-4">
                  {/* Queue Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-full",
                        queueStats.isEffectivelyPaused && queueStats.runningBatches.length > 0
                          ? "bg-orange-100 dark:bg-orange-900/40"
                          : queueStats.runningBatches.length > 0
                          ? "bg-green-100 dark:bg-green-900/40"
                          : "bg-muted"
                      )}>
                        {queueStats.isEffectivelyPaused && queueStats.runningBatches.length > 0 ? (
                          <Pause className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        ) : queueStats.runningBatches.length > 0 ? (
                          <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ListChecks className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">
                          {queueStats.runningBatches.length > 0
                            ? queueStats.isEffectivelyPaused ? "Warteschlange pausiert" : "Warteschlange aktiv"
                            : "Anrufstapel"
                          }
                        </h2>
                        {queueStats.pauseReason && (
                          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            {queueStats.pauseReason}
                          </p>
                        )}
                        {queueStats.runningBatches.length > 0 && !queueStats.pauseReason && (
                          <p className="text-xs text-muted-foreground">
                            Anrufe werden über {agentCount} Agenten verarbeitet
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-muted-foreground">Agenten: {agentCount}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {queueStats.totalInBatches > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{queueStats.totalProcessed} verarbeitet</span>
                        <span>{queueStats.totalQueued} verbleibend von {queueStats.totalInBatches}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            queueStats.isEffectivelyPaused ? "bg-orange-500" : "bg-green-500"
                          )}
                          style={{ width: `${(queueStats.totalProcessed / queueStats.totalInBatches) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Queue summary */}
                  {queueStats.totalQueued > 0 && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm">
                      <span className="text-muted-foreground">{queueStats.totalQueued} Anrufe in der Warteschlange</span>
                      {queueStats.isEffectivelyPaused && (
                        <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0">Pausiert</Badge>
                      )}
                    </div>
                  )}

                  {/* Batch List */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stapel</p>
                    <div className="grid grid-cols-1 gap-2">
                      {batches
                        .sort((a, b) => {
                          const order = { running: 0, paused: 1, pending: 2, completed: 3 };
                          return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                        })
                        .map((batch) => {
                          const progress = batch.totalCalls > 0 ? (batch.completedCalls / batch.totalCalls) * 100 : 0;
                          return (
                            <div key={batch.id} className={cn(
                              "rounded-lg border p-3 space-y-2",
                              batch.status === "running" ? "border-green-200 dark:border-green-800" :
                              batch.status === "paused" ? "border-yellow-200 dark:border-yellow-800" :
                              batch.status === "completed" ? "border-border opacity-60" : "border-border"
                            )}>
                              <div className="flex items-center justify-between">
                                <Link href={`/scheduler/${batch.id}`} className="font-semibold text-sm hover:text-primary transition-colors truncate">
                                  {batch.name}
                                  <ExternalLink className="inline h-3 w-3 ml-1 opacity-40" />
                                </Link>
                                <div className="flex items-center gap-1">
                                  <Badge className={cn("text-[10px] px-1.5 py-0 border-0",
                                    batch.status === "running" ? "bg-green-100 text-green-700" :
                                    batch.status === "completed" ? "bg-green-100 text-green-700" :
                                    batch.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                                    "bg-muted text-muted-foreground"
                                  )}>{batch.status}</Badge>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-100"
                                    onClick={async () => {
                                      await deleteBatch(batch.id);
                                      setBatches((prev) => prev.filter((b) => b.id !== batch.id));
                                      toast({ title: "Stapel gelöscht" });
                                    }}
                                  ><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{batch.totalCalls} Kontakte</span>
                                <span>{batch.completedCalls}/{batch.totalCalls}</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all",
                                  batch.status === "completed" ? "bg-green-500" : "bg-orange-500"
                                )} style={{ width: `${progress}%` }} />
                              </div>
                              {batch.status !== "completed" && (
                                <div className="flex gap-1">
                                  {(batch.status === "pending" || batch.status === "paused") && (
                                    <Button size="sm" className="h-6 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                                      onClick={async () => {
                                        await updateBatch(batch.id, { status: "running" });
                                        setBatches((prev) => prev.map((b) => b.id === batch.id ? { ...b, status: "running" } : b));
                                      }}
                                    ><Play className="h-3 w-3 mr-1" />{batch.status === "paused" ? "Fortsetzen" : "Starten"}</Button>
                                  )}
                                  {batch.status === "running" && (
                                    <Button size="sm" variant="outline" className="h-6 text-[11px] border-yellow-400 text-yellow-700"
                                      onClick={async () => {
                                        await updateBatch(batch.id, { status: "paused" });
                                        setBatches((prev) => prev.map((b) => b.id === batch.id ? { ...b, status: "paused" } : b));
                                      }}
                                    ><Pause className="h-3 w-3 mr-1" />Pausieren</Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border h-full">
                <CardContent className="py-8 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                  <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Keine Stapel vorhanden.</p>
                  <Link href="/scheduler" className="text-xs text-primary hover:underline mt-1 inline-block">
                    Zum Planer →
                  </Link>
                </CardContent>
              </Card>
            )}
              </div>
            </div>

            {/* Recent Calls (API-backed with polling) */}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Letzte Anrufe
              </h2>
              <Card>
                <CardContent className="py-2">
                  {recentCalls.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Noch keine Anrufe vorhanden.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {recentCalls.map((call) => {
                        const contactName = contactsMap[call.contactId]?.name;
                        return (
                          <li
                            key={call.id}
                            className="flex items-center justify-between py-3 gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                                  call.status === "completed"
                                    ? "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                                    : call.status === "failed"
                                    ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                    : call.status === "in-progress"
                                    ? "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {call.status === "completed" ? (
                                  <PhoneOff className="h-4 w-4" />
                                ) : call.status === "failed" ? (
                                  <PhoneOff className="h-4 w-4" />
                                ) : call.status === "in-progress" ? (
                                  <PhoneCall className="h-4 w-4" />
                                ) : (
                                  <Phone className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                {contactName ? (
                                  <Link
                                    href={`/contacts/${call.contactId}`}
                                    className="text-sm font-medium truncate block hover:text-primary transition-colors"
                                  >
                                    {contactName}
                                    <ExternalLink className="inline h-3 w-3 ml-1 opacity-50" />
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium truncate">
                                    {call.summary || `Anruf ${call.id.slice(0, 8)}`}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground truncate">
                                  {call.summary || "Kein Zusammenfassung"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(call.startedAt ?? call.createdAt).toLocaleString("de-DE")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {call.outcome && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                >
                                  {call.outcome.replace(/-/g, " ")}
                                </Badge>
                              )}
                              {call.duration != null && (
                                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                  {formatDuration(call.duration)}
                                </span>
                              )}
                              <Badge
                                className={cn(
                                  "text-[10px] px-1.5 py-0 border-0",
                                  call.status === "completed" ? "bg-green-100 text-green-700" :
                                  call.status === "failed" ? "bg-red-100 text-red-700" :
                                  call.status === "in-progress" ? "bg-orange-100 text-orange-700" :
                                  "bg-muted text-muted-foreground"
                                )}
                              >
                                {call.status}
                              </Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
