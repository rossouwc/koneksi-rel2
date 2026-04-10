import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Building2, User, Mail, Phone, Lock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

interface InviteDetails {
  id: string;
  providerName: string;
  providerEmail?: string;
  providerPhone?: string;
  category?: string;
  estateName: string;
  inviterName: string;
  status: string;
}

export default function JoinProviderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setInviteError("No invitation token provided.");
      setInviteLoading(false);
      return;
    }
    fetch(`/api/providers/invite/${token}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Invitation not found");
        }
        return res.json();
      })
      .then((data) => {
        setInvite(data);
        setFullName(data.providerName || "");
        setEmail(data.providerEmail || "");
        setPhone(data.providerPhone || "");
        setInviteLoading(false);
      })
      .catch((err) => {
        setInviteError(err.message);
        setInviteLoading(false);
      });
  }, [token]);

  const claimMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/providers/claim-invite", {
        token,
        fullName,
        email,
        phone: phone || null,
        password,
        services: invite?.category ? [invite.category] : [],
      });
    },
    onSuccess: () => {
      toast({
        title: "Registration complete!",
        description: "Your provider profile has been created and is pending approval.",
      });
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please check your password.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    claimMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <img src={koneksiLogo} alt="Koneksi" className="h-6 dark:brightness-100 brightness-0" />
          </div>
        </div>

        {inviteLoading ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-8 h-8 mx-auto rounded-xl gradient-teal animate-pulse mb-4" />
            <p className="text-sm text-muted-foreground">Loading invitation details...</p>
          </div>
        ) : inviteError ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-bold mb-2">Invitation Not Found</h2>
            <p className="text-sm text-muted-foreground">{inviteError}</p>
            <Button className="mt-6 rounded-xl" onClick={() => setLocation("/")} variant="outline">
              Go to Koneksi
            </Button>
          </div>
        ) : invite?.status === "registered" || invite?.status === "approved" || invite?.status === "rejected" ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-bold mb-2">Invitation Already Used</h2>
            <p className="text-sm text-muted-foreground">This invitation has already been claimed. If you have an account, please sign in.</p>
            <Button className="mt-6 rounded-xl gradient-teal text-white" onClick={() => setLocation("/")}>
              Sign In
            </Button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">You've been invited!</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{invite?.inviterName}</span> has invited you to join{" "}
                <span className="font-medium text-foreground">{invite?.estateName}</span> as a{" "}
                {invite?.category && <span className="font-medium text-primary">{invite.category} </span>}
                provider on Koneksi.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm">Full Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-join-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name or business name"
                    className="pl-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-join-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Phone Number <span className="text-muted-foreground">(optional)</span></Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-join-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27821234567"
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              {invite?.category && (
                <div>
                  <Label className="text-sm">Service Category</Label>
                  <div className="relative mt-1.5">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={invite.category}
                      readOnly
                      className="pl-10 rounded-xl bg-muted/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-join-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="pl-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Confirm Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-join-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="pl-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl gradient-teal text-white"
                disabled={claimMutation.isPending}
                data-testid="button-join-submit"
              >
                {claimMutation.isPending ? "Registering..." : "Complete Registration"}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              By registering, you agree to Koneksi's terms. Your profile will be reviewed by the estate admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
