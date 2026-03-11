"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import {
  fetchContact, updateContact as apiUpdateContact, deleteContact as apiDeleteContact,
  fetchCustomProperties,
  type ContactDTO, type CustomPropertyDTO,
} from "@/lib/api-client";
import {
  getCallRecords,
  addCallRecord,
  generateId,
} from "@/lib/store";
import { cn, formatPhoneDisplay } from "@/lib/utils";
import type { CallRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  CalendarCheck,
  PhoneForwarded,
  Pencil,
  Trash2,
  User,
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
  ringing: "Klingelt",
  "in-progress": "Läuft",
  completed: "Abgeschlossen",
  failed: "Fehlgeschlagen",
  transferred: "Weitergeleitet",
};

// ---- Formatting helpers ----

function formatDate(dateStr?: string) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("de-DE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds?: number) {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ---- Timeline event type ----

interface TimelineEvent {
  id: string;
  date: string;
  type: "call" | "meeting" | "callback";
  label: string;
  detail?: string;
}

function buildTimeline(records: CallRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const r of records) {
    events.push({
      id: r.id,
      date: r.startedAt ?? r.createdAt ?? new Date().toISOString(),
      type: "call",
      label: `Anruf - ${callStatusLabels[r.status] || r.status}`,
      detail: r.outcome
        ? outcomeLabels[r.outcome] || r.outcome
        : undefined,
    });

    if (r.meetingBooked && r.meetingDate) {
      events.push({
        id: `${r.id}-meeting`,
        date: r.meetingDate,
        type: "meeting",
        label: "Termin vereinbart",
        detail: `Geplant für ${formatDateTime(r.meetingDate)}`,
      });
    }

    if (r.outcome === "callback-requested") {
      events.push({
        id: `${r.id}-callback`,
        date: r.startedAt ?? r.createdAt ?? new Date().toISOString(),
        type: "callback",
        label: "Rückruf erbeten",
        detail: r.summary || undefined,
      });
    }
  }

  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return events;
}

// ---- Component ----

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const contactId = params.id as string;

  const [contact, setContact] = useState<ContactDTO | undefined>(undefined);
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(
    null
  );
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [editData, setEditData] = useState<Partial<ContactDTO>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [customProps, setCustomProps] = useState<CustomPropertyDTO[]>([]);

  // Load data
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
    setRecords(getCallRecords(contactId));
  }, [contactId]);

  async function reload() {
    try {
      const res = await fetchContact(contactId);
      setContact(res.data);
      setEditData(res.data);
    } catch {}
    setRecords(getCallRecords(contactId));
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
    const record: CallRecord = {
      id: generateId(),
      contactId,
      startedAt: new Date().toISOString(),
      status: "ringing",
      outcome: "callback-requested",
      summary: "Rückruf geplant",
    };
    addCallRecord(record);
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
    const record: CallRecord = {
      id: generateId(),
      contactId,
      startedAt: new Date().toISOString(),
      status: "completed",
      outcome: "meeting-booked",
      meetingBooked: true,
      meetingDate: new Date(meetingDate).toISOString(),
      summary: `Termin vereinbart für ${formatDateTime(new Date(meetingDate).toISOString())}`,
    };
    addCallRecord(record);
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

  const timeline = buildTimeline(records);

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

            {/* Two-column layout: Call History + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Call History - takes 2 columns */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-orange-500" />
                      Anrufverlauf
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {records.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Phone className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">
                          Noch keine Anrufeinträge für diesen Kontakt.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {records
                          .sort(
                            (a, b) =>
                              new Date(b.startedAt ?? b.createdAt ?? 0).getTime() -
                              new Date(a.startedAt ?? a.createdAt ?? 0).getTime()
                          )
                          .map((record) => (
                            <div
                              key={record.id}
                              className="border rounded-lg p-4"
                            >
                              {/* Call record header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                                      record.status === "completed"
                                        ? "bg-green-100"
                                        : record.status === "failed"
                                          ? "bg-red-100"
                                          : "bg-orange-100"
                                    )}
                                  >
                                    <Phone
                                      className={cn(
                                        "h-4 w-4",
                                        record.status === "completed"
                                          ? "text-green-600"
                                          : record.status === "failed"
                                            ? "text-red-600"
                                            : "text-orange-600"
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {formatDateTime(record.startedAt ?? record.createdAt ?? new Date().toISOString())}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Dauer:{" "}
                                      {formatDuration(record.duration)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      record.status === "completed"
                                        ? "bg-green-100 text-green-800 border-green-200"
                                        : record.status === "failed"
                                          ? "bg-red-100 text-red-800 border-red-200"
                                          : "bg-orange-100 text-orange-800 border-orange-200"
                                    )}
                                  >
                                    {callStatusLabels[record.status] ||
                                      record.status}
                                  </Badge>
                                  {record.outcome && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {outcomeLabels[record.outcome] ||
                                        record.outcome}
                                    </Badge>
                                  )}
                                  {record.meetingBooked && (
                                    <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                      Termin vereinbart
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Summary */}
                              {record.summary && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {record.summary}
                                </p>
                              )}

                              {/* Meeting date */}
                              {record.meetingDate && (
                                <div className="flex items-center gap-1.5 text-sm text-green-700 mt-2">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Termin:{" "}
                                  {formatDateTime(record.meetingDate)}
                                </div>
                              )}

                              {/* Expandable transcript */}
                              {record.transcript && (
                                <div className="mt-3">
                                  <button
                                    onClick={() =>
                                      setExpandedTranscript(
                                        expandedTranscript === record.id
                                          ? null
                                          : record.id
                                      )
                                    }
                                    className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                                  >
                                    {expandedTranscript === record.id ? (
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                    {expandedTranscript === record.id
                                      ? "Transkript ausblenden"
                                      : "Transkript anzeigen"}
                                  </button>
                                  {expandedTranscript === record.id && (
                                    <div className="mt-2 bg-muted/50 rounded-md p-3 text-sm text-muted-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                      {record.transcript}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline - takes 1 column */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      Zeitverlauf
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timeline.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <Clock className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Noch keine Ereignisse.</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                        <div className="space-y-6">
                          {timeline.map((event, idx) => (
                            <div
                              key={event.id}
                              className="relative flex items-start gap-4 pl-1"
                            >
                              {/* Icon dot */}
                              <div
                                className={cn(
                                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background",
                                  event.type === "call"
                                    ? "bg-orange-100"
                                    : event.type === "meeting"
                                      ? "bg-green-100"
                                      : "bg-purple-100"
                                )}
                              >
                                {event.type === "call" && (
                                  <PhoneCall
                                    className="h-3.5 w-3.5 text-orange-600"
                                  />
                                )}
                                {event.type === "meeting" && (
                                  <Calendar
                                    className="h-3.5 w-3.5 text-green-600"
                                  />
                                )}
                                {event.type === "callback" && (
                                  <Clock
                                    className="h-3.5 w-3.5 text-purple-600"
                                  />
                                )}
                              </div>

                              {/* Event content */}
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm font-medium leading-tight">
                                  {event.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDateTime(event.date)}
                                </p>
                                {event.detail && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {event.detail}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
