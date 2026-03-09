import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

export default function SupplierCalendarPage() {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-calendar-heading">Calendar & Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your schedule and availability</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          {monthName}
        </h2>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate();
            return (
              <button
                key={day}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                  isToday
                    ? "bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-bold shadow-sm"
                    : "hover:bg-muted/50 text-foreground"
                }`}
                data-testid={`calendar-day-${day}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Upcoming Appointments
        </h2>
        <div className="text-center py-8">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No upcoming appointments</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Bookings from residents will appear here</p>
        </div>
      </motion.div>
    </div>
  );
}
