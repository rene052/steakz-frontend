import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { useApi } from "../hooks";
import { MenuBoard } from "../components/Menu";
import { Empty, Loading, Notice } from "../components/ui";
import type { Branch, BranchDetail } from "../types";

const city = (name: string) => name.replace(/^Steakz\s+/, "");

function BookCta({ branchId, className = "btn btn-brass" }: { branchId?: number; className?: string }) {
  const { user } = useAuth();
  const target = `/app/customer?tab=book${branchId ? `&branch=${branchId}` : ""}`;
  if (user && user.role !== "CUSTOMER") return null;
  return (
    <Link to={user ? target : `/login?next=${encodeURIComponent(target)}`} className={className}>
      Book a table
    </Link>
  );
}

export function HomePage() {
  const { data: branches, error } = useApi<Branch[]>("/api/public/branches");
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">
            Dry-aged beef,
            <br />
            charcoal grill,
            <br />
            seven cities.
          </h1>
          <p className="hero-lede">
            Browse any branch's menu without an account. Book a table, order from your seat, and pay when you leave.
          </p>
          <div className="hero-actions">
            <BookCta />
            <Link to="/branches" className="btn btn-ghost-light">
              See the menus
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Our steakhouses</h2>
          {error && <Notice>{error}</Notice>}
          {!branches && !error && <Loading />}
          <ul className="signboard">
            {branches?.map((b) => (
              <li key={b.id}>
                <Link to={`/branches/${b.id}`} className="sign-row">
                  <span className="sign-city">{city(b.name)}</span>
                  <span className="sign-address">{b.address}</span>
                  <span className="sign-go">Menu</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <h2 className="section-title">How a visit works</h2>
          <ol className="steps">
            <li>
              <strong>Book your table.</strong> Pick a branch, a time and a table that fits your group. You'll need a free
              account.
            </li>
            <li>
              <strong>Order at the table.</strong> Order from your phone against your booking, or tell your waiter.
            </li>
            <li>
              <strong>Follow your food.</strong> Your dashboard shows when the kitchen starts cooking and when it's on its way.
            </li>
            <li>
              <strong>Pay as you leave.</strong> We serve first, then you settle the bill at the cashier.
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}

export function BranchesPage() {
  const { data: branches, error } = useApi<Branch[]>("/api/public/branches");
  return (
    <section className="section">
      <div className="container">
        <h1 className="page-title">Locations & menus</h1>
        <p className="lede">Every Steakz serves the same signature menu, with a few local prices.</p>
        {error && <Notice>{error}</Notice>}
        {!branches && !error && <Loading />}
        <div className="branch-grid">
          {branches?.map((b) => (
            <article key={b.id} className="branch-card">
              <h2 className="branch-city">{city(b.name)}</h2>
              <p className="branch-address">{b.address}</p>
              {b.phone && <p className="branch-phone">{b.phone}</p>}
              <p className="muted small">
                {b._count?.tables ?? 0} tables, {b._count?.menuItems ?? 0} dishes
              </p>
              <div className="branch-actions">
                <Link to={`/branches/${b.id}`} className="btn btn-outline btn-sm">
                  View menu
                </Link>
                <BookCta branchId={b.id} className="btn btn-primary btn-sm" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BranchPage() {
  const { id } = useParams();
  const { data: branch, error } = useApi<BranchDetail>(`/api/public/branches/${id}`);
  if (error) {
    return (
      <section className="section">
        <div className="container">
          <Empty title="We couldn't find that branch">
            <Link to="/branches">See all locations</Link>
          </Empty>
        </div>
      </section>
    );
  }
  if (!branch) return <div className="container section"><Loading /></div>;

  const seats = branch.tables.reduce((s, t) => s + t.capacity, 0);
  return (
    <>
      <section className="branch-hero">
        <div className="container branch-hero-inner">
          <div>
            <Link to="/branches" className="back-link">
              All locations
            </Link>
            <h1 className="branch-hero-title">{city(branch.name)}</h1>
            <p className="branch-hero-meta">
              {branch.address}
              {branch.phone && <> &nbsp;|&nbsp; {branch.phone}</>}
            </p>
            <p className="branch-hero-meta">
              {branch.tables.length} tables, {seats} seats
            </p>
          </div>
          <BookCta branchId={branch.id} />
        </div>
      </section>
      <section className="section">
        <div className="container container-narrow">
          <MenuBoard items={branch.menuItems} />
        </div>
      </section>
    </>
  );
}

function AuthCard({ title, children, foot }: { title: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">{title}</h1>
        {children}
        <p className="auth-foot">{foot}</p>
      </div>
    </section>
  );
}

const DEMO = [
  ["Customer", "customer@steakz.com"],
  ["Waiter (cashier)", "waiter.london@steakz.com"],
  ["Chef", "chef.london@steakz.com"],
  ["Branch manager", "manager.london@steakz.com"],
  ["HQ manager", "hq@steakz.com"],
  ["Admin", "admin@steakz.com"],
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next && user.role === "CUSTOMER" ? next : homeFor[user.role]} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password);
      navigate(next && u.role === "CUSTOMER" ? next : homeFor[u.role], { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Log in"
      foot={
        <>
          New to Steakz? <Link to={`/register${location.search}`}>Create an account</Link> to book a table.
        </>
      }
    >
      {next && <Notice kind="info">Log in or create an account to book a table.</Notice>}
      <form onSubmit={submit} className="form">
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <Notice>{error}</Notice>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <details className="demo" open>
        <summary>Demo accounts, one per role</summary>
        <p className="muted small">
          Password <code>password123</code> (admin: <code>admin123</code>). Click one to fill the form. Every branch has the
          same roles, e.g. <code>chef.manchester@steakz.com</code>.
        </p>
        <div className="demo-list">
          {DEMO.map(([label, mail]) => (
            <button
              key={mail}
              type="button"
              className="demo-btn"
              onClick={() => {
                setEmail(mail);
                setPassword(mail.startsWith("admin") ? "admin123" : "password123");
              }}
            >
              <span>{label}</span>
              <span className="muted">{mail}</span>
            </button>
          ))}
        </div>
      </details>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // After registering, the new customer goes straight to where they were heading (usually the booking form).
  if (user) return <Navigate to={user.role === "CUSTOMER" ? next || "/app/customer?tab=book" : homeFor[user.role]} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form.name, form.email, form.password);
      navigate(next || "/app/customer?tab=book", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      foot={
        <>
          Already have an account? <Link to={`/login${location.search}`}>Log in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="form">
        <label>
          Full name
          <input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          <span className="hint">At least 6 characters.</span>
        </label>
        {error && <Notice>{error}</Notice>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

export function NotFoundPage() {
  return (
    <section className="section">
      <div className="container">
        <Empty title="This page doesn't exist">
          <Link to="/">Go to the home page</Link>
        </Empty>
      </div>
    </section>
  );
}
