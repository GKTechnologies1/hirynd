import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string; dot?: string }> = {
  // Candidate pipeline statuses per spec Section 4.1
  pending_approval: { label: "Pending Approval", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  approved: { label: "Approved", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  intake_submitted: { label: "Intake Submitted", className: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", dot: "bg-teal-500" },
  roles_published: { label: "Roles Published", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
  roles_candidate_responded: { label: "Roles Responded", className: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500" },
  payment_pending: { label: "Payment Pending", className: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500" },
  payment_completed: { label: "Payment Completed", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  credentials_submitted: { label: "Credentials Submitted", className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", dot: "bg-cyan-500" },
  active_marketing: { label: "Active Marketing", className: "bg-secondary/15 text-secondary", dot: "bg-secondary" },
  paused: { label: "Paused", className: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500" },
  on_hold: { label: "On Hold", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  past_due: { label: "Past Due", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  placed_closed: { label: "Placed", className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", dot: "bg-violet-500" },

  // Legacy status compatibility
  lead: { label: "Lead", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  roles_suggested: { label: "Roles Suggested", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  roles_confirmed: { label: "Roles Confirmed", className: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  credential_completed: { label: "Credentials Ready", className: "bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  placed: { label: "Placed", className: "bg-secondary text-secondary-foreground", dot: "bg-white" },

  // Generic statuses
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  pending: { label: "Pending", className: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  completed: { label: "Completed", className: "bg-secondary text-secondary-foreground", dot: "bg-white" },
  applied: { label: "Applied", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  screening: { label: "Screening", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  interview: { label: "Interview", className: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  offer: { label: "Offer", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  no_response: { label: "No Response", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  // Referral statuses
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  contacted: { label: "Contacted", className: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  onboarded: { label: "Onboarded", className: "bg-secondary text-secondary-foreground", dot: "bg-white" },
  closed: { label: "Closed", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  // Payment statuses
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  waived: { label: "Waived", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  partially_paid: { label: "Partially Paid", className: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  // Interview outcomes
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  selected: { label: "Selected", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  follow_up_needed: { label: "Follow-up", className: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  rescheduled: { label: "Rescheduled", className: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  no_show: { label: "No Show", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  // Billing
  grace_period: { label: "Grace Period", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  new: { label: "New", className: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className = "" }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status?.replace(/_/g, " ") || "Unknown", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <Badge className={`${config.className} border-0 gap-1.5 font-medium text-[11px] ${className}`}>
      {config.dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
