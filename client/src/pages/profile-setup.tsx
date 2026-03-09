import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Phone, MapPin, User, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import koneksiLogo from "@assets/Koneksi_logo_1773055266438.png";

export default function ProfileSetupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [suburb, setSuburb] = useState(user?.suburb || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        fullName: fullName || undefined,
        phone: phone || undefined,
        suburb: suburb || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Updated",
        description: "Welcome to Koneksi!",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <motion.h1
            className="text-white text-xl font-bold mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Complete Your Profile
          </motion.h1>
          <motion.p
            className="text-white/70 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Tell us a bit about yourself to personalize your experience
          </motion.p>
        </div>

        <motion.div
          className="rounded-2xl p-8"
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
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-100 text-xs">Account created! Just a few more details.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-white/90 text-sm mb-1.5 block">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  data-testid="input-profile-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/90 text-sm mb-1.5 block">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  data-testid="input-profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 082 123 4567"
                  className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/90 text-sm mb-1.5 block">Suburb</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  data-testid="input-profile-suburb"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. Sandton, Waterfall"
                  className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent"
                />
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.98 }} className="pt-2">
              <Button
                data-testid="button-profile-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-white text-teal-700 font-semibold py-6 text-base hover:bg-white/90 transition-all duration-200"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <span className="flex items-center gap-2">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </motion.div>

            <button
              type="button"
              data-testid="button-skip-profile"
              onClick={async () => {
                await apiRequest("PATCH", "/api/auth/profile", {});
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
              }}
              className="w-full text-center text-white/50 text-xs hover:text-white/70 transition-colors py-2"
            >
              Skip for now
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
