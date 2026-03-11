"use client";

import { Contact, CallRecord, ScheduledBatch, ActiveCall, AppState, CustomProperty, ElevenLabsAgent } from "./types";

const STORAGE_KEY = "calli_data";

function getDefaultState(): AppState {
  return {
    contacts: [],
    callRecords: [],
    scheduledBatches: [],
    activeCalls: [],
    isOperatorAvailable: false,
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return JSON.parse(raw) as AppState;
  } catch {
    return getDefaultState();
  }
}

export function clearAllData(): void {
  saveState(getDefaultState());
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getContacts(): Contact[] {
  return loadState().contacts;
}

export function saveContacts(contacts: Contact[]): void {
  const state = loadState();
  state.contacts = contacts;
  saveState(state);
}

export function addContacts(newContacts: Contact[]): void {
  const state = loadState();
  state.contacts = [...state.contacts, ...newContacts];
  saveState(state);
}

export function getContact(id: string): Contact | undefined {
  return loadState().contacts.find((c) => c.id === id);
}

export function updateContact(id: string, updates: Partial<Contact>): void {
  const state = loadState();
  state.contacts = state.contacts.map((c) =>
    c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
  );
  saveState(state);
}

export function deleteContact(id: string): void {
  const state = loadState();
  state.contacts = state.contacts.filter((c) => c.id !== id);
  state.callRecords = state.callRecords.filter((r) => r.contactId !== id);
  saveState(state);
}

export function getCallRecords(contactId?: string): CallRecord[] {
  const records = loadState().callRecords;
  if (contactId) return records.filter((r) => r.contactId === contactId);
  return records;
}

export function addCallRecord(record: CallRecord): void {
  const state = loadState();
  state.callRecords = [...state.callRecords, record];
  saveState(state);
}

export function updateCallRecord(id: string, updates: Partial<CallRecord>): void {
  const state = loadState();
  state.callRecords = state.callRecords.map((r) =>
    r.id === id ? { ...r, ...updates } : r
  );
  saveState(state);
}

export function getScheduledBatches(): ScheduledBatch[] {
  return loadState().scheduledBatches;
}

export function addScheduledBatch(batch: ScheduledBatch): void {
  const state = loadState();
  state.scheduledBatches = [...state.scheduledBatches, batch];
  saveState(state);
}

export function deleteScheduledBatch(id: string): void {
  const state = loadState();
  state.scheduledBatches = state.scheduledBatches.filter((b) => b.id !== id);
  saveState(state);
}

export function updateScheduledBatch(id: string, updates: Partial<ScheduledBatch>): void {
  const state = loadState();
  state.scheduledBatches = state.scheduledBatches.map((b) =>
    b.id === id ? { ...b, ...updates } : b
  );
  saveState(state);
}

export function getActiveCalls(): ActiveCall[] {
  return loadState().activeCalls;
}

export function setActiveCalls(calls: ActiveCall[]): void {
  const state = loadState();
  state.activeCalls = calls;
  saveState(state);
}

export function getOperatorAvailability(): boolean {
  return loadState().isOperatorAvailable;
}

export function setOperatorAvailability(available: boolean): void {
  const state = loadState();
  state.isOperatorAvailable = available;
  saveState(state);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const API_KEY_STORAGE_KEY = "calli_api_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

// ElevenLabs settings
const ELEVENLABS_SETTINGS_KEY = "calli_elevenlabs";

export interface ElevenLabsSettings {
  agentId: string;
  agentPhoneNumberId: string;
}

export function getElevenLabsSettings(): ElevenLabsSettings {
  if (typeof window === "undefined") return { agentId: "", agentPhoneNumberId: "" };
  try {
    const raw = localStorage.getItem(ELEVENLABS_SETTINGS_KEY);
    if (!raw) return { agentId: "", agentPhoneNumberId: "" };
    return JSON.parse(raw);
  } catch {
    return { agentId: "", agentPhoneNumberId: "" };
  }
}

export function setElevenLabsSettings(settings: ElevenLabsSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ELEVENLABS_SETTINGS_KEY, JSON.stringify(settings));
}

// Mock mode
const MOCK_MODE_KEY = "calli_mock_mode";

export function getMockMode(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MOCK_MODE_KEY) !== "false"; // default true
}

export function setMockMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_MODE_KEY, enabled ? "true" : "false");
}

// Custom Properties CRUD
const CUSTOM_PROPS_KEY = "calli_custom_properties";

export function getCustomProperties(): CustomProperty[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PROPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveCustomProperties(props: CustomProperty[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_PROPS_KEY, JSON.stringify(props));
}

export function addCustomProperty(prop: CustomProperty): void {
  const props = getCustomProperties();
  props.push(prop);
  saveCustomProperties(props);
}

export function updateCustomProperty(id: string, updates: Partial<CustomProperty>): void {
  const props = getCustomProperties().map((p) => p.id === id ? { ...p, ...updates } : p);
  saveCustomProperties(props);
}

export function deleteCustomProperty(id: string): void {
  saveCustomProperties(getCustomProperties().filter((p) => p.id !== id));
}

// Multi-Agent CRUD
const ELEVENLABS_AGENTS_KEY = "calli_elevenlabs_agents";

export function getElevenLabsAgents(): ElevenLabsAgent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ELEVENLABS_AGENTS_KEY);
    if (!raw) {
      // Migrate from old single-agent settings
      const old = getElevenLabsSettings();
      if (old.agentId) {
        const migrated: ElevenLabsAgent = {
          id: generateId(),
          name: "Standard Agent",
          agentId: old.agentId,
          agentPhoneNumberId: old.agentPhoneNumberId,
          isDefault: true,
          propertyMappings: [
            { contactField: "firstName", apiVariable: "customer" },
            { contactField: "company", apiVariable: "name" },
          ],
          createdAt: new Date().toISOString(),
        };
        saveElevenLabsAgents([migrated]);
        return [migrated];
      }
      return [];
    }
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveElevenLabsAgents(agents: ElevenLabsAgent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ELEVENLABS_AGENTS_KEY, JSON.stringify(agents));
}

export function addElevenLabsAgent(agent: ElevenLabsAgent): void {
  const agents = getElevenLabsAgents();
  // If first agent, auto-set as default
  if (agents.length === 0) agent.isDefault = true;
  agents.push(agent);
  saveElevenLabsAgents(agents);
}

export function updateElevenLabsAgent(id: string, updates: Partial<ElevenLabsAgent>): void {
  const agents = getElevenLabsAgents().map((a) => a.id === id ? { ...a, ...updates } : a);
  saveElevenLabsAgents(agents);
}

export function deleteElevenLabsAgent(id: string): void {
  let agents = getElevenLabsAgents().filter((a) => a.id !== id);
  // If we deleted the default, make the first one default
  if (agents.length > 0 && !agents.some((a) => a.isDefault)) {
    agents[0].isDefault = true;
  }
  saveElevenLabsAgents(agents);
}

export function setDefaultAgent(id: string): void {
  const agents = getElevenLabsAgents().map((a) => ({ ...a, isDefault: a.id === id }));
  saveElevenLabsAgents(agents);
}

export function getDefaultAgent(): ElevenLabsAgent | undefined {
  return getElevenLabsAgents().find((a) => a.isDefault);
}
