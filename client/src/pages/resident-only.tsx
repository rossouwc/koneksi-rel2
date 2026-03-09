import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResidentOnlyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20"
    >
      <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <h1 className="text-2xl font-bold mb-2" data-testid="text-resident-only-heading">Residents Only</h1>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
        This area is for estate residents. As a supplier, your portal has everything you need to manage your business.
      </p>
      <Link href="/supplier">
        <Button className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white gap-2" data-testid="button-back-to-portal">
          <ArrowLeft className="w-4 h-4" />
          Back to Supplier Portal
        </Button>
      </Link>
    </motion.div>
  );
}
