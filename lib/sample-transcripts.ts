// ElevenLabs-format transcript entries for mock mode
// In real ElevenLabs: transcript is only available after call is done (status: "done")

export interface ElevenLabsTranscriptEntry {
  role: "user" | "agent";
  message: string;
  time_in_call_secs: number;
  tool_calls?: { tool_name: string; tool_id?: string }[];
  tool_results?: {
    type: string;
    tool_name?: string;
    result_value?: string;
    is_error?: boolean;
    system?: Record<string, unknown>;
  }[];
}

export interface MockConversation {
  status: "done" | "failed";
  call_duration_secs: number;
  transcript: ElevenLabsTranscriptEntry[];
  analysis: {
    call_successful: "success" | "failure" | "unknown";
    transcript_summary: string;
  };
  metadata: {
    termination_reason: string;
    features_usage?: {
      transfer_to_number?: { enabled: boolean; used: boolean };
      transfer_to_agent?: { enabled: boolean; used: boolean };
    };
  };
  // For mock display timing (not part of real ElevenLabs response)
  _mock?: {
    outcome: string;
    delayMs: number; // total call duration for simulation
  };
}

// 1. Successful demo scheduling — meeting booked
const demoScheduling: MockConversation = {
  status: "done",
  call_duration_secs: 95,
  transcript: [
    { role: "agent", message: "Guten Tag, hier spricht der KI-Assistent von TechVision GmbH. Spreche ich mit Herrn Meier?", time_in_call_secs: 1 },
    { role: "user", message: "Ja, Meier hier. Worum geht es?", time_in_call_secs: 5 },
    { role: "agent", message: "Wunderbar. Sie hatten auf unserer Webseite Interesse an unserer Automatisierungsplattform gezeigt. Ich wollte Ihnen gerne eine persönliche Demo anbieten.", time_in_call_secs: 8 },
    { role: "user", message: "Ah ja, stimmt. Das klingt gut. Wie lange dauert so eine Demo?", time_in_call_secs: 15 },
    { role: "agent", message: "In der Regel etwa 30 Minuten. Wir zeigen Ihnen die wichtigsten Workflows und beantworten Ihre Fragen.", time_in_call_secs: 20 },
    { role: "user", message: "Okay. Nächste Woche wäre gut. Dienstag oder Mittwoch vielleicht?", time_in_call_secs: 28 },
    { role: "agent", message: "Dienstag um 10 Uhr oder 14 Uhr wäre verfügbar. Was passt Ihnen besser?", time_in_call_secs: 33 },
    { role: "user", message: "14 Uhr wäre perfekt.", time_in_call_secs: 38 },
    { role: "agent", message: "Sehr gut. Ich trage Dienstag, 14 Uhr ein. Sie bekommen eine Kalendereinladung per E-Mail.", time_in_call_secs: 42 },
    { role: "user", message: "Super, vielen Dank.", time_in_call_secs: 48 },
    { role: "agent", message: "Gerne! Bis Dienstag dann. Auf Wiedersehen, Herr Meier.", time_in_call_secs: 52 },
    { role: "user", message: "Auf Wiedersehen!", time_in_call_secs: 56 },
    { role: "agent", message: "", time_in_call_secs: 58, tool_calls: [{ tool_name: "end_call" }], tool_results: [{ type: "system", system: { type: "end_call_success", reason: "call_completed", message: "Termin vereinbart" } }] },
  ],
  analysis: {
    call_successful: "success",
    transcript_summary: "Herr Meier hat eine Demo für Dienstag um 14 Uhr vereinbart. Kalendereinladung wird per E-Mail zugestellt.",
  },
  metadata: {
    termination_reason: "agent_ended_call",
    features_usage: { transfer_to_number: { enabled: true, used: false } },
  },
  _mock: { outcome: "meeting-booked", delayMs: 18000 },
};

