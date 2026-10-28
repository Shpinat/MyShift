import { createContext, useContext } from "react";
import type { Job, Shift } from "./types";

export type Tab = "overview" | "shifts" | "calendar" | "work" | "payslip";

export type SheetState =
  | null
  | { type: "shift"; shift?: Partial<Shift> & { virtual?: boolean }; fromTimer?: boolean }
  | { type: "job"; job?: Job }
  | { type: "schedule"; jobId?: string }
  | { type: "trash" }
  | { type: "howto" }
  | { type: "tips" }
  | { type: "info"; key: string };

export interface UI {
  tab: Tab;
  go: (t: Tab) => void;
  openSheet: (s: SheetState) => void;
  askConfirm: (text: string, onOk: () => void, okLabel?: string) => void;
}

export const UICtx = createContext<UI | null>(null);

export const useUI = () => {
  const c = useContext(UICtx);
  if (!c) throw new Error("UI provider missing");
  return c;
};
