import type { BookData, Job, OvertimeKind, Premium, Schedule, Shift } from "./types";
import { addDays, diffDays, fromISO, startOfDay, timeToMin, toISO, weekday } from "./dates";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export interface OvertimePreset {
  id: OvertimeKind;
  title: string;
  text: string;
  dailyAfter: number | null;
  dailyMult: number;
  weeklyAfter: number | null;
  weeklyMult: number;
  windowDays: 7 | 14;
}

export const OVERTIME_PRESETS: OvertimePreset[] = [
  { id: "flsa", title: "США: федеральные (FLSA)", text: "×1,5 после 40 часов за рабочую неделю, по средней ставке. Большинство штатов США.", dailyAfter: null, dailyMult: 1.5, weeklyAfter: 40, weeklyMult: 1.5, windowDays: 7 },
  { id: "ca", title: "Калифорния", text: "×1,5 после 8 ч в день или 40 в неделю, ×2 после 12 ч в день; для седьмого дня подряд — своё правило.", dailyAfter: 8, dailyMult: 1.5, weeklyAfter: 40, weeklyMult: 1.5, windowDays: 7 },
  { id: "ak", title: "Аляска", text: "×1,5 после 8 часов в день или 40 в неделю — что выгоднее.", dailyAfter: 8, dailyMult: 1.5, weeklyAfter: 40, weeklyMult: 1.5, windowDays: 7 },
  { id: "nv", title: "Невада", text: "×1,5 после 40 часов в неделю; после 8 в день — только при ставке ниже 1,5 минимальной.", dailyAfter: null, dailyMult: 1.5, weeklyAfter: 40, weeklyMult: 1.5, windowDays: 7 },
  { id: "co", title: "Колорадо", text: "×1,5 после 12 часов в день или 40 в неделю — что выгоднее.", dailyAfter: 12, dailyMult: 1.5, weeklyAfter: 40, weeklyMult: 1.5, windowDays: 7 },
  { id: "hospital", title: "Больничное 8/80", text: "×1,5 после 8 часов в день или 80 за фиксированные 14 дней — для больниц и домов престарелых, которые его применяют.", dailyAfter: 8, dailyMult: 1.5, weeklyAfter: 80, weeklyMult: 1.5, windowDays: 14 },
  { id: "custom", title: "Своё правило", text: "Задайте дневной и недельный пороги и коэффициенты из договора — так настраиваются сверхурочные для работы вне США.", dailyAfter: null, dailyMult: 1.5, weeklyAfter: 40, weeklyMult: 1.5, windowDays: 7 },
  { id: "none", title: "Без сверхурочных", text: "Все часы по одной ставке: должности без права на сверхурочные, подряд или работа без доплат за переработку.", dailyAfter: null, dailyMult: 1, weeklyAfter: null, weeklyMult: 1, windowDays: 7 },
];

export const RU_HOLIDAYS = ["01-01", "01-02", "01-03", "01-04", "01-05", "01-06", "01-07", "01-08", "02-23", "03-08", "05-01", "05-09", "06-12", "11-04"];

export const PREMIUM_LABEL: Record<Premium["kind"], string> = { night: "Ночь", weekend: "Выходные", holiday: "Праздник", other: "Другое" };

// ---------- shift timing ----------
export const shiftStart = (s: Shift) => {
  const d = fromISO(s.date);
  const m = timeToMin(s.start);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, m, 0);
};

export const shiftDurationMin = (s: Shift) => {
  const a = timeToMin(s.start);
  let b = timeToMin(s.end);
  if (b <= a) b += 1440;
  return b - a;
};

export const shiftEnd = (s: Shift) => new Date(shiftStart(s).getTime() + shiftDurationMin(s) * 60000);

export const deductedBreak = (s: Shift, job?: Job) => {
  if (s.breakMode === "paid") return 0;
  if (s.breakMode === "unpaid") return s.breakMin;
  const threshold = job?.breakPaidUnder ?? 20;
  return s.breakMin >= threshold ? s.breakMin : 0;
};

export const shiftHours = (s: Shift, job?: Job) => Math.max(0, shiftDurationMin(s) - deductedBreak(s, job)) / 60;

