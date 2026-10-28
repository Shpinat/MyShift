import { useMemo, useState } from "react";
import { CalendarDays, Minus, Plus, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import { Field, JobBadge, Sheet } from "./ui";
import { SCHEMES } from "../lib/schemes";
import type { ShiftType } from "../lib/types";
import { uid } from "../lib/calc";
import { DOW_SHORT, addDays, diffDays, startOfDay, toISO, weekday } from "../lib/dates";

const TYPE_COLORS = ["#5136f5", "#0a8f5c", "#e0701a", "#d9003f"];

export function ScheduleSheet({ jobId, onClose }: { jobId?: string; onClose: () => void }) {
  const { jobs, saveSchedule, notify, now } = useApp();
  const [job, setJob] = useState(jobId ?? jobs[0]?.id ?? "");
  const [scheme, setScheme] = useState("4x4");
  const first = SCHEMES[0];
  const [types, setTypes] = useState<ShiftType[]>(first.types);
  const [cycle, setCycle] = useState<number[]>(first.cycle);
  const [firstDay, setFirstDay] = useState(toISO(now));
  const [until, setUntil] = useState<string>("");
  const [breakMin, setBreakMin] = useState("30");
  const [name, setName] = useState("");

  const pick = (id: string) => {
    const s = SCHEMES.find((x) => x.id === id)!;
    setScheme(id);
    setTypes(s.types.map((t) => ({ ...t })));
    setCycle([...s.cycle]);
  };

  const editable = scheme === "custom";
  const resize = (n: number) => {
    const len = Math.max(1, Math.min(56, n));
    setCycle((c) => (len > c.length ? [...c, ...Array(len - c.length).fill(0)] : c.slice(0, len)));
  };
  const cell = (i: number) => {
    if (!editable) return;
    setCycle((c) => c.map((v, k) => (k === i ? (v + 1) % (types.length + 1) : v)));
  };
  const setType = (i: number, p: Partial<ShiftType>) => setTypes((t) => t.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const addType = () => {
    if (types.length >= 4) return;
    setTypes((t) => [...t, { start: "19:00", end: "07:00" }]);
    setScheme("custom");
  };
  const removeType = (i: number) => {
    if (types.length <= 1) return;
    setTypes((t) => t.filter((_, k) => k !== i));
    setCycle((c) => c.map((v) => (v === i + 1 ? 0 : v > i + 1 ? v - 1 : v)));
  };

  const preview = useMemo(() => {
    const start = startOfDay(now);
    const first = new Date(firstDay + "T00:00:00");
    const last = until ? new Date(until + "T00:00:00") : null;
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(start, i);
      const active = d >= first && (!last || d <= last);
      const idx = ((diffDays(d, first) % cycle.length) + cycle.length) % cycle.length;
      return { d, type: active ? cycle[idx] : 0 };
    });
  }, [cycle, firstDay, until, now]);

  const save = () => {
    if (!job || !cycle.some(Boolean)) return;
    saveSchedule({ id: uid(), jobId: job, name: name.trim() || SCHEMES.find((s) => s.id === scheme)?.title || "График", scheme, types, cycle, firstDay, until: until || null, breakMin: parseInt(breakMin) || 0 });
    notify("График добавлен");
    onClose();
  };

  return (
    <Sheet
      title="Новый график"
      onClose={onClose}
      footer={
        <button className="btn primary block" disabled={!job || !cycle.some(Boolean)} onClick={save}>
          Новый график
        </button>
      }
    >
      <Field label="Работа">
        <div className="chips">
          {jobs.map((j) => (
            <button key={j.id} type="button" className={`chip job ${j.id === job ? "on" : ""}`} onClick={() => setJob(j.id)}>
              <JobBadge job={j} size={22} />
              {j.name}
            </button>
          ))}
        </div>
      </Field>
      <div className="field">
        <span className="eyebrow">Схема</span>
        {SCHEMES.map((s) => (
          <button key={s.id} type="button" className={`preset ${scheme === s.id ? "on" : ""}`} onClick={() => pick(s.id)}>
            <b>{s.title}</b>
            <small>{s.text}</small>
          </button>
        ))}
      </div>
      <div className="field">
        <span className="eyebrow">Время смен</span>
        {types.map((t, i) => (
          <div key={i} className="type-row">
            <span className="type-dot" style={{ background: `color-mix(in srgb, ${TYPE_COLORS[i]} 18%, var(--surface))`, color: TYPE_COLORS[i] }}>
              {i + 1}
            </span>
            <input type="time" value={t.start} onChange={(e) => setType(i, { start: e.target.value })} />
            <span>–</span>
            <input type="time" value={t.end} onChange={(e) => setType(i, { end: e.target.value })} />
            {types.length > 1 && (
              <button type="button" className="icon-btn ghost sm" onClick={() => removeType(i)} aria-label="Удалить тип смены">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {types.length < 4 && (
          <button type="button" className="link" onClick={addType}>
            + ДОБАВИТЬ ТИП СМЕНЫ
          </button>
        )}
      </div>
      <div className="field">
        <span className="eyebrow">Цикл: {cycle.length} дней</span>
        <div className="stepper">
          <button type="button" onClick={() => resize(cycle.length - 1)} disabled={!editable || cycle.length <= 1} aria-label="Меньше">
            <Minus size={15} />
          </button>
          <b>{cycle.length}</b>
          <button type="button" onClick={() => resize(cycle.length + 1)} disabled={!editable || cycle.length >= 56} aria-label="Больше">
            <Plus size={15} />
          </button>
        </div>
        <div className="cycle">
          {cycle.map((v, i) => (
            <button key={i} type="button" className={`cyc ${v ? "t" : ""}`} style={v ? { background: `color-mix(in srgb, ${TYPE_COLORS[v - 1]} 16%, var(--surface))`, color: TYPE_COLORS[v - 1] } : undefined} onClick={() => cell(i)} disabled={!editable} aria-label={`День ${i + 1}`}>
              {v || "·"}
            </button>
          ))}
        </div>
        {!editable && <small className="muted">Чтобы менять дни вручную, выберите схему «Свой».</small>}
      </div>
      <Field label="Первый день цикла" hint="С какого дня начинается первый день цикла">
        <span className="input-ico">
          <CalendarDays size={17} />
          <input type="date" value={firstDay} onChange={(e) => setFirstDay(e.target.value)} />
        </span>
      </Field>
      <Field label="Действует до">
        <span className="input-ico">
          <CalendarDays size={17} />
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} placeholder="Без даты окончания" />
        </span>
        {!until && <small className="muted">Без даты окончания</small>}
      </Field>
      <Field label="Перерыв">
        <span className="inline">
          <input className="narrow" inputMode="numeric" value={breakMin} onChange={(e) => setBreakMin(e.target.value.replace(/\D/g, ""))} />
          <span className="muted">мин</span>
        </span>
      </Field>
      <Field label="Название">
        <input placeholder="Необязательно" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="next14">
        <span className="eyebrow">БЛИЖАЙШИЕ 14 ДНЕЙ</span>
        <div className="n14">
          {preview.map(({ d, type }) => (
            <span key={toISO(d)} className={type ? "on" : ""} style={type ? { background: `color-mix(in srgb, ${TYPE_COLORS[type - 1]} 16%, var(--surface))`, color: TYPE_COLORS[type - 1] } : undefined}>
              <small>{DOW_SHORT[weekday(d)]}</small>
              <b>{d.getDate()}</b>
            </span>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
