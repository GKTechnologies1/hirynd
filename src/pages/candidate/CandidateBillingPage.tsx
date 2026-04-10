import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { billingApi } from "@/services/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import {
  DollarSign, FileText, CreditCard, AlertTriangle, CheckCircle,
  Clock, XCircle, Info, Download, RefreshCw, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  candidate: any;
}

const statusColors: Record<string, string> = {
  active:          "bg-green-100 text-green-800 border-green-200",
  trialing:        "bg-blue-100 text-blue-800 border-blue-200",
  past_due:        "bg-red-100 text-red-800 border-red-200",
  pending_payment: "bg-yellow-100 text-yellow-800 border-yellow-200",
  grace_period:    "bg-red-100 text-red-800 border-red-200",
  paused:          "bg-gray-100 text-gray-800 border-gray-200",
  canceled:        "bg-gray-100 text-gray-800 border-gray-200",
  unpaid:          "bg-red-100 text-red-800 border-red-200",
};

const statusHelperText: Record<string, string> = {
  active:          "Your subscription is active. Marketing services are running.",
  pending_payment: "A payment is required to continue services.",
  trialing:        "You are on a trial period. Your first charge will be on your next billing date.",
  past_due:        "Your payment is overdue. Please update your payment method to avoid service disruption.",
  grace_period:    "You are in a grace period. Payment must be received before the grace period ends.",
  paused:          "Your subscription is paused. Marketing services are on hold. Contact support to resume.",
  canceled:        "Your subscription has been cancelled. Contact support to reactivate.",
  unpaid:          "Your subscription has an unpaid balance. Please contact support.",
};

const payTypeLabel = (t: string) =>
  (t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CandidateBillingPage = ({ candidate }: Props) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices,  setInvoices]  = useState<any[]>([]);
  const [payments,  setPayments]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!candidate?.id) return;
    setLoading(true);
    try {
      const { data } = await billingApi.candidateOverview(candidate.id);
      setSubscription(data.subscription || null);
      setInvoices(data.invoices  || []);
      setPayments(data.payments  || []);
    } catch {
      toast({ title: "Failed to load billing overview", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [candidate?.id, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownloadInvoice = async (invoiceId: string) => {
    setDownloading(invoiceId);
    try {
      const response = await billingApi.downloadInvoice(invoiceId);
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `hyrind_invoice_${invoiceId.split("-")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error downloading invoice", variant: "destructive" });
    }
    setDownloading(null);
  };

  const isPendingPayment = subscription &&
    ["past_due", "grace_period", "pending_payment", "unpaid"].includes(subscription.status);

  // Build a unified transaction ledger from invoices + completed payments not already in an invoice
  // (avoids double-counting when an invoice exists for a payment)
  const invoicePaymentRefs = new Set(invoices.map((i: any) => i.payment_reference).filter(Boolean));
  const standalonePayments = payments.filter((p: any) => {
    if (!["completed", "complete", "paid"].includes(p.status)) return false;
    const razorpayId = (p.notes || "").match(/Razorpay:\s*(\S+)/)?.[1];
    if (razorpayId && invoicePaymentRefs.has(razorpayId)) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">

      {/* ── Payment Required Banner ───────────────────────────────────────── */}
      {isPendingPayment && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Payment Required</p>
                <p className="text-sm text-amber-700">
                  Your cycle requires payment. Please complete your payment to avoid marketing disruption.
                </p>
              </div>
            </div>
            <Button asChild variant="hero" className="shrink-0">
              <Link to="/candidate-dashboard/payments">Pay Now →</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {subscription && ["paused", "canceled"].includes(subscription.status) && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-gray-500" />
            <div>
              <p className="font-semibold text-gray-900">
                {subscription.status === "paused" ? "Subscription Paused" : "Subscription Cancelled"}
              </p>
              <p className="text-sm text-gray-600">
                Contact support to resume or reactivate your marketing services.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Subscription Summary ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Active Subscription
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Sync
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : !subscription ? (
            <p className="text-muted-foreground py-4">
              No active subscription. Your admin team will set this up once your roles are confirmed.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={statusColors[subscription.status] || ""}>
                    {subscription.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Plan</p>
                  <p className="font-semibold">{subscription.plan_name || "Marketing Plan"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-xl font-bold">
                    {subscription.currency === "INR" ? "₹" : "$"}
                    {Number(subscription.amount).toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      / {subscription.billing_cycle || "month"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Next Billing Date</p>
                  <p className={`font-semibold ${isPendingPayment ? "text-red-600" : ""}`}>
                    {subscription.next_billing_at
                      ? new Date(subscription.next_billing_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                <Info className="h-5 w-5 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Subscription Notice</p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    {statusHelperText[subscription.status] || "Your subscription is currently being processed."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Invoice History ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              No invoices generated yet. Invoices are created automatically after each payment.
            </p>
          ) : (
            <DataTable
              data={invoices}
              isLoading={loading}
              emptyMessage="No invoices generated yet. Invoices are created automatically after each payment."
              columns={[
                {
                  header: "Description / Period",
                  sortable: true,
                  accessorKey: "period_start",
                  render: (inv: any) => (
                    <div>
                      <div className="text-sm font-semibold">
                        {inv.subscription?.plan_name || "Service Fee"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(inv.period_start)} — {formatDate(inv.period_end)}
                      </div>
                    </div>
                  )
                },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (inv: any) => (
                    <span className="font-semibold">
                      {inv.currency === "INR" ? "₹" : "$"}{Number(inv.amount).toLocaleString()}
                    </span>
                  )
                },
                {
                  header: "Status",
                  sortable: true,
                  accessorKey: "status",
                  render: (inv: any) => (
                    <Badge className={inv.status === "paid" ? "bg-green-100 text-green-800" : inv.status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                      {inv.status.toUpperCase()}
                    </Badge>
                  )
                },
                {
                  header: "Paid On",
                  sortable: true,
                  accessorKey: "paid_at",
                  render: (inv: any) => <span className="text-muted-foreground text-sm">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</span>
                },
                {
                  header: "Receipt",
                  className: "text-right",
                  render: (inv: any) => inv.status === "paid" ? (
                    <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(inv.id)} disabled={downloading === inv.id}>
                      {downloading === inv.id ? (
                        <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Downloading</>
                      ) : (
                        <><Download className="mr-1.5 h-4 w-4" />PDF</>
                      )}
                    </Button>
                  ) : null
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* ── All Payments History (includes admin-recorded charges) ──────────── */}
      {(standalonePayments.length > 0 || (!loading && payments.filter(p => p.status === "completed").length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Payment History
              <span className="text-xs font-normal text-muted-foreground ml-1">(all charges)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={standalonePayments}
              isLoading={loading}
              emptyMessage="No payments found."
              columns={[
                {
                  header: "Type",
                  sortable: true,
                  accessorKey: "payment_type",
                  render: (p: any) => (
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {payTypeLabel(p.payment_type)}
                    </div>
                  )
                },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (p: any) => (
                    <span className="font-semibold">
                      {p.currency === "INR" ? "₹" : "$"}{Number(p.amount).toLocaleString()}
                    </span>
                  )
                },
                {
                  header: "Status",
                  render: (_p: any) => (
                    <Badge className="bg-green-100 text-green-800 text-[10px] font-bold tracking-wider">COMPLETED</Badge>
                  )
                },
                {
                  header: "Date",
                  sortable: true,
                  accessorKey: "created_at",
                  render: (p: any) => (
                    <span className="text-muted-foreground text-sm">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                    </span>
                  )
                },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateBillingPage;
