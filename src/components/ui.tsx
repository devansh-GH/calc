import React from "react";
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "../state/settings";

export function useTap(): () => void {
  const { haptics } = useSettings();
  return React.useCallback(() => {
    if (haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [haptics]);
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl border border-border bg-card dark:border-border dark:bg-card ${className}`}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground dark:text-muted-foreground">
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const tap = useTap();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        tap();
        onPress();
      }}
      className="items-center rounded-xl bg-primary px-4 py-3 active:bg-primary/90 dark:bg-primary dark:active:bg-primary/90"
    >
      <Text className="font-semibold text-primary-foreground dark:text-primary-foreground">
        {label}
      </Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  accessibilityLabel,
  danger,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  danger?: boolean;
}) {
  const tap = useTap();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        tap();
        onPress();
      }}
      className="items-center rounded-xl border border-border bg-muted px-4 py-3 active:bg-accent dark:border-border dark:bg-muted dark:active:bg-accent"
    >
      <Text
        className={`font-semibold ${
          danger ? "text-destructive dark:text-destructive" : "text-foreground dark:text-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
