import { Download, FileSpreadsheet, Pencil, Plus, Scale, SlidersHorizontal, Trash2, BellRing, CalendarPlus } from "lucide-react";
import { useApp } from "../lib/store";
import { useUI } from "../lib/uictx";
import { PageTitle, useBookActions } from "../components/Shell";
import { Empty, JobBadge, Seg } from "../components/ui";
import { OVERTIME_PRESETS } from "../lib/calc";
import { CURRENCIES, currencyLabel, money } from "../lib/format";
import { plural } from "../lib/dates";
import type { Job, Settings } from "../lib/types";
import { Briefcase } from "lucide-react";

const PERIOD_LABEL: Record<Job["period"], string> = { biweekly: "Раз в 2 недели", weekly: "Раз в неделю", semimonthly: "Дважды в месяц", monthly: "Раз в месяц" };
const WEEK_FULL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

const overtimeLabel = (j: Job) => {
  if (j.overtime === "none") return "Без сверхурочных";
  if (j.overtime === "custom") return [j.dailyAfter != null ? `×${j.dailyMult} после ${j.dailyAfter} ч/день` : "", j.weeklyAfter != null ? `×${j.weeklyMult} после ${j.weeklyAfter} ч/нед.` : ""].filter(Boolean).join(", ") || "Своё правило";
  return OVERTIME_PRESETS.find((p) => p.id === j.overtime)?.title ?? "—";
};

