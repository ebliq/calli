export interface TranscriptLine {
  speaker: "agent" | "contact";
  text: string;
  delayMs: number; // delay before this line appears
}

export type TranscriptScript = TranscriptLine[];

// 1. Scheduling a product demo
const demoScheduling: TranscriptScript = [
  { speaker: "agent", text: "Guten Tag, hier spricht der KI-Assistent von TechVision GmbH. Spreche ich mit Herrn Meier?", delayMs: 800 },
  { speaker: "contact", text: "Ja, Meier hier. Worum geht es?", delayMs: 2200 },
  { speaker: "agent", text: "Wunderbar. Sie hatten auf unserer Webseite Interesse an unserer Automatisierungsplattform gezeigt.", delayMs: 1800 },
  { speaker: "contact", text: "Ah ja, stimmt. Ich habe mir das letzte Woche angeschaut.", delayMs: 2000 },
  { speaker: "agent", text: "Genau. Ich wollte Ihnen gerne eine persoenliche Demo anbieten, damit Sie die Funktionen live sehen koennen.", delayMs: 1600 },
  { speaker: "contact", text: "Das klingt gut. Wie lange dauert so eine Demo?", delayMs: 2400 },
  { speaker: "agent", text: "In der Regel etwa 30 Minuten. Wir zeigen Ihnen die wichtigsten Workflows und beantworten Ihre Fragen.", delayMs: 1500 },
  { speaker: "contact", text: "Okay. Naechste Woche waere gut. Dienstag oder Mittwoch vielleicht?", delayMs: 2200 },
  { speaker: "agent", text: "Dienstag um 10 Uhr oder 14 Uhr waere verfuegbar. Was passt Ihnen besser?", delayMs: 1800 },
  { speaker: "contact", text: "14 Uhr waere perfekt.", delayMs: 1400 },
  { speaker: "agent", text: "Sehr gut. Ich trage Dienstag, 14 Uhr ein. Sie bekommen eine Kalendereinladung per E-Mail.", delayMs: 1600 },
  { speaker: "contact", text: "Super, vielen Dank.", delayMs: 1200 },
  { speaker: "agent", text: "Gerne! Bis Dienstag dann. Auf Wiedersehen, Herr Meier.", delayMs: 1500 },
  { speaker: "contact", text: "Auf Wiedersehen!", delayMs: 1000 },
];

// 2. Following up on a quote / Angebot
const quoteFollowUp: TranscriptScript = [
  { speaker: "agent", text: "Guten Tag, hier ist der KI-Assistent von DataFlow Solutions. Kann ich bitte mit Frau Schmidt sprechen?", delayMs: 800 },
  { speaker: "contact", text: "Am Apparat. Was kann ich fuer Sie tun?", delayMs: 2000 },
  { speaker: "agent", text: "Frau Schmidt, wir hatten Ihnen am 15. ein Angebot fuer unser Enterprise-Paket zugeschickt. Ich wollte hoeflich nachfragen.", delayMs: 1800 },
  { speaker: "contact", text: "Ja, ich habe das Angebot gesehen. Wir sind noch in der internen Abstimmung.", delayMs: 2200 },
  { speaker: "agent", text: "Verstehe. Gibt es offene Fragen, bei denen ich helfen kann?", delayMs: 1600 },
  { speaker: "contact", text: "Tatsaechlich ja. Die Lizenzkosten fuer das zweite Jahr sind uns nicht ganz klar.", delayMs: 2400 },
  { speaker: "agent", text: "Im zweiten Jahr gilt der regulaere Preis von 890 Euro pro Monat. Im ersten Jahr haben Sie den Einfuehrungsrabatt von 20 Prozent.", delayMs: 1500 },
  { speaker: "contact", text: "Gibt es die Moeglichkeit, den Rabatt zu verlaengern bei einem Zweijahresvertrag?", delayMs: 2000 },
  { speaker: "agent", text: "Das kann ich gerne fuer Sie pruefen. Ich gebe das an unser Vertriebsteam weiter und wir melden uns bis morgen.", delayMs: 1800 },
  { speaker: "contact", text: "Das waere toll. Wir wuerden gerne naechste Woche eine Entscheidung treffen.", delayMs: 2200 },
  { speaker: "agent", text: "Perfekt. Wir melden uns spaetestens morgen Nachmittag bei Ihnen. Kann ich sonst noch etwas fuer Sie tun?", delayMs: 1600 },
  { speaker: "contact", text: "Nein, das war alles. Danke fuer den Anruf.", delayMs: 1400 },
  { speaker: "agent", text: "Vielen Dank, Frau Schmidt. Einen schoenen Tag noch!", delayMs: 1200 },
];

