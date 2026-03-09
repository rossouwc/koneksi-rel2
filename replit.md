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
- `server/storage.ts` - Database storage layer (IStorage interface)
- `server/routes.ts` - Express API routes with session auth
- `server/seed.ts` - Seed data for demo (admin@koneksi.app / admin123, demo@koneksi.app / demo123)
- `client/src/lib/auth.tsx` - Auth context provider (useAuth hook)
- `client/src/lib/theme.tsx` - Dark/light theme provider with system preference detection
- `client/src/lib/estate-context.tsx` - Multi-tenant estate context with localStorage persistence
- `client/src/hooks/use-user-profile.ts` - useUserProfile hook for profile data and mutations

## Data Model
- **users** - id, email, password, fullName, phone, suburb, avatarUrl, role (user_role enum), profileComplete, isSuperAdmin
  - role enum: resident, estate_admin, super_admin, supplier
- **estates** - id, name, suburb, city, province, inviteCode
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
- `/admin` - Super admin portal (requires super_admin role or isSuperAdmin)

## Key UI Features
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
- GET /api/estates - User's estates
- POST /api/estates/join - Join estate by invite code
- GET/POST /api/bills - Bills CRUD
- GET/POST /api/outages - Outages CRUD
- GET/POST /api/providers - Providers CRUD
- GET/POST /api/reviews - Reviews CRUD
- GET /api/admin/users - All users (admin only)
- GET/POST /api/admin/estates - All estates (admin only)
