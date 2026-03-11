"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Input } from "components/ui/input";
import { Checkbox } from "components/ui/checkbox";
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
import {
  ArrowLeft,
  Phone,
  Users,
  Calendar,
  PhoneOff,
  CheckCircle2,
  Bot,
  Search,
  Plus,
  Loader2,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn, formatPhoneDisplay } from "lib/utils";
import { toast } from "components/toast/use-toast";
import {
  fetchBatch,
  updateBatch,
  fetchCalls,
  fetchContacts,
  fetchAgents,
  deleteCall,
  type BatchDetailDTO,
  type CallDTO,
  type ContactDTO,
  type AgentDTO,
} from "@/lib/api-client";

const PAGE_SIZE = 10;

const statusLabels: Record<BatchDetailDTO["status"], string> = {
  pending: "Ausstehend",
  running: "Aktiv",
  paused: "Pausiert",
  completed: "Abgeschlossen",
};

function batchStatusBadge(status: BatchDetailDTO["status"]) {
  const variants: Record<BatchDetailDTO["status"], string> = {
    pending: "bg-muted text-muted-foreground",
    running: "bg-orange-500 text-white",
    paused: "bg-yellow-500 text-white",
    completed: "bg-green-500 text-white",
  };
  return (
    <Badge className={cn("capitalize", variants[status])}>
      {statusLabels[status]}
    </Badge>
  );
}

function contactStatusVariant(status: string): string {
  const variants: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-orange-100 text-orange-800",
    scheduled: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    "no-answer": "bg-gray-100 text-gray-800",
    callback: "bg-yellow-100 text-yellow-800",
  };
  return variants[status] ?? "bg-muted text-muted-foreground";
}

