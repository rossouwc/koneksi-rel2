import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import {
  Crown,
  Star,
  Eye,
  MousePointerClick,
  Phone,
  TrendingUp,
  Check,
  Building2,
  MapPin,
  Globe2,
  Plus,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubscriptionTier, Estate } from "@shared/schema";

const providerCategories = [
  "Plumber", "Electrician", "Gardener", "Security", "Cleaning",
  "Handyman", "Pest Control", "Internet", "Painter", "Locksmith", "Other",
];

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

interface SupplierProvider {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  subscription: {
    id: string;
    tierId: string;
    status: string;
    selectedCity: string | null;
    selectedProvince: string | null;
  } | null;
  tier: SubscriptionTier | null;
  visibleEstateIds: string[];
  reviewCount: number;
  avgRating: number;
}

interface DashboardData {
  providers: SupplierProvider[];
  tiers: SubscriptionTier[];
}

function CreateProviderForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/supplier/provider", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/dashboard"] });
      toast({ title: "Business listing created!" });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ name, category, phone: phone || null, whatsapp: whatsapp || null, email: email || null, website: website || null, description: description || null });
      }}
      className="space-y-4"
    >
      <div>
        <Label className="text-sm">Business Name</Label>
        <Input data-testid="input-supplier-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your business name" className="rounded-lg mt-1.5" required />
      </div>
      <div>
        <Label className="text-sm">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="select-supplier-category" className="rounded-lg mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {providerCategories.map((c) => (<SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm">Phone</Label>
          <Input data-testid="input-supplier-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="011 234 5678" className="rounded-lg mt-1.5" />
        </div>
        <div>
          <Label className="text-sm">WhatsApp</Label>
          <Input data-testid="input-supplier-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+27821234567" className="rounded-lg mt-1.5" />
        </div>
      </div>
      <div>
        <Label className="text-sm">Email</Label>
        <Input data-testid="input-supplier-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@mybusiness.co.za" className="rounded-lg mt-1.5" type="email" />
      </div>
      <div>
        <Label className="text-sm">Website</Label>
        <Input data-testid="input-supplier-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://mybusiness.co.za" className="rounded-lg mt-1.5" />
      </div>
      <div>
        <Label className="text-sm">Description</Label>
        <Textarea data-testid="input-supplier-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your services..." className="rounded-lg mt-1.5 resize-none" rows={3} />
      </div>
      <Button type="submit" className="w-full rounded-xl gradient-teal text-white" disabled={mutation.isPending || !name || !category} data-testid="button-create-listing">
        {mutation.isPending ? "Creating..." : "Create Listing"}
      </Button>
    </form>
  );
}

