import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Shield,
  Users,
  Building2,
  Receipt,
  Zap,
  Store,
  Plus,
  Pencil,
  Eye,
  ArrowLeft,
  MapPin,
  Copy,
  CheckCircle2,
  Search,
  ClipboardCheck,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Briefcase,
  Clock,
  Trash2,
  Bell,
  FlaskConical,
  Server,
  Lock,
  AtSign,
  SendHorizonal,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, Estate } from "@shared/schema";

type EstateWithStats = Estate & {
  residentCount: number;
  billCount: number;
  outageCount: number;
  providerCount: number;
};

type Resident = {
  user: User;
  role: string;
  joinedAt: string | null;
};

function EstateFormDialog({
  open,
  onOpenChange,
  estate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estate?: Estate | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(estate?.name || "");
  const [streetName, setStreetName] = useState(estate?.streetName || "");
  const [suburb, setSuburb] = useState(estate?.suburb || "");
  const [city, setCity] = useState(estate?.city || "");
  const [province, setProvince] = useState(estate?.province || "");

  const isEdit = !!estate;

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/admin/estates/${estate!.id}`, data);
      }
      return apiRequest("POST", "/api/admin/estates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/estates", estate!.id] });
      }
      onOpenChange(false);
      toast({ title: isEdit ? "Estate updated" : "Estate created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name,
      streetName: streetName || null,
      suburb: suburb || null,
      city: city || null,
      province: province || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isEdit ? "Edit Estate" : "Create New Estate"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm">Estate Name</Label>
            <Input
              data-testid="input-estate-dialog-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Greenwood Estate"
              className="rounded-xl mt-1.5"
              required
            />
          </div>
          <div>
            <Label className="text-sm">Street Name</Label>
            <Input
              data-testid="input-estate-dialog-street-name"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="e.g. 12 Oak Avenue"
              className="rounded-xl mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Suburb</Label>
              <Input
                data-testid="input-estate-dialog-suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="e.g. Sandton"
                className="rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input
                data-testid="input-estate-dialog-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Johannesburg"
                className="rounded-xl mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm">Province</Label>
            <Input
              data-testid="input-estate-dialog-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="e.g. Gauteng"
              className="rounded-xl mt-1.5"
            />
          </div>
          {!isEdit && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              A unique invite code will be auto-generated
            </p>
          )}
          <Button
            type="submit"
            className="w-full rounded-xl gradient-teal text-white"
            disabled={mutation.isPending}
            data-testid="button-estate-dialog-submit"
          >
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Estate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EstateDetail({ estateId, onBack }: { estateId: string; onBack: () => void }) {
  const { toast } = useToast();

  const { data: estate, isLoading: estateLoading } = useQuery<EstateWithStats>({
    queryKey: ["/api/admin/estates", estateId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/estates/${estateId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch estate");
      return res.json();
    },
  });

  const { data: residents = [], isLoading: residentsLoading } = useQuery<Resident[]>({
    queryKey: ["/api/admin/estates", estateId, "residents"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/estates/${estateId}/residents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch residents");
      return res.json();
    },
  });

  const [editOpen, setEditOpen] = useState(false);

  const copyCode = () => {
    if (estate?.inviteCode) {
      navigator.clipboard.writeText(estate.inviteCode);
      toast({ title: "Copied!", description: "Invite code copied to clipboard" });
    }
  };

  if (estateLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    );
  }

  if (!estate) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold mb-2">Estate Not Found</h2>
        <Button variant="ghost" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-admin-back" className="rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-estate-detail-name">{estate.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {[estate.streetName, estate.suburb, estate.city, estate.province].filter(Boolean).join(", ") || "No location set"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            setEditOpen(true);
          }}
          data-testid="button-edit-estate-detail"
        >
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl p-6 gradient-teal relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Invite Code</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-white tracking-widest" data-testid="text-estate-invite-code">
                {estate.inviteCode}
              </span>
              <button onClick={copyCode} className="text-white/60 hover:text-white transition-colors" data-testid="button-copy-invite-code">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-4">
            {[
              { label: "Residents", value: estate.residentCount, icon: Users },
              { label: "Bills", value: estate.billCount, icon: Receipt },
              { label: "Outages", value: estate.outageCount, icon: Zap },
              { label: "Providers", value: estate.providerCount, icon: Store },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-4 h-4 text-white/60 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Residents ({residents.length})
        </h2>
        {residentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : residents.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No residents have joined this estate yet</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Role</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.map((r) => (
                  <TableRow key={r.user.id} className="border-border/30" data-testid={`resident-row-${r.user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {r.user.fullName?.[0]?.toUpperCase() || "U"}
                        </div>
                        <span className="font-medium text-sm">{r.user.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.user.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        r.role === "estate_admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {r.role.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <EstateFormDialog open={editOpen} onOpenChange={setEditOpen} estate={estate} />
    </div>
  );
}

const serviceBadgeColors = [
  "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
];

function getServiceColor(service: string) {
  let hash = 0;
  for (let i = 0; i < service.length; i++) {
    hash = service.charCodeAt(i) + ((hash << 5) - hash);
  }
  return serviceBadgeColors[Math.abs(hash) % serviceBadgeColors.length];
}

function PendingEstates() {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; action: "approve" | "reject" } | null>(null);

  const { data: pendingEstates = [], isLoading, isError, refetch } = useQuery<Estate[]>({
    queryKey: ["/api/admin/pending-estates"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/estates/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates"] });
      setConfirmAction(null);
      toast({ title: "Estate approved", description: "The estate admin can now access their estate" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/estates/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates"] });
      setConfirmAction(null);
      toast({ title: "Estate rejected" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <X className="w-12 h-12 mx-auto text-red-400/50 mb-3" />
        <h3 className="font-semibold mb-1">Failed to load pending estates</h3>
        <p className="text-sm text-muted-foreground mb-3">Something went wrong while fetching the data</p>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()} data-testid="button-retry-pending-estates">
          Try Again
        </Button>
      </div>
    );
  }

  if (pendingEstates.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold mb-1 text-sm">No pending estate approvals</h3>
        <p className="text-xs text-muted-foreground">All estate applications have been reviewed</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estate Name</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingEstates.map((estate) => (
              <TableRow key={estate.id} data-testid={`pending-estate-row-${estate.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{estate.name}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {[estate.streetName, estate.suburb, estate.city].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                  {[estate.streetName, estate.suburb, estate.city, estate.province].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                  {estate.createdAt ? new Date(estate.createdAt).toLocaleDateString("en-ZA") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg text-xs gradient-teal text-white h-8 px-3"
                      onClick={() => setConfirmAction({ id: estate.id, name: estate.name, action: "approve" })}
                      data-testid={`button-approve-estate-${estate.id}`}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs h-8 px-3 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                      onClick={() => setConfirmAction({ id: estate.id, name: estate.name, action: "reject" })}
                      data-testid={`button-reject-estate-${estate.id}`}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "approve" ? "Approve Estate?" : "Reject Estate?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.action === "approve"
              ? `This will activate "${confirmAction?.name}" and allow the estate admin to access it.`
              : `This will decline "${confirmAction?.name}". The estate admin will be notified.`}
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmAction(null)} data-testid="button-cancel-estate-action">
              Cancel
            </Button>
            <Button
              className={`rounded-xl text-white ${confirmAction?.action === "approve" ? "gradient-teal" : "bg-red-500 hover:bg-red-600"}`}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.action === "approve") {
                  approveMutation.mutate(confirmAction.id);
                } else {
                  rejectMutation.mutate(confirmAction.id);
                }
              }}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-confirm-estate-action"
            >
              {approveMutation.isPending || rejectMutation.isPending ? "Processing..." : confirmAction?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AllSuppliers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: suppliers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/suppliers"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/suppliers/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Supplier approved", description: "They can now access the supplier portal" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/suppliers/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Supplier rejected" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = suppliers.filter((s) =>
    [s.fullName, s.businessName, s.email, ...(s.services || [])].some((f) =>
      f?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const statusColor = (status: string | null) => {
    if (status === "approved") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-admin-search-suppliers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suppliers..."
            className="pl-10 rounded-xl"
          />
        </div>
        <Badge variant="outline" className="self-start px-3 py-1.5 rounded-lg text-xs">
          {suppliers.length} total supplier{suppliers.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold mb-1">
            {suppliers.length === 0 ? "No suppliers yet" : "No matching suppliers"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {suppliers.length === 0
              ? "Suppliers will appear here once they register"
              : "Try adjusting your search query"}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40">
                <TableHead className="text-xs uppercase tracking-wider">Business</TableHead>
                <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Contact</TableHead>
                <TableHead className="text-xs uppercase tracking-wider hidden sm:table-cell">Services</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((supplier) => (
                <TableRow key={supplier.id} className="border-border/40" data-testid={`row-supplier-${supplier.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {supplier.businessName?.[0]?.toUpperCase() || supplier.fullName?.[0]?.toUpperCase() || "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-supplier-name-${supplier.id}`}>
                          {supplier.businessName || supplier.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{supplier.fullName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      <p className="text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {supplier.email}
                      </p>
                      {supplier.phone && (
                        <p className="text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {supplier.phone}
                        </p>
                      )}
                      {supplier.businessWebsite && (
                        <a
                          href={supplier.businessWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          Website
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(supplier.services || []).slice(0, 2).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md">
                          {s}
                        </Badge>
                      ))}
                      {(supplier.services || []).length > 2 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md">
                          +{(supplier.services || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] rounded-md ${statusColor(supplier.approvalStatus)}`}>
                      {supplier.approvalStatus || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {supplier.approvalStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                            onClick={() => approveMutation.mutate(supplier.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-supplier-${supplier.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg"
                            onClick={() => rejectMutation.mutate(supplier.id)}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-supplier-${supplier.id}`}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {supplier.approvalStatus === "rejected" && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                          onClick={() => approveMutation.mutate(supplier.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-reapprove-supplier-${supplier.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                      )}
                      {supplier.approvalStatus === "approved" && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/5 border-emerald-500/20 text-emerald-600 rounded-md">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PendingSuppliers() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; action: "approve" | "reject" } | null>(null);

  const { data: pendingSuppliers = [], isLoading, isError, refetch } = useQuery<User[]>({
    queryKey: ["/api/admin/pending-suppliers"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/suppliers/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setConfirmAction(null);
      toast({ title: "Supplier approved", description: "They can now access the supplier portal" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/suppliers/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setConfirmAction(null);
      toast({ title: "Supplier rejected" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <X className="w-12 h-12 mx-auto text-red-400/50 mb-3" />
        <h3 className="font-semibold mb-1">Failed to load pending suppliers</h3>
        <p className="text-sm text-muted-foreground mb-3">Something went wrong while fetching the data</p>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()} data-testid="button-retry-pending">
          Try Again
        </Button>
      </div>
    );
  }

  if (pendingSuppliers.length === 0) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold mb-1">No pending approvals</h3>
        <p className="text-sm text-muted-foreground">All supplier applications have been reviewed</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="text-xs uppercase tracking-wider">Business</TableHead>
              <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Services</TableHead>
              <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Website</TableHead>
              <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Phone</TableHead>
              <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Submitted</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingSuppliers.map((supplier) => {
              const isExpanded = expandedId === supplier.id;
              return (
                <motion.tr
                  key={supplier.id}
                  className="border-border/30 cursor-pointer hover:bg-accent/50 transition-colors"
                  data-testid={`pending-supplier-row-${supplier.id}`}
                  onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
                  layout
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg gradient-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-supplier-business-${supplier.id}`}>
                          {supplier.businessName || supplier.fullName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate md:hidden">{supplier.email}</p>
                        {supplier.services && supplier.services.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 md:hidden flex-wrap">
                            {supplier.services.slice(0, 2).map((s) => (
                              <Badge key={s} variant="outline" className={`text-[8px] px-1 py-0 rounded-full border ${getServiceColor(s)}`}>{s}</Badge>
                            ))}
                            {supplier.services.length > 2 && (
                              <span className="text-[8px] text-muted-foreground">+{supplier.services.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        className="ml-auto md:hidden text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : supplier.id); }}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.services && supplier.services.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                        {supplier.services.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className={`text-[9px] px-1.5 py-0 rounded-full border ${getServiceColor(s)}`}>{s}</Badge>
                        ))}
                        {supplier.services.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{supplier.services.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {supplier.businessWebsite ? (
                      <a
                        href={supplier.businessWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        data-testid={`link-supplier-website-${supplier.id}`}
                      >
                        <Globe className="w-3 h-3" />
                        {supplier.businessWebsite.replace(/^https?:\/\//, "").slice(0, 25)}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{supplier.phone || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{supplier.email}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="rounded-lg h-7 text-[10px] gap-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setConfirmAction({ id: supplier.id, name: supplier.businessName || supplier.fullName || "Supplier", action: "approve" })}
                        data-testid={`button-approve-${supplier.id}`}
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-7 text-[10px] gap-1 px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                        onClick={() => setConfirmAction({ id: supplier.id, name: supplier.businessName || supplier.fullName || "Supplier", action: "reject" })}
                        data-testid={`button-reject-${supplier.id}`}
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>

        <AnimatePresence>
          {expandedId && (() => {
            const supplier = pendingSuppliers.find((s) => s.id === expandedId);
            if (!supplier) return null;
            return (
              <motion.div
                key={expandedId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border/30 overflow-hidden"
                data-testid={`supplier-detail-${supplier.id}`}
              >
                <div className="p-5 space-y-4 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-teal flex items-center justify-center text-white">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" data-testid={`text-detail-business-${supplier.id}`}>
                        {supplier.businessName || supplier.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{supplier.fullName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{supplier.email}</span>
                    </div>
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.businessWebsite && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={supplier.businessWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-detail-website-${supplier.id}`}
                        >
                          {supplier.businessWebsite.replace(/^https?:\/\//, "")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {supplier.createdAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Submitted {new Date(supplier.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  {supplier.services && supplier.services.length > 0 && (
                    <div data-testid={`container-detail-services-${supplier.id}`}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Services</p>
                      <div className="flex flex-wrap gap-1.5">
                        {supplier.services.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getServiceColor(s)}`}
                            data-testid={`badge-detail-service-${s.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="rounded-xl gradient-teal text-white gap-1.5"
                      onClick={() => setConfirmAction({ id: supplier.id, name: supplier.businessName || supplier.fullName || "Supplier", action: "approve" })}
                      data-testid={`button-detail-approve-${supplier.id}`}
                    >
                      <Check className="w-4 h-4" />
                      Approve Supplier
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      onClick={() => setConfirmAction({ id: supplier.id, name: supplier.businessName || supplier.fullName || "Supplier", action: "reject" })}
                      data-testid={`button-detail-reject-${supplier.id}`}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="rounded-2xl glass-card border-border/50 max-w-sm" data-testid="dialog-confirm-action">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmAction?.action === "approve" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <X className="w-5 h-5 text-red-500" />
              )}
              {confirmAction?.action === "approve" ? "Approve Supplier" : "Reject Supplier"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "approve"
                ? `Are you sure you want to approve "${confirmAction?.name}"? They will be able to access the supplier portal and claim a free estate listing.`
                : `Are you sure you want to reject "${confirmAction?.name}"? They will not be able to access the supplier portal.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setConfirmAction(null)}
              data-testid="button-cancel-confirm"
            >
              Cancel
            </Button>
            {confirmAction?.action === "approve" ? (
              <Button
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={approveMutation.isPending}
                onClick={() => confirmAction && approveMutation.mutate(confirmAction.id)}
                data-testid="button-confirm-approve"
              >
                {approveMutation.isPending ? "Approving..." : "Yes, Approve"}
              </Button>
            ) : (
              <Button
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                disabled={rejectMutation.isPending}
                onClick={() => confirmAction && rejectMutation.mutate(confirmAction.id)}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Yes, Reject"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type SystemSettings = {
  notification_mode: string;
  test_email: string;
  test_phone: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass_set: boolean;
  smtp_from: string;
  smtp_secure: string;
};

function NotificationSettings() {
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);

  const { data, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/system-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/system-settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: Partial<SystemSettings> & { smtp_pass?: string }) => {
      return apiRequest("PATCH", "/api/admin/system-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-mode"] });
      toast({ title: "Settings saved", description: "Notification settings updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      return res.json();
    },
    onSuccess: (result: { success: boolean; message: string }) => {
      if (result.success) {
        toast({ title: "Test email sent", description: result.message });
      } else {
        toast({ title: "Test email failed", description: result.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const currentMode = data?.notification_mode || "test";
  const [localMode, setLocalMode] = useState<string | null>(null);
  const [localTestEmail, setLocalTestEmail] = useState<string | null>(null);
  const [localTestPhone, setLocalTestPhone] = useState<string | null>(null);
  const [smtpHost, setSmtpHost] = useState<string | null>(null);
  const [smtpPort, setSmtpPort] = useState<string | null>(null);
  const [smtpUser, setSmtpUser] = useState<string | null>(null);
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState<string | null>(null);
  const [smtpSecure, setSmtpSecure] = useState<boolean | null>(null);

  const displayMode = localMode ?? currentMode;
  const displayTestEmail = localTestEmail ?? (data?.test_email || "rossouw@hoolio.co.za");
  const displayTestPhone = localTestPhone ?? (data?.test_phone || "0828224487");
  const displaySmtpHost = smtpHost ?? (data?.smtp_host || "");
  const displaySmtpPort = smtpPort ?? (data?.smtp_port || "587");
  const displaySmtpUser = smtpUser ?? (data?.smtp_user || "");
  const displaySmtpFrom = smtpFrom ?? (data?.smtp_from || "");
  const displaySmtpSecure = smtpSecure ?? (data?.smtp_secure === "true");

  const handleSaveNotifications = () => {
    saveMutation.mutate({
      notification_mode: displayMode,
      test_email: displayTestEmail,
      test_phone: displayTestPhone,
    });
  };

  const handleSaveSmtp = () => {
    saveMutation.mutate({
      smtp_host: displaySmtpHost,
      smtp_port: displaySmtpPort,
      smtp_user: displaySmtpUser,
      smtp_pass: smtpPass || undefined,
      smtp_from: displaySmtpFrom,
      smtp_secure: String(displaySmtpSecure),
    });
    setSmtpPass("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-primary" />
          Notification Settings
        </h2>
        <p className="text-sm text-muted-foreground">Control how emails and SMS are sent from Koneksi</p>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Notification Mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {displayMode === "test"
                ? "All notifications redirect to the test addresses below"
                : "Notifications go to real recipients"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${displayMode === "test" ? "text-amber-600" : "text-muted-foreground"}`}>Test</span>
            <button
              data-testid="toggle-notification-mode"
              onClick={() => setLocalMode(displayMode === "test" ? "production" : "test")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                displayMode === "production" ? "bg-emerald-500" : "bg-amber-400"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${displayMode === "production" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`text-xs font-semibold ${displayMode === "production" ? "text-emerald-600" : "text-muted-foreground"}`}>Production</span>
          </div>
        </div>

        {displayMode === "test" && (
          <div className="space-y-3 pt-3 border-t border-border/40">
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              All outbound notifications redirect to these addresses in test mode
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">Test Email Address</Label>
              <Input data-testid="input-test-email" value={displayTestEmail} onChange={(e) => setLocalTestEmail(e.target.value)} placeholder="test@example.com" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Test Phone Number</Label>
              <Input data-testid="input-test-phone" value={displayTestPhone} onChange={(e) => setLocalTestPhone(e.target.value)} placeholder="+27821234567" className="rounded-xl mt-1" />
            </div>
          </div>
        )}

        <Button className="w-full rounded-xl gradient-teal text-white" onClick={handleSaveNotifications} disabled={saveMutation.isPending} data-testid="button-save-notification-settings">
          {saveMutation.isPending ? "Saving…" : "Save Notification Settings"}
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Server className="w-5 h-5 text-primary" />
          Email Server (SMTP)
        </h2>
        <p className="text-sm text-muted-foreground">Configure outbound email delivery with your SSL/TLS SMTP credentials</p>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <Server className="w-3 h-3" /> SMTP Host
            </Label>
            <Input
              data-testid="input-smtp-host"
              value={displaySmtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="mail.yourdomain.com"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Port</Label>
            <Input
              data-testid="input-smtp-port"
              value={displaySmtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587"
              type="number"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <AtSign className="w-3 h-3" /> Username / Email
            </Label>
            <Input
              data-testid="input-smtp-user"
              value={displaySmtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="notifications@yourdomain.com"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <Lock className="w-3 h-3" /> Password
              {data?.smtp_pass_set && <span className="text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">SET</span>}
            </Label>
            <div className="relative">
              <Input
                data-testid="input-smtp-pass"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={data?.smtp_pass_set ? "Leave blank to keep current" : "Enter password"}
                type={showPass ? "text" : "password"}
                className="rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="toggle-smtp-pass-visibility"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
            <Mail className="w-3 h-3" /> From Email Address
          </Label>
          <Input
            data-testid="input-smtp-from"
            value={displaySmtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            placeholder="Koneksi <noreply@yourdomain.com>"
            className="rounded-xl"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Shown as the sender name in recipients' inboxes. Leave blank to use the username.</p>
        </div>

        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 border border-border/40">
          <div>
            <p className="text-sm font-medium">Secure connection (SSL/TLS)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Enable for port 465 (SMTPS). Use STARTTLS for port 587.</p>
          </div>
          <button
            data-testid="toggle-smtp-secure"
            onClick={() => setSmtpSecure((v) => !(v ?? data?.smtp_secure === "true"))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${displaySmtpSecure ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${displaySmtpSecure ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 rounded-xl gradient-teal text-white"
            onClick={handleSaveSmtp}
            disabled={saveMutation.isPending}
            data-testid="button-save-smtp-settings"
          >
            {saveMutation.isPending ? "Saving…" : "Save SMTP Settings"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2 flex-shrink-0"
            onClick={() => testEmailMutation.mutate()}
            disabled={testEmailMutation.isPending}
            data-testid="button-test-smtp"
          >
            {testEmailMutation.isPending ? (
              <><Clock className="w-3.5 h-3.5 animate-spin" /> Sending…</>
            ) : (
              <><SendHorizonal className="w-3.5 h-3.5" /> Send Test</>
            )}
          </Button>
        </div>

        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Common SSL/TLS Settings</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 font-mono text-[10px]">
            <span className="text-muted-foreground">Port 465</span><span>SSL/TLS — toggle ON</span>
            <span className="text-muted-foreground">Port 587</span><span>STARTTLS — toggle OFF</span>
            <span className="text-muted-foreground">Port 25</span><span>Plain SMTP — toggle OFF</span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">The test email will be sent to your configured test address. Check your test inbox to confirm delivery.</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEstate, setEditEstate] = useState<Estate | null>(null);
  const [deleteEstate, setDeleteEstate] = useState<EstateWithStats | null>(null);
  const [search, setSearch] = useState("");

  const isAdmin = user?.isSuperAdmin || user?.role === "super_admin";

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!isAdmin,
  });

  const { data: estatesWithStats = [], isLoading: estatesLoading } = useQuery<EstateWithStats[]>({
    queryKey: ["/api/admin/estates-with-stats"],
    enabled: !!isAdmin,
  });

  const { data: pendingCount = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/pending-suppliers"],
    enabled: !!isAdmin,
  });

  const { data: allSuppliers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/suppliers"],
    enabled: !!isAdmin,
  });

  const deleteEstateMutation = useMutation({
    mutationFn: async (estateId: string) => {
      await apiRequest("DELETE", `/api/admin/estates/${estateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Estate deleted", description: "The estate and all associated data have been removed. Linked users can continue as personal users." });
      setDeleteEstate(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
        <Button variant="ghost" className="mt-4" onClick={() => setLocation("/")} data-testid="button-admin-go-home">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (selectedEstateId) {
    return <EstateDetail estateId={selectedEstateId} onBack={() => setSelectedEstateId(null)} />;
  }

  const approvedEstates = estatesWithStats.filter((e) => e.approvalStatus === "approved");

  const filteredEstates = approvedEstates.filter((e) =>
    [e.name, e.suburb, e.city, e.province].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground text-sm">Manage the entire Koneksi platform</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: allUsers.length, icon: Users, color: "bg-teal-600" },
          { label: "Estates", value: approvedEstates.length, icon: Building2, color: "bg-emerald-500" },
          { label: "Suppliers", value: allSuppliers.length, icon: Briefcase, color: "bg-blue-500" },
          { label: "Pending", value: pendingCount.length, icon: ClipboardCheck, color: "bg-amber-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="glass-card rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold" data-testid={`stat-admin-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                {usersLoading || estatesLoading ? "—" : stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="estates">
        <TabsList className="rounded-xl">
          <TabsTrigger value="estates" data-testid="tab-estates" className="rounded-lg">
            <Building2 className="w-4 h-4 mr-2" />
            Estates
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users" className="rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers" className="rounded-lg">
            <Briefcase className="w-4 h-4 mr-2" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="approvals" data-testid="tab-approvals" className="rounded-lg">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications" className="rounded-lg">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estates" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-admin-search-estates"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search estates..."
                className="pl-10 rounded-xl"
              />
            </div>
            <Button
              className="rounded-xl gradient-teal text-white"
              onClick={() => setCreateOpen(true)}
              data-testid="button-create-estate"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Estate
            </Button>
          </div>

          {estatesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filteredEstates.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {search ? "No estates match your search" : "No estates created yet"}
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs uppercase tracking-wider">Estate</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">City</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Province</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-center">Residents</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Invite Code</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstates.map((estate, i) => (
                    <TableRow
                      key={estate.id}
                      className="border-border/30 cursor-pointer hover:bg-accent/50 transition-colors"
                      data-testid={`admin-estate-row-${estate.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{estate.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {[estate.suburb, estate.city].filter(Boolean).join(", ") || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground hidden md:block">{estate.suburb || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{estate.city || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{estate.province || "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          {estate.residentCount}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{estate.inviteCode}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-lg h-8 w-8"
                            onClick={() => setSelectedEstateId(estate.id)}
                            data-testid={`button-view-estate-${estate.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-lg h-8 w-8"
                            onClick={() => setEditEstate(estate)}
                            data-testid={`button-edit-estate-${estate.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-lg h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteEstate(estate)}
                            data-testid={`button-delete-estate-${estate.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : allUsers.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No users yet</p>
            </div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="text-xs uppercase tracking-wider">User</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((u) => (
                    <TableRow key={u.id} className="border-border/30" data-testid={`admin-user-row-${u.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.fullName?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{u.email}</TableCell>
                      <TableCell>
                        {(u.isSuperAdmin || u.role === "super_admin") ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                            {u.role?.replace("_", " ") || "resident"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{u.phone || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <AllSuppliers />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4 space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              Pending Estate Approvals
            </h2>
            <p className="text-sm text-muted-foreground">Review and approve or reject new estate registrations</p>
          </div>
          <PendingEstates />

          <div className="pt-2">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Pending Supplier Approvals
            </h2>
            <p className="text-sm text-muted-foreground">Review and approve or reject supplier applications</p>
          </div>
          <PendingSuppliers />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationSettings />
        </TabsContent>
      </Tabs>

      <EstateFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editEstate && (
        <EstateFormDialog
          open={!!editEstate}
          onOpenChange={(open) => { if (!open) setEditEstate(null); }}
          estate={editEstate}
        />
      )}

      <Dialog open={!!deleteEstate} onOpenChange={(open) => { if (!open) setDeleteEstate(null); }}>
        <DialogContent className="glass-card border-border/40" data-testid="dialog-delete-estate">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Estate
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteEstate?.name}</span>? This will permanently remove the estate and all its associated data (bills, outages, providers). Users linked to this estate will be unlinked and can continue as personal users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteEstate(null)} data-testid="button-cancel-delete-estate">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteEstate && deleteEstateMutation.mutate(deleteEstate.id)}
              disabled={deleteEstateMutation.isPending}
              data-testid="button-confirm-delete-estate"
            >
              {deleteEstateMutation.isPending ? "Deleting..." : "Delete Estate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
