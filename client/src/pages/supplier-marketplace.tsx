import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isPast } from "date-fns";
import {
  Plus,
  ShoppingBag,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image,
  Phone,
  MessageSquare,
  Mail,
  Globe,
  Tag,
  AlertCircle,
  X,
  Calendar,
  DollarSign,
  Upload,
  Link,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MarketplaceListing } from "@shared/schema";

const LISTING_TYPES = ["promotion", "service", "product", "combo", "announcement"] as const;
const CTA_TYPES = ["call", "whatsapp", "email", "website"] as const;

const listingTypeColors: Record<string, string> = {
  promotion: "bg-amber-500",
  service: "bg-blue-500",
  product: "bg-purple-500",
  combo: "bg-teal-500",
  announcement: "bg-gray-500",
};

const ctaIcons: Record<string, typeof Phone> = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  website: Globe,
};

const formSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().min(5, "Description is required"),
  listingType: z.enum(LISTING_TYPES),
  imageUrl: z.string().optional(),
  priceRands: z.string().optional(),
  originalPriceRands: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  ctaType: z.enum(CTA_TYPES),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function toRands(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function toCents(rands: string | undefined): number | null {
  if (!rands || rands.trim() === "") return null;
  const val = parseFloat(rands);
  if (isNaN(val)) return null;
  return Math.round(val * 100);
}

function toDateInput(ts: Date | null | undefined): string {
  if (!ts) return "";
  try {
    return format(new Date(ts), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function getExpiryChip(validUntil: Date | null | undefined) {
  if (!validUntil) return null;
  const d = new Date(validUntil);
  if (isPast(d)) return { text: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 7) return { text: `Expires in ${diff}d`, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return { text: `Until ${format(d, "d MMM yyyy")}`, color: "bg-muted text-muted-foreground" };
}

function ListingCard({
  listing,
  onEdit,
  onDelete,
  onToggle,
}: {
  listing: MarketplaceListing;
  onEdit: (l: MarketplaceListing) => void;
  onDelete: (l: MarketplaceListing) => void;
  onToggle: (l: MarketplaceListing) => void;
}) {
  const expiry = getExpiryChip(listing.validUntil);
  const expired = listing.validUntil && isPast(new Date(listing.validUntil));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl overflow-hidden ${!listing.isActive || expired ? "opacity-60" : ""}`}
      data-testid={`listing-card-${listing.id}`}
    >
      {listing.imageUrl && (
        <div className="aspect-[16/7] overflow-hidden bg-muted/30">
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full capitalize ${listingTypeColors[listing.listingType] || "bg-gray-500"}`} data-testid={`badge-type-${listing.id}`}>
            {listing.listingType}
          </span>
          {!listing.isActive && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>
          )}
          {expired && listing.isActive && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</span>
          )}
        </div>
        <h3 className="font-semibold text-sm leading-tight mb-1" data-testid={`text-listing-title-${listing.id}`}>{listing.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>

        <div className="flex items-center gap-3 mb-3">
          {listing.price != null && (
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-foreground" data-testid={`text-price-${listing.id}`}>
                R{(listing.price / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </span>
              {listing.originalPrice != null && (
                <span className="text-xs text-muted-foreground line-through">
                  R{(listing.originalPrice / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          )}
          {expiry && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${expiry.color}`} data-testid={`chip-expiry-${listing.id}`}>
              {expiry.text}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              data-testid={`button-toggle-${listing.id}`}
              onClick={() => onToggle(listing)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {listing.isActive ? (
                <ToggleRight className="w-4 h-4 text-teal-600" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              {listing.isActive ? "Active" : "Inactive"}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg"
              onClick={() => onEdit(listing)}
              data-testid={`button-edit-${listing.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600"
              onClick={() => onDelete(listing)}
              data-testid={`button-delete-${listing.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const { toast } = useToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/marketplace/upload-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      const { url } = await res.json();
      onChange(url);
      setShowUrlInput(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden bg-muted/30 aspect-[16/7] border border-border">
          <img src={value} alt="Listing preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => { onChange(""); setShowUrlInput(false); }}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
            data-testid="button-remove-image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          disabled={uploading}
        >
          <Upload className="w-3 h-3" />
          Replace photo
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} data-testid="input-image-file" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className="border-2 border-dashed border-border hover:border-teal-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors group"
        data-testid="zone-image-upload"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <Upload className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-sm font-medium">Upload a photo</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · max 10 MB</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} data-testid="input-image-file" />

      <button
        type="button"
        onClick={() => setShowUrlInput((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-toggle-url-input"
      >
        <Link className="w-3 h-3" />
        {showUrlInput ? "Hide URL input" : "Or paste an image URL"}
      </button>

      {showUrlInput && (
        <div className="relative">
          <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="pl-9 rounded-xl"
            data-testid="input-listing-image-url"
          />
        </div>
      )}
    </div>
  );
}

function ListingFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: MarketplaceListing | null;
}) {
  const { toast } = useToast();
  const isEdit = !!editing;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      listingType: (editing?.listingType as typeof LISTING_TYPES[number]) ?? "promotion",
      imageUrl: editing?.imageUrl ?? "",
      priceRands: toRands(editing?.price),
      originalPriceRands: toRands(editing?.originalPrice),
      validFrom: toDateInput(editing?.validFrom),
      validUntil: toDateInput(editing?.validUntil),
      ctaType: (editing?.ctaType as typeof CTA_TYPES[number]) ?? "call",
      isActive: editing?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      listingType: (editing?.listingType as typeof LISTING_TYPES[number]) ?? "promotion",
      imageUrl: editing?.imageUrl ?? "",
      priceRands: toRands(editing?.price),
      originalPriceRands: toRands(editing?.originalPrice),
      validFrom: toDateInput(editing?.validFrom),
      validUntil: toDateInput(editing?.validUntil),
      ctaType: (editing?.ctaType as typeof CTA_TYPES[number]) ?? "call",
      isActive: editing?.isActive ?? true,
    });
  }, [editing, open]);

  type ListingPayload = {
    title: string;
    description: string;
    listingType: string;
    imageUrl: string | null;
    price: number | null;
    originalPrice: number | null;
    validFrom: string | null;
    validUntil: string | null;
    ctaType: string;
    isActive: boolean;
  };

  const createMutation = useMutation({
    mutationFn: (data: ListingPayload) => apiRequest("POST", "/api/marketplace/listings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Listing created", description: "Your listing is now live." });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ListingPayload) => apiRequest("PATCH", `/api/marketplace/listings/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Listing updated" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      description: values.description,
      listingType: values.listingType,
      imageUrl: values.imageUrl || null,
      price: toCents(values.priceRands),
      originalPrice: toCents(values.originalPriceRands),
      validFrom: values.validFrom || null,
      validUntil: values.validUntil || null,
      ctaType: values.ctaType,
      isActive: values.isActive,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Listing" : "Create Listing"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="listingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-listing-type" className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LISTING_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ctaType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cta-type" className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CTA_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 20% off pool cleaning this month" className="rounded-xl" data-testid="input-listing-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe the offer or service..." className="rounded-xl resize-none" rows={3} data-testid="input-listing-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo (optional)</FormLabel>
                  <FormControl>
                    <ImageUploadField value={field.value ?? ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priceRands"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (R, optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input {...field} placeholder="0.00" className="pl-9 rounded-xl" type="number" step="0.01" min="0" data-testid="input-listing-price" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originalPriceRands"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price (R)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input {...field} placeholder="0.00" className="pl-9 rounded-xl" type="number" step="0.01" min="0" data-testid="input-listing-original-price" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input {...field} type="date" className="pl-9 rounded-xl" data-testid="input-listing-valid-from" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input {...field} type="date" className="pl-9 rounded-xl" data-testid="input-listing-valid-until" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      data-testid="toggle-listing-active"
                      onClick={() => field.onChange(!field.value)}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      {field.value ? (
                        <ToggleRight className="w-6 h-6 text-teal-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                      )}
                      {field.value ? "Active (visible to residents)" : "Inactive (hidden)"}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose} data-testid="button-cancel-listing">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-xl gradient-teal text-white" disabled={isPending} data-testid="button-save-listing">
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Listing"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierMarketplacePage() {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);

  const { data: listings = [], isLoading, isError } = useQuery<MarketplaceListing[]>({
    queryKey: ["/api/marketplace/my-listings"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/marketplace/listings/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/marketplace/listings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      toast({ title: "Listing deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function handleEdit(listing: MarketplaceListing) {
    setEditingListing(listing);
    setShowModal(true);
  }

  function handleDelete(listing: MarketplaceListing) {
    if (confirm(`Delete "${listing.title}"?`)) {
      deleteMutation.mutate(listing.id);
    }
  }

  function handleToggle(listing: MarketplaceListing) {
    toggleMutation.mutate({ id: listing.id, isActive: !listing.isActive });
  }

  function handleCreate() {
    setEditingListing(null);
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-supplier-marketplace-heading">Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your promotional listings for estate residents</p>
        </div>
        <Button
          onClick={handleCreate}
          className="rounded-xl gradient-teal text-white gap-2 shrink-0"
          data-testid="button-create-listing"
        >
          <Plus className="w-4 h-4" />
          Create Listing
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/50 mb-3" />
          <h3 className="font-semibold mb-1">Failed to load listings</h3>
          <p className="text-sm text-muted-foreground">Please refresh to try again</p>
        </div>
      ) : listings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No listings yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first listing to promote your services to estate residents</p>
          <Button onClick={handleCreate} className="rounded-xl gradient-teal text-white gap-2" data-testid="button-create-first-listing">
            <Plus className="w-4 h-4" />
            Create Your First Listing
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ListingFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingListing(null); }}
        editing={editingListing}
      />
    </div>
  );
}
