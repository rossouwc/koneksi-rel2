import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useEstate } from "@/lib/estate-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Store,
  ArrowRight,
  Copy,
  Users,
  Check,
  X,
  Building2,
  MapPin,
  UserPlus,
  ChevronRight,
  Home,
  Clock,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Provider } from "@shared/schema";

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
  href,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  delay: number;
  href?: string;
}) {
  const inner = (
    <div className={`glass-card rounded-xl p-4 md:p-5 ${href ? "cursor-pointer hover:shadow-lg transition-shadow group" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl md:text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </p>
        {href && <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
      </div>
    </div>
  );
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay, duration: 0.4 }}>
      {href ? <Link href={href}>{inner}</Link> : inner}
    </motion.div>
  );
}

function EmptyEstateState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="glass-card rounded-2xl p-8 text-center"
      data-testid="section-empty-estate"
    >
      <div className="w-16 h-16 mx-auto rounded-2xl gradient-teal flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold mb-2">Welcome to Koneksi</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        Join an estate or complex to access approved service providers, or add a standalone property to get started.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/join-estate">
          <Button className="rounded-xl gradient-teal text-white w-full sm:w-auto" data-testid="button-join-estate-cta">
            <UserPlus className="w-4 h-4 mr-2" />
            Join an Estate
          </Button>
        </Link>
        <Link href="/join-estate">
          <Button variant="outline" className="rounded-xl w-full sm:w-auto" data-testid="button-add-property-cta">
            <Home className="w-4 h-4 mr-2" />
            Add a Property
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function PendingMembershipState({ pendingEstates }: { pendingEstates: Array<{ id: string; name: string; suburb?: string | null; city?: string | null }> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="space-y-4"
      data-testid="section-pending-membership"
    >
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Approval Pending</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your join request{pendingEstates.length > 1 ? "s are" : " is"} awaiting approval from the estate administrator. You'll get access once approved.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {pendingEstates.map((estate) => (
            <div
              key={estate.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
              data-testid={`pending-membership-estate-${estate.id}`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{estate.name}</p>
                {(estate.suburb || estate.city) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {[estate.suburb, estate.city].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
                Awaiting approval
              </span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/join-estate">
        <div className="glass-card rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow group" data-testid="link-manage-estates-pending">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Join another estate or add a property</p>
                <p className="text-xs text-muted-foreground">Manage all your estates and properties</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { currentEstate, currentProperty, isEstateAdmin, isPersonalMode, approvedEstates, pendingEstates, properties } = useEstate();
  const { toast } = useToast();

  const providersUrl = currentEstate
    ? `/api/providers?estateId=${currentEstate.id}`
    : currentProperty
    ? `/api/providers?propertyId=${currentProperty.id}`
    : "/api/providers";

  const { data: providers = [], isLoading: providersLoading } = useQuery<Provider[]>({
    queryKey: [providersUrl],
    enabled: !!(currentEstate || currentProperty),
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

  const hasNoContext = isPersonalMode && approvedEstates.length === 0 && pendingEstates.length === 0 && properties.length === 0;
  const hasPendingOnly = isPersonalMode && approvedEstates.length === 0 && pendingEstates.length > 0 && properties.length === 0;
  const hasActiveContext = !!(currentEstate || currentProperty);

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
            ? isEstateAdmin
              ? `Managing ${currentEstate.name}`
              : `Viewing ${currentEstate.name}`
            : currentProperty
            ? `Viewing ${currentProperty.name}`
            : hasPendingOnly
            ? "Membership pending approval"
            : "Your personal dashboard"}
        </p>
      </motion.div>

      {hasNoContext ? (
        <EmptyEstateState />
      ) : hasPendingOnly ? (
        <PendingMembershipState pendingEstates={pendingEstates} />
      ) : (
        <>
          {currentEstate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="rounded-2xl p-6 gradient-teal relative overflow-hidden"
              data-testid="section-estate-banner"
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
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-white/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {isEstateAdmin ? "Estate Admin" : "Member"}
                  </span>
                </div>
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

          {currentProperty && !currentEstate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="rounded-2xl p-5 glass-card"
              data-testid="section-property-banner"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold" data-testid="text-property-name">{currentProperty.name}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {[currentProperty.streetAddress, currentProperty.suburb, currentProperty.city].filter(Boolean).join(", ") || "No location set"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                  <Home className="w-3 h-3" />
                  Your Property
                </span>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {providersLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[100px] rounded-xl" />
              ))
            ) : (
              <>
                <StatCard
                  title="Providers"
                  value={hasActiveContext ? providers.length : "Select estate"}
                  icon={Store}
                  color="bg-teal-600"
                  delay={0.15}
                  href="/providers"
                />
                {isEstateAdmin && currentEstate ? (
                  <StatCard
                    title="Pending Members"
                    value={pendingResidents.length}
                    icon={Users}
                    color={pendingResidents.length > 0 ? "bg-amber-500" : "bg-emerald-500"}
                    delay={0.2}
                  />
                ) : (
                  <StatCard
                    title="My Estates"
                    value={approvedEstates.length}
                    icon={Building2}
                    color="bg-emerald-500"
                    delay={0.2}
                    href="/join-estate"
                  />
                )}
              </>
            )}
          </div>

          {isEstateAdmin && currentEstate && pendingResidents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="glass-card rounded-2xl overflow-hidden"
              data-testid="section-pending-residents"
            >
              <Link href="/join-estate">
                <div className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-muted/20 transition-colors group border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Pending Member Approvals</h3>
                      <p className="text-xs text-muted-foreground">
                        {pendingResidents.length} resident{pendingResidents.length !== 1 ? "s" : ""} awaiting approval
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </Link>
              <div className="p-4 space-y-2">
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
              transition={{ delay: 0.28, duration: 0.4 }}
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
                        <h3 className="font-semibold text-sm">Pending Provider Approvals</h3>
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
            <Link href="/providers">
              <div className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow group" data-testid="link-browse-providers">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Browse Service Providers</h3>
                      <p className="text-xs text-muted-foreground">
                        {currentEstate
                          ? `Find approved suppliers for ${currentEstate.name}`
                          : currentProperty
                          ? "Find suppliers available in your area"
                          : "Discover trusted service providers"}
                      </p>
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
            transition={{ delay: 0.36, duration: 0.4 }}
          >
            <Link href="/maint">
              <div className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow group" data-testid="link-maint-tool">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        m<span className="text-primary">AI</span>nt — AI Diagnosis
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Photo-based home maintenance diagnosis &amp; trade recommendations
                      </p>
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
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Link href="/join-estate">
              <div className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow group" data-testid="link-manage-estates">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Manage Estates & Properties</h3>
                      <p className="text-xs text-muted-foreground">
                        Join a new estate, manage memberships, or add a property
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </div>
            </Link>
          </motion.div>
        </>
      )}
    </div>
  );
}
