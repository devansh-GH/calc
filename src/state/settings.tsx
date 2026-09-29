import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../storage/keys";
import { getJSON, setJSON } from "../storage/storage";
import type { AppSettings } from "../types";

export const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputCurrency: "INR",
  decimalPrecision: 2,
  showEquivalents: true,
  showKeypad: true,
  haptics: true,
};

interface SettingsState extends AppSettings {
  update: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsState>({ ...DEFAULT_SETTINGS, update: () => {} });

function sanitize(stored: unknown): AppSettings {
  if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
  const s = stored as Record<string, unknown>;
  return {
    defaultOutputCurrency:
      typeof s.defaultOutputCurrency === "string" && s.defaultOutputCurrency.length === 3
        ? s.defaultOutputCurrency.toUpperCase()
        : "INR",
    decimalPrecision:
      typeof s.decimalPrecision === "number" && s.decimalPrecision >= 0 && s.decimalPrecision <= 6
        ? Math.round(s.decimalPrecision)
        : 2,
    showEquivalents: s.showEquivalents !== false,
    showKeypad: s.showKeypad !== false,
    haptics: s.haptics !== false,
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getJSON<unknown>(STORAGE_KEYS.settings).then((stored) => {
      if (stored) setSettings(sanitize(stored));
    });
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = sanitize({ ...prev, ...patch });
      void setJSON(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsState>(() => ({ ...settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  return useContext(SettingsContext);
}
