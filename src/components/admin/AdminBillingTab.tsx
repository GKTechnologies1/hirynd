import { useState, useEffect } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Plus, RefreshCw, CheckCircle, XCircle, Clock, Pause, Play, Ban } from "lucide-react";

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

  const [formAmount, setFormAmount] = useState("");
  const [formNextDate, setFormNextDate] = useState("");
  const [formGraceDays, setFormGraceDays] = useState("5");
  const [formStatus, setFormStatus] = useState("active");
  const [formPlanName, setFormPlanName] = useState("Monthly Marketing");
  const [saving, setSaving] = useState(false);

  const [payRef, setPayRef] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [recordingPay, setRecordingPay] = useState(false);

  const [failInvoiceId, setFailInvoiceId] = useState("");
  const [failReason, setFailReason] = useState("");
  const [markingFailed, setMarkingFailed] = useState(false);

  const [actionLoading, setActionLoading] = useState("");

  const fetchBilling = async () => {
    try {
      const [subRes, invRes, payRes] = await Promise.all([
        billingApi.subscription(candidateId).catch(() => ({ data: null })),
        billingApi.invoices(candidateId).catch(() => ({ data: [] })),
        billingApi.payments(candidateId).catch(() => ({ data: [] })),
      ]);
      const sub = subRes.data;
      setSubscription(sub && sub.id ? sub : null);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      if (sub && sub.id) {
        setFormAmount(String(sub.amount));
        setFormStatus(sub.status);
        setFormGraceDays(String(sub.grace_days || 5));
        setFormPlanName(sub.plan_name || "Monthly Marketing");
        if (sub.next_billing_at) setFormNextDate(new Date(sub.next_billing_at).toISOString().split("T")[0]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchBilling(); }, [candidateId]);

  const handleCreateOrUpdate = async () => {
    if (!formAmount || Number(formAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const data = {
        amount: Number(formAmount),
        next_billing_at: formNextDate || undefined,
        grace_days: Number(formGraceDays),
        status: formStatus,
        plan_name: formPlanName,
      };
      if (subscription) {
        await billingApi.updateSubscription(candidateId, data);
      } else {
        await billingApi.createSubscription(candidateId, data);
      }
      toast({ title: subscription ? "Subscription updated" : "Subscription created" });
      fetchBilling();
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRecordPayment = async () => {
    if (!payInvoiceId) { toast({ title: "Select an invoice", variant: "destructive" }); return; }
    setRecordingPay(true);
    try {
      await billingApi.recordInvoicePayment(payInvoiceId, { payment_reference: payRef });
      toast({ title: "Payment recorded" });
      setPayRef(""); setPayInvoiceId("");
      fetchBilling(); onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
    setRecordingPay(false);
  };

  const handleMarkFailed = async () => {
    if (!failInvoiceId) { toast({ title: "Select an invoice", variant: "destructive" }); return; }
    setMarkingFailed(true);
    try {
      await billingApi.markInvoiceFailed(failInvoiceId, { reason: failReason || "Payment failed" });
      toast({ title: "Invoice marked failed" });
      setFailInvoiceId(""); setFailReason("");
      fetchBilling(); onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
    setMarkingFailed(false);
  };

  const handleAction = async (action: "pause" | "cancel" | "resume") => {
    if (!subscription) return;
    setActionLoading(action);
    try {
      if (action === "pause") await billingApi.pauseSubscription(candidateId);
      else if (action === "resume") await billingApi.resumeSubscription(candidateId);
      else await billingApi.cancelSubscription(candidateId);
      toast({ title: `Subscription ${action}d` });
      fetchBilling(); onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
    setActionLoading("");
  };

  if (loading) return <p className="text-muted-foreground">Loading billing...</p>;

  const pendingInvoices = invoices.filter((i: any) => i.status === "scheduled");

  return (
    <div className="space-y-4">
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
                <Badge className={statusBadgeClass[subscription.status] || ""}>{(subscription.status || "").replace(/_/g, " ").toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-bold text-card-foreground">₹{Number(subscription.amount).toLocaleString()}/mo</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Charge</p>
                <p className="text-card-foreground">{subscription.next_billing_at ? new Date(subscription.next_billing_at).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Attempts</p>
                <p className="text-card-foreground">{subscription.failed_attempts || 0}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>Plan Name</Label><Input value={formPlanName} onChange={e => setFormPlanName(e.target.value)} /></div>
            <div><Label>Monthly Amount (₹) *</Label><Input type="number" min="1" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="499" /></div>
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
              <Button variant="outline" onClick={() => handleAction("pause")} disabled={!!actionLoading}><Pause className="mr-2 h-4 w-4" /> Pause</Button>
            )}
            {subscription && ["paused","past_due","grace_period"].includes(subscription.status) && (
              <Button variant="outline" onClick={() => handleAction("resume")} disabled={!!actionLoading}><Play className="mr-2 h-4 w-4" /> Resume</Button>
            )}
            {subscription && subscription.status !== "canceled" && (
              <Button variant="destructive" onClick={() => handleAction("cancel")} disabled={!!actionLoading}><Ban className="mr-2 h-4 w-4" /> Cancel</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {subscription && pendingInvoices.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Invoice Payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Invoice *</Label>
                <Select value={payInvoiceId} onValueChange={setPayInvoiceId}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {pendingInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>₹{Number(inv.amount).toLocaleString()} — {new Date(inv.period_start).toLocaleDateString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payment Reference</Label><Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. TXN-12345" /></div>
            </div>
            <Button variant="hero" onClick={handleRecordPayment} disabled={recordingPay || !payInvoiceId}>{recordingPay ? "Recording..." : "Record Payment"}</Button>
          </CardContent>
        </Card>
      )}

      {subscription && pendingInvoices.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5" /> Mark Invoice Failed</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Invoice *</Label>
                <Select value={failInvoiceId} onValueChange={setFailInvoiceId}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {pendingInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>₹{Number(inv.amount).toLocaleString()} — {new Date(inv.period_start).toLocaleDateString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Failure Reason</Label><Input value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="e.g. Card declined" /></div>
            </div>
            <Button variant="destructive" onClick={handleMarkFailed} disabled={markingFailed || !failInvoiceId}>{markingFailed ? "Marking..." : "Mark Failed"}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? <p className="text-muted-foreground">No invoices yet.</p> : (
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
                    <TableCell className="font-medium">₹{Number(inv.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className={invoiceStatusBadge[inv.status] || ""}>{(inv.status || "").toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-sm">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.payment_reference || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                    <TableCell className="font-medium">₹{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {p.payment_status === "success" ? <CheckCircle className="h-3.5 w-3.5 text-secondary" /> :
                         p.payment_status === "failed" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                         <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="capitalize text-sm">{p.payment_status || p.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm text-muted-foreground">{p.payment_method || "—"}</TableCell>
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
