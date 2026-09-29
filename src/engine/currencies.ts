export const KNOWN_CURRENCY_CODES: ReadonlySet<string> = new Set(
  (
    "AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD " +
    "CAD CDF CHF CLP CNH CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GGP GHS " +
    "GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS IMP INR IQD IRR ISK JEP JMD JOD JPY KES KGS KHR KMF KPW " +
    "KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRO MRU MUR MVR MWK MXN MYR MZN " +
    "NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD " +
    "SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND " +
    "VUV WST XAF XAG XAU XCD XCG XDR XOF XPD XPF XPT YER ZAR ZMW ZWG"
  ).split(" "),
);

export function isKnownCurrencyCode(code: string): boolean {
  return KNOWN_CURRENCY_CODES.has(code.toUpperCase());
}

export const SYMBOL_TO_CODE: Readonly<Record<string, string>> = {
  $: "USD",
  "₹": "INR",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₽": "RUB",
  "₩": "KRW",
  "₪": "ILS",
  "₺": "TRY",
  "₴": "UAH",
  "₸": "KZT",
  "₼": "AZN",
  "₾": "GEL",
  "₵": "GHS",
  "₦": "NGN",
  "₱": "PHP",
  "₲": "PYG",
  "₳": "ARS",
  "฿": "THB",
  "₫": "VND",
  "₭": "LAK",
  "₮": "MNT",
  "₨": "PKR",
  "৳": "BDT",
  "؋": "AFN",
  "﷼": "SAR",
  "₣": "XPF",
  "₢": "BRL",
  R$: "BRL",
  kr: "SEK",
  CHF: "CHF",
  HK$: "HKD",
};

export const CODE_TO_SYMBOL: Readonly<Record<string, string>> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  CNH: "¥",
  RUB: "₽",
  KRW: "₩",
  ILS: "₪",
  TRY: "₺",
  UAH: "₴",
  KZT: "₸",
  AZN: "₼",
  GEL: "₾",
  GHS: "₵",
  NGN: "₦",
  PHP: "₱",
  THB: "฿",
  VND: "₫",
  BDT: "৳",
  AFN: "؋",
  SAR: "﷼",
  BRL: "R$",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  ISK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "Lei",
  IDR: "Rp",
  MYR: "RM",
  KES: "KSh",
  ZAR: "R",
  MXN: "$",
  CAD: "$",
  AUD: "$",
  HKD: "$",
  SGD: "$",
  NZD: "$",
};

const FALLBACK_NAMES: Readonly<Record<string, string>> = {
  USD: "US Dollar",
  INR: "Indian Rupee",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  CHF: "Swiss Franc",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  NZD: "New Zealand Dollar",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  MXN: "Mexican Peso",
  BRL: "Brazilian Real",
  ZAR: "South African Rand",
  KRW: "South Korean Won",
  THB: "Thai Baht",
  MYR: "Malaysian Ringgit",
  IDR: "Indonesian Rupiah",
  PHP: "Philippine Peso",
  VND: "Vietnamese Dong",
  TRY: "Turkish Lira",
  RUB: "Russian Ruble",
  PLN: "Polish Zloty",
  ILS: "Israeli Shekel",
  EGP: "Egyptian Pound",
  NGN: "Nigerian Naira",
  KES: "Kenyan Shilling",
  PKR: "Pakistani Rupee",
  BDT: "Bangladeshi Taka",
  LKR: "Sri Lankan Rupee",
  NPR: "Nepalese Rupee",
};

export function fallbackCurrencyName(code: string): string {
  return FALLBACK_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

export function currencySymbol(code: string): string {
  return CODE_TO_SYMBOL[code.toUpperCase()] ?? "";
}

/** Prefer a currency symbol for keypad/chip inserts; fall back to the ISO code. */
export function currencyInsertToken(code: string): string {
  const symbol = currencySymbol(code);
  return symbol || code.toUpperCase();
}

export const QUICK_CURRENCIES = ["INR", "USD", "EUR", "CNY", "JPY"] as const;
