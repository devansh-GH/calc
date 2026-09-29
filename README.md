# SmartCalc — Smart Multi-Currency Calculator

A Google-style direct-answer smart calculator. Type one expression with plain
numbers and/or currencies and get a direct answer — no mode toggle. The
expression itself determines the behavior.

```text
100 + 50 * 2            → 200
100 USD + ₹500          → converted total in your output currency
(100 USD + ₹500) / 2    → grouped money, then scaled
50 EUR in INR           → conversion display override
```

## Stack

- Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (strict)
- UniWind (Tailwind CSS v4) + Gluestack UI v5 components
- TanStack Query (request state) + AsyncStorage (persistent daily snapshot)
- expo-router (Calculator, History, Currencies, System, Settings)
- Frankfurter API v2 for reference exchange rates (no API key)

## Run it

```bash
bun install
bun run start        # scan the QR with Expo Go (same Wi-Fi, no VPN on the phone)
bun run android      # Android emulator / USB device via Expo Go
bun run ios          # iOS simulator
bun run android:usb  # physical Android over USB (see below)
bun test             # engine unit tests (27 tests, Bun runner)
```

### Test on a physical Android over USB (Expo Go)

1. `sudo apt install adb` (one time; platform-tools also work via
   `~/Android/Sdk/platform-tools`).
2. Phone: enable Developer options → USB debugging, plug in with a **data**
   cable, USB mode File Transfer, accept the RSA prompt.
3. Run:

```bash
bun run android:usb
```

This verifies exactly one device, runs
`adb reverse tcp:8081 tcp:8081` (phone reaches Metro over USB even when
Wi-Fi fails), then starts the dev server. In Expo Go, enter
`exp://localhost:8081` manually if auto-discovery fails.

## How it works

```text
INPUT → TOKENIZER → RECURSIVE-DESCENT PARSER → AST → SEMANTIC VALIDATION
      → CURRENCY NORMALIZATION (USD base) → EVALUATION → TRACE → ANSWER
```

- **Money vs Number are distinct types.** `Money + Money`, `Money ± Money`,
  `Money ×/÷ Number` are valid. `Money × Money` and `Money ÷ Money` are
  rejected with a plain-language reason. A bare number is never silently
  treated as money (`100 + 50 USD` is an error, by design).
- **Grouped money scales:** `(100 USD + ₹500) / 2` first merges into one
  monetary value, then divides.
- **Percentages:** `X%` is `X/100`. After `+`/`−` it means “that percent of
  the left side” (`100 USD + 10%` = `110 USD`); after `×`/`÷` it is the
  scalar (`100 USD * 10%` = `10 USD`).
- **`in` override:** `50 EUR in INR` displays the answer in INR without
  changing the expression.
- Normal arithmetic needs no network. Currency math converts locally from
  one daily rate table (USD base): `EUR → INR = rates[INR] / rates[EUR]`.
  Values are rounded for display only.

## Rates & caching

- `GET https://api.frankfurter.dev/v2/rates?base=USD` → stored as
  `{ date, fetchedAt, base, rates }` under `smartcalc.exchangeRates.v1`.
- Startup: cached snapshot renders immediately; a background refetch
  happens when the snapshot is older than today (“Updating rates…”).
- Offline with cache → “Using cached rates from …”. Offline without
  cache → plain arithmetic still works; currency math shows a useful error.
- TanStack Query (`['exchangeRates', 'USD']`, 6h stale, 7d gc, no
  focus-refetch) handles request state; the snapshot itself is persisted
  explicitly in AsyncStorage. Currency metadata (`/currencies`) is cached
  separately under `smartcalc.currencies.v1` (30-day stale).
- Never any request per keystroke. Nothing here is tick-by-tick data:
  the UI says “Latest/ Reference Exchange Rates”.

## Storage keys

`smartcalc.theme` · `smartcalc.settings` · `smartcalc.exchangeRates.v1` ·
`smartcalc.currencies.v1` · `smartcalc.history.v1` (capped at 100, newest
first). Corrupt JSON is discarded and defaults restored — never a crash.

## Project layout

```text
src/
  app/            expo-router routes (thin wrappers)
  screens/        Calculator, History, Currencies, SystemExplorer, Settings
  components/     calculator/* (input, keypad, answer, rates, picker), ui.tsx
  navigation/     responsive AppShell (sidebar ≥1024px, drawer below)
  engine/         tokenizer, parser, validator, evaluator, metrics, currencies
  services/       frankfurter.ts (fetch + validate, 12s timeout)
  query/          QueryClient + useExchangeRates/useCurrencies/cache status
  state/          theme, settings, history, shared expression
  storage/        versioned keys + safe JSON helpers
  utils/          formatting, dates, report text
```

Theme (System/Light/Dark, persisted, default System) flows through
UniWind `dark:` variants + semantic classes; `StatusBar` and the Gluestack
provider follow the resolved scheme. The technical pipeline (tokens, AST,
type checks, conversions, cache, metrics) lives only in System Explorer —
the calculator screen stays clean.

## EAS builds

`eas.json` ships `development`, `preview` (APK) and `production`
profiles; `android.package` is set in `app.json`.

## CI (GitHub Actions)

`.github/workflows/android-apk.yml` runs on every push:

1. **validate** — `bun install`, `tsc --noEmit`, `bun test`.
2. **build** — JDK 17 + Android SDK (platform 36), `expo prebuild`,
   `./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a`,
   then asserts the APK contains no x86/armeabi-v7a native libs and
   uploads it as the `smartcalc-arm64-v8a` artifact.

No secrets needed: the template signs the release build with the debug
keystore, so the APK installs directly on test devices. For store
releases, add a real keystore later.
