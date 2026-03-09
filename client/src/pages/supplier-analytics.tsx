import { motion } from "framer-motion";
import { BarChart3, Eye, MousePointerClick, MessageSquare, TrendingUp } from "lucide-react";

export default function SupplierAnalyticsPage() {
  const metrics = [
    { label: "Profile Views", value: 88, change: "+12%", icon: Eye, color: "bg-teal-600" },
    { label: "Listing Clicks", value: 10, change: "+5%", icon: MousePointerClick, color: "bg-blue-500" },
    { label: "Inquiries", value: 3, change: "+2", icon: MessageSquare, color: "bg-emerald-500" },
    { label: "Conversion", value: "30%", change: "+8%", icon: TrendingUp, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-analytics-heading">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your business performance</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-4"
          >
            <div className={`w-8 h-8 rounded-lg ${metric.color} flex items-center justify-center mb-3`}>
              <metric.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold" data-testid={`stat-${metric.label.toLowerCase().replace(/\s/g, "-")}`}>{metric.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{metric.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Performance Overview
        </h2>
        <div className="space-y-3">
          {[
            { label: "This Week", views: 22, clicks: 3 },
            { label: "Last Week", views: 18, clicks: 2 },
            { label: "2 Weeks Ago", views: 25, clicks: 3 },
            { label: "3 Weeks Ago", views: 23, clicks: 2 },
          ].map((week) => (
            <div key={week.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{week.label}</span>
              <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(week.views / 30) * 100}%` }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full"
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                  {week.views} views · {week.clicks} clicks
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
