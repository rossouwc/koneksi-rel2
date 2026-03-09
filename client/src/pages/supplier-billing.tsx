import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/use-subscription";
import {
  CreditCard,
  Crown,
  Check,
  Building2,
  MapPin,
  Globe2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubscriptionTier } from "@shared/schema";

const tierIcons: Record<string, typeof Building2> = {
  Free: Building2,
  Local: MapPin,
  City: Building2,
  Province: Globe2,
  National: Globe2,
};

const tierColors: Record<string, string> = {
  Free: "from-gray-400 to-gray-500",
  Local: "from-blue-500 to-blue-600",
  City: "from-teal-500 to-emerald-500",
  Province: "from-purple-500 to-violet-600",
  National: "from-amber-500 to-orange-500",
};

export default function SupplierBillingPage() {
  const { data: dashboard, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/supplier/dashboard"],
  });
  const { subscribe, isProcessing } = useSubscription();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive/50 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Failed to load billing</h2>
        <p className="text-sm text-muted-foreground mb-4">Could not fetch subscription data.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()} data-testid="button-retry-billing">
          Try Again
        </Button>
      </div>
    );
  }

  const tiers: SubscriptionTier[] = dashboard?.tiers || [];
  const providers = dashboard?.providers || [];
  const firstProvider = providers[0];
  const currentTier = firstProvider?.tier || null;
  const subscription = firstProvider?.subscription || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-billing-heading">Subscription & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription plan</p>
      </div>

      {currentTier && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 bg-gradient-to-br ${tierColors[currentTier.name] || "from-teal-500 to-emerald-600"} text-white relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wider opacity-80">Current Plan</span>
            </div>
            <h2 className="text-2xl font-bold" data-testid="text-current-plan">{currentTier.name}</h2>
            <p className="text-sm opacity-80 mt-1">{currentTier.description}</p>
            {subscription && (
              <p className="text-xs opacity-60 mt-2">
                Status: {subscription.status} · Since {new Date(subscription.startedAt!).toLocaleDateString("en-ZA")}
              </p>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiers.map((tier: SubscriptionTier, i: number) => {
          const TierIcon = tierIcons[tier.name] || Building2;
          const isCurrent = currentTier?.id === tier.id;
          const gradient = tierColors[tier.name] || "from-gray-500 to-gray-600";

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card rounded-2xl p-5 relative overflow-hidden ${isCurrent ? "ring-2 ring-teal-500/40" : ""}`}
              data-testid={`tier-card-${tier.name.toLowerCase()}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                <TierIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">{tier.name}</h3>
              <p className="text-2xl font-bold mt-1">
                {tier.monthlyPrice === 0 ? "Free" : `R${(tier.monthlyPrice / 100).toFixed(0)}`}
                {tier.monthlyPrice > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{tier.description}</p>
              <ul className="mt-3 space-y-1.5">
                <li className="flex items-center gap-1.5 text-xs">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {tier.maxEstates ? `Up to ${tier.maxEstates} estates` : "Unlimited estates"}
                </li>
                <li className="flex items-center gap-1.5 text-xs">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {tier.scopeType} visibility
                </li>
              </ul>
              <div className="mt-4">
                {isCurrent ? (
                  <Button disabled className="w-full rounded-xl text-xs" variant="outline" data-testid={`button-current-${tier.name.toLowerCase()}`}>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className={`w-full rounded-xl text-xs text-white bg-gradient-to-r ${gradient}`}
                    disabled={isProcessing}
                    onClick={() => {
                      if (firstProvider) {
                        subscribe.mutate({
                          providerId: String(firstProvider.id),
                          tierId: String(tier.id),
                        });
                      }
                    }}
                    data-testid={`button-subscribe-${tier.name.toLowerCase()}`}
                  >
                    {tier.monthlyPrice === 0 ? "Downgrade" : "Upgrade"}
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
