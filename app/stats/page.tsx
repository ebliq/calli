"use client";

import { useMemo, useState, useEffect } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { getCallRecords } from "@/lib/store";
import { fetchContacts, type ContactDTO } from "@/lib/api-client";
import { CallRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Users,
  Phone,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react";

const CHART_COLORS = [
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
];

export default function StatsPage() {
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);

  useEffect(() => {
    fetchContacts({ limit: 100 }).then((res) => setContacts(res.data)).catch(() => {});
    setCallRecords(getCallRecords());
  }, []);

  const totalContacts = contacts.length;
  const totalCalls = callRecords.length;

  const meetingsBooked = useMemo(
    () => callRecords.filter((r) => r.meetingBooked === true).length,
    [callRecords]
  );

  const avgDuration = useMemo(() => {
    const withDuration = callRecords.filter(
      (r) => r.duration !== undefined && r.duration > 0
    );
    if (withDuration.length === 0) return 0;
    const total = withDuration.reduce((sum, r) => sum + (r.duration ?? 0), 0);
    return Math.round(total / withDuration.length);
  }, [callRecords]);

  const outcomeData = useMemo(() => {
    const outcomes: Record<string, number> = {};
    for (const r of callRecords) {
      const key = r.outcome ?? "unknown";
      outcomes[key] = (outcomes[key] || 0) + 1;
    }
    return Object.entries(outcomes).map(([name, value]) => ({
      name: name
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }));
  }, [callRecords]);

  const callsOverTime = useMemo(() => {
    const now = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = callRecords.filter(
        (r) => (r.startedAt ?? r.createdAt ?? "").split("T")[0] === dateStr
      ).length;
      days.push({
        date: d.toLocaleDateString("de-DE", {
          month: "short",
          day: "numeric",
        }),
        count,
      });
    }
    return days;
  }, [callRecords]);

  const contactStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    for (const c of contacts) {
      statuses[c.status] = (statuses[c.status] || 0) + 1;
    }
    return Object.entries(statuses).map(([name, value]) => ({
      name: name
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
    }));
  }, [contacts]);

  const topPerformers = useMemo(() => {
    const contactCallMap = new Map<
      string,
      { contact: ContactDTO; callCount: number; meetings: number }
    >();

    for (const contact of contacts) {
      contactCallMap.set(contact.id, {
        contact,
        callCount: 0,
        meetings: 0,
      });
    }

    for (const record of callRecords) {
      const entry = contactCallMap.get(record.contactId);
      if (entry) {
        entry.callCount += 1;
        if (record.meetingBooked) entry.meetings += 1;
      }
    }

    return Array.from(contactCallMap.values())
      .filter((e) => e.callCount > 0)
      .sort((a, b) => b.meetings - a.meetings || b.callCount - a.callCount)
      .slice(0, 10);
  }, [contacts, callRecords]);

  const hasData = totalContacts > 0 || totalCalls > 0;

  function formatDuration(seconds: number): string {
    if (seconds === 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  if (!hasData) {
    return (
      <SidebarLayout defaultOpen={true}>
        <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
          <div className="px-2 md:px-6 pt-4 pb-8">
            <div className="max-w-[1800px] mx-auto">
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="rounded-full bg-muted p-6">
                  <BarChart3 className="h-12 w-12 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Noch keine Statistiken
                </h1>
                <p className="text-muted-foreground text-center max-w-md">
                  Importieren Sie Kontakte und führen Sie Anrufe durch, um hier Statistiken zu sehen.
                </p>
              </div>
            </div>
          </div>
        </main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Statistiken</h1>
              <p className="text-muted-foreground">
                Analysen und Einblicke in Ihre Callcenter-Aktivitäten.
              </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Kontakte gesamt
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalContacts}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Anrufe gesamt
                  </CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCalls}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Termine vereinbart
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{meetingsBooked}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ø Anrufdauer
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(avgDuration)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Call Outcomes Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anrufergebnisse</CardTitle>
                  <CardDescription>
                    Verteilung der Anrufergebnisse
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {outcomeData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={outcomeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                            label={(props: any) =>
                              `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                            }
                          >
                            {outcomeData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  CHART_COLORS[index % CHART_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Noch keine Anrufergebnis-Daten.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Kontakt-Statusverteilung
                  </CardTitle>
                  <CardDescription>
                    Kontakte gruppiert nach aktuellem Status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contactStatusData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={contactStatusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                            label={(props: any) =>
                              `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                            }
                          >
                            {contactStatusData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  CHART_COLORS[index % CHART_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Noch keine Kontaktdaten.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Calls Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Anrufe im Zeitverlauf</CardTitle>
                <CardDescription>
                  Anzahl der Anrufe in den letzten 7 Tagen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={callsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        name="Anrufe"
                        fill="#F97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top-Performer
                </CardTitle>
                <CardDescription>
                  Kontakte mit den meisten Anrufen und vereinbarten Terminen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kontakt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Anrufe</TableHead>
                        <TableHead className="text-right">
                          Termine vereinbart
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPerformers.map(({ contact, callCount, meetings }) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                contact.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {contact.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {callCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {meetings}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Noch keine Anrufdaten. Führen Sie Anrufe durch, um Top-Performer zu sehen.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
