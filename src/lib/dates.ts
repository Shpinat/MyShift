export const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const addDaysISO = (s: string, n: number) => toISO(addDays(fromISO(s), n));

export const diffDays = (a: Date, b: Date) =>
  Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Monday-based weekday: 0 = Mon … 6 = Sun */
export const weekday = (d: Date) => (d.getDay() + 6) % 7;

export const timeToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minToTime = (m: number) => {
  const x = ((m % 1440) + 1440) % 1440;
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};

export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const DOW_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
export const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
export const MONTHS_IN = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
const MON_SHORT = ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."];

/** "ср, 28 окт." */
export const fmtDayShort = (d: Date) => `${DOW_SHORT[weekday(d)]}, ${d.getDate()} ${MON_SHORT[d.getMonth()]}`;

/** "28 окт. 2026 г." */
export const fmtDayLong = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()} г.`;

/** "12 нояб." */
export const fmtDM = (d: Date) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}`;

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const plural = (n: number, forms: [string, string, string]) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
};
