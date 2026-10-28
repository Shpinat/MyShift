import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppState, BookData, Job, Payslip, Schedule, Settings, Shift } from "./types";
import { allShifts, computePay, uid, type ShiftPay } from "./calc";
import { addDays, toISO, weekday } from "./dates";

const KEY = "shift-tracker:v1";

export const defaultJob = (over: Partial<Job> = {}): Job => ({
  id: uid(),
  name: "",
  employer: "",
  icon: "heart-pulse",
  color: "#1f9fc4",
  rate: 0,
  overtime: "none",
  dailyAfter: null,
  dailyMult: 1.5,
  weeklyAfter: null,
  weeklyMult: 1.5,
  windowDays: 7,
  weekStart: 0,
  period: "monthly",
  periodAnchor: toISO(addDays(new Date(), -weekday(new Date()))),
  payDay: 12,
  premiums: [],
  breakPaidUnder: 20,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  notes: "",
  ...over,
});

const emptyBook = (): BookData => ({ jobs: [], shifts: [], schedules: [], payslips: [], timer: null });

const seedBook = (): BookData => {
  const job = defaultJob({ name: "Ассистент", rate: 380 });
  const today = new Date();
  const mk = (offset: number, start: string, end: string): Shift => ({
    id: uid(),
    jobId: job.id,
    date: toISO(addDays(today, offset)),
    start,
    end,
    breakMin: 0,
    breakMode: "auto",
    rate: job.rate,
    tips: 0,
    note: "",
  });
  return { ...emptyBook(), jobs: [job], shifts: [mk(-3, "12:00", "20:00"), mk(-1, "14:00", "20:00")] };
};

const defaultSettings = (): Settings => ({
  currency: "RUB",
  hoursFormat: "decimal",
  remindBefore: 0,
  remindPayday: false,
  remindOvertime: false,
  hideAmounts: false,
  theme: "light",
  lang: "RU",
  profileName: "Гость",
});

const initial = (): AppState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as AppState;
      if (p && p.books?.length && p.data?.[p.activeBook]) return { ...p, settings: { ...defaultSettings(), ...p.settings } };
    }
  } catch {
    /* ignore corrupted storage */
  }
  return { books: [{ id: "personal", name: "Личное" }], activeBook: "personal", data: { personal: seedBook() }, settings: defaultSettings() };
};

interface Ctx {
  state: AppState;
  settings: Settings;
  book: BookData;
  jobs: Job[];
  now: Date;
  pays: ShiftPay[];
  trashCount: number;
  toast: string | null;
  notify: (m: string) => void;
  setSettings: (p: Partial<Settings>) => void;
  saveJob: (j: Job) => void;
  deleteJob: (id: string) => void;
  saveShift: (s: Shift) => void;
  deleteShifts: (ids: string[]) => void;
  saveSchedule: (s: Schedule) => void;
  deleteSchedule: (id: string) => void;
  savePayslip: (p: Payslip) => void;
  restore: (kind: "job" | "shift" | "schedule", id: string) => void;
  purge: (kind: "job" | "shift" | "schedule", id: string) => void;
  patchBook: (fn: (b: BookData) => BookData) => void;
  switchBook: (id: string) => void;
  addBook: (name: string) => void;
  importShifts: (s: Shift[]) => void;
  resetAll: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppProvider missing");
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [now, setNow] = useState(() => new Date());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const book = state.data[state.activeBook];

  const notify = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const patchBook = useCallback((fn: (b: BookData) => BookData) => {
    setState((s) => ({ ...s, data: { ...s.data, [s.activeBook]: fn(s.data[s.activeBook]) } }));
  }, []);

  const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

  const value = useMemo<Ctx>(() => {
    const jobs = book.jobs.filter((j) => !j.deletedAt);
    const pays = computePay(allShifts(book, now), jobs, now);
    const trashCount = [...book.jobs, ...book.shifts, ...book.schedules].filter((x) => x.deletedAt).length;
    const stamp = () => Date.now();
    return {
      state,
      settings: state.settings,
      book,
      jobs,
      now,
      pays,
      trashCount,
      toast,
      notify,
      patchBook,
      setSettings: (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      saveJob: (j) => patchBook((b) => ({ ...b, jobs: upsert(b.jobs, j) })),
      deleteJob: (id) => patchBook((b) => ({ ...b, jobs: b.jobs.map((j) => (j.id === id ? { ...j, deletedAt: stamp() } : j)), timer: b.timer?.jobId === id ? null : b.timer })),
      saveShift: (s) => patchBook((b) => ({ ...b, shifts: upsert(b.shifts, s) })),
      deleteShifts: (ids) => patchBook((b) => ({ ...b, shifts: b.shifts.map((s) => (ids.includes(s.id) ? { ...s, deletedAt: stamp() } : s)) })),
      saveSchedule: (s) => patchBook((b) => ({ ...b, schedules: upsert(b.schedules, s) })),
      deleteSchedule: (id) => patchBook((b) => ({ ...b, schedules: b.schedules.map((s) => (s.id === id ? { ...s, deletedAt: stamp() } : s)) })),
      savePayslip: (p) => patchBook((b) => ({ ...b, payslips: upsert(b.payslips, p) })),
      restore: (kind, id) =>
        patchBook((b) => {
          const strip = <T extends { id: string; deletedAt?: number }>(l: T[]) => l.map((x) => (x.id === id ? { ...x, deletedAt: undefined } : x));
          return kind === "job" ? { ...b, jobs: strip(b.jobs) } : kind === "shift" ? { ...b, shifts: strip(b.shifts) } : { ...b, schedules: strip(b.schedules) };
        }),
      purge: (kind, id) =>
        patchBook((b) =>
          kind === "job" ? { ...b, jobs: b.jobs.filter((x) => x.id !== id) } : kind === "shift" ? { ...b, shifts: b.shifts.filter((x) => x.id !== id) } : { ...b, schedules: b.schedules.filter((x) => x.id !== id) },
        ),
      switchBook: (id) => setState((s) => (s.data[id] ? { ...s, activeBook: id } : s)),
      addBook: (name) =>
        setState((s) => {
          const id = uid();
          return { ...s, books: [...s.books, { id, name }], activeBook: id, data: { ...s.data, [id]: emptyBook() } };
        }),
      importShifts: (list) => patchBook((b) => ({ ...b, shifts: [...b.shifts, ...list] })),
      resetAll: () => {
        localStorage.removeItem(KEY);
        setState({ books: [{ id: "personal", name: "Личное" }], activeBook: "personal", data: { personal: seedBook() }, settings: defaultSettings() });
      },
    };
  }, [state, book, now, toast, notify, patchBook]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
