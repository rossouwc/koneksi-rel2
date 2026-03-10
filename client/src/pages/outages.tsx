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

export default function OutagesPage() {
  const { currentEstate, currentProperty } = useEstate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("electricity");
  const [address, setAddress] = useState("");

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
          <p className="text-muted-foreground text-sm mt-1">Report and track service outages in your area</p>
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

              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Map View</span>
                </div>
                <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Google Maps integration coming soon</p>
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : outages.length === 0 ? (
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
                Active ({activeOutages.length})
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
