import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, TextInput } from "react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { rateBetween } from "../../engine/evaluator";
import { formatRate } from "../../utils/formatting";
import { formatRateDate, formatTimestamp } from "../../utils/date";
import type { CacheStatus, CurrencyMeta, RateSnapshot } from "../../types";
import { Card, useTap } from "../ui";

type RatesTab = "relevant" | "browse";

interface Props {
  visible: boolean;
  onClose: () => void;
  pairs: { from: string; to: string; rate: number }[];
  cache: CacheStatus;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  onRefresh: () => void;
  snapshot: RateSnapshot | null;
  currencies: CurrencyMeta[];
}

const ICON_MUTED = "#94a3b8";
const ICON_PRIMARY = "#3b82f6";
const DEFAULT_REFERENCE = "INR";
const QUICK_REFERENCES = ["INR", "USD", "EUR", "CNY", "JPY"] as const;

export function rateStatusText(cache: CacheStatus): string {
  switch (cache.status) {
    case "fresh":
      return `Reference rates · ${formatRateDate(cache.rateDate!)}`;
    case "updating":
      return "Updating rates…";
    case "offline":
      return `Offline · cached rates from ${formatRateDate(cache.rateDate!)}`;
    case "cached":
      return `Cached rates from ${formatRateDate(cache.rateDate!)}`;
    case "empty":
      return "Rates unavailable";
  }
}

