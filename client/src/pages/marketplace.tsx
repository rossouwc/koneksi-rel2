import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Search,
  ExternalLink,
  Star,
  Filter,
  Droplets,
  Sun,
  Shield,
  Wrench,
  Zap,
  Thermometer,
  Wifi,
  Lock,
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

interface MarketplaceItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  affiliateUrl: string;
}

const categories = ["All", "Water", "Solar", "Security", "Smart Home", "Tools", "Safety"];

const categoryIcons: Record<string, typeof Droplets> = {
  Water: Droplets,
  Solar: Sun,
  Security: Shield,
  "Smart Home": Wifi,
  Tools: Wrench,
  Safety: Lock,
};

const items: MarketplaceItem[] = [
  {
    id: "1",
    name: "JoJo 2500L Water Tank",
    price: 4999,
    description: "Durable polyethylene water storage tank. UV-stabilized, food-grade safe. Perfect for estate rainwater harvesting.",
    category: "Water",
    rating: 4.7,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1585687433984-a73234bf8d0e?w=400&h=300&fit=crop",
    badge: "Best Seller",
    affiliateUrl: "#",
  },
  {
    id: "2",
    name: "Solar LED Garden Lights (6-Pack)",
    price: 349,
    description: "Waterproof solar-powered pathway lights. Auto on/off at dusk/dawn. Stainless steel finish.",
    category: "Solar",
    rating: 4.5,
    reviews: 189,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "3",
    name: "Smart Water Leak Detector",
    price: 699,
    description: "WiFi-enabled leak sensor with instant app alerts. Place near geysers, washing machines, or under sinks.",
    category: "Smart Home",
    rating: 4.8,
    reviews: 156,
    badge: "Top Rated",
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "4",
    name: "Solar Panel Kit 100W",
    price: 2499,
    description: "Monocrystalline solar panel with charge controller. Ideal for load shedding backup power systems.",
    category: "Solar",
    rating: 4.6,
    reviews: 312,
    badge: "Popular",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "5",
    name: "Security Camera System (4 Cam)",
    price: 3999,
    description: "1080p HD wireless cameras with night vision, motion detection, and 30-day cloud recording.",
    category: "Security",
    rating: 4.4,
    reviews: 278,
    image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "6",
    name: "Smart Geyser Timer",
    price: 899,
    description: "Programmable geyser controller. Save up to 40% on water heating costs. Easy DIY installation.",
    category: "Smart Home",
    rating: 4.7,
    reviews: 445,
    badge: "Saves Money",
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "7",
    name: "Emergency Power Station 500W",
    price: 5999,
    description: "Portable lithium battery power station. Powers lights, WiFi, and devices during load shedding. Solar-chargeable.",
    category: "Solar",
    rating: 4.9,
    reviews: 167,
    badge: "Premium",
    image: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "8",
    name: "Plumber's Emergency Kit",
    price: 449,
    description: "Complete DIY pipe repair kit with tape, clamps, sealant, and tools. Fix leaks before the plumber arrives.",
    category: "Tools",
    rating: 4.3,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "9",
    name: "Smart Gate Motor",
    price: 6499,
    description: "Solar-compatible sliding gate motor with battery backup. App-controlled access for estate gates.",
    category: "Security",
    rating: 4.6,
    reviews: 134,
    image: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "10",
    name: "Fire Extinguisher 4.5kg",
    price: 399,
    description: "DCP fire extinguisher, SABS approved. Essential for every home. 5-year warranty included.",
    category: "Safety",
    rating: 4.8,
    reviews: 521,
    badge: "Essential",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "11",
    name: "Water Pressure Booster Pump",
    price: 1899,
    description: "Automatic booster pump for low water pressure areas. Quiet operation, energy efficient, auto shut-off.",
    category: "Water",
    rating: 4.5,
    reviews: 203,
    image: "https://images.unsplash.com/photo-1585687433984-a73234bf8d0e?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
  {
    id: "12",
    name: "Smart Doorbell Camera",
    price: 1299,
    description: "HD video doorbell with two-way audio, motion alerts, and night vision. Works with WiFi.",
    category: "Security",
    rating: 4.7,
    reviews: 389,
    badge: "Popular",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop",
    affiliateUrl: "#",
  },
];

const badgeColors: Record<string, string> = {
  "Best Seller": "bg-emerald-500",
  "Top Rated": "bg-amber-500",
  Popular: "bg-blue-500",
  Premium: "bg-purple-500",
  "Saves Money": "bg-teal-500",
  Essential: "bg-red-500",
};

function ProductCard({ item, index }: { item: MarketplaceItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <div className="glass-card rounded-2xl overflow-hidden group" data-testid={`product-card-${item.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {item.badge && (
            <span className={`absolute top-2 left-2 text-[10px] font-bold text-white px-2.5 py-1 rounded-full ${badgeColors[item.badge] || "bg-primary"}`} data-testid={`badge-${item.id}`}>
              {item.badge}
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`text-product-name-${item.id}`}>
              {item.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{item.rating}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">({item.reviews})</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
              {item.category}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-lg font-bold text-foreground" data-testid={`text-price-${item.id}`}>
                R{item.price.toLocaleString()}
              </span>
            </div>
            <a href={item.affiliateUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="rounded-xl gradient-teal text-white text-xs gap-1.5"
                data-testid={`button-buy-${item.id}`}
              >
                <ExternalLink className="w-3 h-3" />
                View Deal
              </Button>
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-marketplace-heading">Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Essential products for your estate and home
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-marketplace-search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="rounded-xl w-auto min-w-[140px] h-10" data-testid="select-marketplace-category">
            <Filter className="w-3 h-3 mr-1.5" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categories.map((cat) => {
          const isActive = categoryFilter === cat;
          const Icon = categoryIcons[cat];
          return (
            <button
              key={cat}
              data-testid={`filter-chip-${cat.toLowerCase().replace(/\s/g, "-")}`}
              onClick={() => setCategoryFilter(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "gradient-teal text-white"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {cat}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No products found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filtered.map((item, i) => (
            <ProductCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
