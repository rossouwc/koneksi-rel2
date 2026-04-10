import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface SupplierProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  businessName: string | null;
  businessWebsite: string | null;
  services: string[] | null;
  approvalStatus: string | null;
  avatarUrl: string | null;
}

interface UpdateSupplierProfileData {
  businessName?: string;
  businessWebsite?: string | null;
  services?: string[];
  phone?: string;
  avatarUrl?: string | null;
}

export function useSupplierProfile() {
  const { user } = useAuth();

  const profileQuery = useQuery<SupplierProfile>({
    queryKey: ["/api/supplier/profile"],
    enabled: user?.role === "supplier",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateSupplierProfileData) => {
      await apiRequest("PATCH", "/api/supplier/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/dashboard"] });
    },
  });

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    updateProfile: updateMutation,
  };
}
