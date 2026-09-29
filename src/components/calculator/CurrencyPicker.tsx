import React from "react";
import { Pressable } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { QUICK_CURRENCIES, currencyInsertToken } from "../../engine/currencies";
import { useTap } from "../ui";

export function QuickCurrencyRow({ onSelect }: { onSelect: (token: string) => void }) {
  const tap = useTap();
  return (
    <Box className="gap-2">
      <Text
        size="2xs"
        bold
        className="px-0.5 uppercase tracking-widest text-muted-foreground dark:text-muted-foreground"
      >
        Popular
      </Text>
      <Box className="flex-row flex-wrap gap-2">
        {QUICK_CURRENCIES.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${code}`}
            onPress={() => {
              tap();
              onSelect(currencyInsertToken(code));
            }}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 active:bg-muted dark:border-border dark:bg-card dark:active:bg-muted"
          >
            <Text size="xs" bold className="text-foreground dark:text-foreground">
              {code}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );
}
