import { useState } from "react";
import { Lightbulb, RotateCcw, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import { Sheet } from "./ui";
import { INFO } from "../lib/info";
import { fmtDM } from "../lib/dates";
import { sumPay, inRange, upcomingPayPeriod } from "../lib/calc";
import { hoursFmt, money } from "../lib/format";

const DAY = 86400000;

export function TrashSheet({ onClose }: { onClose: () => void }) {
  const { book, restore, purge, now } = useApp();
  const items = [
    ...book.jobs.filter((x) => x.deletedAt).map((x) => ({ kind: "job" as const, id: x.id, label: "РАБОТА", title: x.name, at: x.deletedAt! })),
    ...book.shifts.filter((x) => x.deletedAt).map((x) => ({ kind: "shift" as const, id: x.id, label: "СМЕНА", title: `${x.date} · ${x.start}–${x.end}`, at: x.deletedAt! })),
    ...book.schedules.filter((x) => x.deletedAt).map((x) => ({ kind: "schedule" as const, id: x.id, label: "ГРАФИК", title: x.name, at: x.deletedAt! })),
  ].sort((a, b) => b.at - a.at);
  const [sel, setSel] = useState<string[]>([]);
  const all = items.length > 0 && sel.length === items.length;

  return (
    <Sheet title="Корзина" onClose={onClose}>
      <p className="muted">Удалённое хранится здесь 30 дней, потом стирается навсегда.</p>
      {items.length === 0 ? (
        <p className="muted pad">Корзина пуста.</p>
      ) : (
        <>
          <div className="trash-all">
            <label className="check-line">
              <input type="checkbox" className="check round" checked={all} onChange={() => setSel(all ? [] : items.map((i) => i.id))} />
              <b>Выбрать все</b>
            </label>
            {sel.length > 0 && (
              <span className="trash-bulk">
                <button className="btn chip-btn" onClick={() => { items.filter((i) => sel.includes(i.id)).forEach((i) => restore(i.kind, i.id)); setSel([]); }}>
                  <RotateCcw size={14} /> Вернуть
                </button>
                <button className="btn danger-outline sm" onClick={() => { items.filter((i) => sel.includes(i.id)).forEach((i) => purge(i.kind, i.id)); setSel([]); }}>
                  <Trash2 size={14} />
                </button>
              </span>
            )}
          </div>
          {items.map((i) => {
            const left = Math.max(0, 30 - Math.floor((now.getTime() - i.at) / DAY));
            return (
              <div key={i.id} className="trash-row">
                <input type="checkbox" className="check round" checked={sel.includes(i.id)} onChange={() => setSel(sel.includes(i.id) ? sel.filter((x) => x !== i.id) : [...sel, i.id])} aria-label="Выбрать" />
                <div className="left grow">
                  <div>
                    <span className="kind-tag">{i.label}</span> <b>{i.title || "—"}</b>
                  </div>
                  <small className="muted">
                    {fmtDM(new Date(i.at))} {new Date(i.at).getFullYear()} г. · ещё {left} дн.
                  </small>
                </div>
                <button className="btn soft-btn" onClick={() => restore(i.kind, i.id)}>
                  <RotateCcw size={14} /> Вернуть
                </button>
                <button className="icon-btn ghost sm" onClick={() => purge(i.kind, i.id)} aria-label="Удалить навсегда">
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </>
      )}
    </Sheet>
  );
}

export function HowtoSheet({ onClose }: { onClose: () => void }) {
  const steps = [
    ["Добавьте работу", "Ставка, правила сверхурочных, расчётный период и день выплаты — на вкладке «Работа»."],
    ["Записывайте смены", "Запустите таймер в начале смены или добавьте её вручную. Перерывы и чаевые учитываются."],
    ["Следите за выплатой", "«Обзор» показывает, сколько уже заработано и сколько ожидается к ближайшей выплате, с разбивкой как в расчётном листке."],
    ["Сверяйте расчётку", "Введите начисленную сумму на вкладке «Расчётка» — трекер покажет разницу с расчётом."],
  ];
  return (
    <Sheet title="Как это работает" onClose={onClose}>
      <ol className="steps">
        {steps.map(([t, d], i) => (
          <li key={t}>
            <span>{i + 1}</span>
            <div>
              <b>{t}</b>
              <p>{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

export function TipsSheet({ onClose }: { onClose: () => void }) {
  const { jobs, pays, settings, now } = useApp();
  const tips: string[] = [];
  for (const j of jobs) {
    const p = upcomingPayPeriod(j, now);
    const t = sumPay(pays.filter((x) => x.job.id === j.id && inRange(x, p.start, p.end)));
    const done = sumPay(pays.filter((x) => x.job.id === j.id && !x.planned && inRange(x, p.start, p.end)));
    tips.push(`${j.name}: к выплате ${fmtDM(p.pay)} ожидается ${money(t.total, settings)}, уже заработано ${money(done.total, settings)}.`);
    if (t.overtimeHours > 0) tips.push(`${j.name}: в периоде ${hoursFmt(t.overtimeHours, settings)} сверхурочных — доплата ${money(t.overtime, settings)}.`);
    if (j.weeklyAfter && j.overtime !== "none") {
      const weekHours = sumPay(pays.filter((x) => x.job.id === j.id && inRange(x, new Date(now.getTime() - 6 * DAY), now))).hours;
      if (weekHours > 0) tips.push(`${j.name}: за последние 7 дней отработано ${hoursFmt(weekHours, settings)}; порог недели — ${j.weeklyAfter} ч.`);
    }
  }
  if (!tips.length) tips.push("Добавьте место работы и первые смены — здесь появятся подсказки по выплатам и сверхурочным.");
  return (
    <Sheet title="Подсказки" onClose={onClose}>
      <div className="tips">
        {tips.map((t, i) => (
          <div key={i} className="tip">
            <Lightbulb size={16} />
            <p>{t}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function InfoSheet({ k, onClose }: { k: string; onClose: () => void }) {
  const { notify } = useApp();
  const [text, setText] = useState("");
  if (k === "idea") {
    return (
      <Sheet
        title="Предложить идею"
        onClose={onClose}
        footer={
          <button
            className="btn primary block"
            disabled={!text.trim()}
            onClick={() => {
              const key = "shift-tracker:ideas";
              const prev = JSON.parse(localStorage.getItem(key) || "[]") as string[];
              localStorage.setItem(key, JSON.stringify([...prev, text.trim()]));
              notify("Спасибо! Идея сохранена");
              onClose();
            }}
          >
            Отправить
          </button>
        }
      >
        <p className="muted">Чего не хватает в трекере? Опишите, что хотелось бы видеть.</p>
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Например: учёт нескольких ставок в одной смене" />
      </Sheet>
    );
  }
  const info = INFO[k] ?? { title: "Раздел", body: [] };
  return (
    <Sheet title={info.title} onClose={onClose}>
      <div className="prose-plain">
        {info.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </Sheet>
  );
}
