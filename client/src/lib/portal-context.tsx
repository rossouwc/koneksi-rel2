import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";

type PortalMode = "supplier" | "estate";

interface PortalContextType {
  portalMode: PortalMode;
  switchToSupplier: () => void;
  switchToEstate: () => void;
  isDualRole: boolean;
}

const PortalContext = createContext<PortalContextType>({
  portalMode: "supplier",
  switchToSupplier: () => {},
  switchToEstate: () => {},
  isDualRole: false,
});

export function PortalProvider({ children, isDualRole, defaultMode }: { children: React.ReactNode; isDualRole: boolean; defaultMode: PortalMode }) {
  const [portalMode, setPortalMode] = useState<PortalMode>(defaultMode);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isDualRole) return;
    const shouldBeSupplier = location.startsWith("/supplier");
    if (shouldBeSupplier && portalMode !== "supplier") {
      setPortalMode("supplier");
    } else if (!shouldBeSupplier && portalMode !== "estate") {
      setPortalMode("estate");
    }
  }, [location, isDualRole]);

  const switchToSupplier = useCallback(() => {
    setPortalMode("supplier");
    setLocation("/supplier");
  }, [setLocation]);

  const switchToEstate = useCallback(() => {
    setPortalMode("estate");
    setLocation("/");
  }, [setLocation]);

  return (
    <PortalContext.Provider value={{ portalMode, switchToSupplier, switchToEstate, isDualRole }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  return useContext(PortalContext);
}
