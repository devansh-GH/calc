import React, { useRef, useState } from "react";
import { ScrollView } from "react-native";
import AnswerCard from "../components/calculator/AnswerCard";
import { QuickCurrencyRow } from "../components/calculator/CurrencyPicker";
import Keypad from "../components/calculator/Keypad";
import RatesDialog, { RatesTriggerButton } from "../components/calculator/RatePanel";
import SmartInput, { type SmartInputHandle } from "../components/calculator/SmartInput";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { fallbackCurrencyName } from "../engine/currencies";
import { useCalculator } from "../hooks/useCalculator";
import { describeCache, useCurrencies, useExchangeRates } from "../query/useRates";
import { useExpression } from "../state/expression";
import { useSettings } from "../state/settings";
import type { CurrencyMeta } from "../types";

const DEFAULT_DISPLAY = "INR";

function currencyNameFor(list: CurrencyMeta[], code: string): string {
  return list.find((entry) => entry.code === code)?.name ?? fallbackCurrencyName(code);
}

export default function CalculatorScreen() {
  const { expression: sharedInput, setExpression: setSharedInput } = useExpression();
  const [input, setInput] = useState(sharedInput);
  const [outputCurrency, setOutputCurrency] = useState(DEFAULT_DISPLAY);
  const [ratesOpen, setRatesOpen] = useState(false);
  const inputRef = useRef<SmartInputHandle>(null);

  const settings = useSettings();
  const rates = useExchangeRates();
  const currencies = useCurrencies();

  const snapshot = rates.snapshot;
  const report = useCalculator(input, snapshot, outputCurrency);
  const cache = describeCache(snapshot, rates.isFetching, rates.isError);
  const nameOf = (code: string) => currencyNameFor(currencies.list, code);

  const changeInput = (next: string) => {
    setInput(next);
    setSharedInput(next);
    setOutputCurrency(DEFAULT_DISPLAY);
  };

  const ratesError =
    rates.isError && !snapshot
      ? "Exchange rates are unavailable. Check your connection — plain arithmetic still works."
      : null;

  return (
    <ScrollView
      style={{ flex: 1 }}
      className="flex-1 bg-background dark:bg-background"
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Box className="gap-1.5">
        <Text
          size="sm"
          className="px-0.5 leading-5 text-muted-foreground dark:text-muted-foreground"
        >
          Calculate across currencies, naturally. Use the keypad and currency chips.
        </Text>
        <SmartInput ref={inputRef} value={input} onChange={changeInput} />
      </Box>

      <QuickCurrencyRow onSelect={(token) => inputRef.current?.insert(` ${token} `)} />

      {report.expressionType !== "empty" ? (
        <AnswerCard
          report={report}
          currencyName={nameOf}
          currencies={currencies.list}
          onSelectOutput={setOutputCurrency}
        />
      ) : null}

      <RatesTriggerButton loading={rates.isFetching} onPress={() => setRatesOpen(true)} />

      {settings.showKeypad ? (
        <Keypad
          onInsert={(text) => inputRef.current?.insert(text)}
          onBackspace={() => inputRef.current?.backspace()}
          onClear={() => inputRef.current?.clear()}
          onEquals={() => {}}
        />
      ) : null}

      <RatesDialog
        visible={ratesOpen}
        onClose={() => setRatesOpen(false)}
        pairs={report.relevantRates}
        cache={cache}
        loading={rates.isFetching}
        error={ratesError}
        fetchedAt={snapshot?.fetchedAt ?? null}
        onRefresh={() => {
          void rates.refresh();
        }}
        snapshot={snapshot}
        currencies={currencies.list}
      />
    </ScrollView>
  );
}
