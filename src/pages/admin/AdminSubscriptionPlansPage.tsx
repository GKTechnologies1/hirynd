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

  // Assign-plan dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignCandidateId, setAssignCandidateId] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignAddonIds, setAssignAddonIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

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

  // ── Assign Plan ──
  const openAssign = () => {
    setAssignCandidateId("");
    const defaultPlan = plans.find(p => p.is_base && (p.name.toLowerCase().includes("monthly") || p.name.toLowerCase().includes("standard"))) || plans.find(p => p.is_base);
    setAssignPlanId(defaultPlan?.id || "");
    setAssignAddonIds([]);
    setAssignDialogOpen(true);
  };
  const doAssign = async () => {
    if (!assignCandidateId || !assignPlanId) {
      toast({ title: "Select a candidate and plan", variant: "destructive" }); return;
    }
    setAssigning(true);
    try {
      await billingApi.assignPlan(assignCandidateId, { plan_id: assignPlanId, addons: assignAddonIds });
      toast({ title: "Plan assigned! Candidate will receive a payment notification." });
      setAssignDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setAssigning(false);
  };

  const handleSelectCandidate = (candidateId: string) => {
    setAssignCandidateId(candidateId);
    const existingSub = subscriptions.find(s => s.candidate === candidateId);
    if (existingSub) {
      setAssignPlanId(existingSub.plan || existingSub.plan_detail?.id || "");
      const currentAddonIds = existingSub.addon_assignments?.map((a: any) => a.addon) || [];
      setAssignAddonIds(currentAddonIds);
    } else {
      // Automatically default to the 'Monthly Service Fee' plan (or first available base plan)
      const defaultPlan = plans.find(p => p.is_base && (p.name.toLowerCase().includes("monthly") || p.name.toLowerCase().includes("standard"))) || plans.find(p => p.is_base);
      setAssignPlanId(defaultPlan?.id || "");
      setAssignAddonIds([]);
    }
  };

  const toggleAddonSelection = (id: string) => {
    setAssignAddonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
        <Button variant="hero" onClick={openAssign}>
          <Users className="mr-2 h-4 w-4" /> Assign Plan to Candidate
        </Button>
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
        <DialogContent>
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
                <Input type="number" value={planForm.amount} onChange={e => setPlanForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddon ? "Edit Add-On" : "Create New Add-On"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Add-On Name</Label><Input value={addonForm.name} onChange={e => setAddonForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Resume Review, Mock Interview" /></div>
            <div><Label>Description</Label><Textarea value={addonForm.description} onChange={e => setAddonForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" value={addonForm.amount} onChange={e => setAddonForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={saveAddon} disabled={savingAddon}>{savingAddon ? "Saving..." : editingAddon ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Plan Dialog ── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
            <DialogDescription>Select a candidate, choose a base plan and optional add-ons. The candidate will be notified to complete payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Candidate</Label>
              <Select value={assignCandidateId} onValueChange={handleSelectCandidate}>
                <SelectTrigger><SelectValue placeholder="Select candidate..." /></SelectTrigger>
                <SelectContent>
                  {candidates
                    .filter(c => c.status !== "pending_approval" && c.status !== "lead")
                    .map(c => {
                      const existingSub = subscriptions.find(s => s.candidate === c.id);
                      const isSubActive = existingSub?.status === "active";
                      const isSubPending = existingSub?.status === "pending_payment";
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-1.5">
                            {c.full_name || c.email} — <span className="opacity-60 text-xs">{c.status?.replace(/_/g, " ")}</span>
                            {isSubActive && (
                              <span className="text-[9px] font-bold tracking-wider text-green-600 bg-green-50 px-1 py-0.5 rounded uppercase ml-2 border border-green-200">
                                Active Sub
                              </span>
                            )}
                            {isSubPending && (
                              <span className="text-[9px] font-bold tracking-wider text-amber-600 bg-amber-50 px-1 py-0.5 rounded uppercase ml-2 border border-amber-200 animate-pulse">
                                Pending Payment
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            
            {assignCandidateId && subscriptions.find(s => s.candidate === assignCandidateId)?.status === "pending_payment" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-1.5 animate-in fade-in duration-300">
                <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" /> Pending Billing Record
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  This candidate has an outstanding payment assigned on <strong className="text-blue-900">{formatDate(subscriptions.find(s => s.candidate === assignCandidateId)?.payment_initiated_at)}</strong>. 
                  Re-assigning a different plan/addons will update their pending checkout total. Re-assigning the identical combination is restricted.
                </p>
              </div>
            )}
            
            {assignCandidateId && subscriptions.find(s => s.candidate === assignCandidateId)?.status === "active" ? (
              // Active subscriber updates view
              <>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-1.5 animate-in fade-in duration-300">
                  <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600" /> Active Subscription Updates
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    This candidate has an active base plan. You can select and assign <strong>new addons</strong> below. The candidate will be notified to pay for only the newly added services under "Pending Charges" on their dashboard.
                  </p>
                </div>
                <div>
                  <Label>Base Plan</Label>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 mt-1 text-sm font-semibold flex items-center justify-between text-foreground">
                    <span>{plans.find(p => p.id === assignPlanId)?.name || "Monthly Service Fee"}</span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded uppercase">Active & Paid</span>
                  </div>
                </div>
                {addons.length > 0 && (
                  <div>
                    <Label>Add-Ons</Label>
                    <div className="mt-2 space-y-2">
                      {addons.map(a => {
                        const existingSub = subscriptions.find(s => s.candidate === assignCandidateId);
                        const isAlreadyAssigned = existingSub?.addon_assignments?.some((ea: any) => ea.addon === a.id);
                        return (
                          <label key={a.id} className={`flex items-center gap-3 cursor-pointer rounded-lg border border-border p-3 hover:bg-muted/50 ${isAlreadyAssigned ? "opacity-60 bg-muted/10 cursor-not-allowed" : ""}`}>
                            <input
                              type="checkbox"
                              checked={assignAddonIds.includes(a.id)}
                              onChange={() => !isAlreadyAssigned && toggleAddonSelection(a.id)}
                              disabled={isAlreadyAssigned}
                              className="h-4 w-4"
                            />
                            <span className="flex-1 font-medium text-sm">
                              {a.name}
                              {isAlreadyAssigned && (
                                <span className="text-[9px] text-green-600 bg-green-50 border border-green-200 px-1.5 ml-2 rounded font-bold uppercase whitespace-nowrap">
                                  Active & Paid
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-muted-foreground">+${Number(a.amount).toLocaleString()}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">New Charges to Complete</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${assignAddonIds
                      .filter(id => !subscriptions.find(s => s.candidate === assignCandidateId)?.addon_assignments?.some((ea: any) => ea.addon === id))
                      .reduce((sum, id) => sum + Number(addons.find(a => a.id === id)?.amount || 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
              </>
            ) : (
              // New provisioning view
              <>
                <div>
                  <Label>Base Plan</Label>
                  <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                    <SelectTrigger><SelectValue placeholder="Select plan..." /></SelectTrigger>
                    <SelectContent>
                      {plans.filter(p => p.is_base).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ${Number(p.amount).toLocaleString()} / {p.billing_cycle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {addons.length > 0 && (
                  <div>
                    <Label>Add-Ons (optional)</Label>
                    <div className="mt-2 space-y-2">
                      {addons.map(a => (
                        <label key={a.id} className="flex items-center gap-3 cursor-pointer rounded-lg border border-border p-3 hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={assignAddonIds.includes(a.id)}
                            onChange={() => toggleAddonSelection(a.id)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1 font-medium text-sm">{a.name}</span>
                          <span className="text-sm text-muted-foreground">+${Number(a.amount).toLocaleString()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {assignPlanId && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(
                        Number(plans.find(p => p.id === assignPlanId)?.amount || 0) +
                        assignAddonIds.reduce((sum, id) => sum + Number(addons.find(a => a.id === id)?.amount || 0), 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="hero" 
              onClick={doAssign} 
              disabled={assigning || !assignCandidateId || !assignPlanId}
            >
              {assigning ? "Assigning..." : "Assign & Notify Candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionPlansPage;