export function RatesTriggerButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading?: boolean;
}) {
  const tap = useTap();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open live exchange rates"
      onPress={() => {
        tap();
        onPress();
      }}
      className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3 active:bg-muted dark:border-border dark:bg-card dark:active:bg-muted"
    >
      <Box className="flex-row items-center gap-2">
        <Ionicons name="swap-horizontal-outline" size={18} color={ICON_PRIMARY} />
        <Text size="sm" bold className="text-foreground dark:text-foreground">
          Live exchange rates
        </Text>
      </Box>
      {loading ? (
        <ActivityIndicator size="small" color={ICON_PRIMARY} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={ICON_MUTED} />
      )}
    </Pressable>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-1 items-center rounded-lg py-2 ${
        active ? "bg-primary dark:bg-primary" : "bg-transparent"
      }`}
    >
      <Text
        size="sm"
        bold
        className={
          active
            ? "text-primary-foreground dark:text-primary-foreground"
            : "text-muted-foreground dark:text-muted-foreground"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function rateFromReference(
  reference: string,
  code: string,
  snapshot: RateSnapshot | null,
): number | null {
  if (!snapshot) return null;
  if (reference === code) return 1;
  try {
    return rateBetween(reference, code, snapshot.rates);
  } catch {
    return null;
  }
}

export default function RatesDialog({
  visible,
  onClose,
  pairs,
  cache,
  loading,
  error,
  fetchedAt,
  onRefresh,
  snapshot,
  currencies,
}: Props) {
  const tap = useTap();
  const [tab, setTab] = useState<RatesTab>("relevant");
  const [reference, setReference] = useState(DEFAULT_REFERENCE);
  const [query, setQuery] = useState("");
  const [pickingReference, setPickingReference] = useState(false);

  const filteredCurrencies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = currencies.filter((currency) => currency.code !== reference);
    if (!q) return list;
    return list.filter(
      (currency) =>
        currency.code.toLowerCase().includes(q) ||
        currency.name.toLowerCase().includes(q) ||
        currency.symbol.toLowerCase().includes(q),
    );
  }, [currencies, query, reference]);

  const referenceMeta = currencies.find((currency) => currency.code === reference);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Box className="flex-1 justify-end bg-black/50">
        <Box className="h-[85%] rounded-t-3xl border border-border bg-card dark:border-border dark:bg-card">
          <Box className="flex-row items-center justify-between border-b border-border px-4 py-3 dark:border-border">
            <Text bold size="md" className="text-foreground dark:text-foreground">
              Live exchange rates
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close rates"
              onPress={onClose}
              className="rounded-lg p-2 active:bg-muted dark:active:bg-muted"
            >
              <Ionicons name="close-outline" size={22} color={ICON_MUTED} />
            </Pressable>
          </Box>

          <Box className="gap-3 px-4 pt-3">
            <Box className="gap-1">
              <Text size="xs" className="text-muted-foreground dark:text-muted-foreground">
                Last refreshed
              </Text>
              <Text size="sm" bold className="text-foreground dark:text-foreground">
                {fetchedAt ? formatTimestamp(fetchedAt) : "Never"}
              </Text>
              <Text size="xs" className="text-muted-foreground dark:text-muted-foreground">
                {rateStatusText(cache)}
              </Text>
            </Box>

            <Button
              variant="default"
              size="default"
              onPress={onRefresh}
              disabled={loading}
              className="rounded-xl"
            >
              {loading ? <ButtonSpinner /> : null}
              <ButtonText>{loading ? "Refreshing…" : "Fetch latest rates"}</ButtonText>
            </Button>

            <Box className="flex-row rounded-xl border border-border bg-muted p-1 dark:border-border dark:bg-muted">
              <TabButton
                label="In expression"
                active={tab === "relevant"}
                onPress={() => {
                  tap();
                  setTab("relevant");
                }}
              />
              <TabButton
                label="Browse all"
                active={tab === "browse"}
                onPress={() => {
                  tap();
                  setTab("browse");
                }}
              />
            </Box>
          </Box>

          {tab === "relevant" ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
              {error && pairs.length === 0 ? (
                <Card className="border-warning/30 bg-warning/10 p-4 dark:border-warning/30 dark:bg-warning/10">
                  <Box className="flex-row items-start gap-3">
                    <Ionicons name="cloud-offline-outline" size={20} color="#fbbf24" />
                    <Text size="sm" className="flex-1 leading-5 text-warning dark:text-warning">
                      {error}
                    </Text>
                  </Box>
                </Card>
              ) : pairs.length === 0 ? (
                <Text
                  size="sm"
                  className="text-center text-muted-foreground dark:text-muted-foreground"
                >
                  Add currencies to your expression to see relevant rates here, or switch to Browse
                  all.
                </Text>
              ) : (
                pairs.map((pair) => (
                  <Box
                    key={`${pair.from}-${pair.to}`}
                    className="rounded-xl border border-border bg-muted px-3 py-3 dark:border-border dark:bg-muted"
                  >
                    <Text
                      size="2xs"
                      bold
                      className="uppercase tracking-wider text-muted-foreground dark:text-muted-foreground"
                    >
                      {pair.from} → {pair.to}
                    </Text>
                    <Text bold size="sm" className="mt-0.5 text-foreground dark:text-foreground">
                      1 {pair.from} = {formatRate(pair.rate)} {pair.to}
                    </Text>
                  </Box>
                ))
              )}
            </ScrollView>
          ) : (
            <Box style={{ flex: 1, minHeight: 0 }} className="px-4 pb-4 pt-3">
              <Box style={{ flexShrink: 0 }} className="mb-3 gap-2">
                <Text size="xs" className="text-muted-foreground dark:text-muted-foreground">
                  Reference currency
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 4,
                  }}
                >
                  {QUICK_REFERENCES.map((code) => {
                    const active = reference === code;
                    return (
                      <Pressable
                        key={code}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          tap();
                          setReference(code);
                        }}
                        style={{ minHeight: 36 }}
                        className={`items-center justify-center rounded-full border px-4 ${
                          active
                            ? "border-primary bg-primary/15 dark:border-primary dark:bg-primary/15"
                            : "border-border bg-card dark:border-border dark:bg-card"
                        }`}
                      >
                        <Text
                          size="sm"
                          bold
                          className={
                            active
                              ? "text-primary dark:text-primary"
                              : "text-foreground dark:text-foreground"
                          }
                        >
                          {code}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose another reference currency"
                    onPress={() => {
                      tap();
                      setPickingReference(true);
                    }}
                    style={{ minHeight: 36 }}
                    className="items-center justify-center rounded-full border border-dashed border-primary/40 px-4 dark:border-primary/40"
                  >
                    <Text size="sm" bold className="text-primary dark:text-primary">
                      More…
                    </Text>
                  </Pressable>
                </ScrollView>
                <Text size="xs" className="text-muted-foreground dark:text-muted-foreground">
                  Showing 1 {reference}
                  {referenceMeta ? ` (${referenceMeta.name})` : ""} in other currencies
                </Text>

                <Box className="flex-row items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 dark:border-border dark:bg-muted">
                  <Ionicons name="search-outline" size={18} color={ICON_MUTED} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search currencies…"
                    placeholderTextColor={ICON_MUTED}
                    autoCapitalize="none"
                    accessibilityLabel="Search currencies"
                    className="flex-1 text-[15px] text-foreground dark:text-foreground"
                  />
                </Box>
              </Box>

              {!snapshot ? (
                <Text
                  size="sm"
                  className="text-center text-muted-foreground dark:text-muted-foreground"
                >
                  Fetch rates to browse conversions.
                </Text>
              ) : (
                <FlatList
                  style={{ flex: 1 }}
                  data={filteredCurrencies}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={24}
                  windowSize={8}
                  contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
                  renderItem={({ item }) => {
                    const rate = rateFromReference(reference, item.code, snapshot);
                    return (
                      <Box className="flex-row items-center gap-3 rounded-xl border border-border bg-muted px-3 py-3 dark:border-border dark:bg-muted">
                        <Box className="min-w-0 flex-1">
                          <Text bold className="text-foreground dark:text-foreground">
                            {item.code}
                          </Text>
                          <Text
                            size="xs"
                            className="text-muted-foreground dark:text-muted-foreground"
                            isTruncated
                          >
                            {item.name}
                          </Text>
                        </Box>
                        <Text bold size="sm" className="text-foreground dark:text-foreground">
                          {rate === null ? "—" : formatRate(rate)}
                        </Text>
                      </Box>
                    );
                  }}
                  ListEmptyComponent={
                    <Text
                      size="sm"
                      className="py-8 text-center text-muted-foreground dark:text-muted-foreground"
                    >
                      No currencies match “{query}”.
                    </Text>
                  }
                />
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Modal
        visible={pickingReference}
        transparent
        animationType="fade"
        onRequestClose={() => setPickingReference(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setPickingReference(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="max-h-[70%] w-full rounded-2xl border border-border bg-card p-3 dark:border-border dark:bg-card"
          >
            <Text bold size="sm" className="px-2 pb-2 pt-1 text-foreground dark:text-foreground">
              Choose reference currency
            </Text>
            <FlatList
              data={currencies}
              keyExtractor={(item) => item.code}
              initialNumToRender={30}
              renderItem={({ item }) => {
                const active = item.code === reference;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      tap();
                      setReference(item.code);
                      setPickingReference(false);
                    }}
                    className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                      active ? "bg-primary/10 dark:bg-primary/10" : ""
                    }`}
                  >
                    <Box className="flex-1">
                      <Text bold className="text-foreground dark:text-foreground">
                        {item.code}
                      </Text>
                      <Text size="xs" className="text-muted-foreground dark:text-muted-foreground">
                        {item.name}
                      </Text>
                    </Box>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={ICON_PRIMARY} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