export default function Work() {
  const { jobs, book, settings, setSettings, deleteSchedule, notify } = useApp();
  const { openSheet, askConfirm } = useUI();
  const { importCsv, exportAll } = useBookActions();

  const requestPerm = async (on: boolean) => {
    if (on && "Notification" in window && Notification.permission === "default") {
      const r = await Notification.requestPermission();
      if (r !== "granted") notify("Разрешите уведомления в браузере, чтобы получать напоминания");
    }
  };
  const setRemind = (p: Partial<Settings>, on: boolean) => {
    setSettings(p);
    void requestPerm(on);
  };

  return (
    <>
      <PageTitle title="Работа и правила" />
      <div className="work-head">
        <h4 className="eyebrow">Ваши места работы</h4>
        <div className="work-actions">
          <button className="btn chip-btn" onClick={() => (jobs.length ? openSheet({ type: "schedule" }) : notify("Сначала добавьте место работы"))}>
            <CalendarPlus size={15} className="accent" /> ДОБАВИТЬ ГРАФИК
          </button>
          <button className="btn primary sm" onClick={() => openSheet({ type: "job" })}>
            <Plus size={15} /> ДОБАВИТЬ РАБОТУ
          </button>
        </div>
      </div>

      {jobs.length === 0 && (
        <section className="card">
          <Empty icon={Briefcase} title="Мест работы пока нет" text="Добавьте работу со ставкой и правилами — и трекер начнёт считать выплаты." />
        </section>
      )}

      <div className="jobs-grid">
        {jobs.map((j) => {
          const schedules = book.schedules.filter((s) => s.jobId === j.id && !s.deletedAt);
          return (
            <section key={j.id} className="card job-card">
              <div className="job-card-head">
                <JobBadge job={j} size={44} />
                <div className="grow left">
                  <h3>{j.name}</h3>
                  <small className="muted">{j.employer || "—"}</small>
                </div>
                <button className="icon-btn ghost" onClick={() => openSheet({ type: "job", job: j })} aria-label="Изменить работу">
                  <Pencil size={17} />
                </button>
              </div>
              <dl className="kv">
                <div><dt>Ставка</dt><dd>{money(j.rate, settings)}/ч</dd></div>
                <div><dt>Сверхурочные</dt><dd>{overtimeLabel(j)}</dd></div>
                <div><dt>Рабочая неделя с</dt><dd>{WEEK_FULL[j.weekStart]}</dd></div>
                <div><dt>Выплата</dt><dd>{PERIOD_LABEL[j.period]} · через {j.payDay} {plural(j.payDay, ["день", "дня", "дней"])}</dd></div>
                <div><dt>Перерывы</dt><dd>короче {j.breakPaidUnder} мин оплачиваются</dd></div>
                <div><dt>Часовой пояс</dt><dd>{j.timezone}</dd></div>
                {j.premiums.length > 0 && <div><dt>Надбавки</dt><dd>{j.premiums.map((p) => `${p.kind === "night" ? "ночь" : p.kind === "weekend" ? "выходные" : p.kind === "holiday" ? "праздник" : "другое"} +${p.percent}%`).join(", ")}</dd></div>}
              </dl>
              <div className="sched">
                <span className="eyebrow">
                  <CalendarPlus size={13} /> ГРАФИКИ
                </span>
                {schedules.length === 0 ? (
                  <p className="muted small">Графика нет — прогноз строится по внесённым сменам.</p>
                ) : (
                  schedules.map((s) => (
                    <div key={s.id} className="sched-row">
                      <div className="grow left">
                        <b>{s.name}</b>
                        <small className="muted">
                          цикл {s.cycle.length} дн. · {s.types.map((t) => `${t.start}–${t.end}`).join(", ")}
                        </small>
                      </div>
                      <button className="icon-btn ghost sm" aria-label="Удалить график" onClick={() => askConfirm(`Удалить график «${s.name}»? Его можно вернуть из корзины.`, () => { deleteSchedule(s.id); notify("График перенесён в корзину"); })}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
                <button className="link" onClick={() => openSheet({ type: "schedule", jobId: j.id })}>
                  + ДОБАВИТЬ ГРАФИК
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="card settings">
        <div className="card-head">
          <span className="tile violet"><SlidersHorizontal size={19} /></span>
          <div>
            <h3>Настройки</h3>
            <p>Как показывать итоги и часы во всём трекере.</p>
          </div>
        </div>
        <div className="sub-card">
          <span className="eyebrow">ОСНОВНАЯ ВАЛЮТА</span>
          <select value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })} className="big-select" aria-label="Основная валюта">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{currencyLabel[c] ?? c}</option>
            ))}
          </select>
        </div>
        <div className="sub-card">
          <span className="eyebrow">КАК ПИСАТЬ ЧАСЫ</span>
          <Seg value={settings.hoursFormat} onChange={(v) => setSettings({ hoursFormat: v })} options={[{ value: "decimal", label: "7,5 ч" }, { value: "hm", label: "7:30" }]} />
        </div>
        <h4 className="eyebrow group"><BellRing size={14} className="accent" /> Напоминания</h4>
        <p className="muted small">Уведомления о сменах — по вашему времени. Работают, пока приложение открыто в браузере.</p>
        <div className="sub-card">
          <span className="eyebrow">НАПОМНИТЬ ПЕРЕД СМЕНОЙ</span>
          <Seg size="sm" value={settings.remindBefore} onChange={(v) => setRemind({ remindBefore: v }, v > 0)} options={[{ value: 0, label: "Выкл." }, { value: 30, label: "30 мин" }, { value: 60, label: "1 ч" }, { value: 120, label: "2 ч" }, { value: 720, label: "12 ч" }]} />
        </div>
        <div className="sub-card">
          <span className="eyebrow">НАКАНУНЕ ЗАРПЛАТЫ</span>
          <Seg size="sm" value={settings.remindPayday ? 1 : 0} onChange={(v) => setRemind({ remindPayday: v === 1 }, v === 1)} options={[{ value: 0, label: "Выкл." }, { value: 1, label: "Вкл." }]} />
        </div>
        <div className="sub-card">
          <span className="eyebrow">ПРЕДУПРЕЖДАТЬ О СВЕРХУРОЧНЫХ</span>
          <Seg size="sm" value={settings.remindOvertime ? 1 : 0} onChange={(v) => setRemind({ remindOvertime: v === 1 }, v === 1)} options={[{ value: 0, label: "Выкл." }, { value: 1, label: "Вкл." }]} />
          <small className="muted">Вечером накануне смены, с которой неделя выходит за порог сверхурочных.</small>
        </div>
      </section>

      <button className="card action-card" onClick={importCsv}>
        <span className="tile teal"><FileSpreadsheet size={19} /></span>
        <div className="left">
          <h3>Импорт смен из CSV</h3>
          <p>Учёт смен из Excel или Google Таблиц — столбцы сопоставятся сами.</p>
        </div>
      </button>
      <button className="card action-card" onClick={exportAll}>
        <span className="tile violet"><Download size={19} /></span>
        <div className="left">
          <h3>Выгрузить всё</h3>
          <p>Места работы со всеми правилами, каждая смена с часами и оплатой, графики и расчётки.</p>
        </div>
      </button>

      <section className="card note-card">
        <span className="tile amber"><Scale size={19} /></span>
        <div>
          <h3>Как считается оплата</h3>
          <p>Каждая смена считается по правилам своей работы: оплачиваемые часы за вычетом перерывов, надбавки с точностью до минуты, сверхурочные за рабочую неделю (или за день, или за 14 дней) по средней ставке — оплата по ставке и надбавки, делённые на все часы, как требует закон США.</p>
          <p className="warn">Это оценка по заданным вами правилам, а не расчёт зарплаты и не юридическая консультация. Работодатель может иначе считать рабочий день, неделю или ставки — решают расчётный листок и ваш договор.</p>
        </div>
      </section>
    </>
  );
}
