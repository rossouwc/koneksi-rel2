import { useState } from "react";
import { motion } from "framer-motion";
import { useJoinEstate, useEstate } from "@/lib/estate-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2,
  KeyRound,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Plus,
  MapPin,
} from "lucide-react";

function CreateEstateDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; suburb: string | null; city: string | null; province: string | null }) => {
      const res = await apiRequest("POST", "/api/admin/estates", data);
      return res.json();
    },
    onSuccess: (estate: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/estates"] });
      setOpen(false);
      setName("");
      setSuburb("");
      setCity("");
      setProvince("");
      toast({
        title: "Estate Created",
        description: `${estate.name} created with invite code: ${estate.inviteCode}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            data-testid="button-create-estate-page"
            className="w-full rounded-xl py-6 border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Estate
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Create New Estate
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              name,
              suburb: suburb || null,
              city: city || null,
              province: province || null,
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label className="text-sm">Estate Name</Label>
            <Input
              data-testid="input-new-estate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Greenwood Estate"
              className="rounded-lg mt-1.5"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Suburb</Label>
              <Input
                data-testid="input-new-estate-suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="e.g. Sandton"
                className="rounded-lg mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input
                data-testid="input-new-estate-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Johannesburg"
                className="rounded-lg mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm">Province</Label>
            <Input
              data-testid="input-new-estate-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="e.g. Gauteng"
              className="rounded-lg mt-1.5"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl gradient-teal text-white"
            disabled={createMutation.isPending}
            data-testid="button-submit-new-estate"
          >
            {createMutation.isPending ? "Creating..." : "Create Estate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function JoinEstatePage() {
  const { user } = useAuth();
  const { setCurrentEstate, approvedEstates, pendingEstates } = useEstate();
  const joinEstate = useJoinEstate();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [inviteCode, setInviteCode] = useState("");

  const isAdmin = user?.isSuperAdmin || user?.role === "super_admin";

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const estate = await joinEstate.mutateAsync(inviteCode.trim().toUpperCase());
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      toast({
        title: "Request Submitted",
        description: `Your request to join ${estate.name} has been sent to the estate admin for approval.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to Join",
        description: err.message || "Invalid invite code or already a member.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Join an Estate</h1>
            <p className="text-muted-foreground text-sm">Enter an invite code to join a community</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="glass-card rounded-2xl p-6"
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Invite Code</Label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                className="pl-10 rounded-xl font-mono text-lg tracking-widest uppercase"
                maxLength={8}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ask your estate administrator for the 8-character invite code.
            </p>
          </div>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              data-testid="button-join-estate"
              type="submit"
              disabled={joinEstate.isPending || inviteCode.trim().length === 0}
              className="w-full rounded-xl gradient-teal text-white py-5 text-base font-semibold"
            >
              {joinEstate.isPending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              ) : (
                <span className="flex items-center gap-2">
                  Join Estate
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>

      {approvedEstates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Your Estates</h2>
          <div className="space-y-2">
            {approvedEstates.map((estate) => (
              <button
                key={estate.id}
                data-testid={`estate-link-${estate.id}`}
                onClick={() => {
                  setCurrentEstate(estate);
                  setLocation("/");
                }}
                className="w-full glass-card rounded-xl p-4 flex items-center gap-3 text-left hover:border-primary/30 transition-all"
              >
                <div className="w-9 h-9 rounded-lg gradient-teal flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{estate.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {[estate.suburb, estate.city].filter(Boolean).join(", ") || "No location"}
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {pendingEstates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Pending Approval</h2>
          <div className="space-y-2">
            {pendingEstates.map((estate) => (
              <div
                key={estate.id}
                data-testid={`estate-pending-${estate.id}`}
                className="w-full glass-card rounded-xl p-4 flex items-center gap-3 opacity-70"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{estate.name}</p>
                  <p className="text-xs text-amber-500 mt-0.5">Awaiting estate admin approval</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Admin</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <CreateEstateDialog />
        </motion.div>
      )}
    </div>
  );
}
