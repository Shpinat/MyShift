import { useEffect, type ReactNode } from "react";
import { Briefcase, Camera, Car, Coffee, GraduationCap, Hammer, HeartPulse, Stethoscope, Store, Truck, Utensils, Wrench, X, type LucideIcon } from "lucide-react";
import type { Job } from "../lib/types";

export const JOB_ICONS: Record<string, LucideIcon> = {
  "heart-pulse": HeartPulse,
  briefcase: Briefcase,
  coffee: Coffee,
  truck: Truck,
  store: Store,
  wrench: Wrench,
  utensils: Utensils,
  graduation: GraduationCap,
  camera: Camera,
  car: Car,
  hammer: Hammer,
  stethoscope: Stethoscope,
};

export const JOB_COLORS = ["#1f9fc4", "#5136f5", "#0a8f5c", "#e0701a", "#d9003f", "#8a3ffc", "#c28a00", "#4b5563"];

export function JobBadge({ job, size = 40 }: { job: Pick<Job, "icon" | "color">; size?: number }) {
  const I = JOB_ICONS[job.icon] ?? Briefcase;
  return (
    <span className="job-badge" style={{ width: size, height: size, color: job.color, background: `color-mix(in srgb, ${job.color} 14%, var(--surface))` }}>
      <I size={size * 0.5} strokeWidth={2.1} />
    </span>
  );
}

export function Sheet({ title, onClose, children, footer, badge }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; badge?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h2>{title}</h2>
          {badge}
          <button className="icon-btn ghost" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="scrim drawer-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-label={title}>
        <div className="drawer-head">
          <h2>{title}</h2>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, size }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: "sm" }) {
  return (
    <div className={`seg ${size ?? ""}`} role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Confirm({ text, onCancel, onOk, okLabel = "Подтвердить" }: { text: string; onCancel: () => void; onOk: () => void; okLabel?: string }) {
  return (
    <div className="scrim center" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog">
        <span className="dialog-ico">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </span>
        <p>{text}</p>
        <div className="dialog-actions">
          <button className="btn outline" onClick={onCancel}>
            ОТМЕНА
          </button>
          <button className="btn danger" onClick={onOk}>
            {okLabel.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="eyebrow">
        {label}
        {hint && (
          <span className="hint" title={hint} aria-label={hint}>
            i
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export function Empty({ icon: I, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty-ico">
        <I size={22} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
