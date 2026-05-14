import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentEstate } from "@/lib/estate-context";
import { motion } from "framer-motion";
import { format, isPast, differenceInDays } from "date-fns";
import {
  ShoppingBag,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Mail,
  Globe,
  AlertCircle,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LISTING_TYPES = ["All", "promotion", "service", "product", "combo", "announcement"] as const;

const listingTypeColors: Record<string, string> = {
  promotion: "bg-amber-500",
  service: "bg-blue-500",
  product: "bg-purple-500",
  combo: "bg-teal-500",
  announcement: "bg-gray-500",
};

const listingTypeLabels: Record<string, string> = {
  promotion: "Promotion",
  service: "Service",
  product: "Product",
  combo: "Combo",
  announcement: "Announcement",
};

function getExpiryChip(validUntil: string | null | undefined) {
  if (!validUntil) return null;
  const d = new Date(validUntil);
  if (isPast(d)) {
    return { text: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  }
  const diff = differenceInDays(d, new Date());
  if (diff <= 7) {
    return { text: `Expires in ${diff}d`, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  }
  return { text: `Until ${format(d, "d MMM yyyy")}`, color: "bg-muted text-muted-foreground" };
}

interface ListingItem {
  id: string;
  providerId: string;
  title: string;
  description: string;
  listingType: string;
  imageUrl: string | null;
  additionalPhotos: string[] | null;
  price: number | null;
  originalPrice: number | null;
  validFrom: string | null;
  validUntil: string | null;
  ctaType: string;
  isActive: boolean;
  createdAt: string;
  providerName: string;
  providerCategory: string;
  providerPhone: string | null;
  providerWhatsapp: string | null;
  providerEmail: string | null;
  providerWebsite: string | null;
  providerLogoUrl: string | null;
}

function getCtaAction(listing: ListingItem): { href: string; label: string; icon: typeof Phone; disabled: boolean } {
  switch (listing.ctaType) {
    case "whatsapp": {
      const num = (listing.providerWhatsapp || listing.providerPhone || "").replace(/\D/g, "");
      return { href: num ? `https://wa.me/${num}` : "#", label: "WhatsApp", icon: MessageSquare, disabled: !num };
    }
    case "email":
      return { href: listing.providerEmail ? `mailto:${listing.providerEmail}` : "#", label: "Email", icon: Mail, disabled: !listing.providerEmail };
    case "website":
      return { href: listing.providerWebsite || "#", label: "Visit", icon: Globe, disabled: !listing.providerWebsite };
    default:
      return { href: listing.providerPhone ? `tel:${listing.providerPhone}` : "#", label: "Call", icon: Phone, disabled: !listing.providerPhone };
  }
}

function ListingCard({ listing, index }: { listing: ListingItem; index: number }) {
  const expiry = getExpiryChip(listing.validUntil);
  const expired = listing.validUntil && isPast(new Date(listing.validUntil));
  const cta = getCtaAction(listing);
  const CtaIcon = cta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -4 }}
      data-testid={`listing-card-${listing.id}`}
    >
      <div className={`glass-card rounded-2xl overflow-hidden group h-full flex flex-col ${expired ? "opacity-70" : ""}`}>
        {listing.imageUrl && (
          <div className="relative aspect-[16/9] overflow-hidden bg-muted/30 shrink-0">
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {listing.additionalPhotos && listing.additionalPhotos.length > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white rounded-full px-2 py-0.5 text-[10px] font-medium">
                <Images className="w-3 h-3" />
                +{listing.additionalPhotos.length}
              </div>
            )}
          </div>
        )}
        {!listing.imageUrl && listing.additionalPhotos && listing.additionalPhotos.length > 0 && (
          <div className="relative aspect-[16/9] overflow-hidden bg-muted/30 shrink-0">
            <img
              src={listing.additionalPhotos[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {listing.additionalPhotos.length > 1 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white rounded-full px-2 py-0.5 text-[10px] font-medium">
                <Images className="w-3 h-3" />
                +{listing.additionalPhotos.length - 1}
              </div>
            )}
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full capitalize ${listingTypeColors[listing.listingType] || "bg-gray-500"}`}
              data-testid={`badge-type-${listing.id}`}
            >
              {listingTypeLabels[listing.listingType] || listing.listingType}
            </span>
            {expired && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center ${listing.providerLogoUrl ? "bg-white dark:bg-zinc-800 ring-1 ring-border" : "bg-gradient-to-br from-teal-600/20 to-emerald-700/20"}`}>
              {listing.providerLogoUrl ? (
                <img src={listing.providerLogoUrl} alt={listing.providerName} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 uppercase">
                  {listing.providerName.charAt(0)}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide" data-testid={`text-provider-name-${listing.id}`}>
              {listing.providerName} · {listing.providerCategory}
            </p>
          </div>

          <h3 className="font-semibold text-sm leading-tight mb-1" data-testid={`text-listing-title-${listing.id}`}>
            {listing.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {listing.description}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              {listing.price != null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold" data-testid={`text-price-${listing.id}`}>
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium self-start ${expiry.color}`} data-testid={`chip-expiry-${listing.id}`}>
                  {expiry.text}
                </span>
              )}
            </div>
            {!expired && !cta.disabled && (
              <a href={cta.href} target="_blank" rel="noopener noreferrer">
                <Button
                  size="sm"
                  className="rounded-xl gradient-teal text-white text-xs gap-1.5 shrink-0"
                  data-testid={`button-cta-${listing.id}`}
                >
                  <CtaIcon className="w-3 h-3" />
                  {cta.label}
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const { estateId, propertyId, isPersonalMode } = useCurrentEstate();

  // Always build a unique URL per context so React Query never serves a stale
  // cross-context cache hit. Only estateId contexts return real data; property
  // and personal contexts return [] from the backend.
  const listingsUrl = estateId
    ? `/api/marketplace/listings?estateId=${estateId}`
    : isPersonalMode
      ? `/api/marketplace/listings?context=personal`
      : `/api/marketplace/listings?context=property-${propertyId}`;

  const { data: listings = [], isLoading, isError } = useQuery<ListingItem[]>({
    queryKey: [listingsUrl],
  });

  const filtered = listings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || item.listingType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-marketplace-heading">Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deals and services from suppliers active in your estate
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-marketplace-search"
            placeholder="Search listings or suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="rounded-xl w-auto min-w-[150px] h-10" data-testid="select-marketplace-type">
            <Filter className="w-3 h-3 mr-1.5" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {LISTING_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "All" ? "All Types" : listingTypeLabels[t] || t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {LISTING_TYPES.map((type) => {
          const isActive = typeFilter === type;
          return (
            <button
              key={type}
              data-testid={`filter-chip-${type.toLowerCase()}`}
              onClick={() => setTypeFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "gradient-teal text-white"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {type === "All" ? "All" : listingTypeLabels[type] || type}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/50 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Could not load marketplace</h3>
          <p className="text-sm text-muted-foreground">Please check your connection and refresh</p>
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
          <p className="text-sm text-muted-foreground">Suppliers in your estate haven't posted any listings yet. Check back later!</p>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No listings found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <ListingCard key={item.id} listing={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
