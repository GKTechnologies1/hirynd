import { useState, useEffect } from "react";
import { candidatesApi, recruitersApi, billingApi, authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw } from "lucide-react";
import {
  BarChart as ReBarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, revenueRes, candsRes] = await Promise.all([
        authApi.analytics(),
        billingApi.billingAnalytics(),
        candidatesApi.list()
      ]);
      setAnalytics(analyticsRes.data);
      setRevenueData(revenueRes.data?.revenue_by_month || []);
      
      const counts: Record<string, number> = {};
      (candsRes.data || []).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setPipelineCounts(counts);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hyrind Analytics & Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor performance and export platform data</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin mr-2 h-4 w-4" : "mr-2 h-4 w-4"} /> Refresh Analytics
        </Button>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Registrations trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">User Registrations (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.registrations_by_month || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} name="Registrations" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ReBarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString("en-US")}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Revenue" />
                </ReBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline stage distribution */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-secondary">Pipeline Stage Distribution</CardTitle>
              <CardDescription>Visualizing candidate volume across all stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ReBarChart
                  layout="vertical"
                  data={Object.entries(pipelineCounts)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => ({ stage: k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), count: v }))
                    .sort((a,b) => b.count - a.count)
                  }
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <h3 className="text-lg font-bold text-foreground mt-8 mb-4">Export Tools</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
};

export default AdminReportsPage;
