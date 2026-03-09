import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOutages } from "@/hooks/use-outages";
import { useEstate } from "@/lib/estate-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Droplets,
  Wifi,
  Flame,
  AlertTriangle,
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  Camera,
  X,
  Bell,
  BellOff,
  List,
  Map as MapIcon,
  Filter,
  Image as ImageIcon,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outage } from "@shared/schema";

const typeIcons: Record<string, any> = {
  electricity: Zap,
  water: Droplets,
  internet: Wifi,
  gas: Flame,
  other: AlertTriangle,
};

const typeColors: Record<string, string> = {
  electricity: "bg-yellow-500",
  water: "bg-blue-500",
  internet: "bg-purple-500",
  gas: "bg-orange-500",
  other: "bg-gray-500",
};

const typeMarkerColors: Record<string, string> = {
  electricity: "#eab308",
  water: "#3b82f6",
  internet: "#a855f7",
  gas: "#f97316",
  other: "#6b7280",
};

function OutageMap({ outages }: { outages: Outage[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const LRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      LRef.current = L.default || L;
      setLeafletLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;
    const L = LRef.current;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([-26.2041, 28.0473], 12);

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const outagesWithCoords = outages.filter((o) => o.lat && o.lng);

    outagesWithCoords.forEach((outage) => {
      const color = typeMarkerColors[outage.type] || "#6b7280";
      const Icon = typeIcons[outage.type];

      const icon = L.divIcon({
        className: "custom-outage-marker",
        html: `<div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: ${color}; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          animation: markerPulse 2s ease-in-out infinite;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${outage.type === "electricity" ? '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>' :
              outage.type === "water" ? '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>' :
              outage.type === "internet" ? '<path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>' :
              outage.type === "gas" ? '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>' :
              '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'
            }
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupEl = document.createElement("div");
      popupEl.style.minWidth = "180px";

      const titleEl = document.createElement("strong");
      titleEl.style.fontSize = "13px";
      titleEl.textContent = outage.title;
      popupEl.appendChild(titleEl);

      const metaEl = document.createElement("p");
      metaEl.style.cssText = "font-size: 11px; color: #666; margin: 4px 0; text-transform: capitalize";
      metaEl.textContent = `${outage.type} · ${outage.status}`;
      popupEl.appendChild(metaEl);

      if (outage.description) {
        const descEl = document.createElement("p");
        descEl.style.cssText = "font-size: 12px; margin: 4px 0";
        descEl.textContent = outage.description;
        popupEl.appendChild(descEl);
      }
      if (outage.address) {
        const addrEl = document.createElement("p");
        addrEl.style.cssText = "font-size: 11px; color: #888";
        addrEl.textContent = `📍 ${outage.address}`;
        popupEl.appendChild(addrEl);
      }
      if (outage.photoUrl) {
        const imgEl = document.createElement("img");
        imgEl.src = outage.photoUrl;
        imgEl.style.cssText = "width:100%; border-radius: 6px; margin-top: 6px";
        imgEl.alt = "Outage photo";
        popupEl.appendChild(imgEl);
      }

      const marker = L.marker([parseFloat(outage.lat!), parseFloat(outage.lng!)], { icon })
        .addTo(mapRef.current)
        .bindPopup(popupEl);

      markersRef.current.push(marker);
    });

    if (outagesWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        outagesWithCoords.map((o) => [parseFloat(o.lat!), parseFloat(o.lng!)])
      );
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [outages, leafletLoaded]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full rounded-xl overflow-hidden"
      data-testid="map-container"
      style={{ minHeight: 300 }}
    />
  );
}

function ReportOutageModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentEstate } = useEstate();
  const { createOutage } = useOutages();
  const [type, setType] = useState("electricity");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("type", type);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("address", address);
    formData.append("estateId", currentEstate?.id || "null");
    formData.append("lat", (-26.2 + (Math.random() - 0.5) * 0.1).toString());
    formData.append("lng", (28.05 + (Math.random() - 0.5) * 0.1).toString());
    if (photo) formData.append("photo", photo);

    createOutage.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
        setTitle("");
        setDescription("");
        setAddress("");
        setType("electricity");
        removePhoto();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl glass-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Report Outage
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm">Outage Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-alert-type" className="rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electricity">⚡ Electricity</SelectItem>
                <SelectItem value="water">💧 Water</SelectItem>
                <SelectItem value="internet">📡 Internet</SelectItem>
                <SelectItem value="gas">🔥 Gas</SelectItem>
                <SelectItem value="other">⚠️ Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Title</Label>
            <Input
              data-testid="input-alert-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Power outage on Main St"
              className="rounded-xl mt-1.5"
              required
            />
          </div>

          <div>
            <Label className="text-sm">Description</Label>
            <Textarea
              data-testid="input-alert-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the outage..."
              className="rounded-xl mt-1.5 resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-alert-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address or area"
                className="pl-10 rounded-xl mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">Photo (optional)</Label>
            <div className="mt-1.5">
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                    data-testid="button-remove-photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  data-testid="button-upload-photo"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Tap to add photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                data-testid="input-photo-file"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl gradient-teal text-white"
            disabled={createOutage.isPending}
            data-testid="button-submit-alert"
          >
            {createOutage.isPending ? "Reporting..." : "Report Outage"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AlertBanner({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-center justify-between gap-3"
      data-testid="alert-banner"
    >
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="text-sm font-medium text-red-600 dark:text-red-400">
          {count} active outage{count !== 1 ? "s" : ""} in your area
        </span>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function AlertsPage() {
  const { outages, activeOutages, resolvedOutages, isLoading, scopeLabel } = useOutages(10000);
  const [view, setView] = useState<"map" | "list">("map");
  const [reportOpen, setReportOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();
  const prevCountRef = useRef(activeOutages.length);

  useEffect(() => {
    if (activeOutages.length > prevCountRef.current && !bannerDismissed) {
      toast({
        title: "New outage reported",
        description: `A new outage has been reported in ${scopeLabel}`,
      });
    }
    prevCountRef.current = activeOutages.length;
  }, [activeOutages.length]);

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({ title: "Notifications enabled", description: "You'll be alerted about new outages" });
      } else {
        toast({ title: "Notifications blocked", description: "Enable notifications in browser settings", variant: "destructive" });
      }
    }
  };

  const filtered = filterType === "all"
    ? outages
    : outages.filter((o) => o.type === filterType);

  const filteredActive = filtered.filter((o) => o.status !== "resolved");
  const filteredResolved = filtered.filter((o) => o.status === "resolved");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-alerts-heading">Outage Alerts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Live outages in <span className="font-medium text-foreground">{scopeLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={requestNotifications}
            data-testid="button-toggle-notifications"
          >
            {notificationsEnabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {!bannerDismissed && activeOutages.length > 0 && (
          <AlertBanner count={activeOutages.length} onDismiss={() => setBannerDismissed(true)} />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <div className="glass-card rounded-xl p-1 flex gap-0.5">
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === "map" ? "gradient-teal text-white" : "text-muted-foreground"
            }`}
            data-testid="button-view-map"
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              view === "list" ? "gradient-teal text-white" : "text-muted-foreground"
            }`}
            data-testid="button-view-list"
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs" data-testid="select-filter-type">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="electricity">Electricity</SelectItem>
            <SelectItem value="water">Water</SelectItem>
            <SelectItem value="internet">Internet</SelectItem>
            <SelectItem value="gas">Gas</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <div className="glass-card rounded-xl px-3 py-1.5 text-xs text-muted-foreground" data-testid="text-outage-count">
          {activeOutages.length} active
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : view === "map" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-xl overflow-hidden"
          style={{ height: 400 }}
        >
          <OutageMap outages={filtered.filter((o) => o.status !== "resolved")} />
        </motion.div>
      ) : null}

      {!isLoading && (
        <div className="space-y-4">
          {filteredActive.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active ({filteredActive.length})
              </h2>
              <div className="space-y-3">
                {filteredActive.map((outage, i) => {
                  const Icon = typeIcons[outage.type] || AlertTriangle;
                  const color = typeColors[outage.type] || "bg-gray-500";
                  return (
                    <motion.div
                      key={outage.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      layout
                    >
                      <div className="glass-card rounded-xl p-4" data-testid={`alert-card-${outage.id}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">{outage.title}</p>
                                <p className="text-xs text-muted-foreground capitalize mt-0.5">{outage.type}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                outage.status === "confirmed"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                {outage.status}
                              </span>
                            </div>
                            {outage.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{outage.description}</p>
                            )}
                            {outage.photoUrl && (
                              <img src={outage.photoUrl} alt="" className="mt-2 rounded-lg w-full max-h-40 object-cover" data-testid={`alert-photo-${outage.id}`} />
                            )}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {outage.address && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{outage.address}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {outage.createdAt ? new Date(outage.createdAt).toLocaleString() : "Recently"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredResolved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Resolved ({filteredResolved.length})
              </h2>
              <div className="space-y-2">
                {filteredResolved.map((outage) => {
                  const Icon = typeIcons[outage.type] || AlertTriangle;
                  return (
                    <div
                      key={outage.id}
                      className="rounded-xl border border-border/40 p-3 opacity-60"
                      data-testid={`alert-resolved-${outage.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{outage.title}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">Resolved</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">All Clear</h3>
              <p className="text-sm text-muted-foreground">No outages reported in {scopeLabel}</p>
            </motion.div>
          )}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setReportOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full gradient-teal text-white shadow-lg shadow-primary/25 flex items-center justify-center z-40"
        data-testid="fab-report-outage"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <ReportOutageModal open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}
