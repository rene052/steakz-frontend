# Steakz frontend

React 19, Vite and React Router web app for the Steakz Restaurant Portal.

## Live deployment

| What | Link |
| --- | --- |
| Website (frontend, Vercel) | https://steakz-frontend-omega.vercel.app |
| API (backend, Render) | https://steakz-backend-hk3f.onrender.com |
| Health check | https://steakz-backend-hk3f.onrender.com/api/health |
| Backend repository | https://github.com/rene052/steakz-backend |
| Frontend repository | https://github.com/rene052/steakz-frontend |

The backend runs on Render's free plan and sleeps when unused: the first request after a while can take about 50 seconds.

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:5000 (your backend)
npm install
npm run dev              # http://localhost:5173
npm run build            # production build in dist/
```

## Screens

| Path | Who | What |
|---|---|---|
| `/`, `/branches`, `/branches/:id` | everyone | Home, locations, each branch's menu |
| `/login`, `/register` | guests | Registration always creates a customer |
| `/app/customer` | Customer | Book a table (live free-table picker), my bookings, order food, live order tracking |
| `/app/cashier` | Cashier | Floor (ready for pickup, in the kitchen, served today), new walk-in or booked order, all orders |
| `/app/chef` | Chef | Kitchen ticket rail (start cooking, mark done), branch menu (remove dishes) |
| `/app/manager` | Branch manager | Overview, orders, bookings by day, staff and salaries, sales, menu management |
| `/app/hq` | HQ manager | All branches, revenue by branch, all orders, all staff and salaries |
| `/app/admin` | Admin | Users (create, change role or branch, disable, enable, delete), branches, menus, plus the HQ reports |

The kitchen, cashier and customer screens refresh every few seconds, so status changes appear without reloading.

## Structure

```
src/api.ts            fetch wrapper (adds the JWT, handles errors)
src/auth.tsx          login state; where each role lands after login
src/main.tsx          routes + role guard
src/components/       layouts, menu board, order builder, charts, tables
src/pages/            public pages + one dashboard per role
src/styles.css        all styling (no CSS framework)
vercel.json           SPA rewrite so page refreshes work on Vercel
```

Fonts are bundled with the app (no Google Fonts request), so it looks the same without an internet connection.