// 3. Appointment reminder
const appointmentReminder: TranscriptScript = [
  { speaker: "agent", text: "Guten Tag, hier spricht der KI-Assistent der Praxis Dr. Weber. Spreche ich mit Herrn Bauer?", delayMs: 800 },
  { speaker: "contact", text: "Ja, Bauer hier. Hallo.", delayMs: 1800 },
  { speaker: "agent", text: "Herr Bauer, ich rufe an, um Sie an Ihren Termin am Donnerstag um 9:30 Uhr zu erinnern.", delayMs: 1600 },
  { speaker: "contact", text: "Ah, Donnerstag schon? Das haette ich fast vergessen.", delayMs: 2200 },
  { speaker: "agent", text: "Koennen Sie den Termin wahrnehmen, oder sollen wir umbuchen?", delayMs: 1500 },
  { speaker: "contact", text: "Moment, ich schaue kurz... Donnerstag 9:30, das passt eigentlich.", delayMs: 2400 },
  { speaker: "agent", text: "Sehr gut. Bitte denken Sie daran, Ihre Versichertenkarte und den Ueberweisungsschein mitzubringen.", delayMs: 1800 },
  { speaker: "contact", text: "Alles klar. Muss ich vorher noch etwas beachten?", delayMs: 2000 },
  { speaker: "agent", text: "Bitte kommen Sie nuechtern, also ab 22 Uhr am Vorabend nichts mehr essen oder trinken.", delayMs: 1600 },
  { speaker: "contact", text: "Verstanden. Nuechtern ab 22 Uhr, Versichertenkarte und Ueberweisung.", delayMs: 2200 },
  { speaker: "agent", text: "Genau. Falls Sie doch absagen muessen, rufen Sie bitte bis Mittwoch 16 Uhr an.", delayMs: 1500 },
  { speaker: "contact", text: "Wird gemacht. Danke fuer die Erinnerung!", delayMs: 1400 },
  { speaker: "agent", text: "Gerne geschehen. Bis Donnerstag, Herr Bauer. Auf Wiedersehen!", delayMs: 1200 },
  { speaker: "contact", text: "Auf Wiedersehen!", delayMs: 1000 },
];

// 4. Customer satisfaction survey
const satisfactionSurvey: TranscriptScript = [
  { speaker: "agent", text: "Guten Tag, hier ist der KI-Assistent von CloudNet AG. Darf ich kurz mit Frau Mueller sprechen?", delayMs: 800 },
  { speaker: "contact", text: "Ja, Mueller hier. Worum geht es?", delayMs: 2000 },
  { speaker: "agent", text: "Frau Mueller, Sie nutzen seit drei Monaten unseren Premium-Service. Wir wuerden gerne wissen, wie zufrieden Sie sind.", delayMs: 1800 },
  { speaker: "contact", text: "Ach so, eine Umfrage. Wie lange dauert das?", delayMs: 2200 },
  { speaker: "agent", text: "Nur zwei bis drei Minuten. Drei kurze Fragen.", delayMs: 1400 },
  { speaker: "contact", text: "Na gut, fragen Sie.", delayMs: 1600 },
  { speaker: "agent", text: "Wie zufrieden sind Sie insgesamt mit unserem Service, auf einer Skala von 1 bis 10?", delayMs: 1500 },
  { speaker: "contact", text: "Ich wuerde sagen, eine 8. Die Leistung ist gut, aber die Dokumentation koennte besser sein.", delayMs: 2400 },
  { speaker: "agent", text: "Danke. Wuerden Sie CloudNet an Kollegen oder Partner weiterempfehlen?", delayMs: 1600 },
  { speaker: "contact", text: "Ja, auf jeden Fall. Wir haben es schon zwei Partnern empfohlen.", delayMs: 2000 },
  { speaker: "agent", text: "Das freut uns sehr. Letzte Frage: Gibt es eine Funktion, die Sie sich wuenschen wuerden?", delayMs: 1800 },
  { speaker: "contact", text: "Ein besseres Dashboard fuer die Echtzeitanalyse waere toll.", delayMs: 2200 },
  { speaker: "agent", text: "Notiert. Vielen Dank fuer Ihr Feedback, Frau Mueller. Das hilft uns sehr weiter.", delayMs: 1500 },
  { speaker: "contact", text: "Gerne. Schoenen Tag noch!", delayMs: 1200 },
  { speaker: "agent", text: "Danke, Ihnen auch! Auf Wiedersehen.", delayMs: 1000 },
];

