import { useState, useEffect } from "react";
import { candidatesApi, recruitersApi } from "@/services/api";
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
      const statusOrder = ["pending_approval", "lead", "approved", "intake_submitted", "roles_published", "roles_confirmed", "payment_completed", "credentials_submitted", "active_marketing", "paused", "on_hold", "past_due", "cancelled", "placed_closed"];
      const idx = statusOrder.indexOf(candidateStatus);

      const [credRes, assignRes, logRes, interviewRes, placementRes] = await Promise.all([
        candidatesApi.getCredentials(candidateId).catch(() => ({ data: [] })),
        recruitersApi.assignments(candidateId).catch(() => ({ data: [] })),
        recruitersApi.getDailyLogs(candidateId).catch(() => ({ data: [] })),
        candidatesApi.getInterviews(candidateId).catch(() => ({ data: [] })),
        candidatesApi.getPlacement(candidateId).catch(() => ({ data: null })),
      ]);
      const credCount = (credRes.data || []).length;
      const assignCount = (assignRes.data || []).length;
      const logCount = (logRes.data || []).length;
      const interviewCount = (interviewRes.data || []).length;
      const placementCount = placementRes.data ? 1 : 0;

      setChecks([
        { label: "Intake complete", done: idx >= 3 },
        { label: "Roles confirmed", done: idx >= 5 },
        { label: "Payment received", done: idx >= 6 },
        { label: "Credentials submitted", done: (credCount || 0) > 0 || idx >= 7 },
        { label: "Recruiter assigned", done: (assignCount || 0) > 0 },
        { label: "Marketing started", done: idx >= 8 || candidateStatus === "placed_closed" },
        { label: "Applications logged", done: (logCount || 0) > 0 },
        { label: "Interviews logged", done: (interviewCount || 0) > 0 },
        { label: "Placement closed", done: (placementCount || 0) > 0 },
      ]);
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