function SubscribeFlow({
  provider,
  tiers,
  onSuccess,
}: {
  provider: SupplierProvider;
  tiers: SubscriptionTier[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [selectedTierId, setSelectedTierId] = useState(provider.subscription?.tierId || "");
  const [selectedEstateIds, setSelectedEstateIds] = useState<string[]>(provider.visibleEstateIds || []);
  const [selectedCity, setSelectedCity] = useState(provider.subscription?.selectedCity || "");
  const [selectedProvince, setSelectedProvince] = useState(provider.subscription?.selectedProvince || "");

  const { data: allEstates = [] } = useQuery<Estate[]>({ queryKey: ["/api/supplier/estates"] });
  const { data: cities = [] } = useQuery<string[]>({ queryKey: ["/api/supplier/cities"] });
  const { data: provinces = [] } = useQuery<string[]>({ queryKey: ["/api/supplier/provinces"] });

  const selectedTier = tiers.find((t) => t.id === selectedTierId);

  const subscribeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/supplier/subscribe", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/dashboard"] });
      if (data.paymentRequired && data.paymentUrl) {
        toast({ title: "Redirecting to PayFast..." });
        window.open(data.paymentUrl, "_blank");
      } else {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        toast({ title: "Subscription updated!" });
      }
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleEstate = (estateId: string) => {
    const maxEstates = selectedTier?.maxEstates || 1;
    setSelectedEstateIds((prev) => {
      if (prev.includes(estateId)) return prev.filter((id) => id !== estateId);
      if (prev.length >= maxEstates) return prev;
      return [...prev, estateId];
    });
  };

  const handleSubscribe = () => {
    subscribeMutation.mutate({
      providerId: provider.id,
      tierId: selectedTierId,
      selectedCity: selectedCity || null,
      selectedProvince: selectedProvince || null,
      selectedEstateIds: selectedTier?.scopeType === "estate" ? selectedEstateIds : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiers.map((tier, i) => {
          const isSelected = selectedTierId === tier.id;
          const isCurrent = provider.subscription?.tierId === tier.id;
          const Icon = tierIcons[tier.name] || Building2;
          const gradientClass = tierColors[tier.name] || "from-gray-500 to-gray-600";

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                type="button"
                data-testid={`tier-card-${tier.name.toLowerCase()}`}
                onClick={() => setSelectedTierId(tier.id)}
                className={`w-full text-left rounded-2xl p-4 border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/50 hover:border-border"
                } ${tier.name === "National" ? "relative overflow-hidden" : ""}`}
              >
                {tier.name === "National" && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[9px] font-bold px-3 py-0.5 rounded-bl-lg">
                    BEST VALUE
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">
                    R{(tier.monthlyPrice / 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <h3 className="font-semibold text-sm">{tier.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {tier.description}
                </p>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Current Plan
                  </span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {selectedTier && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Configure {selectedTier.name} Plan
          </h3>

          {selectedTier.scopeType === "estate" && (
            <div>
              <Label className="text-sm mb-2 block">
                Select estate{selectedTier.maxEstates && selectedTier.maxEstates > 1 ? "s" : ""} ({selectedEstateIds.length}/{selectedTier.maxEstates || 1})
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {allEstates.map((estate) => {
                  const isChosen = selectedEstateIds.includes(estate.id);
                  return (
                    <button
                      key={estate.id}
                      type="button"
                      data-testid={`estate-pick-${estate.id}`}
                      onClick={() => toggleEstate(estate.id)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        isChosen
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 hover:border-border text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium text-xs">{estate.name}</div>
                      {estate.city && (
                        <div className="text-[10px] text-muted-foreground">{estate.city}, {estate.province}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTier.scopeType === "city" && (
            <div>
              <Label className="text-sm">Select City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger data-testid="select-city" className="rounded-lg mt-1.5"><SelectValue placeholder="Choose a city" /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedTier.scopeType === "province" && (
            <div>
              <Label className="text-sm">Select Province</Label>
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger data-testid="select-province" className="rounded-lg mt-1.5"><SelectValue placeholder="Choose a province" /></SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedTier.scopeType === "national" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Globe2 className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Maximum Exposure</p>
                <p className="text-xs text-muted-foreground">Your listing will appear in every estate across South Africa</p>
              </div>
            </div>
          )}

          <Button
            className="w-full rounded-xl gradient-teal text-white"
            disabled={subscribeMutation.isPending}
            onClick={handleSubscribe}
            data-testid="button-confirm-subscribe"
          >
            {subscribeMutation.isPending
              ? "Processing..."
              : selectedTier.monthlyPrice === 0
                ? "Confirm Free Plan"
                : `Subscribe for R${(selectedTier.monthlyPrice / 100).toFixed(0)}/mo`}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function ProviderDashboardCard({ provider }: { provider: SupplierProvider }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { data: dashboard } = useQuery<DashboardData>({ queryKey: ["/api/supplier/dashboard"] });
  const tiers = dashboard?.tiers || [];
  const tierName = provider.tier?.name || "Free";
  const gradientClass = tierColors[tierName] || "from-gray-500 to-gray-600";

  const mockViews = Math.floor(Math.random() * 200 + 50);
  const mockClicks = Math.floor(mockViews * (0.1 + Math.random() * 0.15));
  const mockInquiries = Math.floor(mockClicks * (0.2 + Math.random() * 0.3));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      <div className={`bg-gradient-to-r ${gradientClass} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{provider.name}</h3>
            <span className="text-xs text-white/80 capitalize">{provider.category}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-full px-3 py-1">
            <Crown className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{tierName}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <Eye className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold" data-testid="text-views-count">{mockViews}</p>
            <p className="text-[10px] text-muted-foreground">Views</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <MousePointerClick className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold" data-testid="text-clicks-count">{mockClicks}</p>
            <p className="text-[10px] text-muted-foreground">Clicks</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <Phone className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold" data-testid="text-inquiries-count">{mockInquiries}</p>
            <p className="text-[10px] text-muted-foreground">Inquiries</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/20">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium">
              {provider.avgRating > 0 ? provider.avgRating.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({provider.reviewCount} review{provider.reviewCount !== 1 ? "s" : ""})
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            {provider.visibleEstateIds.length} estate{provider.visibleEstateIds.length !== 1 ? "s" : ""}
          </div>
        </div>

        {provider.subscription?.status === "active" && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active subscription</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => setShowUpgrade(!showUpgrade)}
          data-testid={`button-upgrade-${provider.id}`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {showUpgrade ? "Hide Plans" : tierName === "National" ? "Manage Plan" : "Upgrade Visibility"}
        </Button>

        <AnimatePresence>
          {showUpgrade && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <SubscribeFlow
                provider={provider}
                tiers={tiers}
                onSuccess={() => setShowUpgrade(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function SupplierPortalPage() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/supplier/dashboard"],
  });

  if (user?.role !== "supplier") {
    return (
      <div className="text-center py-16">
        <Crown className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Supplier Access Required</h2>
        <p className="text-sm text-muted-foreground">This portal is for registered suppliers only.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const providers = dashboard?.providers || [];
  const tiers = dashboard?.tiers || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-supplier-heading">Supplier Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your business listings and visibility
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-teal text-white" data-testid="button-add-listing">
              <Plus className="w-4 h-4 mr-2" />
              Add Business Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Business Listing</DialogTitle>
            </DialogHeader>
            <CreateProviderForm onSuccess={() => setCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {providers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl gradient-teal flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Get Started</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Create your first business listing to start reaching estate residents.
            Your first estate is free!
          </p>
          <Button
            className="rounded-xl gradient-teal text-white"
            onClick={() => setCreateDialogOpen(true)}
            data-testid="button-get-started"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Listing
          </Button>

          <div className="mt-8 pt-6 border-t border-border/50">
            <h3 className="text-sm font-semibold mb-4">Choose Your Reach</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {tiers.map((tier, i) => {
                const Icon = tierIcons[tier.name] || Building2;
                const gradientClass = tierColors[tier.name] || "from-gray-500 to-gray-600";
                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="text-center p-3 rounded-xl border border-border/50"
                    data-testid={`tier-preview-${tier.name.toLowerCase()}`}
                  >
                    <div className={`w-8 h-8 mx-auto rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs font-semibold">{tier.name}</p>
                    <p className="text-lg font-bold">
                      R{(tier.monthlyPrice / 100).toFixed(0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/month</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <ProviderDashboardCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  );
}
