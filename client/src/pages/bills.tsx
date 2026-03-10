import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEstate } from "@/lib/estate-context";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  Upload,
  FileText,
  Plus,
  Search,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Zap,
  Droplets,
  Building2,
  Wifi,
  Shield,
  Home,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Bill } from "@shared/schema";

const CATEGORY_META: Record<string, { label: string; color: string; bgClass: string; icon: typeof Zap }> = {
  electricity: { label: "Electricity", color: "#eab308", bgClass: "bg-yellow-100 dark:bg-yellow-900/30", icon: Zap },
  water: { label: "Water", color: "#3b82f6", bgClass: "bg-blue-100 dark:bg-blue-900/30", icon: Droplets },
  municipal: { label: "Municipal", color: "#10b981", bgClass: "bg-emerald-100 dark:bg-emerald-900/30", icon: Building2 },
  internet: { label: "Internet", color: "#8b5cf6", bgClass: "bg-violet-100 dark:bg-violet-900/30", icon: Wifi },
  insurance: { label: "Insurance", color: "#f97316", bgClass: "bg-orange-100 dark:bg-orange-900/30", icon: Shield },
  rates: { label: "Rates & Taxes", color: "#ef4444", bgClass: "bg-red-100 dark:bg-red-900/30", icon: Home },
  levy: { label: "Levy", color: "#14b8a6", bgClass: "bg-teal-100 dark:bg-teal-900/30", icon: Building2 },
};

const DEFAULT_META = { label: "Other", color: "#6b7280", bgClass: "bg-gray-100 dark:bg-gray-800/40", icon: FileText };

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat.toLowerCase()] || { ...DEFAULT_META, label: cat.charAt(0).toUpperCase() + cat.slice(1) };
}

export default function BillsPage() {
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  const billsUrl = currentEstate ? `/api/bills?estateId=${currentEstate.id}` : "/api/bills";
  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: [billsUrl],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/bills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [billsUrl] });
      setDialogOpen(false);
      setTitle("");
      setAmount("");
      setCategory("");
      setDueDate("");
      toast({ title: "Bill added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      amount: amount ? Math.round(parseFloat(amount) * 100) : null,
      category: category || null,
      dueDate: dueDate || null,
      estateId: currentEstate?.id || null,
    });
  };

  const filtered = bills.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.category && b.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categoryGroups = filtered.reduce<Record<string, Bill[]>>((acc, bill) => {
    const cat = bill.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(bill);
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryGroups).sort((a, b) => b[1].length - a[1].length);

  const categoryBills = selectedCategory ? (categoryGroups[selectedCategory] || []) : [];
  const catMeta = selectedCategory ? getCategoryMeta(selectedCategory) : null;

  const formCategories = ["Electricity", "Water", "Municipal", "Internet", "Rates", "Levy", "Insurance", "Other"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your household bills</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-teal text-white" data-testid="button-add-bill">
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm">Title</Label>
                <Input
                  data-testid="input-bill-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. March Electricity"
                  className="rounded-lg mt-1.5"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Amount (R)</Label>
                  <Input
                    data-testid="input-bill-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="rounded-lg mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Due Date</Label>
                  <Input
                    data-testid="input-bill-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="rounded-lg mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-bill-category" className="rounded-lg mt-1.5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {formCategories.map((c) => (
                      <SelectItem key={c} value={c.toLowerCase()}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border-2 border-dashed border-border/60 p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drop bill image here or click to upload
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  AI analysis will extract details automatically
                </p>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">Powered by AI Vision</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl gradient-teal text-white"
                disabled={createMutation.isPending}
                data-testid="button-submit-bill"
              >
                {createMutation.isPending ? "Adding..." : "Add Bill"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-bill-search"
          placeholder="Search bills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
            <Receipt className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No bills found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Try a different search term" : "Add your first bill to get started"}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {sortedCategories.map(([cat, catBills], i) => {
                const meta = getCategoryMeta(cat);
                const Icon = meta.icon;
                const totalAmount = catBills.reduce((sum, b) => sum + (b.amount || 0), 0);

                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full text-left glass-card rounded-xl p-4 hover:shadow-md transition-all duration-200 group"
                      data-testid={`category-card-${cat}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bgClass}`}
                        >
                          <Icon className="w-5 h-5" style={{ color: meta.color }} />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                      </div>
                      <p className="font-semibold text-sm">{meta.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {catBills.length} bill{catBills.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm font-semibold mt-2" style={{ color: meta.color }}>
                        R{(totalAmount / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </p>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="bill-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
                data-testid="button-back-categories"
              >
                <ChevronLeft className="w-4 h-4" />
                All Categories
              </button>

              <div className="flex items-center gap-3 mb-2">
                {catMeta && (
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${catMeta.bgClass}`}>
                    <catMeta.icon className="w-4.5 h-4.5" style={{ color: catMeta.color }} />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold">{catMeta?.label}</h2>
                  <p className="text-xs text-muted-foreground">{categoryBills.length} bill{categoryBills.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {categoryBills
                .sort((a, b) => {
                  const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return db - da;
                })
                .map((bill, i) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    className="glass-card rounded-xl p-4 flex items-center justify-between gap-3"
                    data-testid={`bill-card-${bill.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catMeta?.bgClass || "bg-gray-100"}`}>
                        <FileText className="w-5 h-5" style={{ color: catMeta?.color || "#6b7280" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{bill.title}</p>
                        {bill.billingPeriod && (
                          <p className="text-xs text-muted-foreground mt-0.5">{bill.billingPeriod}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {bill.amount != null && (
                        <p className="font-semibold text-sm">
                          R{(bill.amount / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      {bill.fileUrl && (
                        <a
                          href={bill.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors"
                          title="View uploaded document"
                          data-testid={`button-view-bill-${bill.id}`}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
