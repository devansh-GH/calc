import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { currencyInsertToken, currencySymbol } from "../../engine/currencies";
import { useTap } from "../ui";

interface KeypadProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEquals: () => void;
}

const ICON_MUTED = "#94a3b8";
const ICON_DANGER = "#f87171";
const KEYPAD_CURRENCIES = ["USD", "INR", "EUR"] as const;

function Key({
  label,
  onPress,
  accessibilityLabel,
  accent,
  icon,
}: {
  label?: string;
  onPress: () => void;
  accessibilityLabel: string;
  accent?: "operator" | "equals" | "danger";
  icon?: string;
}) {
  const tap = useTap();
  const base =
    accent === "equals"
      ? "bg-primary active:bg-primary/90 dark:bg-primary dark:active:bg-primary/90"
      : accent === "operator"
        ? "bg-primary/10 active:bg-primary/20 dark:bg-primary/10 dark:active:bg-primary/20"
        : accent === "danger"
          ? "bg-destructive/10 active:bg-destructive/20 dark:bg-destructive/10 dark:active:bg-destructive/20"
          : "bg-card active:bg-muted dark:bg-card dark:active:bg-muted";
  const textColor =
    accent === "equals"
      ? "text-primary-foreground dark:text-primary-foreground"
      : accent === "operator"
        ? "text-primary dark:text-primary"
        : accent === "danger"
          ? "text-destructive dark:text-destructive"
          : "text-foreground dark:text-foreground";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap();
        onPress();
      }}
      className={`min-h-14 flex-1 items-center justify-center rounded-2xl border border-border py-3.5 dark:border-border ${base}`}
    >
      {icon ? (
        <Ionicons
          name={icon as never}
          size={22}
          color={accent === "danger" ? ICON_DANGER : ICON_MUTED}
        />
      ) : (
        <Text size="xl" bold className={textColor}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const ROWS: {
  label?: string;
  value?: string;
  action?: "backspace" | "clear";
  icon?: string;
  hint: string;
  accent?: "operator" | "equals" | "danger";
}[][] = [
  [
    { label: "AC", action: "clear", hint: "Clear", accent: "danger" },
    { label: "(", value: "(", hint: "Open parenthesis" },
    { label: ")", value: ")", hint: "Close parenthesis" },
    { icon: "backspace-outline", action: "backspace", hint: "Backspace" },
  ],
  [
    { label: "7", value: "7", hint: "Seven" },
    { label: "8", value: "8", hint: "Eight" },
    { label: "9", value: "9", hint: "Nine" },
    { label: "÷", value: " / ", hint: "Divide", accent: "operator" },
  ],
  [
    { label: "4", value: "4", hint: "Four" },
    { label: "5", value: "5", hint: "Five" },
    { label: "6", value: "6", hint: "Six" },
    { label: "×", value: " * ", hint: "Multiply", accent: "operator" },
  ],
  [
    { label: "1", value: "1", hint: "One" },
    { label: "2", value: "2", hint: "Two" },
    { label: "3", value: "3", hint: "Three" },
    { label: "−", value: " - ", hint: "Minus", accent: "operator" },
  ],
  [
    { label: ".", value: ".", hint: "Decimal point" },
    { label: "0", value: "0", hint: "Zero" },
    { label: "%", value: "%", hint: "Percent" },
    { label: "+", value: " + ", hint: "Plus", accent: "operator" },
  ],
];

export default function Keypad({ onInsert, onBackspace, onClear, onEquals }: KeypadProps) {
  const tap = useTap();
  const fire = (key: (typeof ROWS)[number][number]) => {
    if (key.action === "backspace") return onBackspace();
    if (key.action === "clear") return onClear();
    if (key.value) return onInsert(key.value);
  };

  return (
    <Box className="gap-2">
      {ROWS.map((row, index) => (
        <Box key={index} className="flex-row gap-2">
          {row.map((key) => (
            <Key
              key={key.hint}
              label={key.label}
              icon={key.icon}
              accent={key.accent}
              accessibilityLabel={key.hint}
              onPress={() => fire(key)}
            />
          ))}
        </Box>
      ))}
      <Box className="flex-row gap-2">
        {KEYPAD_CURRENCIES.map((code) => {
          const symbol = currencySymbol(code);
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityLabel={`Insert ${code}`}
              onPress={() => {
                tap();
                onInsert(` ${currencyInsertToken(code)} `);
              }}
              className="flex-1 items-center rounded-2xl border border-border bg-muted py-3 active:bg-accent dark:border-border dark:bg-muted dark:active:bg-accent"
            >
              <Text size="sm" bold className="text-foreground dark:text-foreground">
                {symbol || code}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate"
          onPress={() => {
            tap();
            onEquals();
          }}
          className="flex-[2] items-center rounded-2xl bg-primary py-3 active:bg-primary/90 dark:bg-primary dark:active:bg-primary/90"
        >
          <Text size="lg" bold className="text-primary-foreground dark:text-primary-foreground">
            =
          </Text>
        </Pressable>
      </Box>
    </Box>
  );
}
