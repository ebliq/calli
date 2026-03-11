"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Input } from "components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "components/ui/dialog";
import { toast } from "components/toast/use-toast";
import { cn } from "lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Users,
  X,
  Clock,
} from "lucide-react";
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  type AppointmentDTO,
} from "@/lib/api-client";

// ---- Helpers ----

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(d: Date): string {
  return `${d.getDate()}.`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const mMonth = MONTH_NAMES[monday.getMonth()];
  const sMonth = MONTH_NAMES[sunday.getMonth()];
  const year = sunday.getFullYear();
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}. - ${sunday.getDate()}. ${mMonth} ${year}`;
  }
  return `${monday.getDate()}. ${mMonth} - ${sunday.getDate()}. ${sMonth} ${year}`;
}

function timeToInputValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dateToInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---- Component ----

interface AttendeeInput {
  name: string;
  email: string;
}

interface AppointmentForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: AttendeeInput[];
  notes: string;
}

const emptyForm = (date?: Date, hour?: number): AppointmentForm => {
  const d = date ?? new Date();
  const h = hour ?? 9;
  const start = new Date(d);
  start.setHours(h, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  return {
    title: "",
    date: dateToInputDate(d),
    startTime: timeToInputValue(start),
    endTime: timeToInputValue(end),
    attendees: [],
    notes: "",
  };
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [form, setForm] = useState<AppointmentForm>(emptyForm());
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDTO | null>(null);
  const [saving, setSaving] = useState(false);

  // Attendee input
  const [newAttendeeName, setNewAttendeeName] = useState("");
  const [newAttendeeEmail, setNewAttendeeEmail] = useState("");

  const weekEnd = useMemo(() => {
    const end = addDays(weekStart, 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [weekStart]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const today = useMemo(() => new Date(), []);

  // ---- Data loading ----
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAppointments({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
        limit: 100,
      });
      setAppointments(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // ---- Navigation ----
  function goToPreviousWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }
  function goToNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }
  function goToToday() {
    setWeekStart(getMonday(new Date()));
  }

  // ---- Slot click ----
  function handleSlotClick(day: Date, hour: number) {
    setDialogMode("create");
    setSelectedAppt(null);
    setForm(emptyForm(day, hour));
    setNewAttendeeName("");
    setNewAttendeeEmail("");
    setDialogOpen(true);
  }

  // ---- Appointment click ----
  function handleAppointmentClick(appt: AppointmentDTO, e: React.MouseEvent) {
    e.stopPropagation();
    setDialogMode("view");
    setSelectedAppt(appt);
    const start = new Date(appt.startTime);
    const end = new Date(appt.endTime);
    setForm({
      title: appt.title,
      date: dateToInputDate(start),
      startTime: timeToInputValue(start),
      endTime: timeToInputValue(end),
      attendees: appt.attendees ?? [],
      notes: appt.notes ?? "",
    });
    setNewAttendeeName("");
    setNewAttendeeEmail("");
    setDialogOpen(true);
  }

  function handleEdit() {
    setDialogMode("edit");
  }

  // ---- Attendee management ----
  function addAttendee() {
    if (!newAttendeeName.trim() || !newAttendeeEmail.trim()) return;
    setForm((prev) => ({
      ...prev,
      attendees: [...prev.attendees, { name: newAttendeeName.trim(), email: newAttendeeEmail.trim() }],
    }));
    setNewAttendeeName("");
    setNewAttendeeEmail("");
  }

  function removeAttendee(idx: number) {
    setForm((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== idx),
    }));
  }

  // ---- Save ----
  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Titel ist erforderlich", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const startTime = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const endTime = new Date(`${form.date}T${form.endTime}:00`).toISOString();
      const payload = {
        title: form.title.trim(),
        startTime,
        endTime,
        attendees: form.attendees,
        notes: form.notes || undefined,
      };

      if (dialogMode === "create") {
        await createAppointment(payload);
        toast({ title: "Termin erstellt" });
      } else if (dialogMode === "edit" && selectedAppt) {
        await updateAppointment(selectedAppt.id, payload);
        toast({ title: "Termin aktualisiert" });
      }
      setDialogOpen(false);
      await loadAppointments();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // ---- Delete ----
  async function handleDelete() {
    if (!selectedAppt) return;
    if (!window.confirm(`Termin "${selectedAppt.title}" löschen?`)) return;
    try {
      await deleteAppointment(selectedAppt.id);
      toast({ title: "Termin gelöscht" });
      setDialogOpen(false);
      await loadAppointments();
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    }
  }

  // ---- Appointment positioning ----
  function getAppointmentsForDay(day: Date): AppointmentDTO[] {
    return appointments.filter((a) => {
      const start = new Date(a.startTime);
      return isSameDay(start, day);
    });
  }

  function getAppointmentStyle(appt: AppointmentDTO): React.CSSProperties {
    const start = new Date(appt.startTime);
    const end = new Date(appt.endTime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const gridStart = 7 * 60; // 7:00
    const topPx = ((startMinutes - gridStart) / 60) * 64; // 64px per hour row
    const heightPx = Math.max(((endMinutes - startMinutes) / 60) * 64, 20);
    return {
      position: "absolute",
      top: `${topPx}px`,
      height: `${heightPx}px`,
      left: "2px",
      right: "2px",
    };
  }

  // ---- Render ----
  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Kalender
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {formatWeekRange(weekStart)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Heute
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Laden...
              </div>
            ) : (
              <>
                {/* Desktop weekly view */}
                <div className="hidden md:block rounded-xl border overflow-auto bg-background">
                  <div className="min-w-[800px]">
                    {/* Column headers */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
                      <div className="p-2 text-xs text-muted-foreground" />
                      {weekDays.map((day, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center border-l text-sm font-medium",
                            isSameDay(day, today) && "bg-orange-50 text-orange-700"
                          )}
                        >
                          {DAY_NAMES[i]} {formatDate(day)}
                        </div>
                      ))}
                    </div>

                    {/* Time rows */}
                    <div className="relative">
                      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                        {HOURS.map((hour) => (
                          <div key={hour} className="contents">
                            {/* Time label */}
                            <div className="h-16 flex items-start justify-end pr-2 pt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {String(hour).padStart(2, "0")}:00
                              </span>
                            </div>
                            {/* Day cells */}
                            {weekDays.map((day, di) => (
                              <div
                                key={di}
                                className={cn(
                                  "h-16 border-l border-t cursor-pointer hover:bg-orange-50/40 transition-colors relative",
                                  hour >= 9 && hour < 17 && "bg-orange-50/30",
                                  isSameDay(day, today) && "bg-orange-50/20"
                                )}
                                onClick={() => handleSlotClick(day, hour)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Appointment overlays */}
                      <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] pointer-events-none">
                        <div />
                        {weekDays.map((day, di) => (
                          <div key={di} className="relative border-l">
                            {getAppointmentsForDay(day).map((appt) => (
                              <div
                                key={appt.id}
                                className="bg-orange-100 border border-orange-300 text-orange-800 rounded-md px-1.5 py-0.5 text-xs cursor-pointer hover:bg-orange-200 transition-colors overflow-hidden pointer-events-auto"
                                style={getAppointmentStyle(appt)}
                                onClick={(e) => handleAppointmentClick(appt, e)}
                              >
                                <div className="font-medium truncate">{appt.title}</div>
                                <div className="text-[10px] text-orange-600">
                                  {formatTime(new Date(appt.startTime))} - {formatTime(new Date(appt.endTime))}
                                </div>
                                {appt.attendees && appt.attendees.length > 0 && (
                                  <div className="flex items-center gap-0.5 text-[10px] text-orange-600">
                                    <Users className="h-2.5 w-2.5" />
                                    {appt.attendees.length}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile day-at-a-time view */}
                <div className="md:hidden space-y-4">
                  {weekDays.map((day, di) => {
                    const dayAppts = getAppointmentsForDay(day);
                    return (
                      <div
                        key={di}
                        className={cn(
                          "rounded-lg border p-3",
                          isSameDay(day, today) && "border-orange-300 bg-orange-50/30"
                        )}
                      >
                        <div className="font-medium text-sm mb-2">
                          {DAY_NAMES[di]} {day.getDate()}. {MONTH_NAMES[day.getMonth()]}
                        </div>
                        {dayAppts.length === 0 ? (
                          <button
                            className="text-xs text-muted-foreground hover:text-orange-600 transition-colors w-full text-left py-1"
                            onClick={() => handleSlotClick(day, 9)}
                          >
                            + Termin hinzufügen
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            {dayAppts.map((appt) => (
                              <button
                                key={appt.id}
                                className="w-full text-left bg-orange-100 border border-orange-300 text-orange-800 rounded-md px-2 py-1.5 text-xs"
                                onClick={(e) => handleAppointmentClick(appt, e)}
                              >
                                <div className="font-medium">{appt.title}</div>
                                <div className="text-orange-600">
                                  {formatTime(new Date(appt.startTime))} - {formatTime(new Date(appt.endTime))}
                                  {appt.attendees && appt.attendees.length > 0 && (
                                    <span className="ml-2">
                                      <Users className="h-2.5 w-2.5 inline" /> {appt.attendees.length}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                            <button
                              className="text-xs text-muted-foreground hover:text-orange-600 transition-colors w-full text-left py-1"
                              onClick={() => handleSlotClick(day, 9)}
                            >
                              + Termin hinzufügen
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Create / Edit / View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Neuer Termin"
                : dialogMode === "edit"
                  ? "Termin bearbeiten"
                  : "Termindetails"}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === "view" && selectedAppt ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Titel</div>
                <div className="text-sm">{selectedAppt.title}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Beginn</div>
                  <div className="text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(selectedAppt.startTime).toLocaleString("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Ende</div>
                  <div className="text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(selectedAppt.endTime).toLocaleString("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
              {selectedAppt.attendees && selectedAppt.attendees.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Teilnehmer ({selectedAppt.attendees.length})
                  </div>
                  <div className="space-y-1">
                    {selectedAppt.attendees.map((att, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {att.name}
                        </Badge>
                        <span className="text-muted-foreground">{att.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedAppt.notes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Notizen</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedAppt.notes}</div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Löschen
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleEdit}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Bearbeiten
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Titel *</label>
                <Input
                  placeholder="Terminname"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Date + Times */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Datum</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Beginn</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setForm((f) => {
                        // auto-adjust end time to be 30 min after start
                        const [h, m] = newStart.split(":").map(Number);
                        const endDate = new Date(2000, 0, 1, h, m + 30);
                        const newEnd = timeToInputValue(endDate);
                        return { ...f, startTime: newStart, endTime: newEnd };
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Ende</label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* Attendees */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Teilnehmer</label>
                {form.attendees.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {form.attendees.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1"
                      >
                        <span className="font-medium">{att.name}</span>
                        <span className="text-muted-foreground">{att.email}</span>
                        <button
                          className="ml-auto text-muted-foreground hover:text-red-600"
                          onClick={() => removeAttendee(i)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Name"
                    className="flex-1"
                    value={newAttendeeName}
                    onChange={(e) => setNewAttendeeName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                  />
                  <Input
                    placeholder="E-Mail"
                    className="flex-1"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={addAttendee}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Notizen</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Optionale Notizen..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {dialogMode === "create" ? "Erstellen" : "Speichern"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
