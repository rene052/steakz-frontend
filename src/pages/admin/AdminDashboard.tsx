import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { useApi } from "../../hooks";
import { AppShell, useTab } from "../../components/Layouts";
import { Empty, Loading, Modal, Notice, PageHeader } from "../../components/ui";
import { dateOnly, money, roleLabel } from "../../format";
import type { Branch, Role, User } from "../../types";
import { HqOrdersTab, HqOverviewTab, HqSalesTab, HqStaffTab } from "../hq/HqDashboard";
import { MenuManager } from "../manager/ManagerDashboard";

const ROLES: Role[] = ["CUSTOMER", "CASHIER", "CHEF", "BRANCH_MANAGER", "HQ_MANAGER", "ADMIN"];
const needsBranch = (r: Role) => r === "CASHIER" || r === "CHEF" || r === "BRANCH_MANAGER";

export default function AdminDashboard() {
  const tab = useTab("users");
  return (
    <AppShell
      nav={[
        { key: "users", label: "Users" },
        { key: "branches", label: "Branches" },
        { key: "menus", label: "Menus" },
        { key: "overview", label: "Chain overview" },
        { key: "sales", label: "Sales" },
        { key: "orders", label: "Orders" },
        { key: "staff", label: "Staff & salaries" },
      ]}
    >
      {tab === "users" && <UsersTab />}
      {tab === "branches" && <BranchesTab />}
      {tab === "menus" && <MenusTab />}
      {tab === "overview" && <HqOverviewTab />}
      {tab === "sales" && <HqSalesTab />}
      {tab === "orders" && <HqOrdersTab />}
      {tab === "staff" && <HqStaffTab />}
    </AppShell>
  );
}

// ---------------- Users ----------------

