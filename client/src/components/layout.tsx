import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useEstate } from "@/lib/estate-context";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard,
  Receipt,
  Zap,
  Store,
  ShoppingBag,
  Shield,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Building2,
  ChevronDown,
  UserCircle,
  Plus,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";

const PERSONAL_VALUE = "__personal__";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/bills", label: "Bills", icon: Receipt },
  { path: "/outages", label: "Outages", icon: Zap },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/providers", label: "Providers", icon: Store },
  { path: "/marketplace", label: "Market", icon: ShoppingBag },
];

function AvatarDropdown() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="button-avatar-dropdown"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:opacity-90 transition-opacity"
      >
        <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-xs font-bold">
          {initials}
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
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-avatar-name">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-avatar-email">{user?.email}</p>
              {user?.role && (
                <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full" data-testid="text-avatar-role">
                  {user.role.replace("_", " ")}
                </span>
              )}
            </div>

            <div className="py-1">
              <button
                data-testid="button-dropdown-theme"
                onClick={() => { toggleTheme(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              <button
                data-testid="button-dropdown-logout"
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { currentEstate, approvedEstates, setCurrentEstate, pendingEstates } = useEstate();
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAdmin = user?.isSuperAdmin || user?.role === "super_admin";

  const allNavItems = [
    ...navItems,
    { path: "/join-estate", label: "Estates", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/40">
        <div
          className="px-4 md:px-6"
          style={{
            background: theme === "dark" ? "rgba(10,10,10,0.8)" : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between gap-4 h-14">
            <div className="flex items-center gap-3">
              <button
                data-testid="button-mobile-menu"
                className="md:hidden text-foreground/70"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <img src={koneksiLogo} alt="Koneksi" className="h-5 hidden sm:block dark:brightness-100 brightness-0" />
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "gradient-teal-subtle text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin">
                  <button
                    data-testid="nav-admin"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location === "/admin"
                        ? "gradient-teal-subtle text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <Select
                value={currentEstate?.id || PERSONAL_VALUE}
                onValueChange={(val) => {
                  if (val === PERSONAL_VALUE) {
                    setCurrentEstate(null);
                  } else {
                    const estate = approvedEstates.find((e) => e.id === val);
                    if (estate) setCurrentEstate(estate);
                  }
                }}
              >
                <SelectTrigger
                  data-testid="select-estate"
                  className="w-[140px] md:w-[180px] rounded-lg text-xs md:text-sm h-9"
                >
                  <SelectValue placeholder="Select estate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PERSONAL_VALUE} data-testid="estate-option-personal">
                    <span className="flex items-center gap-2">
                      <UserCircle className="w-3.5 h-3.5" />
                      Personal
                    </span>
                  </SelectItem>
                  {approvedEstates.map((e) => (
                    <SelectItem key={e.id} value={e.id} data-testid={`estate-option-${e.id}`}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Link href="/join-estate">
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid="button-join-estate-nav"
                  className="rounded-lg hidden md:flex"
                  title="Join or manage estates"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>

              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
                className="rounded-lg hidden md:flex"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <AvatarDropdown />
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border/40 overflow-hidden z-40"
            style={{
              background: theme === "dark" ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(16px)",
            }}
          >
            <nav className="p-3 space-y-1">
              {allNavItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                      onClick={() => setMobileNavOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "gradient-teal-subtle text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin">
                  <button
                    data-testid="mobile-nav-admin"
                    onClick={() => setMobileNavOpen(false)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      location === "/admin"
                        ? "gradient-teal-subtle text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                    Admin
                  </button>
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
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
    </div>
  );
}
