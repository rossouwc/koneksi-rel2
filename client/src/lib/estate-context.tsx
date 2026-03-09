import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { Estate } from "@shared/schema";
import { useAuth } from "./auth";

const PERSONAL_KEY = "__personal__";

interface EstateContextType {
  currentEstate: Estate | null;
  estates: Estate[];
  setCurrentEstate: (estate: Estate | null) => void;
  isLoading: boolean;
  isPersonalMode: boolean;
}

const EstateContext = createContext<EstateContextType | null>(null);

export function EstateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentEstate, setCurrentEstateState] = useState<Estate | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: estates = [], isLoading } = useQuery<Estate[]>({
    queryKey: ["/api/estates"],
    enabled: !!user,
  });

  useEffect(() => {
    if (isLoading || initialized) return;
    const savedId = localStorage.getItem("koneksi-estate");
    if (savedId === PERSONAL_KEY) {
      setCurrentEstateState(null);
    } else if (estates.length > 0) {
      const saved = estates.find((e) => e.id === savedId);
      setCurrentEstateState(saved || estates[0]);
    } else {
      setCurrentEstateState(null);
    }
    setInitialized(true);
  }, [estates, isLoading, initialized]);

  const setCurrentEstate = (estate: Estate | null) => {
    setCurrentEstateState(estate);
    if (estate) {
      localStorage.setItem("koneksi-estate", estate.id);
    } else {
      localStorage.setItem("koneksi-estate", PERSONAL_KEY);
    }
  };

  const isPersonalMode = currentEstate === null;

  return (
    <EstateContext.Provider value={{ currentEstate, estates, setCurrentEstate, isLoading, isPersonalMode }}>
      {children}
    </EstateContext.Provider>
  );
}

export const useEstate = () => {
  const ctx = useContext(EstateContext);
  if (!ctx) throw new Error("useEstate must be used within EstateProvider");
  return ctx;
};

export const useCurrentEstate = () => {
  const { currentEstate, isPersonalMode } = useEstate();
  return { currentEstate, isPersonalMode, estateId: currentEstate?.id || null };
};

export const useEstatesList = () => {
  const { estates, isLoading } = useEstate();
  return { estates, isLoading };
};

export function useJoinEstate() {
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest("POST", "/api/estates/join", { inviteCode });
      return res.json() as Promise<Estate>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
    },
  });
}