/** Minutes that fall in the night window 22:00–06:00. */
const nightMinutes = (s: Shift) => {
  const a = timeToMin(s.start);
  const total = shiftDurationMin(s);
  let n = 0;
  for (let t = a; t < a + total; t += 5) {
    const h = (t % 1440) / 60;
    if (h >= 22 || h < 6) n += 5;
  }
  return n;
};

const isHolidayDate = (d: Date) => RU_HOLIDAYS.includes(`${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);

// ---------- pay periods ----------
export interface Period {
  start: Date;
  end: Date; // inclusive
  pay: Date;
}

export const periodFor = (job: Job, date: Date): Period => {
  const d = startOfDay(date);
  let start: Date;
  let end: Date;
  if (job.period === "monthly") {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  } else if (job.period === "semimonthly") {
    if (d.getDate() <= 15) {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth(), 15);
    } else {
      start = new Date(d.getFullYear(), d.getMonth(), 16);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }
  } else if (job.period === "weekly") {
    start = addDays(d, -((weekday(d) - job.weekStart + 7) % 7));
    end = addDays(start, 6);
  } else {
    const anchor = fromISO(job.periodAnchor);
    const k = Math.floor(diffDays(d, anchor) / 14);
    start = addDays(anchor, k * 14);
    end = addDays(start, 13);
  }
  return { start, end, pay: addDays(end, job.payDay) };
};

export const prevPeriod = (job: Job, p: Period) => periodFor(job, addDays(p.start, -1));

/** The period whose payout is the nearest one that has not happened yet. */
export const upcomingPayPeriod = (job: Job, now: Date): Period => {
  const cur = periodFor(job, now);
  const prev = prevPeriod(job, cur);
  return startOfDay(prev.pay) >= startOfDay(now) ? prev : cur;
};

// ---------- schedules ----------
export const expandSchedule = (sc: Schedule, from: Date, to: Date): Shift[] => {
  if (sc.deletedAt || !sc.cycle.length) return [];
  const first = fromISO(sc.firstDay);
  const until = sc.until ? fromISO(sc.until) : null;
  const out: Shift[] = [];
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    if (d < first || (until && d > until)) continue;
    const idx = ((diffDays(d, first) % sc.cycle.length) + sc.cycle.length) % sc.cycle.length;
    const type = sc.cycle[idx];
    if (!type) continue;
    const t = sc.types[type - 1];
    if (!t) continue;
    out.push({ id: `sch:${sc.id}:${toISO(d)}`, jobId: sc.jobId, date: toISO(d), start: t.start, end: t.end, breakMin: sc.breakMin, breakMode: "auto", rate: 0, tips: 0, note: "", virtual: true });
  }
  return out;
};

/** Real, non-deleted shifts plus planned shifts coming from schedules (future only). */
export const allShifts = (book: BookData, now: Date, horizonDays = 120): Shift[] => {
  const jobs = new Map(book.jobs.filter((j) => !j.deletedAt).map((j) => [j.id, j]));
  const real = book.shifts.filter((s) => !s.deletedAt && jobs.has(s.jobId));
  const taken = new Set(real.map((s) => `${s.jobId}|${s.date}`));
  const virt: Shift[] = [];
  for (const sc of book.schedules) {
    if (!jobs.has(sc.jobId)) continue;
    for (const s of expandSchedule(sc, startOfDay(now), addDays(now, horizonDays))) {
      if (taken.has(`${s.jobId}|${s.date}`)) continue;
      if (shiftStart(s) <= now) continue;
      s.rate = jobs.get(s.jobId)!.rate;
      virt.push(s);
    }
  }
  return [...real, ...virt];
};

// ---------- pay calculation ----------
export interface ShiftPay {
  shift: Shift;
  job: Job;
  hours: number;
  overtimeHours: number;
  base: number;
  premium: number;
  overtime: number;
  tips: number;
  total: number;
  planned: boolean;
  start: Date;
}

const premiumShare = (s: Shift, job: Job, hours: number) => {
  if (!job.premiums.length || hours <= 0) return 0;
  const dur = shiftDurationMin(s);
  const day = fromISO(s.date);
  const crossesMidnight = timeToMin(s.start) + dur > 1440;
  const ratio = dur ? hours / (dur / 60) : 0;
  let sum = 0;
  for (const p of job.premiums) {
    let h = 0;
    if (p.kind === "night") h = (nightMinutes(s) / 60) * ratio;
    else if (p.kind === "weekend") {
      const wd = weekday(day);
      const firstPart = crossesMidnight ? (1440 - timeToMin(s.start)) / 60 : dur / 60;
      const secondPart = dur / 60 - firstPart;
      h = ((wd >= 5 ? firstPart : 0) + (crossesMidnight && (wd + 1) % 7 >= 5 ? secondPart : 0)) * ratio;
    } else if (p.kind === "holiday") h = isHolidayDate(day) ? hours : 0;
    else h = hours;
    sum += h * s.rate * (p.percent / 100);
  }
  return sum;
};

export const computePay = (shifts: Shift[], jobs: Job[], now: Date): ShiftPay[] => {
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const out: ShiftPay[] = [];
  const byJob = new Map<string, Shift[]>();
  for (const s of shifts) {
    if (!jobMap.has(s.jobId)) continue;
    const arr = byJob.get(s.jobId) ?? [];
    arr.push(s);
    byJob.set(s.jobId, arr);
  }
  for (const [jobId, list] of byJob) {
    const job = jobMap.get(jobId)!;
    list.sort((a, b) => shiftStart(a).getTime() - shiftStart(b).getTime());
    const winTotals = new Map<string, number>();
    for (const s of list) {
      const start = shiftStart(s);
      const hours = shiftHours(s, job);
      let ot = 0;
      if (job.overtime !== "none") {
        const dayOt = job.dailyAfter != null ? Math.max(0, hours - job.dailyAfter) : 0;
        const regular = hours - dayOt;
        let key: string;
        if (job.windowDays === 14) {
          key = String(Math.floor(diffDays(startOfDay(start), fromISO(job.periodAnchor)) / 14));
        } else {
          key = toISO(addDays(startOfDay(start), -((weekday(start) - job.weekStart + 7) % 7)));
        }
        const before = winTotals.get(key) ?? 0;
        let weekOt = 0;
        if (job.weeklyAfter != null) {
          weekOt = Math.max(0, regular - Math.max(0, job.weeklyAfter - before));
        }
        winTotals.set(key, before + regular);
        ot = dayOt + weekOt;
      }
      const rate = s.rate || job.rate;
      const base = hours * rate;
      const premium = premiumShare({ ...s, rate }, job, hours);
      const mult = job.dailyAfter != null && hours > job.dailyAfter ? job.dailyMult : job.weeklyMult;
      const overtime = ot * rate * Math.max(0, mult - 1);
      out.push({ shift: s, job, hours, overtimeHours: ot, base, premium, overtime, tips: s.tips || 0, total: base + premium + overtime, planned: start > now, start });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
};

export interface Totals {
  hours: number;
  shifts: number;
  overtimeHours: number;
  base: number;
  premium: number;
  overtime: number;
  tips: number;
  total: number;
}

export const emptyTotals = (): Totals => ({ hours: 0, shifts: 0, overtimeHours: 0, base: 0, premium: 0, overtime: 0, tips: 0, total: 0 });

export const sumPay = (list: ShiftPay[]): Totals =>
  list.reduce((t, p) => {
    t.hours += p.hours;
    t.shifts += 1;
    t.overtimeHours += p.overtimeHours;
    t.base += p.base;
    t.premium += p.premium;
    t.overtime += p.overtime;
    t.tips += p.tips;
    t.total += p.total;
    return t;
  }, emptyTotals());

export const inRange = (p: ShiftPay, start: Date, end: Date) => {
  const d = startOfDay(p.start);
  return d >= startOfDay(start) && d <= startOfDay(end);
};

/** Single-shift preview (used in the shift form). */
export const previewShift = (s: Shift, job: Job | undefined) => {
  if (!job) return { hours: 0, total: 0 };
  const hours = shiftHours(s, job);
  const rate = s.rate || job.rate;
  return { hours, total: hours * rate + premiumShare({ ...s, rate }, job, hours) };
};
