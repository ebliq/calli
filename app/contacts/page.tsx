"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import {
  fetchContacts, createContact as apiCreateContact,
  fetchCustomProperties,
  type ContactDTO, type CustomPropertyDTO,
} from "@/lib/api-client";
import { cn, formatPhoneDisplay, normalizePhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Eye, Users, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "@/components/toast/use-toast";
import { ContactForm } from "@/components/contacts/contact-form";

const ALL_STATUSES: ContactDTO["status"][] = ["new", "contacted", "scheduled", "completed", "no-answer", "callback"];

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

function ContactsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") as ContactDTO["status"] | null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactDTO["status"] | null>(statusParam);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<ContactDTO>>({});
  const [customProps, setCustomProps] = useState<CustomPropertyDTO[]>([]);
  const [contacts, setContacts] = useState<ContactDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);

  const loadContacts = useCallback(async () => {
    try {
      const [filtered, all] = await Promise.all([
        fetchContacts({
          search: search || undefined,
          status: statusFilter || undefined,
          page: currentPage,
          limit: pageSize,
        }),
        !statusFilter && !search ? Promise.resolve(null) : fetchContacts({ limit: 1 }),
      ]);
      setContacts(filtered.data);
      setTotal(filtered.total);
      if (!statusFilter && !search) {
        setTotalAll(filtered.total);
      } else if (all) {
        setTotalAll(all.total);
      }
    } catch (err) {
      console.error(err);
    }
  }, [search, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchCustomProperties().then(r => setCustomProps(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  async function handleCreateContact() {
    if (!newContact.firstName?.trim() || !newContact.lastName?.trim()) {
      toast({ title: "Vor- und Nachname sind erforderlich", variant: "destructive" });
      return;
    }
    if (!newContact.phone?.trim()) {
      toast({ title: "Telefonnummer ist erforderlich", variant: "destructive" });
      return;
    }
    try {
      await apiCreateContact({
        ...newContact,
        firstName: newContact.firstName!.trim(),
        lastName: newContact.lastName!.trim(),
        phone: normalizePhone(newContact.phone!.trim()),
        source: newContact.source || "manual",
        status: "new",
      } as ContactDTO);
      setNewContact({});
      setCreateOpen(false);
      loadContacts();
      toast({ title: "Kontakt erstellt" });
    } catch (err) {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function formatDate(dateStr?: string) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("de-DE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <SidebarLayout defaultOpen={true}>
      <main className="flex-1 pt-12 md:pt-0 pb-16 md:pb-0">
        <div className="px-2 md:px-6 pt-4 pb-8">
          <div className="max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shadow-sm">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Kontakte
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {total} von {totalAll} Kontakt
                    {totalAll !== 1 ? "en" : ""}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Kontakt erstellen
              </Button>
            </div>

            {/* Status Badge Overview */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => { setStatusFilter(null); setCurrentPage(1); router.replace("/contacts"); }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                  !statusFilter
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                Alle
                <span className="text-[10px] opacity-70">{totalAll}</span>
              </button>
              {ALL_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    const next = statusFilter === status ? null : status;
                    setStatusFilter(next);
                    setCurrentPage(1);
                    router.replace(next ? `/contacts?status=${next}` : "/contacts");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                    statusFilter === status
                      ? cn(statusColors[status], "shadow-sm ring-1 ring-current/20")
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>

            {/* Active filter indicator */}
            {statusFilter && (
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                Gefiltert nach:
                <Badge className={cn("text-xs", statusColors[statusFilter])}>
                  {statusLabels[statusFilter]}
                </Badge>
                <button
                  onClick={() => { setStatusFilter(null); setCurrentPage(1); router.replace("/contacts"); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nach Name oder Telefon suchen..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">
                      {totalAll === 0
                        ? "Noch keine Kontakte. Importieren Sie Kontakte, um zu beginnen."
                        : "Keine Kontakte entsprechen Ihrer Suche."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Rows per page selector */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Zeilen pro Seite:</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
                        >
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50, 100].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} von {total}
                      </span>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Firma</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Letzter Kontakt</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact) => (
                          <TableRow
                            key={contact.id}
                            className="cursor-pointer"
                            onClick={() =>
                              router.push(`/contacts/${contact.id}`)
                            }
                          >
                            <TableCell className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatPhoneDisplay(contact.phone)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {contact.company || "--"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  statusColors[contact.status]
                                )}
                              >
                                {statusLabels[contact.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(contact.lastContactDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/contacts/${contact.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ansehen
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-muted-foreground">
                          Seite {currentPage} von {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let page: number;
                            if (totalPages <= 7) {
                              page = i + 1;
                            } else if (currentPage <= 4) {
                              page = i + 1;
                            } else if (currentPage >= totalPages - 3) {
                              page = totalPages - 6 + i;
                            } else {
                              page = currentPage - 3 + i;
                            }
                            return (
                              <Button
                                key={page}
                                variant={page === currentPage ? "default" : "outline"}
                                size="sm"
                                className={cn("h-8 w-8 p-0", page === currentPage && "bg-orange-500 hover:bg-orange-600 text-white")}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          })}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Create Contact Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuen Kontakt erstellen</DialogTitle>
          </DialogHeader>
          <ContactForm contact={newContact} onChange={(updates) => setNewContact((p) => ({ ...p, ...updates }))} customProperties={customProps} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateContact}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}

export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsContent />
    </Suspense>
  );
}
