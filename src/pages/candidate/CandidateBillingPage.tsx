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
  Clock, XCircle, Info, Download, RefreshCw, Loader2, ArrowUpRight, History
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

const transactionTypeBadge: Record<string, string> = {
  invoice: "bg-blue-500/10 text-blue-600 border-blue-200",
  payment: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
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

  const ledger = invoices.map(i => ({
    ...i,
    type: 'invoice',
    date: i.period_start || i.created_at,
    display_type: 'Invoice / Subscription',
    badge_color: transactionTypeBadge.invoice
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isPendingPayment = subscription &&
    ["past_due", "grace_period", "pending_payment", "unpaid"].includes(subscription.status);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Billing & Financials</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage your subscriptions, invoices, and transaction history.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading} className="rounded-2xl h-12 px-6 font-bold border-border/60 hover:bg-muted/50">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh Data
        </Button>
      </div>

      {/* ── Status Banners ───────────────────────────────────────── */}
      {isPendingPayment && (
        <Card className="border-none shadow-xl shadow-amber-500/10 bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-l-amber-500 rounded-[2rem] overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-[1.25rem] bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-900 tracking-tight">Immediate Payment Required</h3>
                <p className="text-amber-700/80 font-medium max-w-md">
                  Your subscription cycle has ended or a payment attempt failed. Please complete the transaction to maintain active marketing status.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="h-14 px-10 rounded-[1.25rem] bg-amber-600 hover:bg-amber-700 text-white font-black tracking-tight shadow-lg shadow-amber-500/30 shrink-0">
              <Link to="/candidate-dashboard/payments">Pay Balance Now →</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Subscription Summary Card ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border/40 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/20 px-8 py-6">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              Active Subscription Detail
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Synchronizing ledger...</p>
              </div>
            ) : !subscription ? (
              <div className="py-8 text-center space-y-3">
                <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto">
                  <Ban className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                  No active subscription found. Contact your account manager to activate your marketing plan.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Status</p>
                    <Badge className={`${statusColors[subscription.status]} rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wider`}>
                      {subscription.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Plan Name</p>
                    <p className="font-bold text-foreground text-lg tracking-tighter">{subscription.plan_name || "Growth Marketing Plan"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Investment</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-black text-foreground">${Number(subscription.amount).toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">/{subscription.billing_cycle || "mo"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Next Cycle</p>
                    <p className={`font-black text-lg tracking-tighter ${isPendingPayment ? "text-destructive" : "text-secondary"}`}>
                      {subscription.next_billing_at ? formatDate(subscription.next_billing_at) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-[1.5rem] bg-primary/5 p-6 border border-primary/10">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Info className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-primary tracking-tight">Marketing Status Update</p>
                    <p className="text-sm text-primary/80 font-medium">
                      {subscription.status === 'active' 
                        ? "Your subscription is currently active and all marketing automation services are running at full capacity."
                        : "Your services are currently limited. Please review the status banner at the top of the page for details."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="border-none shadow-sm ring-1 ring-border/40 rounded-[2rem] bg-card text-foreground">
          <CardHeader className="px-8 py-6 border-b border-border/20 bg-muted/30">
            <CardTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="p-6 rounded-[1.5rem] bg-muted/30 border border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Card on File</p>
                  <p className="font-bold text-foreground tracking-tight">Ending in •••• 4242</p>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Primary</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
              We process all subscription renewals automatically using your primary payment method. All transactions are securely handled via Razorpay.
            </p>
            <Button asChild variant="default" className="w-full h-12 rounded-2xl font-black tracking-tight shadow-md">
              <Link to="/candidate-dashboard/payments">Update Billing Info</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Unified Financial Ledger ────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm ring-1 ring-border/40 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/20 px-8 py-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </div>
              Financial Ledger & Receipts
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-6 px-3 rounded-full text-[9px] font-black uppercase tracking-[0.1em] text-primary border-primary/20 bg-primary/5">
                {ledger.length} Records Found
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={ledger}
            isLoading={loading}
            emptyMessage="No financial history found. Your transaction ledger will populate once your first payment is processed."
            columns={[
              {
                header: "Invoice Reference",
                className: "pl-8 py-6",
                render: (item: any) => (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-md uppercase whitespace-nowrap w-fit tracking-wider border border-primary/20">
                      {item.display_id}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-black h-5 px-2 rounded-md bg-muted text-muted-foreground border-none shadow-sm">
                        INVOICE
                      </Badge>
                      {item.status === 'paid' ? (
                        <div className="h-4 w-4 bg-green-500/20 rounded-full flex items-center justify-center text-green-600">
                          <CheckCircle className="h-2.5 w-2.5" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-600">
                          <Clock className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              },
              {
                header: "Subscription Period",
                render: (item: any) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-foreground tracking-tight">{item.plan_name || "Platform Subscription"}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                      <Clock className="h-3 w-3" /> {item.period_start ? formatDate(item.period_start) : "—"} to {item.period_end ? formatDate(item.period_end) : "—"}
                    </div>
                  </div>
                )
              },
              {
                header: "Amount",
                render: (item: any) => (
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-foreground tracking-tighter flex items-center">
                      <DollarSign className="h-3.5 w-3.5 opacity-30" />{Number(item.amount).toLocaleString()}
                    </span>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">USD Currency</span>
                  </div>
                )
              },
              {
                header: "Payment Status",
                render: (item: any) => (
                  <div className="flex flex-col gap-1 items-start">
                     <Badge variant="outline" className={`text-[10px] font-black px-2 py-0.5 ${item.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-amber-500/10 text-amber-600 border-amber-200'}`}>
                        {item.status.toUpperCase()}
                     </Badge>
                     <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                        {item.paid_at ? `Paid on ${formatDate(item.paid_at)}` : "Awaiting Payment"}
                     </span>
                  </div>
                )
              },
              {
                header: "Official Receipt",
                className: "pr-8 text-right",
                render: (item: any) => (
                  <div className="flex justify-end items-center gap-3">
                    {item.status === 'paid' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-10 px-4 rounded-xl font-black tracking-tight shadow-md"
                        onClick={() => handleDownloadInvoice(item.id)}
                        disabled={downloading === item.id}
                      >
                        {downloading === item.id ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
                        ) : (
                          <><Download className="mr-2 h-4 w-4" /> Download PDF</>
                        )}
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateBillingPage;
