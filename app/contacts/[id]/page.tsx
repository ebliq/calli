"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import {
  fetchContact,
  updateContact as apiUpdateContact,
  deleteContact as apiDeleteContact,
  fetchCustomProperties,
  fetchCalls,
  fetchCall,
  type ContactDTO,
  type CustomPropertyDTO,
  type CallDTO,
  type CallDetailDTO,
} from "@/lib/api-client";
import { cn, formatPhoneDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "components/toast/use-toast";
import { ContactForm } from "@/components/contacts/contact-form";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  StickyNote,
  Calendar,
  PhoneCall,
  CalendarCheck,
  Pencil,
  Trash2,
  User,
  ChevronRight,
} from "lucide-react";

// ---- Status helpers ----

const statusColors: Record<ContactDTO["status"], string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-orange-100 text-orange-800 border-orange-200",
  scheduled: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  "no-answer": "bg-red-100 text-red-800 border-red-200",
  callback: "bg-purple-100 text-purple-800 border-purple-200",
};

const statusLabels: Record<ContactDTO["status"], string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  scheduled: "Geplant",
  completed: "Abgeschlossen",
  "no-answer": "Keine Antwort",
  callback: "Rückruf",
};

const outcomeLabels: Record<string, string> = {
  answered: "Angenommen",
  "no-answer": "Keine Antwort",
  voicemail: "Mailbox",
  busy: "Besetzt",
  "meeting-booked": "Termin vereinbart",
  "callback-requested": "Rückruf erbeten",
};

const callStatusLabels: Record<string, string> = {
  planned: "Geplant",
  ringing: "Klingelt",
  "in-progress": "Läuft",
  completed: "Abgeschlossen",
  failed: "Fehlgeschlagen",
  transferred: "Weitergeleitet",
};

const callStatusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 border-blue-200",
  ringing: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "in-progress": "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  transferred: "bg-purple-100 text-purple-800 border-purple-200",
};

// ---- Formatting helpers ----

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("de-DE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCallTime(secs?: number) {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + "…";
}

