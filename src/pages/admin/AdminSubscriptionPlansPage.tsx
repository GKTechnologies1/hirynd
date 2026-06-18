import { useState, useEffect } from "react";
import { billingApi, candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CreditCard, Package, Users, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";

// Shared empty plan form
const emptyPlan = { name: "", description: "", amount: "", currency: "USD", billing_cycle: "monthly", is_base: true };
const emptyAddon = { name: "", description: "", amount: "", currency: "USD" };

const AdminSubscriptionPlansPage = () => {
  const { toast } = useToast();

  // Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan dialog
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ ...emptyPlan });
  const [savingPlan, setSavingPlan] = useState(false);

  // Addon dialog
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  const [addonForm, setAddonForm] = useState({ ...emptyAddon });
  const [savingAddon, setSavingAddon] = useState(false);

  // Assign Base Subscription Dialog
  const [assignSubDialogOpen, setAssignSubDialogOpen] = useState(false);
  const [assignSubCandidateId, setAssignSubCandidateId] = useState("");
  const [assignSubPlanId, setAssignSubPlanId] = useState("");
  const [assignSubAmount, setAssignSubAmount] = useState("");
  const [assignSubNotes, setAssignSubNotes] = useState("");
  const [assigningSub, setAssigningSub] = useState(false);

  // Assign Standalone Addon Dialog
  const [assignAddonDialogOpen, setAssignAddonDialogOpen] = useState(false);
  const [assignAddonCandidateId, setAssignAddonCandidateId] = useState("");
  const [assignAddonId, setAssignAddonId] = useState("");
  const [assignAddonAmount, setAssignAddonAmount] = useState("");
  const [assignAddonNotes, setAssignAddonNotes] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [assigningAddon, setAssigningAddon] = useState(false);

  // Search filter queries for Searchable ComboBox
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [addonSearchQuery, setAddonSearchQuery] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, a, s, c] = await Promise.all([
        billingApi.listPlans(),
        billingApi.listAddons(),
        billingApi.allSubscriptions(),
        candidatesApi.list(),
      ]);
      setPlans(p.data || []);
      setAddons(a.data || []);
      setSubscriptions(s.data || []);
      setCandidates(c.data || []);
    } catch (e: any) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Plan CRUD ──
  const openCreatePlan = () => { setEditingPlan(null); setPlanForm({ ...emptyPlan }); setPlanDialogOpen(true); };
  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({ name: plan.name, description: plan.description || "", amount: plan.amount, currency: plan.currency, billing_cycle: plan.billing_cycle, is_base: plan.is_base });
    setPlanDialogOpen(true);
  };
  const savePlan = async () => {
    setSavingPlan(true);
    try {
      if (editingPlan) {
        await billingApi.updatePlan(editingPlan.id, planForm);
        toast({ title: "Plan updated" });
      } else {
        await billingApi.createPlan(planForm);
        toast({ title: "Plan created" });
      }
      setPlanDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.detail || e.message, variant: "destructive" });
    }
    setSavingPlan(false);
  };
  const deletePlan = async (id: string) => {
    if (!confirm("Deactivate this plan?")) return;
    try { await billingApi.deletePlan(id); toast({ title: "Plan deactivated" }); fetchAll(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  // ── Addon CRUD ──
  const openCreateAddon = () => { setEditingAddon(null); setAddonForm({ ...emptyAddon }); setAddonDialogOpen(true); };
  const openEditAddon = (a: any) => {
    setEditingAddon(a);
    setAddonForm({ name: a.name, description: a.description || "", amount: a.amount, currency: a.currency });
    setAddonDialogOpen(true);
  };
  const saveAddon = async () => {
    setSavingAddon(true);
    try {
      if (editingAddon) { await billingApi.updateAddon(editingAddon.id, addonForm); toast({ title: "Addon updated" }); }
      else { await billingApi.createAddon(addonForm); toast({ title: "Addon created" }); }
      setAddonDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.detail || e.message, variant: "destructive" });
    }
    setSavingAddon(false);
  };
  const deleteAddon = async (id: string) => {
    if (!confirm("Deactivate this addon?")) return;
    try { await billingApi.deleteAddon(id); toast({ title: "Addon deactivated" }); fetchAll(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  // ── Assign Base Subscription ──
  const openAssignSub = () => {
    setAssignSubCandidateId("");
    const defaultPlan = plans.find(p => p.is_base && (p.name.toLowerCase().includes("monthly") || p.name.toLowerCase().includes("standard"))) || plans.find(p => p.is_base);
    setAssignSubPlanId(defaultPlan?.id || "");
    setAssignSubAmount(defaultPlan?.amount || "");
    setAssignSubNotes("");
    setSubSearchQuery("");
    setAssignSubDialogOpen(true);
  };

  const handleSelectSubCandidate = (candidateId: string) => {
    setAssignSubCandidateId(candidateId);
    const existingSub = subscriptions.find(s => s.candidate === candidateId);
    if (existingSub) {
      setAssignSubPlanId(existingSub.plan || existingSub.plan_detail?.id || "");
      setAssignSubAmount(existingSub.amount || "");
    } else {
      const defaultPlan = plans.find(p => p.is_base && (p.name.toLowerCase().includes("monthly") || p.name.toLowerCase().includes("standard"))) || plans.find(p => p.is_base);
      setAssignSubPlanId(defaultPlan?.id || "");
      setAssignSubAmount(defaultPlan?.amount || "");
    }
  };

  const handleSelectSubPlan = (planId: string) => {
    setAssignSubPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    setAssignSubAmount(plan?.amount || "");
  };

  const doAssignSub = async () => {
    if (!assignSubCandidateId || !assignSubPlanId) {
      toast({ title: "Select a candidate and plan", variant: "destructive" }); return;
    }
    setAssigningSub(true);
    try {
      await billingApi.assignPlan(assignSubCandidateId, { 
        plan_id: assignSubPlanId, 
        amount: assignSubAmount ? parseFloat(assignSubAmount) : undefined,
        admin_notes: assignSubNotes 
      });
      toast({ title: "Base plan assigned! Candidate will receive a payment notification." });
      setAssignSubDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setAssigningSub(false);
  };


  // ── Assign Standalone Addon ──
  const openAssignAddon = () => {
    setAssignAddonCandidateId("");
    setAssignAddonId(addons[0]?.id || "");
    setAssignAddonAmount(addons[0]?.amount || "");
    setAssignAddonNotes("");
    setActivateImmediately(false);
    setAddonSearchQuery("");
    setAssignAddonDialogOpen(true);
  };

  const handleSelectAddon = (addonId: string) => {
    setAssignAddonId(addonId);
    const addon = addons.find(a => a.id === addonId);
    setAssignAddonAmount(addon?.amount || "");
  };

  const doAssignAddon = async () => {
    if (!assignAddonCandidateId || !assignAddonId) {
      toast({ title: "Select a candidate and addon", variant: "destructive" }); return;
    }
    setAssigningAddon(true);
    try {
      await billingApi.assignAddon(assignAddonCandidateId, {
        addon_id: assignAddonId,
        amount: assignAddonAmount ? parseFloat(assignAddonAmount) : undefined,
        admin_notes: assignAddonNotes,
        activate_immediately: activateImmediately
      });
      toast({ 
        title: activateImmediately 
          ? "Addon assigned and activated successfully!" 
          : "Addon assigned! Candidate will receive a payment notification." 
      });
      setAssignAddonDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setAssigningAddon(false);
  };

  const subStatusColor: Record<string, string> = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    past_due: "bg-red-100 text-red-800",
    paused: "bg-gray-100 text-gray-700",
    canceled: "bg-gray-200 text-gray-500",
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Subscription Plans</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage base plans, add-ons, and assign subscriptions to candidates</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary/20 text-foreground hover:bg-muted/80" onClick={openAssignAddon}>
            <Package className="mr-2 h-4 w-4 text-primary" /> Assign Addon Service
          </Button>
          <Button variant="hero" onClick={openAssignSub}>
            <Users className="mr-2 h-4 w-4" /> Assign Base Subscription
          </Button>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans"><CreditCard className="mr-1 h-4 w-4 inline" />Base Plans</TabsTrigger>
          <TabsTrigger value="addons"><Package className="mr-1 h-4 w-4 inline" />Add-Ons</TabsTrigger>
          <TabsTrigger value="subscriptions"><Users className="mr-1 h-4 w-4 inline" />Candidate Subscriptions</TabsTrigger>
        </TabsList>

        {/* ── Base Plans ── */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Base Plans</CardTitle>
              <Button onClick={openCreatePlan} size="sm"><Plus className="mr-1 h-4 w-4" />New Plan</Button>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={plans}
                isLoading={loading}
                searchKey="name"
                emptyMessage="No plans yet. Create your first plan."
                columns={[
                  { 
                    header: "Name", 
                    render: (p: any) => (
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      </div>
                    )
                  },
                  { 
                    header: "Amount", 
                    render: (p: any) => (
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />{Number(p.amount).toLocaleString()}
                      </span>
                    )
                  },
                  { 
                    header: "Billing Cycle", 
                    render: (p: any) => <span className="text-sm capitalize">{p.billing_cycle?.replace(/_/g, " ")}</span>
                  },
                  { 
                    header: "Type", 
                    render: (p: any) => <Badge variant="outline" className="text-xs">{p.is_base ? "Base" : "Addon"}</Badge>
                  },
                  { 
                    header: "Status", 
                    render: (p: any) => <Badge variant={p.is_active ? "secondary" : "outline"} className={p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  },
                  { 
                    header: "Actions", 
                    className: "text-right pr-6",
                    render: (p: any) => (
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEditPlan(p)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => deletePlan(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Addons ── */}
        <TabsContent value="addons">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add-On Services</CardTitle>
              <Button onClick={openCreateAddon} size="sm"><Plus className="mr-1 h-4 w-4" />New Add-On</Button>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={addons}
                isLoading={loading}
                searchKey="name"
                emptyMessage="No add-ons yet."
                columns={[
                  { 
                    header: "Name", 
                    render: (a: any) => (
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                      </div>
                    )
                  },
                  { 
                    header: "Amount", 
                    render: (a: any) => (
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />{Number(a.amount).toLocaleString()}
                      </span>
                    )
                  },
                  { 
                    header: "Status", 
                    render: (a: any) => <Badge variant={a.is_active ? "secondary" : "outline"} className={a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                  },
                  { 
                    header: "Actions", 
                    className: "text-right pr-6",
                    render: (a: any) => (
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEditAddon(a)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteAddon(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Candidate Subscriptions ── */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>All candidates with an assigned subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={subscriptions}
                isLoading={loading}
                searchKey="candidate_name"
                emptyMessage="No subscriptions assigned yet."
                columns={[
                  { 
                    header: "Candidate", 
                    render: (s: any) => (
                      <div>
                        <p className="font-medium text-sm">{s.candidate_name}</p>
                        <p className="text-xs text-muted-foreground">{s.candidate_email}</p>
                      </div>
                    )
                  },
                  { header: "Plan", accessorKey: "plan_name", className: "text-sm" },
                  { 
                    header: "Amount", 
                    render: (s: any) => (
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />{Number(s.amount).toLocaleString()}
                      </span>
                    )
                  },
                  { 
                    header: "Add-Ons", 
                    render: (s: any) => (
                      <div className="flex flex-wrap gap-1">
                        {s.addon_assignments?.length > 0
                          ? s.addon_assignments.map((a: any) => (
                            <Badge key={a.id} variant="outline" className="text-[10px] px-1.5 h-5">{a.addon_detail?.name}</Badge>
                          ))
                          : <span className="text-xs text-muted-foreground">None</span>
                        }
                      </div>
                    )
                  },
                  { 
                    header: "Status", 
                    render: (s: any) => (
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${subStatusColor[s.status] || "bg-gray-100 text-gray-700"}`}>
                        {s.status?.replace(/_/g, " ")}
                      </span>
                    )
                  },
                  { 
                    header: "Assigned", 
                    render: (s: any) => <span className="text-xs text-muted-foreground">{formatDate(s.payment_initiated_at)}</span>
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ── Plan Create/Edit Dialog ── */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            <DialogDescription>Define a subscription plan candidates will be assigned to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Plan Name</Label><Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard, Premium" /></div>
            <div><Label>Description</Label><Textarea value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === '-') {
                      e.preventDefault();
                    }
                  }}
                  value={planForm.amount}
                  onChange={e => setPlanForm(p => ({ ...p, amount: e.target.value.replace(/-/g, "") }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <Select value={planForm.billing_cycle} onValueChange={v => setPlanForm(p => ({ ...p, billing_cycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={savePlan} disabled={savingPlan}>{savingPlan ? "Saving..." : editingPlan ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* ── Addon Create/Edit Dialog ── */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddon ? "Edit Add-On" : "Create New Add-On"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Add-On Name</Label><Input value={addonForm.name} onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Resume Review, Mock Interview" /></div>
            <div><Label>Description</Label><Textarea value={addonForm.description} onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-') {
                    e.preventDefault();
                  }
                }}
                value={addonForm.amount}
                onChange={e => setAddonForm(p => ({ ...p, amount: e.target.value.replace(/-/g, "") }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={saveAddon} disabled={savingAddon}>{savingAddon ? "Saving..." : editingAddon ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* ── Assign Base Subscription Dialog ── */}
      <Dialog open={assignSubDialogOpen} onOpenChange={setAssignSubDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Base Subscription Plan</DialogTitle>
            <DialogDescription>
              Select a candidate and assign a core subscription plan. This will initiate their monthly/quarterly billing cycle and they will be notified to pay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold text-slate-800">Search Candidate (Name, Email, or ID)</Label>
              {!assignSubCandidateId ? (
                <div className="space-y-2 mt-1">
                  <Input
                    placeholder="Type to search (e.g. John Doe)..."
                    value={subSearchQuery}
                    onChange={e => setSubSearchQuery(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <div className="max-h-52 overflow-y-auto border border-border/80 rounded-xl bg-card/50 backdrop-blur-md divide-y divide-border/60 shadow-inner">
                    {candidates
                      .filter(c => {
                        if (!subSearchQuery) return true;
                        const q = subSearchQuery.toLowerCase();
                        const name = (c.full_name || "").toLowerCase();
                        const email = (c.email || "").toLowerCase();
                        const dispId = (c.display_id || "").toLowerCase();
                        return name.includes(q) || email.includes(q) || dispId.includes(q);
                      })
                      .map(c => {
                        const existingSub = subscriptions.find(s => s.candidate === c.id);
                        const isSubActive = existingSub?.status === "active";
                        const isSubPending = existingSub?.status === "pending_payment";
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectSubCandidate(c.id)}
                            className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="min-w-0">
                               <p className="text-sm font-semibold text-slate-800">{c.full_name || c.email}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-1.5">{c.status?.replace(/_/g, " ")}</Badge>
                              {isSubActive && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-200">Active Sub</span>}
                              {isSubPending && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">Pending</span>}
                            </div>
                          </div>
                        );
                      })}
                    {candidates.filter(c => {
                      if (!subSearchQuery) return true;
                      const q = subSearchQuery.toLowerCase();
                      const name = (c.full_name || "").toLowerCase();
                      const email = (c.email || "").toLowerCase();
                      const dispId = (c.display_id || "").toLowerCase();
                      return name.includes(q) || email.includes(q) || dispId.includes(q);
                    }).length === 0 && (
                      <p className="p-4 text-center text-xs text-muted-foreground italic">No matching candidates found.</p>
                    )}
                  </div>
                </div>
              ) : (
                // Selected Candidate View
                <div className="mt-1 flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/[0.02] shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary shrink-0">
                      {(candidates.find(c => c.id === assignSubCandidateId)?.full_name || candidates.find(c => c.id === assignSubCandidateId)?.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {candidates.find(c => c.id === assignSubCandidateId)?.full_name || candidates.find(c => c.id === assignSubCandidateId)?.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{candidates.find(c => c.id === assignSubCandidateId)?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setAssignSubCandidateId("")}
                  >
                    Change Candidate
                  </Button>
                </div>
              )}
            </div>
 
            {assignSubCandidateId && subscriptions.find(s => s.candidate === assignSubCandidateId)?.status === "pending_payment" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-1.5 animate-in fade-in duration-300">
                <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" /> Pending Billing Record
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  This candidate already has a pending payment assigned on <strong className="text-blue-900">{formatDate(subscriptions.find(s => s.candidate === assignSubCandidateId)?.payment_initiated_at)}</strong>. 
                  Re-assigning will update their pending subscription checkout price.
                </p>
              </div>
            )}
 
            {assignSubCandidateId && subscriptions.find(s => s.candidate === assignSubCandidateId)?.status === "active" && (
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-1.5 animate-in fade-in duration-300">
                <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" /> Active Subscription Found
                </p>
                <p className="text-xs text-green-700 leading-relaxed">
                  This candidate currently has an active subscription. If you assign a new plan, it will update their current base subscription terms.
                </p>
              </div>
            )}
 
            {/* Base Plan */}
            <div>
              <Label>Base Plan</Label>
              <Select value={assignSubPlanId} onValueChange={handleSelectSubPlan}>
                <SelectTrigger><SelectValue placeholder="Select base plan..." /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_base).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ${Number(p.amount).toLocaleString()} / {p.billing_cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
 
            <div>
              <Label>Custom Price Override (USD)</Label>
              <Input
                type="number"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-') {
                    e.preventDefault();
                  }
                }}
                value={assignSubAmount}
                onChange={e => setAssignSubAmount(e.target.value.replace(/-/g, ""))}
                placeholder="Leave blank to use default plan price"
              />
            </div>
 
            <div>
              <Label>Admin Notes / Comments</Label>
              <Textarea
                value={assignSubNotes}
                onChange={e => setAssignSubNotes(e.target.value)}
                placeholder="Provide details about discounts or payment agreements..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignSubDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="hero" 
              onClick={doAssignSub} 
              disabled={assigningSub || !assignSubCandidateId || !assignSubPlanId}
            >
              {assigningSub ? "Assigning..." : "Assign Base Plan & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* ── Assign Standalone Addon Dialog ── */}
      <Dialog open={assignAddonDialogOpen} onOpenChange={setAssignAddonDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Add-On Service</DialogTitle>
            <DialogDescription>
              Assign a standalone one-time addon (Mock Practice, Interview Support, etc.) to a candidate. This is independent of any base subscription plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold text-slate-800">Search Candidate (Name, Email, or ID)</Label>
              {!assignAddonCandidateId ? (
                <div className="space-y-2 mt-1">
                  <Input
                    placeholder="Type to search (e.g. John Doe)..."
                    value={addonSearchQuery}
                    onChange={e => setAddonSearchQuery(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <div className="max-h-52 overflow-y-auto border border-border/80 rounded-xl bg-card/50 backdrop-blur-md divide-y divide-border/60 shadow-inner">
                    {candidates
                      .filter(c => {
                        if (!addonSearchQuery) return true;
                        const q = addonSearchQuery.toLowerCase();
                        const name = (c.full_name || "").toLowerCase();
                        const email = (c.email || "").toLowerCase();
                        const dispId = (c.display_id || "").toLowerCase();
                        return name.includes(q) || email.includes(q) || dispId.includes(q);
                      })
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => setAssignAddonCandidateId(c.id)}
                          className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{c.full_name || c.email}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-1.5 shrink-0">{c.status?.replace(/_/g, " ")}</Badge>
                        </div>
                      ))}
                    {candidates.filter(c => {
                      if (!addonSearchQuery) return true;
                      const q = addonSearchQuery.toLowerCase();
                      const name = (c.full_name || "").toLowerCase();
                      const email = (c.email || "").toLowerCase();
                      const dispId = (c.display_id || "").toLowerCase();
                      return name.includes(q) || email.includes(q) || dispId.includes(q);
                    }).length === 0 && (
                      <p className="p-4 text-center text-xs text-muted-foreground italic">No matching candidates found.</p>
                    )}
                  </div>
                </div>
              ) : (
                // Selected Candidate View
                <div className="mt-1 flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/[0.02] shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary shrink-0">
                      {(candidates.find(c => c.id === assignAddonCandidateId)?.full_name || candidates.find(c => c.id === assignAddonCandidateId)?.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {candidates.find(c => c.id === assignAddonCandidateId)?.full_name || candidates.find(c => c.id === assignAddonCandidateId)?.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{candidates.find(c => c.id === assignAddonCandidateId)?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setAssignAddonCandidateId("")}
                  >
                    Change Candidate
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label>Add-On Service</Label>
              <Select value={assignAddonId} onValueChange={handleSelectAddon}>
                <SelectTrigger><SelectValue placeholder="Select addon..." /></SelectTrigger>
                <SelectContent>
                  {addons.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — ${Number(a.amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Custom Price Override (USD)</Label>
              <Input
                type="number"
                min="0"
                onKeyDown={(e) => {
                  if (e.key === '-') {
                    e.preventDefault();
                  }
                }}
                value={assignAddonAmount}
                onChange={e => setAssignAddonAmount(e.target.value.replace(/-/g, ""))}
                placeholder="Leave blank to use default addon price"
              />
            </div>

            <div className="flex items-center space-x-2 border rounded-lg p-3 bg-muted/20">
              <input
                id="activate-immediately"
                type="checkbox"
                checked={activateImmediately}
                onChange={e => setActivateImmediately(e.target.checked)}
                className="h-4 w-4 text-primary accent-primary rounded cursor-pointer"
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="activate-immediately" className="text-sm font-semibold cursor-pointer">
                  Activate Immediately (Complimentary or Manual Payment)
                </label>
                <p className="text-xs text-muted-foreground">
                  Skips Candidate dashboard payment checkout, completes assignment instantly, and creates a completed invoice.
                </p>
              </div>
            </div>

            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={assignAddonNotes}
                onChange={e => setAssignAddonNotes(e.target.value)}
                placeholder="Enter special agreement notes or candidate details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignAddonDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="hero" 
              onClick={doAssignAddon} 
              disabled={assigningAddon || !assignAddonCandidateId || !assignAddonId}
            >
              {assigningAddon ? "Assigning Addon..." : activateImmediately ? "Assign & Activate Instantly" : "Assign Addon & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionPlansPage;
