import { useState, useEffect } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";

import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Plus, RefreshCw, Clock, CheckCircle, XCircle, Pause, Play, Ban, IndianRupee } from "lucide-react";

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
  const [formStatus, setFormStatus] = useState("pending_payment");
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
    try {
      const [subRes, invRes, payRes] = await Promise.all([
        billingApi.subscription(candidateId).catch(() => ({ data: null })),
        billingApi.invoices(candidateId).catch(() => ({ data: [] })),
        billingApi.payments(candidateId).catch(() => ({ data: [] })),
      ]);
      const hasSub = subRes.data && Object.keys(subRes.data).length > 0;
      setSubscription(hasSub ? subRes.data : null);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      if (hasSub) {
        setFormAmount(String(subRes.data.amount));
        setFormStatus(subRes.data.status);
        setFormGraceDays(String(subRes.data.grace_days || 5));
        setFormPlanName(subRes.data.plan_name || "Monthly Marketing");
        if (subRes.data.next_billing_at) {
          setFormNextDate(new Date(subRes.data.next_billing_at).toISOString().split("T")[0]);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchBilling(); }, [candidateId]);

  const handleCreateOrUpdate = async () => {
    if (!formAmount || Number(formAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setSaving(true);
    setSaving(true);
    try {
      const payload = {
        amount: Number(formAmount),
        next_billing_at: formNextDate || undefined,
        grace_days: Number(formGraceDays),
        status: formStatus,
        plan_name: formPlanName,
      };
      if (subscription) {
        await billingApi.updateSubscription(candidateId, payload);
      } else {
        await billingApi.createSubscription(candidateId, payload);
      }
      toast({ title: subscription ? "Subscription updated" : "Subscription created" });
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

  const handleMarkFailed = async () => {
    if (!failInvoiceId) { toast({ title: "Select an invoice", variant: "destructive" }); return; }
    setMarkingFailed(true);
    try {
      await billingApi.updateInvoice(failInvoiceId, { status: "failed", failure_reason: failReason || "Payment failed" });
      toast({ title: "Invoice marked failed" }); setFailInvoiceId(""); setFailReason(""); fetchBilling(); onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setMarkingFailed(false);
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

  const handleBillingCheck = async () => {
    toast({ title: "Feature not available", description: "Automated billing checks are not supported in this environment.", variant: "destructive" });
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
                <Badge className={statusBadgeClass[subscription.status] || ""}>{subscription.status?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-bold text-card-foreground flex items-center gap-0.5"><IndianRupee className="h-3.5 w-3.5" />{Number(subscription.amount).toLocaleString()}/mo</p>
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
            <div><Label>Monthly Amount (₹) *</Label><Input type="number" min="1" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="499" /></div>
            <div><Label>Next Charge Date</Label><Input type="date" value={formNextDate} onChange={e => setFormNextDate(e.target.value)} /></div>
            <div><Label>Grace Days</Label><Input type="number" min="1" max="30" value={formGraceDays} onChange={e => setFormGraceDays(e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending_payment","active","trialing","unpaid","past_due","grace_period","paused","canceled"].map(s => (
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
                        ₹{Number(inv.amount).toLocaleString()} — {new Date(inv.period_start).toLocaleDateString()} to {new Date(inv.period_end).toLocaleDateString()}
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
                        ₹{Number(inv.amount).toLocaleString()} — {new Date(inv.period_start).toLocaleDateString()} to {new Date(inv.period_end).toLocaleDateString()}
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
        <CardContent className="p-0">
          <DataTable
            data={invoices}
            isLoading={loading}
            searchPlaceholder="Search invoices..."
            searchKey="status"
            emptyMessage="No invoices yet."
            columns={[
              { 
                header: "Period", 
                render: (inv: any) => <span className="text-sm pl-6">{new Date(inv.period_start).toLocaleDateString()} – {new Date(inv.period_end).toLocaleDateString()}</span>
              },
              { 
                header: "Amount", 
                render: (inv: any) => (
                  <span className="font-medium flex items-center gap-0.5 text-sm">
                    <IndianRupee className="h-3.5 w-3.5" />{Number(inv.amount).toLocaleString()}
                  </span>
                )
              },
              { 
                header: "Status", 
                render: (inv: any) => <Badge className={invoiceStatusBadge[inv.status] || ""}>{inv.status.toUpperCase()}</Badge>
              },
              { 
                header: "Paid At", 
                render: (inv: any) => <span className="text-sm">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</span>
              },
              { 
                header: "Reference", 
                render: (inv: any) => <span className="text-sm text-muted-foreground pr-6">{inv.payment_reference || "—"}</span>
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Payment History (legacy) */}
      {payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment Records</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={payments}
              isLoading={loading}
              searchPlaceholder="Search payments..."
              searchKey="payment_status"
              emptyMessage="No records yet."
              columns={[
                { 
                  header: "Date", 
                  render: (p: any) => <span className="text-sm pl-6">{new Date(p.created_at).toLocaleDateString()}</span>
                },
                { 
                  header: "Amount", 
                  render: (p: any) => (
                    <span className="font-medium flex items-center gap-0.5 text-sm">
                      <IndianRupee className="h-3.5 w-3.5" />{Number(p.amount).toLocaleString()}
                    </span>
                  )
                },
                { 
                  header: "Status", 
                  render: (p: any) => (
                    <div className="flex items-center gap-1.5">
                      {p.payment_status === "success" ? <CheckCircle className="h-3.5 w-3.5 text-secondary" /> :
                       p.payment_status === "failed" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                       <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="capitalize text-sm">{p.payment_status}</span>
                    </div>
                  )
                },
                { 
                  header: "Method", 
                  render: (p: any) => <span className="capitalize text-sm text-muted-foreground pr-6">{p.payment_method}</span>
                }
              ]}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default AdminBillingTab;
