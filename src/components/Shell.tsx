import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, Bell, BookOpen, CalendarDays, Check, ChevronRight, Clock, Code2, Cookie, Download, Eye, EyeOff, FileCheck2, FileText, Globe, HelpCircle, Info, Lightbulb, LogOut, Mail, MoreHorizontal, Plus, RefreshCcw, ShieldCheck, Star, Sun, Moon, Tag, Trash2, Upload, BarChart3, BadgeCheck, Briefcase, Network, CheckCheck, Sparkles, ChevronLeft, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "../lib/store";
import { useUI, type Tab } from "../lib/uictx";
import { Drawer, Empty } from "./ui";
import { CURRENCIES, download } from "../lib/format";
import { parseShiftsCsv } from "../lib/csv";
import { toISO } from "../lib/dates";

export const Logo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3a2a9a" />
        <stop offset="1" stopColor="#1b1260" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#lg)" />
    <path d="M10 25c14 6 30 6 44 0M9 33c15 6 31 6 46 0M12 42c13 5 27 5 40 0" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
  </svg>
);

const NAV: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Обзор", icon: BarChart3 },
  { id: "shifts", label: "Смены", icon: Clock },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "work", label: "Работа", icon: Briefcase },
  { id: "payslip", label: "Расчётка", icon: FileCheck2 },
];