// 5. Nobody picks up - no answer
const noAnswer1: TranscriptScript = [
  { speaker: "agent", text: "Anruf wird aufgebaut...", delayMs: 800 },
  { speaker: "agent", text: "Freizeichen... (1)", delayMs: 2500 },
  { speaker: "agent", text: "Freizeichen... (2)", delayMs: 3000 },
  { speaker: "agent", text: "Freizeichen... (3)", delayMs: 3000 },
  { speaker: "agent", text: "Freizeichen... (4)", delayMs: 3000 },
  { speaker: "agent", text: "Kein Abnehmer. Anruf wird beendet.", delayMs: 2000 },
  { speaker: "agent", text: "Status: Nicht erreicht. Naechster Versuch wird eingeplant.", delayMs: 1500 },
];

// 6. Nobody picks up - goes to voicemail
const voicemail: TranscriptScript = [
  { speaker: "agent", text: "Anruf wird aufgebaut...", delayMs: 800 },
  { speaker: "agent", text: "Freizeichen... (1)", delayMs: 2500 },
  { speaker: "agent", text: "Freizeichen... (2)", delayMs: 3000 },
  { speaker: "agent", text: "Freizeichen... (3)", delayMs: 3000 },
  { speaker: "contact", text: "[Mailbox] Sie sind verbunden mit der Mobilbox. Bitte hinterlassen Sie eine Nachricht nach dem Signalton.", delayMs: 2500 },
  { speaker: "agent", text: "Guten Tag, hier spricht der KI-Assistent. Wir wollten uns bezueglich Ihrer Anfrage melden.", delayMs: 2000 },
  { speaker: "agent", text: "Bitte rufen Sie uns zurueck oder besuchen Sie unsere Webseite fuer weitere Informationen.", delayMs: 1800 },
  { speaker: "agent", text: "Vielen Dank und auf Wiedersehen.", delayMs: 1500 },
  { speaker: "agent", text: "Status: Mailbox besprochen. Rueckruf abwarten.", delayMs: 1200 },
];

// 7. Line busy
const lineBusy: TranscriptScript = [
  { speaker: "agent", text: "Anruf wird aufgebaut...", delayMs: 800 },
  { speaker: "agent", text: "Besetztzeichen empfangen.", delayMs: 2000 },
  { speaker: "agent", text: "Leitung ist besetzt. Anruf wird beendet.", delayMs: 1500 },
  { speaker: "agent", text: "Status: Besetzt. Erneuter Versuch in 5 Minuten.", delayMs: 1500 },
];

// 8. Transfer to human - customer insists on speaking to a real person
const transferToHuman: TranscriptScript = [
  { speaker: "agent", text: "Guten Tag, hier spricht der KI-Assistent von TechVision. Spreche ich mit Herrn Mueller?", delayMs: 800 },
  { speaker: "contact", text: "Ja, Mueller hier.", delayMs: 2200 },
  { speaker: "agent", text: "Herr Mueller, ich rufe an bezueglich Ihres Vertrags. Darf ich Ihnen kurz unser neues Angebot vorstellen?", delayMs: 1800 },
  { speaker: "contact", text: "Hm, ich habe da einige spezifische Fragen. Kann ich mit einem echten Mitarbeiter sprechen?", delayMs: 2500 },
  { speaker: "agent", text: "Natuerlich, ich verstehe. Ich verbinde Sie gerne mit einem Kollegen.", delayMs: 1600 },
  { speaker: "contact", text: "Ja bitte, das waere mir lieber.", delayMs: 2000 },
  { speaker: "agent", text: "Einen Moment bitte, ich leite Sie jetzt weiter...", delayMs: 1800 },
  { speaker: "agent", text: "[TRANSFER] Anruf wird an Operator uebergeben...", delayMs: 2000 },
];

export const sampleTranscripts: TranscriptScript[] = [
  demoScheduling,
  quoteFollowUp,
  appointmentReminder,
  satisfactionSurvey,
  noAnswer1,
  voicemail,
  lineBusy,
  transferToHuman,
];

// Index constants for transcript types
export const TRANSCRIPT_NO_ANSWER = 4;
export const TRANSCRIPT_VOICEMAIL = 5;
export const TRANSCRIPT_BUSY = 6;
export const TRANSCRIPT_TRANSFER = 7;
