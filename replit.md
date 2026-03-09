# Koneksi - Smart Estate Management PWA

## Overview
Koneksi is a mobile-first Progressive Web App for estate management. It features multi-tenant architecture, glassmorphism design with teal-emerald gradients, dark mode, and smooth Framer Motion animations.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui, Framer Motion, wouter
- **Backend**: Express.js, PostgreSQL, Drizzle ORM
- **AI**: OpenAI GPT-4o Vision via Replit AI Integrations (bill analysis)
- **Payments**: PayFast recurring subscriptions (MD5 signature verification, ITN webhook)
- **Auth**: Session-based (express-session + scrypt hashing)
- **State**: TanStack React Query

## Architecture
- `shared/schema.ts` - Drizzle schemas, Zod validation, and shared constants (SERVICE_OPTIONS) for all entities
- `server/db.ts` - PostgreSQL connection pool
- `server/storage.ts` - Database storage layer (IStorage interface with RLS-style scoped queries)
- `server/routes.ts` - Express API routes with session auth + estate membership verification
- `server/openai-bill-analyzer.ts` - GPT-4o Vision bill analysis (base64 image → structured JSON)
- `server/payfast.ts` - PayFast URL builder + ITN signature verification + webhook validation
- `server/seed.ts` - Seed data for demo (admin@koneksi.app / admin123, demo@koneksi.app / demo123, supplier@koneksi.app / supplier123)
- `client/src/pages/pending-approval.tsx` - Pending supplier approval page (shown when supplier.approvalStatus='pending')
- `client/src/lib/auth.tsx` - Auth context provider (useAuth hook, supports resident/estate/supplier registration)
- `client/src/lib/theme.tsx` - Dark/light theme provider with system preference detection
- `client/src/lib/estate-context.tsx` - Multi-tenant estate context with localStorage persistence
  - Exports: `useEstate`, `useCurrentEstate`, `useEstatesList`, `useJoinEstate`
  - Context exposes: `approvedEstates`, `pendingEstates`, `currentEstateRole`, `isEstateAdmin`
  - Dashboard shows "Pending Residents" section for estate admins with approve/reject buttons
- `client/src/hooks/use-user-profile.ts` - useUserProfile hook for profile data and mutations
- `client/src/hooks/use-bill-analysis.ts` - useBillAnalysis hook (file upload → OpenAI analysis → save)
- `client/src/hooks/use-subscription.ts` - useSubscription hook (tier subscribe/upgrade → PayFast redirect)
- `client/src/hooks/use-supplier-profile.ts` - useSupplierProfile hook (GET/PATCH /api/supplier/profile, profile card + edit)
- `client/src/components/supplier-layout.tsx` - Isolated supplier layout with bottom tabs (Overview, Profile, Calendar, Bookings, Analytics, Billing), avatar dropdown, deeper teal gradient accent
- `client/src/pages/supplier-billing.tsx` - Billing page fetches tiers from /api/supplier/dashboard (monthlyPrice in cents, display as R{price/100})

## Multi-Tenant Architecture
- Estate selector in header with "Personal" option (no estate) + all user's estates
- `current_estate_id` persisted in localStorage, `__personal__` sentinel for personal mode
- All data queries scoped: estate-specific data only visible to estate members
- Personal data (estateId IS NULL) only visible to the owner
- Storage layer uses `getBillsScoped`, `getOutagesScoped`, `getProvidersScoped` for RLS enforcement
- Routes verify estate membership before allowing read/write operations

## Data Model
- **users** - id, email, password, fullName, phone, suburb, avatarUrl, role (user_role enum), profileComplete, isSuperAdmin, businessName, businessWebsite, services (text[]), approvalStatus
  - role enum: resident, estate_admin, super_admin, supplier
  - approvalStatus: null (default for residents), "pending" (supplier awaiting review), "approved", "rejected"
- **estates** - id, name, streetName, suburb, city, province, inviteCode (auto-generated 8-char uppercase), approvalStatus (pending/approved/rejected, default pending)
- **user_estates** - junction table (userId, estateId, roleInEstate, approvalStatus)
  - approvalStatus: "approved" (default for estate_admin creators), "pending" (default for residents joining via invite code)
  - Estate admins must approve pending residents before they can access estate data
  - `verifyEstateMembership` checks both link existence AND approvalStatus === "approved"
- **bills** - userId, estateId, title, amount (cents), dueDate, category, status
- **outages** - userId, estateId, type (electricity/water/internet/gas/other), title, description, status
- **providers** - estateId, createdBy, name, category, phone, whatsapp, email, website, description
- **reviews** - providerId, userId, rating, comment
- **subscriptionTiers** - id, name, monthlyPrice (cents), maxEstates, scopeType (estate/city/province/national), description, sortOrder
- **providerSubscriptions** - id, providerId, tierId, status (active/paused/canceled/free), selectedCity, selectedProvince, payfastToken, startedAt, nextBillingDate
- **providerVisibleEstates** - id, providerId, estateId (junction for Free/Local tier estate visibility)