// 2. Follow-up call — answered, callback requested
const quoteFollowUp: MockConversation = {
  status: "done",
  call_duration_secs: 78,
  transcript: [
    { role: "agent", message: "Guten Tag, hier ist der KI-Assistent von DataFlow Solutions. Kann ich bitte mit Frau Schmidt sprechen?", time_in_call_secs: 1 },
    { role: "user", message: "Am Apparat. Was kann ich für Sie tun?", time_in_call_secs: 5 },
    { role: "agent", message: "Frau Schmidt, wir hatten Ihnen am 15. ein Angebot für unser Enterprise-Paket zugeschickt. Ich wollte höflich nachfragen.", time_in_call_secs: 9 },
    { role: "user", message: "Ja, ich habe das Angebot gesehen. Wir sind noch in der internen Abstimmung.", time_in_call_secs: 16 },
    { role: "agent", message: "Verstehe. Gibt es offene Fragen, bei denen ich helfen kann?", time_in_call_secs: 21 },
    { role: "user", message: "Die Lizenzkosten für das zweite Jahr sind uns nicht ganz klar.", time_in_call_secs: 27 },
    { role: "agent", message: "Im zweiten Jahr gilt der reguläre Preis von 890 Euro pro Monat. Im ersten Jahr haben Sie den Einführungsrabatt von 20 Prozent.", time_in_call_secs: 32 },
    { role: "user", message: "Gibt es die Möglichkeit, den Rabatt zu verlängern bei einem Zweijahresvertrag?", time_in_call_secs: 40 },
    { role: "agent", message: "Das kann ich gerne für Sie prüfen. Ich gebe das an unser Vertriebsteam weiter und wir melden uns bis morgen.", time_in_call_secs: 46 },
    { role: "user", message: "Das wäre toll. Wir würden gerne nächste Woche eine Entscheidung treffen.", time_in_call_secs: 53 },
    { role: "agent", message: "Perfekt. Wir melden uns spätestens morgen Nachmittag bei Ihnen. Auf Wiedersehen!", time_in_call_secs: 58 },
    { role: "user", message: "Danke, auf Wiedersehen.", time_in_call_secs: 63 },
  ],
  analysis: {
    call_successful: "success",
    transcript_summary: "Frau Schmidt hat Rückfragen zum Angebot, insbesondere zu Rabatten bei Zweijahresvertrag. Vertriebsteam meldet sich morgen.",
  },
  metadata: {
    termination_reason: "agent_ended_call",
  },
  _mock: { outcome: "callback-requested", delayMs: 16000 },
};

// 3. Successful call — answered
const appointmentReminder: MockConversation = {
  status: "done",
  call_duration_secs: 65,
  transcript: [
    { role: "agent", message: "Guten Tag, hier spricht der KI-Assistent der Praxis Dr. Weber. Spreche ich mit Herrn Bauer?", time_in_call_secs: 1 },
    { role: "user", message: "Ja, Bauer hier. Hallo.", time_in_call_secs: 5 },
    { role: "agent", message: "Herr Bauer, ich rufe an, um Sie an Ihren Termin am Donnerstag um 9:30 Uhr zu erinnern.", time_in_call_secs: 8 },
    { role: "user", message: "Ah, Donnerstag schon? Das hätte ich fast vergessen.", time_in_call_secs: 14 },
    { role: "agent", message: "Können Sie den Termin wahrnehmen, oder sollen wir umbuchen?", time_in_call_secs: 19 },
    { role: "user", message: "Moment, ich schaue kurz... Donnerstag 9:30, das passt eigentlich.", time_in_call_secs: 25 },
    { role: "agent", message: "Sehr gut. Bitte denken Sie daran, Ihre Versichertenkarte und den Überweisungsschein mitzubringen.", time_in_call_secs: 30 },
    { role: "user", message: "Alles klar. Wird gemacht. Danke für die Erinnerung!", time_in_call_secs: 37 },
    { role: "agent", message: "Gerne geschehen. Bis Donnerstag, Herr Bauer. Auf Wiedersehen!", time_in_call_secs: 42 },
    { role: "user", message: "Auf Wiedersehen!", time_in_call_secs: 46 },
  ],
  analysis: {
    call_successful: "success",
    transcript_summary: "Herr Bauer bestätigt seinen Termin am Donnerstag um 9:30 Uhr. Wurde an Versichertenkarte und Überweisung erinnert.",
  },
  metadata: {
    termination_reason: "agent_ended_call",
  },
  _mock: { outcome: "answered", delayMs: 14000 },
};

