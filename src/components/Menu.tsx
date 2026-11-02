import { useMemo, useState } from "react";
import { money } from "../format";
import type { MenuItem } from "../types";
import { Notice } from "./ui";

export function groupByCategory(items: MenuItem[]) {
  const order = ["Starters", "Steaks", "Mains", "Sides", "Desserts", "Drinks"];
  const groups = new Map<string, MenuItem[]>();
  for (const it of items) groups.set(it.category, [...(groups.get(it.category) ?? []), it]);
  return [...groups.entries()].sort(
    ([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b),
  );
}

/** The public menu, laid out like a steakhouse menu board with dotted price leaders. */
export function MenuBoard({ items }: { items: MenuItem[] }) {
  return (
    <div className="menuboard">
      {groupByCategory(items).map(([category, list]) => (
        <section key={category} className="menu-section">
          <h3 className="menu-cat">{category}</h3>
          <ul className="menu-list">
            {list.map((m) => (
              <li key={m.id} className={`menu-row ${m.isAvailable ? "" : "is-out"}`}>
                <div className="menu-line">
                  <span className="menu-name">{m.name}</span>
                  <span className="menu-dots" aria-hidden="true" />
                  <span className="menu-price">{m.isAvailable ? money(m.price) : "Sold out"}</span>
                </div>
                {m.description && <p className="menu-desc">{m.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export type CartLine = { menuItemId: number; quantity: number };

/** Pick dishes and quantities, then submit — used by customers and cashiers. */
export function OrderBuilder({
  menu,
  submitLabel,
  onSubmit,
  disabled,
  header,
}: {
  menu: MenuItem[];
  submitLabel: string;
  onSubmit: (items: CartLine[]) => Promise<void>;
  disabled?: boolean;
  header?: React.ReactNode;
}) {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = useMemo(() => menu.filter((m) => m.isAvailable), [menu]);
  const byId = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);

  const lines = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ item: byId.get(Number(id))!, quantity: q }));
  const total = lines.reduce((s, l) => s + l.item.price * l.quantity, 0);

  const change = (id: number, delta: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(50, (q[id] ?? 0) + delta)) }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })));
      setQty({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="builder">
      <div className="builder-menu">
        {header}
        {groupByCategory(available).map(([category, list]) => (
          <section key={category} className="builder-section">
            <h3 className="builder-cat">{category}</h3>
            {list.map((m) => {
              const q = qty[m.id] ?? 0;
              return (
                <div key={m.id} className={`builder-row ${q ? "is-picked" : ""}`}>
                  <div className="builder-info">
                    <div className="builder-name">{m.name}</div>
                    <div className="builder-price">{money(m.price)}</div>
                  </div>
                  <div className="stepper" aria-label={`Quantity of ${m.name}`}>
                    <button type="button" onClick={() => change(m.id, -1)} disabled={!q} aria-label={`Remove one ${m.name}`}>
                      −
                    </button>
                    <span aria-live="polite">{q}</span>
                    <button type="button" onClick={() => change(m.id, 1)} aria-label={`Add one ${m.name}`}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <aside className="builder-cart" aria-label="Order summary">
        <h3>Order</h3>
        {lines.length === 0 ? (
          <p className="muted">Add dishes from the menu.</p>
        ) : (
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={l.item.id}>
                <span>
                  {l.quantity}× {l.item.name}
                </span>
                <span>{money(l.item.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="cart-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        {error && <Notice>{error}</Notice>}
        <button className="btn btn-primary btn-block" disabled={!lines.length || busy || disabled} onClick={submit}>
          {busy ? "Sending…" : submitLabel}
        </button>
      </aside>
    </div>
  );
}
