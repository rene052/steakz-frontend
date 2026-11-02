import { useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useApi } from "../../hooks";
import { AppShell, useTab } from "../../components/Layouts";
import { groupByCategory } from "../../components/Menu";
import { OrdersTable } from "../../components/OrdersTable";
import { SalesView, StaffTable } from "../../components/Reports";
import { BookingBadge, Empty, Figure, Loading, Modal, Notice, PageHeader, StatusFilter } from "../../components/ui";
import { dateOnly, isoDay, money, timeOnly } from "../../format";
import type { Booking, MenuItem, Order, SalesReport, StaffMember } from "../../types";

interface Overview {
  branch: { id: number; name: string; address: string; phone: string | null };
  staff: { CASHIER: number; CHEF: number; BRANCH_MANAGER: number; total: number };
  tables: { total: number; bookedToday: number; occupancyRate: number };
  menu: { total: number; available: number };
  bookingsToday: { count: number; guests: number };
  ordersToday: Record<string, number>;
  activeOrders: number;
  revenueToday: number;
}

export default function ManagerDashboard() {
  const tab = useTab("overview");
  return (
    <AppShell
      nav={[
        { key: "overview", label: "Overview" },
        { key: "orders", label: "Orders" },
        { key: "bookings", label: "Bookings" },
        { key: "staff", label: "Staff" },
        { key: "sales", label: "Sales" },
        { key: "menu", label: "Menu" },
      ]}
    >
      {tab === "overview" && <OverviewTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "sales" && <SalesTab />}
      {tab === "menu" && <MenuTab />}
    </AppShell>
  );
}

function OverviewTab() {
  const { data, error } = useApi<Overview>("/api/branch-manager/overview", 15000);
  const sales = useApi<SalesReport>("/api/branch-manager/sales");
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Loading />;
  const o = data.ordersToday;
  return (
    <>
      <PageHeader title={data.branch.name} sub={`${data.branch.address}. Today, ${dateOnly(new Date().toISOString())}.`} />
      <div className="figures">
        <Figure value={money(data.revenueToday)} label="Revenue today" hint={`${o.DELIVERED} orders served`} />
        <Figure value={data.activeOrders} label="Orders in progress" hint={`${o.PENDING} queued, ${o.PREPARING} cooking, ${o.DONE} ready`} />
        <Figure value={`${data.tables.occupancyRate}%`} label="Tables booked today" hint={`${data.tables.bookedToday} of ${data.tables.total} tables`} />
        <Figure value={data.bookingsToday.count} label="Bookings today" hint={`${data.bookingsToday.guests} guests expected`} />
      </div>
      <div className="grid-2">
        <section className="panel">
          <h2 className="panel-title">Revenue, last 14 days</h2>
          {sales.data ? <SalesView report={sales.data} chartOnly /> : <Loading />}
        </section>
        <section className="panel">
          <h2 className="panel-title">Branch at a glance</h2>
          <dl className="facts">
            <dt>Staff</dt>
            <dd>
              {data.staff.total}: {data.staff.CHEF} chefs, {data.staff.CASHIER} cashiers, {data.staff.BRANCH_MANAGER} manager
            </dd>
            <dt>Menu</dt>
            <dd>
              {data.menu.available} of {data.menu.total} dishes available
            </dd>
            <dt>Tables</dt>
            <dd>{data.tables.total}</dd>
            <dt>Cancelled today</dt>
            <dd>{o.CANCELLED}</dd>
          </dl>
        </section>
      </div>
    </>
  );
}

function OrdersTab() {
  const [status, setStatus] = useState("");
  const { data, error } = useApi<Order[]>(`/api/branch-manager/orders${status ? `?status=${status}` : ""}`, 10000);
  return (
    <>
      <PageHeader title="Orders" sub="All orders at your branch, newest first." />
      <StatusFilter value={status} onChange={setStatus} />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && data.length === 0 && <Empty title="No orders match this filter" />}
      {data && data.length > 0 && <OrdersTable orders={data} />}
    </>
  );
}

