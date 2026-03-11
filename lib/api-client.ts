// API client for all backend endpoints

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ---- Contacts ----

export interface ContactListResponse {
  data: ContactDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactDTO {
  id: string;
  userId?: string;
  salutation?: string;
  title?: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneMobile?: string;
  email?: string;
  company?: string;
  position?: string;
  department?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  callReason?: string;
  preferredCallTime?: string;
  language?: string;
  customProperties?: Record<string, string | number | boolean>;
  notes?: string;
  tags?: string[];
  source?: string;
  lastContactDate?: string;
  nextScheduledCall?: string;
  status: "new" | "contacted" | "scheduled" | "completed" | "no-answer" | "callback";
  createdAt: string;
  updatedAt: string;
}

export async function fetchContacts(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<ContactListResponse> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.status) sp.set("status", params.status);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.sort) sp.set("sort", params.sort);
  return request(`/api/contacts?${sp.toString()}`);
}

export async function fetchContact(id: string): Promise<{ data: ContactDTO }> {
  return request(`/api/contacts/${id}`);
}

export async function createContact(data: Partial<ContactDTO>): Promise<{ data: ContactDTO }> {
  return request("/api/contacts", { method: "POST", body: JSON.stringify(data) });
}

export async function createContacts(data: Partial<ContactDTO>[]): Promise<{ data: ContactDTO[]; count: number }> {
  return request("/api/contacts", { method: "POST", body: JSON.stringify(data) });
}

export async function updateContact(id: string, data: Partial<ContactDTO>): Promise<{ data: ContactDTO }> {
  return request(`/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteContact(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/contacts/${id}`, { method: "DELETE" });
}

export async function deleteContacts(ids: string[]): Promise<{ deleted: number }> {
  return request("/api/contacts", { method: "DELETE", body: JSON.stringify({ ids }) });
}

// ---- Agents ----

