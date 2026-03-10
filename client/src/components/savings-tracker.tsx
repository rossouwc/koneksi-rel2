import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useEstate } from "@/lib/estate-context";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  ChevronDown,
  ChevronUp,
  Zap,
  Droplets,
  Receipt,
  Users,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Bill } from "@shared/schema";
import { Link } from "wouter";

interface CategoryData {
  category: string;
  bills: {
    id: string;
    title: string;
    amount: number;
    provider: string | null;
    billingPeriod: string | null;
    periodLabel: string;
    usageKwh: number | null;
    usageKl: number | null;
    tariffRate: number | null;
    date: Date;
    periodDate: Date;
  }[];
  totalSaving: number;
  latestAmount: number;
  previousAmount: number | null;
}

interface ExpenseData {
  categories: CategoryData[];
  totalActualSaving: number;
  totalBills: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  electricity: { label: "Electricity", color: "#eab308", icon: Zap },
  water: { label: "Water", color: "#3b82f6", icon: Droplets },
  municipal: { label: "Municipal", color: "#10b981", icon: Receipt },
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

function parseBillingPeriodDate(periodStr: string | null): Date | null {
  if (!periodStr) return null;
  const parts = periodStr.split(/\s*[-–—]\s*/);
  const target = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  const tokens = target.match(/([A-Za-z]+)\s*(\d{4})/);
  if (!tokens) return null;
  const monthIdx = MONTH_MAP[tokens[1].toLowerCase()];
  const year = parseInt(tokens[2], 10);
  if (monthIdx === undefined || isNaN(year)) return null;
  return new Date(year, monthIdx, 1);
}

function formatPeriodLabel(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
}

function parseExpenseData(bills: Bill[]): ExpenseData {
  const analyzed = bills.filter((b) => b.analysisResult && b.amount);
  const categoryMap = new Map<string, CategoryData["bills"]>();

  for (const bill of analyzed) {
    const cat = bill.category || "other";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);

    let usageKwh = bill.usageKwh;
    let usageKl = bill.usageKl;
    let tariffRate = bill.tariffRate;
    let provider = bill.provider;
    let billingPeriod = bill.billingPeriod;

    if (bill.analysisResult && (!usageKwh || !usageKl || !tariffRate || !provider || !billingPeriod)) {
      try {
        const analysis = JSON.parse(bill.analysisResult);
        const ext = analysis.extracted;
        if (!usageKwh && ext?.usageKwh) usageKwh = Math.round(ext.usageKwh);
        if (!usageKl && ext?.usageKl) usageKl = Math.round(ext.usageKl * 10);
        if (!tariffRate && ext?.tariffRate) tariffRate = Math.round(ext.tariffRate * 100);
        if (!provider && ext?.provider) provider = ext.provider;
        if (!billingPeriod && ext?.billingPeriod) billingPeriod = ext.billingPeriod;
      } catch {}
    }

    const createdDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
    const parsedPeriod = parseBillingPeriodDate(billingPeriod);
    const periodDate = parsedPeriod || createdDate;
    const periodLabel = parsedPeriod
      ? formatPeriodLabel(parsedPeriod)
      : createdDate.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });

    categoryMap.get(cat)!.push({
      id: bill.id,
      title: bill.title,
      amount: bill.amount!,
      provider,
      billingPeriod,
      periodLabel,
      usageKwh,
      usageKl,
      tariffRate,
      date: createdDate,
      periodDate,
    });
  }

  const categories: CategoryData[] = [];
  let totalActualSaving = 0;

  for (const [category, catBills] of categoryMap.entries()) {
    catBills.sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());

    let categorySaving = 0;
    for (let i = 1; i < catBills.length; i++) {
      const diff = catBills[i - 1].amount - catBills[i].amount;
      categorySaving += diff;
    }

    const latest = catBills[catBills.length - 1];
    const previous = catBills.length > 1 ? catBills[catBills.length - 2] : null;

    categories.push({
      category,
      bills: catBills,
      totalSaving: categorySaving,
      latestAmount: latest.amount,
      previousAmount: previous ? previous.amount : null,
    });

    totalActualSaving += categorySaving;
  }

  categories.sort((a, b) => b.bills.length - a.bills.length);

  return {
    categories,
    totalActualSaving,
    totalBills: analyzed.length,
  };
}

