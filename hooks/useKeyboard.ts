import { useEffect } from "react";

export enum KeyboardKey {
  Control = "Control",
  Shift = "Shift",
  Alt = "Alt",
  Z = "z",
  S = "s",
}

export enum ShortcutType {
  ActivationSequence = "ActivationSequence",
}

interface ShortcutPattern {
  type: ShortcutType;
  activationKey: KeyboardKey;
  keys: KeyboardKey[];
  maxInterval: number;
}

interface Shortcut {
  id: string;
  pattern: ShortcutPattern;
  handler: () => void;
}

interface UseKeyboardOptions {
  shortcuts: Shortcut[];
  stateDurationMs: number;
}

export default function useKeyboard(_options: UseKeyboardOptions) {
  useEffect(() => {
    // Stub: keyboard shortcuts not implemented
  }, []);
}
