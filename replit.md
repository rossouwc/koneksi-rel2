# Koneksi - Smart Estate Management PWA

## Overview
Koneksi is a mobile-first Progressive Web App for estate management. It features multi-tenant architecture, glassmorphism design with teal-emerald gradients, dark mode, and smooth Framer Motion animations.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui, Framer Motion, wouter
- **Backend**: Express.js, PostgreSQL, Drizzle ORM
- **Auth**: Session-based (express-session + scrypt hashing)
- **State**: TanStack React Query

## Architecture
- `shared/schema.ts` - Drizzle schemas and Zod validation for all entities
- `server/db.ts` - PostgreSQL connection pool
- `server/storage.ts` - Database storage layer (IStorage interface with RLS-style scoped queries)
- `server/routes.ts` - Express API routes with session auth + estate membership verification
- `server/seed.ts` - Seed data for demo (admin@koneksi.app / admin123, demo@koneksi.app / demo123)
- `client/src/lib/auth.tsx` - Auth context provider (useAuth hook)
- `client/src/lib/theme.tsx` - Dark/light theme provider with system preference detection
- `client/src/lib/estate-context.tsx` - Multi-tenant estate context with localStorage persistence
  - Exports: `useEstate`, `useCurrentEstate`, `useEstatesList`, `useJoinEstate`
- `client/src/hooks/use-user-profile.ts` - useUserProfile hook for profile data and mutations

## Multi-Tenant Architecture
- Estate selector in header with "Personal" option (no estate) + all user's estates
- `current_estate_id` persisted in localStorage, `__personal__` sentinel for personal mode
- All data queries scoped: estate-specific data only visible to estate members
- Personal data (estateId IS NULL) only visible to the owner
- Storage layer uses `getBillsScoped`, `getOutagesScoped`, `getProvidersScoped` for RLS enforcement
- Routes verify estate membership before allowing read/write operations

## Data Model
- **users** - id, email, password, fullName, phone, suburb, avatarUrl, role (user_role enum), profileComplete, isSuperAdmin
  - role enum: resident, estate_admin, super_admin, supplier
- **estates** - id, name, suburb, city, province, inviteCode (auto-generated 8-char uppercase)
- **user_estates** - junction table (userId, estateId, roleInEstate)
- **bills** - userId, estateId, title, amount (cents), dueDate, category, status
- **outages** - userId, estateId, type (electricity/water/internet/gas/other), title, description, status
- **providers** - estateId, name, category, phone, email, website, description
- **reviews** - providerId, userId, rating, comment

## Pages
- Auth page (login/register) with Google OAuth button (placeholder), password reset link, glassmorphic forms
- Profile setup page - shown after first login if profile incomplete (phone, suburb fields)
- `/` - Dashboard when authenticated
- `/bills` - Bill management with add dialog
- `/outages` - Outage reporting and tracking
- `/providers` - Service providers directory with reviews
- `/join-estate` - Join estate via invite code + view current estates + create estate (admin only)
- `/bill-analyzer` - AI-powered bill analysis: drag-drop/camera upload, hardcoded sample analysis, results cards (extracted data, overcharges, savings tips), saves to bills table
- `/alerts` - Outage alerts with Leaflet map view, list view, FAB to report, photo upload, type filtering, polling
- `/admin` - Super admin portal with DataTable views, estate detail sub-view, create/edit dialogs (requires super_admin role)

## Key UI Features
- Estate selector dropdown with "Personal" + estates + "+" button to join/manage estates
- Avatar dropdown in header with user info, role badge, theme toggle, sign out
- Profile setup flow redirects new users before dashboard access
- Password visibility toggle on auth form
- Submit animations (whileTap scale, spinning sparkles)
- Google OAuth button (visual placeholder, shows "Coming Soon" toast)
- Forgot password link (shows informational toast)

## PWA
- `client/public/manifest.json` - PWA manifest
- `client/public/sw.js` - Service worker for offline caching

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
- GET/POST /api/reviews - Reviews CRUD
- POST /api/bills/analyze - Upload bill image + get AI analysis (multipart FormData, hardcoded sample response)
- POST /api/outages/report - Report outage with photo upload (multipart FormData, multer)
- GET /api/admin/users - All users (admin only)
- GET/POST /api/admin/estates - All estates CRUD (admin only)
- GET /api/admin/estates-with-stats - All estates with resident/bill/outage/provider counts
- GET /api/admin/estates/:id - Single estate detail with stats
- PATCH /api/admin/estates/:id - Update estate (name, suburb, city, province)
- GET /api/admin/estates/:id/residents - List estate residents with roles and join dates
