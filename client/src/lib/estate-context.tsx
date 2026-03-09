import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Estate } from "@shared/schema";
import { useAuth } from "./auth";

interface EstateContextType {
  currentEstate: Estate | null;
  estates: Estate[];
  setCurrentEstate: (estate: Estate | null) => void;
  isLoading: boolean;
}

const EstateContext = createContext<EstateContextType | null>(null);

export function EstateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentEstate, setCurrentEstateState] = useState<Estate | null>(null);

  const { data: estates = [], isLoading } = useQuery<Estate[]>({
    queryKey: ["/api/estates"],
    enabled: !!user,
  });

  useEffect(() => {
    if (estates.length > 0 && !currentEstate) {
      const savedId = localStorage.getItem("koneksi-estate");
      const saved = estates.find((e) => e.id === savedId);
      setCurrentEstateState(saved || estates[0]);
    }
  }, [estates, currentEstate]);

  const setCurrentEstate = (estate: Estate | null) => {
    setCurrentEstateState(estate);
    if (estate) {
      localStorage.setItem("koneksi-estate", estate.id);
    } else {
      localStorage.removeItem("koneksi-estate");
    }
  };

  return (
    <EstateContext.Provider value={{ currentEstate, estates, setCurrentEstate, isLoading }}>
      {children}
    </EstateContext.Provider>
  );
}

export const useEstate = () => {
  const ctx = useContext(EstateContext);
  if (!ctx) throw new Error("useEstate must be used within EstateProvider");
  return ctx;
};
