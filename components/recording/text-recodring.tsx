"use client";

import * as React from "react";

import useAzureSpeechv2 from "hooks/useAzureSpeech-v2";
import useKeyboard, { KeyboardKey, ShortcutType } from "hooks/useKeyboard";

import * as Icon from "lucide-react";

import { Button } from "components/ui/button";
import { Textarea } from "components/ui/textarea";
import * as Kbd from "components/ui/kbd";
import * as Popover from "components/ui/popover";
import * as Tooltip from "components/ui/tooltip";

import { AnimatedMicIcon } from "./animated-mic-icon";
import { DisplayRecordingState, RecordingState } from "./recording-state";

import { useToast } from "components/toast/use-toast";

import MDEditor from "@uiw/react-md-editor";

import * as Flags from "./flags";
import { simpleAiTranslation } from "@/lib/api/ai-services/translation/api-client";

export interface CustomText {
  submitButton: string;
  headline: string;
}

const lang = [
  { code: "auto", label: "Auto Detect", Flag: Flags.AutoDetectIcon },
  { code: "de-DE", label: "Deutsch", Flag: Flags.GermanFlag },
  { code: "en-GB", label: "English", Flag: Flags.EnglishFlag },
  { code: "pl-PL", label: "Polski", Flag: Flags.PolishFlag },
  { code: "ru-RU", label: "Русский", Flag: Flags.RussianFlag },
  { code: "bg-BG", label: "Български", Flag: Flags.BulgarianFlag },
  { code: "hr-HR", label: "Hrvatski", Flag: Flags.CroatianFlag },
] as const;

type languageCode = (typeof lang)[number]["code"];

interface GetValues {
  original: string;
  translation: string | null;
  sourceLanguage: string;
}

export interface TextRecordRef {
  getValues: () => GetValues;
  setText: (value: string) => void;
  stopRecording: () => void;
  subscribe: (cb: (value: string) => void) => () => void | undefined;
  reset: () => void;
}

export interface TextRecordProps {
  headline: string;
  allowPreview?: boolean;
  children: React.ReactNode;
  allowedLanguages?: languageCode[];
}

