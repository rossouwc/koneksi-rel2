import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useSupplierProfile } from "@/hooks/use-supplier-profile";
import { useToast } from "@/hooks/use-toast";
import { SERVICE_OPTIONS } from "@shared/schema";
import {
  Pencil,
  X,
  Check,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Briefcase,
  ChevronDown,
  Camera,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

function CompanyAvatar({ logoUrl, businessName, size = "lg" }: { logoUrl: string | null | undefined; businessName: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-10 h-10 text-base rounded-xl",
    md: "w-12 h-12 text-lg rounded-xl",
    lg: "w-16 h-16 text-2xl rounded-2xl",
  };
  const initial = businessName ? businessName.charAt(0).toUpperCase() : "B";

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} overflow-hidden flex-shrink-0 bg-white dark:bg-zinc-800 ring-1 ring-border`}>
        <img src={logoUrl} alt={businessName || "Company"} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center flex-shrink-0`}>
      <Briefcase className={size === "lg" ? "w-8 h-8 text-white" : "w-5 h-5 text-white"} />
    </div>
  );
}

export default function SupplierProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { profile, isLoading, updateProfile } = useSupplierProfile();
  const [editing, setEditing] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editServices, setEditServices] = useState<string[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLogoUrl = profile?.avatarUrl ?? (user as any)?.avatarUrl ?? null;

  const startEdit = () => {
    if (!profile) return;
    setEditBusinessName(profile.businessName || "");
    setEditWebsite(profile.businessWebsite || "");
    setEditPhone(profile.phone || "");
    setEditServices(profile.services || []);
    setEditing(true);
  };

  const handleSave = () => {
    setShowServiceDropdown(false);
    if (!editBusinessName.trim()) {
      toast({ title: "Error", description: "Business name is required", variant: "destructive" });
      return;
    }
    if (editServices.length === 0) {
      toast({ title: "Error", description: "At least one service is required", variant: "destructive" });
      return;
    }
    updateProfile.mutate(
      {
        businessName: editBusinessName.trim(),
        businessWebsite: editWebsite.trim() || null,
        phone: editPhone.trim(),
        services: editServices,
      },
      {
        onSuccess: () => {
          setEditing(false);
          toast({ title: "Profile updated" });
        },
      }
    );
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5 MB", variant: "destructive" });
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/marketplace/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      await updateProfile.mutateAsync({ avatarUrl: data.url });
      toast({ title: "Logo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUploading(true);
    try {
      await updateProfile.mutateAsync({ avatarUrl: null });
      toast({ title: "Logo removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-heading">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your business information</p>
        </div>
        {!editing && (
          <Button
            onClick={startEdit}
            className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white gap-1.5"
            data-testid="button-edit-profile"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 space-y-4"
      >
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Company Logo</p>
          <div className="flex items-center gap-4">
            <div className="relative">
              <CompanyAvatar logoUrl={currentLogoUrl} businessName={profile?.businessName || user?.fullName} size="lg" />
              {logoUploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-logo-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5 text-xs"
                disabled={logoUploading}
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-logo"
              >
                <Camera className="w-3.5 h-3.5" />
                {currentLogoUrl ? "Change Logo" : "Upload Logo"}
              </Button>
              {currentLogoUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={logoUploading}
                  onClick={handleRemoveLogo}
                  data-testid="button-remove-logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5 MB</p>
            </div>
          </div>
        </div>
      </motion.div>

      {editing ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 space-y-4"
        >
          <div>
            <Label className="text-sm">Business Name</Label>
            <Input
              data-testid="input-edit-business-name"
              value={editBusinessName}
              onChange={(e) => setEditBusinessName(e.target.value)}
              className="rounded-xl mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">Website</Label>
            <Input
              data-testid="input-edit-website"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
              placeholder="https://..."
              className="rounded-xl mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">Phone</Label>
            <Input
              data-testid="input-edit-phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="rounded-xl mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">Services</Label>
            <div className="relative mt-1.5">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl justify-between text-sm font-normal h-10"
                onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                data-testid="button-edit-services-dropdown"
              >
                {editServices.length > 0 ? `${editServices.length} selected` : "Select services"}
                <ChevronDown className={`w-4 h-4 transition-transform ${showServiceDropdown ? "rotate-180" : ""}`} />
              </Button>
              {showServiceDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border bg-popover shadow-lg overflow-hidden">
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {[...SERVICE_OPTIONS].map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => {
                          setEditServices(
                            editServices.includes(service)
                              ? editServices.filter((s) => s !== service)
                              : [...editServices, service]
                          );
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                          editServices.includes(service) ? "bg-teal-600/10 text-teal-700 dark:text-teal-300 font-medium" : "text-foreground hover:bg-muted/50"
                        }`}
                        data-testid={`option-edit-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] ${
                          editServices.includes(service) ? "bg-teal-600 border-teal-600 text-white" : "border-muted-foreground/30"
                        }`}>
                          {editServices.includes(service) && "✓"}
                        </span>
                        {service}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editServices.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {editServices.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer ${getServiceColor(s)}`}
                      onClick={() => setEditServices(editServices.filter((x) => x !== s))}
                    >
                      {s} <X className="w-2.5 h-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white gap-1.5 flex-1"
              data-testid="button-save-profile"
            >
              <Check className="w-4 h-4" />
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setEditing(false); setShowServiceDropdown(false); }}
              className="rounded-xl"
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-start gap-4">
            <CompanyAvatar logoUrl={currentLogoUrl} businessName={profile?.businessName || user?.fullName} size="lg" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold" data-testid="text-profile-business-name">
                {profile?.businessName || user?.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.fullName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 text-sm glass-card rounded-xl p-3">
              <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <span className="truncate" data-testid="text-profile-email">{profile?.email || user?.email}</span>
            </div>
            {(profile?.phone || user?.phone) && (
              <div className="flex items-center gap-3 text-sm glass-card rounded-xl p-3">
                <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span data-testid="text-profile-phone">{profile?.phone || user?.phone}</span>
              </div>
            )}
            {profile?.businessWebsite && (
              <a
                href={profile.businessWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm glass-card rounded-xl p-3 hover:ring-1 hover:ring-teal-500/30 transition-all"
                data-testid="link-profile-website"
              >
                <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span className="text-teal-700 dark:text-teal-300 truncate">{profile.businessWebsite.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
              </a>
            )}
          </div>

          {profile?.services && profile.services.length > 0 && (
            <div data-testid="container-profile-services">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Services</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.services.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getServiceColor(s)}`}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
