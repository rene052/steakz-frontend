import { itemsSummary, StatusBadge } from "./ui";
import { dateTime, money } from "../format";
import type { Order } from "../types";

export function OrdersTable({ orders, showBranch }: { orders: Order[]; showBranch?: boolean }) {
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Placed</th>
            {showBranch && <th>Branch</th>}
            <th>Table</th>
            <th>Guest</th>
            <th>Items</th>
            <th className="num">Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td className="nowrap">{dateTime(o.createdAt)}</td>
              {showBranch && <td className="nowrap">{o.branch.name.replace("Steakz ", "")}</td>}
              <td>{o.table?.tableNumber ?? "–"}</td>
              <td>{o.customer?.name ?? <span className="muted">Walk-in</span>}</td>
              <td className="cell-wrap">{itemsSummary(o)}</td>
              <td className="num">{money(o.total)}</td>
              <td>
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
