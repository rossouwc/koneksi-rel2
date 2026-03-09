import { motion } from "framer-motion";
import { MessageSquare, Inbox, Clock, CheckCircle2 } from "lucide-react";

export default function SupplierBookingsPage() {
  const stats = [
    { label: "Pending", value: 0, icon: Clock, color: "bg-amber-500" },
    { label: "Confirmed", value: 0, icon: CheckCircle2, color: "bg-emerald-500" },
    { label: "Completed", value: 0, icon: Inbox, color: "bg-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-bookings-heading">Bookings & Inquiries</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage incoming service requests</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4 text-center"
          >
            <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-bold" data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Recent Inquiries
        </h2>
        <div className="text-center py-8">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No inquiries yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">When residents contact you, their messages will appear here</p>
        </div>
      </motion.div>
    </div>
  );
}
