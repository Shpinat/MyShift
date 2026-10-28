import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Layers, CalendarClock, Wallet, BarChart3, Briefcase } from "lucide-react";
import { useApp } from "../lib/store";
import { useUI } from "../lib/uictx";
import { PageTitle } from "../components/Shell";
import { TimerCard } from "../components/Timer";
import { Breakdown, StatGrid, mergeTotals, shiftsWord } from "../components/Stats";
import { JobBadge, Seg } from "../components/ui";
import { inRange, sumPay, upcomingPayPeriod, type ShiftPay } from "../lib/calc";
import { addDays, diffDays, fmtDM, fmtDayShort, MONTHS, MONTHS_IN, startOfDay, weekday } from "../lib/dates";
import { hoursFmt, money, moneyCompact } from "../lib/format";

type Mode = "pay" | "month";

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

function WeeksChart({ pays, now, hide }: { pays: ShiftPay[]; now: Date; hide: boolean }) {
  const weeks = useMemo(() => {
    const mon = addDays(startOfDay(now), -weekday(now));
    return Array.from({ length: 12 }, (_, i) => {
      const start = addDays(mon, (i - 11) * 7);
      const t = sumPay(pays.filter((p) => !p.planned && inRange(p, start, addDays(start, 6))));
      return { start, base: t.base, premium: t.premium, overtime: t.overtime, total: t.total };
    });
  }, [pays, now]);
  const max = Math.max(...weeks.map((w) => w.total), 1);
  const step = (() => {
    const raw = max / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  })();
  const top = step * 4;
  const W = 320;
  const H = 170;
  const L = 30;
  const B = 18;
  const bw = (W - L) / 12;
  const y = (v: number) => H - B - (v / top) * (H - B - 8);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Заработок по неделям за последние двенадцать недель">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={L} x2={W} y1={y(step * i)} y2={y(step * i)} className="grid" />
          {i > 0 && (
            <text x={0} y={y(step * i) + 3} className="tick">
              {hide ? "•" : moneyCompact(step * i)}
            </text>
          )}
        </g>
      ))}
      {weeks.map((w, i) => {
        const x = L + i * bw + bw * 0.2;
        const bwid = bw * 0.6;
        const yBase = y(w.base);
        const yPrem = y(w.base + w.premium);
        const yOt = y(w.total);
        return (
          <g key={i}>
            <title>{`${fmtDM(w.start)}: ${hide ? "•••" : Math.round(w.total)}`}</title>
            {w.base > 0 && <rect x={x} y={yBase} width={bwid} height={y(0) - yBase} rx={3} className="b1" />}
            {w.premium > 0 && <rect x={x} y={yPrem} width={bwid} height={yBase - yPrem} className="b2" />}
            {w.overtime > 0 && <rect x={x} y={yOt} width={bwid} height={yPrem - yOt} className="b3" />}
            {i % 2 === 1 && (
              <text x={x + bwid / 2} y={H - 3} textAnchor="middle" className="tick">
                {fmtDM(w.start).replace(".", "")}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function Overview() {
  const { jobs, pays, settings, now } = useApp();
  const { openSheet, go } = useUI();
  const [mode, setMode] = useState<Mode>("pay");
  const [more, setMore] = useState(false);

  const today = startOfDay(now);
  const items = useMemo(
    () =>
      jobs.map((job) => {
        const period = upcomingPayPeriod(job, now);
        const list = pays.filter((p) => p.job.id === job.id && inRange(p, period.start, period.end));
        return { job, period, already: sumPay(list.filter((p) => !p.planned)), expected: sumPay(list) };
      }),
    [jobs, pays, now],
  );

  const month = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const list = pays.filter((p) => inRange(p, start, end));
    const perJob = jobs.map((job) => ({ job, total: sumPay(list.filter((p) => p.job.id === job.id)) }));
    return { already: sumPay(list.filter((p) => !p.planned)), expected: sumPay(list), perJob };
  }, [pays, jobs, now]);

  const week = useMemo(() => pays.filter((p) => inRange(p, today, addDays(today, 6))), [pays, today]);

  const nextPay = items.length ? items.reduce((m, i) => (i.period.pay < m ? i.period.pay : m), items[0].period.pay) : null;
  const heroItems = items.filter((i) => nextPay && diffDays(i.period.pay, nextPay) === 0);
  const hero = { already: mergeTotals(heroItems.map((i) => i.already)), expected: mergeTotals(heroItems.map((i) => i.expected)) };

  return (
    <>
      <PageTitle title={mode === "pay" ? "Ближайшая зарплата" : "Этот месяц"} />
      <TimerCard />

      <div className="center-seg">
        <div className="seg pill">
          <button className={mode === "pay" ? "on dark" : ""} onClick={() => setMode("pay")}>
            <Wallet size={14} /> Ближайшая зарплата
          </button>
          <button className={mode === "month" ? "on dark" : ""} onClick={() => setMode("month")}>
            <BarChart3 size={14} /> Этот месяц
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <section className="card empty-card">
          <Briefcase size={26} />
          <h3>Добавьте первое место работы</h3>
          <p>Укажите ставку и правила — тогда появится прогноз ближайшей выплаты.</p>
          <button className="btn primary" onClick={() => openSheet({ type: "job" })}>
            Добавить работу
          </button>
        </section>
      ) : mode === "pay" && nextPay ? (
        <>
          <section className="card hero">
            <span className="eyebrow">
              ЗАРПЛАТА ЧЕРЕЗ {Math.max(0, diffDays(nextPay, today))} {(() => { const n = Math.max(0, diffDays(nextPay, today)); const a = n % 100, b = n % 10; return a > 10 && a < 20 ? "ДНЕЙ" : b === 1 ? "ДЕНЬ" : b > 1 && b < 5 ? "ДНЯ" : "ДНЕЙ"; })()} · {fmtDayShort(nextPay).split(",")[0].toUpperCase()}, {fmtDM(nextPay).toUpperCase()}
            </span>
            <div className="hero-sum">{money(hero.expected.total, settings)}</div>
            <p className="hero-sub">ожидаемая сумма до вычета налогов</p>
            <Progress value={hero.already.total} max={hero.expected.total} />
            <p className="hero-meta">
              Уже заработано {money(hero.already.total, settings)} · отработано {hoursFmt(hero.already.hours, settings)}
            </p>
            <div className="hero-period">
              {heroItems.length === 1 ? heroItems[0].job.name : `${heroItems.length} места работы`} · расчётный период {fmtDM(heroItems[0].period.start)} – {fmtDM(heroItems[0].period.end)}
            </div>
          </section>

          <StatGrid already={hero.already} expected={hero.expected} s={settings} />

          <h4 className="eyebrow group">
            <Layers size={13} /> ПО МЕСТАМ РАБОТЫ
          </h4>
          {items.map((i) => (
            <button key={i.job.id} className="card job-row" onClick={() => go("work")}>
              <div className="job-row-top">
                <JobBadge job={i.job} />
                <div className="grow left">
                  <strong>{i.job.name}</strong>
                  <small>{i.expected.overtimeHours > 0 ? `${hoursFmt(i.expected.overtimeHours, settings)} сверхурочных` : "Без сверхурочных"}</small>
                </div>
                <ChevronRight size={16} className="muted" />
              </div>
              <div className="job-row-mid">
                <div className="left">
                  <span className="eyebrow">ВЫПЛАТА {fmtDM(i.period.pay).toUpperCase()}</span>
                  <strong className="big">{money(i.expected.total, settings)}</strong>
                </div>
                <div className="right">
                  <b>{hoursFmt(i.expected.hours, settings)}</b>
                  <small>
                    {fmtDM(i.period.start)} – {fmtDM(i.period.end)}
                  </small>
                </div>
              </div>
              <Progress value={i.already.total} max={i.expected.total} />
              <small className="muted left">
                Уже {money(i.already.total, settings)} · {i.expected.total - i.already.total > 0.5 ? `по графику ещё ${money(i.expected.total - i.already.total, settings)}` : "по графику ничего"}
              </small>
            </button>
          ))}
        </>
      ) : (
        <>
          <section className="card hero">
            <span className="eyebrow">ЗАРАБОТАНО ЗА {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()} Г.</span>
            <div className="hero-sum">{money(month.already.total, settings)}</div>
            <p className="hero-sub">К концу месяца выйдет {money(month.expected.total, settings)}</p>
            <Progress value={month.already.total} max={month.expected.total} />
          </section>
          <StatGrid already={month.already} expected={month.expected} s={settings} monthly />
          <section className="card">
            <div className="card-head">
              <span className="tile violet">
                <BarChart3 size={19} />
              </span>
              <div>
                <h3>Последние двенадцать недель</h3>
                <p>Заработано по неделям: ставка, надбавки, сверхурочные</p>
              </div>
            </div>
            <WeeksChart pays={pays} now={now} hide={settings.hideAmounts} />
            <div className="legend">
              <span><i className="lg b1" />По ставке</span>
              <span><i className="lg b2" />Надбавки</span>
              <span><i className="lg b3" />Доплата за сверхурочные</span>
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <span className="tile violet">
                <Layers size={19} />
              </span>
              <div>
                <h3>По местам работы</h3>
                <p>Этот месяц вместе с графиком</p>
              </div>
            </div>
            {month.perJob.map((r, idx) => (
              <div key={r.job.id} className="share">
                <div>
                  <span className="muted">{idx + 1}</span>
                  <b>{r.job.name}</b>
                  <span className="grow" />
                  <b>{money(r.total.total, settings)}</b>
                  <span className="muted">{month.expected.total ? Math.round((r.total.total / month.expected.total) * 100) : 0}%</span>
                </div>
                <Progress value={r.total.total} max={month.expected.total} />
              </div>
            ))}
          </section>
        </>
      )}

      {mode === "pay" && jobs.length > 0 && (
        <>
          <h4 className="eyebrow group">
            <CalendarClock size={13} /> БЛИЖАЙШИЕ 7 ДНЕЙ
          </h4>
          <section className="card list-card">
            {week.length === 0 && <p className="muted pad">На ближайшую неделю смен нет. Добавьте график на вкладке «Работа».</p>}
            {week.map((p) => (
              <button key={p.shift.id} className="mini-row" onClick={() => openSheet({ type: "shift", shift: p.shift })}>
                <JobBadge job={p.job} size={34} />
                <div className="left">
                  <strong>{fmtDayShort(p.start)}</strong>
                  <small>
                    {p.job.name} · {p.shift.start.replace(/^0/, "")} — {p.shift.end.replace(/^0/, "")}
                  </small>
                </div>
              </button>
            ))}
          </section>
        </>
      )}

      {jobs.length > 0 && (
        <Breakdown
          title="Из чего складывается выплата"
          sub={mode === "pay" ? "Ближайшая зарплата — так, как её делит расчётный листок" : "Этот месяц — так, как её делит расчётный листок"}
          already={mode === "pay" ? hero.already : month.already}
          expected={mode === "pay" ? hero.expected : month.expected}
          s={settings}
        />
      )}

      <button className="more-toggle" onClick={() => setMore(!more)} aria-expanded={more}>
        <span className="eyebrow">ПОДРОБНЕЕ О ТРЕКЕРЕ СМЕН И РАБОЧИХ ЧАСОВ</span>
        <ChevronDown size={16} className={more ? "rot" : ""} />
      </button>
      {more && (
        <section className="card prose">
          <p>Трекер считает оплачиваемые часы за вычетом неоплачиваемых перерывов с точностью до минуты, затем применяет ставку, надбавки за ночь, выходные и праздники и доплату за сверхурочные по правилам вашей работы.</p>
          <p>Смены, которые ещё не начались, считаются планом — они попадают в колонку «Ожидается», но не в «Уже». Чаевые учитываются отдельно и не входят в начисление.</p>
          <p>В {MONTHS_IN[now.getMonth()]} у вас {shiftsWord(month.expected.shifts)}; итоги пересчитываются автоматически при каждом изменении.</p>
        </section>
      )}
    </>
  );
}
