import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
            {[estate.suburb, estate.city, estate.province].filter(Boolean).join(", ") || "No location set"}
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

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEstate, setEditEstate] = useState<Estate | null>(null);
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

  const filteredEstates = estatesWithStats.filter((e) =>
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
          { label: "Estates", value: estatesWithStats.length, icon: Building2, color: "bg-emerald-500" },
          { label: "Residents", value: estatesWithStats.reduce((s, e) => s + e.residentCount, 0), icon: Users, color: "bg-blue-500" },
          { label: "Providers", value: estatesWithStats.reduce((s, e) => s + e.providerCount, 0), icon: Store, color: "bg-amber-500" },
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
      </Tabs>

      <EstateFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editEstate && (
        <EstateFormDialog
          open={!!editEstate}
          onOpenChange={(open) => { if (!open) setEditEstate(null); }}
          estate={editEstate}
        />
      )}
    </div>
  );
}
