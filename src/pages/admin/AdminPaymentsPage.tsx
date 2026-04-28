import { useEffect, useState } from "react";
import { billingApi, candidatesApi } from "@/services/api";
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
  const [tab, setTab] = useState<"overview" | "payments" | "subscriptions" | "plans" | "addons">("overview");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ candidate_id: "", plan_id: "", addon_ids: [] as string[] });

  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", amount: "", currency: "USD", billing_cycle: "monthly", description: "" });

  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [addonForm, setAddonForm] = useState({ name: "", amount: "", currency: "USD", description: "" });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, subRes, planRes, addRes, candRes] = await Promise.all([
        billingApi.billingAnalytics(),
        billingApi.allPayments(statusFilter && statusFilter !== "all" ? { status: statusFilter } : undefined),
        billingApi.allSubscriptions(),
        billingApi.listPlans(),
        billingApi.listAddons(),
        candidatesApi.all(),
      ]);
      setSummary(sumRes.data);
      setPayments(payRes.data || []);
      setSubscriptions(subRes.data || []);
      setPlans(planRes.data || []);
      setAddons(addRes.data || []);
      setCandidates(candRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const handleAssign = async () => {
    if (!assignForm.candidate_id || !assignForm.plan_id) return;
    try {
      await billingApi.assignPlan(assignForm.candidate_id, { plan_id: assignForm.plan_id, addons: assignForm.addon_ids });
      toast({ title: "Plan assigned successfully" });
      setShowAssignDialog(false);
      fetchAll();
    } catch { toast({ title: "Error assigning plan", variant: "destructive" }); }
  };

  const handleCreatePlan = async () => {
    try {
      await billingApi.createPlan({ ...planForm, amount: parseFloat(planForm.amount) });
      toast({ title: "Plan created" });
      setShowPlanDialog(false);
      setPlanForm({ name: "", amount: "", currency: "USD", billing_cycle: "monthly", description: "" });
      fetchAll();
    } catch { toast({ title: "Error creating plan", variant: "destructive" }); }
  };

  const handleCreateAddon = async () => {
    try {
      await billingApi.createAddon({ ...addonForm, amount: parseFloat(addonForm.amount) });
      toast({ title: "Addon created" });
      setShowAddonDialog(false);
      setAddonForm({ name: "", amount: "", currency: "USD", description: "" });
      fetchAll();
    } catch { toast({ title: "Error creating addon", variant: "destructive" }); }
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
    { key: "addons", label: "Addons" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Manage user plans, addons, and system-wide pricing catalogue.</p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setShowAssignDialog(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Assign Plan to User
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
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
                      {p.display_id || `HYRPAY${(p.id || "").toString().slice(-6).toUpperCase()}`}
                    </span>
                  )
                },
                { 
                  header: "Candidate", 
                  accessorKey: "candidate_name", 
                  sortable: true, 
                  className: "font-medium text-sm",
                  render: (p: any) => (
                    <div className="flex flex-col">
                      <span className="font-bold">{p.candidate_name || "—"}</span>
                      <span className="text-[10px] text-muted-foreground">{p.candidate_email || "N/A"}</span>
                    </div>
                  )
                },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (p: any) => <span className="text-sm font-bold">${Number(p.amount).toLocaleString()}</span>
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
            <CardTitle className="text-sm font-semibold">Active User Subscriptions ({subscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={subscriptions}
              isLoading={loading}
              searchKey="candidate_name"
              searchPlaceholder="Search by candidate..."
              emptyMessage="No subscriptions found."
              columns={[
                { 
                  header: "Candidate", 
                  accessorKey: "candidate_name", 
                  sortable: true, 
                  className: "font-medium text-sm",
                  render: (s: any) => (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{s.candidate_name || "—"}</span>
                        <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-black">{s.candidate_display_id}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-normal">{s.candidate_email}</span>
                    </div>
                  )
                },
                { 
                  header: "Plan & Addons", 
                  render: (s: any) => (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">{s.plan_name}</span>
                      {s.addon_assignments?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {s.addon_assignments.map((a: any) => (
                            <Badge key={a.id} variant="outline" className="text-[8px] px-1 h-4 bg-muted/50 border-none">
                              +{a.addon_detail?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  header: "Total / Cycle",
                  sortable: true,
                  render: (s: any) => {
                    const total = Number(s.amount) + (s.total_addons_amount || 0);
                    return (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">${total.toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">{s.billing_cycle}</span>
                      </div>
                    );
                  }
                },
                {
                  header: "Status",
                  sortable: true,
                  accessorKey: "status",
                  render: (s: any) => <Badge variant="secondary" className={`text-xs ${statusColor(s.status)}`}>{s.status}</Badge>
                },
                { 
                  header: "Next Billing", 
                  accessorKey: "next_billing_at", 
                  sortable: true, 
                  render: (s: any) => <span className="text-xs text-muted-foreground">{s.next_billing_at ? format(new Date(s.next_billing_at), "MMM d, yyyy") : "—"}</span>
                },
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

      {/* Addons Tab */}
      {tab === "addons" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Subscription Addons</CardTitle>
            <Button variant="hero" size="sm" onClick={() => setShowAddonDialog(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Create Addon
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={addons}
              isLoading={loading}
              emptyMessage="No addons found."
              columns={[
                { header: "Name", accessorKey: "name", sortable: true, className: "font-medium text-sm" },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (a: any) => <span className="text-sm font-bold">+${Number(a.amount).toLocaleString()} {a.currency}</span>
                },
                { header: "Status", render: (a: any) => <Badge variant={a.is_active ? "secondary" : "outline"} className="text-xs">{a.is_active ? "Active" : "Inactive"}</Badge> },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Addon Dialog */}
      <Dialog open={showAddonDialog} onOpenChange={setShowAddonDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Subscription Addon</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Addon Name</Label><Input value={addonForm.name} onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Amount ($)</Label><Input type="number" value={addonForm.amount} onChange={e => setAddonForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={addonForm.description} onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddonDialog(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleCreateAddon}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Subscription to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Select Candidate</Label>
              <Select value={assignForm.candidate_id} onValueChange={v => setAssignForm(p => ({ ...p, candidate_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose candidate..." /></SelectTrigger>
                <SelectContent>
                  {candidates.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Base Plan</Label>
              <Select value={assignForm.plan_id} onValueChange={v => setAssignForm(p => ({ ...p, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose plan..." /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - ${Number(p.amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addons.length > 0 && (
              <div>
                <Label>Select Addons (Optional)</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {addons.map(a => (
                    <div key={a.id} className="flex items-center gap-2 border p-2 rounded-lg">
                      <input 
                        type="checkbox" 
                        id={a.id}
                        checked={assignForm.addon_ids.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) setAssignForm(p => ({ ...p, addon_ids: [...p.addon_ids, a.id] }));
                          else setAssignForm(p => ({ ...p, addon_ids: p.addon_ids.filter(id => id !== a.id) }));
                        }}
                      />
                      <Label htmlFor={a.id} className="flex-1 cursor-pointer">
                        {a.name} (+${Number(a.amount).toLocaleString()})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleAssign}>Assign & Notify</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