const TextRecord = React.forwardRef<TextRecordRef, TextRecordProps>(
  function TextRecord(
    { children, headline, allowPreview = false, allowedLanguages },
    ref
  ) {
    const { toast } = useToast();

    const [selectedLanguage, setSelectedLanguage] =
      React.useState<languageCode>("de-DE");
    const [preview, setPreview] = React.useState<boolean>(false);

    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const textAreaTranslationRef = React.useRef<HTMLTextAreaElement>(null);

    function getValues(): GetValues {
      return {
        original: textAreaRef.current?.value || "",
        translation: textAreaTranslationRef.current?.value || null,
        sourceLanguage: selectedLanguage,
      };
    }

    function stopRecording() {
      handleStopRecording();
    }

    function reset() {
      if (textAreaRef.current) {
        textAreaRef.current.value = "";
      }
      if (textAreaTranslationRef.current) {
        textAreaTranslationRef.current.value = "";
      }
    }

    function setText(value: string) {
      if (textAreaRef.current) {
        textAreaRef.current.value = value;
      }
    }

    // Expose ref methods
    React.useImperativeHandle(ref, () => ({
      getValues,
      setText,
      subscribe: (cb: (value: string) => void) => {
        const handler = () => cb(textAreaRef.current?.value || "");
        textAreaRef.current?.addEventListener("input", handler);
        return () => textAreaRef.current?.removeEventListener("input", handler);
      },
      stopRecording,
      reset,
    }));

    function processText(textToProcess: string) {
      if (textAreaRef.current) {
        const cursorPosition = textAreaRef.current.selectionStart;
        const textBeforeCursor = textAreaRef.current.value.substring(
          0,
          cursorPosition
        );
        const textAfterCursor =
          textAreaRef.current.value.substring(cursorPosition);

        const newValue =
          textBeforeCursor + textToProcess + " " + textAfterCursor;
        textAreaRef.current.value = newValue;
        const event = new Event("input", { bubbles: true });
        textAreaRef.current.dispatchEvent(event);

        textAreaRef.current.setSelectionRange(
          cursorPosition + textToProcess.length + 1,
          cursorPosition + textToProcess.length + 1
        );
      }
    }

    const {
      handleStartRecording,
      handlePauseResume,
      handleStop: handleStopRecording,
      recordingState: isRecording,
      stream,
    } = useAzureSpeechv2({
      selectedLanguage,
      enableDiarization: false,
      transcribed(sender, event) {
        const text = event.result.text.trim();
        if (!text) return;
        processText(text);
      },
    });

    // Track previous language to detect changes
    const prevLanguageRef = React.useRef<languageCode>(selectedLanguage);
    const isRestartingRef = React.useRef<boolean>(false);
    const shouldStartPausedRef = React.useRef<boolean>(false);

    // Effects
    React.useEffect(() => {
      if (isRecording === RecordingState.Error) {
        toast({
          title: "Fehler bei der Aufnahme",
          description:
            "Die Aufnahme konnte nicht gestartet werden. Bitte überprüfen Sie auch ihre Mikrofoneinstellungen und versuchen Sie es erneut.",
          variant: "destructive",
        });
      }
    }, [isRecording, toast]);

    // Wenn die Aufnahme pausiert wurde, während die Aufnahme läuft
    React.useEffect(() => {
      if (
        shouldStartPausedRef.current &&
        isRecording === RecordingState.Recording &&
        isRestartingRef.current
      ) {
        // Recording has started, now pause it to maintain "Aufnahme pausiert" state
        handlePauseResume();
        shouldStartPausedRef.current = false;
        isRestartingRef.current = false;
      }
    }, [isRecording, handlePauseResume]);

    // Wenn die Sprache geändert wird, während die Aufnahme läuft
    React.useEffect(() => {
      // Skip on initial render or if already restarting
      if (
        prevLanguageRef.current === selectedLanguage ||
        isRestartingRef.current
      ) {
        return;
      }

      if (
        isRecording === RecordingState.Recording ||
        isRecording === RecordingState.Paused
      ) {
        const wasPaused = isRecording === RecordingState.Paused;
        isRestartingRef.current = true;
        shouldStartPausedRef.current = wasPaused;

        handleStopRecording();

        setTimeout(() => {
          handleStartRecording();
          // Wenn es nicht pausiert war, markiere das Neustarten als vollständig nach der Aufnahme
          if (!wasPaused) {
            setTimeout(() => {
              isRestartingRef.current = false;
            }, 300);
          }
        }, 200);
      }

      // Update the ref for next comparison
      prevLanguageRef.current = selectedLanguage;
    }, [selectedLanguage, isRecording]);

    function handleRecordingButton() {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
      if (
        isRecording === RecordingState.notStarted ||
        isRecording === RecordingState.Stopped
      ) {
        startRecording();
        return;
      }
      handlePauseResume();
    }

    function startRecording() {
      handleStartRecording();
    }

    const keyEvent = React.useCallback(() => {
      toast({
        title:
          isRecording === RecordingState.notStarted
            ? "Starte Diktat"
            : "Pausiere/Setze Diktat fort",
        description: (
          <p className="text-muted-foreground text-sm mb-2">
            <Kbd.KbdGroup>
              <Kbd.Kbd>Ctrl</Kbd.Kbd>
              <span>+</span>
              <Kbd.Kbd>Z + Z</Kbd.Kbd>
            </Kbd.KbdGroup>
          </p>
        ),
      });
      handleRecordingButton();
    }, [isRecording, toast, handleRecordingButton]);

    useKeyboard({
      shortcuts: [
        {
          id: "control-press-z-and-z",
          pattern: {
            type: ShortcutType.ActivationSequence,
            activationKey: KeyboardKey.Control,
            keys: [KeyboardKey.Z, KeyboardKey.Z],
            maxInterval: 250,
          },
          handler: keyEvent,
        },
        {
          id: "control-press-s",
          pattern: {
            type: ShortcutType.ActivationSequence,
            activationKey: KeyboardKey.Control,
            keys: [KeyboardKey.S],
            maxInterval: 250,
          },
          handler: () => {
            stopRecording();
          },
        },
      ],
      stateDurationMs: 5000,
    });

    async function translateText() {
      const { id, update } = toast({
        title: "Übersetzung läuft...",
        description: "Bitte warten Sie einen Moment.",
        variant: "default",
      });
      if (!textAreaRef.current || !textAreaTranslationRef.current) return;
      const sourceText = textAreaRef.current.value;
      const translatedText = await simpleAiTranslation({
        text: sourceText,
        sourceLanguage: selectedLanguage,
        targetLanguage: "de-DE",
      });
      if (!translatedText.success) {
        update({
          id,
          title: "Übersetzungsfehler",
          description:
            "Die Übersetzung konnte nicht durchgeführt werden. Bitte versuchen Sie es erneut.",
          variant: "destructive",
          icon: <Icon.AlertCircleIcon />,
        });
        return;
      }
      update({
        id,
        title: "Übersetzung erfolgreich",
        description: "Der Text wurde erfolgreich übersetzt.",
        variant: "success",
        icon: <Icon.CheckCircle2Icon />,
      });
      const { translation } = translatedText.data;
      textAreaTranslationRef.current.value = translation;
    }

    function RenderTranslationButton() {
      return (
        <Button
          variant="outline"
          disabled={selectedLanguage === "de-DE"}
          onClick={translateText}
        >
          <Icon.Languages className="inline-block mr-1" />
          Übersetzen
        </Button>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center">
        <div className=" w-full space-y-4">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {headline}
            </h1>
            <DisplayRecordingState recordingState={isRecording} />
          </div>
          {/* Recording Button */}
          <Tooltip.Tooltip>
            <div className="flex justify-center">
              <Tooltip.TooltipTrigger asChild>
                <button
                  onClick={handleRecordingButton}
                  className="relative w-32 h-32 p-0 m-0 border-2 border-blue-400 rounded-full focus:outline-none flex items-center justify-center"
                >
                  <AnimatedMicIcon state={isRecording} size={48} />
                </button>
              </Tooltip.TooltipTrigger>
            </div>
            <Tooltip.TooltipContent>
              <p className="mb-2">
                <Icon.Volume2Icon className="inline-block mr-1" />
                Sprechen Sie natürlich
              </p>
              <p className="mb-2">
                <Icon.AlertTriangleIcon className="inline-block mr-1" /> Das
                Einsprechen von Satzzeichen ist nicht erforderlich
              </p>
              <p>
                <Icon.KeyboardIcon className="inline-block mr-1" /> Das Starten,
                Pausieren und Stoppen ist mit Tastenkombinationen möglich
              </p>
            </Tooltip.TooltipContent>
          </Tooltip.Tooltip>

          {/* Transcription Display */}
          <div className="bg-background rounded-xl shadow-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 md:gap-8 w-full items-center">
                {/* Column 1: Icon and Text */}
                <div className="flex items-center gap-2">
                  <Icon.ChartBarDecreasingIcon className="h-5 w-5 text-blue-500" />
                  <span>Transkription</span>
                </div>

                {/* Column 2: Language Flags */}
                <div className="flex items-center gap-2">
                  {lang
                    .filter((item) =>
                      allowedLanguages
                        ? allowedLanguages.includes(item.code)
                        : true
                    )
                    .map((item) => {
                      const { code, label, Flag } = item;
                      return (
                        <Tooltip.Tooltip key={code}>
                          <Tooltip.TooltipTrigger asChild>
                            <button
                              className={`relative w-8 h-8 rounded-full overflow-hidden border-2 transition-colors ${
                                selectedLanguage === code
                                  ? "border-primary shadow-lg"
                                  : "border-border"
                              }`}
                              onClick={() => setSelectedLanguage(code)}
                            >
                              <div className="absolute inset-0 flex items-center justify-center scale-[2.2]">
                                {Flag}
                              </div>
                            </button>
                          </Tooltip.TooltipTrigger>
                          <Tooltip.TooltipContent>
                            <span>{label}</span>
                          </Tooltip.TooltipContent>
                        </Tooltip.Tooltip>
                      );
                    })}
                </div>

                {/* Column 3: Keyboard Popover */}
                <div className="md:justify-self-end">
                  {allowPreview && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreview((v) => !v);
                      }}
                    >
                      <Icon.TextSelectIcon className="inline-block mr-1" />
                      {preview ? "Bearbeiten" : "Vorschau"}
                    </Button>
                  )}
                  {RenderTranslationButton()}
                  <Popover.Popover>
                    <Popover.PopoverTrigger asChild>
                      <Button variant="outline">
                        <Icon.KeyboardIcon className="inline-block mr-1" />
                        Shortcuts
                      </Button>
                    </Popover.PopoverTrigger>
                    <Popover.PopoverContent className="w-80" side="right">
                      <p className="text-sm mb-2">
                        Nutze{" "}
                        <Kbd.KbdGroup>
                          <Kbd.Kbd>Ctrl</Kbd.Kbd>
                          <span>+</span>
                          <Kbd.Kbd>Z + Z</Kbd.Kbd>
                        </Kbd.KbdGroup>{" "}
                        um die Transkription zu starten oder zu pausieren.
                      </p>
                      <p className="text-sm mb-2">
                        Nutze{" "}
                        <Kbd.KbdGroup>
                          <Kbd.Kbd>Ctrl</Kbd.Kbd>
                          <span>+</span>
                          <Kbd.Kbd>Z + Z</Kbd.Kbd>
                        </Kbd.KbdGroup>{" "}
                        um die Transkription zu starten oder zu pausieren.
                      </p>
                    </Popover.PopoverContent>
                  </Popover.Popover>
                </div>
              </div>
            </h3>

            <div className="space-y-3 min-h-[120px] ">
              <Textarea
                className={`${preview ? "hidden" : ""} w-full`}
                placeholder="Ihre gesprochenen Worte erscheinen hier... | Text einfügen"
                ref={textAreaRef}
                rows={10}
              />

              {selectedLanguage === "de-DE" ? null : (
                <Textarea
                  className={`${preview ? "hidden" : ""} w-full`}
                  placeholder="Translation"
                  ref={textAreaTranslationRef}
                />
              )}

              <MDEditor.Markdown
                className={`${!preview ? "hidden" : ""} w-full p-4`}
                source={textAreaRef.current?.value || ""}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">{children}</div>
          </div>
        </div>
      </div>
    );
  }
);

export default TextRecord;