function UsersTab() {
  const { user: me } = useAuth();
  const [role, setRole] = useState("");
  const [branchId, setBranchId] = useState("");
  const [query, setQuery] = useState("");
  const qs = new URLSearchParams({ ...(role ? { role } : {}), ...(branchId ? { branchId } : {}) }).toString();
  const { data, error, reload } = useApi<User[]>(`/api/admin/users${qs ? `?${qs}` : ""}`);
  const branches = useApi<Branch[]>("/api/admin/branches");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [data, query]);

  const setActive = async (u: User, active: boolean) => {
    setActionError(null);
    try {
      await api.patch(`/api/admin/users/${u.id}/${active ? "enable" : "disable"}`);
      setNotice(`${u.name} ${active ? "can log in again" : "can no longer log in"}.`);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setActionError(null);
    try {
      await api.del(`/api/admin/users/${deleting.id}`);
      setNotice(`${deleting.name} deleted.`);
      setDeleting(null);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        sub={data ? `${shown.length} of ${data.length} accounts` : undefined}
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create user
          </button>
        }
      />
      <div className="toolbar">
        <input type="search" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
          <option value="">All branches</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {notice && (
        <Notice kind="success" onClose={() => setNotice(null)}>
          {notice}
        </Notice>
      )}
      {actionError && !deleting && <Notice onClose={() => setActionError(null)}>{actionError}</Notice>}
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && shown.length === 0 && <Empty title="No users match" />}
      {shown.length > 0 && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Branch</th>
                <th className="num">Salary</th>
                <th>Account</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className={u.isActive ? "" : "row-muted"}>
                    <td>
                      <strong>{u.name}</strong>
                      {self && <span className="muted small"> (you)</span>}
                      <div className="muted small">{u.email}</div>
                    </td>
                    <td>{roleLabel[u.role]}</td>
                    <td>{u.branch?.name ?? <span className="muted">Global</span>}</td>
                    <td className="num">{u.salary != null ? money(u.salary) : "–"}</td>
                    <td>{u.isActive ? "Active" : "Disabled"}</td>
                    <td className="num nowrap">
                      <button className="btn btn-quiet btn-sm" onClick={() => setEditing(u)} disabled={self}>
                        Change role
                      </button>
                      {u.isActive ? (
                        <button className="btn btn-quiet btn-sm" onClick={() => setActive(u, false)} disabled={self}>
                          Disable
                        </button>
                      ) : (
                        <button className="btn btn-quiet btn-sm" onClick={() => setActive(u, true)}>
                          Enable
                        </button>
                      )}
                      <button className="btn btn-quiet btn-sm text-danger" onClick={() => setDeleting(u)} disabled={self}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <UserForm
          branches={branches.data ?? []}
          onClose={() => setCreating(false)}
          onSaved={(u) => {
            setCreating(false);
            setNotice(`${u.name} created as ${roleLabel[u.role]}${u.branch ? ` at ${u.branch.name}` : ""}.`);
            reload();
          }}
        />
      )}
      {editing && (
        <UserForm
          user={editing}
          branches={branches.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={(u) => {
            setEditing(null);
            setNotice(`${u.name} is now ${roleLabel[u.role]}${u.branch ? ` at ${u.branch.name}` : ""}.`);
            reload();
          }}
        />
      )}
      {deleting && (
        <Modal title={`Delete ${deleting.name}?`} onClose={() => setDeleting(null)}>
          <p>
            This permanently removes {deleting.email} and their bookings. Past orders stay in the sales history. To block access
            but keep the account, use Disable instead.
          </p>
          {actionError && <Notice>{actionError}</Notice>}
          <div className="modal-actions">
            <button className="btn btn-quiet" onClick={() => setDeleting(null)}>
              Keep user
            </button>
            <button className="btn btn-danger" onClick={remove}>
              Delete user
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function UserForm({ user, branches, onClose, onSaved }: { user?: User; branches: Branch[]; onClose: () => void; onSaved: (u: User) => void }) {
  const editing = !!user;
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: (user?.role ?? "CASHIER") as Role,
    branchId: user?.branchId ? String(user.branchId) : "",
    salary: user?.salary != null ? String(user.salary) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const branchId = needsBranch(form.role) ? Number(form.branchId) || null : null;
    const salary = form.role === "CUSTOMER" || form.salary === "" ? null : Number(form.salary);
    try {
      const saved = editing
        ? await api.patch<User>(`/api/admin/users/${user!.id}/role`, { role: form.role, branchId, salary })
        : await api.post<User>("/api/admin/users", { name: form.name, email: form.email, password: form.password, role: form.role, branchId, salary });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? `Change role: ${user!.name}` : "Create user"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {!editing && (
          <>
            <label>
              Full name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label>
              Temporary password
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              <span className="hint">At least 6 characters. Share it with the person securely.</span>
            </label>
          </>
        )}
        <div className="form-row">
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          </label>
          {needsBranch(form.role) && (
            <label>
              Branch
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                <option value="">Choose a branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!needsBranch(form.role) && (
          <p className="hint">{roleLabel[form.role]} accounts aren't tied to a branch.</p>
        )}
        {form.role !== "CUSTOMER" && (
          <label>
            Annual salary
            <input type="number" min="0" step="100" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Optional" />
          </label>
        )}
        {error && <Notice>{error}</Notice>}
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {editing ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Branches ----------------

const emptyBranch = { name: "", address: "", phone: "", tableCount: "10", tableCapacity: "4" };

function BranchesTab() {
  const { data, error, reload } = useApi<(Branch & { createdAt: string })[]>("/api/admin/branches");
  const [form, setForm] = useState(emptyBranch);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const b = await api.post<Branch>("/api/admin/branches", {
        name: form.name,
        address: form.address,
        phone: form.phone || null,
        tableCount: Number(form.tableCount) || 0,
        tableCapacity: Number(form.tableCapacity) || 4,
      });
      setNotice(`${b.name} added with ${b._count?.tables ?? 0} tables. Add a menu under Menus and staff under Users.`);
      setForm(emptyBranch);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Branches" />
      {notice && (
        <Notice kind="success" onClose={() => setNotice(null)}>
          {notice}
        </Notice>
      )}
      <section className="panel">
        <h2 className="panel-title">Add a branch</h2>
        <form className="form form-grid" onSubmit={add}>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Steakz Bristol" required minLength={2} />
          </label>
          <label className="span-2">
            Address
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required minLength={5} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          </label>
          <label>
            Tables
            <input type="number" min="0" max="100" value={form.tableCount} onChange={(e) => setForm({ ...form, tableCount: e.target.value })} />
          </label>
          <label>
            Seats per table
            <input type="number" min="1" max="20" value={form.tableCapacity} onChange={(e) => setForm({ ...form, tableCapacity: e.target.value })} />
          </label>
          <div className="form-end">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Adding…" : "Add branch"}
            </button>
          </div>
        </form>
        {formError && <Notice onClose={() => setFormError(null)}>{formError}</Notice>}
      </section>
      {error && <Notice>{error}</Notice>}
      {!data && !error && <Loading />}
      {data && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Address</th>
                <th className="num">Staff</th>
                <th className="num">Tables</th>
                <th className="num">Dishes</th>
                <th className="num">Orders</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.name}</strong>
                    {b.phone && <div className="muted small">{b.phone}</div>}
                  </td>
                  <td className="muted">{b.address}</td>
                  <td className="num">{b._count?.users}</td>
                  <td className="num">{b._count?.tables}</td>
                  <td className="num">{b._count?.menuItems}</td>
                  <td className="num">{b._count?.orders?.toLocaleString("en-GB")}</td>
                  <td className="nowrap">{dateOnly(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MenusTab() {
  const { data } = useApi<Branch[]>("/api/admin/branches");
  const [branchId, setBranchId] = useState("");
  const id = Number(branchId) || data?.[0]?.id;
  return (
    <>
      <PageHeader
        title="Menus"
        sub="Add or edit dishes at any branch."
        actions={
          <select value={id ?? ""} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
            {data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        }
      />
      {id ? <MenuManager key={id} branchId={id} sendBranchId /> : <Loading />}
    </>
  );
}
