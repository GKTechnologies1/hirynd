import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Plus, RefreshCw, Clock, CheckCircle, XCircle, Pause, Play, Ban } from "lucide-react";

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

const invoiceStatusBadge: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  paid: "bg-secondary/10 text-secondary",
  failed: "bg-destructive/10 text-destructive",
  waived: "bg-muted text-muted-foreground",
};

const AdminBillingTab = ({ candidateId, onRefresh }: AdminBillingTabProps) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/update form
  const [formAmount, setFormAmount] = useState("");
  const [formNextDate, setFormNextDate] = useState("");
  const [formGraceDays, setFormGraceDays] = useState("5");
  const [formStatus, setFormStatus] = useState("active");
  const [formPlanName, setFormPlanName] = useState("Monthly Marketing");
  const [saving, setSaving] = useState(false);

  // Record payment
  const [payRef, setPayRef] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [recordingPay, setRecordingPay] = useState(false);

  // Mark failed
  const [failInvoiceId, setFailInvoiceId] = useState("");
  const [failReason, setFailReason] = useState("");
  const [markingFailed, setMarkingFailed] = useState(false);

  // Pause/cancel/resume
  const [actionLoading, setActionLoading] = useState("");

  const fetchBilling = async () => {
    const [subRes, invRes, payRes] = await Promise.all([
      supabase.from("candidate_subscriptions").select("*").eq("candidate_id", candidateId).maybeSingle(),
      supabase.from("subscription_invoices").select("*").eq("candidate_id", candidateId).order("period_start", { ascending: false }),
      supabase.from("subscription_payments").select("*").eq("candidate_id", candidateId).order("created_at", { ascending: false }),
    ]);
    setSubscription(subRes.data);
    setInvoices(invRes.data || []);
    setPayments(payRes.data || []);
    if (subRes.data) {
      setFormAmount(String(subRes.data.amount));
      setFormStatus(subRes.data.status);
      setFormGraceDays(String(subRes.data.grace_days || 5));
      setFormPlanName(subRes.data.plan_name || "Monthly Marketing");
      if (subRes.data.next_billing_at) {
        setFormNextDate(new Date(subRes.data.next_billing_at).toISOString().split("T")[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchBilling(); }, [candidateId]);

  const handleCreateOrUpdate = async () => {
    if (!formAmount || Number(formAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.rpc("admin_create_or_update_subscription", {
      _candidate_id: candidateId,
      _amount: Number(formAmount),
      _next_charge_date: formNextDate || undefined,
      _grace_days: Number(formGraceDays),
      _status: formStatus,
      _plan_name: formPlanName,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: subscription ? "Subscription updated" : "Subscription created" }); fetchBilling(); onRefresh(); }
    setSaving(false);
  };

  const handleRecordPayment = async () => {
    if (!payInvoiceId) { toast({ title: "Select an invoice", variant: "destructive" }); return; }
    setRecordingPay(true);
    const { error } = await supabase.rpc("admin_record_invoice_payment", {
      _invoice_id: payInvoiceId,
      _payment_reference: payRef,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Payment recorded" }); setPayRef(""); setPayInvoiceId(""); fetchBilling(); onRefresh(); }
    setRecordingPay(false);
  };

  const handleMarkFailed = async () => {
    if (!failInvoiceId) { toast({ title: "Select an invoice", variant: "destructive" }); return; }
    setMarkingFailed(true);
    const { error } = await supabase.rpc("admin_mark_invoice_failed", {
      _invoice_id: failInvoiceId,
      _reason: failReason || "Payment failed",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Invoice marked failed" }); setFailInvoiceId(""); setFailReason(""); fetchBilling(); onRefresh(); }
    setMarkingFailed(false);
  };

  const handleAction = async (action: "pause" | "cancel" | "resume") => {
    if (!subscription) return;
    setActionLoading(action);
    const { error } = await supabase.rpc("admin_pause_or_cancel_subscription", {
      _subscription_id: subscription.id,
      _action: action,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Subscription ${action}d` }); fetchBilling(); onRefresh(); }
    setActionLoading("");
  };

  const handleBillingCheck = async () => {
    setActionLoading("check");
    const { data, error } = await supabase.rpc("run_billing_checks", { _dry_run: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      const r = data as any;
      toast({ title: "Billing check complete", description: `Grace expired: ${r?.expired_grace_paused || 0}, Overdue invoices: ${r?.overdue_invoices_created || 0}, Reminders: ${r?.upcoming_reminders || 0}` });
      fetchBilling(); onRefresh();
    }
    setActionLoading("");
  };

  if (loading) return <p className="text-muted-foreground">Loading billing...</p>;

  const pendingInvoices = invoices.filter((i: any) => i.status === "scheduled");

  return (
    <div className="space-y-4">
      {/* Run Billing Checks */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleBillingCheck} disabled={actionLoading === "check"}>
          <RefreshCw className={`mr-2 h-4 w-4 ${actionLoading === "check" ? "animate-spin" : ""}`} />
          {actionLoading === "check" ? "Running..." : "Run Billing Checks"}
        </Button>
      </div>

      {/* Create / Update Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {subscription ? <CreditCard className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {subscription ? "Subscription" : "Create Subscription"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4 pb-4 border-b border-border">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusBadgeClass[subscription.status] || ""}>{subscription.status.replace(/_/g, " ").toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-bold text-card-foreground">${Number(subscription.amount).toLocaleString()}/mo</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Charge</p>
                <p className="text-card-foreground">{subscription.next_billing_at ? new Date(subscription.next_billing_at).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Attempts</p>
                <p className="text-card-foreground">{subscription.failed_attempts || 0}</p>
              </div>
              {subscription.grace_period_ends_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Grace Period Ends</p>
                  <p className="text-destructive font-semibold">{new Date(subscription.grace_period_ends_at).toLocaleDateString()}</p>
                </div>
              )}
              {subscription.last_payment_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Payment</p>
                  <p className="text-card-foreground">{new Date(subscription.last_payment_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>Plan Name</Label><Input value={formPlanName} onChange={e => setFormPlanName(e.target.value)} /></div>
            <div><Label>Monthly Amount ($) *</Label><Input type="number" min="1" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="499" /></div>
            <div><Label>Next Charge Date</Label><Input type="date" value={formNextDate} onChange={e => setFormNextDate(e.target.value)} /></div>
            <div><Label>Grace Days</Label><Input type="number" min="1" max="30" value={formGraceDays} onChange={e => setFormGraceDays(e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active","trialing","past_due","grace_period","paused","canceled"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="hero" onClick={handleCreateOrUpdate} disabled={saving}>
              {saving ? "Saving..." : subscription ? "Update Subscription" : "Create Subscription"}
            </Button>
            {subscription && subscription.status === "active" && (
              <Button variant="outline" onClick={() => handleAction("pause")} disabled={!!actionLoading}>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </Button>
            )}
            {subscription && ["paused","past_due","grace_period"].includes(subscription.status) && (
              <Button variant="outline" onClick={() => handleAction("resume")} disabled={!!actionLoading}>
                <Play className="mr-2 h-4 w-4" /> Resume
              </Button>
            )}
            {subscription && subscription.status !== "canceled" && (
              <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={!!actionLoading}>
                <Ban className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Invoice Payment */}
      {subscription && pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Invoice Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Invoice *</Label>
                <Select value={payInvoiceId} onValueChange={setPayInvoiceId}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {pendingInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        ${Number(inv.amount).toLocaleString()} — {new Date(inv.period_start).toLocaleDateString()} to {new Date(inv.period_end).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payment Reference</Label><Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. TXN-12345" /></div>
            </div>
            <Button variant="hero" onClick={handleRecordPayment} disabled={recordingPay || !payInvoiceId}>
              {recordingPay ? "Recording..." : "Record Payment"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mark Invoice Failed */}
      {subscription && pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5" /> Mark Invoice Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Invoice *</Label>
                <Select value={failInvoiceId} onValueChange={setFailInvoiceId}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {pendingInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        ${Number(inv.amount).toLocaleString()} — {new Date(inv.period_start).toLocaleDateString()} to {new Date(inv.period_end).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Failure Reason</Label><Input value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="e.g. Card declined" /></div>
            </div>
            <Button variant="destructive" onClick={handleMarkFailed} disabled={markingFailed || !failInvoiceId}>
              {markingFailed ? "Marking..." : "Mark Failed"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{new Date(inv.period_start).toLocaleDateString()} – {new Date(inv.period_end).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">${Number(inv.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className={invoiceStatusBadge[inv.status] || ""}>{inv.status.toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-sm">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.payment_reference || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History (legacy) */}
      {payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment Records</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">${Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {p.payment_status === "success" ? <CheckCircle className="h-3.5 w-3.5 text-secondary" /> :
                         p.payment_status === "failed" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                         <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="capitalize text-sm">{p.payment_status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm text-muted-foreground">{p.payment_method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBillingTab;
