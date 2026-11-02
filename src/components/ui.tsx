import { useEffect, useRef, type ReactNode } from "react";
import { bookingStatusLabel, money, moneyShort, orderStatusLabel } from "../format";
import type { BookingStatus, Order, OrderStatus } from "../types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{orderStatusLabel[status]}</span>;
}

export function BookingBadge({ status }: { status: BookingStatus }) {
  return <span className={`badge badge-b-${status.toLowerCase()}`}>{bookingStatusLabel[status]}</span>;
}

export function Notice({ kind = "error", children, onClose }: { kind?: "error" | "success" | "info"; children: ReactNode; onClose?: () => void }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onClose && (
        <button className="notice-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="loading">{label}</p>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

/** A figure with its label underneath — used in the dashboard summary rows. */
export function Figure({ value, label, hint }: { value: ReactNode; label: string; hint?: ReactNode }) {
  return (
    <div className="figure">
      <div className="figure-value">{value}</div>
      <div className="figure-label">{label}</div>
      {hint && <div className="figure-hint">{hint}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Simple, dependency-free vertical bar chart. */
export function BarChart({
  data,
  format = moneyShort,
  height = 180,
  highlightLast,
}: {
  data: { label: string; value: number; title?: string }[];
  format?: (n: number) => string;
  height?: number;
  highlightLast?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="barchart" style={{ height }}>
      {data.map((d, i) => (
        <div className="bar-col" key={d.label + i} title={d.title ?? `${d.label}: ${format(d.value)}`}>
          <div className="bar-track">
            <div
              className={`bar ${highlightLast && i === data.length - 1 ? "bar-hot" : ""}`}
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bars with values — good for comparing branches. */
export function RankBars({ rows, format = money }: { rows: { label: string; value: number; sub?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rankbars">
      {rows.map((r) => (
        <div className="rank-row" key={r.label}>
          <div className="rank-name">
            {r.label}
            {r.sub && <span className="rank-sub">{r.sub}</span>}
          </div>
          <div className="rank-track">
            <div className="rank-bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <div className="rank-value">{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
}

export const itemsSummary = (o: Order) => o.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ");

/** Filter chips for order status. */
export function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options: [string, string][] = [
    ["", "All"],
    ["PENDING", "In queue"],
    ["PREPARING", "Preparing"],
    ["DONE", "Ready"],
    ["DELIVERED", "Served"],
    ["CANCELLED", "Cancelled"],
  ];
  return (
    <div className="chips" role="group" aria-label="Filter by status">
      {options.map(([v, label]) => (
        <button key={v} className={`chip ${value === v ? "chip-on" : ""}`} aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}
