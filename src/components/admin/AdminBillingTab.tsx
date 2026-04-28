import { useState, useEffect } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { CreditCard, DollarSign, Plus, RefreshCw, Clock, CheckCircle, XCircle, Pause, Play, Ban, History, Pencil, Trash, FileText, ArrowUpRight } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";

interface AdminBillingTabProps {
  candidateId: string;
  onRefresh: () => void;
}

const statusBadgeClass: Record<string, string> = {
  active: "bg-secondary/10 text-secondary",
  trialing: "bg-primary/10 text-primary",
  past_due: "bg-destructive/10 text-destructive",
  grace_period: "bg-destructive/10 text-destructive",
  paused: "bg-muted text-muted-foreground",
  canceled: "bg-muted text-muted-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

const transactionTypeBadge: Record<string, string> = {
  invoice: "bg-blue-500/10 text-blue-600 border-blue-200",
  payment: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

const AdminBillingTab = ({ candidateId, onRefresh }: AdminBillingTabProps) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ plan_id: "", addon_ids: [] as string[] });
  const [saving, setSaving] = useState(false);

  // Record payment
  const [payRef, setPayRef] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [recordingPay, setRecordingPay] = useState(false);

  // Manual Payment recording
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("monthly_service");
  const [payStatus, setPayStatus] = useState("completed");
  const [payNotes, setPayNotes] = useState("");
  const [recordingManual, setRecordingManual] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState("");

  const fetchBilling = async () => {
    try {
      const [subRes, invRes, payRes, planRes, addRes] = await Promise.all([
        billingApi.subscription(candidateId).catch(() => ({ data: null })),
        billingApi.invoices(candidateId).catch(() => ({ data: [] })),
        billingApi.payments(candidateId).catch(() => ({ data: [] })),
        billingApi.listPlans(),
        billingApi.listAddons(),
      ]);
      const hasSub = subRes.data && Object.keys(subRes.data).length > 0;
      setSubscription(hasSub ? subRes.data : null);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setPlans(planRes.data || []);
      setAddons(addRes.data || []);
      
      if (hasSub) {
        setAssignForm({
          plan_id: subRes.data.plan || "",
          addon_ids: subRes.data.addon_assignments?.map((a: any) => a.addon) || []
        });
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchBilling(); }, [candidateId]);

  const handleAssignPlan = async () => {
    if (!assignForm.plan_id) return;
    setSaving(true);
    try {
      await billingApi.assignPlan(candidateId, { plan_id: assignForm.plan_id, addons: assignForm.addon_ids });
      toast({ title: "Plan assigned and candidate notified" });
      setShowAssignModal(false);
      fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRecordPayment = async () => {
    if (!payInvoiceId) { toast({ title: "Select an invoice", variant: "destructive" }); return; }
    setRecordingPay(true);
    try {
      await billingApi.updateInvoice(payInvoiceId, { status: "paid", payment_reference: payRef });
      toast({ title: "Payment recorded" }); setPayRef(""); setPayInvoiceId(""); fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setRecordingPay(false);
  };

  const handleRecordManualPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setRecordingManual(true);
    try {
      await billingApi.recordPayment(candidateId, { 
        amount: Number(payAmount), 
        payment_type: payType, 
        status: payStatus, 
        notes: payNotes 
      });
      setPayAmount(""); setPayNotes("");
      toast({ title: "Manual payment recorded" }); 
      fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setRecordingManual(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await billingApi.deletePayment(paymentId);
      toast({ title: "Payment deleted" });
      fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePayment = async (paymentId: string, currentAmount: string, currentNotes: string) => {
    const amount = prompt("Update Amount ($):", currentAmount);
    if (amount === null) return;
    const notes = prompt("Update Notes:", currentNotes);
    if (notes === null) return;

    try {
      await billingApi.updatePayment(paymentId, { amount: parseFloat(amount), notes });
      toast({ title: "Payment updated" });
      fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAction = async (action: "pause" | "cancel" | "resume") => {
    if (!subscription) return;
    setActionLoading(action);
    try {
      const newStatus = action === "pause" ? "paused" : action === "cancel" ? "canceled" : "active";
      await billingApi.updateSubscription(candidateId, { status: newStatus });
      toast({ title: `Subscription ${action}d` }); fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setActionLoading("");
  };

  // Consolidate Invoices and Standalone Payments
  const invoiceRefs = new Set(invoices.map(i => i.payment_reference).filter(Boolean));
  const standalonePayments = payments.filter(p => {
    const razorpayId = (p.notes || "").match(/Razorpay:\s*(\S+)/)?.[1];
    return !invoiceRefs.has(p.display_id) && !invoiceRefs.has(razorpayId);
  });

  const ledger = [
    ...invoices.map(i => ({
      ...i,
      type: 'invoice',
      date: i.period_start,
      display_type: 'Invoice / Subscription',
      badge_color: transactionTypeBadge.invoice
    })),
    ...standalonePayments.map(p => ({
      ...p,
      type: 'payment',
      date: p.payment_date || p.created_at,
      display_type: p.payment_type?.replace(/_/g, " "),
      badge_color: transactionTypeBadge.payment,
      period_start: p.payment_date || p.created_at,
      period_end: p.payment_date || p.created_at
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) return <p className="text-muted-foreground animate-pulse">Loading billing data...</p>;

  return (
    <div className="space-y-6">
      {/* Subscription Summary */}
      <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Subscription Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {subscription ? (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</p>
                  <Badge className={statusBadgeClass[subscription.status] || ""}>{subscription.status?.replace(/_/g, " ").toUpperCase()}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Base Plan</p>
                  <p className="font-bold text-foreground text-sm">{subscription.plan_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Addons</p>
                  <div className="flex flex-wrap gap-1">
                    {subscription.addon_assignments?.length > 0 ? (
                      subscription.addon_assignments.map((a: any) => (
                        <Badge key={a.id} variant="outline" className="text-[8px] border-none bg-muted px-1.5 h-4">+{a.addon_detail?.name}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Commitment</p>
                  <p className="font-black text-foreground text-lg flex items-center gap-0.5">
                    <DollarSign className="h-4 w-4 opacity-40" />
                    {(Number(subscription.amount) + (subscription.total_addons_amount || 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40">
                <Button variant="hero" size="sm" onClick={() => setShowAssignModal(true)} className="font-bold">
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Modify Plan / Addons
                </Button>
                <Button variant="outline" size="sm" className="font-bold" onClick={() => handleAction(subscription.status === 'active' ? 'pause' : 'resume')} disabled={!!actionLoading}>
                  {subscription.status === 'active' ? <><Pause className="mr-2 h-3.5 w-3.5" /> Pause</> : <><Play className="mr-2 h-3.5 w-3.5" /> Resume</>}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive font-bold hover:bg-destructive/5" onClick={() => handleAction('cancel')} disabled={!!actionLoading}>
                  <Ban className="mr-2 h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No subscription assigned to this candidate.</p>
              <Button variant="hero" onClick={() => setShowAssignModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Assign Subscription Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Payment Section */}
      <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
        <CardHeader className="bg-emerald-500/5 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" /> Manual Payment Intake
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5"><Label className="text-xs font-bold">Amount ($)</Label><Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">Category</Label>
              <Select value={payType} onValueChange={setPayType}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_service">Monthly Service</SelectItem>
                  <SelectItem value="mock_practice">Mock Practice</SelectItem>
                  <SelectItem value="interview_support">Interview Support</SelectItem>
                  <SelectItem value="operations_support">Operations Support</SelectItem>
                  <SelectItem value="manual">Other / Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">Status</Label>
              <Select value={payStatus} onValueChange={setPayStatus}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold">Internal Notes</Label><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ref code, Bank wire info..." className="h-10 rounded-xl" /></div>
          </div>
          <Button variant="hero" onClick={handleRecordManualPayment} disabled={recordingManual || !payAmount} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-tight shadow-lg shadow-emerald-500/20">
            {recordingManual ? "Processing..." : "Record Manual Transaction"}
          </Button>
        </CardContent>
      </Card>

      {/* Unified Financial Ledger */}
      <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Unified Financial Ledger
          </CardTitle>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Combined history of system invoices and manual payments</p>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={ledger}
            isLoading={loading}
            searchKey="display_type"
            searchPlaceholder="Filter by transaction type..."
            emptyMessage="No financial history found."
            columns={[
              {
                header: "Reference",
                className: "pl-6 py-4",
                render: (item: any) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap w-fit tracking-wider">
                      {item.display_id || (item.type === 'invoice' ? `HYRINV-${item.id.slice(0,8)}` : `HYRPAY-${item.id.slice(0,8)}`)}
                    </span>
                    <Badge variant="outline" className={`text-[9px] font-bold h-4 px-1.5 rounded-sm ${item.badge_color} border-none`}>
                      {item.type.toUpperCase()}
                    </Badge>
                  </div>
                )
              },
              {
                header: "Description / Period",
                render: (item: any) => (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground capitalize">{item.display_type}</span>
                    {item.type === 'invoice' && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatDate(item.period_start)} – {formatDate(item.period_end)}
                      </span>
                    )}
                  </div>
                )
              },
              {
                header: "Amount",
                render: (item: any) => (
                  <span className="font-black text-sm flex items-center gap-0.5">
                    <DollarSign className="h-3 w-3 opacity-40" />{Number(item.amount).toLocaleString()}
                  </span>
                )
              },
              {
                header: "Date",
                render: (item: any) => (
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">{formatDate(item.date)}</span>
                    <span className="text-[9px] text-muted-foreground opacity-60">Recorded</span>
                  </div>
                )
              },
              {
                header: "Status",
                render: (item: any) => (
                  <Badge className={`text-[10px] font-bold ${item.status === 'paid' || item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {item.status.toUpperCase()}
                  </Badge>
                )
              },
              {
                header: "Actions",
                className: "pr-6 text-right",
                render: (item: any) => (
                  <div className="flex justify-end gap-1">
                    {item.type === 'payment' && (
                      <>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleUpdatePayment(item.id, item.amount, item.notes)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/5" onClick={() => handleDeletePayment(item.id)}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {item.type === 'invoice' && (
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.alert("Download placeholder")}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>
      {/* Assign Plan Dialog */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Subscription Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Base Plan</Label>
              <Select value={assignForm.plan_id} onValueChange={v => setAssignForm(p => ({ ...p, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan..." /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ${Number(p.amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {addons.length > 0 && (
              <div>
                <Label className="mb-2 block">Optional Addons</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {addons.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5">
                      <input 
                        type="checkbox" 
                        id={`tab-addon-${a.id}`}
                        checked={assignForm.addon_ids.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) setAssignForm(p => ({ ...p, addon_ids: [...p.addon_ids, a.id] }));
                          else setAssignForm(p => ({ ...p, addon_ids: p.addon_ids.filter(id => id !== a.id) }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor={`tab-addon-${a.id}`} className="flex-1 cursor-pointer font-bold text-sm">
                        {a.name} <span className="text-muted-foreground font-normal ml-1">(+${Number(a.amount).toLocaleString()})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleAssignPlan} disabled={saving || !assignForm.plan_id}>
                {saving ? "Processing..." : "Confirm & Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBillingTab;