export function BottomNav() {
  const { tab, go } = useUI();
  return (
    <nav className="nav" aria-label="Разделы">
      {NAV.map((n) => (
        <button key={n.id} className={tab === n.id ? "on" : ""} onClick={() => go(n.id)} aria-current={tab === n.id ? "page" : undefined}>
          <span className="nav-pill">
            <n.icon size={20} strokeWidth={2.1} />
          </span>
          <span className="nav-label">{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

export function Header() {
  const { settings } = useApp();
  const [drawer, setDrawer] = useState(false);
  const n = usePopover();
  const initials = "Настройки";
  return (
    <header className="topbar">
      <div className="brand">
        <Logo />
        <span>Трекер смен</span>
      </div>
      <div className="topbar-actions" ref={n.ref}>
        <button className="icon-btn ghost bell" onClick={() => n.setOpen(!n.open)} aria-label="Уведомления" aria-expanded={n.open}>
          <Bell size={20} />
        </button>
        {n.open && (
          <div className="popover notif">
            <div className="notif-head">
              <span className="eyebrow">УВЕДОМЛЕНИЯ</span>
              <span className="eyebrow faint">
                <CheckCheck size={13} /> ПРОЧИТАТЬ ВСЁ
              </span>
            </div>
            <Empty icon={Bell} title="Всё прочитано" text="Уведомлений пока нет. Мы напишем сюда, когда появится новый трекер, калькулятор или что-то важное для аккаунта." />
          </div>
        )}
        <button className="icon-btn ghost bell" onClick={() => setDrawer(true)} aria-label="Настройки"><SettingsIcon size={20} /></button>
      </div>
      {drawer && <AccountDrawer onClose={() => setDrawer(false)} />}
    </header>
  );
}

function AccountDrawer({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, resetAll, notify } = useApp();
  const { openSheet, askConfirm } = useUI();
  const row = (icon: ReactNode, label: string, key: string, extra?: ReactNode) => (
    <button
      className="drow"
      onClick={() => {
        onClose();
        openSheet({ type: "info", key });
      }}
    >
      <span className="drow-ico">{icon}</span>
      <span className="drow-label">{label}</span>
      {extra}
      <ChevronRight size={16} className="muted" />
    </button>
  );
  return (
    <Drawer title="Настройки" onClose={onClose}>
      <div className="drawer-pills">
        <label className="pill-select">
          <Globe size={16} />
          <select value={settings.lang} onChange={(e) => setSettings({ lang: e.target.value })} aria-label="Язык">
            <option value="RU">RU</option>
          </select>
        </label>
        <label className="pill-select">
          <span className="ccy-ico">₽</span>
          <select value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })} aria-label="Валюта">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="pill-btn" onClick={() => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })} aria-label="Сменить тему">
          {settings.theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <button
        className="drow danger"
        onClick={() =>
          askConfirm("Сбросить все данные на этом устройстве и вернуть демо-данные?", () => {
            resetAll();
            onClose();
            notify("Данные сброшены");
          }, "Сбросить")
        }
      >
        <span className="drow-ico">
          <LogOut size={17} />
        </span>
        <span className="drow-label">Сбросить данные</span>
        <ChevronRight size={16} />
      </button>
      <h4 className="eyebrow group">ОБЗОР</h4>
      {row(<Tag size={17} />, "Тарифы", "plans")}
      {row(<BookOpen size={17} />, "Методичка", "guide")}
      {row(<Code2 size={17} />, "Виджет для сайта", "widget")}
      <h4 className="eyebrow group">ПОДДЕРЖКА И ОТЗЫВЫ</h4>
      {row(<Lightbulb size={17} />, "Предложить идею", "idea", <span className="new-badge">НОВОЕ</span>)}
      {row(<HelpCircle size={17} />, "Помощь и FAQ", "help")}
      {row(<Mail size={17} />, "Связаться с поддержкой", "support")}
      {row(<Star size={17} />, "Оцените нас", "rate")}
      {row(<Info size={17} />, "О приложении", "about")}
      {row(<BadgeCheck size={17} />, "Наши обещания", "promises")}
      <h4 className="eyebrow group">ЮРИДИЧЕСКАЯ ИНФОРМАЦИЯ</h4>
      {row(<ShieldCheck size={17} />, "Политика конфиденциальности", "privacy")}
      {row(<FileText size={17} />, "Условия использования", "terms")}
      {row(<Cookie size={17} />, "Политика Cookie", "cookies")}
    </Drawer>
  );
}

export function pickCsv(onText: (t: string) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv,text/plain";
  input.onchange = async () => {
    const f = input.files?.[0];
    if (f) onText(await f.text());
  };
  input.click();
}

export function useBookActions() {
  const { jobs, book, state, importShifts, notify } = useApp();
  return {
    importCsv: () =>
      pickCsv((text) => {
        const { shifts, skipped } = parseShiftsCsv(text, jobs);
        if (!shifts.length) return notify(jobs.length ? "Не удалось найти смены в файле" : "Сначала добавьте место работы");
        importShifts(shifts);
        notify(`Импортировано смен: ${shifts.length}${skipped ? `, пропущено строк: ${skipped}` : ""}`);
      }),
    exportAll: () => {
      download(`shifts-${state.activeBook}-${toISO(new Date())}.json`, JSON.stringify(book, null, 2), "application/json");
      notify("Файл сохранён");
    },
  };
}

export function PageTitle({ title, badge }: { title: string; badge?: ReactNode }) {
  const { go, tab, openSheet } = useUI();
  const { state, settings, setSettings, switchBook, addBook, trashCount, book, notify } = useApp();
  const { importCsv, exportAll } = useBookActions();
  const m = usePopover();
  const close = (fn: () => void) => () => {
    m.setOpen(false);
    fn();
  };
  const repeatLast = () => {
    const last = [...book.shifts].filter((s) => !s.deletedAt).sort((a, b) => (a.date + a.start < b.date + b.start ? 1 : -1))[0];
    if (!last) return notify("Пока нет смен, которые можно повторить");
    openSheet({ type: "shift", shift: { ...last, id: undefined, date: toISO(new Date()), note: "", virtual: false } });
  };
  return (
    <div className="page-title">
      <button className="icon-btn soft" onClick={() => go("overview")} disabled={tab === "overview"} aria-label="Назад">
        <ArrowLeft size={19} />
      </button>
      <h1>
        {title}
        {badge}
      </h1>
      <button className="icon-btn primary" onClick={() => openSheet({ type: "shift" })} aria-label="Добавить смену" title="Добавить смену">
        <Plus size={20} />
      </button>
      <div className="menu-wrap" ref={m.ref}>
        <button className="icon-btn soft" onClick={() => m.setOpen(!m.open)} aria-label="Меню" aria-expanded={m.open}>
          <MoreHorizontal size={19} />
        </button>
        {m.open && (
          <div className="popover menu">
            <div className="eyebrow pad">КНИГИ СМЕН</div>
            {state.books.map((b) => (
              <button key={b.id} className={`mrow plain ${b.id === state.activeBook ? "active" : ""}`} onClick={close(() => switchBook(b.id))}>
                <span className="mrow-ico">
                  <WalletIcon />
                </span>
                <span className="grow">{b.name}</span>
                {b.id === state.activeBook && <Check size={15} className="accent" />}
              </button>
            ))}
            <button
              className="mrow add"
              onClick={close(() => {
                addBook(`Общая книга ${state.books.length}`);
                notify("Создана новая книга смен");
              })}
            >
              <Plus size={15} />
              <span>
                <b>Общая книга смен</b>
                <small>Вторая книга — ведите её отдельно от личной. Ваша личная остаётся закрытой.</small>
              </span>
            </button>
            <hr />
            <button className="mrow" onClick={close(repeatLast)}>
              <span className="mrow-ico t-green">
                <RefreshCcw size={16} />
              </span>
              Как прошлая смена
            </button>
            <button className="mrow" onClick={close(importCsv)}>
              <span className="mrow-ico t-teal">
                <Upload size={16} />
              </span>
              Импорт
            </button>
            <button className="mrow" onClick={close(exportAll)}>
              <span className="mrow-ico t-violet">
                <Download size={16} />
              </span>
              Экспорт
            </button>
            <hr />
            <button className="mrow" onClick={close(() => openSheet({ type: "trash" }))}>
              <span className="mrow-ico t-red">
                <Trash2 size={16} />
              </span>
              <span className="grow">Корзина</span>
              {trashCount > 0 && <span className="count-pill">{trashCount}</span>}
            </button>
            <button className="mrow" onClick={close(() => openSheet({ type: "howto" }))}>
              <span className="mrow-ico t-violet">
                <Network size={16} />
              </span>
              Как это работает
            </button>
            <button className="mrow" onClick={close(() => setSettings({ hideAmounts: !settings.hideAmounts }))}>
              <span className="mrow-ico t-gray">{settings.hideAmounts ? <Eye size={16} /> : <EyeOff size={16} />}</span>
              {settings.hideAmounts ? "Показать суммы" : "Скрыть суммы"}
            </button>
            <button className="mrow" onClick={close(() => notify("Нажмите Ctrl+D (⌘+D), чтобы добавить страницу в закладки"))}>
              <span className="mrow-ico t-amber">
                <Star size={16} />
              </span>
              В избранное
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const WalletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
);

export function AssistantTab({ onClick }: { onClick: () => void }) {
  return (
    <button className="edge-tab" onClick={onClick} aria-label="Подсказки">
      <ChevronLeft size={16} />
    </button>
  );
}

