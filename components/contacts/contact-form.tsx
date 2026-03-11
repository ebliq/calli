"use client";

import type { Contact, CustomProperty } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactFormProps {
  contact: Partial<Contact>;
  onChange: (updates: Partial<Contact>) => void;
  customProperties?: CustomProperty[];
}

export function ContactForm({ contact, onChange, customProperties = [] }: ContactFormProps) {
  function set<K extends keyof Contact>(key: K, value: Contact[K]) {
    onChange({ [key]: value } as Partial<Contact>);
  }

  function setCustomProp(key: string, value: string | number | boolean) {
    onChange({
      customProperties: {
        ...contact.customProperties,
        [key]: value,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Grunddaten */}
      <div>
        <p className="text-xs font-medium mb-2">Grunddaten</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Anrede</Label>
            <Select
              value={contact.salutation ?? ""}
              onValueChange={(v) => set("salutation", v || undefined)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="–" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Herr">Herr</SelectItem>
                <SelectItem value="Frau">Frau</SelectItem>
                <SelectItem value="Divers">Divers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Titel</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Dr., Prof."
              value={contact.title ?? ""}
              onChange={(e) => set("title", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vorname *</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Max"
              value={contact.firstName ?? ""}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nachname *</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Mustermann"
              value={contact.lastName ?? ""}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Kontakt + Firma */}
      <div>
        <p className="text-xs font-medium mb-2">Kontakt & Firma</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Telefon *</Label>
            <Input
              className="h-8 text-sm"
              placeholder="+49 172 1234567"
              value={contact.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mobil</Label>
            <Input
              className="h-8 text-sm"
              placeholder="+49 151 1234567"
              value={contact.phoneMobile ?? ""}
              onChange={(e) => set("phoneMobile", e.target.value || undefined)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">E-Mail</Label>
            <Input
              className="h-8 text-sm"
              type="email"
              placeholder="max@firma.de"
              value={contact.email ?? ""}
              onChange={(e) => set("email", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Firma</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Firma GmbH"
              value={contact.company ?? ""}
              onChange={(e) => set("company", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Position</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Geschäftsführer"
              value={contact.position ?? ""}
              onChange={(e) => set("position", e.target.value || undefined)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Abteilung</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Vertrieb"
              value={contact.department ?? ""}
              onChange={(e) => set("department", e.target.value || undefined)}
            />
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div>
        <p className="text-xs font-medium mb-2">Adresse</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Straße</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Musterstraße 1"
              value={contact.street ?? ""}
              onChange={(e) => set("street", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PLZ</Label>
            <Input
              className="h-8 text-sm"
              placeholder="12345"
              value={contact.zip ?? ""}
              onChange={(e) => set("zip", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stadt</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Berlin"
              value={contact.city ?? ""}
              onChange={(e) => set("city", e.target.value || undefined)}
            />
          </div>
        </div>
      </div>

      {/* Anruf + Sonstiges */}
      <div>
        <p className="text-xs font-medium mb-2">Anruf & Sonstiges</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Anrufgrund</Label>
            <Textarea
              className="text-sm min-h-0"
              placeholder="Warum wird dieser Kontakt angerufen..."
              value={contact.callReason ?? ""}
              onChange={(e) => set("callReason", e.target.value || undefined)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bevorzugte Anrufzeit</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Mo-Fr, 9-12 Uhr"
              value={contact.preferredCallTime ?? ""}
              onChange={(e) => set("preferredCallTime", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sprache</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Deutsch"
              value={contact.language ?? ""}
              onChange={(e) => set("language", e.target.value || undefined)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Notizen</Label>
            <Textarea
              className="text-sm min-h-0"
              placeholder="Optionale Notizen..."
              value={contact.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || undefined)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags (kommagetrennt)</Label>
            <Input
              className="h-8 text-sm"
              placeholder="VIP, Premium"
              value={contact.tags?.join(", ") ?? ""}
              onChange={(e) => {
                const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                set("tags", tags.length > 0 ? tags : undefined);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quelle</Label>
            <Input
              className="h-8 text-sm"
              placeholder="manual, import"
              value={contact.source ?? ""}
              onChange={(e) => set("source", e.target.value || undefined)}
            />
          </div>
        </div>
      </div>

      {/* Benutzerdefinierte Felder */}
      {customProperties.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2">Benutzerdefinierte Felder</p>
          <div className="grid grid-cols-4 gap-3">
            {customProperties.map((prop) => {
              const val = contact.customProperties?.[prop.key];
              if (prop.type === "boolean") {
                return (
                  <div key={prop.id} className="flex items-center gap-2 col-span-2">
                    <Switch
                      checked={val === true}
                      onCheckedChange={(checked) => setCustomProp(prop.key, checked)}
                    />
                    <Label className="text-xs">{prop.name}</Label>
                  </div>
                );
              }
              return (
                <div key={prop.id} className="space-y-1">
                  <Label className="text-xs">{prop.name}</Label>
                  <Input
                    className="h-8 text-sm"
                    type={prop.type === "number" ? "number" : "text"}
                    value={val !== undefined ? String(val) : ""}
                    onChange={(e) =>
                      setCustomProp(prop.key, prop.type === "number" && e.target.value ? Number(e.target.value) : e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
