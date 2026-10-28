import type { Job, Shift } from "./types";
import { uid } from "./calc";
import { pad, toISO } from "./dates";

const splitLine = (line: string, sep: string) => {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};

const parseDate = (v: string) => {
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`;
  }
  return null;
};

const parseTime = (v: string) => {
  const m = v.match(/(\d{1,2})[:.](\d{2})/);
  return m ? `${pad(+m[1])}:${m[2]}` : null;
};

const find = (head: string[], names: string[]) => head.findIndex((h) => names.some((n) => h.toLowerCase().includes(n)));

/** Columns are matched by name automatically (RU/EN). Returns shifts and number of skipped rows. */
export const parseShiftsCsv = (text: string, jobs: Job[]) => {
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { shifts: [] as Shift[], skipped: 0 };
  const sep = [";", "\t", ","].map((s) => [s, lines[0].split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const head = splitLine(lines[0], sep);
  const col = {
    date: find(head, ["дата", "date", "day"]),
    start: find(head, ["начал", "start", "from", "с "]),
    end: find(head, ["конец", "end", "to", "оконч"]),
    brk: find(head, ["перерыв", "break"]),
    rate: find(head, ["ставк", "rate"]),
    tips: find(head, ["чаев", "tip"]),
    note: find(head, ["замет", "note", "comment"]),
    job: find(head, ["работ", "job"]),
  };
  const shifts: Shift[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const c = splitLine(line, sep);
    const date = col.date >= 0 ? parseDate(c[col.date] || "") : null;
    const start = col.start >= 0 ? parseTime(c[col.start] || "") : null;
    const end = col.end >= 0 ? parseTime(c[col.end] || "") : null;
    if (!date || !start || !end) {
      skipped++;
      continue;
    }
    const name = col.job >= 0 ? (c[col.job] || "").toLowerCase() : "";
    const job = jobs.find((j) => j.name.toLowerCase() === name) ?? jobs[0];
    if (!job) {
      skipped++;
      continue;
    }
    const num = (i: number) => (i >= 0 ? parseFloat((c[i] || "").replace(",", ".")) || 0 : 0);
    shifts.push({ id: uid(), jobId: job.id, date, start, end, breakMin: num(col.brk), breakMode: "auto", rate: num(col.rate) || job.rate, tips: num(col.tips), note: col.note >= 0 ? c[col.note] || "" : "" });
  }
  return { shifts, skipped };
};

const esc = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const shiftsToCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(esc).join(";")).join("\n");

export const todayISO = () => toISO(new Date());
