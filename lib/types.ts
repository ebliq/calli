export interface CustomProperty {
  id: string;
  name: string;
  key: string;
  type: "string" | "number" | "boolean";
  createdAt: string;
}

export interface ElevenLabsAgent {
  id: string;
  name: string;
  agentId: string;
  agentPhoneNumberId: string;
  isDefault: boolean;
  propertyMappings: PropertyMapping[];
  createdAt: string;
}

export interface PropertyMapping {
  contactField: string;  // internal contact field key (e.g. "firstName", "company", or custom prop key)
  apiVariable: string;   // ElevenLabs dynamic_variables key
}

export interface Contact {
  id: string;
  // Standard fields
  salutation?: string; // Herr, Frau, etc.
  title?: string; // Dr., Prof., etc.
  firstName: string;
  lastName: string;
  phone: string;
  phoneMobile?: string;
  email?: string;
  company?: string;
  position?: string; // Job title
  department?: string;
  // Address
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  // Call specific
  callReason?: string; // Long text - why we are calling this contact
  preferredCallTime?: string;
  language?: string;
  // Custom
  customProperties?: Record<string, string | number | boolean>;
  // Meta
  notes?: string;
  tags?: string[];
  source?: string; // Where the contact came from (import, manual, etc.)
  lastContactDate?: string;
  nextScheduledCall?: string;
  status: "new" | "contacted" | "scheduled" | "completed" | "no-answer" | "callback";
  createdAt: string;
  updatedAt: string;
}

export interface CallRecord {
  id: string;
  contactId: string;
  batchId?: string;
  calliAgentId?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // seconds
  status: "planned" | "ringing" | "in-progress" | "completed" | "failed" | "transferred";
  outcome?: "answered" | "no-answer" | "voicemail" | "busy" | "meeting-booked" | "callback-requested";
  transcript?: string;
  summary?: string;
  meetingBooked?: boolean;
  meetingDate?: string;
  agentNotes?: string;
  // ElevenLabs data
  conversationId?: string;
  elevenLabsTranscript?: { role: string; message: string; time_in_call_secs?: number }[];
  elevenLabsSummary?: string;
  elevenLabsData?: Record<string, { value: string; rationale: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CSVMapping {
  id: string;
  csvColumn: string;
  internalField: keyof Contact | "";
}

// Used by localStorage-based scheduler pages
export interface ScheduledBatch {
  id: string;
  name: string;
  contactIds: string[];
  status: "pending" | "running" | "paused" | "completed";
  calliAgentId?: string;
  createdAt: string;
  updatedAt?: string;
  completedCalls: number;
  totalCalls: number;
}

// API response type — counts are computed from Call documents, no contactIds array
export interface ApiBatch {
  id: string;
  name: string;
  status: "pending" | "running" | "paused" | "completed";
  calliAgentId?: string;
  totalCalls: number;
  completedCalls: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCall {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  status: "ringing" | "in-progress" | "transferring" | "completed" | "failed";
  startedAt: string;
  duration: number;
  agentId: number; // 1-4
}

export interface OperatorStatus {
  id: string;
  available: boolean;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  contacts: Contact[];
  callRecords: CallRecord[];
  scheduledBatches: ScheduledBatch[];
  activeCalls: ActiveCall[];
  isOperatorAvailable: boolean;
}
