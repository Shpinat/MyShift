import { useCallback, useEffect, useMemo, useState } from "react";
import { AppProvider, useApp } from "./lib/store";
import { UICtx, type SheetState, type Tab } from "./lib/uictx";
import { AssistantTab, BottomNav, Header, Logo } from "./components/Shell";
import { Confirm } from "./components/ui";
import { ShiftSheet } from "./components/ShiftSheet";
import { JobSheet } from "./components/JobSheet";
import { ScheduleSheet } from "./components/ScheduleSheet";
import { HowtoSheet, InfoSheet, TipsSheet, TrashSheet } from "./components/MiscSheets";
import Overview from "./pages/Overview";
import Shifts from "./pages/Shifts";
import CalendarPage from "./pages/Calendar";
import Work from "./pages/Work";
import Payslip from "./pages/Payslip";
import { upcomingPayPeriod } from "./lib/calc";
import { diffDays, startOfDay } from "./lib/dates";

const TABS: Tab[] = ["overview", "shifts", "calendar", "work", "payslip"];
const fromHash = (): Tab => {
  const h = window.location.hash.replace("#", "") as Tab;
  return TABS.includes(h) ? h : "overview";
};

/** Browser notifications while the app is open: before a shift, before payday, before overtime. */
function useReminders() {
  const { pays, jobs, settings, now } = useApp();
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const sent = new Set<string>(JSON.parse(sessionStorage.getItem("shift-tracker:sent") || "[]"));
    const fire = (key: string, title: string, body: string) => {
      if (sent.has(key)) return;
      sent.add(key);
      sessionStorage.setItem("shift-tracker:sent", JSON.stringify([...sent]));
      new Notification(title, { body });
    };
    if (settings.remindBefore > 0) {
      for (const p of pays) {
        const mins = (p.start.getTime() - now.getTime()) / 60000;
        if (mins > 0 && mins <= settings.remindBefore) fire(`s:${p.shift.id}`, "Скоро смена", `${p.job.name}, начало в ${p.shift.start}`);
      }
    }
    if (settings.remindPayday) {
      for (const j of jobs) {
        const per = upcomingPayPeriod(j, now);
        if (diffDays(per.pay, startOfDay(now)) === 1) fire(`p:${j.id}:${per.pay.toISOString()}`, "Завтра зарплата", `${j.name}: выплата завтра`);
      }
    }
    if (settings.remindOvertime && now.getHours() >= 18) {
      for (const p of pays) {
        if (p.overtimeHours > 0 && diffDays(p.start, startOfDay(now)) === 1) fire(`o:${p.shift.id}`, "Сверхурочные", `Завтра смена «${p.job.name}» выходит за порог сверхурочных`);
      }
    }
  }, [pays, jobs, settings, now]);
}

function Inner() {
  const { toast, book, patchBook } = useApp();
  const [tab, setTab] = useState<Tab>(fromHash);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirm, setConfirm] = useState<{ text: string; onOk: () => void; okLabel?: string } | null>(null);
  useReminders();

  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Trash items live for 30 days
  useEffect(() => {
    const limit = Date.now() - 30 * 86400000;
    const stale = [...book.jobs, ...book.shifts, ...book.schedules].some((x) => x.deletedAt && x.deletedAt < limit);
    if (stale) {
      const keep = <T extends { deletedAt?: number }>(l: T[]) => l.filter((x) => !x.deletedAt || x.deletedAt >= limit);
      patchBook((b) => ({ ...b, jobs: keep(b.jobs), shifts: keep(b.shifts), schedules: keep(b.schedules) }));
    }
  }, [book, patchBook]);

  const go = useCallback((t: Tab) => {
    window.location.hash = t === "overview" ? "" : t;
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  const ui = useMemo(
    () => ({ tab, go, openSheet: setSheet, askConfirm: (text: string, onOk: () => void, okLabel?: string) => setConfirm({ text, onOk, okLabel }) }),
    [tab, go],
  );
  const close = useCallback(() => setSheet(null), []);

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <Logo />
            <span>Трекер смен</span>
          </div>
          <BottomNav />
        </aside>
        <div className="main">
          <Header />
          <main className="content" key={tab}>
            {tab === "overview" && <Overview />}
            {tab === "shifts" && <Shifts />}
            {tab === "calendar" && <CalendarPage />}
            {tab === "work" && <Work />}
            {tab === "payslip" && <Payslip />}
          </main>
        </div>
        <div className="bottom-nav-wrap">
          <BottomNav />
        </div>
        <AssistantTab onClick={() => setSheet({ type: "tips" })} />
      </div>

      {sheet?.type === "shift" && <ShiftSheet key={sheet.shift?.id ?? "new"} initial={sheet.shift} fromTimer={sheet.fromTimer} onClose={close} />}
      {sheet?.type === "job" && <JobSheet job={sheet.job} onClose={close} />}
      {sheet?.type === "schedule" && <ScheduleSheet jobId={sheet.jobId} onClose={close} />}
      {sheet?.type === "trash" && <TrashSheet onClose={close} />}
      {sheet?.type === "howto" && <HowtoSheet onClose={close} />}
      {sheet?.type === "tips" && <TipsSheet onClose={close} />}
      {sheet?.type === "info" && <InfoSheet k={sheet.key} onClose={close} />}
      {confirm && (
        <Confirm
          text={confirm.text}
          okLabel={confirm.okLabel}
          onCancel={() => setConfirm(null)}
          onOk={() => {
            confirm.onOk();
            setConfirm(null);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </UICtx.Provider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  );
}
