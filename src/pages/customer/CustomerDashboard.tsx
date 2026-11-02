import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { useApi } from "../../hooks";
import { AppShell, useTab } from "../../components/Layouts";
import { OrderBuilder, type CartLine } from "../../components/Menu";
import { BookingBadge, Empty, Loading, Modal, Notice, PageHeader, StatusBadge } from "../../components/ui";
import { dateTime, isoDay, minutesAgo, money } from "../../format";
import type { Booking, Branch, BranchDetail, MenuItem, Order, OrderStatus } from "../../types";

const ACTIVE: OrderStatus[] = ["PENDING", "PREPARING", "DONE"];

export default function CustomerDashboard() {
  const tab = useTab("bookings");
  const orders = useApi<Order[]>("/api/customer/orders", 5000);
  const live = orders.data?.filter((o) => ACTIVE.includes(o.status)).length ?? 0;

  return (
    <AppShell
      nav={[
        { key: "bookings", label: "My bookings" },
        { key: "book", label: "Book a table" },
        { key: "order", label: "Order food" },
        { key: "orders", label: "My orders", badge: live },
      ]}
    >
      {tab === "bookings" && <MyBookings onOrdered={orders.reload} />}
      {tab === "book" && <BookTable />}
      {tab === "order" && <OrderFood onOrdered={orders.reload} />}
      {tab === "orders" && <MyOrders orders={orders.data} error={orders.error} />}
    </AppShell>
  );
}

// ---------------- Book a table ----------------

