import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEstate } from "@/lib/estate-context";
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
  CalendarClock,
  Activity,
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
import type { Outage } from "@shared/schema";
import EspAreaLinker from "@/components/esp-area-linker";

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

function getStageColor(stage: number): string {
  if (stage === 0) return "text-emerald-600 dark:text-emerald-400";
  if (stage <= 2) return "text-yellow-600 dark:text-yellow-400";
  if (stage <= 4) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getStageBg(stage: number): string {
  if (stage === 0) return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
  if (stage <= 2) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  if (stage <= 4) return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
}

function parseStage(stageStr: string): number {
  const match = stageStr?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatEventTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return isoStr;
  }
}

function formatEventDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

interface EspEvent {
  note: string;
  start: string;
  end: string;
}

interface EspAreaInfo {
  events: EspEvent[];
  info: { name: string; region: string };
  schedule: { days: { date: string; name: string; stages: string[][] }[] };
}

interface EspStatus {
  status: {
    eskom: { stage: string; stage_updated: string };
    capetown?: { stage: string; stage_updated: string };
  };
}

function LoadSheddingSection({ espAreaId, espAreaName, entityType, entityId, canEdit }: {
  espAreaId: string | null | undefined;
  espAreaName: string | null | undefined;
  entityType: "estate" | "property";
  entityId: string;
  canEdit: boolean;
}) {
  const { data: status, isLoading: statusLoading, isError: statusError } = useQuery<EspStatus>({
    queryKey: ["/api/esp/status"],
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: areaInfo, isLoading: areaLoading, isError: areaError } = useQuery<EspAreaInfo>({
    queryKey: ["/api/esp/area", espAreaId],
    queryFn: async () => {
      const res = await fetch(`/api/esp/area?id=${encodeURIComponent(espAreaId!)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load area info");
      return res.json();
    },
    enabled: !!espAreaId,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const hasError = statusError || areaError;
  const eskomStage = parseStage(status?.status?.eskom?.stage || "0");
  const now = new Date();
  const upcomingEvents = (areaInfo?.events || []).filter(e => new Date(e.end) > now);
  const currentEvent = upcomingEvents.find(e => new Date(e.start) <= now && new Date(e.end) > now);
  const futureEvents = upcomingEvents.filter(e => new Date(e.start) > now).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Load Shedding</h2>
        </div>
        <EspAreaLinker
          entityType={entityType}
          entityId={entityId}
          currentAreaId={espAreaId}
          currentAreaName={espAreaName}
          canEdit={canEdit}
          onLinked={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/esp/area"] });
          }}
        />
      </div>

      {!espAreaId ? (
        <div className="glass-card rounded-xl p-4">
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Link your area</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Search and select your area above to see load shedding schedules
            </p>
            {canEdit && (
              <EspAreaLinker
                entityType={entityType}
                entityId={entityId}
                currentAreaId={null}
                currentAreaName={null}
                canEdit={true}
              />
            )}
          </div>
        </div>
      ) : statusLoading || areaLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : hasError && !status && !areaInfo ? (
        <div className="glass-card rounded-xl p-4 text-center" data-testid="esp-error">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Unable to load load shedding data</p>
          <p className="text-xs text-muted-foreground mt-1">Please check back shortly</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={`rounded-xl border p-3 ${getStageBg(eskomStage)}`} data-testid="esp-national-status">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${getStageColor(eskomStage)}`} />
                <span className="text-xs font-medium text-muted-foreground">National Status</span>
              </div>
              <span className={`text-lg font-bold ${getStageColor(eskomStage)}`} data-testid="text-eskom-stage">
                {eskomStage === 0 ? "No Load Shedding" : `Stage ${eskomStage}`}
              </span>
            </div>
          </div>

          {currentEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3"
              data-testid="esp-current-event"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">CURRENTLY ACTIVE</span>
              </div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{currentEvent.note}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {formatEventTime(currentEvent.start)} – {formatEventTime(currentEvent.end)}
              </p>
            </motion.div>
          )}

          {futureEvents.length > 0 ? (
            <div className="glass-card rounded-xl p-3" data-testid="esp-upcoming-events">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</span>
              </div>
              <div className="space-y-1.5">
                {futureEvents.map((event, idx) => {
                  const eventStage = parseStage(event.note);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                      data-testid={`esp-event-${idx}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-6 rounded-full ${eventStage === 0 ? "bg-emerald-400" : eventStage <= 2 ? "bg-yellow-400" : eventStage <= 4 ? "bg-orange-400" : "bg-red-400"}`} />
                        <div>
                          <p className="text-xs font-medium truncate">{event.note}</p>
                          <p className="text-[10px] text-muted-foreground">{formatEventDate(event.start)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatEventTime(event.start)} – {formatEventTime(event.end)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-3 text-center" data-testid="esp-no-events">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">No upcoming load shedding events for your area</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function OutagesPage() {
  const { currentEstate, currentProperty, isEstateAdmin } = useEstate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("electricity");
  const [address, setAddress] = useState("");

  const espAreaId = currentEstate?.espAreaId || currentProperty?.espAreaId || null;
  const espAreaName = currentEstate?.espAreaName || currentProperty?.espAreaName || null;

  const entityType = currentEstate ? "estate" as const : "property" as const;
  const entityId = currentEstate?.id || currentProperty?.id || "";
  const canEditEsp = currentEstate ? isEstateAdmin : !!currentProperty;

  const outagesUrl = currentEstate ? `/api/outages?estateId=${currentEstate.id}` : currentProperty ? `/api/outages?propertyId=${currentProperty.id}` : "/api/outages";
  const { data: outages = [], isLoading } = useQuery<Outage[]>({
    queryKey: [outagesUrl],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/outages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [outagesUrl] });
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setType("electricity");
      setAddress("");
      toast({ title: "Outage reported successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      description: description || null,
      type,
      address: address || null,
      estateId: currentEstate?.id || null,
      propertyId: currentProperty?.id || null,
    });
  };

  const activeOutages = outages.filter((o) => o.status !== "resolved");
  const resolvedOutages = outages.filter((o) => o.status === "resolved");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Outages</h1>
          <p className="text-muted-foreground text-sm mt-1">Load shedding alerts and service outages in your area</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-teal text-white" data-testid="button-report-outage">
              <Plus className="w-4 h-4 mr-2" />
              Report Outage
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Report Outage</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm">Outage Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-outage-type" className="rounded-lg mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Title</Label>
                <Input
                  data-testid="input-outage-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Power outage on Main St"
                  className="rounded-lg mt-1.5"
                  required
                />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea
                  data-testid="input-outage-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the outage..."
                  className="rounded-lg mt-1.5 resize-none"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm">Address / Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-outage-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address or area"
                    className="pl-10 rounded-lg mt-1.5"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl gradient-teal text-white"
                disabled={createMutation.isPending}
                data-testid="button-submit-outage"
              >
                {createMutation.isPending ? "Reporting..." : "Report Outage"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {entityId && (
        <LoadSheddingSection
          espAreaId={espAreaId}
          espAreaName={espAreaName}
          entityType={entityType}
          entityId={entityId}
          canEdit={canEditEsp}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : outages.length === 0 && !espAreaId ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No outages reported</h3>
          <p className="text-sm text-muted-foreground">All services are running smoothly</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {activeOutages.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Community Reports ({activeOutages.length})
              </h2>
              <div className="space-y-3">
                {activeOutages.map((outage, i) => {
                  const Icon = typeIcons[outage.type] || AlertTriangle;
                  const color = typeColors[outage.type] || "bg-gray-500";
                  return (
                    <motion.div
                      key={outage.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="glass-card rounded-xl p-4"
                        data-testid={`outage-card-${outage.id}`}
                      >
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
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  outage.status === "confirmed"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {outage.status}
                              </span>
                            </div>
                            {outage.description && (
                              <p className="text-sm text-muted-foreground mt-2">{outage.description}</p>
                            )}
                            {outage.address && (
                              <div className="flex items-center gap-1 mt-2">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{outage.address}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {outage.createdAt ? new Date(outage.createdAt).toLocaleDateString() : "Recently"}
                              </span>
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

          {outages.length === 0 && espAreaId && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No community-reported outages</p>
            </div>
          )}

          {resolvedOutages.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Resolved ({resolvedOutages.length})
              </h2>
              <div className="space-y-3">
                {resolvedOutages.map((outage) => {
                  const Icon = typeIcons[outage.type] || AlertTriangle;
                  return (
                    <div
                      key={outage.id}
                      className="rounded-xl border border-border/40 p-4 opacity-60"
                      data-testid={`outage-resolved-${outage.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
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
        </div>
      )}
    </div>
  );
}
