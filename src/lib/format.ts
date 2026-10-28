import type { Settings } from "./types";

const cache = new Map<string, Intl.NumberFormat>();
const nf = (currency: string, digits: number) => {
  const k = `${currency}|${digits}`;
  let f = cache.get(k);
  if (!f) {
    f = new Intl.NumberFormat("ru-RU", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
    cache.set(k, f);
  }
  return f;
};

export const MASK = "•••••";

export const money = (n: number, s: Pick<Settings, "currency" | "hideAmounts">, opts: { digits?: number; force?: boolean } = {}) => {
  if (s.hideAmounts && !opts.force) return MASK;
  return nf(s.currency, opts.digits ?? 2).format(n || 0).replace(/\u00a0/g, " ");
};

export const moneyCompact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",").replace(",0", "")}k` : String(Math.round(n)));

export const num = (n: number, max = 2) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: max }).format(n);

export const hoursFmt = (h: number, s: Pick<Settings, "hoursFormat">) => {
  if (s.hoursFormat === "hm") {
    const total = Math.round(h * 60);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  return `${num(Math.round(h * 100) / 100)} ч`;
};

export const CURRENCIES = ["RUB", "USD", "EUR", "KZT", "UAH", "BYN", "GBP", "CAD", "AUD"];

export const currencyLabel: Record<string, string> = {
  RUB: "RUB — Russian Ruble",
  USD: "USD — US Dollar",
  EUR: "EUR — Euro",
  KZT: "KZT — Kazakhstani Tenge",
  UAH: "UAH — Ukrainian Hryvnia",
  BYN: "BYN — Belarusian Ruble",
  GBP: "GBP — British Pound",
  CAD: "CAD — Canadian Dollar",
  AUD: "AUD — Australian Dollar",
};

export const clock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const download = (name: string, content: string, type = "text/plain") => {
  const url = URL.createObjectURL(new Blob(["\ufeff" + content], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
