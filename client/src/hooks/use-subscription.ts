import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface SubscribeParams {
  providerId: string;
  tierId: string;
  selectedCity?: string | null;
  selectedProvince?: string | null;
  selectedEstateIds?: string[];
}

export interface SubscribeResult {
  subscription: any;
  paymentRequired: boolean;
  paymentUrl?: string;
}

export function useSubscription() {
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (params: SubscribeParams): Promise<SubscribeResult> => {
      const res = await apiRequest("POST", "/api/supplier/subscribe", params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/dashboard"] });
    },
    onError: (err: any) => {
      toast({
        title: "Subscription failed",
        description: err.message || "Could not process your subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    subscribe: subscribeMutation,
    isProcessing: subscribeMutation.isPending,
  };
}
