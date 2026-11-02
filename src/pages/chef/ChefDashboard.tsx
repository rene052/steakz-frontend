import { useState } from "react";
import { api } from "../../api";
import { useApi, useTick } from "../../hooks";
import { AppShell, useTab } from "../../components/Layouts";
import { groupByCategory } from "../../components/Menu";
import { Empty, Loading, Modal, Notice, PageHeader } from "../../components/ui";
import { minutesAgo, money, timeOnly } from "../../format";
import type { MenuItem, Order } from "../../types";

export default function ChefDashboard() {
  const tab = useTab("queue");
  const queue = useApi<Order[]>("/api/chef/orders", 4000);
  return (
    <AppShell
      nav={[
        { key: "queue", label: "Kitchen queue", badge: queue.data?.length },
        { key: "menu", label: "Branch menu" },
      ]}
    >
      {tab === "queue" && <Queue {...queue} />}
      {tab === "menu" && <ChefMenu />}
    </AppShell>
  );
}

function Queue({ data, error, reload, setData }: ReturnType<typeof useApi<Order[]>>) {
  useTick(20000);
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (o: Order, step: "preparing" | "done") => {
    setBusy(o.id);
    setActionError(null);
    try {
      const updated = await api.patch<Order>(`/api/chef/orders/${o.id}/${step}`);
      // Update instantly; DONE orders leave the queue (they're now waiting for the cashier).
      setData((list) => (list ?? []).flatMap((x) => (x.id !== o.id ? [x] : updated.status === "DONE" ? [] : [updated])));
    } catch (e) {
      setActionError((e as Error).message);
      reload();
    } finally {
      setBusy(null);
    }
  };

  const pending = data?.filter((o) => o.status === "PENDING").length ?? 0;
  const cooking = data?.filter((o) => o.status === "PREPARING").length ?? 0;

  return (
    <>
      <PageHeader
        title="Kitchen queue"
        sub={data ? `${pending} waiting, ${cooking} on the grill. Oldest first; refreshes every few seconds.` : undefined}
      />
      {error && <Notice>{error}</Notice>}
      {actionError && <Notice onClose={() => setActionError(null)}>{actionError}</Notice>}
      {!data && !error && <Loading />}
      {data && data.length === 0 && <Empty title="The rail is clear">New orders from the floor will appear here.</Empty>}
      <div className="rail">
        {data?.map((o) => {
          const age = (Date.now() - new Date(o.createdAt).getTime()) / 60000;
          return (
            <article key={o.id} className={`ticket ${o.status === "PREPARING" ? "is-cooking" : ""} ${age > 20 ? "is-late" : ""}`}>
              <header className="ticket-head">
                <div className="ticket-table">
                  <span className="ticket-table-label">Table</span>
                  <span className="ticket-table-no">{o.table?.tableNumber ?? "–"}</span>
                </div>
                <div className="ticket-meta">
                  <div>#{o.id}</div>
                  <div>{timeOnly(o.createdAt)}</div>
                  <div className="ticket-age">{minutesAgo(o.createdAt)}</div>
                </div>
              </header>
              <ul className="ticket-items">
                {o.items.map((i) => (
                  <li key={i.id}>
                    <span className="ticket-qty">{i.quantity}</span>
                    <span>{i.menuItem.name}</span>
                  </li>
                ))}
              </ul>
              <footer className="ticket-foot">
                <span className="ticket-state">{o.status === "PREPARING" ? "Cooking" : "Waiting"}</span>
                <div className="ticket-actions">
                  {o.status === "PENDING" && (
                    <button className="btn btn-outline btn-sm" disabled={busy === o.id} onClick={() => act(o, "preparing")}>
                      Start cooking
                    </button>
                  )}
                  <button className="btn btn-herb btn-sm" disabled={busy === o.id} onClick={() => act(o, "done")}>
                    Mark done
                  </button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
}

function ChefMenu() {
  const { data, error, reload } = useApi<MenuItem[]>("/api/chef/menu");
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async () => {
    if (!deleting) return;
    setActionError(null);
    try {
      const res = await api.del<{ message: string }>(`/api/chef/menu/${deleting.id}`);
      setNotice(res.message);
      setDeleting(null);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader title="Branch menu" sub="Remove dishes the kitchen can't make. Only the branch manager can add or change dishes." />
      {notice && (
        <Notice kind="success" onClose={() => setNotice(null)}>
          {notice}
        </Notice>
      )}
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
                    <td>{m.isAvailable ? "On the menu" : "Unavailable"}</td>
                    <td className="num">
                      <button className="btn btn-quiet btn-sm" onClick={() => setDeleting(m)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      {deleting && (
        <Modal title={`Remove ${deleting.name}?`} onClose={() => setDeleting(null)}>
          <p>
            Guests won't be able to order it any more. If it appears in past orders it is kept for the records and marked
            unavailable instead.
          </p>
          {actionError && <Notice>{actionError}</Notice>}
          <div className="modal-actions">
            <button className="btn btn-quiet" onClick={() => setDeleting(null)}>
              Keep it
            </button>
            <button className="btn btn-danger" onClick={remove}>
              Remove dish
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
