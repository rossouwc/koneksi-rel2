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

export function useBillAnalysis() {
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const [result, setResult] = useState<BillAnalysisResult | null>(null);

  const uploadAndAnalyze = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("bill", file);
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
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data.analysis);
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      if (currentEstate) {
        queryClient.invalidateQueries({ queryKey: [`/api/bills?estateId=${currentEstate.id}`] });
      }
      toast({ title: "Analysis complete", description: "Your bill has been analyzed by AI" });
    },
    onError: (err: any) => {
      toast({
        title: "Analysis failed",
        description: err.message || "Could not analyze this bill. Try uploading a clearer photo.",
        variant: "destructive",
      });
    },
  });

  const reset = () => setResult(null);

  return {
    result,
    reset,
    uploadAndAnalyze,
    isAnalyzing: uploadAndAnalyze.isPending,
  };
}
