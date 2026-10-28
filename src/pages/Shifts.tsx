import { useMemo, useState } from "react";
import { ChevronDown, FileText, RefreshCcw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useApp } from "../lib/store";
import { useUI } from "../lib/uictx";
import { PageTitle } from "../components/Shell";
import { TimerCard } from "../components/Timer";
import { Empty, JobBadge, Seg } from "../components/ui";
import { addDays, fmtDayShort, fmtDayLong, startOfDay, toISO } from "../lib/dates";
import { hoursFmt, money, download } from "../lib/format";
import { sumPay } from "../lib/calc";
import { shiftsToCsv } from "../lib/csv";
import { Clock } from "lucide-react";

type Status = "all" | "worked" | "planned";
type Range = "all" | "month" | "30";

export default function Shifts() {
  const { pays, jobs, settings, now, book, deleteShifts, notify } = useApp();
  const { openSheet } = useUI();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(false);
  const [jobF, setJobF] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [range, setRange] = useState<Range>("all");
  const [sel, setSel] = useState<string[]>([]);
  const [exp, setExp] = useState(false);

  const list = useMemo(() => {
    const today = startOfDay(now);
    const horizon = addDays(today, 30);
    return pays
      .filter((p) => !p.shift.virtual || p.start < horizon)
      .filter((p) => (jobF === "all" ? true : p.job.id === jobF))
      .filter((p) => (status === "all" ? true : status === "planned" ? p.planned : !p.planned))
      .filter((p) => {
        if (range === "month") return p.start.getMonth() === now.getMonth() && p.start.getFullYear() === now.getFullYear();
        if (range === "30") return p.start >= addDays(today, -30);
        return true;
      })
      .filter((p) => !q.trim() || `${p.job.name} ${p.shift.note} ${p.job.employer}`.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [pays, now, jobF, status, range, q]);

  const worked = list.filter((p) => !p.planned);
  const totals = sumPay(worked);
  const hasFilters = jobF !== "all" || status !== "all" || range !== "all";
  const realSel = sel.filter((id) => list.some((p) => p.shift.id === id));

  const repeatLast = () => {
    const last = [...book.shifts].filter((s) => !s.deletedAt).sort((a, b) => (a.date + a.start < b.date + b.start ? 1 : -1))[0];
    if (!last) return notify("Пока нет смен, которые можно повторить");
    openSheet({ type: "shift", shift: { ...last, id: undefined, date: toISO(new Date()), note: "" } });
  };

  const timesheet = () => {
    const rows: (string | number)[][] = [["Дата", "Начало", "Конец", "Перерыв, мин", "Работа", "Часы", "Начислено", "Чаевые", "Заметка"]];
    for (const p of worked.slice().reverse()) rows.push([p.shift.date, p.shift.start, p.shift.end, p.shift.breakMin, p.job.name, p.hours.toFixed(2), (p.total).toFixed(2), p.tips, p.shift.note]);
    download(`timesheet-${toISO(now)}.csv`, shiftsToCsv(rows), "text/csv");
    setExp(false);
  };

  const invoice = () => {
    setExp(false);
    const w = window.open("", "_blank");
    if (!w) return notify("Разрешите всплывающие окна, чтобы открыть счёт");
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const rows = worked
      .slice()
      .reverse()
      .map((p) => `<tr><td>${esc(fmtDayLong(p.start))}</td><td>${esc(p.job.name)}</td><td>${p.shift.start}–${p.shift.end}</td><td style="text-align:right">${esc(hoursFmt(p.hours, settings))}</td><td style="text-align:right">${esc(money(p.total, settings, { force: true }))}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Счёт</title><style>body{font:14px system-ui;margin:40px;color:#111}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}h1{margin:0 0 4px}</style><h1>Счёт за смены</h1><p>Сформирован ${esc(fmtDayLong(now))}</p><table><tr><th>Дата</th><th>Работа</th><th>Время</th><th>Часы</th><th>Сумма</th></tr>${rows}<tr><th colspan="3">Итого</th><th style="text-align:right">${esc(hoursFmt(totals.hours, settings))}</th><th style="text-align:right">${esc(money(totals.total, settings, { force: true }))}</th></tr></table><script>setTimeout(()=>print(),300)<\/script>`);
    w.document.close();
  };

  return (
    <>
      <PageTitle title="Смены" badge={<span className="count-pill green">{list.filter((p) => !p.shift.virtual).length}</span>} />
      <TimerCard />

      <div className="toolbar">
        <button className={`btn chip-btn ${filters || hasFilters ? "active" : ""}`} onClick={() => setFilters(!filters)}>
          <SlidersHorizontal size={15} /> ФИЛЬТРЫ
        </button>
        <button className="btn chip-btn" onClick={repeatLast}>
          <RefreshCcw size={15} className="accent" /> КАК ПРОШЛАЯ СМЕНА
        </button>
        <div className="menu-wrap">
          <button className="btn chip-btn" onClick={() => setExp(!exp)} aria-expanded={exp}>
            <FileText size={15} className="accent" /> ТАБЕЛЬ / СЧЁТ <ChevronDown size={14} />
          </button>
          {exp && (
            <div className="popover menu left-0">
              <button className="mrow" onClick={timesheet}>
                <span className="mrow-ico t-violet"><FileText size={16} /></span>Табель (CSV)
              </button>
              <button className="mrow" onClick={invoice}>
                <span className="mrow-ico t-teal"><FileText size={16} /></span>Счёт (печать / PDF)
              </button>
            </div>
          )}
        </div>
      </div>

      {filters && (
        <section className="card filters">
          <div className="chips">
            <button className={`chip ${jobF === "all" ? "on" : ""}`} onClick={() => setJobF("all")}>Все работы</button>
            {jobs.map((j) => (
              <button key={j.id} className={`chip job ${jobF === j.id ? "on" : ""}`} onClick={() => setJobF(j.id)}>
                <JobBadge job={j} size={20} />{j.name}
              </button>
            ))}
          </div>
          <Seg<Status> size="sm" value={status} onChange={setStatus} options={[{ value: "all", label: "Все" }, { value: "worked", label: "Отработанные" }, { value: "planned", label: "По графику" }]} />
          <Seg<Range> size="sm" value={range} onChange={setRange} options={[{ value: "all", label: "Всё время" }, { value: "month", label: "Этот месяц" }, { value: "30", label: "30 дней" }]} />
        </section>
      )}

      <label className="search">
        <Search size={17} />
        <input placeholder="Поиск по заметкам и работе" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <div className="card summary-row">
        <span>{worked.length} {worked.length === 1 ? "смена" : "смены"}</span>
        <span>Часы: <b>{hoursFmt(totals.hours, settings)}</b></span>
        <span className="grow" />
        <span>Заработано: <b>{money(totals.total, settings)}</b></span>
      </div>

      {realSel.length > 0 && (
        <div className="selbar">
          <b className="accent">Выбрано: {realSel.length}</b>
          <span className="grow" />
          <button
            className="btn danger-outline sm"
            onClick={() => {
              deleteShifts(realSel);
              setSel([]);
              notify("Смены перенесены в корзину");
            }}
          >
            <Trash2 size={15} /> Удалить
          </button>
          <button className="icon-btn ghost" onClick={() => setSel([])} aria-label="Снять выбор">
            <X size={17} />
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <section className="card">
          <Empty icon={Clock} title="Смен пока нет" text="Запустите таймер или добавьте смену кнопкой «+»." />
        </section>
      ) : (
        <section className="card list-card">
          {list.map((p) => {
            const checked = sel.includes(p.shift.id);
            return (
              <div key={p.shift.id} className={`shift-row ${checked ? "sel" : ""} ${p.planned ? "planned" : ""}`}>
                {p.shift.virtual ? (
                  <span className="check-ph" />
                ) : (
                  <input type="checkbox" className="check" checked={checked} onChange={() => setSel(checked ? sel.filter((x) => x !== p.shift.id) : [...sel, p.shift.id])} aria-label="Выбрать смену" />
                )}
                <button className="shift-main" onClick={() => openSheet({ type: "shift", shift: p.shift })}>
                  <JobBadge job={p.job} />
                  <div className="left grow">
                    <strong>{fmtDayShort(p.start)}</strong>
                    <small>
                      {p.shift.start} – {p.shift.end} · {p.job.name}
                    </small>
                  </div>
                  <div className="right">
                    <strong>{money(p.total, settings)}</strong>
                    <small>{p.planned ? "план · " : ""}{hoursFmt(p.hours, settings)}</small>
                  </div>
                </button>
              </div>
            );
          })}
        </section>
      )}
      <p className="fine center">Оплата считается по правилам каждой работы. Смены после {fmtDayLong(now)} — план, а не заработок.</p>
    </>
  );
}