function formatRands(cents: number): string {
  return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SpendingChart({ categoryData }: { categoryData: CategoryData }) {
  const config = CATEGORY_CONFIG[categoryData.category] || { label: categoryData.category, color: "#6b7280", icon: Receipt };

  const chartData = categoryData.bills.map((bill) => ({
    period: bill.periodLabel,
    amount: bill.amount / 100,
    usageKwh: bill.usageKwh || undefined,
    usageKl: bill.usageKl != null ? bill.usageKl / 10 : undefined,
  }));

  const hasKwh = chartData.some((d) => d.usageKwh);
  const hasKl = chartData.some((d) => d.usageKl);

  return (
    <div className="space-y-4">
      <div data-testid={`chart-spending-${categoryData.category}`}>
        <p className="text-xs text-muted-foreground font-medium mb-2">Amount Over Time</p>
        <div className="h-[160px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${categoryData.category}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} width={55} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-lg border border-border/30">
                      <p className="font-medium mb-1">{label}</p>
                      <p style={{ color: config.color }}>R{payload[0].value?.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="amount" stroke={config.color} strokeWidth={2} fill={`url(#grad-${categoryData.category})`} animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(hasKwh || hasKl) && (
        <div data-testid={`chart-usage-${categoryData.category}`}>
          <p className="text-xs text-muted-foreground font-medium mb-2">Usage Over Time</p>
          <div className="h-[160px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-lg border border-border/30">
                        <p className="font-medium mb-1">{label}</p>
                        {payload.map((p: any) => (
                          <p key={p.dataKey} style={{ color: p.color }}>
                            {p.dataKey === "usageKwh" ? `${p.value} kWh` : `${p.value} kL`}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                {hasKwh && (
                  <Line type="monotone" dataKey="usageKwh" name="Electricity (kWh)" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} animationDuration={1000} />
                )}
                {hasKl && (
                  <Line type="monotone" dataKey="usageKl" name="Water (kL)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} animationDuration={1000} />
                )}
                <Legend
                  wrapperStyle={{ fontSize: "10px" }}
                  iconSize={8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ categoryData }: { categoryData: CategoryData }) {
  const [expanded, setExpanded] = useState(categoryData.bills.length > 1);
  const config = CATEGORY_CONFIG[categoryData.category] || { label: categoryData.category, color: "#6b7280", icon: Receipt };
  const Icon = config.icon;

  const diff = categoryData.previousAmount != null ? categoryData.previousAmount - categoryData.latestAmount : null;
  const diffPct = diff != null && categoryData.previousAmount ? (diff / categoryData.previousAmount) * 100 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden"
      data-testid={`card-category-${categoryData.category}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
        data-testid={`button-toggle-${categoryData.category}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${config.color}15` }}>
            <Icon className="w-4.5 h-4.5" style={{ color: config.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">{categoryData.bills.length} bill{categoryData.bills.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold">{formatRands(categoryData.latestAmount)}</p>
            {diff != null && (
              <div className={`flex items-center gap-0.5 text-xs font-medium justify-end ${diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {diff > 0 ? <ArrowDownRight className="w-3 h-3" /> : diff < 0 ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {diff !== 0 ? `${Math.abs(diffPct!).toFixed(0)}%` : "0%"}
              </div>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {categoryData.bills.length > 1 ? (
                <>
                  {diff != null && (
                    <div className={`rounded-xl p-3 text-sm ${diff > 0 ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300" : diff < 0 ? "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300" : "bg-muted/30 text-muted-foreground"}`}>
                      {diff > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <TrendingDown className="w-4 h-4" />
                          You saved <strong>{formatRands(diff)}</strong> compared to your previous bill
                        </span>
                      ) : diff < 0 ? (
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" />
                          Your bill increased by <strong>{formatRands(Math.abs(diff))}</strong> from the previous period
                        </span>
                      ) : (
                        <span>Your bill amount stayed the same</span>
                      )}
                    </div>
                  )}
                  <SpendingChart categoryData={categoryData} />
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Bill History</p>
                    {[...categoryData.bills].reverse().map((bill, i) => (
                      <div key={bill.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/20" data-testid={`history-bill-${bill.id}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{bill.periodLabel}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            {bill.usageKwh && <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{bill.usageKwh} kWh</span>}
                            {bill.usageKl != null && <span className="flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5" />{(bill.usageKl / 10).toFixed(1)} kL</span>}
                          </div>
                        </div>
                        <p className="text-sm font-semibold flex-shrink-0">{formatRands(bill.amount)}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <FileUp className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Upload another {config.label.toLowerCase()} bill to start tracking</p>
                  <Link href="/bill-analyzer">
                    <Button variant="outline" size="sm" className="mt-3 rounded-xl" data-testid="button-upload-more">
                      <FileUp className="w-3.5 h-3.5 mr-1.5" />
                      Upload Bill
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SavingsTracker() {
  const { currentEstate } = useEstate();
  const [viewMode, setViewMode] = useState<"personal" | "estate">(currentEstate ? "estate" : "personal");

  const personalUrl = "/api/bills";
  const estateUrl = currentEstate ? `/api/bills?estateId=${currentEstate.id}` : null;

  const { data: personalBills = [], isLoading: personalLoading } = useQuery<Bill[]>({
    queryKey: [personalUrl],
  });

  const { data: estateBills = [], isLoading: estateLoading } = useQuery<Bill[]>({
    queryKey: [estateUrl!],
    enabled: !!estateUrl,
  });

  const isLoading = viewMode === "personal" ? personalLoading : estateLoading;
  const activeBills = viewMode === "estate" && currentEstate ? estateBills : personalBills;

  const expenseData = useMemo(() => parseExpenseData(activeBills), [activeBills]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-[140px] rounded-2xl" />
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  const hasSavings = expenseData.totalActualSaving !== 0;
  const isSaving = expenseData.totalActualSaving > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-expense-heading">
          <Wallet className="w-5 h-5 text-primary" />
          Expense Tracker
        </h2>
        {currentEstate && (
          <div className="flex rounded-xl overflow-hidden border border-border/60" data-testid="toggle-expense-mode">
            <Button
              variant={viewMode === "personal" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("personal")}
              className="rounded-none rounded-l-xl text-xs h-8 gap-1.5"
              data-testid="button-expense-personal"
            >
              <User className="w-3 h-3" />
              Personal
            </Button>
            <Button
              variant={viewMode === "estate" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("estate")}
              className="rounded-none rounded-r-xl text-xs h-8 gap-1.5"
              data-testid="button-expense-estate"
            >
              <Users className="w-3 h-3" />
              Estate
            </Button>
          </div>
        )}
      </div>

      {expenseData.totalBills === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 text-center"
        >
          <Receipt className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No analyzed bills yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload bills via the Bill Analyzer to start tracking your expenses</p>
          <Link href="/bill-analyzer">
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" data-testid="button-start-tracking">
              <FileUp className="w-3.5 h-3.5 mr-1.5" />
              Upload Your First Bill
            </Button>
          </Link>
        </motion.div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: hasSavings && isSaving
                ? "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(15,118,110,0.08) 100%)"
                : hasSavings
                  ? "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.05) 100%)"
                  : "linear-gradient(135deg, rgba(107,114,128,0.08) 0%, rgba(75,85,99,0.05) 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"
              style={{ backgroundColor: isSaving ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.05)" }} />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                {isSaving ? <TrendingDown className="w-3.5 h-3.5 text-emerald-500" /> : hasSavings ? <TrendingUp className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className={`text-xs font-medium uppercase tracking-wider ${isSaving ? "text-emerald-600 dark:text-emerald-400" : hasSavings ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                  {viewMode === "estate" && currentEstate ? `${currentEstate.name}` : "Your Expenses"}
                </span>
              </div>
              <div className="flex items-end gap-3">
                <p className={`text-3xl md:text-4xl font-bold ${isSaving ? "text-emerald-700 dark:text-emerald-300" : hasSavings ? "text-red-600 dark:text-red-400" : "text-foreground"}`} data-testid="text-total-savings">
                  {hasSavings ? (isSaving ? "Saved " : "Increased ") : ""}
                  {hasSavings ? formatRands(Math.abs(expenseData.totalActualSaving)) : "Tracking"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasSavings
                  ? `Across ${expenseData.categories.length} expense categor${expenseData.categories.length !== 1 ? "ies" : "y"} from ${expenseData.totalBills} bills`
                  : `${expenseData.totalBills} bill${expenseData.totalBills !== 1 ? "s" : ""} analyzed — upload more to track changes`
                }
              </p>
            </div>
          </motion.div>

          {expenseData.categories.map((cat, i) => (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            >
              <CategoryCard categoryData={cat} />
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}
