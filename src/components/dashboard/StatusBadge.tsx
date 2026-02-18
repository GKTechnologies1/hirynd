import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-muted text-muted-foreground" },
  approved: { label: "Approved", className: "bg-secondary/20 text-secondary" },
  intake_submitted: { label: "Intake Submitted", className: "bg-accent/20 text-accent-foreground" },
  roles_suggested: { label: "Roles Suggested", className: "bg-accent/30 text-accent-foreground" },
  roles_confirmed: { label: "Roles Confirmed", className: "bg-secondary/30 text-secondary" },
  paid: { label: "Paid", className: "bg-secondary/40 text-secondary" },
  credential_completed: { label: "Credentials Ready", className: "bg-secondary/50 text-secondary" },
  active_marketing: { label: "Active Marketing", className: "bg-secondary text-secondary-foreground" },
  paused: { label: "Paused", className: "bg-accent/40 text-accent-foreground" },
  cancelled: { label: "Cancelled", className: "bg-destructive/20 text-destructive" },
  placed: { label: "Placed", className: "bg-secondary text-secondary-foreground" },
  // Generic
  active: { label: "Active", className: "bg-secondary/20 text-secondary" },
  pending: { label: "Pending", className: "bg-accent/20 text-accent-foreground" },
  completed: { label: "Completed", className: "bg-secondary text-secondary-foreground" },
  applied: { label: "Applied", className: "bg-muted text-muted-foreground" },
  screening: { label: "Screening", className: "bg-accent/20 text-accent-foreground" },
  interview: { label: "Interview", className: "bg-secondary/30 text-secondary" },
  offer: { label: "Offer", className: "bg-secondary text-secondary-foreground" },
  rejected: { label: "Rejected", className: "bg-destructive/20 text-destructive" },
  no_response: { label: "No Response", className: "bg-muted text-muted-foreground" },
  new: { label: "New", className: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", className: "bg-accent/20 text-accent-foreground" },
  onboarded: { label: "Onboarded", className: "bg-secondary text-secondary-foreground" },
  past_due: { label: "Past Due", className: "bg-destructive/20 text-destructive" },
  grace_period: { label: "Grace Period", className: "bg-accent/30 text-accent-foreground" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className = "" }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge className={`${config.className} border-0 ${className}`}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
