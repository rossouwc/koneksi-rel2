import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Zap, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface EspAreaSearchResult {
  id: string;
  name: string;
  region: string;
}

interface EspAreaLinkerProps {
  entityType: "estate" | "property";
  entityId: string;
  currentAreaId?: string | null;
  currentAreaName?: string | null;
  canEdit: boolean;
  onLinked?: () => void;
}

export default function EspAreaLinker({
  entityType,
  entityId,
  currentAreaId,
  currentAreaName,
  canEdit,
  onLinked,
}: EspAreaLinkerProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: results = [], isLoading: searching } = useQuery<EspAreaSearchResult[]>({
    queryKey: ["/api/esp/search", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const res = await fetch(`/api/esp/search?text=${encodeURIComponent(debouncedSearch)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ areaId, areaName }: { areaId: string; areaName: string }) => {
      const url = entityType === "estate"
        ? `/api/estates/${entityId}/esp-area`
        : `/api/properties/${entityId}/esp-area`;
      await apiRequest("PATCH", url, { espAreaId: areaId, espAreaName: areaName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setShowSearch(false);
      setSearch("");
      setDebouncedSearch("");
      toast({ title: "Load shedding area linked successfully" });
      onLinked?.();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const url = entityType === "estate"
        ? `/api/estates/${entityId}/esp-area`
        : `/api/properties/${entityId}/esp-area`;
      await apiRequest("PATCH", url, { espAreaId: null, espAreaName: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Load shedding area unlinked" });
      onLinked?.();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400);
  }, []);

  if (currentAreaId && !showSearch) {
    return (
      <div className="flex items-center gap-2 text-sm" data-testid="esp-linked-area">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-300 font-medium text-xs">{currentAreaName || currentAreaId}</span>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setShowSearch(true)}
            data-testid="button-change-esp-area"
          >
            Change
          </Button>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-600"
            onClick={() => unlinkMutation.mutate()}
            disabled={unlinkMutation.isPending}
            data-testid="button-unlink-esp-area"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  if (!canEdit && !currentAreaId) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" />
        No load shedding area linked. Ask your estate admin to set it up.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="esp-area-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search for your area (e.g. Ruimsig, Sandton...)"
          className="pl-9 pr-4 rounded-lg text-sm h-9"
          data-testid="input-esp-area-search"
        />
        {showSearch && currentAreaId && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
            onClick={() => { setShowSearch(false); setSearch(""); setDebouncedSearch(""); }}
          >
            Cancel
          </Button>
        )}
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Searching areas...
        </div>
      )}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 max-h-48 overflow-y-auto"
          >
            {results.map((area) => (
              <motion.button
                key={area.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                onClick={() => linkMutation.mutate({ areaId: area.id, areaName: area.name })}
                disabled={linkMutation.isPending}
                data-testid={`button-select-esp-area-${area.id}`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{area.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{area.region}</p>
                </div>
                {linkMutation.isPending && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {debouncedSearch.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No areas found for "{debouncedSearch}"</p>
      )}
    </div>
  );
}
