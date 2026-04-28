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
import { Plus, CreditCard, Layout, Settings, Users, Info } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const AdminSubscriptionPage = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"subscriptions" | "plans" | "addons">("subscriptions");
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ candidate_id: "", plan_id: "", addon_ids: [] as string[] });

  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", amount: "", currency: "USD", billing_cycle: "monthly", description: "" });

  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [addonForm, setAddonForm] = useState({ name: "", amount: "", currency: "USD", description: "" });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const [subRes, planRes, addRes, candRes] = await Promise.all([
        billingApi.allSubscriptions(),
        billingApi.listPlans(),
        billingApi.listAddons(),
        candidatesApi.all(),
      ]);
      setSubscriptions(subRes.data || []);
      setPlans(planRes.data || []);
      setAddons(addRes.data || []);
      setCandidates(candRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleAssign = async () => {
    if (!assignForm.candidate_id || !assignForm.plan_id) return;
    try {
      await billingApi.assignPlan(assignForm.candidate_id, { plan_id: assignForm.plan_id, addons: assignForm.addon_ids });
      toast({ title: "Plan assigned successfully" });
      setShowAssignDialog(false);
      fetchServices();
    } catch { toast({ title: "Error assigning plan", variant: "destructive" }); }
  };

  const handleCreatePlan = async () => {
    try {
      await billingApi.createPlan({ ...planForm, amount: parseFloat(planForm.amount) });
      toast({ title: "Plan created" });
      setShowPlanDialog(false);
      setPlanForm({ name: "", amount: "", currency: "USD", billing_cycle: "monthly", description: "" });
      fetchServices();
    } catch { toast({ title: "Error creating plan", variant: "destructive" }); }
  };

  const handleCreateAddon = async () => {
    try {
      await billingApi.createAddon({ ...addonForm, amount: parseFloat(addonForm.amount) });
      toast({ title: "Addon created" });
      setShowAddonDialog(false);
      setAddonForm({ name: "", amount: "", currency: "USD", description: "" });
      fetchServices();
    } catch { toast({ title: "Error creating addon", variant: "destructive" }); }
  };

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-500/10 text-emerald-600";
    if (s === "pending_payment" || s === "trialing") return "bg-amber-500/10 text-amber-600";
    if (s === "failed" || s === "canceled") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Management</h1>
          <p className="text-sm text-muted-foreground">Configure recurring user plans, service addons, and manage individual user commitments.</p>
        </div>
        <Button variant="hero" size="sm" className="font-bold shadow-lg shadow-primary/20" onClick={() => setShowAssignDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Assign New Service
        </Button>
      </div>

      {/* Internal Navigation */}
      <div className="flex bg-muted p-1 rounded-2xl w-fit">
        {[
          { key: "subscriptions", label: "USER SUBSCRIPTIONS", icon: <Users className="h-3.5 w-3.5" /> },
          { key: "plans", label: "BASE PLANS", icon: <Layout className="h-3.5 w-3.5" /> },
          { key: "addons", label: "SERVICE ADDONS", icon: <Plus className="h-3.5 w-3.5" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-6 py-2 text-[10px] font-bold flex items-center gap-2 rounded-xl transition-all ${
              tab === t.key ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* User Subscriptions */}
      {tab === "subscriptions" && (
        <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
          <CardContent className="p-0">
            <DataTable
              data={subscriptions}
              isLoading={loading}
              searchKey="candidate_name"
              searchPlaceholder="Search by candidate name..."
              columns={[
                { 
                  header: "Candidate", 
                  className: "pl-6 py-5",
                  render: (s: any) => (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">{s.candidate_name || "—"}</span>
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase">{s.candidate_display_id}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{s.candidate_email}</span>
                    </div>
                  )
                },
                { 
                  header: "Plan & Addons", 
                  render: (s: any) => (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">{s.plan_name}</span>
                      {s.addon_assignments?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.addon_assignments.map((a: any) => (
                            <Badge key={a.id} variant="outline" className="text-[8px] px-1.5 h-4 bg-muted/50 border-none font-bold uppercase tracking-tighter">
                              +{a.addon_detail?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  header: "Cycle Commitment",
                  render: (s: any) => {
                    const total = Number(s.amount) + (s.total_addons_amount || 0);
                    return (
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">${total.toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-70">{s.billing_cycle}</span>
                      </div>
                    );
                  }
                },
                {
                  header: "Status",
                  render: (s: any) => <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${statusColor(s.status)}`}>{s.status.replace(/_/g, " ").toUpperCase()}</Badge>
                },
                { 
                  header: "Next Bill", 
                  render: (s: any) => <span className="text-xs font-bold text-muted-foreground">{s.next_billing_at ? format(new Date(s.next_billing_at), "MMM d, yyyy") : "—"}</span>
                },
                {
                  header: "Actions",
                  className: "pr-6 text-right",
                  render: (s: any) => (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-bold uppercase hover:bg-primary hover:text-white transition-all"
                      onClick={() => {
                        setAssignForm({
                          candidate_id: s.candidate,
                          plan_id: s.plan,
                          addon_ids: s.addon_assignments?.map((a: any) => a.addon) || []
                        });
                        setShowAssignDialog(true);
                      }}
                    >
                      Manage
                    </Button>
                  )
                }
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Plans Catalogue */}
      {tab === "plans" && (
        <div className="grid gap-6">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={() => setShowPlanDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create New Plan
            </Button>
          </div>
          <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
            <CardContent className="p-0">
              <DataTable
                data={plans}
                isLoading={loading}
                columns={[
                  { header: "Plan Name", accessorKey: "name", className: "pl-6 font-bold text-sm" },
                  { header: "Amount", render: (p: any) => <span className="font-black text-sm">${Number(p.amount).toLocaleString()} {p.currency}</span> },
                  { header: "Billing Cycle", accessorKey: "billing_cycle", className: "text-xs font-bold uppercase text-muted-foreground" },
                  { header: "Description", accessorKey: "description", className: "text-xs text-muted-foreground" },
                  { 
                    header: "Status", 
                    render: (p: any) => <Badge variant={p.is_active ? "secondary" : "outline"} className="text-[10px] font-bold">{p.is_active ? "ACTIVE" : "INACTIVE"}</Badge> 
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Addons Catalogue */}
      {tab === "addons" && (
        <div className="grid gap-6">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={() => setShowAddonDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create New Addon
            </Button>
          </div>
          <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
            <CardContent className="p-0">
              <DataTable
                data={addons}
                isLoading={loading}
                columns={[
                  { header: "Addon Name", accessorKey: "name", className: "pl-6 font-bold text-sm" },
                  { header: "Added Cost", render: (a: any) => <span className="font-black text-emerald-600 text-sm">+${Number(a.amount).toLocaleString()} {a.currency}</span> },
                  { header: "Description", accessorKey: "description", className: "text-xs text-muted-foreground" },
                  { 
                    header: "Status", 
                    render: (a: any) => <Badge variant={a.is_active ? "secondary" : "outline"} className="text-[10px] font-bold">{a.is_active ? "ACTIVE" : "INACTIVE"}</Badge> 
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs... */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Subscription Service</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Candidate</Label>
              <Select value={assignForm.candidate_id} onValueChange={v => setAssignForm(p => ({ ...p, candidate_id: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose candidate..." /></SelectTrigger>
                <SelectContent>
                  {candidates.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Base Plan</Label>
              <Select value={assignForm.plan_id} onValueChange={v => setAssignForm(p => ({ ...p, plan_id: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Choose base plan..." /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ${Number(p.amount).toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addons.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Optional Addons</Label>
                <div className="grid grid-cols-1 gap-2 mt-1 max-h-[200px] overflow-y-auto pr-2">
                  {addons.map(a => (
                    <div key={a.id} className="flex items-center gap-3 border p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                      <input 
                        type="checkbox" 
                        id={`sub-addon-${a.id}`}
                        checked={assignForm.addon_ids.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) setAssignForm(p => ({ ...p, addon_ids: [...p.addon_ids, a.id] }));
                          else setAssignForm(p => ({ ...p, addon_ids: p.addon_ids.filter(id => id !== a.id) }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                      <Label htmlFor={`sub-addon-${a.id}`} className="flex-1 cursor-pointer font-bold text-sm">
                        {a.name} <span className="text-muted-foreground font-normal ml-1">(+${Number(a.amount).toLocaleString()})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleAssign} className="font-black">Confirm Assignment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Define New Subscription Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Plan Name</Label><Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Premium Placement" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount ($)</Label><Input type="number" value={planForm.amount} onChange={e => setPlanForm(p => ({ ...p, amount: e.target.value }))} /></div>
              <div><Label>Billing Cycle</Label>
                <Select value={planForm.billing_cycle} onValueChange={v => setPlanForm(p => ({ ...p, billing_cycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleCreatePlan}>Create Plan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Addon Dialog */}
      <Dialog open={showAddonDialog} onOpenChange={setShowAddonDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Service Addon</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Addon Name</Label><Input value={addonForm.name} onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mock Interview Pro" /></div>
            <div><Label>Added Amount ($)</Label><Input type="number" value={addonForm.amount} onChange={e => setAddonForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={addonForm.description} onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddonDialog(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleCreateAddon}>Create Addon</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionPage;
