import { useState } from "react";
import { CalendarDays, Clock3, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import { Field, JobBadge, Seg, Sheet } from "./ui";
import type { BreakMode, Shift } from "../lib/types";
import { previewShift, uid } from "../lib/calc";
import { hoursFmt, money } from "../lib/format";
import { nowTime, toISO } from "../lib/dates";

const numStr = (v: string) => v.replace(",", ".");

export function ShiftSheet({ initial, fromTimer, onClose }: { initial?: Partial<Shift> & { virtual?: boolean }; fromTimer?: boolean; onClose: () => void }) {
  const { jobs, settings, saveShift, deleteShifts, patchBook, notify } = useApp();
  const editing = !!initial?.id && !initial.virtual;
  const firstJob = jobs.find((j) => j.id === initial?.jobId) ?? jobs[0];

  const [jobId, setJobId] = useState(firstJob?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? toISO(new Date()));
  const [start, setStart] = useState(initial?.start ?? "09:00");
  const [end, setEnd] = useState(initial?.end ?? (fromTimer ? nowTime() : "17:00"));
  const [breakMin, setBreakMin] = useState(String(initial?.breakMin ?? 0));
  const [breakMode, setBreakMode] = useState<BreakMode>(initial?.breakMode ?? "auto");
  const [rate, setRate] = useState<string>(initial?.rate ? String(initial.rate) : "");
  const [tips, setTips] = useState(initial?.tips ? String(initial.tips) : "");
  const [note, setNote] = useState(initial?.note ?? "");

  const job = jobs.find((j) => j.id === jobId);
  const draft: Shift = {
    id: initial?.id ?? "draft",
    jobId,
    date,
    start,
    end,
    breakMin: Math.max(0, parseInt(breakMin) || 0),
    breakMode,
    rate: parseFloat(numStr(rate)) || job?.rate || 0,
    tips: parseFloat(numStr(tips)) || 0,
    note,
  };
  const prev = previewShift(draft, job);
  const valid = !!job && !!date && !!start && !!end && start !== end;

  const save = () => {
    if (!valid) return;
    saveShift({ ...draft, id: editing ? draft.id : uid() });
    if (fromTimer) patchBook((b) => ({ ...b, timer: null }));
    notify(editing ? "Смена сохранена" : "Смена добавлена");
    onClose();
  };

  return (
    <Sheet
      title={editing ? "Изменить смену" : "Новая смена"}
      onClose={onClose}
      footer={
        <div className="foot-row">
          {editing && (
            <button
              className="icon-btn outline"
              aria-label="Удалить смену"
              onClick={() => {
                deleteShifts([draft.id]);
                notify("Смена перенесена в корзину");
                onClose();
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn primary block" disabled={!valid} onClick={save}>
            {editing ? "Сохранить" : "Добавить смену"}
          </button>
        </div>
      }
    >
      {fromTimer && <div className="banner green">Заполнено по таймеру — проверьте время и сохраните. Пока не сохраните, ничего не записано; если закрыть окно, таймер продолжит идти.</div>}
      {jobs.length === 0 ? (
        <p className="muted">Сначала добавьте место работы на вкладке «Работа».</p>
      ) : (
        <>
          <Field label="Работа">
            <div className="chips">
              {jobs.map((j) => (
                <button key={j.id} type="button" className={`chip job ${j.id === jobId ? "on" : ""}`} onClick={() => setJobId(j.id)}>
                  <JobBadge job={j} size={22} />
                  {j.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Дата начала смены">
            <span className="input-ico">
              <CalendarDays size={17} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </span>
          </Field>
          <div className="two">
            <Field label="Начало">
              <span className="input-ico right">
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                <Clock3 size={15} />
              </span>
            </Field>
            <Field label="Конец">
              <span className="input-ico right">
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                <Clock3 size={15} />
              </span>
            </Field>
          </div>
          {start === end && <p className="err">Начало и конец совпадают — укажите время окончания.</p>}
          <Field label="Перерыв" hint={`Авто: перерыв короче ${job?.breakPaidUnder ?? 20} мин оплачивается, длиннее — нет`}>
            <span className="inline">
              <input className="narrow" inputMode="numeric" value={breakMin} onChange={(e) => setBreakMin(e.target.value.replace(/\D/g, ""))} />
              <span className="muted">мин</span>
            </span>
          </Field>
          <Seg
            value={breakMode}
            onChange={setBreakMode}
            options={[
              { value: "auto", label: "Авто (оплач.)" },
              { value: "paid", label: "Оплач." },
              { value: "unpaid", label: "Без оплаты" },
            ]}
          />
          <div className="two">
            <Field label={`Ставка (${settings.currency}/ч)`} hint="Оставьте пустым — возьмём ставку места работы">
              <input inputMode="decimal" placeholder={String(job?.rate ?? 0)} value={rate} onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label={`Чаевые (${settings.currency})`} hint="Чаевые считаются отдельно и не входят в начисление">
              <input inputMode="decimal" placeholder="0" value={tips} onChange={(e) => setTips(e.target.value)} />
            </Field>
          </div>
          <Field label="Заметка">
            <input placeholder="Задержалась, подменяла…" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="preview">
            <span className="eyebrow accent">ЗА ЭТУ СМЕНУ</span>
            <strong>{money(prev.total, settings)}</strong>
            <small>{hoursFmt(prev.hours, settings)}</small>
          </div>
        </>
      )}
    </Sheet>
  );
}
