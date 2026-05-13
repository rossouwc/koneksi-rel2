import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEstate } from "@/lib/estate-context";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  UserX,
  Send,
  Share2,
  Link2,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Resident = {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt: string | null;
  approvalStatus: string;
};

type ResidentInvite = {
  id: string;
  estateId: string;
  name: string;
  email: string;
  phone: string | null;
  status: "pending" | "joined";
  createdAt: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function buildInviteMessage(estateName: string, inviteCode: string, name?: string) {
  const greeting = name ? `Hi ${name}, ` : "";
  const appUrl = `${window.location.origin}/join-estate?code=${inviteCode}`;
  return `${greeting}you're invited to join ${estateName} on Koneksi! Use invite code *${inviteCode}* or tap the link to join: ${appUrl}`;
}

function ShareSheet({ estate, name, email, phone, onClose }: {
  estate: { name: string; inviteCode: string };
  name?: string;
  email?: string;
  phone?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const message = buildInviteMessage(estate.name, estate.inviteCode, name);
  const encodedMsg = encodeURIComponent(message);
  const appUrl = `${window.location.origin}/join-estate?code=${estate.inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappHref = phone
    ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  const emailHref = `mailto:${email || ""}?subject=Join ${estate.name} on Koneksi&body=${encodeURIComponent(message)}`;
  const smsHref = `sms:${phone || ""}?body=${encodedMsg}`;

  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">{message}</p>
      <div className="grid grid-cols-2 gap-2">
        <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={onClose}>
          <Button className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white gap-2" data-testid="button-share-whatsapp">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
        </a>
        <a href={emailHref}>
          <Button variant="outline" className="w-full rounded-xl gap-2" data-testid="button-share-email">
            <Mail className="w-4 h-4" />
            Email
          </Button>
        </a>
        <a href={smsHref}>
          <Button variant="outline" className="w-full rounded-xl gap-2" data-testid="button-share-sms">
            <Phone className="w-4 h-4" />
            SMS
          </Button>
        </a>
        <Button variant="outline" className="w-full rounded-xl gap-2" onClick={copyLink} data-testid="button-share-copy">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>
    </div>
  );
}

function InviteCodeHero({ estate }: { estate: { name: string; inviteCode: string } }) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(estate.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Estate Invite Code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-primary" data-testid="text-invite-code">
              {estate.inviteCode}
            </span>
            <button
              onClick={copyCode}
              data-testid="button-copy-invite-code"
              className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Share this code with residents to invite them to {estate.name}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl gradient-teal flex items-center justify-center flex-shrink-0">
          <Share2 className="w-7 h-7 text-white" />
        </div>
      </div>

      <button
        onClick={() => setShareOpen(!shareOpen)}
        className="flex items-center gap-1.5 text-sm text-primary font-medium"
        data-testid="button-toggle-share"
      >
        {shareOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Share invite link
      </button>

      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ShareSheet estate={estate} onClose={() => setShareOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InviteResidentDialog({ estate, open, onClose }: {
  estate: { id: string; name: string; inviteCode: string };
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "share">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savedInvite, setSavedInvite] = useState<{ name: string; email: string; phone: string } | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string }) => {
      const res = await apiRequest("POST", `/api/estates/${estate.id}/resident-invites`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/estates/${estate.id}/resident-invites`] });
      setSavedInvite({ name, email, phone });
      setStep("share");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setStep("form");
    setName("");
    setEmail("");
    setPhone("");
    setSavedInvite(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {step === "form" ? "Invite a Resident" : "Share Invite"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inviteMutation.mutate({ name, email, phone: phone || undefined });
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-sm">Full Name</Label>
              <Input
                data-testid="input-invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="rounded-xl mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="text-sm">Email Address</Label>
              <Input
                data-testid="input-invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="rounded-xl mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="text-sm">Phone Number <span className="text-muted-foreground">(optional — for WhatsApp / SMS)</span></Label>
              <Input
                data-testid="input-invite-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
                className="rounded-xl mt-1.5"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl gradient-teal text-white"
                disabled={inviteMutation.isPending}
                data-testid="button-save-invite"
              >
                {inviteMutation.isPending ? "Saving..." : (
                  <span className="flex items-center gap-2"><Send className="w-4 h-4" />Save & Share</span>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite saved! Now share it with <strong>{savedInvite?.name}</strong> via your preferred channel:
            </p>
            <ShareSheet
              estate={estate}
              name={savedInvite?.name}
              email={savedInvite?.email}
              phone={savedInvite?.phone}
              onClose={handleClose}
            />
            <Button variant="outline" className="w-full rounded-xl" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type TabKey = "members" | "pending" | "invited";

export default function ResidentsPage() {
  const { currentEstate, isEstateAdmin } = useEstate();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<ResidentInvite | null>(null);

  if (!isEstateAdmin || !currentEstate) {
    setLocation("/");
    return null;
  }

  const estateId = currentEstate.id;

  const { data: allResidents = [], isLoading: residentsLoading } = useQuery<Resident[]>({
    queryKey: [`/api/estates/${estateId}/residents`],
  });

  const { data: pendingResidents = [], isLoading: pendingLoading } = useQuery<{ userId: string; fullName: string; email: string; joinedAt: string }[]>({
    queryKey: [`/api/estates/${estateId}/pending-residents`],
  });

  const { data: residentInvites = [], isLoading: invitesLoading } = useQuery<ResidentInvite[]>({
    queryKey: [`/api/estates/${estateId}/resident-invites`],
  });

  const approvedMembers = allResidents.filter((r) => r.approvalStatus === "approved");

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/estates/${estateId}/residents/${userId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/estates/${estateId}/residents`] });
      queryClient.invalidateQueries({ queryKey: [`/api/estates/${estateId}/pending-residents`] });
      toast({ title: "Resident approved", description: "They now have access to the estate." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/estates/${estateId}/residents/${userId}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/estates/${estateId}/pending-residents`] });
      toast({ title: "Request declined" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/estates/${estateId}/residents/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/estates/${estateId}/residents`] });
      setRemoveTarget(null);
      toast({ title: "Resident removed from estate" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredMembers = approvedMembers.filter(
    (r) =>
      r.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "members", label: "Members", count: approvedMembers.length },
    { key: "pending", label: "Pending", count: pendingResidents.length },
    { key: "invited", label: "Invited", count: residentInvites.length },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Residents</h1>
              <p className="text-muted-foreground text-sm">{currentEstate.name}</p>
            </div>
          </div>
          <Button
            onClick={() => setInviteOpen(true)}
            className="rounded-xl gradient-teal text-white gap-2"
            data-testid="button-invite-resident"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite</span>
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <InviteCodeHero estate={currentEstate} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              data-testid={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  tab.key === "pending" && tab.count > 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "members" && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <Input
              data-testid="input-search-members"
              placeholder="Search residents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl"
            />
            {residentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse h-16" />
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold">No members yet</p>
                <p className="text-sm text-muted-foreground">Share your invite code to get started</p>
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="rounded-xl gradient-teal text-white gap-2 mx-auto"
                  data-testid="button-invite-first-resident"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite a Resident
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((r) => (
                  <div
                    key={r.user.id}
                    data-testid={`member-card-${r.user.id}`}
                    className="glass-card rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials(r.user.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{r.user.fullName}</p>
                        {r.role === "estate_admin" ? (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-0 gap-1 py-0">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] py-0">Resident</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{r.user.email}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatDate(r.joinedAt)}</p>
                    </div>
                    {r.user.id !== user?.id && r.role !== "estate_admin" && (
                      <button
                        data-testid={`button-remove-${r.user.id}`}
                        onClick={() => setRemoveTarget({ id: r.user.id, name: r.user.fullName })}
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                        title="Remove resident"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            {pendingLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="glass-card rounded-xl p-4 animate-pulse h-20" />)}
              </div>
            ) : pendingResidents.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="font-semibold">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending approval requests</p>
              </div>
            ) : (
              pendingResidents.map((r) => (
                <div
                  key={r.userId}
                  data-testid={`pending-card-${r.userId}`}
                  className="glass-card rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 text-sm font-bold flex-shrink-0">
                    {initials(r.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <p className="text-xs text-amber-500">Requested {formatDate(r.joinedAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-8 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                      onClick={() => rejectMutation.mutate(r.userId)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${r.userId}`}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-lg h-8 gradient-teal text-white gap-1"
                      onClick={() => approveMutation.mutate(r.userId)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${r.userId}`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "invited" && (
          <motion.div
            key="invited"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            {invitesLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="glass-card rounded-xl p-4 animate-pulse h-16" />)}
              </div>
            ) : residentInvites.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Send className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold">No invites sent yet</p>
                <p className="text-sm text-muted-foreground">
                  Invite residents by name and email to track who you've reached out to
                </p>
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="rounded-xl gradient-teal text-white gap-2 mx-auto"
                  data-testid="button-invite-first-person"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Someone
                </Button>
              </div>
            ) : (
              residentInvites.map((inv) => (
                <div
                  key={inv.id}
                  data-testid={`invite-card-${inv.id}`}
                  className="glass-card rounded-xl p-4 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    inv.status === "joined"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {initials(inv.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{inv.name}</p>
                      {inv.status === "joined" ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 gap-1 py-0">
                          <CheckCircle2 className="w-3 h-3" /> Joined
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-300 dark:border-amber-700">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                    {inv.phone && <p className="text-xs text-muted-foreground">{inv.phone}</p>}
                  </div>
                  {inv.status !== "joined" && (
                    <button
                      data-testid={`button-reinvite-${inv.id}`}
                      onClick={() => setShareTarget(inv)}
                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                      title="Re-invite"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InviteResidentDialog
        estate={currentEstate}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove resident?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.name}</strong> will lose access to all estate data, providers, and services. They can re-join using the invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              data-testid="button-confirm-remove"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Re-invite {shareTarget?.name}
            </DialogTitle>
          </DialogHeader>
          {shareTarget && (
            <ShareSheet
              estate={currentEstate}
              name={shareTarget.name}
              email={shareTarget.email}
              phone={shareTarget.phone || undefined}
              onClose={() => setShareTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
