import { useEffect, useState } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, AlertTriangle, CreditCard, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const AdminPaymentsPage = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", amount: "", currency: "USD", billing_cycle: "monthly", description: "" });
  const [tab, setTab] = useState<"overview" | "payments" | "subscriptions" | "plans">("overview");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, subRes, planRes] = await Promise.all([
        billingApi.billingAnalytics(),
        billingApi.allPayments(statusFilter && statusFilter !== "all" ? { status: statusFilter } : undefined),
        billingApi.allSubscriptions(),
        billingApi.listPlans(),
      ]);
      setSummary(sumRes.data);
      setPayments(payRes.data || []);
      setSubscriptions(subRes.data || []);
      setPlans(planRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const handleCreatePlan = async () => {
    try {
      await billingApi.createPlan({ ...planForm, amount: parseFloat(planForm.amount) });
      toast({ title: "Plan created" });
      setShowPlanDialog(false);
      setPlanForm({ name: "", amount: "", currency: "USD", billing_cycle: "monthly", description: "" });
      fetchAll();
    } catch { toast({ title: "Error creating plan", variant: "destructive" }); }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Deactivate this plan?")) return;
    try {
      await billingApi.deletePlan(planId);
      toast({ title: "Plan deactivated" });
      fetchAll();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const exportPaymentsCSV = () => {
    const headers = ["Candidate", "Amount", "Currency", "Type", "Status", "Date"];
    const rows = payments.map((p: any) => [
      p.candidate_name || "", p.amount, p.currency, p.payment_type, p.status,
      p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments_export.csv";
    a.click();
  };

  const statusColor = (s: string) => {
    if (s === "completed" || s === "active") return "bg-secondary/15 text-secondary";
    if (s === "pending" || s === "trialing") return "bg-accent/15 text-accent-foreground";
    if (s === "failed" || s === "past_due" || s === "canceled") return "bg-destructive/15 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: "Payments" },
    { key: "subscriptions", label: "Subscriptions" },
    { key: "plans", label: "Plans" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key ? "bg-card text-card-foreground border border-b-0 border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Revenue", value: `$${(summary.total_revenue || 0).toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: "bg-secondary/10 text-secondary" },
            { label: "Monthly Revenue", value: `$${(summary.monthly_revenue || 0).toLocaleString()}`, icon: <TrendingUp className="h-5 w-5" />, color: "bg-accent/10 text-accent-foreground" },
            { label: "Active Subs", value: summary.active_subscriptions, icon: <CreditCard className="h-5 w-5" />, color: "bg-primary/10 text-primary" },
            { label: "Past Due", value: summary.past_due_subscriptions, icon: <AlertTriangle className="h-5 w-5" />, color: summary.past_due_subscriptions > 0 ? "bg-destructive/10 text-destructive" : "bg-muted" },
          ].map((w, i) => (
            <motion.div key={w.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color}`}>{w.icon}</div>
                  <div>
                    <p className="text-xl font-bold text-card-foreground">{w.value}</p>
                    <p className="text-xs text-muted-foreground">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Payments ({payments.length})</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportPaymentsCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={payments}
              isLoading={loading}
              searchKey="candidate_name"
              searchPlaceholder="Search by candidate..."
              emptyMessage="No payments found."
              columns={[
                { 
                  header: "ID", 
                  className: "pl-4",
                  render: (p: any) => (
                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                      {`HYRPAY${(p.id || "").toString().slice(-6).toUpperCase()}`}
                    </span>
                  )
                },
                { header: "Candidate", accessorKey: "candidate_name", sortable: true, className: "font-medium text-sm" },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (p: any) => <span className="text-sm">${Number(p.amount).toLocaleString()}</span>
                },
                { header: "Type", accessorKey: "payment_type", sortable: true, className: "text-sm text-muted-foreground" },
                {
                  header: "Status",
                  sortable: true,
                  accessorKey: "status",
                  render: (p: any) => <Badge variant="secondary" className={`text-xs ${statusColor(p.status)}`}>{p.status}</Badge>
                },
                {
                  header: "Date",
                  sortable: true,
                  accessorKey: "created_at",
                  render: (p: any) => <span className="text-xs text-muted-foreground">{p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}</span>
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Tab */}
      {tab === "subscriptions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">All Subscriptions ({subscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={subscriptions}
              isLoading={loading}
              emptyMessage="No subscriptions found."
              columns={[
                { header: "Plan", accessorKey: "plan_name", sortable: true, className: "font-medium text-sm" },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (s: any) => <span className="text-sm">${Number(s.amount).toLocaleString()}</span>
                },
                {
                  header: "Status",
                  sortable: true,
                  accessorKey: "status",
                  render: (s: any) => <Badge variant="secondary" className={`text-xs ${statusColor(s.status)}`}>{s.status}</Badge>
                },
                { header: "Next Billing", accessorKey: "next_billing_at", sortable: true, className: "text-xs text-muted-foreground" },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Plans Tab */}
      {tab === "plans" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Subscription Plans</CardTitle>
            <Button variant="hero" size="sm" onClick={() => setShowPlanDialog(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Create Plan
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={plans}
              isLoading={loading}
              emptyMessage="No plans found."
              columns={[
                { header: "Name", accessorKey: "name", sortable: true, className: "font-medium text-sm" },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (p: any) => <span className="text-sm">${Number(p.amount).toLocaleString()} {p.currency}</span>
                },
                { header: "Cycle", accessorKey: "billing_cycle", sortable: true, className: "text-sm text-muted-foreground" },
                {
                  header: "Actions",
                  render: (p: any) => (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDeletePlan(p.id)}>
                      Deactivate
                    </Button>
                  )
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Plan Name</Label><Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Amount ($)</Label><Input type="number" value={planForm.amount} onChange={e => setPlanForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Billing Cycle</Label>
              <Select value={planForm.billing_cycle} onValueChange={v => setPlanForm(p => ({ ...p, billing_cycle: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleCreatePlan}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsPage;
