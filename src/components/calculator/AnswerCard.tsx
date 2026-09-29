import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, TextInput } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useSettings } from "../../state/settings";
import { formatMoney } from "../../utils/formatting";
import { mainResultText } from "../../utils/reportText";
import type { CalculationReport, CurrencyMeta } from "../../types";
import { Card, useTap } from "../ui";

interface Props {
  report: CalculationReport;
  currencyName: (code: string) => string;
  currencies: CurrencyMeta[];
  onSelectOutput: (code: string) => void;
}

const ICON_MUTED = "#94a3b8";
const ICON_PRIMARY = "#3b82f6";
const DEFAULT_DISPLAY = "INR";

function CurrencyRow({
  code,
  name,
  active,
  onPress,
}: {
  code: string;
  name: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Display in ${code}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-xl px-3 py-2 ${
        active ? "bg-primary/10 dark:bg-primary/10" : ""
      }`}
    >
      <Box className="min-w-0 flex-1">
        <Text bold size="sm" className="text-foreground dark:text-foreground">
          {code}
        </Text>
        <Text size="xs" className="text-muted-foreground dark:text-muted-foreground" isTruncated>
          {name}
        </Text>
      </Box>
      {active ? <Ionicons name="checkmark-circle" size={18} color={ICON_PRIMARY} /> : null}
    </Pressable>
  );
}

function OutputSheet({
  visible,
  suggested,
  selected,
  currencies,
  onSelect,
  onClose,
  currencyName,
}: {
  visible: boolean;
  suggested: string[];
  selected: string | null;
  currencies: CurrencyMeta[];
  onSelect: (code: string) => void;
  onClose: () => void;
  currencyName: (code: string) => string;
}) {
  const tap = useTap();
  const [query, setQuery] = useState("");

  const suggestedSet = useMemo(() => new Set(suggested), [suggested]);

  const others = useMemo(() => {
    const q = query.trim().toLowerCase();
    return currencies.filter((currency) => {
      if (suggestedSet.has(currency.code)) return false;
      if (!q) return true;
      return currency.code.toLowerCase().includes(q) || currency.name.toLowerCase().includes(q);
    });
  }, [currencies, query, suggestedSet]);

  const pick = (code: string) => {
    tap();
    onSelect(code);
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setQuery("");
        onClose();
      }}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-5"
        onPress={() => {
          setQuery("");
          onClose();
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ maxHeight: "70%", width: "100%" }}
          className="overflow-hidden rounded-2xl border border-border bg-card dark:border-border dark:bg-card"
        >
          <Box className="border-b border-border px-3 py-2.5 dark:border-border">
            <Text bold size="sm" className="text-foreground dark:text-foreground">
              Display result in
            </Text>
          </Box>

          <Box className="gap-1 px-2 pt-2">
            <Text
              size="2xs"
              bold
              className="px-2 uppercase tracking-widest text-muted-foreground dark:text-muted-foreground"
            >
              Suggested
            </Text>
            {suggested.map((code) => (
              <CurrencyRow
                key={code}
                code={code}
                name={currencyName(code)}
                active={code === selected}
                onPress={() => pick(code)}
              />
            ))}
          </Box>

          <Box className="mt-2 border-t border-border px-3 pt-2 dark:border-border">
            <Text
              size="2xs"
              bold
              className="mb-1.5 uppercase tracking-widest text-muted-foreground dark:text-muted-foreground"
            >
              All currencies
            </Text>
            <Box className="mb-2 flex-row items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 dark:border-border dark:bg-muted">
              <Ionicons name="search-outline" size={16} color={ICON_MUTED} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={ICON_MUTED}
                autoCapitalize="none"
                accessibilityLabel="Search currencies"
                className="flex-1 text-sm text-foreground dark:text-foreground"
              />
            </Box>
          </Box>

          <FlatList
            data={others}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 12 }}
            initialNumToRender={20}
            windowSize={7}
            renderItem={({ item }) => (
              <CurrencyRow
                code={item.code}
                name={item.name}
                active={item.code === selected}
                onPress={() => pick(item.code)}
              />
            )}
            ListEmptyComponent={
              <Text
                size="xs"
                className="px-3 py-4 text-center text-muted-foreground dark:text-muted-foreground"
              >
                {query.trim() ? `No match for “${query.trim()}”.` : "No other currencies."}
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AnswerCard({ report, currencyName, currencies, onSelectOutput }: Props) {
  const { decimalPrecision, showEquivalents } = useSettings();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tap = useTap();

  if (report.expressionType === "empty") return null;

  if (report.error || !report.result) {
    return (
      <Card className="border-destructive/30 bg-destructive/10 p-3 dark:border-destructive/30 dark:bg-destructive/10">
        <Box className="flex-row items-start gap-2">
          <Ionicons name="warning-outline" size={18} color="#f87171" />
          <Box className="flex-1">
            <Text bold size="sm" className="text-destructive dark:text-destructive">
              Unable to calculate
            </Text>
            <Text size="xs" className="mt-0.5 leading-4 text-destructive dark:text-destructive">
              {report.error}
            </Text>
          </Box>
        </Box>
      </Card>
    );
  }

  const value = report.result.value;
  const isMoney = value.kind === "money";
  const outputCode = isMoney ? value.currency! : null;
  const mainText = mainResultText(report, decimalPrecision) ?? "";
  const suggested = [
    ...new Set([
      DEFAULT_DISPLAY,
      ...report.detectedCurrencies,
      ...(outputCode ? [outputCode] : []),
    ]),
  ];
  const equivalents = report.equivalents.filter((entry) => entry.currency !== outputCode);

  const copy = async () => {
    tap();
    await Clipboard.setStringAsync(mainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box className="rounded-2xl border border-primary/40 bg-card px-3 py-2.5 dark:border-primary/40 dark:bg-card">
      <Box className="flex-row items-start justify-between gap-2">
        <Box className="min-w-0 flex-1">
          <Text
            size="2xs"
            bold
            className="uppercase tracking-widest text-muted-foreground dark:text-muted-foreground"
          >
            Result{outputCode ? ` · ${outputCode}` : ""}
          </Text>
          <Text
            bold
            size="3xl"
            className="mt-0.5 tracking-tight text-success dark:text-success"
            isTruncated
          >
            {mainText}
          </Text>
          {isMoney && showEquivalents && equivalents.length > 0 ? (
            <Text
              size="xs"
              className="mt-0.5 text-muted-foreground dark:text-muted-foreground"
              isTruncated
            >
              ≈{" "}
              {equivalents
                .slice(0, 2)
                .map((entry) => formatMoney(entry.amount, entry.currency!, decimalPrecision))
                .join(" · ")}
            </Text>
          ) : null}
        </Box>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? "Copied" : "Copy result"}
          onPress={copy}
          className="rounded-lg p-1.5 active:bg-muted dark:active:bg-muted"
          hitSlop={6}
        >
          <Ionicons
            name={copied ? "checkmark-outline" : "copy-outline"}
            size={18}
            color={ICON_MUTED}
          />
        </Pressable>
      </Box>

      {isMoney ? (
        <Box className="mt-2 flex-row items-center gap-2">
          <Text size="xs" className="text-muted-foreground dark:text-muted-foreground">
            Display in
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change output currency, currently ${outputCode}`}
            onPress={() => {
              tap();
              setSheetOpen(true);
            }}
            className="flex-row items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 active:bg-accent dark:border-border dark:bg-muted dark:active:bg-accent"
          >
            <Text size="xs" bold className="text-foreground dark:text-foreground">
              {outputCode ?? DEFAULT_DISPLAY}
            </Text>
            <Ionicons name="chevron-down-outline" size={12} color={ICON_MUTED} />
          </Pressable>
        </Box>
      ) : null}

      <OutputSheet
        visible={sheetOpen}
        suggested={suggested}
        selected={outputCode}
        currencies={currencies}
        onSelect={onSelectOutput}
        onClose={() => setSheetOpen(false)}
        currencyName={currencyName}
      />
    </Box>
  );
}
