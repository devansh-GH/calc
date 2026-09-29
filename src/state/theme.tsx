import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { Uniwind } from "uniwind";
import { STORAGE_KEYS } from "../storage/keys";
import { getJSON, setJSON } from "../storage/storage";
import type { ThemeMode } from "../types";

interface ThemeState {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  statusBarStyle: "light" | "dark";
}

const ThemeContext = createContext<ThemeState>({
  mode: "dark",
  resolved: "dark",
  setMode: () => {},
  statusBarStyle: "light",
});

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    Uniwind.setTheme("dark");
    getJSON<unknown>(STORAGE_KEYS.theme).then((stored) => {
      if (isThemeMode(stored)) {
        setModeState(stored);
        Uniwind.setTheme(stored);
      } else {
        setModeState("dark");
        Uniwind.setTheme("dark");
        void setJSON(STORAGE_KEYS.theme, "dark");
      }
      setReady(true);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    Uniwind.setTheme(next);
    void setJSON(STORAGE_KEYS.theme, next);
  }, []);

  useEffect(() => {
    if (!ready) return;
    Uniwind.setTheme(mode);
  }, [mode, ready]);

  const resolved = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const value = useMemo<ThemeState>(
    () => ({
      mode,
      resolved,
      setMode,
      statusBarStyle: resolved === "dark" ? "light" : "dark",
    }),
    [mode, resolved, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
