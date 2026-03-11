"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Input } from "components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Users,
  Trash2,
  Loader2,
  Play,
  Pause,
  CheckCircle2,
} from "lucide-react";
import { toast } from "components/toast/use-toast";
import { cn } from "lib/utils";
import {
  fetchBatches,
  fetchAgents,
  createBatch,
  updateBatch,
  deleteBatch,
  type BatchDTO,
  type AgentDTO,
} from "@/lib/api-client";

const statusLabels: Record<BatchDTO["status"], string> = {
  pending: "Ausstehend",
  running: "Aktiv",
  paused: "Pausiert",
  completed: "Abgeschlossen",
};

function batchStatusBadge(status: BatchDTO["status"]) {
  const variants: Record<BatchDTO["status"], string> = {
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

function defaultBatchName() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `batch-${yyyy}-${mm}-${dd}`;
}

export default function SchedulerPage() {
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [agents, setAgents] = useState<AgentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [batchName, setBatchName] = useState(defaultBatchName());
  const [selectedAgentId, setSelectedAgentId] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  async function loadData() {
    try {
      const [batchRes, agentRes] = await Promise.all([
        fetchBatches({ limit: 100 }),
        fetchAgents(),
      ]);
      setBatches(batchRes.data);
      setAgents(agentRes.data);
      const defaultAgent = agentRes.data.find((a) => a.isDefault);
      if (defaultAgent) setSelectedAgentId(defaultAgent.id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate() {
    if (!batchName.trim()) {
      toast({ title: "Name ist erforderlich", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await createBatch({
        name: batchName.trim(),
        contactIds: [],
        calliAgentId: selectedAgentId !== "none" ? selectedAgentId : undefined,
      });
      setBatches((prev) => [res.data, ...prev]);
      setBatchName(defaultBatchName());
      const defaultAgent = agents.find((a) => a.isDefault);
      setSelectedAgentId(defaultAgent?.id ?? "none");
      setPopoverOpen(false);
      toast({ title: "Stapel erstellt", description: `"${res.data.name}"` });
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Stapel "${name}" löschen?`)) return;
    try {
      await deleteBatch(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Stapel gelöscht" });
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    }
  }

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Stapel
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Anrufstapel verwalten
                </p>
              </div>

              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Neuer Stapel
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Neuen Stapel erstellen</p>
                    <Input
                      placeholder="Stapelname"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                    <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                      <SelectTrigger>
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
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPopoverOpen(false)}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreate}
                        disabled={creating}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {creating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Erstellen
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Batch Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Laden...
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Noch keine Stapel vorhanden. Erstellen Sie Ihren ersten Stapel.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Kontakte</TableHead>
                      <TableHead>Fortschritt</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Aktionen</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const progress =
                        batch.totalCalls > 0
                          ? (batch.completedCalls / batch.totalCalls) * 100
                          : 0;

                      return (
                        <TableRow key={batch.id} className="group">
                          <TableCell className="font-medium">
                            <Link
                              href={`/scheduler/${batch.id}`}
                              className="text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              {batch.name}
                            </Link>
                          </TableCell>
                          <TableCell>{batchStatusBadge(batch.status)}</TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1 text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {batch.totalCalls}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
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
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {batch.completedCalls}/{batch.totalCalls}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(batch.createdAt).toLocaleDateString("de-DE")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(batch.status === "pending" || batch.status === "paused") && (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await updateBatch(batch.id, { status: "running" });
                                    setBatches((prev) => prev.map((b) => b.id === batch.id ? { ...b, status: "running" } : b));
                                    toast({ title: batch.status === "paused" ? "Stapel fortgesetzt" : "Stapel gestartet" });
                                  }}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  {batch.status === "paused" ? "Fortsetzen" : "Starten"}
                                </Button>
                              )}
                              {batch.status === "running" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    await updateBatch(batch.id, { status: "paused" });
                                    setBatches((prev) => prev.map((b) => b.id === batch.id ? { ...b, status: "paused" } : b));
                                    toast({ title: "Stapel pausiert" });
                                  }}
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Pausieren
                                </Button>
                              )}
                              {batch.status === "completed" && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Fertig
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(batch.id, batch.name);
                              }}
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
            )}
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
