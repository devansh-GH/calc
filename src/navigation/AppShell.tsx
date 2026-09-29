import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useTap } from "../components/ui";
import { useTheme } from "../state/theme";
import type { ThemeMode } from "../types";

export const NAV_ITEMS = [
  { label: "Calculator", path: "/", icon: "calculator-outline" },
  { label: "About", path: "/about", icon: "information-circle-outline" },
] as const;

const ICON_MUTED = "#94a3b8";
const ICON_PRIMARY = "#3b82f6";

function Logo() {
  return (
    <Box className="flex-row items-center gap-2.5">
      <Box className="h-9 w-9 items-center justify-center rounded-xl bg-primary dark:bg-primary">
        <Ionicons name="calculator" size={20} color="#fff" />
      </Box>
      <Box className="min-w-0 flex-1">
        <Text bold size="md" className="leading-5 text-foreground dark:text-foreground">
          SmartCalc
        </Text>
        <Text size="2xs" className="leading-4 text-muted-foreground dark:text-muted-foreground">
          Global Currency Calculator
        </Text>
      </Box>
    </Box>
  );
}

function NavList({ active, onNavigate }: { active: string; onNavigate: (path: string) => void }) {
  const tap = useTap();
  return (
    <Box className="gap-1">
      {NAV_ITEMS.map((item) => {
        const selected = active === item.path;
        return (
          <Pressable
            key={item.path}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => {
              tap();
              onNavigate(item.path);
            }}
            className={`flex-row items-center gap-3 rounded-xl px-3 py-3 ${
              selected ? "bg-primary/15 dark:bg-primary/15" : "active:bg-muted dark:active:bg-muted"
            }`}
          >
            <Ionicons
              name={item.icon as never}
              size={21}
              color={selected ? ICON_PRIMARY : ICON_MUTED}
            />
            <Text
              size="md"
              bold={selected}
              className={
                selected
                  ? "text-primary dark:text-primary"
                  : "font-medium text-foreground dark:text-foreground"
              }
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

function ThemeSegment() {
  const { mode, setMode } = useTheme();
  const options: { label: string; value: ThemeMode; icon: string }[] = [
    { label: "System", value: "system", icon: "phone-portrait-outline" },
    { label: "Light", value: "light", icon: "sunny-outline" },
    { label: "Dark", value: "dark", icon: "moon-outline" },
  ];
  return (
    <Box className="flex-row rounded-xl border border-border bg-muted p-1 dark:border-border dark:bg-muted">
      {options.map((option) => {
        const selected = mode === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} theme`}
            accessibilityState={{ selected }}
            onPress={() => setMode(option.value)}
            className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-1.5 ${
              selected ? "bg-card dark:bg-card" : ""
            }`}
          >
            <Ionicons
              name={option.icon as never}
              size={14}
              color={selected ? ICON_PRIMARY : ICON_MUTED}
            />
            <Text
              size="xs"
              bold
              className={
                selected
                  ? "text-primary dark:text-primary"
                  : "text-muted-foreground dark:text-muted-foreground"
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { statusBarStyle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slide = useRef(new Animated.Value(-320)).current;

  const navigate = useCallback(
    (path: string) => {
      setDrawerOpen(false);
      if (path !== pathname) router.replace(path as never);
    },
    [pathname, router],
  );

  useEffect(() => {
    Animated.timing(slide, {
      toValue: drawerOpen ? 0 : -320,
      duration: drawerOpen ? 220 : 180,
      // Native driver isn't available on react-native-web.
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [drawerOpen, slide]);

  const title = useMemo(
    () => NAV_ITEMS.find((item) => item.path === pathname)?.label ?? "SmartCalc",
    [pathname],
  );

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="flex-1 bg-background dark:bg-background"
      edges={["top", "bottom"]}
    >
      <StatusBar style={statusBarStyle} />

      <Box style={{ flex: 1 }} className="flex-1 bg-background dark:bg-background">
        <Box className="flex-row items-center gap-2 border-b border-border bg-card px-3 py-2.5 dark:border-border dark:bg-card">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            onPress={() => setDrawerOpen(true)}
            className="rounded-lg p-2 active:bg-muted dark:active:bg-muted"
            hitSlop={8}
          >
            <Ionicons name="menu-outline" size={24} color={ICON_MUTED} />
          </Pressable>

          <Box className="min-w-0 flex-1">
            {pathname === "/" ? (
              <Logo />
            ) : (
              <Text bold size="lg" className="text-foreground dark:text-foreground">
                {title}
              </Text>
            )}
          </Box>
        </Box>

        <Box style={{ flex: 1 }} className="flex-1 bg-background dark:bg-background">
          {children}
        </Box>
      </Box>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Box className="flex-1 flex-row bg-background/0">
          <Box className="flex-1 flex-row bg-black/55">
            <Animated.View
              style={[{ width: 288, height: "100%", transform: [{ translateX: slide }] }]}
              className="bg-card p-4 dark:bg-card"
            >
              <Logo />
              <Box className="mt-6 flex-1">
                <NavList active={pathname} onNavigate={navigate} />
              </Box>
              <Box className="gap-2 pb-2">
                <Text
                  size="2xs"
                  bold
                  className="px-1 uppercase tracking-widest text-muted-foreground dark:text-muted-foreground"
                >
                  Theme
                </Text>
                <ThemeSegment />
              </Box>
            </Animated.View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close navigation menu"
              className="flex-1"
              onPress={() => setDrawerOpen(false)}
            />
          </Box>
        </Box>
      </Modal>
    </SafeAreaView>
  );
}
