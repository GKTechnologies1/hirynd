import { useState, useEffect } from "react";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface AdminQAChecklistProps {
  candidateId: string;
  candidateStatus: string;
}

interface CheckItem {
  label: string;
  done: boolean;
}

const AdminQAChecklist = ({ candidateId, candidateStatus }: AdminQAChecklistProps) => {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await candidatesApi.qaChecklist(candidateId);
        if (data && data.checks) {
          setChecks(data.checks);
        } else {
          // Fallback: derive from status
          const statusOrder = ["lead", "pending_approval", "approved", "intake_submitted", "roles_suggested", "roles_confirmed", "paid", "credential_completed", "active_marketing", "paused", "cancelled", "placed"];
          const idx = statusOrder.indexOf(candidateStatus);
          setChecks([
            { label: "Intake complete", done: idx >= 3 },
            { label: "Roles confirmed", done: idx >= 5 },
            { label: "Payment received", done: idx >= 6 },
            { label: "Credentials submitted", done: idx >= 7 },
            { label: "Marketing started", done: idx >= 8 || candidateStatus === "placed" },
            { label: "Placement closed", done: candidateStatus === "placed" },
          ]);
        }
      } catch {
        const statusOrder = ["lead", "pending_approval", "approved", "intake_submitted", "roles_suggested", "roles_confirmed", "paid", "credential_completed", "active_marketing", "paused", "cancelled", "placed"];
        const idx = statusOrder.indexOf(candidateStatus);
        setChecks([
          { label: "Intake complete", done: idx >= 3 },
          { label: "Roles confirmed", done: idx >= 5 },
          { label: "Payment received", done: idx >= 6 },
          { label: "Credentials submitted", done: idx >= 7 },
          { label: "Marketing started", done: idx >= 8 || candidateStatus === "placed" },
          { label: "Placement closed", done: candidateStatus === "placed" },
        ]);
      }
      setLoading(false);
    };
    run();
  }, [candidateId, candidateStatus]);

  if (loading) return null;

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle className="text-base">QA Checklist</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        {checks.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {item.done ? <CheckCircle className="h-4 w-4 text-secondary" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
            <span className={`text-sm ${item.done ? "text-card-foreground" : "text-muted-foreground"}`}>{item.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminQAChecklist;
