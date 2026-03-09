import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEstate } from "@/lib/estate-context";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  "Other",
];

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${s} ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewDialog({ providerId }: { providerId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      setOpen(false);
      setRating(5);
      setComment("");
      toast({ title: "Review submitted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`button-review-${providerId}`} className="text-xs gap-1">
          <MessageSquare className="w-3 h-3" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Rating</Label>
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  data-testid={`button-star-${i + 1}`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      i < rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted text-muted"
                    }`}
                  />
                </button>
              ))}
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
      </DialogContent>
    </Dialog>
  );
}

export default function ProvidersPage() {
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
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
      email: email || null,
      website: website || null,
      description: description || null,
      estateId: currentEstate?.id || null,
    });
  };

  const filtered = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProviderReviews = (providerId: string) =>
    allReviews.filter((r) => r.providerId === providerId);

  const getAverageRating = (providerId: string) => {
    const reviews = getProviderReviews(providerId);
    if (reviews.length === 0) return 0;
    return Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-muted-foreground text-sm mt-1">Find trusted service providers in your area</p>
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
                        {c}
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
                    placeholder="Phone number"
                    className="rounded-lg mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input
                    data-testid="input-provider-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-lg mt-1.5"
                  />
                </div>
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
                  placeholder="Brief description..."
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
            {searchQuery ? "Try a different search" : "Add your first service provider"}
          </p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((provider, i) => {
            const reviews = getProviderReviews(provider.id);
            const avgRating = getAverageRating(provider.id);

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className="glass-card rounded-xl p-5"
                  data-testid={`provider-card-${provider.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{provider.name}</h3>
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-1">
                        {provider.category}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StarRating rating={avgRating} />
                      <span className="text-xs text-muted-foreground">
                        {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {provider.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {provider.description}
                    </p>
                  )}

                  <div className="space-y-1.5 mb-3">
                    {provider.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{provider.phone}</span>
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{provider.email}</span>
                      </div>
                    )}
                    {provider.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary"
                        >
                          {provider.website}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border/40 pt-3 flex justify-end">
                    <ReviewDialog providerId={provider.id} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
