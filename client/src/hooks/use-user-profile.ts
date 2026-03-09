import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useUserProfile() {
  const { user, isLoading } = useAuth();

  const updateProfile = useMutation({
    mutationFn: async (data: { fullName?: string; phone?: string; suburb?: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  return {
    user,
    isLoading,
    isProfileComplete: user?.profileComplete ?? false,
    role: user?.role ?? "resident",
    isAdmin: user?.isSuperAdmin || user?.role === "super_admin",
    isEstateAdmin: user?.role === "estate_admin",
    isSupplier: user?.role === "supplier",
    updateProfile,
  };
}