// 4. Satisfaction survey — answered
const satisfactionSurvey: MockConversation = {
  status: "done",
  call_duration_secs: 72,
  transcript: [
    { role: "agent", message: "Guten Tag, hier ist der KI-Assistent von CloudNet AG. Darf ich kurz mit Frau Müller sprechen?", time_in_call_secs: 1 },
    { role: "user", message: "Ja, Müller hier. Worum geht es?", time_in_call_secs: 5 },
    { role: "agent", message: "Frau Müller, Sie nutzen seit drei Monaten unseren Premium-Service. Wir würden gerne wissen, wie zufrieden Sie sind. Nur zwei bis drei Minuten.", time_in_call_secs: 9 },
    { role: "user", message: "Na gut, fragen Sie.", time_in_call_secs: 16 },
    { role: "agent", message: "Wie zufrieden sind Sie insgesamt, auf einer Skala von 1 bis 10?", time_in_call_secs: 20 },
    { role: "user", message: "Ich würde sagen, eine 8. Die Leistung ist gut, aber die Dokumentation könnte besser sein.", time_in_call_secs: 27 },
    { role: "agent", message: "Danke. Würden Sie CloudNet an Kollegen weiterempfehlen?", time_in_call_secs: 33 },
    { role: "user", message: "Ja, auf jeden Fall. Wir haben es schon zwei Partnern empfohlen.", time_in_call_secs: 39 },
    { role: "agent", message: "Letzte Frage: Gibt es eine Funktion, die Sie sich wünschen würden?", time_in_call_secs: 44 },
    { role: "user", message: "Ein besseres Dashboard für die Echtzeitanalyse wäre toll.", time_in_call_secs: 50 },
    { role: "agent", message: "Notiert. Vielen Dank für Ihr Feedback, Frau Müller!", time_in_call_secs: 55 },
    { role: "user", message: "Gerne. Schönen Tag noch!", time_in_call_secs: 60 },
  ],
  analysis: {
    call_successful: "success",
    transcript_summary: "Frau Müller gibt Zufriedenheit 8/10. Empfiehlt CloudNet weiter. Wünscht sich besseres Echtzeit-Dashboard.",
  },
  metadata: {
    termination_reason: "agent_ended_call",
  },
  _mock: { outcome: "answered", delayMs: 15000 },
};

// 5. No answer — nobody picks up
const noAnswer: MockConversation = {
  status: "done",
  call_duration_secs: 30,
  transcript: [],
  analysis: {
    call_successful: "failure",
    transcript_summary: "Anruf wurde nicht entgegengenommen. Kein Kontakt hergestellt.",
  },
  metadata: {
    termination_reason: "no_answer",
  },
  _mock: { outcome: "no-answer", delayMs: 8000 },
};

// 6. Voicemail
const voicemailCall: MockConversation = {
  status: "done",
  call_duration_secs: 25,
  transcript: [
    { role: "user", message: "Sie sind verbunden mit der Mobilbox. Bitte hinterlassen Sie eine Nachricht nach dem Signalton.", time_in_call_secs: 8 },
    { role: "agent", message: "Guten Tag, hier spricht der KI-Assistent. Wir wollten uns bezüglich Ihrer Anfrage melden. Bitte rufen Sie uns zurück. Vielen Dank.", time_in_call_secs: 12 },
    { role: "agent", message: "", time_in_call_secs: 22, tool_calls: [{ tool_name: "end_call" }], tool_results: [{ type: "system", system: { type: "end_call_success", reason: "voicemail_detected" } }] },
  ],
  analysis: {
    call_successful: "unknown",
    transcript_summary: "Mailbox erreicht. Nachricht hinterlassen mit Bitte um Rückruf.",
  },
  metadata: {
    termination_reason: "voicemail_detected",
    features_usage: { transfer_to_number: { enabled: true, used: false } },
  },
  _mock: { outcome: "voicemail", delayMs: 7000 },
};

// 7. Line busy
const busyCall: MockConversation = {
  status: "failed",
  call_duration_secs: 5,
  transcript: [],
  analysis: {
    call_successful: "failure",
    transcript_summary: "Leitung war besetzt. Kein Kontakt hergestellt.",
  },
  metadata: {
    termination_reason: "line_busy",
  },
  _mock: { outcome: "busy", delayMs: 5000 },
};