export interface AgentDTO {
  id: string;
  name: string;
  agentId: string;
  agentPhoneNumberId: string;
  isDefault: boolean;
  propertyMappings: { contactField: string; apiVariable: string }[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchAgents(): Promise<{ data: AgentDTO[] }> {
  return request("/api/agents");
}

export async function createAgent(data: Partial<AgentDTO>): Promise<{ data: AgentDTO }> {
  return request("/api/agents", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAgent(id: string, data: Partial<AgentDTO>): Promise<{ data: AgentDTO }> {
  return request(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteAgent(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/agents/${id}`, { method: "DELETE" });
}

// ---- Settings ----

export interface CustomPropertyDTO {
  id: string;
  name: string;
  key: string;
  type: "string" | "number" | "boolean";
  createdAt: string;
}

export interface SettingsDTO {
  id: string;
  apiKey?: string;
  operatorApiKey?: string;
  customProperties: CustomPropertyDTO[];
  mockMode: boolean;
  concurrentAgents: number;
  workingHoursStart?: number;
  workingHoursEnd?: number;
  workingDays?: number[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchSettings(): Promise<{ data: SettingsDTO }> {
  return request("/api/settings");
}

export async function updateSettings(data: Partial<SettingsDTO>): Promise<{ data: SettingsDTO }> {
  return request("/api/settings", { method: "PATCH", body: JSON.stringify(data) });
}

export async function fetchCustomProperties(): Promise<{ data: CustomPropertyDTO[] }> {
  return request("/api/settings/custom-properties");
}

export async function createCustomProperty(data: { name: string; type: string }): Promise<{ data: SettingsDTO }> {
  return request("/api/settings/custom-properties", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCustomProperty(id: string, data: Partial<CustomPropertyDTO>): Promise<{ data: SettingsDTO }> {
  return request(`/api/settings/custom-properties/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteCustomProperty(id: string): Promise<{ data: SettingsDTO }> {
  return request(`/api/settings/custom-properties/${id}`, { method: "DELETE" });
}

// ---- Batches ----

export interface BatchDTO {
  id: string;
  name: string;
  status: "pending" | "running" | "paused" | "completed";
  calliAgentId?: string | null;
  totalCalls: number;
  completedCalls: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDetailDTO extends BatchDTO {
  calls?: CallDTO[];
}

export interface BatchListResponse {
  data: BatchDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchBatches(params?: { status?: string; page?: number; limit?: number }): Promise<BatchListResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/api/batches?${q}`);
}

export async function fetchBatch(id: string, include?: string): Promise<{ data: BatchDetailDTO }> {
  const q = include ? `?include=${include}` : "";
  return request(`/api/batches/${id}${q}`);
}

export async function createBatch(data: { name: string; contactIds: string[]; calliAgentId?: string }): Promise<{ data: BatchDTO }> {
  return request("/api/batches", { method: "POST", body: JSON.stringify(data) });
}

export async function updateBatch(id: string, data: Partial<BatchDTO>): Promise<{ data: BatchDTO }> {
  return request(`/api/batches/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteBatch(id: string): Promise<{ deleted: boolean; plannedCallsRemoved: number }> {
  return request(`/api/batches/${id}`, { method: "DELETE" });
}

// ---- Calls ----

export interface CallDTO {
  id: string;
  contactId: string;
  contactName?: string;
  batchId?: string | null;
  calliAgentId?: string | null;
  status: "planned" | "ringing" | "in-progress" | "completed" | "failed" | "transferred";
  outcome?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  duration?: number | null;
  summary?: string | null;
  transcript?: string | null;
  conversationId?: string | null;
  elevenLabsTranscript?: { role: string; message: string; time_in_call_secs?: number }[] | null;
  elevenLabsSummary?: string | null;
  elevenLabsData?: Record<string, { value: string; rationale: string }> | null;
  agentNotes?: string | null;
  meetingBooked?: boolean | null;
  meetingDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallDetailDTO extends CallDTO {
  transcript?: string | null;
  elevenLabsTranscript?: { role: string; message: string; time_in_call_secs?: number }[] | null;
  elevenLabsSummary?: string | null;
  elevenLabsData?: Record<string, { value: string; rationale: string }> | null;
  agentNotes?: string | null;
  meetingBooked?: boolean | null;
  meetingDate?: string | null;
}

export interface CallListResponse {
  data: CallDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchCalls(params?: { contactId?: string; batchId?: string; status?: string; page?: number; limit?: number }): Promise<CallListResponse> {
  const q = new URLSearchParams();
  if (params?.contactId) q.set("contactId", params.contactId);
  if (params?.batchId) q.set("batchId", params.batchId);
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/api/calls?${q}`);
}

export async function fetchCall(id: string): Promise<{ data: CallDTO }> {
  return request(`/api/calls/${id}`);
}

export async function fetchCallDetail(id: string): Promise<{ data: CallDetailDTO }> {
  return request(`/api/calls/${id}`);
}

export async function updateCall(id: string, data: Partial<CallDTO>): Promise<{ data: CallDTO }> {
  return request(`/api/calls/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteCall(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/calls/${id}`, { method: "DELETE" });
}

// ---- Operator ----

export interface OperatorDTO {
  id: string;
  available: boolean;
  locked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchOperator(): Promise<{ data: OperatorDTO }> {
  return request("/api/operator");
}

export async function updateOperator(data: Partial<OperatorDTO>): Promise<{ data: OperatorDTO }> {
  return request("/api/operator", { method: "PATCH", body: JSON.stringify(data) });
}

// ---- Data Management ----

export async function eraseAllData(): Promise<{ deleted: Record<string, number> }> {
  return request("/api/data/erase-all", { method: "DELETE" });
}

// ---- Appointments ----

export interface AppointmentDTO {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: { name: string; email: string }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentListResponse {
  data: AppointmentDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SlotDTO {
  start: string;
  end: string;
}

export async function fetchAppointments(params?: { from?: string; to?: string; page?: number; limit?: number }): Promise<AppointmentListResponse> {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  return request(`/api/appointments?${q}`);
}

export async function fetchAppointment(id: string): Promise<{ data: AppointmentDTO }> {
  return request(`/api/appointments/${id}`);
}

export async function createAppointment(data: Partial<AppointmentDTO>): Promise<{ data: AppointmentDTO }> {
  return request("/api/appointments", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAppointment(id: string, data: Partial<AppointmentDTO>): Promise<{ data: AppointmentDTO }> {
  return request(`/api/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteAppointment(id: string): Promise<{ deleted: boolean }> {
  return request(`/api/appointments/${id}`, { method: "DELETE" });
}
