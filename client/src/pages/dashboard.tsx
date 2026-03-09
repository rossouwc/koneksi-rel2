import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useEstate } from "@/lib/estate-context";
import { useQuery } from "@tanstack/react-query";
import {
  Receipt,
  Zap,
  Store,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileUp,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Bill, Outage, Provider } from "@shared/schema";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  delay,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  delay: number;
}) {
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay, duration: 0.4 }}>
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-2xl md:text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { currentEstate } = useEstate();

  const estateParam = currentEstate ? `?estateId=${currentEstate.id}` : "";

  const billsUrl = currentEstate ? `/api/bills?estateId=${currentEstate.id}` : "/api/bills";
  const outagesUrl = currentEstate ? `/api/outages?estateId=${currentEstate.id}` : "/api/outages";
  const providersUrl = currentEstate ? `/api/providers?estateId=${currentEstate.id}` : "/api/providers";

  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: [billsUrl],
  });

  const { data: outages = [], isLoading: outagesLoading } = useQuery<Outage[]>({
    queryKey: [outagesUrl],
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery<Provider[]>({
    queryKey: [providersUrl],
  });

  const isLoading = billsLoading || outagesLoading || providersLoading;

  const pendingBills = bills.filter((b) => b.status === "pending").length;
  const activeOutages = outages.filter((o) => o.status !== "resolved").length;
  const recentBills = bills.slice(0, 5);
  const recentOutages = outages.filter((o) => o.status !== "resolved").slice(0, 3);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-greeting">
          {greeting()}, {user?.fullName?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {currentEstate ? `Managing ${currentEstate.name}` : "Your personal dashboard"}
        </p>
      </motion.div>

      {currentEstate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-2xl p-6 gradient-teal relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">
                {currentEstate.suburb}{currentEstate.city ? `, ${currentEstate.city}` : ""}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white" data-testid="text-estate-name">
              {currentEstate.name}
            </h2>
            <p className="text-white/60 text-xs mt-2">
              Invite code: <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{currentEstate.inviteCode}</span>
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard title="Total Bills" value={bills.length} icon={Receipt} color="bg-teal-600" delay={0.15} />
            <StatCard title="Pending" value={pendingBills} icon={Clock} color="bg-amber-500" delay={0.2} />
            <StatCard title="Active Outages" value={activeOutages} icon={AlertTriangle} color="bg-red-500" delay={0.25} />
            <StatCard title="Providers" value={providers.length} icon={Store} color="bg-emerald-500" delay={0.3} />
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-semibold">Recent Bills</CardTitle>
              <Link href="/bills">
                <Button variant="ghost" size="sm" data-testid="link-view-all-bills" className="text-xs">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {billsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))
              ) : recentBills.length === 0 ? (
                <div className="text-center py-8">
                  <FileUp className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No bills yet</p>
                  <Link href="/bills">
                    <Button size="sm" className="mt-3 rounded-lg gradient-teal text-white" data-testid="button-upload-first-bill">
                      Upload your first bill
                    </Button>
                  </Link>
                </div>
              ) : (
                recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg gradient-teal-subtle"
                    data-testid={`bill-item-${bill.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{bill.title}</p>
                        <p className="text-xs text-muted-foreground">{bill.category || "Uncategorized"}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {bill.amount != null && (
                        <p className="text-sm font-semibold">R{(bill.amount / 100).toFixed(2)}</p>
                      )}
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                          bill.status === "paid"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-semibold">Active Outages</CardTitle>
              <Link href="/outages">
                <Button variant="ghost" size="sm" data-testid="link-view-all-outages" className="text-xs">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {outagesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))
              ) : recentOutages.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No active outages</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Everything is running smoothly</p>
                </div>
              ) : (
                recentOutages.map((outage) => (
                  <div
                    key={outage.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10"
                    data-testid={`outage-item-${outage.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{outage.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{outage.type}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        outage.status === "confirmed"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {outage.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
