import type { ReactNode } from "react";
import { Gauge, HandCoins, Moon, Percent, Timer, Clock, TrendingUp } from "lucide-react";
import type { Settings } from "../lib/types";
import { emptyTotals, type Totals } from "../lib/calc";
import { hoursFmt, money } from "../lib/format";
import { plural } from "../lib/dates";

export const addTotals = (a: Totals, b: Totals): Totals => ({
  hours: a.hours + b.hours,
  shifts: a.shifts + b.shifts,
  overtimeHours: a.overtimeHours + b.overtimeHours,
  base: a.base + b.base,
  premium: a.premium + b.premium,
  overtime: a.overtime + b.overtime,
  tips: a.tips + b.tips,
  total: a.total + b.total,
});

export const mergeTotals = (list: Totals[]) => list.reduce(addTotals, emptyTotals());

export const shiftsWord = (n: number) => `${n} ${plural(n, ["смена", "смены", "смен"])}`;

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="stat">
      <span className="tile violet sm">{icon}</span>
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

export function StatGrid({ already, expected, s, monthly }: { already: Totals; expected: Totals; s: Settings; monthly?: boolean }) {
  const perHour = expected.hours > 0 ? expected.total / expected.hours : 0;
  return (
    <section className="card stat-grid">
      <Stat icon={<Clock size={17} />} label={monthly ? "Отработано часов" : "Часы"} value={hoursFmt(expected.hours, s)} sub={monthly ? `${hoursFmt(expected.hours, s)} с учётом графика` : `Уже ${hoursFmt(already.hours, s)} · ${shiftsWord(already.shifts)}`} />
      {monthly ? (
        <Stat icon={<Timer size={17} />} label="Отработано смен" value={String(expected.shifts)} sub={`${shiftsWord(expected.shifts)} с учётом графика`} />
      ) : null}
      <Stat icon={<Timer size={17} />} label="Сверхурочные" value={hoursFmt(expected.overtimeHours, s)} sub={expected.overtimeHours > 0 ? `Доплата за сверхурочные ${money(expected.overtime, s)}` : monthly ? "Доплата за сверхурочные 0,00 ₽".replace("0,00 ₽", money(0, s)) : "В этом периоде сверхурочных нет"} />
      <Stat icon={<Moon size={17} />} label="Надбавки" value={money(expected.premium, s)} sub="За ночь, выходные и праздники" />
      {!monthly && <Stat icon={<Percent size={17} />} label="По ставке" value={money(expected.base, s)} sub={hoursFmt(expected.hours, s)} />}
      <Stat icon={<HandCoins size={17} />} label="Чаевые" value={money(expected.tips, s)} sub="Учитываются отдельно, не входят в начисление" />
      <Stat icon={monthly ? <TrendingUp size={17} /> : <Gauge size={17} />} label="В час, со всем" value={`${money(perHour, s)}/ч`.replace("₽/ч", "₽/ч")} sub={monthly ? "Начисление ÷ часы за этот месяц" : "Начисление ÷ часы, со сверхурочными и надбавками"} />
    </section>
  );
}

export function Breakdown({ title, sub, already, expected, s }: { title: string; sub: string; already: Totals; expected: Totals; s: Settings }) {
  const row = (label: string, note: string, a: number, e: number, strong = false) => (
    <tr className={strong ? "total" : ""}>
      <th scope="row">
        <span>{label}</span>
        {note && <small>{note}</small>}
      </th>
      <td>{money(a, s)}</td>
      <td>{money(e, s)}</td>
    </tr>
  );
  return (
    <section className="card breakdown">
      <div className="card-head">
        <span className="tile violet">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
          </svg>
        </span>
        <div>
          <h3>{title}</h3>
          <p>{sub}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th />
            <th>Уже</th>
            <th>Ожидается</th>
          </tr>
        </thead>
        <tbody>
          {row("По ставке", `${hoursFmt(expected.hours, s)} по вашей ставке`, already.base, expected.base)}
          {row("Надбавки", "Доплата за ночь, выходные и праздники", already.premium, expected.premium)}
          {row("Доплата за сверхурочные", `${hoursFmt(expected.overtimeHours, s)} сверхурочных по средней (смешанной) ставке`, already.overtime, expected.overtime)}
          {row("Начислено", "", already.total, expected.total, true)}
        </tbody>
      </table>
      <p className="fine">Начислено — до налогов и удержаний.</p>
      <p className="fine">
        Это оценка по заданным вами правилам, а не расчёт зарплаты и не юридическая консультация. Работодатель может иначе считать рабочий день, неделю или ставки — <u>решают расчётный листок и ваш договор</u>.
      </p>
    </section>
  );
}
