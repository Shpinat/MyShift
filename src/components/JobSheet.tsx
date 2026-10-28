import { useState } from "react";
import { Scale, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { useApp, defaultJob } from "../lib/store";
import { useUI } from "../lib/uictx";
import { Field, JOB_COLORS, JOB_ICONS, JobBadge, Seg, Sheet } from "./ui";
import { OVERTIME_PRESETS, PREMIUM_LABEL, periodFor, uid } from "../lib/calc";
import type { Job, OvertimeKind, PeriodKind, PremiumKind } from "../lib/types";
import { CURRENCIES } from "../lib/format";
import { DOW_SHORT, fmtDM, toISO } from "../lib/dates";

const PERIODS: { value: PeriodKind; label: string }[] = [
  { value: "biweekly", label: "Раз в 2 недели" },
  { value: "weekly", label: "Раз в неделю" },
  { value: "semimonthly", label: "Дважды в месяц" },
  { value: "monthly", label: "Раз в месяц" },
];

export function JobSheet({ job: initial, onClose }: { job?: Job; onClose: () => void }) {
  const { saveJob, deleteJob, settings, setSettings, notify, now } = useApp();
  const { askConfirm } = useUI();
  const editing = !!initial;
  const [j, setJ] = useState<Job>(initial ?? defaultJob());
  const [rate, setRate] = useState(initial ? String(initial.rate) : "");
  const [look, setLook] = useState(false);
  const [more, setMore] = useState(false);
  const set = (p: Partial<Job>) => setJ((x) => ({ ...x, ...p }));

  const pickPreset = (id: OvertimeKind) => {
    const p = OVERTIME_PRESETS.find((x) => x.id === id)!;
    set({ overtime: id, dailyAfter: p.dailyAfter, dailyMult: p.dailyMult, weeklyAfter: p.weeklyAfter, weeklyMult: p.weeklyMult, windowDays: p.windowDays });
  };

  const period = periodFor({ ...j, rate: 0 }, now);
  const valid = j.name.trim().length > 0 && parseFloat(rate.replace(",", ".")) >= 0 && rate !== "";
  const num = (v: string) => (v.trim() === "" ? null : parseFloat(v.replace(",", ".")));
  const addPremium = (kind: PremiumKind) => set({ premiums: [...j.premiums, { id: uid(), kind, percent: kind === "night" ? 20 : kind === "other" ? 10 : 50 }] });

  const save = () => {
    if (!valid) return;
    saveJob({ ...j, name: j.name.trim(), rate: parseFloat(rate.replace(",", ".")) || 0 });
    notify(editing ? "Работа сохранена" : "Работа добавлена");
    onClose();
  };

  return (
    <Sheet
      title={editing ? "Изменить работу" : "Новое место работы"}
      onClose={onClose}
      footer={
        <div className="foot-row">
          {editing && (
            <button
              className="icon-btn outline"
              aria-label="Удалить работу"
              onClick={() =>
                askConfirm(`Удалить «${j.name}»? Её смены тоже скроются. Из корзины можно вернуть в течение 30 дней.`, () => {
                  deleteJob(j.id);
                  notify("Работа перенесена в корзину");
                  onClose();
                })
              }
            >
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn primary block" disabled={!valid} onClick={save}>
            {editing ? "Сохранить" : "Добавить работу"}
          </button>
        </div>
      }
    >
      <Field label="Работа">
        <input placeholder="Медсестра — ночные, бариста…" value={j.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!editing} />
      </Field>
      <Field label="Работодатель">
        <input placeholder="Работодатель (необязательно)" value={j.employer} onChange={(e) => set({ employer: e.target.value })} />
      </Field>
      <Field label="Внешний вид">
        <button type="button" className="look-btn" onClick={() => setLook(!look)} aria-expanded={look}>
          <JobBadge job={j} size={38} />
          <span className="left grow">
            <b>{j.name || "Название работы"}</b>
            <small>Значок и цвет</small>
          </span>
          {look ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </Field>
      {look && (
        <div className="look-panel">
          <div className="icons">
            {Object.entries(JOB_ICONS).map(([k, I]) => (
              <button key={k} type="button" className={j.icon === k ? "on" : ""} onClick={() => set({ icon: k })} aria-label={k}>
                <I size={18} />
              </button>
            ))}
          </div>
          <div className="colors">
            {JOB_COLORS.map((c) => (
              <button key={c} type="button" className={j.color === c ? "on" : ""} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />
            ))}
          </div>
        </div>
      )}
      <Field label="Ставка в час" hint="Базовая ставка за один оплачиваемый час">
        <div className="rate-row">
          <input inputMode="decimal" placeholder="0.00" value={rate} onChange={(e) => setRate(e.target.value)} />
          <select value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })} aria-label="Валюта">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </Field>

      <fieldset className="group-box">
        <legend className="eyebrow">
          <Scale size={13} /> ПРАВИЛА СВЕРХУРОЧНЫХ
        </legend>
        {OVERTIME_PRESETS.map((p) => (
          <button key={p.id} type="button" className={`preset ${j.overtime === p.id ? "on" : ""}`} onClick={() => pickPreset(p.id)}>
            <b>{p.title}</b>
            <small>{p.text}</small>
          </button>
        ))}
        {j.overtime === "custom" && (
          <div className="custom-ot">
            <div className="two">
              <Field label="Сверхурочные в день после (ч)">
                <input inputMode="decimal" placeholder="нет" value={j.dailyAfter ?? ""} onChange={(e) => set({ dailyAfter: num(e.target.value) })} />
              </Field>
              <Field label="Оплата ×">
                <input inputMode="decimal" value={j.dailyMult} onChange={(e) => set({ dailyMult: num(e.target.value) ?? 1 })} />
              </Field>
              <Field label="Сверхурочные в неделю после (ч)">
                <input inputMode="decimal" placeholder="нет" value={j.weeklyAfter ?? ""} onChange={(e) => set({ weeklyAfter: num(e.target.value) })} />
              </Field>
              <Field label="Оплата ×">
                <input inputMode="decimal" value={j.weeklyMult} onChange={(e) => set({ weeklyMult: num(e.target.value) ?? 1 })} />
              </Field>
            </div>
          </div>
        )}
        {j.overtime === "none" && (
          <div className="banner blue">
            Правила сверхурочных выше — это законы США. Если по договору или по закону вашей страны сверхурочные оплачиваются иначе, задайте пороги и множители сами: <button type="button" className="link" onClick={() => pickPreset("custom")}>Своё правило →</button>
          </div>
        )}
        <Field label="Рабочая неделя начинается в" hint="С этого дня считаются недельные сверхурочные">
          <select value={j.weekStart} onChange={(e) => set({ weekStart: +e.target.value })}>
            {DOW_SHORT.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <div className="banner amber">Это оценка по заданным вами правилам, а не расчёт зарплаты и не юридическая консультация. Работодатель может иначе считать рабочий день, неделю или ставки — решают расчётный листок и ваш договор.</div>
      </fieldset>

      <fieldset className="group-box">
        <legend className="eyebrow">РАСЧЁТНЫЙ ПЕРИОД И ВЫПЛАТА</legend>
        <div className="seg grid2">
          {PERIODS.map((p) => (
            <button key={p.value} type="button" className={j.period === p.value ? "on" : ""} onClick={() => set({ period: p.value })}>
              {p.label}
            </button>
          ))}
        </div>
        {j.period === "biweekly" && (
          <Field label="День начала любого периода" hint="Выберите дату, с которой начинался любой из ваших двухнедельных периодов">
            <input type="date" value={j.periodAnchor} onChange={(e) => set({ periodAnchor: e.target.value || toISO(new Date()) })} />
          </Field>
        )}
        <Field label="День выплаты" hint="Сколько дней после конца периода приходит выплата">
          <span className="inline">
            <input className="narrow" inputMode="numeric" value={j.payDay} onChange={(e) => set({ payDay: Math.min(60, parseInt(e.target.value.replace(/\D/g, "")) || 0) })} />
            <span className="muted">дн. после конца периода</span>
          </span>
        </Field>
        <p className="fine">
          Текущий период: {fmtDM(period.start)} – {fmtDM(period.end)}, выплата {fmtDM(period.pay)}.
        </p>
      </fieldset>

      <fieldset className="group-box">
        <legend className="eyebrow">НАДБАВКИ</legend>
        {j.premiums.length === 0 && <p className="muted small">Надбавок нет. Добавьте, если ночь, выходные или праздники оплачиваются выше.</p>}
        {j.premiums.map((p) => (
          <div key={p.id} className="premium-row">
            <b>{PREMIUM_LABEL[p.kind]}</b>
            <span className="inline">
              <span className="muted">+</span>
              <input className="narrow" inputMode="decimal" value={p.percent} onChange={(e) => set({ premiums: j.premiums.map((x) => (x.id === p.id ? { ...x, percent: parseFloat(e.target.value.replace(",", ".")) || 0 } : x)) })} />
              <span className="muted">% к ставке</span>
            </span>
            <button type="button" className="icon-btn ghost sm" onClick={() => set({ premiums: j.premiums.filter((x) => x.id !== p.id) })} aria-label="Убрать надбавку">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <div className="chips">
          {(["night", "weekend", "holiday", "other"] as PremiumKind[]).map((k) => (
            <button key={k} type="button" className="chip dashed" onClick={() => addPremium(k)}>
              + {PREMIUM_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Перерывы" hint="Короткие перерывы оплачиваются, более длинные вычитаются из часов (режим «Авто»)">
        <span className="inline">
          <span className="muted">Перерывы короче</span>
          <input className="narrow" inputMode="numeric" value={j.breakPaidUnder} onChange={(e) => set({ breakPaidUnder: parseInt(e.target.value.replace(/\D/g, "")) || 0 })} />
          <span className="muted">мин оплачиваются</span>
        </span>
      </Field>
      <Field label="Часовой пояс" hint="Нужен для напоминаний">
        <input value={j.timezone} onChange={(e) => set({ timezone: e.target.value })} />
      </Field>
      <button type="button" className="more-link" onClick={() => setMore(!more)}>
        {more ? "▾" : "▸"} ЕЩЁ
      </button>
      {more && (
        <Field label="Заметки">
          <textarea rows={3} value={j.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      )}
    </Sheet>
  );
}
