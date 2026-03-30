import { useState } from "react";
import { candidatesApi, recruitersApi, billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

const downloadCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const AdminReportsPage = () => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState("");

  const exportPipeline = async () => {
    setExporting("pipeline");
    try {
      const { data: candidates } = await candidatesApi.list();
      if (!candidates || candidates.length === 0) { toast({ title: "No data" }); setExporting(""); return; }
      const rows = candidates.map((c: any) => ({
        candidate_name: c.full_name || c.profile?.full_name || "",
        email: c.email || c.profile?.email || "",
        status: c.status,
        created_at: c.created_at,
      }));
      downloadCSV(rows, "candidate-pipeline.csv");
      toast({ title: "Pipeline exported" });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
    setExporting("");
  };

  const exportRecruiterProductivity = async () => {
    toast({ title: "Export unavailable", description: "This report requires additional backend support.", variant: "destructive" });
  };

  const exportCandidateActivity = async () => {
    toast({ title: "Export unavailable", description: "This report requires additional backend support.", variant: "destructive" });
  };

  const exportSubscriptionLedger = async () => {
    toast({ title: "Export unavailable", description: "This report requires additional backend support.", variant: "destructive" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Candidate Pipeline Export</CardTitle>
          <CardDescription>Name, status, assigned recruiters, dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportPipeline} disabled={exporting === "pipeline"}>
            <Download className="mr-2 h-4 w-4" /> {exporting === "pipeline" ? "Exporting..." : "Export CSV"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recruiter Productivity Export</CardTitle>
          <CardDescription>Assigned candidates, submission totals, interviews logged.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportRecruiterProductivity} disabled={exporting === "productivity"}>
            <Download className="mr-2 h-4 w-4" /> {exporting === "productivity" ? "Exporting..." : "Export CSV"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Activity Export</CardTitle>
          <CardDescription>Per-candidate submissions, jobs, interviews, training clicks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportCandidateActivity} disabled={exporting === "activity"}>
            <Download className="mr-2 h-4 w-4" /> {exporting === "activity" ? "Exporting..." : "Export CSV"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Ledger Export</CardTitle>
          <CardDescription>Candidate, recruiters, subscription status, billing, total paid.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportSubscriptionLedger} disabled={exporting === "subscriptions"}>
            <Download className="mr-2 h-4 w-4" /> {exporting === "subscriptions" ? "Exporting..." : "Export CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReportsPage;
