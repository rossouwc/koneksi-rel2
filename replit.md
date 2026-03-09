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
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/lib/theme.tsx` - Dark/light theme provider with system preference detection
- `client/src/lib/estate-context.tsx` - Multi-tenant estate context with localStorage persistence

## Data Model
- **users** - id, email, password, fullName, isSuperAdmin
- **estates** - id, name, suburb, city, province, inviteCode
- **user_estates** - junction table (userId, estateId, roleInEstate)
- **bills** - userId, estateId, title, amount (cents), dueDate, category, status
- **outages** - userId, estateId, type (electricity/water/internet/gas/other), title, description, status
- **providers** - estateId, name, category, phone, email, website, description
- **reviews** - providerId, userId, rating, comment

## Pages
- `/` - Auth page (login/register) when not authenticated, Dashboard when authenticated
- `/bills` - Bill management with add dialog
- `/outages` - Outage reporting and tracking
- `/providers` - Service providers directory with reviews
- `/admin` - Super admin portal (requires isSuperAdmin)

## PWA
- `client/public/manifest.json` - PWA manifest
- `client/public/sw.js` - Service worker for offline caching

## Design
- Glassmorphism: `.glass`, `.glass-card` CSS utilities
- Gradient: `.gradient-teal`, `.gradient-teal-subtle`, `.text-gradient`
- Font: Plus Jakarta Sans
- Colors: Teal-emerald primary (#0f766e to #10b981)
- Dark mode: Auto-detect system preference, toggle in header