## Pages
- Auth page (login/register) with Google OAuth button (placeholder), password reset link, glassmorphic forms
- Profile setup page - shown after first login if profile incomplete (phone, suburb fields)
- `/` - Dashboard when authenticated
- `/bills` - Bill management with add dialog
- `/outages` - Outage reporting and tracking
- `/providers` - Service providers directory: searchable + filterable (category, rating), provider detail view with reviews + reviewer names, review submission with star ratings, phone/WhatsApp/email/website contact buttons
- `/join-estate` - Join estate via invite code + view current estates + create estate (admin only)
- `/bill-analyzer` - AI-powered bill analysis: drag-drop/camera upload, hardcoded sample analysis, results cards (extracted data, overcharges, savings tips), saves to bills table
- `/alerts` - Outage alerts with Leaflet map view, list view, FAB to report, photo upload, type filtering, polling
- `/marketplace` - Product marketplace: responsive grid of estate/home products (water tanks, solar gear, security, etc.), category chips, search, product cards with images/pricing/badges, "View Deal" affiliate buttons
- `/supplier` - Supplier portal overview: business listings dashboard, create listing dialog, tier pricing preview, upgrade flow with PayFast payment, confetti on upgrade
- `/supplier/profile` - Standalone supplier profile editor (business name, services, website, phone)
- `/supplier/calendar` - Calendar & availability management
- `/supplier/bookings` - Bookings & inquiries tracker (pending/confirmed/completed stats)
- `/supplier/analytics` - Analytics dashboard (profile views, clicks, inquiries, charts)
- `/supplier/billing` - Subscription & billing: current plan display, 5-tier pricing cards, upgrade/downgrade buttons
- `/admin` - Super admin portal with DataTable views, estate detail sub-view, create/edit dialogs, supplier approvals tab (requires super_admin role)

## Key UI Features
- Estate selector dropdown with "Personal" + estates + "+" button to join/manage estates
- Avatar dropdown in header with user info, role badge, theme toggle, sign out
- Profile setup flow redirects new users before dashboard access
- Password visibility toggle on auth form
- Submit animations (whileTap scale, spinning sparkles)
- Registration type selector: Resident / Estate / Supplier (3-button toggle)
  - Resident: standard signup with Google option
  - Estate: creates user (estate_admin) + estate + membership in one atomic transaction; fields: admin name, estate name, suburb, city, province
  - Supplier: creates user with approvalStatus=pending, shows pending-approval page; fields: business name, website, services (multi-select chips), phone, contact email
- Google OAuth button only visible for login and resident registration (hidden for estate/supplier)
- Google OAuth button (visual placeholder, shows "Coming Soon" toast)
- Forgot password link (shows informational toast)
- Savings Tracker: animated counter, Recharts area chart (6-month contiguous series), expandable bill history (capped at 20), personal/estate toggle, canvas-confetti on savings detected

## PWA
- `client/public/manifest.json` - PWA manifest with app shortcuts, categories, maskable icons
- `client/public/sw.js` - Service worker (koneksi-v3): static + API caching (bills, providers, outages, estates), offline fallback with X-Koneksi-Cached header, navigation cache, upload file cache
- `client/src/components/offline-banner.tsx` - Amber offline banner with retry button, auto-hides on reconnect
- `client/index.html` - Apple mobile web app meta tags, Open Graph tags, dark theme-color support

## Design
- Glassmorphism: `.glass`, `.glass-card` CSS utilities
- Gradient: `.gradient-teal`, `.gradient-teal-subtle`, `.text-gradient`
- Font: Plus Jakarta Sans
- Colors: Teal-emerald primary (#0f766e to #10b981)
- Dark mode: Auto-detect system preference, toggle in header and avatar dropdown

## API Routes
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login
- POST /api/auth/logout - Logout
- GET /api/auth/me - Current user
- PATCH /api/auth/profile - Update profile (fullName, phone, suburb)
- GET /api/estates - User's estates (scoped to membership)
- POST /api/estates/join - Join estate by invite code
- GET/POST /api/bills - Bills CRUD (RLS: scoped to user's estates or personal)
- GET/POST /api/outages - Outages CRUD (RLS: scoped to user's estates or personal)
- GET/POST /api/providers - Providers CRUD (RLS: scoped to user's estates)
- GET /api/providers/:id - Provider detail with reviews + reviewer names
- GET/POST /api/reviews - Reviews CRUD (scoped to user's accessible providers)
- POST /api/bills/analyze - Upload bill image + get AI analysis (multipart FormData, hardcoded sample response)
- POST /api/outages/report - Report outage with photo upload (multipart FormData, multer)
- GET /api/supplier/dashboard - Supplier's providers with subscription/tier info, reviews, analytics (supplier role only)
- GET /api/supplier/tiers - All subscription tiers (authenticated)
- GET /api/supplier/estates - All estates for estate picker (supplier role only)
- GET /api/supplier/cities - Distinct cities from estates (supplier role only)
- GET /api/supplier/provinces - Distinct provinces from estates (supplier role only)
- POST /api/supplier/provider - Create provider linked to supplier user (supplier role only)
- POST /api/supplier/subscribe - Subscribe/upgrade provider to a tier (supplier role only)
- POST /api/payfast-webhook - PayFast ITN handler for subscription activation/cancellation
- GET /api/admin/users - All users (admin only)
- GET/POST /api/admin/estates - All estates CRUD (admin only)
- GET /api/admin/estates-with-stats - All estates with resident/bill/outage/provider counts
- GET /api/admin/estates/:id - Single estate detail with stats
- PATCH /api/admin/estates/:id - Update estate (name, streetName, suburb, city, province)
- GET /api/admin/pending-estates - All estates with approvalStatus=pending (admin only)
- PATCH /api/admin/estates/:id/approve - Approve pending estate (admin only)
- PATCH /api/admin/estates/:id/reject - Reject pending estate (admin only)
- GET /api/admin/estates/:id/residents - List estate residents with roles and join dates
