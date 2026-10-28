export type OvertimeKind = "flsa" | "ca" | "ak" | "nv" | "co" | "hospital" | "custom" | "none";
export type PeriodKind = "biweekly" | "weekly" | "semimonthly" | "monthly";
export type PremiumKind = "night" | "weekend" | "holiday" | "other";
export type BreakMode = "auto" | "paid" | "unpaid";

export interface Premium {
  id: string;
  kind: PremiumKind;
  percent: number;
}

export interface Job {
  id: string;
  name: string;
  employer: string;
  icon: string;
  color: string;
  rate: number;
  overtime: OvertimeKind;
  dailyAfter: number | null;
  dailyMult: number;
  weeklyAfter: number | null;
  weeklyMult: number;
  windowDays: 7 | 14;
  weekStart: number; // 0 = Monday ... 6 = Sunday
  period: PeriodKind;
  periodAnchor: string; // yyyy-mm-dd, first day of any period (for biweekly)
  payDay: number; // days after period end
  premiums: Premium[];
  breakPaidUnder: number; // minutes
  timezone: string;
  notes: string;
  deletedAt?: number;
}

export interface Shift {
  id: string;
  jobId: string;
  date: string; // yyyy-mm-dd of start
  start: string; // HH:MM
  end: string; // HH:MM
  breakMin: number;
  breakMode: BreakMode;
  rate: number;
  tips: number;
  note: string;
  deletedAt?: number;
  virtual?: boolean;
}

export interface ShiftType {
  start: string;
  end: string;
}

export interface Schedule {
  id: string;
  jobId: string;
  name: string;
  scheme: string;
  types: ShiftType[];
  cycle: number[]; // 0 = off, n = shift type n
  firstDay: string;
  until: string | null;
  breakMin: number;
  deletedAt?: number;
}

export interface Payslip {
  id: string;
  jobId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  hours: number | null;
  createdAt: number;
}

export interface Timer {
  jobId: string;
  startedAt: number;
  status: "running" | "break";
  breakStartedAt: number | null;
  breakAccumMs: number;
}

export interface BookData {
  jobs: Job[];
  shifts: Shift[];
  schedules: Schedule[];
  payslips: Payslip[];
  timer: Timer | null;
}

export interface BookMeta {
  id: string;
  name: string;
}

export interface Settings {
  currency: string;
  hoursFormat: "decimal" | "hm";
  remindBefore: number; // 0 = off, minutes
  remindPayday: boolean;
  remindOvertime: boolean;
  hideAmounts: boolean;
  theme: "light" | "dark";
  lang: string;
  profileName: string;
}

export interface AppState {
  books: BookMeta[];
  activeBook: string;
  data: Record<string, BookData>;
  settings: Settings;
}
