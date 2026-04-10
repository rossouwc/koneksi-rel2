import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { usePortal } from "@/lib/portal-context";
import {
  LayoutDashboard,
  UserCircle,
  BarChart3,
  CreditCard,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Briefcase,
  Building2,
  ArrowRightLeft,
  ShoppingBag,
} from "lucide-react";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";

const supplierNavItems = [
  { path: "/supplier", label: "Overview", icon: LayoutDashboard },
  { path: "/supplier/profile", label: "Profile", icon: UserCircle },
  { path: "/supplier/marketplace", label: "Marketplace", icon: ShoppingBag },
  { path: "/supplier/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/supplier/billing", label: "Subscription", icon: CreditCard },
];

function SupplierAvatarDropdown() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isDualRole, switchToEstate } = usePortal();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "S";
  const logoUrl = (user as any)?.avatarUrl as string | null | undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="button-supplier-avatar"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:opacity-90 transition-opacity"
      >
        <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${logoUrl ? "bg-white dark:bg-zinc-800 ring-1 ring-border" : "bg-gradient-to-br from-teal-600 to-emerald-700"}`}>
          {logoUrl ? (
            <img src={logoUrl} alt={user?.businessName || user?.fullName || ""} className="w-full h-full object-contain" />
          ) : (
            initials
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium truncate" data-testid="text-supplier-avatar-name">{user?.businessName || user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-2 py-0.5 rounded-full">
                Supplier
              </span>
            </div>
            <div className="py-1">
              {isDualRole && (
                <button
                  data-testid="button-switch-to-estate"
                  onClick={() => { switchToEstate(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Switch to Estate View
                </button>
              )}
              <button
                data-testid="button-supplier-theme"
                onClick={() => { toggleTheme(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                data-testid="button-supplier-logout"
                onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col supplier-portal">
      <header className="sticky top-0 z-50 border-b border-teal-900/20 dark:border-teal-400/10">
        <div
          className="px-4 md:px-6"
          style={{
            background: theme === "dark" ? "rgba(8,12,12,0.85)" : "rgba(245,252,252,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between gap-4 h-14">
            <div className="flex items-center gap-3">
              <Link href="/supplier" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <img src={koneksiLogo} alt="Koneksi" className="h-5 hidden sm:block dark:brightness-100 brightness-0" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-teal-700 dark:text-teal-400 hidden sm:block">Pro</span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {supplierNavItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      data-testid={`nav-supplier-${item.label.toLowerCase()}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-teal-600/10 text-teal-700 dark:text-teal-300"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </nav>

            <SupplierAvatarDropdown />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-6">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto px-4 md:px-6 py-6"
        >
          {children}
        </motion.div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-teal-900/20 dark:border-teal-400/10"
        style={{
          background: theme === "dark" ? "rgba(8,12,12,0.95)" : "rgba(245,252,252,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        data-testid="supplier-bottom-nav"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {supplierNavItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  data-testid={`bottom-nav-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[52px] ${
                    isActive
                      ? "text-teal-700 dark:text-teal-300"
                      : "text-muted-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "drop-shadow-sm" : ""}`} />
                  <span className={`text-[9px] font-medium ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="supplier-tab-indicator"
                      className="absolute bottom-1 w-5 h-0.5 rounded-full bg-teal-600 dark:bg-teal-400"
                    />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
