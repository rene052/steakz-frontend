import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useApi, useTick } from "../../hooks";
import { AppShell, useTab } from "../../components/Layouts";
import { OrderBuilder } from "../../components/Menu";
import { Empty, itemsSummary, Loading, Notice, PageHeader, StatusBadge, StatusFilter } from "../../components/ui";
import { OrdersTable } from "../../components/OrdersTable";
import { minutesAgo, money, timeOnly } from "../../format";
import type { Booking, BranchDetail, Order } from "../../types";

export default function CashierDashboard() {
  const tab = useTab("floor");
  const orders = useApi<Order[]>("/api/cashier/orders", 4000);
  const ready = orders.data?.filter((o) => o.status === "DONE").length ?? 0;
  return (
    <AppShell
      nav={[
        { key: "floor", label: "Floor", badge: ready },
        { key: "new", label: "Take an order" },
        { key: "all", label: "All orders" },
      ]}
    >
      {tab === "floor" && <Floor {...orders} />}
      {tab === "new" && <NewOrder onCreated={orders.reload} />}
      {tab === "all" && <AllOrders />}
    </AppShell>
  );
}

function Floor({ data, error, reload, setData }: ReturnType<typeof useApi<Order[]>>) {
  useTick(20000);
  const [, setParams] = useSearchParams();
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const deliver = async (o: Order) => {
    setBusy(o.id);
    setActionError(null);
    try {
      const updated = await api.patch<Order>(`/api/cashier/orders/${o.id}/deliver`);
      setData((list) => (list ?? []).map((x) => (x.id === o.id ? updated : x)));
      setFlash(`Order #${o.id} served at table ${o.table?.tableNumber}.`);
    } catch (e) {
      setActionError((e as Error).message);
      reload();
    } finally {
      setBusy(null);
    }
  };

  const today = new Date().toDateString();
  const ready = data?.filter((o) => o.status === "DONE") ?? [];
  const kitchen = (data?.filter((o) => o.status === "PENDING" || o.status === "PREPARING") ?? []).slice().reverse();
  const served = data?.filter((o) => o.status === "DELIVERED" && new Date(o.updatedAt).toDateString() === today) ?? [];
  const servedTotal = served.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title="Floor"
        sub="You take orders at the table, pick up ready dishes from the kitchen and serve them. Updates automatically."
        actions={
          <button className="btn btn-primary" onClick={() => setParams({ tab: "new" })}>
            Take an order
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}
      {actionError && <Notice onClose={() => setActionError(null)}>{actionError}</Notice>}
      {flash && (
        <Notice kind="success" onClose={() => setFlash(null)}>
          {flash}
        </Notice>
      )}
      {!data && !error && <Loading />}
      {data && (
        <div className="floor-cols">
          <section className="floor-col floor-ready">
            <h2 className="col-title">
              Ready for pickup <span className="col-count">{ready.length}</span>
            </h2>
            {ready.length === 0 && <p className="muted">Nothing waiting at the pass.</p>}
            {ready.map((o) => (
              <article key={o.id} className="pickup">
                <div className="pickup-table">Table {o.table?.tableNumber}</div>
                <div className="pickup-items">{itemsSummary(o)}</div>
                <div className="pickup-foot">
                  <span className="muted small">
                    #{o.id}, ready {minutesAgo(o.updatedAt)}
                  </span>
                  <button className="btn btn-herb btn-sm" disabled={busy === o.id} onClick={() => deliver(o)}>
                    Mark delivered
                  </button>
                </div>
              </article>
            ))}
          </section>
          <section className="floor-col">
            <h2 className="col-title">
              In the kitchen <span className="col-count">{kitchen.length}</span>
            </h2>
            {kitchen.length === 0 && <p className="muted">No orders cooking.</p>}
            <ul className="mini-list">
              {kitchen.map((o) => (
                <li key={o.id}>
                  <div>
                    <strong>Table {o.table?.tableNumber}</strong> <span className="muted small">#{o.id}, {minutesAgo(o.createdAt)}</span>
                    <div className="small">{itemsSummary(o)}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          </section>
          <section className="floor-col">
            <h2 className="col-title">
              Served today <span className="col-count">{served.length}</span>
            </h2>
            <p className="small muted">To collect at the till: {money(servedTotal)}</p>
            <ul className="mini-list">
              {served.slice(0, 12).map((o) => (
                <li key={o.id}>
                  <div>
                    <strong>Table {o.table?.tableNumber}</strong> <span className="muted small">#{o.id}, {timeOnly(o.updatedAt)}</span>
                  </div>
                  <span>{money(o.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function NewOrder({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [, setParams] = useSearchParams();
  const branch = useApi<BranchDetail>(user?.branchId ? `/api/public/branches/${user.branchId}` : null);
  const bookings = useApi<Booking[]>("/api/cashier/bookings");
  const [mode, setMode] = useState<"walkin" | "booking">("walkin");
  const [tableId, setTableId] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const table = branch.data?.tables.find((t) => t.id === tableId);
  const booking = bookings.data?.find((b) => b.id === bookingId);
  const selected =
    mode === "walkin"
      ? table && `Table ${table.tableNumber}`
      : booking && `${booking.customer?.name}, table ${booking.table.tableNumber}`;

  if (!user?.branchId) return <Notice>Your account isn't assigned to a branch.</Notice>;
  if (branch.error) return <Notice>{branch.error}</Notice>;
  if (!branch.data) return <Loading />;

  return (
    <>
      <PageHeader title="Take an order" sub={`Choose the table, add the dishes and send the order to the ${branch.data.name.replace("Steakz ", "")} kitchen.`} />
      <div className="panel">
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={mode === "walkin"} className={mode === "walkin" ? "is-on" : ""} onClick={() => setMode("walkin")}>
            Walk-in table
          </button>
          <button role="tab" aria-selected={mode === "booking"} className={mode === "booking" ? "is-on" : ""} onClick={() => setMode("booking")}>
            Guest with a booking {bookings.data ? `(${bookings.data.length} today)` : ""}
          </button>
        </div>
        {mode === "walkin" ? (
          <div className="floor floor-compact" role="radiogroup" aria-label="Table">
            {branch.data.tables.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={tableId === t.id}
                className={`table-tile ${tableId === t.id ? "is-chosen" : ""}`}
                onClick={() => setTableId(t.id)}
              >
                <span className="table-no">{t.tableNumber}</span>
                <span className="table-seats">{t.capacity} seats</span>
              </button>
            ))}
          </div>
        ) : bookings.data && bookings.data.length === 0 ? (
          <p className="muted">No bookings left for today. Use Walk-in table instead.</p>
        ) : (
          <div className="pick-list" role="radiogroup" aria-label="Booking">
            {bookings.data?.map((b) => (
              <button
                key={b.id}
                role="radio"
                aria-checked={bookingId === b.id}
                className={`pick ${bookingId === b.id ? "is-chosen" : ""}`}
                onClick={() => setBookingId(b.id)}
              >
                <strong>{timeOnly(b.date)}</strong>
                <span>{b.customer?.name}</span>
                <span className="muted">
                  Table {b.table.tableNumber}, {b.guestCount} guests
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <OrderBuilder
        menu={branch.data.menuItems}
        disabled={!selected}
        header={<p className="builder-for">{selected ? `Ordering for ${selected}` : "Choose a table or booking first."}</p>}
        submitLabel="Send to kitchen"
        onSubmit={async (items) => {
          await api.post<Order>(
            "/api/cashier/orders",
            mode === "walkin" ? { tableId, items } : { bookingId, items },
          );
          onCreated();
          setParams({});
        }}
      />
    </>
  );
}

function AllOrders() {
  const [status, setStatus] = useState("");
  const { data, error } = useApi<Order[]>(`/api/cashier/orders${status ? `?status=${status}` : ""}`, 10000);
  return (
    <>
      <PageHeader title="All orders" sub="Every order at your branch, newest first." />
      <StatusFilter value={status} onChange={setStatus} />
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && data.length === 0 && <Empty title="No orders match this filter" />}
      {data && data.length > 0 && <OrdersTable orders={data} />}
    </>
  );
}