// 8. Transfer to human — agent triggers transfer_to_number tool
const transferToHuman: MockConversation = {
  status: "done",
  call_duration_secs: 48,
  transcript: [
    { role: "agent", message: "Guten Tag, hier spricht der KI-Assistent von TechVision. Spreche ich mit Herrn Müller?", time_in_call_secs: 1 },
    { role: "user", message: "Ja, Müller hier.", time_in_call_secs: 5 },
    { role: "agent", message: "Herr Müller, ich rufe an bezüglich Ihres Vertrags. Darf ich Ihnen kurz unser neues Angebot vorstellen?", time_in_call_secs: 8 },
    { role: "user", message: "Hm, ich habe da einige spezifische Fragen. Kann ich mit einem echten Mitarbeiter sprechen?", time_in_call_secs: 15 },
    { role: "agent", message: "Natürlich, ich verstehe. Ich verbinde Sie gerne mit einem Kollegen. Einen Moment bitte.", time_in_call_secs: 20 },
    { role: "user", message: "Ja bitte, das wäre mir lieber.", time_in_call_secs: 26 },
    {
      role: "agent",
      message: "Ich leite Sie jetzt weiter. Bitte bleiben Sie dran.",
      time_in_call_secs: 30,
      tool_calls: [{ tool_name: "transfer_to_number", tool_id: "tool_transfer_001" }],
      tool_results: [{
        type: "system",
        tool_name: "transfer_to_number",
        system: {
          type: "transfer_to_number_twilio_success",
          transfer_number: "+4930123456789",
          reason: "Kunde möchte mit einem menschlichen Mitarbeiter sprechen",
          agent_message: "Ich verbinde Sie jetzt mit einem Kollegen.",
        },
      }],
    },
  ],
  analysis: {
    call_successful: "success",
    transcript_summary: "Herr Müller wünscht Gespräch mit menschlichem Mitarbeiter bezüglich Vertragsfragen. Anruf wurde erfolgreich an Operator weitergeleitet.",
  },
  metadata: {
    termination_reason: "transfer",
    features_usage: {
      transfer_to_number: { enabled: true, used: true },
      transfer_to_agent: { enabled: false, used: false },
    },
  },
  _mock: { outcome: "transferred", delayMs: 12000 },
};

export const sampleConversations: MockConversation[] = [
  demoScheduling,      // 0: meeting-booked
  quoteFollowUp,       // 1: callback-requested
  appointmentReminder, // 2: answered
  satisfactionSurvey,  // 3: answered
  noAnswer,            // 4: no-answer
  voicemailCall,       // 5: voicemail
  busyCall,            // 6: busy
  transferToHuman,     // 7: transferred
];

// Index constants
export const CONV_MEETING_BOOKED = 0;
export const CONV_CALLBACK = 1;
export const CONV_ANSWERED_1 = 2;
export const CONV_ANSWERED_2 = 3;
export const CONV_NO_ANSWER = 4;
export const CONV_VOICEMAIL = 5;
export const CONV_BUSY = 6;
export const CONV_TRANSFER = 7;

// Legacy aliases for backwards compatibility during migration
export type TranscriptLine = { speaker: "agent" | "contact"; text: string; delayMs: number };
export type TranscriptScript = TranscriptLine[];

// Convert ElevenLabs transcript to display lines for the live transcript UI
export function toDisplayLines(conversation: MockConversation): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let prevTime = 0;
  for (const entry of conversation.transcript) {
    if (!entry.message) continue;
    const delayMs = Math.max(800, (entry.time_in_call_secs - prevTime) * 1000);
    lines.push({
      speaker: entry.role === "user" ? "contact" : "agent",
      text: entry.message,
      delayMs,
    });
    prevTime = entry.time_in_call_secs;
  }
  return lines;
}

// Legacy exports — map to new format for pages that still import old names
export const sampleTranscripts: TranscriptScript[] = sampleConversations.map(toDisplayLines);
export const TRANSCRIPT_NO_ANSWER = CONV_NO_ANSWER;
export const TRANSCRIPT_VOICEMAIL = CONV_VOICEMAIL;
export const TRANSCRIPT_BUSY = CONV_BUSY;
export const TRANSCRIPT_TRANSFER = CONV_TRANSFER;
