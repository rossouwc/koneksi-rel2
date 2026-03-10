import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useEstate } from "@/lib/estate-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Receipt,
  Zap,
  Store,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileUp,
  MapPin,
  Sparkles,
  ArrowRight,
  Copy,
  Users,
  UserCheck,
  UserX,
  Check,
  X,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Bill, Outage, Provider } from "@shared/schema";
import { SavingsTracker } from "@/components/savings-tracker";

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

interface EspStatus {
  status: {
    eskom: { stage: string; stage_updated: string };
    capetown?: { stage: string; stage_updated: string };
  };
}

interface EspEvent { note: string; start: string; end: string; }
interface EspAreaInfo {
  events: EspEvent[];
  info: { name: string; region: string };
  schedule: { days: any[] };
}

function DashboardEspWidget() {
  const { currentEstate, currentProperty } = useEstate();
  const espAreaId = currentEstate?.espAreaId || currentProperty?.espAreaId || null;
  const espAreaName = currentEstate?.espAreaName || currentProperty?.espAreaName || null;

  const { data: status } = useQuery<EspStatus>({
    queryKey: ["/api/esp/status"],
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: areaInfo } = useQuery<EspAreaInfo>({
    queryKey: ["/api/esp/area", espAreaId],
    queryFn: async () => {
      const res = await fetch(`/api/esp/area?id=${encodeURIComponent(espAreaId!)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!espAreaId,
    refetchInterval: 5 * 60 * 1000,
  });

  const eskomStage = (() => {
    const m = status?.status?.eskom?.stage?.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  })();

  const stageColor = eskomStage === 0
    ? "text-emerald-600 dark:text-emerald-400"
    : eskomStage <= 2
    ? "text-yellow-600 dark:text-yellow-400"
    : eskomStage <= 4
    ? "text-orange-600 dark:text-orange-400"
    : "text-red-600 dark:text-red-400";

  const stageBg = eskomStage === 0
    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
    : eskomStage <= 2
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : eskomStage <= 4
    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  const now = new Date();
  const nextEvent = (areaInfo?.events || [])
    .filter(e => new Date(e.end) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  const currentlyActive = nextEvent && new Date(nextEvent.start) <= now;

  if (!espAreaId) {
    return (
      <Link href="/outages">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer" data-testid="link-setup-esp">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Link your area for load shedding alerts →</span>
        </div>
      </Link>
    );
  }

  return (
    <div className={`rounded-lg border p-2.5 ${stageBg}`} data-testid="dashboard-esp-widget">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className={`w-4 h-4 flex-shrink-0 ${stageColor}`} />
          <div className="min-w-0">
            <span className={`text-sm font-bold ${stageColor}`}>
              {eskomStage === 0 ? "No Load Shedding" : `Stage ${eskomStage}`}
            </span>
            {espAreaName && (
              <p className="text-[10px] text-muted-foreground truncate">{espAreaName}</p>
            )}
          </div>
        </div>
        {nextEvent && (
          <div className="text-right flex-shrink-0">
            {currentlyActive ? (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">ACTIVE NOW</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Next: {new Date(nextEvent.start).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { currentEstate, currentProperty, isEstateAdmin } = useEstate();
  const { toast } = useToast();

  const scopeParam = currentEstate ? `?estateId=${currentEstate.id}` : currentProperty ? `?propertyId=${currentProperty.id}` : "";
  const estateParam = scopeParam;

  const billsUrl = `/api/bills${scopeParam}`;
  const outagesUrl = `/api/outages${scopeParam}`;
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

  const { data: pendingProviderCount = 0 } = useQuery<number>({
    queryKey: ["/api/estates", currentEstate?.id, "pending-providers-count"],
    queryFn: async () => {
      if (!currentEstate) return 0;
      const res = await fetch(`/api/estates/${currentEstate.id}/pending-providers`, { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.length;
    },
    enabled: !!currentEstate && isEstateAdmin,
  });

  const { data: pendingResidents = [] } = useQuery<{ userId: string; fullName: string; email: string; joinedAt: string }[]>({
    queryKey: ["/api/estates", currentEstate?.id, "pending-residents"],
    queryFn: async () => {
      if (!currentEstate) return [];
      const res = await fetch(`/api/estates/${currentEstate.id}/pending-residents`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentEstate && isEstateAdmin,
  });

  const approveResidentMutation = useMutation({
    mutationFn: async ({ estateId, userId }: { estateId: string; userId: string }) => {
      await apiRequest("PATCH", `/api/estates/${estateId}/residents/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", currentEstate?.id, "pending-residents"] });
      toast({ title: "Resident approved", description: "They can now access estate data." });
    },
  });

  const rejectResidentMutation = useMutation({
    mutationFn: async ({ estateId, userId }: { estateId: string; userId: string }) => {
      await apiRequest("PATCH", `/api/estates/${estateId}/residents/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", currentEstate?.id, "pending-residents"] });
      toast({ title: "Resident rejected", description: "Their access request has been removed." });
    },
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
          {currentEstate
            ? isEstateAdmin ? `Managing ${currentEstate.name}` : `Viewing ${currentEstate.name}`
            : "Your personal dashboard"}
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
            {isEstateAdmin && (
              <p className="text-white/60 text-xs mt-2 flex items-center gap-1.5">
                Invite code: <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{currentEstate.inviteCode}</span>
                <button
                  type="button"
                  data-testid="button-copy-invite-code"
                  onClick={() => {
                    navigator.clipboard.writeText(currentEstate.inviteCode);
                    toast({ title: "Copied!", description: "Invite code copied to clipboard." });
                  }}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </p>
            )}
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

      {isEstateAdmin && currentEstate && pendingResidents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.31, duration: 0.4 }}
          className="glass-card rounded-2xl p-5"
          data-testid="section-pending-residents"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Pending Residents</h3>
              <p className="text-xs text-muted-foreground">{pendingResidents.length} awaiting approval</p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingResidents.map((r) => (
              <div
                key={r.userId}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/50"
                data-testid={`pending-resident-${r.userId}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {r.fullName?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                    onClick={() => approveResidentMutation.mutate({ estateId: currentEstate.id, userId: r.userId })}
                    disabled={approveResidentMutation.isPending}
                    data-testid={`button-approve-resident-${r.userId}`}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
                    onClick={() => rejectResidentMutation.mutate({ estateId: currentEstate.id, userId: r.userId })}
                    disabled={rejectResidentMutation.isPending}
                    data-testid={`button-reject-resident-${r.userId}`}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isEstateAdmin && currentEstate && pendingProviderCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.315, duration: 0.4 }}
        >
          <Link href="/providers">
            <div
              className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow group"
              data-testid="section-pending-providers"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Pending Providers</h3>
                    <p className="text-xs text-muted-foreground">
                      {pendingProviderCount} provider{pendingProviderCount !== 1 ? "s" : ""} awaiting approval
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.4 }}
      >
        <Link href="/bill-analyzer">
          <div className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow group" data-testid="link-bill-analyzer">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Bill Analyzer</h3>
                  <p className="text-xs text-muted-foreground">Upload a bill for AI-powered analysis & savings tips</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          </div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.4 }}
      >
        <Link href="/marketplace">
          <div className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow group" data-testid="link-marketplace">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Marketplace</h3>
                  <p className="text-xs text-muted-foreground">Water tanks, solar gear, security & more for your estate</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          </div>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.37, duration: 0.4 }}
      >
        <SavingsTracker />
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
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
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base font-semibold">Outages & Load Shedding</CardTitle>
              <Link href="/outages">
                <Button variant="ghost" size="sm" data-testid="link-view-all-outages" className="text-xs">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              <DashboardEspWidget />
              {outagesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))
              ) : recentOutages.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40 mb-1" />
                  <p className="text-xs text-muted-foreground">No community-reported outages</p>
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
