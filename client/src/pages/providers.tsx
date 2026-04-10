import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEstate } from "@/lib/estate-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Store,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  ArrowLeft,
  Filter,
  ChevronDown,
  ExternalLink,
  User,
  Clock,
  Crown,
  Wrench,
  X,
  CheckCircle2,
  XCircle,
  UserPlus,
  ThumbsUp,
  Send,
  Shield,
  Inbox,
  Loader2,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SERVICE_OPTIONS } from "@shared/schema";
import type { Provider, Review } from "@shared/schema";

const providerCategories = [
  "Plumber",
  "Electrician",
  "Gardener",
  "Security",
  "Cleaning",
  "Handyman",
  "Pest Control",
  "Internet",
  "Painter",
  "Locksmith",
  "Other",
];

const categoryIcons: Record<string, string> = {
  plumber: "🔧",
  electrician: "⚡",
  gardener: "🌿",
  security: "🛡️",
  cleaning: "🧹",
  handyman: "🔨",
  "pest control": "🐛",
  internet: "📡",
  painter: "🎨",
  locksmith: "🔑",
  other: "📋",
};

function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const sizeMap = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-7 h-7" };
  const s = sizeMap[size];
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i + 1)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          data-testid={interactive ? `button-star-${i + 1}` : undefined}
        >
          <Star
            className={`${s} transition-colors ${
              i < rating
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ providerId, onSuccess }: { providerId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/providers", providerId] });
      setRating(5);
      setComment("");
      toast({ title: "Review submitted" });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm">Your Rating</Label>
        <div className="mt-2">
          <StarRating rating={rating} size="lg" interactive onRate={setRating} />
        </div>
      </div>
      <div>
        <Label className="text-sm">Comment</Label>
        <Textarea
          data-testid="input-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="rounded-lg mt-1.5 resize-none"
          rows={3}
        />
      </div>
      <Button
        className="w-full rounded-xl gradient-teal text-white"
        disabled={mutation.isPending}
        data-testid="button-submit-review"
        onClick={() => mutation.mutate({ providerId, rating, comment: comment || null })}
      >
        {mutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
}

function ProviderDetail({
  providerId,
  onBack,
}: {
  providerId: string;
  onBack: () => void;
}) {
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data, isLoading } = useQuery<{ provider: Provider; reviews: (Review & { user?: { fullName: string } })[] }>({
    queryKey: ["/api/providers", providerId],
    queryFn: async () => {
      const res = await fetch(`/api/providers/${providerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load provider");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2" data-testid="button-back-providers">
          <ArrowLeft className="w-4 h-4" />
          Back to providers
        </Button>
        <div className="text-center py-16">
          <Store className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Provider not found</h3>
          <p className="text-sm text-muted-foreground">This provider may have been removed or you don't have access</p>
        </div>
      </div>
    );
  }

  const { provider, reviews } = data;
  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
    : 0;
  const icon = categoryIcons[provider.category.toLowerCase()] || "📋";

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1.5 -ml-2"
        data-testid="button-back-providers"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to providers
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <div className="relative">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden ${(provider as any).logoUrl ? "bg-white dark:bg-zinc-800 ring-1 ring-border" : "gradient-teal-subtle"}`}>
              {(provider as any).logoUrl ? (
                <img src={(provider as any).logoUrl} alt={provider.name} className="w-full h-full object-contain p-1.5" />
              ) : (
                icon
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate" data-testid="text-provider-name">
                {provider.name}
              </h1>
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-1">
                {provider.category}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={Math.round(avgRating)} size="md" />
                <span className="text-sm font-medium" data-testid="text-provider-rating">
                  {avgRating > 0 ? avgRating.toFixed(1) : "No ratings"}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                </span>
              </div>
            </div>
          </div>

          {provider.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4" data-testid="text-provider-description">
              {provider.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {provider.phone && (
              <a href={`tel:${provider.phone}`} data-testid="link-provider-phone">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </Button>
              </a>
            )}
            {(provider as any).whatsapp && (
              <a
                href={`https://wa.me/${(provider as any).whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-provider-whatsapp"
              >
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20">
                  <SiWhatsapp className="w-3.5 h-3.5" />
                  WhatsApp
                </Button>
              </a>
            )}
            {provider.email && (
              <a href={`mailto:${provider.email}`} data-testid="link-provider-email">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </Button>
              </a>
            )}
            {provider.website && (
              <a href={provider.website} target="_blank" rel="noopener noreferrer" data-testid="link-provider-website">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Website
                </Button>
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {provider.services && provider.services.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-5"
          data-testid="section-provider-services"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-primary" />
            Services
          </h2>
          <div className="flex flex-wrap gap-2">
            {provider.services.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className={`text-xs px-3 py-1 rounded-full font-medium border ${getServiceColor(s)}`}
                data-testid={`badge-detail-service-${s.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {s}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {provider.website && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-card rounded-2xl p-5"
          data-testid="section-provider-website"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            Website
          </h2>
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1.5"
            data-testid="link-detail-website"
          >
            {provider.website.replace(/^https?:\/\//, "")}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Reviews ({reviews.length})
          </h2>
          {!showReviewForm && (
            <Button
              size="sm"
              className="rounded-xl gradient-teal text-white text-xs"
              onClick={() => setShowReviewForm(true)}
              data-testid="button-write-review"
            >
              <Plus className="w-3 h-3 mr-1" />
              Write Review
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="glass-card rounded-xl p-4 border border-primary/20">
                <ReviewForm
                  providerId={providerId}
                  onSuccess={() => setShowReviewForm(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Be the first to review this provider</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-muted/20 p-4"
                data-testid={`review-item-${review.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        {(review as any).user?.fullName || "Resident"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                  </div>
                  {review.createdAt && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(review.createdAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                    {review.comment}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

const tierBadgeColors: Record<string, string> = {
  Local: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  City: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  Province: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  National: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const serviceBadgeColors = [
  "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
];

function getServiceColor(service: string) {
  let hash = 0;
  for (let i = 0; i < service.length; i++) {
    hash = service.charCodeAt(i) + ((hash << 5) - hash);
  }
  return serviceBadgeColors[Math.abs(hash) % serviceBadgeColors.length];
}

function ServiceTags({ services, max = 3, size = "sm" }: { services: string[]; max?: number; size?: "sm" | "md" }) {
  const visible = services.slice(0, max);
  const remaining = services.length - max;
  const textSize = size === "sm" ? "text-[9px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0" : "px-2 py-0.5";

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid="container-service-tags">
      {visible.map((s) => (
        <Badge
          key={s}
          variant="outline"
          className={`${textSize} ${padding} rounded-full font-medium border ${getServiceColor(s)}`}
          data-testid={`badge-service-${s.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {s}
        </Badge>
      ))}
      {remaining > 0 && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Badge
              variant="outline"
              className={`${textSize} ${padding} rounded-full font-medium cursor-pointer border bg-muted/40 text-muted-foreground hover:bg-muted/60`}
              data-testid="badge-more-services"
            >
              +{remaining} more
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-3" side="top" align="start">
            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
              {services.slice(max).map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getServiceColor(s)}`}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}

function ServicesFilter({
  selectedServices,
  onChange,
}: {
  selectedServices: string[];
  onChange: (services: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (s: string) => {
    onChange(
      selectedServices.includes(s)
        ? selectedServices.filter((x) => x !== s)
        : [...selectedServices, s]
    );
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className={`rounded-xl h-9 text-xs gap-1.5 ${selectedServices.length > 0 ? "border-primary text-primary" : ""}`}
        onClick={() => setOpen(!open)}
        data-testid="button-filter-services"
      >
        <Wrench className="w-3 h-3" />
        Services
        {selectedServices.length > 0 && (
          <span className="ml-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center">
            {selectedServices.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-xl border bg-popover shadow-lg overflow-hidden" data-testid="dropdown-filter-services">
          <div className="p-1.5 border-b">
            {selectedServices.length > 0 && (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1"
                onClick={() => onChange([])}
                data-testid="button-clear-services-filter"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1">
            {[...SERVICE_OPTIONS].map((service) => (
              <button
                key={service}
                type="button"
                onClick={() => toggle(service)}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                  selectedServices.includes(service)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted/50"
                }`}
                data-testid={`option-filter-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                  selectedServices.includes(service)
                    ? "bg-primary border-primary text-white"
                    : "border-muted-foreground/30"
                }`}>
                  {selectedServices.includes(service) && "✓"}
                </span>
                {service}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  reviews,
  avgRating,
  onClick,
  tierName,
}: {
  provider: Provider;
  reviews: Review[];
  avgRating: number;
  onClick: () => void;
  tierName?: string;
}) {
  const icon = categoryIcons[provider.category.toLowerCase()] || "📋";
  const isPremium = tierName && tierName !== "Free";
  const badgeColor = tierName ? tierBadgeColors[tierName] : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`provider-card rounded-2xl cursor-pointer overflow-hidden ${isPremium ? "provider-card-premium" : ""}`}
      data-testid={`card-provider-${provider.id}`}
    >
      <div className="relative h-[72px] bg-gradient-to-br from-teal-500/20 via-emerald-400/10 to-transparent">
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          <div className={`w-[54px] h-[54px] rounded-2xl flex items-center justify-center text-2xl shadow-md ring-2 ring-white dark:ring-zinc-900 overflow-hidden ${(provider as any).logoUrl ? "bg-white dark:bg-zinc-800" : "gradient-teal"}`}>
            {(provider as any).logoUrl ? (
              <img src={(provider as any).logoUrl} alt={provider.name} className="w-full h-full object-contain p-1" />
            ) : (
              icon
            )}
          </div>
        </div>
        {isPremium && (
          <div className="absolute top-2.5 right-3">
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0.5 rounded-full border ${badgeColor} bg-white/90 dark:bg-zinc-900/90`}
            >
              <Crown className="w-2 h-2 mr-0.5" />
              {tierName}
            </Badge>
          </div>
        )}
      </div>

      <div className="pt-8 px-5 pb-4">
        <div className="mb-2.5">
          <h3 className="font-bold text-[15px] leading-snug truncate" data-testid={`text-name-${provider.id}`}>
            {provider.name}
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize font-medium inline-block mt-1">
            {provider.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <StarRating rating={Math.round(avgRating)} size="sm" />
          {avgRating > 0 ? (
            <>
              <span className="text-xs font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No reviews yet</span>
          )}
        </div>

        {provider.services && provider.services.length > 0 && (
          <div className="mb-3">
            <ServiceTags services={provider.services} max={3} />
          </div>
        )}

        {provider.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {provider.description}
          </p>
        )}

        <div className="border-t border-border/40 pt-3 flex items-center gap-2">
          {provider.phone ? (
            <a
              href={`tel:${provider.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1"
              data-testid={`link-call-${provider.id}`}
            >
              <Button className="w-full rounded-xl h-9 text-sm gradient-teal text-white gap-2">
                <Phone className="w-3.5 h-3.5" />
                Call
              </Button>
            </a>
          ) : provider.email ? (
            <a
              href={`mailto:${provider.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1"
              data-testid={`link-email-${provider.id}`}
            >
              <Button className="w-full rounded-xl h-9 text-sm gradient-teal text-white gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Button>
            </a>
          ) : null}

          <div className="flex items-center gap-1.5">
            {(provider as any).whatsapp && (
              <a
                href={`https://wa.me/${(provider as any).whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-whatsapp-${provider.id}`}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-9 w-9 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 flex-shrink-0"
                >
                  <SiWhatsapp className="w-4 h-4" />
                </Button>
              </a>
            )}
            {provider.email && provider.phone && (
              <a
                href={`mailto:${provider.email}`}
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-email-${provider.id}`}
              >
                <Button variant="outline" size="icon" className="rounded-xl h-9 w-9 flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </Button>
              </a>
            )}
            {provider.website && (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-website-${provider.id}`}
              >
                <Button variant="outline" size="icon" className="rounded-xl h-9 w-9 flex-shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProviderFormFields({
  name, setName, category, setCategory, phone, setPhone, whatsapp, setWhatsapp,
  email, setEmail, website, setWebsite, description, setDescription,
  providerServices, setProviderServices, showProviderServicesDrop, setShowProviderServicesDrop,
}: any) {
  return (
    <>
      <div>
        <Label className="text-sm">Name</Label>
        <Input
          data-testid="input-provider-name"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="Provider name"
          className="rounded-lg mt-1.5"
          required
        />
      </div>
      <div>
        <Label className="text-sm">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="select-provider-category" className="rounded-lg mt-1.5">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {providerCategories.map((c) => (
              <SelectItem key={c} value={c.toLowerCase()}>
                {categoryIcons[c.toLowerCase()] || "📋"} {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm">Phone</Label>
          <Input
            data-testid="input-provider-phone"
            value={phone}
            onChange={(e: any) => setPhone(e.target.value)}
            placeholder="+27..."
            className="rounded-lg mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm">WhatsApp</Label>
          <Input
            data-testid="input-provider-whatsapp"
            value={whatsapp}
            onChange={(e: any) => setWhatsapp(e.target.value)}
            placeholder="+27..."
            className="rounded-lg mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label className="text-sm">Email</Label>
        <Input
          data-testid="input-provider-email"
          type="email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          placeholder="email@provider.co.za"
          className="rounded-lg mt-1.5"
        />
      </div>
      <div>
        <Label className="text-sm">Website</Label>
        <Input
          data-testid="input-provider-website"
          value={website}
          onChange={(e: any) => setWebsite(e.target.value)}
          placeholder="https://..."
          className="rounded-lg mt-1.5"
        />
      </div>
      <div>
        <Label className="text-sm">Services</Label>
        <div className="relative mt-1.5">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg justify-between text-sm font-normal h-10"
            onClick={() => setShowProviderServicesDrop(!showProviderServicesDrop)}
            data-testid="button-provider-services-dropdown"
          >
            {providerServices.length > 0 ? `${providerServices.length} selected` : "Select services"}
            <ChevronDown className={`w-4 h-4 transition-transform ${showProviderServicesDrop ? "rotate-180" : ""}`} />
          </Button>
          {showProviderServicesDrop && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border bg-popover shadow-lg overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto p-1">
                {[...SERVICE_OPTIONS].map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => {
                      setProviderServices(
                        providerServices.includes(service)
                          ? providerServices.filter((s: string) => s !== service)
                          : [...providerServices, service]
                      );
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                      providerServices.includes(service) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`option-add-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                      providerServices.includes(service) ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                    }`}>
                      {providerServices.includes(service) && "✓"}
                    </span>
                    {service}
                  </button>
                ))}
              </div>
            </div>
          )}
          {providerServices.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {providerServices.map((s: string) => (
                <Badge
                  key={s}
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${getServiceColor(s)} cursor-pointer`}
                  onClick={() => setProviderServices(providerServices.filter((x: string) => x !== s))}
                >
                  {s}
                  <X className="w-2.5 h-2.5 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <Label className="text-sm">Description</Label>
        <Textarea
          data-testid="input-provider-description"
          value={description}
          onChange={(e: any) => setDescription(e.target.value)}
          placeholder="Brief description of services..."
          className="rounded-lg mt-1.5 resize-none"
          rows={2}
        />
      </div>
    </>
  );
}

function AdminPendingTab({ estateId }: { estateId: string }) {
  const { toast } = useToast();

  const { data: pending = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/estates", estateId, "pending-providers"],
    queryFn: async () => {
      const res = await fetch(`/api/estates/${estateId}/pending-providers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (providerId: string) => {
      await apiRequest("PATCH", `/api/estates/${estateId}/providers/${providerId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", estateId, "pending-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      toast({ title: "Provider approved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      await apiRequest("PATCH", `/api/estates/${estateId}/providers/${providerId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", estateId, "pending-providers"] });
      toast({ title: "Provider rejected" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No pending provider recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((p: any) => {
        const icon = categoryIcons[p.category?.toLowerCase()] || "📋";
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4"
            data-testid={`card-pending-provider-${p.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl gradient-teal-subtle flex items-center justify-center text-lg flex-shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize inline-block mt-0.5">
                  {p.category}
                </span>
                {p._recommendedByName && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    Recommended by {p._recommendedByName}
                  </p>
                )}
                {p.phone && <p className="text-[10px] text-muted-foreground mt-0.5">{p.phone}</p>}
                {p.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-8 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={() => rejectMutation.mutate(p.id)}
                disabled={rejectMutation.isPending}
                data-testid={`button-reject-provider-${p.id}`}
              >
                <XCircle className="w-3 h-3" />
                Reject
              </Button>
              <Button
                size="sm"
                className="rounded-lg h-8 text-xs gap-1 gradient-teal text-white"
                onClick={() => approveMutation.mutate(p.id)}
                disabled={approveMutation.isPending}
                data-testid={`button-approve-provider-${p.id}`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Approve
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function AdminBrowseTab({ estateId }: { estateId: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: registered = [], isLoading } = useQuery<Provider[]>({
    queryKey: ["/api/estates", estateId, "registered-providers"],
    queryFn: async () => {
      const res = await fetch(`/api/estates/${estateId}/registered-providers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (providerId: string) => {
      await apiRequest("POST", `/api/estates/${estateId}/providers/${providerId}/add`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", estateId, "registered-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      toast({ title: "Provider added to estate" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!search) return registered;
    const q = search.toLowerCase();
    return registered.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.services && p.services.some((s) => s.toLowerCase().includes(q)))
    );
  }, [registered, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-browse-search"
          placeholder="Search registered providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Store className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? "No matching providers found" : "No additional providers available"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const icon = categoryIcons[p.category?.toLowerCase()] || "📋";
            const canAdd = (p as any)._canAdd;
            const tierReason = (p as any)._tierReason;
            const tierLabel = (p as any)._tierName;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-xl p-3 flex items-center gap-3 ${!canAdd ? "opacity-60" : ""}`}
                data-testid={`card-browse-provider-${p.id}`}
              >
                <div className="w-9 h-9 rounded-lg gradient-teal-subtle flex items-center justify-center text-base flex-shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{p.name}</h4>
                    {tierLabel && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${canAdd ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                        {tierLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{p.category}</span>
                  {!canAdd && tierReason && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{tierReason}</p>
                  )}
                  {p.services && p.services.length > 0 && (
                    <div className="mt-1">
                      <ServiceTags services={p.services} max={2} size="sm" />
                    </div>
                  )}
                </div>
                {canAdd ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg h-8 text-xs gap-1 flex-shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => addMutation.mutate(p.id)}
                    disabled={addMutation.isPending}
                    data-testid={`button-add-provider-${p.id}`}
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[9px] px-2 py-1 rounded-lg border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 flex-shrink-0 whitespace-nowrap">
                    Upgrade needed
                  </Badge>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminInvitationsTab({ estateId }: { estateId: string }) {
  const { toast } = useToast();
  const { data: invitations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/estates", estateId, "invitations"],
    queryFn: async () => {
      const res = await fetch(`/api/estates/${estateId}/invitations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <Send className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No provider invitations yet</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    pending: "Invited",
    sent: "Sent",
    registered: "Registered",
    approved: "Approved",
    rejected: "Rejected",
  };
  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    registered: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const appUrl = window.location.origin;

  return (
    <div className="space-y-2">
      {invitations.map((inv: any) => {
        const inviteUrl = inv.token ? `${appUrl}/join-provider?token=${inv.token}` : null;
        return (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-3 space-y-2"
            data-testid={`card-invitation-${inv.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{inv.providerName}</h4>
                {inv.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize inline-block mt-0.5">
                    {inv.category}
                  </span>
                )}
                <div className="flex flex-col gap-0.5 mt-1">
                  {inv.providerEmail && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" />
                      {inv.providerEmail}
                    </p>
                  )}
                  {inv.providerPhone && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {inv.providerPhone}
                    </p>
                  )}
                </div>
                {inv._invitedByName && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    Invited by {inv._invitedByName}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 rounded-full ${statusColor[inv.status] || "bg-muted text-muted-foreground border-muted"}`}
                >
                  {statusLabel[inv.status] || inv.status}
                </Badge>
                {inv.statusUpdatedAt && (
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(inv.statusUpdatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 pt-1 border-t border-border/30 overflow-x-auto">
              {(["pending", "sent", "registered", inv.status === "rejected" ? "rejected" : "approved"] as string[]).map((step, i) => {
                const linearOrder = ["pending", "sent", "registered", inv.status === "rejected" ? "rejected" : "approved"];
                const statusIdx = linearOrder.indexOf(inv.status);
                const stepIdx = linearOrder.indexOf(step);
                const isActive = statusIdx >= 0 && stepIdx <= statusIdx;
                const isCurrent = step === inv.status;
                const isLast = i === 3;
                return (
                  <div key={step} className="flex items-center gap-1 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? (step === "rejected" ? "bg-red-500" : "bg-primary") : "bg-border"}`} />
                    <span className={`text-[9px] whitespace-nowrap ${isCurrent ? (step === "rejected" ? "text-red-500 font-medium" : "text-primary font-medium") : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {statusLabel[step]}
                    </span>
                    {!isLast && <div className={`h-px w-3 flex-shrink-0 ${isActive ? (step === "rejected" ? "bg-red-500/40" : "bg-primary/40") : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>

            {inviteUrl && (
              <div className="flex items-center gap-2 pt-0.5">
                <p className="text-[9px] text-muted-foreground truncate flex-1 font-mono">{inviteUrl}</p>
                <button
                  data-testid={`button-copy-invite-link-${inv.id}`}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    toast({ title: "Link copied", description: "Invite link copied to clipboard" });
                  }}
                  className="text-[9px] text-primary flex items-center gap-0.5 flex-shrink-0 hover:underline"
                >
                  Copy link
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ProvidersPage() {
  const { currentEstate, isEstateAdmin } = useEstate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [servicesFilter, setServicesFilter] = useState<string[]>([]);
  const [recommendDialogOpen, setRecommendDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"pending" | "browse" | "invitations" | "providers">("providers");

  const [recommendSearch, setRecommendSearch] = useState("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [providerServices, setProviderServices] = useState<string[]>([]);
  const [showProviderServicesDrop, setShowProviderServicesDrop] = useState(false);

  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invCategory, setInvCategory] = useState("");

  const providersUrl = currentEstate ? `/api/providers?estateId=${currentEstate.id}` : "/api/providers";
  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: [providersUrl],
  });

  const { data: allReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: pendingProviders = [] } = useQuery<any[]>({
    queryKey: ["/api/estates", currentEstate?.id, "pending-providers"],
    queryFn: async () => {
      if (!currentEstate?.id) return [];
      const res = await fetch(`/api/estates/${currentEstate.id}/pending-providers`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentEstate?.id && isEstateAdmin,
  });

  const { data: availableProviders = [], isLoading: availableLoading } = useQuery<Provider[]>({
    queryKey: ["/api/estates", currentEstate?.id, "available-providers"],
    queryFn: async () => {
      if (!currentEstate?.id) return [];
      const res = await fetch(`/api/estates/${currentEstate.id}/available-providers`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentEstate?.id && recommendDialogOpen && !isEstateAdmin,
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setWebsite("");
    setDescription("");
    setProviderServices([]);
    setShowProviderServicesDrop(false);
  };

  const recommendMutation = useMutation({
    mutationFn: async (data: { estateId: string; providerId: string }) => {
      await apiRequest("POST", "/api/providers/recommend", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [providersUrl] });
      queryClient.invalidateQueries({ queryKey: ["/api/estates", currentEstate?.id, "pending-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estates", currentEstate?.id, "available-providers"] });
      setRecommendDialogOpen(false);
      setRecommendSearch("");
      toast({ title: "Provider recommended", description: "Your recommendation has been sent to the estate admin for approval." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createDirectMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/providers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [providersUrl] });
      setRecommendDialogOpen(false);
      resetForm();
      toast({ title: "Provider added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/providers/invite", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", currentEstate?.id, "invitations"] });
      setInviteDialogOpen(false);
      setInvName("");
      setInvEmail("");
      setInvPhone("");
      setInvCategory("");
      toast({ title: "Invitation sent", description: "The provider will be notified about your estate." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleRecommendProvider = (providerId: string) => {
    if (!currentEstate?.id) return;
    recommendMutation.mutate({ estateId: currentEstate.id, providerId });
  };

  const filteredAvailableProviders = availableProviders.filter((p) => {
    const q = recommendSearch.toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.services && p.services.some((s) => s.toLowerCase().includes(q)))
    );
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({
      estateId: currentEstate?.id,
      providerName: invName,
      providerEmail: invEmail || null,
      providerPhone: invPhone || null,
      category: invCategory || null,
    });
  };

  const getProviderReviews = (providerId: string) =>
    allReviews.filter((r) => r.providerId === providerId);

  const getAverageRating = (providerId: string) => {
    const reviews = getProviderReviews(providerId);
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  };

  const filtered = useMemo(() => {
    const result = providers.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === "all" || p.category.toLowerCase() === categoryFilter.toLowerCase();

      const avg = getAverageRating(p.id);
      const matchesRating = ratingFilter === "all" || avg >= parseInt(ratingFilter);

      const matchesServices = servicesFilter.length === 0 || (
        p.services && servicesFilter.some((s) => p.services!.includes(s))
      );

      return matchesSearch && matchesCategory && matchesRating && matchesServices;
    });

    const tierPriority: Record<string, number> = { National: 5, Province: 4, City: 3, Local: 2, Free: 1 };
    return result.sort((a, b) => {
      const aTier = (a as any)._tierName || "";
      const bTier = (b as any)._tierName || "";
      const aPriority = tierPriority[aTier] || 0;
      const bPriority = tierPriority[bTier] || 0;
      if (bPriority !== aPriority) return bPriority - aPriority;
      return getAverageRating(b.id) - getAverageRating(a.id);
    });
  }, [providers, searchQuery, categoryFilter, ratingFilter, servicesFilter, allReviews]);

  const activeCategories = useMemo(() => {
    const cats = new Set(providers.map((p) => p.category.toLowerCase()));
    return Array.from(cats).sort();
  }, [providers]);

  if (selectedProviderId) {
    return (
      <ProviderDetail
        providerId={selectedProviderId}
        onBack={() => setSelectedProviderId(null)}
      />
    );
  }

  const pendingCount = pendingProviders.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-providers-heading">Providers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentEstate
              ? `Trusted providers for ${currentEstate.name}`
              : "Find service providers in your area"}
          </p>
        </div>
        {currentEstate && !isEstateAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl text-sm gap-1.5" data-testid="button-invite-provider">
                  <UserPlus className="w-4 h-4" />
                  Invite Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Invite a Provider</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground -mt-1">
                  Know a great provider not yet on Koneksi? Invite them to join and serve your estate.
                </p>
                <form onSubmit={handleInviteSubmit} className="space-y-4 mt-2">
                  <div>
                    <Label className="text-sm">Provider Name</Label>
                    <Input
                      data-testid="input-invite-name"
                      value={invName}
                      onChange={(e) => setInvName(e.target.value)}
                      placeholder="Business or provider name"
                      className="rounded-lg mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Category</Label>
                    <Select value={invCategory} onValueChange={setInvCategory}>
                      <SelectTrigger data-testid="select-invite-category" className="rounded-lg mt-1.5">
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerCategories.map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>
                            {categoryIcons[c.toLowerCase()] || "📋"} {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input
                      data-testid="input-invite-email"
                      type="email"
                      value={invEmail}
                      onChange={(e) => setInvEmail(e.target.value)}
                      placeholder="provider@example.com"
                      className="rounded-lg mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <Input
                      data-testid="input-invite-phone"
                      value={invPhone}
                      onChange={(e) => setInvPhone(e.target.value)}
                      placeholder="+27..."
                      className="rounded-lg mt-1.5"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl gradient-teal text-white"
                    disabled={inviteMutation.isPending}
                    data-testid="button-submit-invite"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={recommendDialogOpen} onOpenChange={(open) => { setRecommendDialogOpen(open); if (!open) setRecommendSearch(""); }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gradient-teal text-white text-sm gap-1.5" data-testid="button-recommend-provider">
                  <ThumbsUp className="w-4 h-4" />
                  Recommend
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Recommend a Provider</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground -mt-1">
                  Search for a registered provider to recommend to your estate. Your recommendation will be sent to the estate admin for approval.
                </p>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, category, or service..."
                    value={recommendSearch}
                    onChange={(e) => setRecommendSearch(e.target.value)}
                    className="pl-9 rounded-xl"
                    data-testid="input-recommend-search"
                  />
                </div>
                <div className="flex-1 overflow-y-auto mt-2 space-y-2 min-h-0 max-h-[50vh]">
                  {availableLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredAvailableProviders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {recommendSearch ? "No matching providers found." : "No additional providers available to recommend."}
                    </div>
                  ) : (
                    filteredAvailableProviders.map((p) => {
                      const icon = categoryIcons[p.category.toLowerCase()] || "📋";
                      const pReviews = getProviderReviews(p.id);
                      const avg = getAverageRating(p.id);
                      const canAdd = (p as any)._canAdd;
                      const tierReason = (p as any)._tierReason;
                      const tierLabel = (p as any)._tierName;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            canAdd
                              ? "border-border/50 hover:border-primary/30 hover:bg-primary/5"
                              : "border-border/30 opacity-60"
                          }`}
                          data-testid={`recommend-provider-${p.id}`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/30 flex items-center justify-center text-base flex-shrink-0">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{p.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                {p.category}
                              </span>
                              {avg > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {avg.toFixed(1)} ({pReviews.length})
                                </span>
                              )}
                              {tierLabel && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${canAdd ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                  {tierLabel} plan
                                </span>
                              )}
                            </div>
                            {!canAdd && tierReason && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{tierReason}</p>
                            )}
                            {p.services && p.services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.services.slice(0, 3).map((s) => (
                                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                                ))}
                                {p.services.length > 3 && (
                                  <span className="text-[9px] text-muted-foreground">+{p.services.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {canAdd ? (
                            <Button
                              size="sm"
                              className="rounded-lg gradient-teal text-white text-xs h-8 px-3 flex-shrink-0"
                              disabled={recommendMutation.isPending}
                              onClick={() => handleRecommendProvider(p.id)}
                              data-testid={`button-recommend-${p.id}`}
                            >
                              {recommendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Recommend"}
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-2 py-1 rounded-lg border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 flex-shrink-0 whitespace-nowrap">
                              Upgrade needed
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {isEstateAdmin && currentEstate && (
          <div className="flex gap-2 flex-wrap">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl text-sm gap-1.5" data-testid="button-invite-provider">
                  <UserPlus className="w-4 h-4" />
                  Invite Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Invite a Provider</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground -mt-1">
                  Know a great provider not yet on Koneksi? Invite them to join and serve your estate.
                </p>
                <form onSubmit={handleInviteSubmit} className="space-y-4 mt-2">
                  <div>
                    <Label className="text-sm">Provider Name</Label>
                    <Input
                      data-testid="input-invite-name"
                      value={invName}
                      onChange={(e) => setInvName(e.target.value)}
                      placeholder="Business or provider name"
                      className="rounded-lg mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Category</Label>
                    <Select value={invCategory} onValueChange={setInvCategory}>
                      <SelectTrigger data-testid="select-invite-category" className="rounded-lg mt-1.5">
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerCategories.map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>
                            {categoryIcons[c.toLowerCase()] || "📋"} {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input
                      data-testid="input-invite-email"
                      type="email"
                      value={invEmail}
                      onChange={(e) => setInvEmail(e.target.value)}
                      placeholder="provider@example.com"
                      className="rounded-lg mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <Input
                      data-testid="input-invite-phone"
                      value={invPhone}
                      onChange={(e) => setInvPhone(e.target.value)}
                      placeholder="+27..."
                      className="rounded-lg mt-1.5"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl gradient-teal text-white"
                    disabled={inviteMutation.isPending}
                    data-testid="button-submit-invite"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {isEstateAdmin && currentEstate && (
        <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
          <button
            onClick={() => setAdminTab("providers")}
            className={`flex-1 text-xs py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              adminTab === "providers"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-estate-providers"
          >
            <Store className="w-3.5 h-3.5" />
            Estate Providers
          </button>
          <button
            onClick={() => setAdminTab("pending")}
            className={`flex-1 text-xs py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              adminTab === "pending"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-pending-providers"
          >
            <Clock className="w-3.5 h-3.5" />
            Pending
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-medium">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab("browse")}
            className={`flex-1 text-xs py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              adminTab === "browse"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-browse-providers"
          >
            <Search className="w-3.5 h-3.5" />
            Browse & Add
          </button>
          <button
            onClick={() => setAdminTab("invitations")}
            className={`flex-1 text-xs py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              adminTab === "invitations"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-invitations"
          >
            <Inbox className="w-3.5 h-3.5" />
            Invites
          </button>
        </div>
      )}

      {(!isEstateAdmin || !currentEstate || adminTab === "providers") && (
        <>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-provider-search"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="rounded-xl w-auto min-w-[140px] h-9 text-xs" data-testid="select-filter-category">
                  <Filter className="w-3 h-3 mr-1.5" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {activeCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryIcons[c] || "📋"} {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ServicesFilter selectedServices={servicesFilter} onChange={setServicesFilter} />

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="rounded-xl w-auto min-w-[120px] h-9 text-xs" data-testid="select-filter-rating">
                  <Star className="w-3 h-3 mr-1.5" />
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="2">2+ Stars</SelectItem>
                  <SelectItem value="1">1+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
                <Store className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No providers found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || categoryFilter !== "all" || ratingFilter !== "all" || servicesFilter.length > 0
                  ? "Try adjusting your filters"
                  : currentEstate
                    ? "Add providers from the Browse tab to get started"
                    : "Join an estate to see providers"}
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((provider) => {
                const reviews = getProviderReviews(provider.id);
                const avgRating = getAverageRating(provider.id);

                return (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    reviews={reviews}
                    avgRating={avgRating}
                    onClick={() => setSelectedProviderId(provider.id)}
                    tierName={(provider as any)._tierName || undefined}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {isEstateAdmin && currentEstate && adminTab === "pending" && (
        <AdminPendingTab estateId={currentEstate.id} />
      )}
      {isEstateAdmin && currentEstate && adminTab === "browse" && (
        <AdminBrowseTab estateId={currentEstate.id} />
      )}
      {isEstateAdmin && currentEstate && adminTab === "invitations" && (
        <AdminInvitationsTab estateId={currentEstate.id} />
      )}
    </div>
  );
}
