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
  CalendarClock,
  CheckCircle2,
  Circle,
  Dot,
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

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string; dotColor: string; textDot: string }> = {
  "Plumbing":           { icon: Wrench,     color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800", dotColor: "bg-orange-500", textDot: "text-orange-500" },
  "Electrical":         { icon: Zap,        color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800", dotColor: "bg-yellow-500", textDot: "text-yellow-500" },
  "Pool Maintenance":   { icon: Waves,      color: "text-cyan-600 dark:text-cyan-400",   bgColor: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",   dotColor: "bg-cyan-500",   textDot: "text-cyan-500" },
  "Solar Installation": { icon: Sun,        color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", dotColor: "bg-amber-500", textDot: "text-amber-500" },
  "Gardening":          { icon: Leaf,       color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800", dotColor: "bg-green-500", textDot: "text-green-500" },
  "Pest Control":       { icon: Bug,        color: "text-lime-700 dark:text-lime-400",   bgColor: "bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800",   dotColor: "bg-lime-600",   textDot: "text-lime-600" },
  "Painting":           { icon: Paintbrush, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800", dotColor: "bg-purple-500", textDot: "text-purple-500" },
  "General Maintenance":{ icon: Wrench,     color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700", dotColor: "bg-slate-500", textDot: "text-slate-500" },
  "Leak Detection":     { icon: Droplets,   color: "text-blue-600 dark:text-blue-400",   bgColor: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",   dotColor: "bg-blue-500",   textDot: "text-blue-500" },
  "Water Purification": { icon: Droplets,   color: "text-teal-600 dark:text-teal-400",   bgColor: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",   dotColor: "bg-teal-500",   textDot: "text-teal-500" },
  "Building":           { icon: HardHat,    color: "text-sky-600 dark:text-sky-400",     bgColor: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800",       dotColor: "bg-sky-500",    textDot: "text-sky-500" },
};

const SEVERITY_CONFIG = {
  low:    { label: "Low",    color: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",   barColor: "bg-emerald-500" },
  medium: { label: "Medium", color: "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",           barColor: "bg-amber-500" },
  high:   { label: "High",   color: "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",       barColor: "bg-orange-500" },
  urgent: { label: "Urgent", color: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30",                   barColor: "bg-red-500" },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Plumbing":            ["plumber", "plumbing", "plumb"],
  "Electrical":          ["electrician", "electrical", "electric"],
  "Pool Maintenance":    ["pool"],
  "Solar Installation":  ["solar"],
  "Gardening":           ["garden", "gardener", "landscap"],
  "Pest Control":        ["pest", "termite", "exterminator"],
  "Painting":            ["paint", "painter"],
  "General Maintenance": ["handyman", "maintenance", "general", "repair", "renovate"],
  "Leak Detection":      ["leak"],
  "Water Purification":  ["water purif", "filtration"],
  "Building":            ["builder", "building", "plaster", "plasterer", "construct", "mason", "bricklayer"],
};

interface EnrichedProvider extends Provider {
  matchedCategories: string[];
}

function getProviderMatchDetails(provider: Provider, categories: string[]): { matched: boolean; matchedCategories: string[] } {
  const matchedCategories: string[] = [];
  for (const category of categories) {
    const catLower = category.toLowerCase();
    const serviceMatch = provider.services?.some((s) => s.toLowerCase() === catLower);
    if (serviceMatch) {
      if (!matchedCategories.includes(category)) matchedCategories.push(category);
      continue;
    }
    const keywords = CATEGORY_KEYWORDS[category] || [catLower];
    if (keywords.some((kw) => provider.category.toLowerCase().includes(kw))) {
      if (!matchedCategories.includes(category)) matchedCategories.push(category);
    }
  }
  return { matched: matchedCategories.length > 0, matchedCategories };
}

interface TimelineStep {
  id: string;
  label: string;
  detail: string;
  estimate: string;
  done: boolean;
  active: boolean;
}

function buildTimeline(severity: string, issues: MaintIssue[]): TimelineStep[] {
  const urgentCategories = ["Plumbing", "Leak Detection", "Electrical"];
  const longCategories = ["Building", "Solar Installation"];
  const hasUrgent = issues.some((i) => urgentCategories.includes(i.category));
  const hasLong = issues.some((i) => longCategories.includes(i.category));

  const contactWindow =
    severity === "urgent" ? "Same day" :
    severity === "high" ? "1–2 days" : "2–5 days";

  const bookWindow =
    severity === "urgent" ? "Within 24 hrs" :
    severity === "high" ? "Within 3 days" : "Within 1 week";

  const repairWindow =
    hasLong && hasUrgent ? "1–3 weeks" :
    hasLong ? "2–4 weeks" :
    hasUrgent ? "2–5 days" : "1–2 weeks";

  const tradeList = [...new Set(issues.map((i) => i.category))].join(" & ");

  return [
    { id: "diagnosed", label: "Diagnosed",          detail: "Issue captured by mAInt AI",         estimate: "Today",       done: true,  active: false },
    { id: "quotes",    label: "Get quotes",          detail: "Contact matched suppliers & compare", estimate: contactWindow, done: false, active: true  },
    { id: "book",      label: "Book tradesperson",   detail: "Schedule and confirm the work",       estimate: bookWindow,    done: false, active: false },
    { id: "complete",  label: "Repairs complete",    detail: tradeList + " work done",              estimate: repairWindow,  done: false, active: false },
  ];
}

function formatRelativeDate(dateStr: string | null | Date): string {
  if (!dateStr) return "";
  const date = new Date(dateStr as string);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function UploadZone({ onFileSelect, isAnalyzing }: { onFileSelect: (file: File, preview: string) => void; isAnalyzing: boolean }) {
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-10 text-center">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full gradient-teal opacity-30 animate-ping" />
          <div className="absolute inset-0 rounded-full gradient-teal animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
        <h3 className="font-bold text-lg mb-1">Analysing your photo…</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
          mAInt is identifying the issues and recommending the right tradespeople
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-xs text-primary font-semibold">Powered by AI Vision</span>
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
        className={`glass-card rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? "border-2 border-primary bg-primary/5 scale-[1.02]"
            : "border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/2"
        }`}
        data-testid="maint-drop-zone"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl gradient-teal flex items-center justify-center mb-5 shadow-lg">
          <FileUp className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2">Upload a photo</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5 leading-relaxed">
          Take or upload a photo of the maintenance issue — mAInt will identify what's wrong and which tradespeople you need.
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">JPG, PNG, WebP</span>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ""; }}
          className="hidden" data-testid="input-maint-photo" />
      </div>
      <Button variant="outline" className="w-full rounded-xl h-12 gap-2" onClick={() => cameraInputRef.current?.click()} data-testid="button-maint-camera">
        <Camera className="w-4 h-4" />
        Take Photo with Camera
      </Button>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} className="hidden" />
    </div>
  );
}

function TradeCard({ issue, index }: { issue: MaintIssue; index: number }) {
  const cfg = CATEGORY_CONFIG[issue.category] || CATEGORY_CONFIG["General Maintenance"];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.08, duration: 0.35 }}
      className={`rounded-2xl border p-4 ${cfg.bgColor}`}
      data-testid={`trade-card-${index}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.dotColor} bg-opacity-15`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div>
          <h3 className={`font-bold text-sm ${cfg.color}`}>{issue.category}</h3>
          <p className="text-[10px] text-muted-foreground leading-tight">{issue.title}</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {issue.tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" data-testid={`task-${index}-${i}`}>
            <div className={`w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0 ${cfg.dotColor}`} />
            <span className="leading-snug">{task}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function TimelineSection({ steps }: { steps: TimelineStep[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="glass-card rounded-2xl p-5"
      data-testid="section-timeline"
    >
      <div className="flex items-center gap-2 mb-5">
        <CalendarClock className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold">Repair Timeline</span>
      </div>
      <div className="relative">
        <div className="absolute left-[18px] top-6 bottom-2 w-0.5 bg-border/60" />
        <div className="space-y-5">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-3" data-testid={`timeline-step-${step.id}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 border-2 ${
                step.done
                  ? "bg-primary border-primary text-white"
                  : step.active
                  ? "bg-amber-500/10 border-amber-500"
                  : "bg-background border-border"
              }`}>
                {step.done
                  ? <CheckCircle2 className="w-4 h-4" />
                  : step.active
                  ? <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  : <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />}
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className={`font-semibold text-sm ${step.done ? "text-primary" : step.active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    step.done
                      ? "bg-primary/10 text-primary"
                      : step.active
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {step.estimate}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug truncate">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function EnrichedProviderCard({ provider, allIssueCategories }: { provider: Provider; allIssueCategories: string[] }) {
  const { matchedCategories } = getProviderMatchDetails(provider, allIssueCategories);

  const primaryMatchCfg = matchedCategories.length > 0
    ? (CATEGORY_CONFIG[matchedCategories[0]] || CATEGORY_CONFIG["General Maintenance"])
    : null;

  return (
    <div
      className="rounded-xl border border-border/60 bg-background/60 dark:bg-card/60 p-4 flex items-center gap-3 hover:shadow-md hover:border-border transition-all duration-200"
      data-testid={`matched-provider-${provider.id}`}
    >
      <div className="w-12 h-12 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0 shadow-sm">
        <Store className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{provider.name}</p>
        <p className="text-[11px] text-muted-foreground capitalize">{provider.category}</p>
        {matchedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {matchedCategories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG["General Maintenance"];
              return (
                <span
                  key={cat}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.color} uppercase tracking-wide`}
                >
                  {cat}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {provider.phone && (
          <a href={`tel:${provider.phone}`}
            className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-200 shadow-sm"
            data-testid={`provider-phone-${provider.id}`} title="Call">
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        {provider.whatsapp && (
          <a href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 shadow-sm"
            data-testid={`provider-whatsapp-${provider.id}`} title="WhatsApp">
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        )}
        {provider.email && (
          <a href={`mailto:${provider.email}`}
            className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-200 shadow-sm"
            data-testid={`provider-email-${provider.id}`} title="Email">
            <Mail className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function SuppliersSection({ issues, estateId }: { issues: MaintIssue[]; estateId?: string }) {
  const { data: allProviders = [] } = useQuery<Provider[]>({
    queryKey: [estateId ? `/api/providers?estateId=${estateId}` : "/api/providers"],
  });

  const issueCategories = issues.map((i) => i.category);

  const enriched: EnrichedProvider[] = allProviders
    .map((p) => {
      const { matchedCategories } = getProviderMatchDetails(p, issueCategories);
      return { ...p, matchedCategories };
    })
    .filter((p) => p.matchedCategories.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-6 rounded-full gradient-teal" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {estateId ? "Approved Suppliers in Your Estate" : "Available Suppliers"}
        </span>
      </div>

      {enriched.length > 0 ? (
        <div className="glass-card rounded-2xl p-4" data-testid="section-matched-providers">
          <p className="text-xs text-muted-foreground mb-4">
            {enriched.length} supplier{enriched.length !== 1 ? "s" : ""} matched to the identified issues
          </p>
          <div className="space-y-2.5">
            {issues.map((issue) => {
              const matchedForIssue = enriched.filter((p) => p.matchedCategories.includes(issue.category));
              if (matchedForIssue.length === 0) return null;
              const cfg = CATEGORY_CONFIG[issue.category] || CATEGORY_CONFIG["General Maintenance"];
              const Icon = cfg.icon;
              return (
                <div key={issue.category} className="space-y-2" data-testid={`supplier-group-${issue.category}`}>
                  <div className={`flex items-center gap-2 py-1 px-3 rounded-lg text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {issue.category}
                  </div>
                  {matchedForIssue.map((p) => (
                    <EnrichedProviderCard key={p.id} provider={p} allIssueCategories={issueCategories} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center" data-testid="section-no-matched-providers">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-sm">No matching suppliers found</p>
          <p className="text-xs text-muted-foreground mt-1.5 mb-4 max-w-xs mx-auto">
            {estateId
              ? "No approved suppliers in your estate match these trade categories yet."
              : "Browse all providers or request a new supplier."}
          </p>
          <Link href="/providers">
            <Button variant="outline" size="sm" className="rounded-xl gap-2" data-testid="button-browse-all-providers">
              Browse All Providers
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
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
  const sevCfg = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.medium;
  const timeline = buildTimeline(result.severity, result.issues);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full gradient-teal" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Diagnosis</span>
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1.5 rounded-lg h-8" onClick={onReset} data-testid="button-maint-reset">
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
        <div className="relative h-52 md:h-60 overflow-hidden">
          <img src={previewSrc} alt="Maintenance photo" className="w-full h-full object-cover" data-testid="maint-photo-thumbnail" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-3 right-3">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${sevCfg.color}`} data-testid="maint-severity-badge">
              ● {sevCfg.label} severity
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-white font-bold text-lg md:text-xl leading-tight drop-shadow-sm" data-testid="maint-diagnosis-title">
              {result.title}
            </h2>
          </div>
        </div>
        <div className="p-4 pb-3">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="maint-diagnosis-description">
            {result.description}
          </p>
        </div>
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {result.issues.map((issue) => {
            const cfg = CATEGORY_CONFIG[issue.category] || CATEGORY_CONFIG["General Maintenance"];
            const Icon = cfg.icon;
            return (
              <span key={issue.category} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bgColor} ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {issue.category}
              </span>
            );
          })}
        </div>
      </motion.div>

      <TimelineSection steps={timeline} />

      {result.issues.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full gradient-teal" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What Needs to Be Fixed</span>
          </div>
          <div className={`grid gap-3 ${result.issues.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {result.issues.map((issue, i) => <TradeCard key={i} issue={issue} index={i} />)}
          </div>
        </>
      )}

      <SuppliersSection issues={result.issues} estateId={estateId} />

      {result.issues.length === 0 && (
        <div className="glass-card rounded-2xl p-6 text-center" data-testid="section-no-issues">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-sm">No maintenance issue detected</p>
          <p className="text-xs text-muted-foreground mt-1">Try uploading a clearer photo showing the problem area.</p>
        </div>
      )}
    </div>
  );
}

function HistoryItem({ item, estateId }: { item: MaintAnalysis; estateId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const issues: MaintIssue[] = (() => {
    try { return JSON.parse(item.issues); } catch { return []; }
  })();

  const sevCfg = SEVERITY_CONFIG[item.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/maint/analyses/${item.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maint/analyses"] });
      toast({ title: "Deleted", description: "Maintenance record removed." });
    },
    onError: () => toast({ title: "Error", description: "Could not delete this record.", variant: "destructive" }),
  });

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: [estateId ? `/api/providers?estateId=${estateId}` : "/api/providers"],
    enabled: expanded,
  });

  const issueCategories = issues.map((i) => i.category);
  const enrichedProviders = providers
    .map((p) => {
      const { matchedCategories } = getProviderMatchDetails(p, issueCategories);
      return { ...p, matchedCategories };
    })
    .filter((p) => p.matchedCategories.length > 0);

  return (
    <div className="glass-card rounded-2xl overflow-hidden" data-testid={`history-item-${item.id}`}>
      <div className="flex items-start gap-3 p-4">
        {item.photoUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
            <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" data-testid={`history-photo-${item.id}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`history-title-${item.id}`}>{item.title}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${sevCfg.color}`} data-testid={`history-severity-${item.id}`}>
              {sevCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">{formatRelativeDate(item.createdAt)}</span>
          </div>
          {issues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {issues.map((iss) => {
                const cfg = CATEGORY_CONFIG[iss.category] || CATEGORY_CONFIG["General Maintenance"];
                const Icon = cfg.icon;
                return (
                  <span key={iss.category} className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bgColor} ${cfg.color}`}>
                    <Icon className="w-2.5 h-2.5" />
                    {iss.category}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center border-t border-border/40 px-3 py-2 gap-2">
        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1.5 rounded-lg justify-start" onClick={() => setExpanded((v) => !v)} data-testid={`button-history-expand-${item.id}`}>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "View details & suppliers"}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 flex-shrink-0" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid={`button-history-delete-${item.id}`}>
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-4 pb-5 space-y-4 border-t border-border/40 pt-4">
              {item.description && <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>}

              {issues.length > 0 && (
                <div className={`grid gap-3 ${issues.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {issues.map((issue, i) => <TradeCard key={i} issue={issue} index={i} />)}
                </div>
              )}

              {issues.length > 0 && (
                <TimelineSection steps={buildTimeline(item.severity, issues)} />
              )}

              {enrichedProviders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matched Suppliers</p>
                  <div className="space-y-2">
                    {enrichedProviders.map((p) => (
                      <EnrichedProviderCard key={p.id} provider={p} allIssueCategories={issueCategories} />
                    ))}
                  </div>
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
  const { data: analyses = [], isLoading } = useQuery<MaintAnalysis[]>({ queryKey: ["/api/maint/analyses"] });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="glass-card rounded-2xl h-24 animate-pulse" />)}
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-10 text-center" data-testid="section-history-empty">
        <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="font-semibold">No saved diagnoses yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          Upload a photo to analyse a maintenance issue — results are saved automatically.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{analyses.length} saved diagnosis{analyses.length !== 1 ? "es" : ""}</p>
      {analyses.map((item) => <HistoryItem key={item.id} item={item} estateId={estateId} />)}
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

        const res = await fetch("/api/maint/analyze", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Analysis failed" }));
          throw new Error(err.message || "Analysis failed");
        }
        const data = await res.json();
        setResult(data.analysis);
        queryClient.invalidateQueries({ queryKey: ["/api/maint/analyses"] });
      } catch (err: any) {
        toast({ title: "Analysis failed", description: err.message || "Could not analyze the photo. Please try again with a clearer image.", variant: "destructive" });
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
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0 shadow-sm">
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
        {(["diagnose", "history"] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all duration-200 capitalize ${
              activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            {tab === "diagnose" ? <Sparkles className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
            {tab === "diagnose" ? "Diagnose" : "History"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "diagnose" ? (
          <motion.div key="diagnose-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
            {!result && !isAnalyzing && (
              <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">How it works</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Upload a photo of anything that needs fixing. mAInt identifies what's wrong, assesses severity, builds a repair timeline, and matches you with the right approved suppliers. Results are saved automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {result && previewSrc ? (
                <ResultsView key="results" result={result} previewSrc={previewSrc} estateId={currentEstate?.id} onReset={handleReset} />
              ) : (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <UploadZone onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="history-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <HistoryTab estateId={currentEstate?.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
