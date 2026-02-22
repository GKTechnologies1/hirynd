import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string; dot?: string }> = {
  lead: { label: "Lead", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  intake_submitted: { label: "Intake Submitted", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  roles_suggested: { label: "Roles Suggested", className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", dot: "bg-violet-500" },
  roles_confirmed: { label: "Roles Confirmed", className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", dot: "bg-indigo-500" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  credential_completed: { label: "Credentials Ready", className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", dot: "bg-cyan-500" },
  active_marketing: { label: "Active Marketing", className: "bg-secondary/15 text-secondary", dot: "bg-secondary" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  placed: { label: "Placed", className: "bg-secondary text-secondary-foreground", dot: "bg-white" },
  // Generic
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", className: "bg-secondary text-secondary-foreground", dot: "bg-white" },
  applied: { label: "Applied", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  screening: { label: "Screening", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  interview: { label: "Interview", className: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  offer: { label: "Offer", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  no_response: { label: "No Response", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  new: { label: "New", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  contacted: { label: "Contacted", className: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  onboarded: { label: "Onboarded", className: "bg-secondary text-secondary-foreground", dot: "bg-white" },
  past_due: { label: "Past Due", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  grace_period: { label: "Grace Period", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className = "" }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <Badge className={`${config.className} border-0 gap-1.5 font-medium text-[11px] ${className}`}>
      {config.dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
