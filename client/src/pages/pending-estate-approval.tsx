import { motion } from "framer-motion";
import { Clock, CheckCircle2, LogOut, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { Estate } from "@shared/schema";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";

export default function PendingEstateApprovalPage({ estates }: { estates: Estate[] }) {
  const { user, logout } = useAuth();

  const pendingEstates = estates.filter((e) => e.approvalStatus === "pending");
  const rejectedEstates = estates.filter((e) => e.approvalStatus === "rejected");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 gradient-teal opacity-90" />
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-300/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="text-center mb-8">
          <motion.img
            src={koneksiLogo}
            alt="Koneksi"
            className="h-10 mx-auto mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          />
        </div>

        <motion.div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className={`w-16 h-16 rounded-full ${rejectedEstates.length > 0 && pendingEstates.length === 0 ? "bg-red-500/20" : "bg-amber-500/20"} flex items-center justify-center mx-auto mb-6`}
          >
            {rejectedEstates.length > 0 && pendingEstates.length === 0 ? (
              <Shield className="w-8 h-8 text-red-400" />
            ) : (
              <Clock className="w-8 h-8 text-amber-400" />
            )}
          </motion.div>

          {rejectedEstates.length > 0 && pendingEstates.length === 0 ? (
            <>
              <h1 data-testid="text-estate-pending-heading" className="text-xl font-bold text-white mb-3">
                Estate Registration Declined
              </h1>
              <p data-testid="text-estate-pending-message" className="text-white/70 text-sm leading-relaxed mb-6">
                Unfortunately, your estate registration was not approved. Please contact support for more details.
              </p>
            </>
          ) : (
            <>
              <h1 data-testid="text-estate-pending-heading" className="text-xl font-bold text-white mb-3">
                Estate Pending Approval
              </h1>
              <p data-testid="text-estate-pending-message" className="text-white/70 text-sm leading-relaxed mb-6">
                Thank you for registering your estate on Koneksi.
                A Koneksi administrator will review and approve your estate before it becomes active.
              </p>
            </>
          )}

          <div className="space-y-3 mb-6">
            {estates.map((estate) => (
              <motion.div
                key={estate.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 text-left px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                data-testid={`estate-pending-item-${estate.id}`}
              >
                <Building2 className="w-5 h-5 text-white/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{estate.name}</p>
                  <p className="text-white/50 text-xs truncate">
                    {[estate.streetName, estate.suburb, estate.city].filter(Boolean).join(", ")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  estate.approvalStatus === "rejected"
                    ? "bg-red-500/20 text-red-300"
                    : estate.approvalStatus === "approved"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}>
                  {estate.approvalStatus === "rejected" ? "Declined" : estate.approvalStatus === "approved" ? "Approved" : "Pending"}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="space-y-3 text-left mb-6">
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Estate details submitted</span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Admin review in progress (1-2 business days)</span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <CheckCircle2 className="w-4 h-4 text-white/30 flex-shrink-0" />
              <span>Estate activated after approval</span>
            </div>
          </div>

          <Button
            data-testid="button-logout-estate-pending"
            onClick={() => logout()}
            variant="outline"
            className="w-full rounded-xl border-white/20 text-white hover:bg-white/10 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
