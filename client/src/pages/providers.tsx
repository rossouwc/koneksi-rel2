import { useState, useMemo } from "react";
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
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
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
  const { user } = useAuth();
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
            <div className="w-14 h-14 rounded-2xl gradient-teal-subtle flex items-center justify-center text-2xl flex-shrink-0">
              {icon}
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

function ProviderCard({
  provider,
  reviews,
  avgRating,
  onClick,
}: {
  provider: Provider;
  reviews: Review[];
  avgRating: number;
  onClick: () => void;
}) {
  const icon = categoryIcons[provider.category.toLowerCase()] || "📋";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="glass-card rounded-xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={onClick}
        data-testid={`provider-card-${provider.id}`}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl gradient-teal-subtle flex items-center justify-center text-lg flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-0.5">
              {provider.category}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-[10px] text-muted-foreground">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"} · {reviews.length}
            </span>
          </div>
        </div>

        {provider.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{provider.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-call-${provider.id}`}
            >
              <Button variant="outline" size="sm" className="rounded-lg h-7 text-[10px] gap-1 px-2">
                <Phone className="w-3 h-3" />
                Call
              </Button>
            </a>
          )}
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
                size="sm"
                className="rounded-lg h-7 text-[10px] gap-1 px-2 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
              >
                <SiWhatsapp className="w-3 h-3" />
                WhatsApp
              </Button>
            </a>
          )}
          {provider.email && (
            <a
              href={`mailto:${provider.email}`}
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-email-${provider.id}`}
            >
              <Button variant="outline" size="sm" className="rounded-lg h-7 text-[10px] gap-1 px-2">
                <Mail className="w-3 h-3" />
                Email
              </Button>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ProvidersPage() {
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const providersUrl = currentEstate ? `/api/providers?estateId=${currentEstate.id}` : "/api/providers";
  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: [providersUrl],
  });

  const { data: allReviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/providers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [providersUrl] });
      setDialogOpen(false);
      setName("");
      setCategory("");
      setPhone("");
      setWhatsapp("");
      setEmail("");
      setWebsite("");
      setDescription("");
      toast({ title: "Provider added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      category,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      website: website || null,
      description: description || null,
      estateId: currentEstate?.id || null,
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
    return providers.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === "all" || p.category.toLowerCase() === categoryFilter.toLowerCase();

      const avg = getAverageRating(p.id);
      const matchesRating = ratingFilter === "all" || avg >= parseInt(ratingFilter);

      return matchesSearch && matchesCategory && matchesRating;
    });
  }, [providers, searchQuery, categoryFilter, ratingFilter, allReviews]);

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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-teal text-white" data-testid="button-add-provider">
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Provider</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm">Name</Label>
                <Input
                  data-testid="input-provider-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27..."
                    className="rounded-lg mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">WhatsApp</Label>
                  <Input
                    data-testid="input-provider-whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@provider.co.za"
                  className="rounded-lg mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm">Website</Label>
                <Input
                  data-testid="input-provider-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="rounded-lg mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea
                  data-testid="input-provider-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of services..."
                  className="rounded-lg mt-1.5 resize-none"
                  rows={2}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl gradient-teal text-white"
                disabled={createMutation.isPending}
                data-testid="button-submit-provider"
              >
                {createMutation.isPending ? "Adding..." : "Add Provider"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            {searchQuery || categoryFilter !== "all" || ratingFilter !== "all"
              ? "Try adjusting your filters"
              : "Add your first service provider"}
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
