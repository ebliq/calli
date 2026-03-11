"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "components/sidebar/sidebar-layout";
import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Badge } from "components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import {
  Settings,
  Database,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Bot,
  Phone,
  Tags,
  Plus,
  Pencil,
  X,
  Lock,
  Copy,
  Users,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "lib/utils";
import { toast } from "components/toast/use-toast";
import {
  clearAllData,
  getMockMode,
  setMockMode,
} from "lib/store";
import {
  fetchSettings, updateSettings,
  fetchCustomProperties, createCustomProperty, updateCustomProperty, deleteCustomProperty,
  fetchAgents, createAgent, updateAgent, deleteAgent,
  eraseAllData,
  type SettingsDTO, type CustomPropertyDTO, type AgentDTO,
} from "@/lib/api-client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "components/ui/popover";
import { Switch } from "components/ui/switch";
import { createContacts } from "@/lib/api-client";

const typeLabels: Record<string, string> = { string: "Text", number: "Zahl", boolean: "Ja/Nein" };

export default function SettingsPage() {
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "calendar">("general");
  const [operatorApiKey, setOperatorApiKeyState] = useState("");
  const [showOperatorKey, setShowOperatorKey] = useState(false);
  const [concurrentAgents, setConcurrentAgents] = useState(2);

  // Working hours state
  const [workStart, setWorkStart] = useState(9);
  const [workEnd, setWorkEnd] = useState(17);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Custom Properties state
  const [customProps, setCustomProps] = useState<CustomPropertyDTO[]>([]);
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<CustomPropertyDTO | null>(null);
  const [propName, setPropName] = useState("");
  const [propType, setPropType] = useState<"string" | "number" | "boolean">("string");

  // Mock mode
  const [mockEnabled, setMockEnabled] = useState(true);

  // Multi-Agent state
  const [agents, setAgents] = useState<AgentDTO[]>([]);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentDTO | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentIdInput, setAgentIdInput] = useState("");
  const [agentPhoneInput, setAgentPhoneInput] = useState("");
  const [agentMappings, setAgentMappings] = useState<{ contactField: string; apiVariable: string }[]>([]);

  useEffect(() => {
    setMockEnabled(getMockMode());
    async function load() {
      try {
        const [settingsRes, propsRes, agentsRes] = await Promise.all([
          fetchSettings(),
          fetchCustomProperties(),
          fetchAgents(),
        ]);
        setApiKeyState(settingsRes.data.apiKey ?? "");
        setOperatorApiKeyState(settingsRes.data.operatorApiKey ?? "");
        setConcurrentAgents(settingsRes.data.concurrentAgents ?? 2);
        setWorkStart(settingsRes.data.workingHoursStart ?? 9);
        setWorkEnd(settingsRes.data.workingHoursEnd ?? 17);
        setWorkDays(settingsRes.data.workingDays ?? [1, 2, 3, 4, 5]);
        setCustomProps(propsRes.data);
        setAgents(agentsRes.data);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    load();
  }, []);

  const handleSaveApiKey = async () => {
    await updateSettings({ apiKey: apiKey.trim() });
    toast({
      title: "API-Schlüssel gespeichert",
      description: "Der API-Schlüssel wurde erfolgreich gespeichert.",
    });
  };

  const handleSaveOperatorApiKey = async () => {
    await updateSettings({ operatorApiKey: operatorApiKey.trim() });
    toast({
      title: "Operator API-Key gespeichert",
      description: "Externe Systeme können jetzt den Operator-Status steuern.",
    });
  };

  const handleSaveConcurrentAgents = async (value: number) => {
    const clamped = Math.max(1, Math.min(50, value));
    setConcurrentAgents(clamped);
    await updateSettings({ concurrentAgents: clamped });
    toast({ title: "Gleichzeitige Agenten gespeichert" });
  };

  const handleGenerateOperatorKey = async () => {
    const key = `op_${crypto.randomUUID().replace(/-/g, "")}`;
    setOperatorApiKeyState(key);
    await updateSettings({ operatorApiKey: key });
    setShowOperatorKey(true);
    toast({
      title: "Operator API-Key generiert",
      description: "Der Key wurde generiert und gespeichert. Kopieren Sie ihn jetzt.",
    });
  };

  // Custom Properties handlers
  async function handleSaveProp() {
    if (!propName.trim()) return;
    if (editingProp) {
      await updateCustomProperty(editingProp.id, { name: propName.trim(), type: propType });
    } else {
      await createCustomProperty({ name: propName.trim(), type: propType });
    }
    const res = await fetchCustomProperties();
    setCustomProps(res.data);
    setPropDialogOpen(false);
    setEditingProp(null);
    setPropName("");
    setPropType("string");
  }

  async function handleDeleteProp(id: string) {
    if (!window.confirm("Eigenschaft löschen?")) return;
    await deleteCustomProperty(id);
    const res = await fetchCustomProperties();
    setCustomProps(res.data);
  }

  function openEditProp(prop: CustomPropertyDTO) {
    setEditingProp(prop);
    setPropName(prop.name);
    setPropType(prop.type);
    setPropDialogOpen(true);
  }

  function openAddProp() {
    setEditingProp(null);
    setPropName("");
    setPropType("string");
    setPropDialogOpen(true);
  }

  // Multi-Agent handlers
  async function handleSaveAgent() {
    if (!agentName.trim() || !agentIdInput.trim() || !agentPhoneInput.trim()) return;
    const filteredMappings = agentMappings.filter((m) => m.contactField && m.apiVariable);
    if (editingAgent) {
      await updateAgent(editingAgent.id, {
        name: agentName.trim(),
        agentId: agentIdInput.trim(),
        agentPhoneNumberId: agentPhoneInput.trim(),
        propertyMappings: filteredMappings,
      });
    } else {
      await createAgent({
        name: agentName.trim(),
        agentId: agentIdInput.trim(),
        agentPhoneNumberId: agentPhoneInput.trim(),
        propertyMappings: filteredMappings,
      });
    }
    const res = await fetchAgents();
    setAgents(res.data);
    resetAgentForm();
    setAgentDialogOpen(false);
    toast({ title: editingAgent ? "Agent aktualisiert" : "Agent hinzugefügt" });
  }

  async function handleDeleteAgent(id: string) {
    if (!window.confirm("Agent löschen?")) return;
    await deleteAgent(id);
    const res = await fetchAgents();
    setAgents(res.data);
    toast({ title: "Agent gelöscht" });
  }

  async function handleSetDefault(id: string) {
    await updateAgent(id, { isDefault: true });
    const res = await fetchAgents();
    setAgents(res.data);
    toast({ title: "Standard-Agent gesetzt" });
  }

  function openEditAgent(agent: AgentDTO) {
    setEditingAgent(agent);
    setAgentName(agent.name);
    setAgentIdInput(agent.agentId);
    setAgentPhoneInput(agent.agentPhoneNumberId);
    setAgentMappings(agent.propertyMappings || []);
    setAgentDialogOpen(true);
  }

  function openAddAgent() {
    resetAgentForm();
    setAgentDialogOpen(true);
  }

  function resetAgentForm() {
    setEditingAgent(null);
    setAgentName("");
    setAgentIdInput("");
    setAgentPhoneInput("");
    setAgentMappings([]);
  }

  const handleToggleMock = (checked: boolean) => {
    setMockEnabled(checked);
    setMockMode(checked);
    window.dispatchEvent(new CustomEvent("mockmode-changed", { detail: checked }));
    toast({
      title: checked ? "Mock-Modus aktiviert" : "Live-Modus aktiviert",
      description: checked
        ? "Anrufe werden simuliert."
        : "Anrufe werden über die ElevenLabs API geführt.",
    });
  };

  const [erasePopoverOpen, setErasePopoverOpen] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleEraseAll = async () => {
    setErasing(true);
    try {
      const res = await eraseAllData();
      clearAllData();
      const total = Object.values(res.deleted).reduce((a, b) => a + b, 0);
      toast({
        title: "Alle Daten gelöscht",
        description: `${total} Einträge wurden unwiderruflich entfernt.`,
      });
      setErasePopoverOpen(false);
      window.location.reload();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setErasing(false);
    }
  };

  const handleSeedContacts = async () => {
    setSeeding(true);
    try {
      const samples = Array.from({ length: 20 }, (_, i) => {
        const firstNames = ["Anna", "Markus", "Sabine", "Thomas", "Julia", "Stefan", "Petra", "Klaus", "Monika", "Jens", "Laura", "Dirk", "Katrin", "Bernd", "Lisa", "Frank", "Eva", "Uwe", "Simone", "Ralf"];
        const lastNames = ["Mueller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Hoffmann", "Schulz", "Koch", "Richter", "Wolf", "Klein", "Braun", "Hartmann", "Lange", "Werner", "Krause", "Lehmann"];
        const companies = ["TechWerk GmbH", "Berlin Medizintechnik AG", "AutoParts24 GmbH", "CloudSoft Systems", "GreenEnergy AG", "SmartHome Solutions", "DataFlow GmbH", "BioTech Innovations", "LogiTrans AG", "FinanzPlus GmbH"];
        const positions = ["Geschaeftsfuehrer", "Leiterin IT", "Vertriebsleiter", "CTO", "Marketing Manager", "Projektleiter", "Head of Sales", "Teamlead", "Berater", "Einkaufsleiter"];
        const cities = ["Muenchen", "Berlin", "Hamburg", "Frankfurt", "Koeln", "Stuttgart", "Duesseldorf", "Leipzig", "Dresden", "Nuernberg"];
        const statuses: Array<"new" | "contacted" | "scheduled" | "completed" | "no-answer" | "callback"> = ["new", "new", "new", "contacted", "scheduled", "no-answer"];
        return {
          firstName: firstNames[i],
          lastName: lastNames[i],
          phone: `+49 ${170 + (i % 10)} ${String(1000000 + Math.floor(Math.random() * 9000000))}`,
          email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.de`,
          company: companies[i % companies.length],
          position: positions[i % positions.length],
          city: cities[i % cities.length],
          country: "Deutschland",
          status: statuses[i % statuses.length],
        };
      });
      const res = await createContacts(samples);
      toast({
        title: "Beispielkontakte erstellt",
        description: `${res.count} Kontakte wurden angelegt.`,
      });
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
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
                <Settings className="h-6 w-6" />
                Einstellungen
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Konfiguration und Datenverwaltung
              </p>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 border-b mb-6">
              <button
                onClick={() => setActiveTab("general")}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === "general"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Allgemein
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === "calendar"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Kalender
              </button>
            </div>

            {activeTab === "general" && (<>
            {/* API Key */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-5 w-5" />
                  API-Schlüssel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Geben Sie Ihren API-Schlüssel ein, um die KI-Anrufagenten zu verbinden.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKeyState(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button onClick={handleSaveApiKey}>Speichern</Button>
                </div>
              </CardContent>
            </Card>

            {/* Operator API Key */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-5 w-5" />
                  Operator API-Key
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Dieser Key wird von externen Systemen (z.B. Anruf-Agenten) verwendet, um den Operator zu sperren/entsperren.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showOperatorKey ? "text" : "password"}
                      placeholder="op_..."
                      value={operatorApiKey}
                      onChange={(e) => setOperatorApiKeyState(e.target.value)}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOperatorKey(!showOperatorKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOperatorKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {operatorApiKey && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(operatorApiKey);
                        toast({ title: "Kopiert", description: "API-Key in die Zwischenablage kopiert." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  <Button onClick={handleSaveOperatorApiKey}>Speichern</Button>
                  <Button variant="outline" onClick={handleGenerateOperatorKey}>
                    Generieren
                  </Button>
                </div>
                {operatorApiKey && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-2">
                    <p className="font-medium text-muted-foreground">Sperren:</p>
                    <code className="block text-[11px] break-all bg-background/50 rounded p-2">
                      POST /api/operator/lock<br />
                      x-api-key: {showOperatorKey ? operatorApiKey : "op_••••••••"}<br />
                      {`{"locked": true, "lockedBy": "conv_..."}`}
                    </code>
                    <p className="font-medium text-muted-foreground">Entsperren:</p>
                    <code className="block text-[11px] break-all bg-background/50 rounded p-2">
                      POST /api/operator/lock<br />
                      x-api-key: {showOperatorKey ? operatorApiKey : "op_••••••••"}<br />
                      {`{"locked": false}`}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Concurrent Agents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  Gleichzeitige Agenten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Anzahl der Agenten, die gleichzeitig Anrufe starten.
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={concurrentAgents}
                    onChange={(e) => setConcurrentAgents(Number(e.target.value))}
                    className="w-24"
                  />
                  <Button onClick={() => handleSaveConcurrentAgents(concurrentAgents)}>
                    Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Properties */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tags className="h-5 w-5" />
                    Benutzerdefinierte Eigenschaften
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={openAddProp}>
                    <Plus className="h-4 w-4 mr-1" />
                    Eigenschaft hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customProps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine benutzerdefinierten Eigenschaften vorhanden.</p>
                ) : (
                  <div className="space-y-2">
                    {customProps.map((prop) => (
                      <div key={prop.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{prop.name}</span>
                          <Badge variant="secondary">{typeLabels[prop.type] || prop.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditProp(prop)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteProp(prop.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custom Property Dialog */}
            <Dialog open={propDialogOpen} onOpenChange={setPropDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProp ? "Eigenschaft bearbeiten" : "Eigenschaft hinzufügen"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="z.B. Kundennummer"
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Typ</label>
                    <Select value={propType} onValueChange={(v) => setPropType(v as "string" | "number" | "boolean")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">Text</SelectItem>
                        <SelectItem value="number">Zahl</SelectItem>
                        <SelectItem value="boolean">Ja/Nein</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPropDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleSaveProp}>Speichern</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Calli-Agent Agents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bot className="h-5 w-5" />
                    Calli-Agent Agenten
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={openAddAgent}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agent hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Agenten konfiguriert.</p>
                ) : (
                  <div className="space-y-3">
                    {agents.map((agent) => (
                      <div key={agent.id} className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{agent.name}</span>
                            {agent.isDefault && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Standard</Badge>}
                            {agent.propertyMappings && agent.propertyMappings.length > 0 && (
                              <Badge variant="secondary">{agent.propertyMappings.length} Mappings</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Agent ID: <span className="font-mono">{agent.agentId.length > 40 ? agent.agentId.slice(0, 40) + "..." : agent.agentId}</span></p>
                          <p>Phone ID: <span className="font-mono">{agent.agentPhoneNumberId.length > 40 ? agent.agentPhoneNumberId.slice(0, 40) + "..." : agent.agentPhoneNumberId}</span></p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          {!agent.isDefault && (
                            <Button variant="outline" size="sm" onClick={() => handleSetDefault(agent.id)}>
                              Als Standard
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEditAgent(agent)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAgent(agent.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Dialog */}
            <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAgent ? "Agent bearbeiten" : "Agent hinzufügen"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="z.B. Vertrieb Agent"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Agent ID</label>
                    <Input
                      placeholder="z.B. agent_abc123..."
                      value={agentIdInput}
                      onChange={(e) => setAgentIdInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Phone Number ID
                    </label>
                    <Input
                      placeholder="z.B. phnum_abc123..."
                      value={agentPhoneInput}
                      onChange={(e) => setAgentPhoneInput(e.target.value)}
                    />
                  </div>
                  {/* Property Mappings */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Property Mappings</label>
                      <Button variant="outline" size="sm" onClick={() => setAgentMappings([...agentMappings, { contactField: "", apiVariable: "" }])}>
                        <Plus className="h-3 w-3 mr-1" /> Mapping
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Kontakt-Felder auf API-Variablen mappen</p>
                    {agentMappings.map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select value={mapping.contactField} onValueChange={(v) => { const updated = [...agentMappings]; updated[idx] = { ...updated[idx], contactField: v }; setAgentMappings(updated); }}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Kontakt-Feld" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="firstName">Vorname</SelectItem>
                            <SelectItem value="lastName">Nachname</SelectItem>
                            <SelectItem value="phone">Telefon</SelectItem>
                            <SelectItem value="email">E-Mail</SelectItem>
                            <SelectItem value="company">Firma</SelectItem>
                            <SelectItem value="position">Position</SelectItem>
                            <SelectItem value="department">Abteilung</SelectItem>
                            <SelectItem value="callReason">Anrufgrund</SelectItem>
                            <SelectItem value="language">Sprache</SelectItem>
                            <SelectItem value="notes">Notizen</SelectItem>
                            {customProps.map((cp) => (
                              <SelectItem key={cp.id} value={`custom:${cp.key}`}>{cp.name} (Custom)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-xs">&rarr;</span>
                        <Input className="flex-1" placeholder="API Variable" value={mapping.apiVariable} onChange={(e) => { const updated = [...agentMappings]; updated[idx] = { ...updated[idx], apiVariable: e.target.value }; setAgentMappings(updated); }} />
                        <Button variant="ghost" size="sm" onClick={() => setAgentMappings(agentMappings.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAgentDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleSaveAgent}>Speichern</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Mock Mode */}
            <Card className={mockEnabled ? "border-2 border-red-400 dark:border-red-600" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-5 w-5" />
                  Anruf-Modus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Mock-Calls (Demo-Modus)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Wenn aktiviert, werden Anrufe simuliert. Im Live-Modus werden echte Anrufe über die ElevenLabs API geführt.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={mockEnabled
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : "bg-red-100 text-red-800 border-red-300"
                    }>
                      {mockEnabled ? "DEMO" : "LIVE"}
                    </Badge>
                    <Switch
                      checked={mockEnabled}
                      onCheckedChange={handleToggleMock}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5" />
                  Datenverwaltung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">20 Beispielkontakte erstellen</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Erstellt 20 deutsche Beispielkontakte zum Testen.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleSeedContacts}
                    disabled={seeding}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {seeding ? "Erstelle..." : "Erstellen"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800 p-4">
                  <div>
                    <p className="font-medium text-sm text-red-600 dark:text-red-400">
                      Alle Daten löschen
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Entfernt alle Kontakte, Anrufe, Stapel, Agenten und Einstellungen unwiderruflich.
                    </p>
                  </div>
                  <Popover open={erasePopoverOpen} onOpenChange={setErasePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-red-600">Sind Sie absolut sicher?</p>
                        <p className="text-xs text-muted-foreground">
                          Diese Aktion kann nicht rückgängig gemacht werden. Alle Kontakte, Anrufe, Stapel, Agenten und Einstellungen werden dauerhaft gelöscht.
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setErasePopoverOpen(false)}
                          >
                            Abbrechen
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleEraseAll}
                            disabled={erasing}
                          >
                            {erasing ? "Lösche..." : "Ja, alles löschen"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
            </>)}

            {activeTab === "calendar" && (<>
            {/* Working Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  Arbeitszeiten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Arbeitszeit von</label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={workStart}
                    onChange={(e) => setWorkStart(Number(e.target.value))}
                    className="w-20"
                  />
                  <label className="text-sm font-medium">bis</label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={workEnd}
                    onChange={(e) => setWorkEnd(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">Uhr</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Arbeitstage</label>
                  <div className="flex gap-2">
                    {[
                      { label: "Mo", value: 1 },
                      { label: "Di", value: 2 },
                      { label: "Mi", value: 3 },
                      { label: "Do", value: 4 },
                      { label: "Fr", value: 5 },
                      { label: "Sa", value: 6 },
                      { label: "So", value: 0 },
                    ].map((day) => (
                      <label key={day.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={workDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWorkDays([...workDays, day.value].sort());
                            } else {
                              setWorkDays(workDays.filter((d) => d !== day.value));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    await updateSettings({
                      workingHoursStart: workStart,
                      workingHoursEnd: workEnd,
                      workingDays: workDays,
                    });
                    toast({
                      title: "Arbeitszeiten gespeichert",
                      description: "Die Arbeitszeiten wurden erfolgreich aktualisiert.",
                    });
                  }}
                >
                  Speichern
                </Button>
              </CardContent>
            </Card>

            {/* Calendar API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Kalender API für Agenten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Verwenden Sie den Operator API-Key um Termine über die API zu verwalten.
                </p>

                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-3">
                  <p className="font-medium text-muted-foreground">Verfügbare Slots abfragen:</p>
                  <code className="block text-[11px] break-all bg-background/50 rounded p-2">
                    GET /api/appointments/public?from=2026-03-17T09:00:00Z&amp;to=2026-03-18T18:00:00Z&amp;duration=30<br />
                    x-api-key: {showOperatorKey ? operatorApiKey : "op_••••••••"}
                  </code>
                  <p className="font-medium text-muted-foreground text-[11px]">Response:</p>
                  <code className="block text-[11px] break-all bg-background/50 rounded p-2 whitespace-pre">
{`{
  "slots": [
    { "start": "2026-03-17T09:00:00Z", "end": "2026-03-17T09:30:00Z" },
    { "start": "2026-03-17T09:30:00Z", "end": "2026-03-17T10:00:00Z" }
  ]
}`}
                  </code>

                  <p className="font-medium text-muted-foreground">Termin erstellen:</p>
                  <code className="block text-[11px] break-all bg-background/50 rounded p-2 whitespace-pre">
{`POST /api/appointments/public
x-api-key: ${showOperatorKey ? operatorApiKey : "op_••••••••"}
Content-Type: application/json

{
  "title": "Beratungsgespräch",
  "startTime": "2026-03-17T10:00:00Z",
  "endTime": "2026-03-17T10:30:00Z",
  "attendees": [{ "name": "Max Müller", "email": "max@example.de" }],
  "notes": "Erstgespräch zum Thema KI-Telefonie"
}`}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOperatorKey(!showOperatorKey)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showOperatorKey ? (
                      <><EyeOff className="h-3 w-3" /> API-Key verbergen</>
                    ) : (
                      <><Eye className="h-3 w-3" /> API-Key anzeigen</>
                    )}
                  </button>
                  {operatorApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(operatorApiKey);
                        toast({ title: "Kopiert", description: "API-Key in die Zwischenablage kopiert." });
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Kopieren
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
            </>)}
          </div>
        </div>
      </main>
    </SidebarLayout>
  );
}
