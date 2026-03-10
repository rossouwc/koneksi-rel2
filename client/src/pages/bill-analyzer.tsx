import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBillAnalysis, type BillAnalysisResult, type FileAnalysisStatus } from "@/hooks/use-bill-analysis";
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
  Check,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreview {
  file: File;
  preview: string;
}

function UploadZone({
  onFilesSelect,
  onFileClear,
  isAnalyzing,
  fileStatuses,
}: {
  onFilesSelect: (files: File[]) => void;
  onFileClear: () => void;
  isAnalyzing: boolean;
  fileStatuses: FileAnalysisStatus[];
}) {
  const [dragOver, setDragOver] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const valid = newFiles.filter(
        (f) => f.type.startsWith("image/") || f.type === "application/pdf"
      );
      if (valid.length === 0) return;

      const newPreviews: FilePreview[] = [];
      let loaded = 0;

      valid.forEach((file) => {
        if (file.type === "application/pdf") {
          newPreviews.push({ file, preview: "pdf" });
          loaded++;
          if (loaded === valid.length) {
            setFilePreviews((prev) => {
              const combined = [...prev, ...newPreviews];
              onFilesSelect(combined.map((p) => p.file));
              return combined;
            });
          }
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.push({ file, preview: reader.result as string });
            loaded++;
            if (loaded === valid.length) {
              setFilePreviews((prev) => {
                const combined = [...prev, ...newPreviews];
                onFilesSelect(combined.map((p) => p.file));
                return combined;
              });
            }
          };
          reader.readAsDataURL(file);
        }
      });
    },
    [onFilesSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFilePreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onFilesSelect(updated.map((p) => p.file));
      return updated;
    });
  };

  const clearAll = () => {
    setFilePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onFileClear();
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="absolute inset-0 rounded-full gradient-teal animate-pulse" />
            <div className="absolute inset-1.5 rounded-full bg-background flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Analyzing {fileStatuses.length} bill{fileStatuses.length !== 1 ? "s" : ""}...</h3>
            <p className="text-xs text-muted-foreground">AI is extracting data from each bill</p>
          </div>
        </div>

        <div className="space-y-2">
          {fileStatuses.map((fs, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20" data-testid={`status-file-${i}`}>
              <div className="flex-shrink-0">
                {fs.status === "analyzing" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {fs.status === "done" && <Check className="w-4 h-4 text-emerald-500" />}
                {fs.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                {fs.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-border" />}
              </div>
              <p className="text-sm truncate flex-1">{fs.fileName}</p>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex-shrink-0">
                {fs.status === "analyzing" ? "Analyzing" : fs.status === "done" ? "Complete" : fs.status === "error" ? "Failed" : "Queued"}
              </span>
            </div>
          ))}
        </div>

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
        onClick={() => filePreviews.length === 0 && fileInputRef.current?.click()}
        className={`relative glass-card rounded-2xl p-6 md:p-8 text-center transition-all duration-300 ${
          filePreviews.length === 0 ? "cursor-pointer" : ""
        } ${
          dragOver
            ? "border-2 border-primary bg-primary/5 scale-[1.02]"
            : "border-2 border-dashed border-border/60 hover:border-primary/40"
        }`}
        data-testid="drop-zone"
      >
        {filePreviews.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{filePreviews.length} file{filePreviews.length !== 1 ? "s" : ""} selected</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                data-testid="button-clear-all"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filePreviews.map((fp, i) => (
                <div key={i} className="relative group" data-testid={`preview-file-${i}`}>
                  {fp.preview === "pdf" ? (
                    <div className="w-full aspect-square rounded-xl bg-red-500/10 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-red-500" />
                    </div>
                  ) : (
                    <img
                      src={fp.preview}
                      alt={fp.file.name}
                      className="w-full aspect-square rounded-xl object-cover"
                    />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-remove-file-${i}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-[9px] text-muted-foreground truncate mt-1 px-0.5">{fp.file.name}</p>
                </div>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                data-testid="button-add-more"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add more</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Click "Analyze" below to process all bills</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-teal-subtle flex items-center justify-center mb-4">
              <FileUp className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Upload your bills</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop one or more bill images or PDFs, or tap to browse
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                JPG, PNG, WebP, PDF
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                Max 10MB each
              </span>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              addFiles(Array.from(files));
              e.target.value = "";
            }
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
            if (file) addFiles([file]);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}

function SingleResultCard({
  result,
  index,
  fileName,
}: {
  result: BillAnalysisResult;
  index: number;
  fileName?: string;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-2xl overflow-hidden"
      data-testid={`result-card-${index}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
        data-testid={`button-toggle-result-${index}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{result.extracted.provider} — {result.extracted.billingPeriod}</p>
            <p className="text-xs text-muted-foreground capitalize">{result.extracted.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-sm font-bold text-primary">R{result.extracted.totalAmount.toFixed(2)}</p>
          {expanded ? <X className="w-4 h-4 text-muted-foreground" /> : <ArrowRight className="w-4 h-4 text-muted-foreground" />}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Provider</p>
                  <p className="text-sm font-medium mt-0.5" data-testid={`text-provider-${index}`}>{result.extracted.provider}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Account</p>
                  <p className="text-sm font-medium font-mono mt-0.5" data-testid={`text-account-${index}`}>{result.extracted.accountNumber}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Period</p>
                  <p className="text-sm font-medium mt-0.5" data-testid={`text-period-${index}`}>{result.extracted.billingPeriod}</p>
                </div>
                <div className="rounded-xl bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                  <p className="text-sm font-bold text-primary mt-0.5" data-testid={`text-total-${index}`}>
                    R{result.extracted.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {result.extracted.usageKwh !== undefined && (
                  <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/10 p-3 text-center flex-1 min-w-[80px]">
                    <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                    <p className="text-lg font-bold" data-testid={`text-kwh-${index}`}>{result.extracted.usageKwh}</p>
                    <p className="text-[10px] text-muted-foreground">kWh</p>
                  </div>
                )}
                {result.extracted.usageKl !== undefined && (
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 p-3 text-center flex-1 min-w-[80px]">
                    <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold" data-testid={`text-kl-${index}`}>{result.extracted.usageKl}</p>
                    <p className="text-[10px] text-muted-foreground">kL</p>
                  </div>
                )}
                {result.extracted.tariffRate !== undefined && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center flex-1 min-w-[80px]">
                    <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold" data-testid={`text-tariff-${index}`}>R{result.extracted.tariffRate}</p>
                    <p className="text-[10px] text-muted-foreground">per kWh</p>
                  </div>
                )}
              </div>

              {result.overcharges.found && (
                <div className="rounded-xl p-4 border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-semibold">Overcharges Detected</p>
                    <span className="text-xs text-red-500 font-medium ml-auto">
                      R{result.overcharges.items.reduce((s, i) => s + i.difference, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.overcharges.items.map((item, i) => (
                      <div key={i} className="text-xs p-2 rounded-lg bg-red-50 dark:bg-red-900/10" data-testid={`overcharge-${index}-${i}`}>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-muted-foreground mt-0.5">
                          Expected R{item.expectedAmount.toFixed(2)} → Charged R{item.chargedAmount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl p-4 border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-500" />
                    <p className="text-sm font-semibold">Savings Tips</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    R{result.savings.totalPotentialSaving.toFixed(2)} potential
                  </span>
                </div>
                <div className="space-y-1.5">
                  {result.savings.tips.map((tip, i) => (
                    <div key={i} className="text-xs p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10" data-testid={`tip-${index}-${i}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-emerald-500" />
                            {tip.title}
                          </p>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">{tip.description}</p>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                          -R{tip.potentialSaving.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultsView({
  results,
  fileStatuses,
  onReset,
}: {
  results: BillAnalysisResult[];
  fileStatuses: FileAnalysisStatus[];
  onReset: () => void;
}) {
  const failedCount = fileStatuses.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: results.length > 0
            ? "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(15,118,110,0.08) 100%)"
            : "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.05) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${results.length > 0 ? "gradient-teal" : "bg-red-500"}`}>
            {results.length > 0 ? <CheckCircle2 className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
          </div>
          <div>
            {results.length > 0 ? (
              <>
                <p className="text-sm font-semibold">
                  {results.length} bill{results.length !== 1 ? "s" : ""} analyzed successfully
                </p>
                {failedCount > 0 && (
                  <p className="text-xs text-red-500">{failedCount} failed — try uploading clearer images</p>
                )}
                <p className="text-xs text-muted-foreground">Results saved to your expense tracker</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Analysis failed</p>
                <p className="text-xs text-muted-foreground">Could not analyze any of the uploaded bills. Try uploading clearer images or PDFs.</p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {failedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-1.5"
        >
          {fileStatuses.filter((f) => f.status === "error").map((fs, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-xs">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="font-medium truncate">{fs.fileName}</span>
              <span className="text-muted-foreground ml-auto flex-shrink-0">{fs.error}</span>
            </div>
          ))}
        </motion.div>
      )}

      {results.map((result, i) => {
        const matchedStatus = fileStatuses.filter((f) => f.status === "done")[i];
        return (
          <SingleResultCard
            key={i}
            result={result}
            index={i}
            fileName={matchedStatus?.fileName}
          />
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: results.length * 0.1 + 0.2 }}
        className="flex gap-3"
      >
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-12"
          onClick={onReset}
          data-testid="button-analyze-another"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Analyze More Bills
        </Button>
      </motion.div>
    </div>
  );
}

export default function BillAnalyzerPage() {
  const { batchResult, fileStatuses, reset, uploadAndAnalyze, isAnalyzing, isComplete } = useBillAnalysis();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleAnalyze = () => {
    if (selectedFiles.length > 0) {
      uploadAndAnalyze.mutate(selectedFiles);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFiles([]);
  };

  const successResults = batchResult?.statuses.filter((s) => s.status === "done" && s.result) || [];

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
        {isComplete ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultsView results={successResults.map((s) => s.result!)} fileStatuses={batchResult?.statuses || []} onReset={handleReset} />
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <UploadZone
              onFilesSelect={handleFilesSelect}
              onFileClear={() => setSelectedFiles([])}
              isAnalyzing={isAnalyzing}
              fileStatuses={fileStatuses}
            />

            {selectedFiles.length > 0 && !isAnalyzing && (
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
                  Analyze {selectedFiles.length} Bill{selectedFiles.length !== 1 ? "s" : ""} with AI
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
                  { icon: Receipt, text: "Auto-save to your expense tracker" },
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