function BookingsTab() {
  const [day, setDay] = useState(isoDay());
  const { data, error } = useApi<Booking[]>(`/api/branch-manager/bookings${day ? `?date=${day}` : ""}`);
  const active = data?.filter((b) => b.status !== "CANCELLED") ?? [];
  return (
    <>
      <PageHeader
        title="Bookings"
        sub={data ? `${active.length} bookings, ${active.reduce((s, b) => s + b.guestCount, 0)} guests` : undefined}
        actions={
          <div className="inline-controls">
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day" />
            <button className="btn btn-quiet btn-sm" onClick={() => setDay(isoDay())}>
              Today
            </button>
            <button className="btn btn-quiet btn-sm" onClick={() => setDay("")}>
              All dates
            </button>
          </div>
        }
      />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && data.length === 0 && <Empty title="No bookings for this day" />}
      {data && data.length > 0 && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>{day ? "Time" : "Date"}</th>
                <th>Table</th>
                <th>Guest</th>
                <th className="num">Party</th>
                <th>Orders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id} className={b.status === "CANCELLED" ? "row-muted" : ""}>
                  <td className="nowrap">{day ? timeOnly(b.date) : `${dateOnly(b.date)}, ${timeOnly(b.date)}`}</td>
                  <td>
                    {b.table.tableNumber} <span className="muted small">({b.table.capacity} seats)</span>
                  </td>
                  <td>
                    {b.customer?.name}
                    <div className="muted small">{b.customer?.email}</div>
                  </td>
                  <td className="num">{b.guestCount}</td>
                  <td>{b.orders?.length ? b.orders.map((o) => `#${o.id}`).join(", ") : <span className="muted">None</span>}</td>
                  <td>
                    <BookingBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StaffTab() {
  const { data, error } = useApi<{ staff: StaffMember[]; totalSalaries: number; headcount: number }>("/api/branch-manager/staff");
  return (
    <>
      <PageHeader title="Staff" sub="Staff accounts are created by the admin." />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="figures figures-2">
            <Figure value={data.headcount} label="People on the roster" />
            <Figure value={money(data.totalSalaries)} label="Annual salaries" hint={`${money(data.totalSalaries / 12)} a month`} />
          </div>
          <StaffTable staff={data.staff} />
        </>
      )}
    </>
  );
}

function SalesTab() {
  const { data, error } = useApi<SalesReport>("/api/branch-manager/sales");
  return (
    <>
      <PageHeader title="Sales" sub="Counted when an order is served (guests pay as they leave)." />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && <SalesView report={data} />}
    </>
  );
}

const emptyItem = { name: "", description: "", price: "", category: "Steaks" };

function MenuTab() {
  const { user } = useAuth();
  if (!user?.branchId) return <Notice>Your account isn't assigned to a branch.</Notice>;
  return (
    <>
      <PageHeader title="Menu" sub="Add dishes, change prices and switch dishes on or off." />
      <MenuManager branchId={user.branchId} />
    </>
  );
}

/** Add / edit / switch dishes for one branch. Admins pass the branch explicitly. */
export function MenuManager({ branchId, sendBranchId }: { branchId: number; sendBranchId?: boolean }) {
  const { data, error, reload } = useApi<MenuItem[]>(`/api/menu/${branchId}`);
  const [form, setForm] = useState(emptyItem);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const categories = [...new Set(["Starters", "Steaks", "Mains", "Sides", "Desserts", "Drinks", ...(data ?? []).map((m) => m.category)])];

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const item = await api.post<MenuItem>("/api/menu", {
        ...form,
        price: Number(form.price),
        ...(sendBranchId ? { branchId } : {}),
      });
      setNotice(`${item.name} added to the menu.`);
      setForm(emptyItem);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (m: MenuItem) => {
    try {
      await api.patch(`/api/menu/${m.id}`, { isAvailable: !m.isAvailable });
      reload();
    } catch (err) {
      setNotice(null);
      setFormError((err as Error).message);
    }
  };

  return (
    <>
      {notice && (
        <Notice kind="success" onClose={() => setNotice(null)}>
          {notice}
        </Notice>
      )}
      <section className="panel">
        <h2 className="panel-title">Add a dish</h2>
        <form className="form form-grid" onSubmit={add}>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Price
            <input type="number" min="0.5" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </label>
          <label className="span-2">
            Description
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </label>
          <div className="form-end">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Adding…" : "Add dish"}
            </button>
          </div>
        </form>
        {formError && <Notice onClose={() => setFormError(null)}>{formError}</Notice>}
      </section>

      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data &&
        groupByCategory(data).map(([cat, items]) => (
          <section key={cat} className="panel">
            <h2 className="panel-title">{cat}</h2>
            <table className="table table-flush">
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className={m.isAvailable ? "" : "row-muted"}>
                    <td>
                      <strong>{m.name}</strong>
                      {m.description && <div className="muted small">{m.description}</div>}
                    </td>
                    <td className="num">{money(m.price)}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={m.isAvailable} onChange={() => toggle(m)} />
                        <span>{m.isAvailable ? "Available" : "Off the menu"}</span>
                      </label>
                    </td>
                    <td className="num">
                      <button className="btn btn-quiet btn-sm" onClick={() => setEditing(m)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      {editing && (
        <EditItem
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setNotice(`${m.name} updated.`);
            reload();
          }}
        />
      )}
    </>
  );
}

export function EditItem({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: MenuItem;
  categories: string[];
  onClose: () => void;
  onSaved: (m: MenuItem) => void;
}) {
  const [form, setForm] = useState({ name: item.name, description: item.description ?? "", price: String(item.price), category: item.category });
  const [error, setError] = useState<string | null>(null);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      onSaved(await api.patch<MenuItem>(`/api/menu/${item.id}`, { ...form, price: Number(form.price) }));
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Edit ${item.name}`} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        </label>
        <label>
          Description
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="form-row">
          <label>
            Price
            <input type="number" min="0.5" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <Notice>{error}</Notice>}
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </Modal>
  );
}

