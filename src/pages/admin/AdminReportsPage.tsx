import { useState } from "react";
import { adminReportsApi } from "@/services/api";
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

  const handleExport = async (type: string, filename: string) => {
    setExporting(type);
    try {
      let res;
      switch (type) {
        case "pipeline": res = await adminReportsApi.pipeline(); break;
        case "productivity": res = await adminReportsApi.recruiterProductivity(); break;
        case "activity": res = await adminReportsApi.candidateActivity(); break;
        case "subscriptions": res = await adminReportsApi.subscriptionLedger(); break;
        default: return;
      }
      if (res.data && res.data.length > 0) {
        downloadCSV(res.data, filename);
        toast({ title: `${type} exported` });
      } else {
        toast({ title: "No data to export" });
      }
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setExporting("");
  };

  const reports = [
    { type: "pipeline", title: "Candidate Pipeline Export", desc: "Name, status, assigned recruiters, dates.", file: "candidate-pipeline.csv" },
    { type: "productivity", title: "Recruiter Productivity Export", desc: "Assigned candidates, submission totals, interviews logged.", file: "recruiter-productivity.csv" },
    { type: "activity", title: "Candidate Activity Export", desc: "Per-candidate submissions, jobs, interviews, training clicks.", file: "candidate-activity.csv" },
    { type: "subscriptions", title: "Subscription Ledger Export", desc: "Candidate, recruiters, subscription status, billing, total paid.", file: "subscription-ledger.csv" },
  ];

  return (
    <div className="space-y-6">
      {reports.map(r => (
        <Card key={r.type}>
          <CardHeader>
            <CardTitle>{r.title}</CardTitle>
            <CardDescription>{r.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleExport(r.type, r.file)} disabled={exporting === r.type}>
              <Download className="mr-2 h-4 w-4" /> {exporting === r.type ? "Exporting..." : "Export CSV"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminReportsPage;