const TIMES = Array.from({ length: 21 }, (_, i) => {
  const h = 12 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

function nextSlot() {
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes() + 60;
  const slot = TIMES.find((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) >= mins);
  if (slot) return { day: isoDay(d), time: slot };
  d.setDate(d.getDate() + 1);
  return { day: isoDay(d), time: "19:00" };
}

function BookTable() {
  const [params, setParams] = useSearchParams();
  const { data: branches } = useApi<Branch[]>("/api/public/branches");
  const initial = useMemo(nextSlot, []);
  const [branchId, setBranchId] = useState<string>(params.get("branch") || "");
  const [day, setDay] = useState(initial.day);
  const [time, setTime] = useState(initial.time);
  const [guests, setGuests] = useState(2);
  const [tableId, setTableId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!branchId && branches?.length) setBranchId(String(branches[0].id));
  }, [branches, branchId]);

  const at = useMemo(() => new Date(`${day}T${time}:00`), [day, time]);
  const inPast = at.getTime() < Date.now();
  const detail = useApi<BranchDetail>(branchId ? `/api/public/branches/${branchId}?at=${encodeURIComponent(at.toISOString())}` : null);

  useEffect(() => setTableId(null), [branchId, day, time]);

  const book = async () => {
    if (!tableId) return;
    setBusy(true);
    setError(null);
    try {
      const b = await api.post<Booking>("/api/customer/bookings", {
        branchId: Number(branchId),
        tableId,
        guestCount: guests,
        date: at.toISOString(),
      });
      // Straight to ordering for the new booking.
      setParams({ tab: "order", booking: String(b.id), booked: "1" });
    } catch (e) {
      setError((e as Error).message);
      detail.reload();
    } finally {
      setBusy(false);
    }
  };

  const chosen = detail.data?.tables.find((t) => t.id === tableId);

  return (
    <>
      <PageHeader title="Book a table" sub="Choose where and when, then pick a free table that fits your group." />
      <div className="panel">
        <div className="form-row">
          <label>
            Branch
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={day} min={isoDay()} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label>
            Time
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Guests
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {inPast ? (
        <Notice kind="info">That time has already passed. Pick a later time or another day.</Notice>
      ) : (
        <div className="panel">
          <h2 className="panel-title">Tables at {time}</h2>
          {!detail.data ? (
            <Loading />
          ) : (
            <>
              <div className="floor" role="radiogroup" aria-label="Tables">
                {detail.data.tables.map((t) => {
                  const tooSmall = t.capacity < guests;
                  const blocked = t.isBooked || !t.isAvailable || tooSmall;
                  return (
                    <button
                      key={t.id}
                      role="radio"
                      aria-checked={tableId === t.id}
                      disabled={blocked}
                      className={`table-tile ${tableId === t.id ? "is-chosen" : ""} ${t.isBooked ? "is-booked" : ""}`}
                      onClick={() => setTableId(t.id)}
                    >
                      <span className="table-no">{t.tableNumber}</span>
                      <span className="table-seats">{t.capacity} seats</span>
                      <span className="table-state">{t.isBooked ? "Booked" : tooSmall ? "Too small" : !t.isAvailable ? "Closed" : "Free"}</span>
                    </button>
                  );
                })}
              </div>
              {error && <Notice>{error}</Notice>}
              <div className="confirm-bar">
                <span>
                  {chosen
                    ? `Table ${chosen.tableNumber} for ${guests} on ${dateTime(at.toISOString())}`
                    : "Pick a free table to continue."}
                </span>
                <button className="btn btn-primary" disabled={!chosen || busy} onClick={book}>
                  {busy ? "Booking…" : "Confirm booking"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ---------------- My bookings ----------------

function MyBookings({ onOrdered }: { onOrdered: () => void }) {
  const [, setParams] = useSearchParams();
  const { data, error, reload } = useApi<Booking[]>("/api/customer/bookings", 15000);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);

  const now = Date.now();
  const upcoming = (data ?? [])
    .filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > now - 3 * 3600_000)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = (data ?? []).filter((b) => !upcoming.includes(b));

  const cancel = async () => {
    if (!cancelling) return;
    setActionError(null);
    try {
      await api.del(`/api/customer/bookings/${cancelling.id}`);
      setNotice(`Booking for ${dateTime(cancelling.date)} cancelled.`);
      setCancelling(null);
      reload();
      onOrdered();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="My bookings" />
      {notice && (
        <Notice
          kind="success"
          onClose={() => setNotice(null)}
        >
          {notice}
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && upcoming.length === 0 && (
        <Empty title="No upcoming bookings">
          <button className="btn btn-primary" onClick={() => setParams({ tab: "book" })}>
            Book a table
          </button>
        </Empty>
      )}
      <div className="booking-list">
        {upcoming.map((b) => (
          <article key={b.id} className="booking">
            <div className="booking-when">
              <div className="booking-day">{new Date(b.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
              <div className="booking-time">{new Date(b.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div className="booking-what">
              <div className="booking-place">{b.table.branch?.name}</div>
              <div className="muted">
                Table {b.table.tableNumber}, {b.guestCount} {b.guestCount === 1 ? "guest" : "guests"}
              </div>
              {!!b.orders?.length && (
                <div className="booking-orders">
                  {b.orders.map((o) => (
                    <span key={o.id}>
                      Order #{o.id} <StatusBadge status={o.status} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="booking-side">
              <BookingBadge status={b.status} />
              <div className="booking-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setParams({ tab: "order", booking: String(b.id) })}>
                  Order food
                </button>
                <button className="btn btn-quiet btn-sm" onClick={() => setCancelling(b)}>
                  Cancel booking
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="subhead">Past and cancelled</h2>
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Branch</th>
                <th>Table</th>
                <th>Guests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(showAllPast ? past : past.slice(0, 8)).map((b) => (
                <tr key={b.id}>
                  <td>{dateTime(b.date)}</td>
                  <td>{b.table.branch?.name}</td>
                  <td>{b.table.tableNumber}</td>
                  <td>{b.guestCount}</td>
                  <td>
                    <BookingBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {past.length > 8 && (
            <button className="btn btn-quiet btn-sm show-more" onClick={() => setShowAllPast((v) => !v)}>
              {showAllPast ? "Show fewer" : `Show all ${past.length}`}
            </button>
          )}
        </>
      )}

      {cancelling && (
        <Modal title="Cancel this booking?" onClose={() => setCancelling(null)}>
          <p>
            {cancelling.table.branch?.name}, table {cancelling.table.tableNumber}, {dateTime(cancelling.date)}. Orders still waiting
            in the kitchen queue will be cancelled too.
          </p>
          {actionError && <Notice>{actionError}</Notice>}
          <div className="modal-actions">
            <button className="btn btn-quiet" onClick={() => setCancelling(null)}>
              Keep booking
            </button>
            <button className="btn btn-danger" onClick={cancel}>
              Cancel booking
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------- Order food ----------------

function OrderFood({ onOrdered }: { onOrdered: () => void }) {
  const [params, setParams] = useSearchParams();
  const { data: bookings, error } = useApi<Booking[]>("/api/customer/bookings");
  const now = Date.now();
  const active = (bookings ?? [])
    .filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && new Date(b.date).getTime() > now - 3 * 3600_000)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const wanted = Number(params.get("booking"));
  const booking = active.find((b) => b.id === wanted) ?? active[0];
  const branchId = booking?.table.branch?.id;
  const menu = useApi<MenuItem[]>(branchId ? `/api/menu/${branchId}` : null);
  const justBooked = params.get("booked") === "1";

  if (error) return <Notice>{error}</Notice>;
  if (!bookings) return <Loading />;

  return (
    <>
      <PageHeader title="Order food" sub="Orders are linked to your booking and go straight to that branch's kitchen." />
      {justBooked && booking && (
        <Notice kind="success">
          Table {booking.table.tableNumber} at {booking.table.branch?.name} is booked for {dateTime(booking.date)}. Choose your
          food now, or come back later.
        </Notice>
      )}
      {active.length === 0 ? (
        <Empty title="You need a booking to order">
          <p>Book a table first. Then you can order food for it here.</p>
          <button className="btn btn-primary" onClick={() => setParams({ tab: "book" })}>
            Book a table
          </button>
        </Empty>
      ) : (
        <>
          <div className="panel">
            <h2 className="panel-title">Which booking is this for?</h2>
            <div className="pick-list" role="radiogroup" aria-label="Booking">
              {active.map((b) => (
                <button
                  key={b.id}
                  role="radio"
                  aria-checked={booking?.id === b.id}
                  className={`pick ${booking?.id === b.id ? "is-chosen" : ""}`}
                  onClick={() => setParams({ tab: "order", booking: String(b.id) })}
                >
                  <strong>{dateTime(b.date)}</strong>
                  <span>{b.table.branch?.name}</span>
                  <span className="muted">
                    Table {b.table.tableNumber}, {b.guestCount} {b.guestCount === 1 ? "guest" : "guests"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {menu.error && <Notice>{menu.error}</Notice>}
          {!menu.data ? (
            <Loading />
          ) : (
            <OrderBuilder
              key={booking!.id}
              menu={menu.data}
              header={<p className="builder-for">Ordering for table {booking!.table.tableNumber}, {booking!.table.branch?.name}</p>}
              submitLabel="Send to kitchen"
              onSubmit={async (items: CartLine[]) => {
                const o = await api.post<Order>("/api/customer/orders", { bookingId: booking!.id, items });
                onOrdered();
                setParams({ tab: "orders", ordered: String(o.id) });
              }}
            />
          )}
        </>
      )}
    </>
  );
}

// ---------------- My orders (live) ----------------

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Sent to kitchen" },
  { status: "PREPARING", label: "Preparing" },
  { status: "DONE", label: "Ready" },
  { status: "DELIVERED", label: "Served" },
];

function Progress({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") return <StatusBadge status={status} />;
  const idx = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="progress" aria-label={`Order status: ${STEPS[idx]?.label}`}>
      {STEPS.map((s, i) => (
        <li key={s.status} className={i < idx ? "is-past" : i === idx ? "is-now" : ""}>
          {s.label}
        </li>
      ))}
    </ol>
  );
}

function MyOrders({ orders, error }: { orders: Order[] | null; error: string | null }) {
  const [showAll, setShowAll] = useState(false);
  const [params, setParams] = useSearchParams();
  const ordered = params.get("ordered");
  const active = orders?.filter((o) => ACTIVE.includes(o.status)) ?? [];
  const past = orders?.filter((o) => !ACTIVE.includes(o.status)) ?? [];
  return (
    <>
      <PageHeader title="My orders" sub="Statuses update automatically." />
      {ordered && (
        <Notice kind="success" onClose={() => setParams({ tab: "orders" })}>
          Order #{ordered} was sent to the kitchen. Its status below changes as the chef and waiter work on it.
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      {!orders && !error && <Loading />}
      {orders && orders.length === 0 && <Empty title="No orders yet">Choose Order food in the menu to order for one of your bookings.</Empty>}
      {active.map((o) => (
        <article key={o.id} className="panel live-order">
          <div className="live-head">
            <div>
              <h2 className="panel-title">Order #{o.id}</h2>
              <p className="muted">
                {o.branch.name}, table {o.table?.tableNumber}, {minutesAgo(o.createdAt)}
              </p>
            </div>
            <strong className="price">{money(o.total)}</strong>
          </div>
          <Progress status={o.status} />
          <ul className="plain-list">
            {o.items.map((i) => (
              <li key={i.id}>
                {i.quantity}× {i.menuItem.name}
              </li>
            ))}
          </ul>
        </article>
      ))}
      {past.length > 0 && (
        <>
          <h2 className="subhead">Earlier orders</h2>
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>When</th>
                <th>Branch</th>
                <th>Items</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? past : past.slice(0, 10)).map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{dateTime(o.createdAt)}</td>
                  <td>{o.branch.name}</td>
                  <td className="cell-wrap">{o.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")}</td>
                  <td className="num">{money(o.total)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {past.length > 10 && (
            <button className="btn btn-quiet btn-sm show-more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${past.length}`}
            </button>
          )}
        </>
      )}
    </>
  );
}
