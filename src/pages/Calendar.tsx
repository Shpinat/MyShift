import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useApp } from "../lib/store";
import { useUI } from "../lib/uictx";
import { PageTitle } from "../components/Shell";
import { JobBadge } from "../components/ui";
import { DOW_SHORT, MONTHS, addDays, cap, diffDays, fmtDayShort, startOfDay, toISO, weekday } from "../lib/dates";
import { hoursFmt, money } from "../lib/format";
import { sumPay } from "../lib/calc";

export default function CalendarPage() {
  const { pays, settings, now } = useApp();
  const { openSheet } = useUI();
  const today = startOfDay(now);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(toISO(today));

  const byDay = useMemo(() => {
    const m = new Map<string, typeof pays>();
    for (const p of pays) {
      const k = p.shift.date;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [pays]);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(first, -weekday(first));
  const weeks = Math.ceil((weekday(first) + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  const monthPays = pays.filter((p) => p.start.getMonth() === cursor.getMonth() && p.start.getFullYear() === cursor.getFullYear() && !p.planned);
  const t = sumPay(monthPays);
  const upcoming = pays.filter((p) => diffDays(p.start, today) >= 0 && diffDays(p.start, today) < 14);
  const selDate = new Date(sel + "T00:00:00");
  const selList = byDay.get(sel) ?? [];

  const row = (p: (typeof pays)[number]) => (
    <button key={p.shift.id} className="cal-item" onClick={() => openSheet({ type: "shift", shift: p.shift })}>
      <JobBadge job={p.job} size={34} />
      <div className="left grow">
        <strong>
          {fmtDayShort(p.start)} · {p.job.name}
        </strong>
        <small>
          {p.shift.start} – {p.shift.end} · {hoursFmt(p.hours, settings)}
        </small>
      </div>
      <strong>{money(p.total, settings)}</strong>
    </button>
  );

  return (
    <>
      <PageTitle title="Календарь" />
      <section className="card cal">
        <div className="cal-stats">
          <span>
            Заработано за месяц: <b>{money(t.total, settings)}</b>
          </span>
          <span>
            Часы: <b>{hoursFmt(t.hours, settings)}</b>
          </span>
        </div>
        <div className="cal-legend">
          <span><i className="dotk worked" />Отработано</span>
          <span><i className="dotk plan" />По графику</span>
        </div>
        <div className="cal-nav">
          <h2>
            {cap(MONTHS[cursor.getMonth()])} <small>{cursor.getFullYear()}</small>
          </h2>
          <div className="cal-ctl">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Предыдущий месяц">
              <ChevronLeft size={18} />
            </button>
            <button
              className="today"
              onClick={() => {
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                setSel(toISO(today));
              }}
            >
              Сегодня
            </button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Следующий месяц">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="cal-grid dow">
          {DOW_SHORT.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {days.map((d) => {
            const k = toISO(d);
            const list = byDay.get(k) ?? [];
            const out = d.getMonth() !== cursor.getMonth();
            return (
              <button key={k} className={`day ${out ? "out" : ""} ${k === sel ? "sel" : ""} ${diffDays(d, today) === 0 ? "today" : ""} ${weekday(d) >= 5 ? "we" : ""}`} onClick={() => setSel(k)} aria-label={fmtDayShort(d)} aria-pressed={k === sel}>
                <span>{d.getDate()}</span>
                <span className="dots">
                  {list.slice(0, 3).map((p) => (
                    <i key={p.shift.id} className={p.planned ? "plan" : "worked"} style={{ ["--c" as string]: p.job.color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="cal-panel">
          <div className="card-head tight">
            <span className="tile violet">
              <CalendarDays size={19} />
            </span>
            <h3>{diffDays(selDate, today) === 0 ? "Сегодня" : fmtDayShort(selDate)}</h3>
            <span className="grow" />
            <button className="icon-btn soft sm" onClick={() => openSheet({ type: "shift", shift: { date: sel } })} aria-label="Добавить смену в этот день">
              <Plus size={16} />
            </button>
          </div>
          {selList.length === 0 ? <p className="muted small pad0">В этот день смен нет.</p> : selList.map(row)}
          <h4 className="eyebrow group">БЛИЖАЙШИЕ 14 ДНЕЙ</h4>
          {upcoming.length === 0 ? <p className="muted small pad0">Ближайшие две недели свободны.</p> : upcoming.map(row)}
        </div>
      </section>
    </>
  );
}
