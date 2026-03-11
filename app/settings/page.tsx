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
} from "lucide-react";
import { toast } from "components/toast/use-toast";
import {
  saveContacts,
  loadState,
  saveState,
  clearAllData,
} from "lib/store";
import {
  fetchSettings, updateSettings,
  fetchCustomProperties, createCustomProperty, updateCustomProperty, deleteCustomProperty,
  fetchAgents, createAgent, updateAgent, deleteAgent,
  type SettingsDTO, type CustomPropertyDTO, type AgentDTO,
} from "@/lib/api-client";
import { sampleContacts, sampleCallRecords } from "lib/seed";

const typeLabels: Record<string, string> = { string: "Text", number: "Zahl", boolean: "Ja/Nein" };

export default function SettingsPage() {
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [operatorApiKey, setOperatorApiKeyState] = useState("");
  const [showOperatorKey, setShowOperatorKey] = useState(false);
  const [concurrentAgents, setConcurrentAgents] = useState(2);

  // Custom Properties state
  const [customProps, setCustomProps] = useState<CustomPropertyDTO[]>([]);
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<CustomPropertyDTO | null>(null);
  const [propName, setPropName] = useState("");
  const [propType, setPropType] = useState<"string" | "number" | "boolean">("string");

  // Multi-Agent state
  const [agents, setAgents] = useState<AgentDTO[]>([]);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentDTO | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentIdInput, setAgentIdInput] = useState("");
  const [agentPhoneInput, setAgentPhoneInput] = useState("");
  const [agentMappings, setAgentMappings] = useState<{ contactField: string; apiVariable: string }[]>([]);

  useEffect(() => {
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

  const handleLoadSampleData = () => {
    saveContacts(sampleContacts);
    const state = loadState();
    state.callRecords = sampleCallRecords;
    saveState(state);
    toast({
      title: "Beispieldaten geladen",
      description: `${sampleContacts.length} Kontakte und ${sampleCallRecords.length} Anrufprotokolle geladen.`,
    });
  };

  const handleClearAllData = () => {
    if (window.confirm("Alle Daten unwiderruflich löschen?")) {
      clearAllData();
      toast({
        title: "Alle Daten gelöscht",
        description: "Alle Kontakte, Anrufe und Stapel wurden entfernt.",
      });
      window.location.reload();
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
                    <p className="font-medium text-sm">Beispieldaten laden</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lädt {sampleContacts.length} Kontakte und Anrufprotokolle zum Testen.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleLoadSampleData}>
                    <Database className="h-4 w-4 mr-2" />
                    Laden
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-800 p-4">
                  <div>
                    <p className="font-medium text-sm text-red-600 dark:text-red-400">
                      Alle Daten löschen
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Entfernt alle Kontakte, Anrufe und Stapel unwiderruflich.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
                    onClick={handleClearAllData}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
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
