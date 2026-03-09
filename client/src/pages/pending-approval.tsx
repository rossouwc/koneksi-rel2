import { motion } from "framer-motion";
import { Clock, CheckCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

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
            className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <Clock className="w-8 h-8 text-amber-400" />
          </motion.div>

          <h1
            data-testid="text-pending-heading"
            className="text-xl font-bold text-white mb-3"
          >
            Account Submitted for Approval
          </h1>

          <p
            data-testid="text-pending-message"
            className="text-white/70 text-sm leading-relaxed mb-6"
          >
            Thank you for registering{user?.businessName ? ` ${user.businessName}` : ""} as a supplier on Koneksi. 
            We'll review your application and notify you soon.
          </p>

          <div className="space-y-3 text-left mb-6">
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Account details received</span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Review in progress (1-2 business days)</span>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <CheckCircle2 className="w-4 h-4 text-white/30 flex-shrink-0" />
              <span>Approval notification via email</span>
            </div>
          </div>

          <Button
            data-testid="button-logout-pending"
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
