import { useMemo, useState } from "react";
import { FileCheck2, Trash2 } from "lucide-react";
import { useApp } from "../lib/store";
import { PageTitle } from "../components/Shell";
import { Field } from "../components/ui";
import { inRange, periodFor, prevPeriod, sumPay, uid, type Period } from "../lib/calc";
import { fmtDM, toISO } from "../lib/dates";
import { hoursFmt, money } from "../lib/format";

export default function Payslip() {
  const { jobs, pays, book, settings, savePayslip, patchBook, now, notify } = useApp();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const periods = useMemo(() => {
    if (!job) return [] as Period[];
    const list: Period[] = [];
    let p = periodFor(job, now);
    for (let i = 0; i < 8; i++) {
      list.push(p);
      p = prevPeriod(job, p);
    }
    return list;
  }, [job, now]);
  const [pIdx, setPIdx] = useState(1);
  const period = periods[Math.min(pIdx, periods.length - 1)];
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");

  const t = useMemo(() => (job && period ? sumPay(pays.filter((p) => p.job.id === job.id && !p.planned && inRange(p, period.start, period.end))) : null), [pays, job, period]);
  const amountN = parseFloat(amount.replace(",", "."));
  const saved = book.payslips.filter((p) => p.jobId === job?.id).sort((a, b) => b.createdAt - a.createdAt);
  const diffOf = (amt: number) => (t ? amt - t.total : 0);

  const row = (label: string, value: string, strong = false) => (
    <div className={`kv-row ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );

  return (
    <>
      <PageTitle title="Проверка расчётки" />
      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <span className="tile violet"><FileCheck2 size={19} /></span>
            <div>
              <h3>Проверить расчётку</h3>
              <p>Выберите расчётный период и введите начисленную сумму из расчётного листка.</p>
            </div>
          </div>
          {!job ? (
            <p className="muted">Сначала добавьте место работы на вкладке «Работа».</p>
          ) : (
            <>
              <Field label="Работа">
                <select value={job.id} onChange={(e) => setJobId(e.target.value)}>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Расчётный период">
                <select value={pIdx} onChange={(e) => setPIdx(+e.target.value)}>
                  {periods.map((p, i) => (
                    <option key={i} value={i}>
                      {fmtDM(p.start)} – {fmtDM(p.end)} · выплата {fmtDM(p.pay)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="two">
                <Field label={`Начислено по расчётке (${settings.currency})`} hint="Сумма «начислено» до налогов и удержаний">
                  <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Часы по расчётке">
                  <input inputMode="decimal" placeholder="Необязательно" value={hours} onChange={(e) => setHours(e.target.value)} />
                </Field>
              </div>
              <button
                className="btn primary block"
                disabled={!(amountN >= 0)}
                onClick={() => {
                  savePayslip({ id: uid(), jobId: job.id, periodStart: toISO(period.start), periodEnd: toISO(period.end), amount: amountN, hours: parseFloat(hours.replace(",", ".")) || null, createdAt: Date.now() });
                  setAmount("");
                  setHours("");
                  notify("Расчётка сохранена");
                }}
              >
                Сохранить расчётку
              </button>
              {Number.isFinite(amountN) && amount !== "" && t && (
                <div className={`diff ${Math.abs(diffOf(amountN)) < 0.5 ? "ok" : diffOf(amountN) < 0 ? "bad" : "good"}`}>
                  {Math.abs(diffOf(amountN)) < 0.5 ? "Совпадает с расчётом трекера" : diffOf(amountN) < 0 ? `Недоплата: ${money(-diffOf(amountN), settings, { force: true })} относительно расчёта` : `Переплата: ${money(diffOf(amountN), settings, { force: true })} относительно расчёта`}
                </div>
              )}
            </>
          )}
        </section>

        <div>
          {t && job && period && (
            <section className="card">
              <h3>Сколько должны заплатить за смены</h3>
              <p className="muted small">
                {job.name} · {fmtDM(period.start)} – {fmtDM(period.end)}
              </p>
              <div className="kvs">
                {row("Смены", String(t.shifts))}
                {row("Часы", hoursFmt(t.hours, settings))}
                {row("Обычные часы", hoursFmt(t.hours - t.overtimeHours, settings))}
                {row("Сверхурочные часы", hoursFmt(t.overtimeHours, settings))}
                {row("По ставке", money(t.base, settings))}
                {row("Надбавки", money(t.premium, settings))}
                {row("Доплата за сверхурочные", money(t.overtime, settings))}
                {row("Должно быть начислено", money(t.total, settings), true)}
              </div>
              <p className="fine">Это оценка по заданным вами правилам, а не расчёт зарплаты и не юридическая консультация. Работодатель может иначе считать рабочий день, неделю или ставки — решают расчётный листок и ваш договор.</p>
            </section>
          )}
          {saved.length > 0 && (
            <section className="card">
              <h3>Сохранённые расчётки</h3>
              {saved.map((p) => {
                const list = sumPay(pays.filter((x) => x.job.id === p.jobId && !x.planned && inRange(x, new Date(p.periodStart + "T00:00:00"), new Date(p.periodEnd + "T00:00:00"))));
                const d = p.amount - list.total;
                return (
                  <div key={p.id} className="saved-row">
                    <div className="left grow">
                      <b>{money(p.amount, settings)}</b>
                      <small className="muted">
                        {fmtDM(new Date(p.periodStart + "T00:00:00"))} – {fmtDM(new Date(p.periodEnd + "T00:00:00"))}
                      </small>
                    </div>
                    <span className={`tag ${Math.abs(d) < 0.5 ? "ok" : d < 0 ? "bad" : "good"}`}>{Math.abs(d) < 0.5 ? "сходится" : `${d > 0 ? "+" : "−"}${money(Math.abs(d), settings)}`}</span>
                    <button className="icon-btn ghost sm" aria-label="Удалить расчётку" onClick={() => patchBook((b) => ({ ...b, payslips: b.payslips.filter((x) => x.id !== p.id) }))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
