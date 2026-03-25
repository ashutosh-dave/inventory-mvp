# Inventory ERP

A full-stack inventory management and enterprise resource planning system built with Next.js 16, Prisma 7, and PostgreSQL. The application provides warehouse operations, stock tracking with double-entry ledger accounting, batch management, role-based access control, and low-stock alerting.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [Features](#features)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [RBAC Permission Matrix](#rbac-permission-matrix)
- [API Reference](#api-reference)
- [Navigation Structure](#navigation-structure)
- [Build Process & Design Decisions](#build-process--design-decisions)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui + Radix UI | latest |
| Icons | Lucide React | 1.6.x |
| ORM | Prisma | 7.5.0 |
| Database | PostgreSQL | 14+ |
| DB Driver | @prisma/adapter-pg (pg) | 7.5.0 |
| Authentication | NextAuth.js v5 (beta) | 5.0.0-beta.30 |
| Validation | Zod | 4.x |
| Password Hashing | bcryptjs | 3.x |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│          React 19 · Tailwind v4 · shadcn/ui             │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Next.js 16 App Router                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Pages (SSR)  │  │  API Routes  │  │  Middleware    │  │
│  │  & Client     │  │  /api/*      │  │  (auth guard) │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                 │                               │
│  ┌──────▼─────────────────▼──────┐                       │
│  │       Service Layer           │                       │
│  │  auth · rbac · inventory      │                       │
│  │  audit · validators           │                       │
│  └──────────────┬────────────────┘                       │
│                 │                                         │
│  ┌──────────────▼────────────────┐                       │
│  │  Prisma 7 ORM (PrismaPg)     │                       │
│  └──────────────┬────────────────┘                       │
└─────────────────┼───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│               PostgreSQL Database                        │
│  Users · Products · Batches · Balances · Ledger · Alerts │
└─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 14+ running locally or remotely
- **npm** 10+

### Installation

```bash
git clone <repository-url>
cd inventory-erp
npm install
```

### Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="your-random-secret-string-at-least-32-chars"
```

### Run Database Migrations

```bash
npx prisma migrate deploy
```

### Seed the Database

```bash
npx prisma db seed
```

This creates default users, a warehouse, locations, units, a sample product, and a team. See [Default Credentials](#default-credentials).

### Start Development Server

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

> Both `dev` and `build` scripts automatically run `npx prisma generate` as a pre-step to ensure the Prisma client is up to date.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Used by Prisma for migrations, the seed script, and the app runtime. |
| `AUTH_SECRET` | Yes | A random string (32+ characters) used by NextAuth v5 to sign/encrypt JWTs and cookies. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Production | The canonical URL of your deployed app (e.g. `https://erp.example.com`). Required in production for NextAuth callback URLs. |

---

## Database Setup

The Prisma schema lives at `prisma/schema.prisma`. The generated client is output to `src/generated/prisma/` (custom output path configured in the generator block).

Configuration is defined in `prisma.config.ts`:

```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

The Prisma client uses the **`@prisma/adapter-pg`** driver adapter with a singleton pattern that caches the client on `globalThis` during development to prevent connection exhaustion from hot reloads.

---

## Default Credentials

The seed script (`prisma/seed.ts`) creates three users with the shared password below.

| Email | Password | Role | Department |
|-------|----------|------|------------|
| `admin@erp.local` | `Password123!` | ADMIN | Operations |
| `manager@erp.local` | `Password123!` | WAREHOUSE_MANAGER | Warehouse |
| `user@erp.local` | `Password123!` | WAREHOUSE_USER | Warehouse |

All passwords are hashed with **bcryptjs** (10 salt rounds) before storage. The plaintext password is never stored in the database.

### Seeded Reference Data

| Entity | Details |
|--------|---------|
| Departments | Operations, Warehouse |
| Team | "Core Warehouse Team" (Warehouse dept, `user@erp.local` as member) |
| Warehouse | `WH-MAIN` — Main Warehouse |
| Locations | `MAIN` (Main Store), `DMG` (Damaged Goods), `TRANSIT` (On Transit) |
| Units | `PCS` (Pieces), `CRT` (Crate) |
| Category | Beverages |
| Product | `SKU-COLA-001` "Cola Drink" — reorder point 24, CRT→PCS conversion multiplier 24 |

---

## Project Structure

```
inventory-erp/
├── prisma/
│   ├── schema.prisma          # Database schema (models, enums, relations)
│   ├── seed.ts                # Seed script (users, warehouse, products)
│   └── migrations/            # SQL migration files
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (auth-aware shell with sidebar)
│   │   ├── page.tsx           # Landing page (guest) / Dashboard (signed-in)
│   │   ├── login/             # Login form
│   │   ├── unauthorized/      # Access denied page
│   │   ├── movements/         # Stock In / Out / Transfer / Adjustment
│   │   ├── stock-counting/    # Quick Stock Out (sale flow)
│   │   ├── low-stock/         # Low stock alerts management
│   │   ├── inventory-search/  # Inventory search & filtering
│   │   ├── products/          # Product CRUD
│   │   ├── categories/        # Category CRUD (soft delete)
│   │   ├── warehouses/        # Warehouse & location management
│   │   ├── teams/             # Department & team management
│   │   ├── audit-log/         # Movement audit trail with ledger entries
│   │   └── api/
│   │       ├── auth/[...nextauth]/  # NextAuth route handlers
│   │       ├── categories/          # Category CRUD endpoints
│   │       ├── products/            # Product CRUD endpoints
│   │       ├── warehouses/          # Warehouse CRUD endpoints
│   │       ├── locations/           # Location CRUD endpoints
│   │       ├── departments/         # Department CRUD endpoints
│   │       ├── teams/               # Team CRUD endpoints
│   │       ├── team-members/        # Team membership endpoints
│   │       ├── inventory/
│   │       │   ├── movements/       # Stock movement recording & history
│   │       │   ├── search/          # Inventory balance search
│   │       │   └── valuation/       # Total inventory valuation
│   │       └── low-stock-alerts/    # Alert listing & status updates
│   ├── components/
│   │   ├── app-shell/
│   │   │   └── nav-links.tsx  # Desktop sidebar & mobile bottom nav
│   │   ├── auth/
│   │   │   └── sign-out-button.tsx
│   │   └── ui/                # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── generated/
│   │   └── prisma/            # Generated Prisma client (custom output)
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration (Credentials provider)
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── rbac.ts            # Role-based access control (permissions)
│   │   ├── api-auth.ts        # API auth helpers (requireUser, requirePermission)
│   │   ├── api-response.ts    # Standardized API response helpers
│   │   ├── audit.ts           # Audit logging utility
│   │   ├── validators.ts      # Zod schemas for request validation
│   │   ├── utils.ts           # cn() utility (clsx + tailwind-merge)
│   │   └── inventory/
│   │       ├── service.ts     # Core inventory movement service
│   │       └── conversion.ts  # Unit conversion logic
│   └── types/
│       └── next-auth.d.ts     # Session/JWT type augmentation
├── prisma.config.ts           # Prisma 7 config (schema, migrations, seed)
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript config (strict, @/* path alias)
├── components.json            # shadcn/ui configuration
├── postcss.config.mjs         # Tailwind v4 PostCSS plugin
├── eslint.config.mjs          # ESLint (Next.js + TypeScript)
└── package.json
```

---

## Features

### 1. Dashboard (Home Page)

When signed in, the root page displays a dashboard with:
- **Total inventory valuation** (sum of all on-hand quantities multiplied by unit costs)
- **Open low-stock alert count** with link to the alerts page
- **Active lot (batch) count**
- **Quick action cards** linking to key workflows

When not signed in, a marketing landing page is shown.

### 2. Inventory Movements

The movements page provides four tabbed workflows:

- **Stock In** — Record incoming inventory (purchases, returns). Creates a batch, updates balances, and writes immutable ledger entries.
- **Stock Out** — Record outgoing inventory (sales, internal use). Decrements from specific batches.
- **Transfer** — Move stock between locations within or across warehouses. Creates paired debit/credit ledger entries.
- **Adjustment** — Correct inventory discrepancies with reason codes (cycle count correction, damage, theft/loss, expiry, QA rejection, system/manual correction).

All movements:
- Look up products by SKU
- Record the performing user
- Support an optional idempotency key to prevent duplicates
- Generate `StockTransaction` + `StockLedgerEntry` records (double-entry style)
- Automatically trigger low-stock alerts when quantities drop below reorder points

### 3. Quick Stock Out

A streamlined flow for point-of-sale or rapid stock-out operations. Posts a `STOCK_OUT` movement with `SALE` source type.

### 4. Low Stock Alerts

Displays all `OPEN` alerts when inventory drops below a product's reorder point. Supports:
- **Acknowledge** — Mark an alert as seen (records who acknowledged and when)
- **Resolve** — Close the alert after restocking

### 5. Inventory Search

Filter and search inventory balances by product, warehouse, location, and batch. Queries the `/api/inventory/search` endpoint.

### 6. Products (CRUD)

Full product management with:
- SKU (unique identifier)
- Category assignment
- Base unit, preferred purchase unit, preferred sales unit
- Unit conversions with configurable multipliers
- Reorder point threshold
- Soft delete support

### 7. Categories (CRUD)

Product category management with soft delete. Categories with `deletedAt` set are hidden from active listings but retained for historical reference. A unique constraint on `(name, deletedAt)` allows reusing category names after deletion.

### 8. Warehouses & Locations

Hierarchical warehouse management:
- **Warehouses** have a unique code (e.g. `WH-MAIN`) and contain locations
- **Locations** are typed: `MAIN_STORE`, `DAMAGED_GOODS`, `ON_TRANSIT`, `RECEIVING`, `PICKING`, `QUARANTINE`

### 9. Teams & Departments

Organizational structure management:
- **Departments** group users and teams
- **Teams** belong to a department and have members
- **Team Members** link users to teams with a join date
- Access is restricted by RBAC — only users with `team:manage` permission can modify teams

### 10. Audit Log

A comprehensive movement history page showing:
- All stock transactions with filters (movement type, warehouse, product, date range)
- Expandable rows revealing individual ledger entries (opening qty, change, closing qty, unit cost)

### 11. Generic Audit Logging

The `AuditLog` model captures entity-level changes (create, update, delete) with before/after JSON snapshots, the performing user, IP address, and user agent.

---

## Database Schema

### Entity Relationship Summary

```
User ─────────────── Department
 │                      │
 ├── TeamMember ──── Team
 ├── StockTransaction ──── StockLedgerEntry
 ├── AuditLog               │
 └── LowStockAlert          ├── Product ──── ProductCategory
                             │     │
                             │     ├── Batch
                             │     ├── ProductUnitConversion ──── Unit
                             │     └── InventoryBalance
                             │
                             ├── Warehouse
                             └── InventoryLocation
```

### Key Models

| Model | Purpose |
|-------|---------|
| **User** | Authenticated users with email, password hash, role, and department |
| **Department** / **Team** / **TeamMember** | Organizational hierarchy |
| **ProductCategory** | Product groupings with soft delete |
| **Product** | SKU-identified items with units, conversions, and reorder thresholds |
| **Unit** / **ProductUnitConversion** | Measurement units and conversion multipliers (e.g. 1 Crate = 24 Pieces) |
| **Warehouse** / **InventoryLocation** | Physical storage hierarchy with typed locations |
| **Batch** | Lot tracking per product with cost, expiry, and supplier reference |
| **InventoryBalance** | Current on-hand and reserved quantities per batch+location, with optimistic concurrency (`version`) |
| **StockTransaction** | Header for each inventory movement (type, source, performer) |
| **StockLedgerEntry** | Immutable line items recording qty changes, opening/closing balances, and cost snapshots |
| **LowStockAlert** | Triggered alerts with acknowledge/resolve workflow |
| **AuditLog** | Generic entity change tracking with JSON diffs |

### Enums

| Enum | Values |
|------|--------|
| **Role** | `ADMIN`, `PROCUREMENT_MANAGER`, `WAREHOUSE_MANAGER`, `WAREHOUSE_USER`, `AUDITOR` |
| **LocationType** | `MAIN_STORE`, `DAMAGED_GOODS`, `ON_TRANSIT`, `RECEIVING`, `PICKING`, `QUARANTINE` |
| **MovementType** | `STOCK_IN`, `STOCK_OUT`, `TRANSFER`, `ADJUSTMENT` |
| **MovementSourceType** | `PURCHASE`, `SALE`, `INTERNAL_USE`, `TRANSFER`, `ADJUSTMENT`, `STOCK_COUNT`, `RETURN` |
| **AdjustmentReason** | `CYCLE_COUNT_CORRECTION`, `DAMAGE`, `THEFT_OR_LOSS`, `EXPIRED`, `QA_REJECTION`, `SYSTEM_CORRECTION`, `MANUAL_CORRECTION` |
| **AlertStatus** | `OPEN`, `ACKNOWLEDGED`, `RESOLVED` |

---

## Authentication & Authorization

### Authentication Flow

1. **Login** — User submits email and password at `/login`
2. **Credential Validation** — NextAuth's Credentials provider validates against the database:
   - Email is lowercased and looked up via Prisma
   - Account must be active (`isActive: true`)
   - Password is verified with `bcrypt.compare`
3. **JWT Session** — On success, a JWT is issued containing `id`, `role`, and `departmentId`
4. **Middleware Protection** — `src/middleware.ts` intercepts all protected routes:
   - API routes (`/api/*` except `/api/auth/*`) return `401 JSON` if unauthenticated
   - App pages redirect to `/login` if unauthenticated

### Session Shape

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;         // Role enum value
    departmentId: string | null;
  };
}
```

---

## RBAC Permission Matrix

Permissions are defined in `src/lib/rbac.ts` and enforced via `requirePermission()` in API routes.

| Permission | ADMIN | PROCUREMENT_MANAGER | WAREHOUSE_MANAGER | WAREHOUSE_USER | AUDITOR |
|-----------|:-----:|:-------------------:|:-----------------:|:--------------:|:-------:|
| `inventory:write` | Yes | - | Yes | Yes | - |
| `category:delete` | Yes | - | - | - | - |
| `procurement:view` | Yes | Yes | - | - | - |
| `team:manage` | Yes | - | - | - | - |
| `warehouse:manage` | Yes | - | Yes | - | - |

**Department scoping**: Non-admin users can only access data within their own department. Admins bypass this restriction.

---

## API Reference

All API routes are under `/api/`. Authentication is required for all endpoints (enforced by middleware). Responses follow a consistent JSON structure.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/auth/*` | NextAuth handler (login, session, CSRF) |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all active categories |
| POST | `/api/categories` | Create a category |
| GET | `/api/categories/:id` | Get a single category |
| PUT | `/api/categories/:id` | Update a category |
| DELETE | `/api/categories/:id` | Soft-delete a category |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (optional `?sku=` lookup) |
| POST | `/api/products` | Create a product |
| GET | `/api/products/:id` | Get a single product with relations |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Soft-delete a product |

### Warehouses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouses` | List all warehouses |
| POST | `/api/warehouses` | Create a warehouse |
| GET | `/api/warehouses/:id` | Get warehouse with locations |
| PUT | `/api/warehouses/:id` | Update a warehouse |
| DELETE | `/api/warehouses/:id` | Delete a warehouse |

### Locations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations` | List locations (filterable by warehouse) |
| POST | `/api/locations` | Create a location |
| GET | `/api/locations/:id` | Get a single location |
| PUT | `/api/locations/:id` | Update a location |
| DELETE | `/api/locations/:id` | Delete a location |

### Departments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List all departments |
| POST | `/api/departments` | Create a department |
| GET | `/api/departments/:id` | Get a department |
| PUT | `/api/departments/:id` | Update a department |
| DELETE | `/api/departments/:id` | Delete a department |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List teams |
| POST | `/api/teams` | Create a team |
| GET | `/api/teams/:id` | Get a team with members |
| PUT | `/api/teams/:id` | Update a team |
| DELETE | `/api/teams/:id` | Delete a team |

### Team Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/team-members` | List team members |
| POST | `/api/team-members` | Add a member to a team |
| PUT | `/api/team-members/:id` | Update a membership |
| DELETE | `/api/team-members/:id` | Remove a member |

### Inventory — Movements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/movements` | List movements (query: `take`, `skip`, `type`, `warehouseId`, `productId`) |
| POST | `/api/inventory/movements` | Record a stock movement (Stock In/Out/Transfer/Adjustment) |

### Inventory — Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/search` | Search inventory balances with filters |

### Inventory — Valuation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/valuation` | Get total inventory valuation |

### Low Stock Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/low-stock-alerts` | List alerts (filterable by `status`) |
| GET | `/api/low-stock-alerts/:id` | Get a single alert |
| POST | `/api/low-stock-alerts/:id` | Update alert status (`action`: `ACKNOWLEDGE` or `RESOLVE`) |

---

## Navigation Structure

### Desktop Sidebar

| Section | Links |
|---------|-------|
| **Operations** | Dashboard, Movements, Quick Stock Out, Low Stock |
| **Master Data** | Products, Categories, Warehouses, Teams |
| **Reports** | Search, Audit Log |

### Mobile Bottom Nav

Home, Move, Products, Search, Audit

---

## Build Process & Design Decisions

This section documents the architectural choices and the step-by-step process of building the Inventory ERP system.

### Phase 1: Project Scaffolding

1. **Initialized** with `create-next-app` using Next.js 16, TypeScript, Tailwind CSS v4, and the App Router
2. **Configured shadcn/ui** as the component library with Radix UI primitives for accessible, composable UI elements
3. **Set up Prisma 7** with the PostgreSQL provider and the `@prisma/adapter-pg` driver adapter, outputting the generated client to `src/generated/prisma/` to keep it within the source tree
4. **Configured path aliases** (`@/*` → `./src/*`) in `tsconfig.json` for clean imports

### Phase 2: Database Design

The schema was designed around these core principles:

- **Double-entry ledger accounting** — Every stock movement creates immutable `StockLedgerEntry` records that capture opening quantity, change, and closing quantity. This provides a complete, auditable trail and enables balance reconstruction from the ledger alone.
- **Batch/lot tracking** — Every unit of inventory belongs to a `Batch` with cost, expiry, and supplier reference. This supports FIFO costing, expiry management, and traceability.
- **Optimistic concurrency** — `InventoryBalance` includes a `version` field to prevent lost updates during concurrent stock operations.
- **Soft deletes** — Products and categories use `deletedAt` timestamps instead of hard deletes, preserving historical data integrity while hiding inactive records from operational views.
- **Flexible units** — The `Unit` / `ProductUnitConversion` system allows products to be received in one unit (e.g. crates) and sold in another (e.g. pieces) with configurable multipliers.

### Phase 3: Authentication & Security

1. **NextAuth v5** was chosen for its App Router compatibility and JWT session strategy (no database session table needed)
2. **Credentials provider** authenticates against the local `User` table with bcrypt password verification
3. **JWT callbacks** inject `role` and `departmentId` into the token, making them available in every session without additional database queries
4. **Middleware** provides a single enforcement point for all route protection — API routes get JSON 401s, pages get redirects to `/login`
5. **RBAC** is implemented as a simple permission map in `src/lib/rbac.ts` — roles map to permission strings, and `requirePermission()` throws before any handler logic runs

### Phase 4: Core Inventory Engine

The inventory service (`src/lib/inventory/service.ts`) handles all movement types:

1. **Stock In**: Creates or finds a batch → upserts inventory balance → writes ledger entry → checks reorder point → creates low-stock alert if needed
2. **Stock Out**: Validates sufficient quantity → decrements balance → writes ledger entry with negative change → triggers alert check
3. **Transfer**: Paired operation — decrements source location and increments destination — both within a single transaction for atomicity
4. **Adjustment**: Similar to Stock In/Out but with explicit reason codes for audit compliance

Unit conversions (`src/lib/inventory/conversion.ts`) handle the math when movement quantities are in a different unit than the product's base unit.

### Phase 5: CRUD & Master Data

Standard CRUD API routes were built for all master data entities (categories, products, warehouses, locations, departments, teams, team members). Each follows the pattern:

- `GET` for listing with optional filters
- `POST` for creation with Zod validation
- `GET /:id` for single record retrieval
- `PUT /:id` for updates
- `DELETE /:id` for deletion (soft or hard depending on the entity)

### Phase 6: UI & UX

1. **App shell** — Authenticated users see a responsive layout with a desktop sidebar and mobile bottom navigation bar
2. **Landing page** — Unauthenticated visitors see a marketing page; authenticated users see the dashboard
3. **Form patterns** — All forms use controlled React state with client-side validation before API submission
4. **Feedback** — API errors are displayed inline; loading states prevent double submissions
5. **Responsive design** — Tailwind responsive utilities ensure usability across mobile, tablet, and desktop

### Phase 7: Audit & Alerting

1. **Audit log** — The `AuditLog` model and utility capture who changed what and when, with JSON diffs of before/after states
2. **Low-stock alerts** — Automatically generated during stock movements when on-hand quantity drops below a product's `reorderPoint`; managed through an acknowledge → resolve workflow
3. **Movement history** — The audit log page provides filterable, paginated access to all stock transactions with expandable ledger detail

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **JWT sessions over database sessions** | Eliminates a database round-trip on every request; role/department are embedded in the token |
| **Prisma driver adapter (pg)** | Direct PostgreSQL wire protocol for better performance than Prisma's default query engine |
| **Custom Prisma output path** | Generated client lives in `src/generated/prisma/` so it's versioned and the `@/*` alias works seamlessly |
| **Immutable ledger entries** | Stock ledger entries are never updated or deleted — corrections are new adjustment entries, ensuring a tamper-proof audit trail |
| **Soft deletes for products/categories** | Historical transactions reference these records; hard deletes would break referential integrity |
| **Singleton Prisma client** | Cached on `globalThis` during development to prevent connection pool exhaustion from Next.js hot module replacement |
| **Zod v4 for validation** | Schema-first validation with TypeScript inference for both API request bodies and form inputs |

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Dev | `npm run dev` | Start development server (auto-generates Prisma client) |
| Build | `npm run build` | Production build (auto-generates Prisma client) |
| Start | `npm start` | Start production server |
| Lint | `npm run lint` | Run ESLint |
| Seed | `npx prisma db seed` | Seed the database with default data |
| Migrate | `npx prisma migrate deploy` | Apply pending migrations |
| Generate | `npx prisma generate --schema prisma/schema.prisma` | Regenerate Prisma client |

---

## License

Private — not licensed for redistribution.
