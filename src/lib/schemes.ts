import type { ShiftType } from "./types";

export interface Scheme {
  id: string;
  title: string;
  text: string;
  types: ShiftType[];
  cycle: number[];
}

const D: ShiftType = { start: "07:00", end: "19:00" };
const N: ShiftType = { start: "19:00", end: "07:00" };
const pitman = [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0];

export const SCHEMES: Scheme[] = [
  { id: "4x4", title: "4 через 4", text: "Четыре дня по 12 часов, четыре выходных.", types: [D], cycle: [1, 1, 1, 1, 0, 0, 0, 0] },
  { id: "pitman", title: "2-2-3 (Питман)", text: "Смены по 12 часов в 14-дневном цикле; выходные — через неделю.", types: [D], cycle: pitman },
  { id: "dupont", title: "DuPont", text: "28 дней ночных и дневных смен по 12 часов с перерывом на 7 дней.", types: [D, N], cycle: [2, 2, 2, 2, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] },
  { id: "panama", title: "Панама", text: "2-2-3: две недели днём, затем две недели ночью.", types: [D, N], cycle: [...pitman, ...pitman.map((x) => (x ? 2 : 0))] },
  { id: "continental", title: "Континентальный", text: "Смены по 8 часов: 2 утра, 2 дня, 2 ночи, 2 выходных.", types: [{ start: "06:00", end: "14:00" }, { start: "14:00", end: "22:00" }, { start: "22:00", end: "06:00" }], cycle: [1, 1, 2, 2, 3, 3, 0, 0] },
  { id: "5x2", title: "5/2", text: "Обычная неделя: пять дней по 8 часов.", types: [{ start: "09:00", end: "17:00" }], cycle: [1, 1, 1, 1, 1, 0, 0] },
  { id: "custom", title: "Свой", text: "Нажимайте на дни ниже и соберите любой цикл до 56 дней.", types: [{ start: "07:00", end: "19:00" }], cycle: [1, 1, 0, 0, 0, 0, 0] },
];
