import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { Estate, UserProperty } from "@shared/schema";
import { useAuth } from "./auth";

const PERSONAL_KEY = "__personal__";
const PROPERTY_PREFIX = "prop_";

type EstateWithMembership = Estate & { roleInEstate: string; memberApprovalStatus: string | null };

interface EstateContextType {
  currentEstate: EstateWithMembership | null;
  currentProperty: UserProperty | null;
  estates: EstateWithMembership[];
  approvedEstates: EstateWithMembership[];
  pendingEstates: EstateWithMembership[];
  properties: UserProperty[];
  setCurrentEstate: (estate: EstateWithMembership | null) => void;
  setCurrentProperty: (property: UserProperty | null) => void;
  selectById: (id: string) => void;
  isLoading: boolean;
  isPersonalMode: boolean;
  isPropertyMode: boolean;
  currentEstateRole: string | null;
  isEstateAdmin: boolean;
}

const EstateContext = createContext<EstateContextType | null>(null);

export function EstateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentEstate, setCurrentEstateState] = useState<EstateWithMembership | null>(null);
  const [currentProperty, setCurrentPropertyState] = useState<UserProperty | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: estates = [], isLoading: estatesLoading } = useQuery<EstateWithMembership[]>({
    queryKey: ["/api/estates"],
    enabled: !!user,
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<UserProperty[]>({
    queryKey: ["/api/properties"],
    enabled: !!user,
  });

  const isLoading = estatesLoading || propertiesLoading;

  const approvedEstates = estates.filter((e) => e.memberApprovalStatus === "approved");
  const pendingEstates = estates.filter((e) => e.memberApprovalStatus === "pending");

  useEffect(() => {
    if (isLoading) return;
    const savedId = localStorage.getItem("koneksi-estate");
    if (!initialized) {
      if (savedId && savedId.startsWith(PROPERTY_PREFIX)) {
        const propId = savedId.slice(PROPERTY_PREFIX.length);
        const prop = properties.find((p) => p.id === propId);
        if (prop) {
          setCurrentEstateState(null);
          setCurrentPropertyState(prop);
        } else {
          setCurrentEstateState(null);
          setCurrentPropertyState(null);
        }
      } else if (savedId === PERSONAL_KEY) {
        setCurrentEstateState(null);
        setCurrentPropertyState(null);
      } else if (approvedEstates.length > 0) {
        const saved = approvedEstates.find((e) => e.id === savedId);
        setCurrentEstateState(saved || approvedEstates[0]);
        setCurrentPropertyState(null);
      } else {
        setCurrentEstateState(null);
        setCurrentPropertyState(null);
      }
      setInitialized(true);
    } else if (currentProperty && !properties.find((p) => p.id === currentProperty.id)) {
      setCurrentPropertyState(null);
      localStorage.setItem("koneksi-estate", PERSONAL_KEY);
    }
  }, [estates, properties, isLoading, initialized, currentProperty]);

  const setCurrentEstate = (estate: EstateWithMembership | null) => {
    setCurrentEstateState(estate);
    setCurrentPropertyState(null);
    if (estate) {
      localStorage.setItem("koneksi-estate", estate.id);
    } else {
      localStorage.setItem("koneksi-estate", PERSONAL_KEY);
    }
  };

  const setCurrentProperty = (property: UserProperty | null) => {
    setCurrentPropertyState(property);
    setCurrentEstateState(null);
    if (property) {
      localStorage.setItem("koneksi-estate", PROPERTY_PREFIX + property.id);
    } else {
      localStorage.setItem("koneksi-estate", PERSONAL_KEY);
    }
  };

  const selectById = (id: string) => {
    if (id === PERSONAL_KEY) {
      setCurrentEstate(null);
    } else if (id.startsWith(PROPERTY_PREFIX)) {
      const propId = id.slice(PROPERTY_PREFIX.length);
      const prop = properties.find((p) => p.id === propId);
      if (prop) setCurrentProperty(prop);
    } else {
      const estate = approvedEstates.find((e) => e.id === id);
      if (estate) setCurrentEstate(estate);
    }
  };

  const isPersonalMode = currentEstate === null && currentProperty === null;
  const isPropertyMode = currentProperty !== null;
  const currentEstateRole = currentEstate?.roleInEstate || null;
  const isEstateAdmin = currentEstateRole === "estate_admin";

  return (
    <EstateContext.Provider value={{
      currentEstate, currentProperty, estates, approvedEstates, pendingEstates, properties,
      setCurrentEstate, setCurrentProperty, selectById,
      isLoading, isPersonalMode, isPropertyMode, currentEstateRole, isEstateAdmin,
    }}>
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
  const { currentEstate, currentProperty, isPersonalMode, isPropertyMode } = useEstate();
  return {
    currentEstate,
    currentProperty,
    isPersonalMode,
    isPropertyMode,
    estateId: currentEstate?.id || null,
    propertyId: currentProperty?.id || null,
  };
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
