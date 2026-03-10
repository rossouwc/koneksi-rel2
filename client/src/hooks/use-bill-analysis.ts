import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useEstate } from "@/lib/estate-context";
import { useToast } from "@/hooks/use-toast";

export interface BillAnalysisResult {
  extracted: {
    provider: string;
    accountNumber: string;
    billingPeriod: string;
    totalAmount: number;
    usageKwh?: number;
    usageKl?: number;
    tariffRate?: number;
    category: string;
  };
  overcharges: {
    found: boolean;
    items: { description: string; expectedAmount: number; chargedAmount: number; difference: number }[];
  };
  savings: {
    tips: { title: string; description: string; potentialSaving: number }[];
    totalPotentialSaving: number;
  };
}

export interface FileAnalysisStatus {
  file: File;
  fileName: string;
  status: "pending" | "analyzing" | "done" | "error";
  result?: BillAnalysisResult;
  error?: string;
}

interface AnalysisBatchResult {
  statuses: FileAnalysisStatus[];
  successCount: number;
  failCount: number;
}

export function useBillAnalysis() {
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const [batchResult, setBatchResult] = useState<AnalysisBatchResult | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileAnalysisStatus[]>([]);

  const uploadAndAnalyze = useMutation({
    mutationFn: async (files: File[]): Promise<AnalysisBatchResult> => {
      const statuses: FileAnalysisStatus[] = files.map((f) => ({
        file: f,
        fileName: f.name,
        status: "pending" as const,
      }));
      setFileStatuses([...statuses]);

      for (let i = 0; i < statuses.length; i++) {
        statuses[i].status = "analyzing";
        setFileStatuses([...statuses]);

        try {
          const formData = new FormData();
          formData.append("bill", statuses[i].file);
          formData.append("estateId", currentEstate?.id || "null");

          const res = await fetch("/api/bills/analyze", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: "Analysis failed" }));
            throw new Error(err.message || "Analysis failed");
          }

          const data = await res.json();
          statuses[i].status = "done";
          statuses[i].result = data.analysis;
        } catch (err: any) {
          statuses[i].status = "error";
          statuses[i].error = err.message || "Analysis failed";
        }

        setFileStatuses([...statuses]);
      }

      const successCount = statuses.filter((s) => s.status === "done").length;
      const failCount = statuses.filter((s) => s.status === "error").length;

      return { statuses, successCount, failCount };
    },
    onSuccess: (data) => {
      setBatchResult(data);
      setFileStatuses(data.statuses);
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      if (currentEstate) {
        queryClient.invalidateQueries({ queryKey: [`/api/bills?estateId=${currentEstate.id}`] });
      }
      if (data.successCount > 0) {
        toast({
          title: `${data.successCount} bill${data.successCount !== 1 ? "s" : ""} analyzed`,
          description: data.failCount > 0
            ? `${data.failCount} failed — try uploading clearer images`
            : "All bills have been analyzed by AI",
        });
      } else {
        toast({
          title: "Analysis failed",
          description: "Could not analyze any of the uploaded bills. Try uploading clearer images or PDFs.",
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Analysis failed",
        description: err.message || "Could not analyze bills. Try uploading clearer photos.",
        variant: "destructive",
      });
    },
  });

  const reset = () => {
    setBatchResult(null);
    setFileStatuses([]);
  };

  const isComplete = batchResult !== null;
  const completedStatuses = isComplete ? batchResult.statuses : fileStatuses;

  return {
    batchResult,
    fileStatuses: completedStatuses,
    reset,
    uploadAndAnalyze,
    isAnalyzing: uploadAndAnalyze.isPending,
    isComplete,
  };
}
