import { useEffect, useState } from "react";
import { Coffee, Pause, Play, Square, Timer as TimerIcon, Trash2, ChevronRight } from "lucide-react";
import { useApp } from "../lib/store";
import { useUI } from "../lib/uictx";
import { clock, money } from "../lib/format";
import { toISO, pad } from "../lib/dates";
import { JobBadge } from "./ui";

export function TimerCard() {
  const { book, jobs, settings, patchBook, notify } = useApp();
  const { openSheet, askConfirm } = useUI();
  const timer = book.timer;
  const [, tick] = useState(0);
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const jobId = timer?.jobId ?? pick ?? jobs[0]?.id;
  const job = jobs.find((j) => j.id === jobId);

  if (!timer) {
    return (
      <section className="card timer-card idle">
        <div className="timer-top">
          <span className="tile green">
            <TimerIcon size={20} />
          </span>
          <div>
            <h3>Начало смены</h3>
            <p>Запустите таймер, когда начинается смена. В конце остановите его — откроется форма смены с уже заполненным временем: проверьте и сохраните.</p>
          </div>
        </div>
        {jobs.length > 0 && (
          <div className="chips">
            {jobs.map((j) => (
              <button key={j.id} className={`chip job ${j.id === jobId ? "on" : ""}`} onClick={() => setPick(j.id)}>
                <JobBadge job={j} size={22} />
                {j.name}
              </button>
            ))}
          </div>
        )}
        <button
          className="btn start"
          onClick={() => {
            if (!job) return notify("Сначала добавьте место работы");
            patchBook((b) => ({ ...b, timer: { jobId: job.id, startedAt: Date.now(), status: "running", breakStartedAt: null, breakAccumMs: 0 } }));
          }}
        >
          <Play size={16} /> НАЧАТЬ СМЕНУ
        </button>
      </section>
    );
  }

  const nowMs = Date.now();
  const onBreak = timer.status === "break";
  const breakMs = timer.breakAccumMs + (onBreak && timer.breakStartedAt ? nowMs - timer.breakStartedAt : 0);
  const workMs = nowMs - timer.startedAt - breakMs;
  const earned = job ? (workMs / 3600000) * job.rate : 0;

  const toggleBreak = () =>
    patchBook((b) => {
      const t = b.timer;
      if (!t) return b;
      const n = Date.now();
      return { ...b, timer: t.status === "running" ? { ...t, status: "break", breakStartedAt: n } : { ...t, status: "running", breakAccumMs: t.breakAccumMs + (t.breakStartedAt ? n - t.breakStartedAt : 0), breakStartedAt: null } };
    });

  const stop = () => {
    const s = new Date(timer.startedAt);
    const e = new Date();
    openSheet({
      type: "shift",
      fromTimer: true,
      shift: { jobId: timer.jobId, date: toISO(s), start: `${pad(s.getHours())}:${pad(s.getMinutes())}`, end: `${pad(e.getHours())}:${pad(e.getMinutes())}`, breakMin: Math.round(breakMs / 60000), breakMode: "auto" },
    });
  };

  return (
    <section className={`card timer-card live ${onBreak ? "break" : ""}`}>
      <div className="live-top">
        <span className="live-badge">
          {job && <JobBadge job={job} size={36} />}
          <i className={`dot ${onBreak ? "amber" : "green"}`} />
        </span>
        <div className="live-info">
          <span className={`live-state ${onBreak ? "amber" : "green"}`}>{onBreak ? "ПЕРЕРЫВ" : "СМЕНА ИДЁТ"}</span>
          <strong>{job?.name}</strong>
        </div>
        <span className="live-earn">≈ {money(earned, settings)}</span>
        <ChevronRight size={16} className="muted" />
      </div>
      <div className="live-row">
        <span className="live-clock" aria-live="off">
          {clock(workMs)}
        </span>
        <div className="live-actions">
          <button className={`icon-btn ${onBreak ? "amber" : ""}`} onClick={toggleBreak} aria-label={onBreak ? "Продолжить" : "Перерыв"} title={onBreak ? "Продолжить" : "Перерыв"}>
            {onBreak ? <Play size={18} /> : <Coffee size={18} />}
          </button>
          <button className="btn stop" onClick={stop}>
            <Square size={13} fill="currentColor" /> Стоп
          </button>
          <button
            className="icon-btn ghost"
            title="Удалить таймер"
            aria-label="Удалить таймер"
            onClick={() => askConfirm("Удалить этот таймер? Смена не сохранится, записанное время пропадёт.", () => patchBook((b) => ({ ...b, timer: null })))}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      {onBreak && (
        <p className="live-note">
          <Pause size={13} /> Время перерыва не входит в часы, пока вы не продолжите.
        </p>
      )}
    </section>
  );
}
