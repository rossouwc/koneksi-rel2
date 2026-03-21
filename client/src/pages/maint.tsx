import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEstate } from "@/lib/estate-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Camera,
  Wrench,
  Zap,
  Droplets,
  Leaf,
  Bug,
  Paintbrush,
  Sun,
  Waves,
  HardHat,
  FileUp,
  Loader2,
  Sparkles,
  AlertTriangle,
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  Store,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  History,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Provider, MaintAnalysis } from "@shared/schema";

interface MaintIssue {
  title: string;
  description: string;
  category: string;
  tasks: string[];
}

interface MaintAnalysisResult {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "urgent";
  issues: MaintIssue[];
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string; dotColor: string }> = {
  "Plumbing": { icon: Wrench, color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800", dotColor: "bg-orange-500" },
  "Electrical": { icon: Zap, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800", dotColor: "bg-yellow-500" },
  "Pool Maintenance": { icon: Waves, color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800", dotColor: "bg-cyan-500" },
  "Solar Installation": { icon: Sun, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", dotColor: "bg-amber-500" },
  "Gardening": { icon: Leaf, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800", dotColor: "bg-green-500" },
  "Pest Control": { icon: Bug, color: "text-lime-700 dark:text-lime-400", bgColor: "bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800", dotColor: "bg-lime-600" },
  "Painting": { icon: Paintbrush, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800", dotColor: "bg-purple-500" },
  "General Maintenance": { icon: Wrench, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700", dotColor: "bg-slate-500" },
  "Leak Detection": { icon: Droplets, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800", dotColor: "bg-blue-500" },
  "Water Purification": { icon: Droplets, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800", dotColor: "bg-teal-500" },
  "Building": { icon: HardHat, color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800", dotColor: "bg-sky-500" },
};

const SEVERITY_CONFIG = {
  low: { label: "Low", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30", dot: "bg-emerald-500" },
  medium: { label: "Medium", color: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30", dot: "bg-amber-500" },
  high: { label: "High", color: "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30", dot: "bg-orange-500" },
  urgent: { label: "Urgent", color: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30", dot: "bg-red-500" },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Plumbing": ["plumber", "plumbing", "plumb"],
  "Electrical": ["electrician", "electrical", "electric"],
  "Pool Maintenance": ["pool"],
  "Solar Installation": ["solar"],
  "Gardening": ["garden", "gardener", "landscap"],
  "Pest Control": ["pest", "termite", "exterminator"],
  "Painting": ["paint", "painter"],
  "General Maintenance": ["handyman", "maintenance", "general", "repair", "renovate"],
  "Leak Detection": ["leak"],
  "Water Purification": ["water purif", "filtration"],
  "Building": ["builder", "building", "plaster", "plasterer", "construct", "mason", "bricklayer"],
};

function providerMatchesCategory(provider: Provider, categories: string[]): boolean {
  for (const category of categories) {
    const catLower = category.toLowerCase();
    if (provider.services?.some((s) => s.toLowerCase() === catLower)) return true;
    const keywords = CATEGORY_KEYWORDS[category] || [catLower];
    if (keywords.some((kw) => provider.category.toLowerCase().includes(kw))) return true;
  }
  return false;
}

function formatRelativeDate(dateStr: string | null | Date): string {
  if (!dateStr) return "";
  const date = new Date(dateStr as string);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function UploadZone({
  onFileSelect,
  isAnalyzing,
}: {
  onFileSelect: (file: File, preview: string) => void;
  isAnalyzing: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onloadend = () => onFileSelect(file, reader.result as string);
      reader.readAsDataURL(file);
    },
    [onFileSelect]
  );

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-2xl p-8 text-center"
      >
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full gradient-teal animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        </div>
        <h3 className="font-semibold text-base mb-1">Analysing your photo...</h3>
        <p className="text-sm text-muted-foreground mb-3">
          mAInt AI is identifying the issues and recommending the right tradespeople
        </p>
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Powered by AI Vision</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-card rounded-2xl p-8 md:p-10 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? "border-2 border-primary bg-primary/5 scale-[1.02]"
            : "border-2 border-dashed border-border/60 hover:border-primary/40"
        }`}
        data-testid="maint-drop-zone"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl gradient-teal flex items-center justify-center mb-4">
          <FileUp className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold mb-1">Upload a photo</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Take or upload a photo of the maintenance issue — mAInt will identify what's wrong and which tradespeople you need.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">JPG, PNG, WebP</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="hidden"
          data-testid="input-maint-photo"
        />
      </div>
      <Button
        variant="outline"
        className="w-full rounded-xl h-12"
        onClick={() => cameraInputRef.current?.click()}
        data-testid="button-maint-camera"
      >
        <Camera className="w-4 h-4 mr-2" />
        Take Photo with Camera
      </Button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />
    </div>
  );
}

function TradeCard({ issue, index }: { issue: MaintIssue; index: number }) {
  const config = CATEGORY_CONFIG[issue.category] || CATEGORY_CONFIG["General Maintenance"];
  const Icon = config.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
      className={`rounded-2xl border p-4 ${config.bgColor}`}
      data-testid={`trade-card-${index}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.dotColor} bg-opacity-20`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <h3 className={`font-bold text-sm md:text-base ${config.color}`}>{issue.category}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{issue.description}</p>
      <ul className="space-y-1.5">
        {issue.tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" data-testid={`task-${index}-${i}`}>
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${config.dotColor}`} />
            <span>{task}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function ProviderMatch({ provider }: { provider: Provider }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40"
      data-testid={`matched-provider-${provider.id}`}
    >
      <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
        <Store className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{provider.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{provider.category}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {provider.phone && (
          <a
            href={`tel:${provider.phone}`}
            className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            data-testid={`provider-phone-${provider.id}`}
            title="Call"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        {provider.whatsapp && (
          <a
            href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            data-testid={`provider-whatsapp-${provider.id}`}
            title="WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        )}
        {provider.email && (
          <a
            href={`mailto:${provider.email}`}
            className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
            data-testid={`provider-email-${provider.id}`}
            title="Email"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ResultsView({
  result,
  previewSrc,
  estateId,
  onReset,
}: {
  result: MaintAnalysisResult;
  previewSrc: string;
  estateId?: string;
  onReset: () => void;
}) {
  const sevConfig = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.medium;
  const requiredCategories = result.issues.map((i) => i.category);

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: [estateId ? `/api/providers?estateId=${estateId}` : "/api/providers"],
    enabled: true,
  });

  const matchedProviders = providers.filter((p) => providerMatchesCategory(p, requiredCategories));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full gradient-teal" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diagnosis</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 rounded-lg"
          onClick={onReset}
          data-testid="button-maint-reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Photo
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-2xl overflow-hidden"
        data-testid="maint-diagnosis-card"
      >
        <div className="relative h-48 md:h-56 overflow-hidden">
          <img
            src={previewSrc}
            alt="Submitted maintenance photo"
            className="w-full h-full object-cover"
            data-testid="maint-photo-thumbnail"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-white font-bold text-base md:text-lg leading-tight" data-testid="maint-diagnosis-title">
                {result.title}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${sevConfig.color}`} data-testid="maint-severity-badge">
                {sevConfig.label}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="maint-diagnosis-description">
            {result.description}
          </p>
        </div>
      </motion.div>

      {result.issues.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full gradient-teal" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tradespeople Needed</span>
          </div>
          <div className={`grid gap-3 ${result.issues.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {result.issues.map((issue, i) => (
              <TradeCard key={i} issue={issue} index={i} />
            ))}
          </div>
        </>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 rounded-full gradient-teal" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {estateId ? "Approved Suppliers in Your Estate" : "Available Suppliers"}
          </span>
        </div>

        {matchedProviders.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="glass-card rounded-2xl p-4 space-y-2"
            data-testid="section-matched-providers"
          >
            <p className="text-xs text-muted-foreground mb-3">
              {matchedProviders.length} approved supplier{matchedProviders.length !== 1 ? "s" : ""} can help with the identified issues
            </p>
            {matchedProviders.map((p) => (
              <ProviderMatch key={p.id} provider={p} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="glass-card rounded-2xl p-5 text-center"
            data-testid="section-no-matched-providers"
          >
            <Store className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">No matching suppliers found</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {estateId
                ? "No approved suppliers in your estate match these trades yet."
                : "Select an estate or browse all providers to find help."}
            </p>
            <Link href="/providers">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" data-testid="button-browse-all-providers">
                Browse All Providers
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ item, estateId }: { item: MaintAnalysis; estateId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const issues: MaintIssue[] = (() => {
    try { return JSON.parse(item.issues); } catch { return []; }
  })();

  const sevConfig = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/maint/analyses/${item.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maint/analyses"] });
      toast({ title: "Deleted", description: "Maintenance record removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete this record.", variant: "destructive" });
    },
  });

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: [estateId ? `/api/providers?estateId=${estateId}` : "/api/providers"],
    enabled: expanded,
  });

  const requiredCategories = issues.map((i) => i.category);
  const matchedProviders = providers.filter((p) => providerMatchesCategory(p, requiredCategories));

  return (
    <div className="glass-card rounded-2xl overflow-hidden" data-testid={`history-item-${item.id}`}>
      <div className="flex items-start gap-3 p-4">
        {item.photoUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={item.photoUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              data-testid={`history-photo-${item.id}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-tight" data-testid={`history-title-${item.id}`}>{item.title}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sevConfig.color}`} data-testid={`history-severity-${item.id}`}>
              {sevConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Clock className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">{formatRelativeDate(item.createdAt)}</span>
          </div>
          {issues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {issues.map((iss, i) => {
                const cfg = CATEGORY_CONFIG[iss.category] || CATEGORY_CONFIG["General Maintenance"];
                return (
                  <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.color}`}>
                    {iss.category}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center border-t border-border/40 px-4 py-2 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 rounded-lg"
          onClick={() => setExpanded((v) => !v)}
          data-testid={`button-history-expand-${item.id}`}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "View details"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 flex-shrink-0"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid={`button-history-delete-${item.id}`}
        >
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
              {item.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              )}
              {issues.length > 0 && (
                <div className={`grid gap-3 ${issues.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {issues.map((issue, i) => (
                    <TradeCard key={i} issue={issue} index={i} />
                  ))}
                </div>
              )}
              {matchedProviders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matched Suppliers</p>
                  {matchedProviders.map((p) => <ProviderMatch key={p.id} provider={p} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryTab({ estateId }: { estateId?: string }) {
  const { data: analyses = [], isLoading } = useQuery<MaintAnalysis[]>({
    queryKey: ["/api/maint/analyses"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-10 text-center"
        data-testid="section-history-empty"
      >
        <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="font-semibold">No saved diagnoses yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a photo to analyse a maintenance issue — results are saved automatically.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {analyses.length} saved diagnosis{analyses.length !== 1 ? "es" : ""}
      </p>
      {analyses.map((item) => (
        <HistoryItem key={item.id} item={item} estateId={estateId} />
      ))}
    </div>
  );
}

export default function MaintPage() {
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"diagnose" | "history">("diagnose");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [result, setResult] = useState<MaintAnalysisResult | null>(null);

  const handleFileSelect = useCallback(
    async (file: File, preview: string) => {
      setPreviewSrc(preview);
      setIsAnalyzing(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("photo", file);
        if (currentEstate?.id) formData.append("estateId", currentEstate.id);

        const res = await fetch("/api/maint/analyze", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Analysis failed" }));
          throw new Error(err.message || "Analysis failed");
        }

        const data = await res.json();
        setResult(data.analysis);
        queryClient.invalidateQueries({ queryKey: ["/api/maint/analyses"] });
      } catch (err: any) {
        toast({
          title: "Analysis failed",
          description: err.message || "Could not analyze the photo. Please try again with a clearer image.",
          variant: "destructive",
        });
        setPreviewSrc(null);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [toast, currentEstate?.id]
  );

  const handleReset = () => {
    setResult(null);
    setPreviewSrc(null);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-maint-title">
              m<span className="text-primary">AI</span>nt
            </h1>
            <p className="text-muted-foreground text-sm">AI-powered home maintenance diagnosis</p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center rounded-xl bg-muted/50 p-1 gap-1">
        <button
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all duration-200 ${
            activeTab === "diagnose"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("diagnose")}
          data-testid="tab-diagnose"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Diagnose
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all duration-200 ${
            activeTab === "history"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
          data-testid="tab-history"
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "diagnose" ? (
          <motion.div
            key="diagnose-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {!result && !isAnalyzing && (
              <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">How it works</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Take or upload a photo of something that needs fixing. Our AI will identify what's wrong, assess the severity, recommend the right tradespeople — and match you with approved suppliers from your estate. Results are saved automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {result && previewSrc ? (
                <ResultsView
                  key="results"
                  result={result}
                  previewSrc={previewSrc}
                  estateId={currentEstate?.id}
                  onReset={handleReset}
                />
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <UploadZone onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
                </motion.div>
              )}
            </AnimatePresence>

            {result && result.issues.length === 0 && (
              <div className="glass-card rounded-2xl p-5 text-center" data-testid="section-no-issues">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-medium">No maintenance issue detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try uploading a clearer photo that shows the problem area more clearly.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <HistoryTab estateId={currentEstate?.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
