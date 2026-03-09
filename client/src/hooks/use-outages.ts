import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEstate } from "@/lib/estate-context";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Outage, User } from "@shared/schema";

export type OutageWithUser = Outage & { reporterName?: string };

export function useOutages(pollingInterval?: number) {
  const { currentEstate } = useEstate();
  const { user } = useAuth();
  const { toast } = useToast();

  const outagesUrl = currentEstate
    ? `/api/outages?estateId=${currentEstate.id}`
    : "/api/outages";

  const {
    data: outages = [],
    isLoading,
    refetch,
  } = useQuery<Outage[]>({
    queryKey: [outagesUrl],
    refetchInterval: pollingInterval || false,
  });

  const activeOutages = outages.filter((o) => o.status !== "resolved");
  const resolvedOutages = outages.filter((o) => o.status === "resolved");

  const createOutage = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/outages/report", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to report outage");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [outagesUrl] });
      toast({ title: "Outage reported", description: "Your report has been submitted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const scopeLabel = currentEstate ? currentEstate.name : user?.suburb || "your area";

  return {
    outages,
    activeOutages,
    resolvedOutages,
    isLoading,
    refetch,
    createOutage,
    scopeLabel,
    outagesUrl,
  };
}