// ---- Component ----

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const contactId = params.id as string;

  const [contact, setContact] = useState<ContactDTO | undefined>(undefined);
  const [calls, setCalls] = useState<CallDTO[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [editData, setEditData] = useState<Partial<ContactDTO>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [customProps, setCustomProps] = useState<CustomPropertyDTO[]>([]);

  // Call detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load data
  const loadCalls = useCallback(async () => {
    try {
      const callsRes = await fetchCalls({ contactId, limit: 100 });
      setCalls(callsRes.data);
    } catch {
      setCalls([]);
    }
  }, [contactId]);

  useEffect(() => {
    async function load() {
      try {
        const [contactRes, propsRes] = await Promise.all([
          fetchContact(contactId),
          fetchCustomProperties(),
        ]);
        setContact(contactRes.data);
        setEditData(contactRes.data);
        setCustomProps(propsRes.data);
      } catch {
        setContact(undefined);
      }
    }
    load();
    loadCalls();
  }, [contactId, loadCalls]);

  async function reload() {
    try {
      const res = await fetchContact(contactId);
      setContact(res.data);
      setEditData(res.data);
    } catch {}
    await loadCalls();
  }

  async function handleSaveEdit() {
    try {
      await apiUpdateContact(contactId, editData);
      await reload();
      setHasChanges(false);
      toast({ title: "Kontakt aktualisiert" });
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
  }

  function handleEditChange(updates: Partial<ContactDTO>) {
    setEditData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }

  function handleDiscardChanges() {
    if (contact) setEditData(contact);
    setHasChanges(false);
  }

  async function handleDelete() {
    if (!window.confirm("Kontakt und alle zugehörigen Anrufe endgültig löschen?")) return;
    try {
      await apiDeleteContact(contactId);
      toast({ title: "Kontakt gelöscht" });
      router.push("/contacts");
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    }
  }

  async function handleStatusChange(newStatus: ContactDTO["status"]) {
    try {
      await apiUpdateContact(contactId, { status: newStatus });
      await reload();
      toast({ title: "Status aktualisiert", description: `Status auf ${statusLabels[newStatus]} gesetzt.` });
    } catch {
      toast({ title: "Fehler beim Aktualisieren", variant: "destructive" });
    }
  }

  async function handleScheduleCall() {
    try {
      await apiUpdateContact(contactId, {
        status: "scheduled",
        nextScheduledCall: new Date().toISOString(),
        lastContactDate: new Date().toISOString(),
      });
    } catch {}
    await reload();
    setScheduleDialogOpen(false);
    toast({ title: "Anruf geplant", description: "Ein Rückruf wurde für diesen Kontakt geplant." });
  }

  async function handleBookMeeting() {
    if (!meetingDate) return;
    try {
      await apiUpdateContact(contactId, {
        status: "scheduled",
        lastContactDate: new Date().toISOString(),
      });
    } catch {}
    await reload();
    setMeetingDialogOpen(false);
    setMeetingDate("");
    toast({ title: "Termin gebucht", description: `Termin geplant für ${formatDate(new Date(meetingDate).toISOString())}.` });
  }

  async function openCallDetail(callId: string) {
    setDetailDialogOpen(true);
    setLoadingDetail(true);
    setSelectedCall(null);
    try {
      const res = await fetchCall(callId);
      setSelectedCall(res.data as CallDetailDTO);
    } catch {
      toast({ title: "Fehler beim Laden der Anrufdetails", variant: "destructive" });
      setDetailDialogOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  }

  if (!contact) {
    return (
      <SidebarLayout defaultOpen={true}>
        <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
          <div className="px-2 md:px-6 pt-4 pb-8">
            <div className="max-w-[1800px] mx-auto">
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground">
                <User className="h-10 w-10 mb-3 opacity-40" />
                <p>Kontakt nicht gefunden.</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => router.push("/contacts")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück zu Kontakte
                </Button>
              </div>
            </div>
          </div>
        </main>
      </SidebarLayout>
    );
  }

  // Sort calls: newest first by startedAt or createdAt
  const sortedCalls = [...calls].sort((a, b) => {
    const dateA = new Date(a.startedAt || a.createdAt).getTime();
    const dateB = new Date(b.startedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto">
            {/* Back button */}
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => router.push("/contacts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zu Kontakte
            </Button>

            {/* Contact Info Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 shrink-0">
                      <User className="h-7 w-7 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {contact.firstName} {contact.lastName}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {formatPhoneDisplay(contact.phone)}
                        </span>
                        {contact.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </span>
                        )}
                        {contact.company && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {contact.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status selector & actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      className={cn(
                        "text-xs",
                        statusColors[contact.status]
                      )}
                    >
                      {statusLabels[contact.status]}
                    </Badge>
                    <Select
                      value={contact.status}
                      onValueChange={(v) =>
                        handleStatusChange(v as ContactDTO["status"])
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status ändern" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 mr-1" /> Löschen
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Notes */}
              {contact.notes && (
                <CardContent>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    <StickyNote className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{contact.notes}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Inline Editable Details */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Details
                  </CardTitle>
                  {hasChanges && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                        Verwerfen
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} className="bg-orange-500 hover:bg-orange-600 text-white">
                        Speichern
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ContactForm
                  contact={editData}
                  onChange={handleEditChange}
                  customProperties={customProps}
                />
              </CardContent>
            </Card>

            {/* Actions Row */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Dialog
                open={scheduleDialogOpen}
                onOpenChange={setScheduleDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <PhoneCall className="h-4 w-4 text-orange-500" />
                    Anruf planen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Anruf planen</DialogTitle>
                    <DialogDescription>
                      Rückruf für {contact.firstName}{" "}
                      {contact.lastName} planen. Dies erstellt einen Anrufeintrag und
                      aktualisiert den Kontaktstatus.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setScheduleDialogOpen(false)}
                    >
                      Abbrechen
                    </Button>
                    <Button onClick={handleScheduleCall}>
                      Planung bestätigen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog
                open={meetingDialogOpen}
                onOpenChange={setMeetingDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <CalendarCheck className="h-4 w-4" />
                    Termin buchen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Termin vereinbaren</DialogTitle>
                    <DialogDescription>
                      Termindatum für {contact.firstName}{" "}
                      {contact.lastName} festlegen. Dies erstellt einen Anrufeintrag mit
                      den Termindetails.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">
                      Datum & Uhrzeit
                    </label>
                    <Input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMeetingDialogOpen(false);
                        setMeetingDate("");
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleBookMeeting}
                      disabled={!meetingDate}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Termin buchen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Full-width Call History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-orange-500" />
                  Anrufverlauf
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Phone className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">
                      Noch keine Anrufeinträge für diesen Kontakt.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedCalls.map((call) => (
                      <button
                        key={call.id}
                        onClick={() => openCallDetail(call.id)}
                        className="w-full text-left border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                              call.status === "completed"
                                ? "bg-green-100"
                                : call.status === "failed"
                                  ? "bg-red-100"
                                  : call.status === "planned"
                                    ? "bg-blue-100"
                                    : "bg-orange-100"
                            )}
                          >
                            <Phone
                              className={cn(
                                "h-4 w-4",
                                call.status === "completed"
                                  ? "text-green-600"
                                  : call.status === "failed"
                                    ? "text-red-600"
                                    : call.status === "planned"
                                      ? "text-blue-600"
                                      : "text-orange-600"
                              )}
                            />
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <span className="text-sm font-medium">
                                {formatDateTime(call.startedAt || call.createdAt)}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    callStatusColors[call.status] || "bg-gray-100 text-gray-800 border-gray-200"
                                  )}
                                >
                                  {callStatusLabels[call.status] || call.status}
                                </Badge>
                                {call.outcome && (
                                  <Badge variant="outline" className="text-xs">
                                    {outcomeLabels[call.outcome] || call.outcome}
                                  </Badge>
                                )}
                                {call.duration != null && call.duration > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDuration(call.duration)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Summary snippet */}
                            {call.summary && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {truncate(call.summary, 80)}
                              </p>
                            )}
                            {/* Conversation ID */}
                            {call.conversationId && (
                              <span className="inline-block text-xs font-mono text-muted-foreground/70 mt-1">
                                {call.conversationId}
                              </span>
                            )}
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">Lade Anrufdetails...</p>
                  </div>
                ) : selectedCall ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-orange-500" />
                        Anrufdetails
                      </DialogTitle>
                      <DialogDescription>
                        {formatDateTime(selectedCall.startedAt || selectedCall.createdAt)}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 pt-2">
                      {/* Status row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs",
                            callStatusColors[selectedCall.status] || "bg-gray-100 text-gray-800 border-gray-200"
                          )}
                        >
                          {callStatusLabels[selectedCall.status] || selectedCall.status}
                        </Badge>
                        {selectedCall.outcome && (
                          <Badge variant="outline" className="text-xs">
                            {outcomeLabels[selectedCall.outcome] || selectedCall.outcome}
                          </Badge>
                        )}
                        {selectedCall.duration != null && selectedCall.duration > 0 && (
                          <span className="text-sm text-muted-foreground">
                            Dauer: {formatDuration(selectedCall.duration)}
                          </span>
                        )}
                        {selectedCall.conversationId && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {selectedCall.conversationId}
                          </Badge>
                        )}
                      </div>

                      {/* Summary */}
                      {selectedCall.summary && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Zusammenfassung</h4>
                          <p className="text-sm text-muted-foreground">{selectedCall.summary}</p>
                        </div>
                      )}

                      {/* ElevenLabs Transcript */}
                      {selectedCall.elevenLabsTranscript && selectedCall.elevenLabsTranscript.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Transkript</h4>
                          <div className="space-y-2 bg-muted/50 rounded-md p-3 max-h-[300px] overflow-y-auto">
                            {selectedCall.elevenLabsTranscript.map((entry, idx) => {
                              const isAgent = entry.role === "agent";
                              return (
                                <div key={idx} className="flex gap-2 text-sm">
                                  {entry.time_in_call_secs != null && (
                                    <span className="text-xs font-mono text-muted-foreground/60 shrink-0 pt-0.5 w-12 text-right">
                                      {formatCallTime(entry.time_in_call_secs)}
                                    </span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className={cn(
                                        "font-medium text-xs",
                                        isAgent ? "text-orange-600" : "text-green-600"
                                      )}
                                    >
                                      {isAgent ? "Agent" : "Kontakt"}:
                                    </span>{" "}
                                    <span className="text-muted-foreground">{entry.message}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : selectedCall.transcript ? (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Transkript</h4>
                          <pre className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto">
                            {selectedCall.transcript}
                          </pre>
                        </div>
                      ) : null}

                      {/* ElevenLabs Summary */}
                      {selectedCall.elevenLabsSummary && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">AI-Zusammenfassung</h4>
                          <p className="text-sm text-muted-foreground">{selectedCall.elevenLabsSummary}</p>
                        </div>
                      )}

                      {/* ElevenLabs Data Collection */}
                      {selectedCall.elevenLabsData && Object.keys(selectedCall.elevenLabsData).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Erhobene Daten</h4>
                          <div className="space-y-2">
                            {Object.entries(selectedCall.elevenLabsData).map(([key, entry]) => (
                              <div key={key} className="bg-muted/50 rounded-md p-2.5">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm font-medium">{key}:</span>
                                  <span className="text-sm text-muted-foreground">{entry.value}</span>
                                </div>
                                {entry.rationale && (
                                  <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
                                    {entry.rationale}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agent Notes */}
                      {selectedCall.agentNotes && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Agenten-Notizen</h4>
                          <p className="text-sm text-muted-foreground">{selectedCall.agentNotes}</p>
                        </div>
                      )}

                      {/* Meeting date */}
                      {selectedCall.meetingDate && (
                        <div className="flex items-center gap-1.5 text-sm text-green-700">
                          <Calendar className="h-3.5 w-3.5" />
                          Termin: {formatDateTime(selectedCall.meetingDate)}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
