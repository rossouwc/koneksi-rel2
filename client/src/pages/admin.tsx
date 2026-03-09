import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Building2,
  Receipt,
  Zap,
  Store,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User, Estate } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [estateName, setEstateName] = useState("");
  const [estateSuburb, setEstateSuburb] = useState("");
  const [estateCity, setEstateCity] = useState("");
  const [estateProvince, setEstateProvince] = useState("");

  const isAdmin = user?.isSuperAdmin || user?.role === "super_admin";

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!isAdmin,
  });

  const { data: estates = [], isLoading: estatesLoading } = useQuery<Estate[]>({
    queryKey: ["/api/admin/estates"],
    enabled: !!isAdmin,
  });

  const createEstateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/estates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      setDialogOpen(false);
      setEstateName("");
      setEstateSuburb("");
      setEstateCity("");
      setEstateProvince("");
      toast({ title: "Estate created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateEstate = (e: React.FormEvent) => {
    e.preventDefault();
    createEstateMutation.mutate({
      name: estateName,
      suburb: estateSuburb || null,
      city: estateCity || null,
      province: estateProvince || null,
    });
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
      </div>
    );
  }

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
        <div className="glass-card rounded-xl p-4">
          <Users className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold" data-testid="stat-total-users">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total Users</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <Building2 className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold" data-testid="stat-total-estates">{estates.length}</p>
          <p className="text-xs text-muted-foreground">Estates</p>
        </div>
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
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gradient-teal text-white" data-testid="button-create-estate">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Estate
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Estate</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEstate} className="space-y-4">
                  <div>
                    <Label className="text-sm">Estate Name</Label>
                    <Input
                      data-testid="input-estate-name"
                      value={estateName}
                      onChange={(e) => setEstateName(e.target.value)}
                      placeholder="e.g. Greenwood Estate"
                      className="rounded-lg mt-1.5"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Suburb</Label>
                      <Input
                        data-testid="input-estate-suburb"
                        value={estateSuburb}
                        onChange={(e) => setEstateSuburb(e.target.value)}
                        placeholder="Suburb"
                        className="rounded-lg mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">City</Label>
                      <Input
                        data-testid="input-estate-city"
                        value={estateCity}
                        onChange={(e) => setEstateCity(e.target.value)}
                        placeholder="City"
                        className="rounded-lg mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Province</Label>
                    <Input
                      data-testid="input-estate-province"
                      value={estateProvince}
                      onChange={(e) => setEstateProvince(e.target.value)}
                      placeholder="Province"
                      className="rounded-lg mt-1.5"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl gradient-teal text-white"
                    disabled={createEstateMutation.isPending}
                    data-testid="button-submit-estate"
                  >
                    {createEstateMutation.isPending ? "Creating..." : "Create Estate"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {estatesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : estates.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No estates created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {estates.map((estate, i) => (
                <motion.div
                  key={estate.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="glass-card rounded-xl p-4" data-testid={`admin-estate-${estate.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-sm">{estate.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[estate.suburb, estate.city, estate.province].filter(Boolean).join(", ") || "No location set"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Code: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{estate.inviteCode}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          {usersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No users yet</p>
            </div>
          ) : (
            users.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-3" data-testid={`admin-user-${u.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-white font-semibold text-sm">
                      {u.fullName?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {(u.isSuperAdmin || u.role === "super_admin") && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Super Admin
                    </span>
                  )}
                  {u.role && u.role !== "super_admin" && !u.isSuperAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                      {u.role.replace("_", " ")}
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
