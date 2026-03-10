import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBillAnalysis, type BillAnalysisResult } from "@/hooks/use-bill-analysis";
import {
  FileUp,
  Camera,
  Sparkles,
  Zap,
  Droplets,
  AlertTriangle,
  TrendingDown,
  Lightbulb,
  ArrowRight,
  X,
  FileText,
  DollarSign,
  CheckCircle2,
  RotateCcw,
  Receipt,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function UploadZone({
  onFileSelect,
  onFileClear,
  isAnalyzing,
}: {
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  isAnalyzing: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      if (file.type === "application/pdf") {
        setPreview("pdf");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) handleFile(file);
    },
    [handleFile]
  );

  const clearPreview = () => {
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onFileClear();
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-2xl p-10 text-center"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full gradient-teal animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Analyzing your bill...</h3>
        <p className="text-sm text-muted-foreground">
          AI is extracting data, detecting overcharges, and finding savings
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Powered by AI Vision</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative glass-card rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? "border-2 border-primary bg-primary/5 scale-[1.02]"
            : "border-2 border-dashed border-border/60 hover:border-primary/40"
        }`}
        data-testid="drop-zone"
      >
        {preview ? (
          <div className="relative">
            {preview === "pdf" ? (
              <div className="w-20 h-24 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center" data-testid="icon-pdf-preview">
                <FileText className="w-10 h-10 text-red-500" />
              </div>
            ) : (
              <img
                src={preview}
                alt="Bill preview"
                className="max-h-48 mx-auto rounded-xl object-contain"
                data-testid="img-bill-preview"
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearPreview();
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              data-testid="button-clear-preview"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm font-medium mt-3 truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Analyze" below to process</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
              <FileUp className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Upload your bill</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop your bill image or PDF, or tap to browse
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                JPG, PNG, WebP, PDF
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                Max 10MB
              </span>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
          data-testid="input-bill-file"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-12"
          onClick={() => cameraInputRef.current?.click()}
          data-testid="button-camera-capture"
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
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
    </div>
  );
}

function ResultsView({
  result,
  onReset,
}: {
  result: BillAnalysisResult;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="glass-card rounded-2xl p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-teal flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold">Extracted Data</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Provider</p>
              <p className="text-sm font-medium mt-0.5" data-testid="text-provider">{result.extracted.provider}</p>
            </div>
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Account</p>
              <p className="text-sm font-medium font-mono mt-0.5" data-testid="text-account">{result.extracted.accountNumber}</p>
            </div>
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Period</p>
              <p className="text-sm font-medium mt-0.5" data-testid="text-period">{result.extracted.billingPeriod}</p>
            </div>
            <div className="rounded-xl bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-sm font-bold text-primary mt-0.5" data-testid="text-total">
                R{result.extracted.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {result.extracted.usageKwh !== undefined && (
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/10 p-3 text-center">
                <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-bold" data-testid="text-kwh">{result.extracted.usageKwh}</p>
                <p className="text-[10px] text-muted-foreground">kWh</p>
              </div>
            )}
            {result.extracted.usageKl !== undefined && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 p-3 text-center">
                <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold" data-testid="text-kl">{result.extracted.usageKl}</p>
                <p className="text-[10px] text-muted-foreground">kL</p>
              </div>
            )}
            {result.extracted.tariffRate !== undefined && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center">
                <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold" data-testid="text-tariff">R{result.extracted.tariffRate}</p>
                <p className="text-[10px] text-muted-foreground">per kWh</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {result.overcharges.found && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5 border-l-4 border-l-red-500"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Overcharges Detected</h3>
              <p className="text-xs text-red-500 font-medium">
                R{result.overcharges.items.reduce((s, i) => s + i.difference, 0).toFixed(2)} in excess charges
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {result.overcharges.items.map((item, i) => (
              <div key={i} className="rounded-xl bg-red-50 dark:bg-red-900/10 p-3" data-testid={`overcharge-item-${i}`}>
                <p className="text-sm font-medium">{item.description}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="text-muted-foreground">Expected: R{item.expectedAmount.toFixed(2)}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-red-600 dark:text-red-400 font-medium">Charged: R{item.chargedAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-5 border-l-4 border-l-emerald-500"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold">Savings Tips</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Potential savings</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-total-saving">
              R{result.savings.totalPotentialSaving.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {result.savings.tips.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 p-4"
              data-testid={`savings-tip-${i}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-sm font-semibold">{tip.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    -R{tip.potentialSaving.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">per month</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex gap-3"
      >
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-12"
          onClick={onReset}
          data-testid="button-analyze-another"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Analyze Another
        </Button>
      </motion.div>
    </div>
  );
}

export default function BillAnalyzerPage() {
  const { result, reset, uploadAndAnalyze, isAnalyzing } = useBillAnalysis();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      uploadAndAnalyze.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-analyzer-heading">Bill Analyzer</h1>
            <p className="text-muted-foreground text-sm">AI-powered bill analysis & savings detection</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultsView result={result} onReset={handleReset} />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <UploadZone onFileSelect={handleFileSelect} onFileClear={() => setSelectedFile(null)} isAnalyzing={isAnalyzing} />

            {selectedFile && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  className="w-full rounded-xl h-14 text-base gradient-teal text-white relative overflow-hidden group"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  data-testid="button-analyze"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="w-5 h-5 mr-2" />
                  Analyze with AI
                </Button>
              </motion.div>
            )}

            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                What we analyze
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { icon: FileText, text: "Extract provider, account, usage & amount" },
                  { icon: AlertTriangle, text: "Detect overcharges & billing errors" },
                  { icon: Lightbulb, text: "Personalized money-saving tips" },
                  { icon: Receipt, text: "Auto-save to your bills for tracking" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
