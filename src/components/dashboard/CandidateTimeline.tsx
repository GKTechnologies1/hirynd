import { CheckCircle, Circle } from "lucide-react";
import { motion } from "framer-motion";

const PIPELINE_STEPS = [
  { key: "lead", label: "Interest Submitted" },
  { key: "approved", label: "Approved" },
  { key: "intake_submitted", label: "Intake Submitted" },
  { key: "roles_suggested", label: "Roles Suggested" },
  { key: "roles_confirmed", label: "Roles Confirmed" },
  { key: "paid", label: "Payment Complete" },
  { key: "credential_completed", label: "Credentials Ready" },
  { key: "active_marketing", label: "Active Marketing" },
  { key: "placed", label: "Placed" },
];

interface CandidateTimelineProps {
  currentStatus: string;
}

const CandidateTimeline = ({ currentStatus }: CandidateTimelineProps) => {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === currentStatus);
  const isPausedOrCancelled = ["paused", "cancelled"].includes(currentStatus);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-elevated">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Journey</h3>
      {isPausedOrCancelled && (
        <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          Your account is currently <strong>{currentStatus}</strong>.
        </div>
      )}
      <div className="space-y-0">
        {PIPELINE_STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className="flex items-start gap-3"
            >
              <div className="flex flex-col items-center">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-secondary" />
                ) : isCurrent ? (
                  <div className="relative h-5 w-5">
                    <div className="absolute inset-0 rounded-full border-2 border-secondary bg-secondary/20" />
                    <div className="absolute inset-1.5 rounded-full bg-secondary animate-pulse" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-border" />
                )}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={`h-6 w-0.5 ${isCompleted ? "bg-secondary" : "bg-border"}`} />
                )}
              </div>
              <span className={`text-sm leading-5 ${isCurrent ? "font-semibold text-card-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CandidateTimeline;
