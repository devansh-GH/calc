import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { AppShell } from "@/navigation/AppShell";
import { preloadCaches } from "@/query/useRates";
import { ExpressionProvider } from "@/state/expression";
import { SettingsProvider } from "@/state/settings";
import { ThemeProvider, useTheme } from "@/state/theme";

void SplashScreen.preventAutoHideAsync();

function RootShell() {
  const { resolved } = useTheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GluestackUIProvider mode={resolved}>
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: { flex: 1, backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="about" />
        </Stack>
      </AppShell>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    preloadCaches();
  }, []);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <ExpressionProvider>
          <RootShell />
        </ExpressionProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