function callStatusBadge(status: CallDTO["status"]) {
  const variants: Record<CallDTO["status"], string> = {
    planned: "bg-blue-100 text-blue-800",
    ringing: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    transferred: "bg-purple-100 text-purple-800",
  };
  const labels: Record<CallDTO["status"], string> = {
    planned: "Geplant",
    ringing: "Klingelt",
    "in-progress": "Aktiv",
    completed: "Abgeschlossen",
    failed: "Fehlgeschlagen",
    transferred: "Weitergeleitet",
  };
  return <Badge className={cn(variants[status])}>{labels[status]}</Badge>;
}

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchDetailDTO | null>(null);
  const [calls, setCalls] = useState<CallDTO[]>([]);
  const [agents, setAgents] = useState<AgentDTO[]>([]);
  const [contactMap, setContactMap] = useState<Map<string, ContactDTO>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Batch contacts table pagination
  const [batchPage, setBatchPage] = useState(1);

  // Add contacts state
  const [allContacts, setAllContacts] = useState<ContactDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addPage, setAddPage] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [batchRes, callsRes, agentsRes, contactsRes] = await Promise.all([
        fetchBatch(batchId),
        fetchCalls({ batchId, limit: 100 }),
        fetchAgents(),
        fetchContacts({ limit: 100 }),
      ]);
      setBatch(batchRes.data);
      setCalls(callsRes.data);
      setAgents(agentsRes.data);
      setAllContacts(contactsRes.data);

      const map = new Map<string, ContactDTO>();
      for (const c of contactsRes.data) {
        map.set(c.id, c);
      }
      setContactMap(map);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats computed from calls
  const stats = useMemo(() => {
    const total = calls.length;
    const completed = calls.filter((c) =>
      ["completed", "failed", "transferred"].includes(c.status)
    ).length;
    const meetingsBooked = calls.filter(
      (c) => c.outcome === "meeting-booked"
    ).length;
    const noAnswer = calls.filter((c) => c.outcome === "no-answer").length;
    return { total, completed, meetingsBooked, noAnswer };
  }, [calls]);

  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  // Existing contact IDs in batch
  const batchContactIds = useMemo(
    () => new Set(calls.map((c) => c.contactId)),
    [calls]
  );

  // Paginated batch calls
  const batchTotalPages = Math.max(1, Math.ceil(calls.length / PAGE_SIZE));
  const paginatedCalls = useMemo(() => {
    const start = (batchPage - 1) * PAGE_SIZE;
    return calls.slice(start, start + PAGE_SIZE);
  }, [calls, batchPage]);

  // Filtered contacts for add table (exclude already in batch)
  const filteredAddContacts = useMemo(() => {
    return allContacts.filter((c) => {
      if (batchContactIds.has(c.id)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!searchQuery) return true;
      return `${c.firstName} ${c.lastName} ${c.phone} ${c.email ?? ""} ${c.company ?? ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });
  }, [allContacts, searchQuery, statusFilter, batchContactIds]);

  const addTotalPages = Math.max(1, Math.ceil(filteredAddContacts.length / PAGE_SIZE));
  const paginatedAddContacts = useMemo(() => {
    const start = (addPage - 1) * PAGE_SIZE;
    return filteredAddContacts.slice(start, start + PAGE_SIZE);
  }, [filteredAddContacts, addPage]);

  // Reset add page when filters change
  useEffect(() => {
    setAddPage(1);
  }, [searchQuery, statusFilter]);

  const allFilteredSelected =
    filteredAddContacts.length > 0 &&
    filteredAddContacts.every((c) => selectedIds.has(c.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const newSet = new Set(selectedIds);
      filteredAddContacts.forEach((c) => newSet.delete(c.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredAddContacts.forEach((c) => newSet.add(c.id));
      setSelectedIds(newSet);
    }
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  async function handleAddContacts() {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      const response = await fetch(`/api/batches/${batchId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      toast({
        title: "Kontakte hinzugefügt",
        description: `${selectedIds.size} Kontakt${selectedIds.size !== 1 ? "e" : ""} zum Stapel hinzugefügt.`,
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveCall(callId: string) {
    try {
      await deleteCall(callId);
      toast({ title: "Kontakt entfernt" });
      await loadData();
    } catch {
      toast({ title: "Fehler beim Entfernen", variant: "destructive" });
    }
  }

  async function handleAgentChange(agentId: string) {
    if (!batch) return;
    try {
      const res = await updateBatch(batchId, {
        calliAgentId: agentId === "none" ? undefined : agentId,
      });
      setBatch((prev) => prev ? { ...prev, ...res.data } : prev);
      toast({ title: "Agent zugewiesen" });
    } catch {
      toast({ title: "Fehler beim Zuweisen", variant: "destructive" });
    }
  }

  async function handleStatusChange(newStatus: BatchDetailDTO["status"]) {
    try {
      const res = await updateBatch(batchId, { status: newStatus });
      setBatch((prev) => prev ? { ...prev, ...res.data } : prev);
      toast({ title: `Status: ${statusLabels[newStatus]}` });
    } catch {
      toast({ title: "Fehler", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <SidebarLayout defaultOpen={true}>
        <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500 mr-2" />
            <span className="text-muted-foreground">Laden...</span>
          </div>
        </main>
      </SidebarLayout>
    );
  }

  if (notFound || !batch) {
    return (
      <SidebarLayout defaultOpen={true}>
        <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
          <div className="px-2 md:px-6 pt-4 pb-8">
            <div className="max-w-[1800px] mx-auto flex flex-col items-center py-20 space-y-4">
              <PhoneOff className="h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-muted-foreground">
                Stapel nicht gefunden
              </h2>
              <Link href="/scheduler">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </SidebarLayout>
    );
  }

  const currentAgent = agents.find((a) => a.id === batch.calliAgentId);

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Back */}
            <Link href="/scheduler">
              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Alle Stapel
              </Button>
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-primary">
                  {batch.name}
                </h1>
                {batchStatusBadge(batch.status)}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={batch.status}
                  onValueChange={(value) => handleStatusChange(value as BatchDetailDTO["status"])}
                >
                  <SelectTrigger className="w-[180px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        Ausstehend
                      </span>
                    </SelectItem>
                    <SelectItem value="running">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Aktiv
                      </span>
                    </SelectItem>
                    <SelectItem value="paused">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Pausiert
                      </span>
                    </SelectItem>
                    <SelectItem value="completed">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Abgeschlossen
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Fortschritt</span>
                <span>{stats.completed} / {stats.total} Anrufe</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    batch.status === "completed"
                      ? "bg-green-500"
                      : batch.status === "running"
                        ? "bg-orange-500"
                        : batch.status === "paused"
                          ? "bg-yellow-500"
                          : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-orange-100 dark:bg-orange-950/40 p-2">
                      <Users className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Kontakte</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-950/40 p-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Abgeschlossen</p>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 dark:bg-green-950/40 p-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Termine</p>
                      <p className="text-2xl font-bold">{stats.meetingsBooked}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-2">
                      <PhoneOff className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Keine Antwort</p>
                      <p className="text-2xl font-bold">{stats.noAnswer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agent Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-5 w-5" />
                  Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Select
                    value={batch.calliAgentId ?? "none"}
                    onValueChange={handleAgentChange}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Agent auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Agent</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}{agent.isDefault ? " (Standard)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentAgent && (
                    <span className="text-xs text-muted-foreground">
                      ID: {currentAgent.agentId.slice(0, 20)}...
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Table 1: Contacts in Batch */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-5 w-5" />
                  Kontakte im Stapel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calls.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Noch keine Kontakte. Fügen Sie Kontakte unten hinzu.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Ergebnis</TableHead>
                            <TableHead className="hidden lg:table-cell">Zusammenfassung</TableHead>
                            <TableHead className="w-[50px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCalls.map((call) => {
                            const contact = contactMap.get(call.contactId);
                            return (
                              <TableRow key={call.id}>
                                <TableCell className="font-medium">
                                  {contact ? (
                                    <Link
                                      href={`/contacts/${contact.id}`}
                                      className="flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:underline"
                                    >
                                      {contact.firstName} {contact.lastName}
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {call.contactId.slice(0, 8)}...
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {contact ? formatPhoneDisplay(contact.phone) : "-"}
                                </TableCell>
                                <TableCell>{callStatusBadge(call.status)}</TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                  {call.outcome ?? "-"}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell max-w-[250px]">
                                  <span className="line-clamp-1 text-sm text-muted-foreground">
                                    {call.summary ?? "-"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                    onClick={() => handleRemoveCall(call.id)}
                                    title="Aus Stapel entfernen"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {calls.length} Anruf{calls.length !== 1 ? "e" : ""} im Stapel
                      </p>
                      {batchTotalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={batchPage <= 1}
                            onClick={() => setBatchPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-xs text-muted-foreground px-2">
                            {batchPage} / {batchTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={batchPage >= batchTotalPages}
                            onClick={() => setBatchPage((p) => p + 1)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Table 2: Add Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-5 w-5" />
                  Kontakte hinzufügen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nach Name, Telefon, E-Mail, Firma suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="new">Neu</SelectItem>
                      <SelectItem value="contacted">Kontaktiert</SelectItem>
                      <SelectItem value="scheduled">Geplant</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                      <SelectItem value="no-answer">Keine Antwort</SelectItem>
                      <SelectItem value="callback">Rückruf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                <div className="rounded-xl border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Alle auswählen"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead className="hidden md:table-cell">E-Mail</TableHead>
                        <TableHead className="hidden md:table-cell">Firma</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAddContacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Keine weiteren Kontakte verfügbar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedAddContacts.map((contact) => (
                          <TableRow
                            key={contact.id}
                            className={cn(
                              "cursor-pointer",
                              selectedIds.has(contact.id) && "bg-orange-50 dark:bg-orange-950/20"
                            )}
                            onClick={() => toggleSelect(contact.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(contact.id)}
                                onCheckedChange={() => toggleSelect(contact.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${contact.firstName} ${contact.lastName} auswählen`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </TableCell>
                            <TableCell>{formatPhoneDisplay(contact.phone)}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {contact.email ?? "-"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {contact.company ?? "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-[11px]", contactStatusVariant(contact.status))}>
                                {contact.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer with pagination and add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                      {filteredAddContacts.length} Kontakt{filteredAddContacts.length !== 1 ? "e" : ""} verfügbar
                      {selectedIds.size > 0 && ` · ${selectedIds.size} ausgewählt`}
                    </p>
                    {addTotalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={addPage <= 1}
                          onClick={() => setAddPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                          {addPage} / {addTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={addPage >= addTotalPages}
                          onClick={() => setAddPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAddContacts}
                    disabled={selectedIds.size === 0 || adding}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {adding && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    {selectedIds.size} Kontakt{selectedIds.size !== 1 ? "e" : ""} hinzufügen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
