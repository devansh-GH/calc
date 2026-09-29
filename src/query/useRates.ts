import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCurrencies, fetchRates } from "../services/frankfurter";
import { STORAGE_KEYS } from "../storage/keys";
import { getJSON, setJSON, removeKey } from "../storage/storage";
import { fallbackCurrencyName, currencySymbol, KNOWN_CURRENCY_CODES } from "../engine/currencies";
import { todayLocal } from "../utils/date";
import type { CacheStatus, CurrencyMeta, RateSnapshot } from "../types";

interface StoredCurrencyCache {
  savedAt: string;
  items: CurrencyMeta[];
}

const RATES_MAX_AGE_MS = 1000 * 60 * 60 * 6;
const CURRENCIES_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

let ratesMemory: RateSnapshot | null = null;
let currenciesMemory: StoredCurrencyCache | null = null;
let ratesLoadPromise: Promise<RateSnapshot | null> | null = null;
let currenciesLoadPromise: Promise<StoredCurrencyCache | null> | null = null;

type Listener = () => void;
const ratesListeners = new Set<Listener>();
const currenciesListeners = new Set<Listener>();

function notify(listeners: Set<Listener>) {
  listeners.forEach((listener) => listener());
}

async function loadRatesFromStorage(): Promise<RateSnapshot | null> {
  if (ratesMemory) return ratesMemory;
  ratesLoadPromise ??= getJSON<RateSnapshot>(STORAGE_KEYS.rates).then((value) => {
    ratesMemory = value;
    return value;
  });
  return ratesLoadPromise;
}

async function loadCurrenciesFromStorage(): Promise<StoredCurrencyCache | null> {
  if (currenciesMemory) return currenciesMemory;
  currenciesLoadPromise ??= getJSON<StoredCurrencyCache | CurrencyMeta[]>(
    STORAGE_KEYS.currencies,
  ).then((value) => {
    if (!value) {
      currenciesMemory = null;
      return null;
    }
    if (Array.isArray(value)) {
      currenciesMemory = { savedAt: new Date(0).toISOString(), items: value };
    } else {
      currenciesMemory = value;
    }
    return currenciesMemory;
  });
  return currenciesLoadPromise;
}

export function preloadCaches(): void {
  void loadRatesFromStorage();
  void loadCurrenciesFromStorage();
}

function isRatesStale(snapshot: RateSnapshot | null): boolean {
  if (!snapshot) return true;
  if (snapshot.date !== todayLocal()) return true;
  const age = Date.now() - (Date.parse(snapshot.fetchedAt) || 0);
  return age > RATES_MAX_AGE_MS;
}

function isCurrenciesStale(cache: StoredCurrencyCache | null): boolean {
  if (!cache || cache.items.length === 0) return true;
  const age = Date.now() - (Date.parse(cache.savedAt) || 0);
  return age > CURRENCIES_MAX_AGE_MS;
}

async function fetchAndStoreRates(): Promise<RateSnapshot> {
  const table = await fetchRates("USD");
  const snapshot: RateSnapshot = {
    date: table.date,
    fetchedAt: new Date().toISOString(),
    base: table.base,
    rates: table.rates,
    source: "network",
  };
  ratesMemory = snapshot;
  ratesLoadPromise = Promise.resolve(snapshot);
  await setJSON(STORAGE_KEYS.rates, snapshot);
  notify(ratesListeners);
  return snapshot;
}

async function fetchAndStoreCurrencies(): Promise<CurrencyMeta[]> {
  const list = await fetchCurrencies();
  const stored: StoredCurrencyCache = {
    savedAt: new Date().toISOString(),
    items: list,
  };
  currenciesMemory = stored;
  currenciesLoadPromise = Promise.resolve(stored);
  await setJSON(STORAGE_KEYS.currencies, stored);
  notify(currenciesListeners);
  return list;
}

export async function clearRatesCache(): Promise<void> {
  ratesMemory = null;
  ratesLoadPromise = Promise.resolve(null);
  await removeKey(STORAGE_KEYS.rates);
  notify(ratesListeners);
}

export function useExchangeRates() {
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(ratesMemory);
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const onChange = () => setSnapshot(ratesMemory);
    ratesListeners.add(onChange);
    return () => {
      ratesListeners.delete(onChange);
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsFetching(true);
    setIsError(false);
    try {
      await fetchAndStoreRates();
    } catch {
      setIsError(true);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;

    void (async () => {
      const cached = await loadRatesFromStorage();
      if (!alive) return;
      setSnapshot(cached);

      if (isRatesStale(cached)) {
        setIsFetching(true);
        try {
          await fetchAndStoreRates();
          if (alive) setIsError(false);
        } catch {
          if (alive) setIsError(true);
        } finally {
          if (alive) setIsFetching(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { snapshot, isFetching, isError, refresh };
}

export function fallbackCurrencyList(): CurrencyMeta[] {
  return [...KNOWN_CURRENCY_CODES]
    .sort()
    .map((code) => ({ code, name: fallbackCurrencyName(code), symbol: currencySymbol(code) }));
}

export function useCurrencies() {
  const [cache, setCache] = useState<StoredCurrencyCache | null>(currenciesMemory);
  const [isLoading, setIsLoading] = useState(!currenciesMemory);
  const [isError, setIsError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const onChange = () => setCache(currenciesMemory);
    currenciesListeners.add(onChange);
    return () => {
      currenciesListeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;

    void (async () => {
      const stored = await loadCurrenciesFromStorage();
      if (!alive) return;
      setCache(stored);
      setIsLoading(false);

      if (isCurrenciesStale(stored)) {
        setIsLoading(true);
        try {
          await fetchAndStoreCurrencies();
          if (alive) setIsError(false);
        } catch {
          if (alive) setIsError(true);
        } finally {
          if (alive) setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const list = cache?.items ?? fallbackCurrencyList();
  return {
    list,
    isLoading,
    isError,
    fromFallback: !cache,
  };
}

export function describeCache(
  snapshot: RateSnapshot | null,
  isFetching: boolean,
  isError: boolean,
): CacheStatus {
  if (!snapshot) {
    return {
      rateDate: null,
      fetchedAt: null,
      status: isFetching ? "updating" : "empty",
      storage: "AsyncStorage",
    };
  }
  if (isFetching) {
    return {
      rateDate: snapshot.date,
      fetchedAt: snapshot.fetchedAt,
      status: "updating",
      storage: "AsyncStorage",
    };
  }
  if (snapshot.date === todayLocal() && !isError) {
    return {
      rateDate: snapshot.date,
      fetchedAt: snapshot.fetchedAt,
      status: "fresh",
      storage: "AsyncStorage",
    };
  }
  return {
    rateDate: snapshot.date,
    fetchedAt: snapshot.fetchedAt,
    status: isError ? "offline" : "cached",
    storage: "AsyncStorage",
  };
}
