import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useEstate } from "@/lib/estate-context";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Receipt,
  Users,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Bill } from "@shared/schema";
import confetti from "canvas-confetti";

interface SavingsData {
  totalSaving: number;
  monthlySavings: { month: string; saving: number; bills: number }[];
  analyzedBills: {
    id: string;
    title: string;
    amount: number;
    saving: number;
    overcharges: number;
    date: string;
    category: string;
  }[];
}

function parseSavingsFromBills(bills: Bill[]): SavingsData {
  const analyzed = bills.filter((b) => b.analysisResult);
  const monthlySavingsMap = new Map<string, { saving: number; bills: number }>();
  const analyzedBills: SavingsData["analyzedBills"] = [];
  let totalSaving = 0;

  for (const bill of analyzed) {
    try {
      const analysis = JSON.parse(bill.analysisResult!);
      const saving = analysis.savings?.totalPotentialSaving || 0;
      const overchargeTotal = analysis.overcharges?.items?.reduce(
        (s: number, i: { difference: number }) => s + i.difference,
        0
      ) || 0;
      totalSaving += saving;

      const date = bill.createdAt ? new Date(bill.createdAt) : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleString("en-ZA", { month: "short", year: "2-digit" });

      const existing = monthlySavingsMap.get(monthKey);
      if (existing) {
        existing.saving += saving;
        existing.bills += 1;
      } else {
        monthlySavingsMap.set(monthKey, { saving, bills: 1 });
      }

      analyzedBills.push({
        id: bill.id,
        title: bill.title,
        amount: bill.amount || 0,
        saving,
        overcharges: overchargeTotal,
        date: date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
        category: bill.category || "other",
      });
    } catch {
      // skip malformed analysis
    }
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const monthlySavings: SavingsData["monthlySavings"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const data = monthlySavingsMap.get(key);
    monthlySavings.push({
      month: `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      saving: data ? Math.round(data.saving * 100) / 100 : 0,
      bills: data ? data.bills : 0,
    });
  }

  return { totalSaving, monthlySavings, analyzedBills: analyzedBills.reverse().slice(0, 20) };
}

function AnimatedCounter({ value, prefix = "R" }: { value: number; prefix?: string }) {
  const motionVal = useMotionValue(0);
  const displayed = useTransform(motionVal, (v) => `${prefix}${v.toFixed(2)}`);
  const [text, setText] = useState(`${prefix}0.00`);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.5,
      ease: "easeOut",
    });
    const unsub = displayed.on("change", (v) => setText(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, motionVal, displayed]);

  return <span data-testid="text-total-savings">{text}</span>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs shadow-lg border border-border/30">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-emerald-600 dark:text-emerald-400">
        Savings: R{payload[0].value.toFixed(2)}
      </p>
      <p className="text-muted-foreground">
        {payload[0].payload.bills} bill{payload[0].payload.bills !== 1 ? "s" : ""} analyzed
      </p>
    </div>
  );
}

export function SavingsTracker() {
  const { currentEstate } = useEstate();
  const [viewMode, setViewMode] = useState<"personal" | "estate">(
    currentEstate ? "estate" : "personal"
  );
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const confettiFired = useRef(false);

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

  const savings = useMemo(() => parseSavingsFromBills(activeBills), [activeBills]);

  useEffect(() => {
    if (savings.totalSaving > 0 && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6, x: 0.5 },
          colors: ["#0f766e", "#10b981", "#34d399", "#6ee7b7"],
          disableForReducedMotion: true,
        });
      }, 800);
    }
  }, [savings.totalSaving]);

  useEffect(() => {
    confettiFired.current = false;
  }, [viewMode]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-[180px] rounded-2xl" />
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[120px] rounded-2xl" />
      </div>
    );
  }

  const trend = savings.monthlySavings;
  const currentMonth = trend.length > 0 ? trend[trend.length - 1].saving : 0;
  const prevMonth = trend.length > 1 ? trend[trend.length - 2].saving : 0;
  const trendPct = prevMonth > 0 ? ((currentMonth - prevMonth) / prevMonth) * 100 : currentMonth > 0 ? 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-savings-heading">
          <Wallet className="w-5 h-5 text-primary" />
          Savings Tracker
        </h2>
        {currentEstate && (
          <div className="flex rounded-xl overflow-hidden border border-border/60" data-testid="toggle-savings-mode">
            <Button
              variant={viewMode === "personal" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("personal")}
              className="rounded-none rounded-l-xl text-xs h-8 gap-1.5"
              data-testid="button-savings-personal"
            >
              <User className="w-3 h-3" />
              Personal
            </Button>
            <Button
              variant={viewMode === "estate" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("estate")}
              className="rounded-none rounded-r-xl text-xs h-8 gap-1.5"
              data-testid="button-savings-estate"
            >
              <Users className="w-3 h-3" />
              Estate
            </Button>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(15,118,110,0.08) 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-teal-400/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">
              {viewMode === "estate" && currentEstate ? `${currentEstate.name} Savings` : "Your Total Savings"}
            </span>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-3xl md:text-4xl font-bold text-emerald-700 dark:text-emerald-300">
              <AnimatedCounter value={savings.totalSaving} />
            </p>
            {trendPct !== 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${
                  trendPct > 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
                data-testid="text-savings-trend"
              >
                {trendPct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trendPct).toFixed(0)}%
              </motion.div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From {savings.analyzedBills.length} analyzed bill{savings.analyzedBills.length !== 1 ? "s" : ""}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="glass-card rounded-2xl p-4"
      >
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Monthly Savings Trend</h3>
        <div className="h-[180px] -ml-2" data-testid="chart-savings-trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savings.monthlySavings} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R${v}`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="saving"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#savingsGradient)"
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/20 transition-colors"
          data-testid="button-toggle-history"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Bill Analysis History</span>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {savings.analyzedBills.length}
            </span>
          </div>
          {historyExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {savings.analyzedBills.length === 0 ? (
                  <div className="text-center py-6">
                    <Receipt className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No analyzed bills yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Upload a bill to the Bill Analyzer to see savings</p>
                  </div>
                ) : (
                  savings.analyzedBills.map((bill, i) => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.5) }}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                      data-testid={`history-bill-${bill.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{bill.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground capitalize">{bill.category}</span>
                          <span className="text-[10px] text-muted-foreground">{bill.date}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          R{(bill.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          -R{bill.saving.toFixed(2)}
                        </p>
                        {bill.overcharges > 0 && (
                          <p className="text-[10px] text-red-500">
                            R{bill.overcharges.toFixed(2)} overcharged
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
