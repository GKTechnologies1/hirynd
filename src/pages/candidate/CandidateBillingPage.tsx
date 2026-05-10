import { useState, useEffect, useCallback } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { DataTable } from "@/components/ui/DataTable";
import {
  FileText, Loader2, RefreshCw, Download, Info, CreditCard, DollarSign
} from "lucide-react";

const CandidateBillingPage = ({ candidate }: { candidate: any }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!candidate?.id) return;
    setLoading(true);
    try {
      const [subRes, invRes, payRes] = await Promise.all([
        billingApi.subscription(candidate.id),
        billingApi.invoices(candidate.id),
        billingApi.payments(candidate.id)
      ]);
      setSubscription(subRes.data?.id ? subRes.data : null);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
    } catch (err) {
      console.error("Failed to fetch billing data", err);
    }
    setLoading(false);
  }, [candidate?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const response = await billingApi.downloadInvoice(candidate.id, invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoiceId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  // Filter out payments that are already represented by an invoice to remove redundancy
  const invoicePaymentRefs = new Set(invoices.map((i: any) => i.payment_reference).filter(Boolean));
  const standalonePayments = payments.filter((p: any) => {
    if (!["completed", "complete", "paid"].includes(p.status)) return false;
    
    // Check direct ID
    if (p.razorpay_payment_id && invoicePaymentRefs.has(p.razorpay_payment_id)) return false;
    
    // Fallback to notes parsing
    const razorpayId = (p.notes || "").match(/Razorpay:\s*(\S+)/)?.[1];
    if (razorpayId && invoicePaymentRefs.has(razorpayId)) return false;
    
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      {/* Active Subscription Summary Card */}
      <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0d47a1]/5 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#0d47a1]" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Active Subscription</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400 hover:text-[#0d47a1]" onClick={fetchData}>
              <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Sync
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
          ) : !subscription ? (
            <div className="text-center py-6 text-slate-400 italic">No active subscription found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Status</p>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none px-2 py-0 h-5 text-[10px] font-black uppercase">
                  {subscription.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Plan</p>
                <p className="font-bold text-slate-700">{subscription.plan_name || "Hyrind Subscription"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Amount</p>
                <p className="font-bold text-slate-700">
                  ${Number(subscription.amount).toLocaleString()}
                  <span className="text-slate-400 text-xs font-medium">/monthly</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Next Billing Date</p>
                <p className="font-bold text-slate-700">{formatDate(subscription.next_billing_at)}</p>
              </div>
            </div>
          )}

          {subscription?.status === "active" && (
            <div className="mt-8 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">Subscription Notice</p>
                <p className="text-xs text-blue-700/80 mt-1">Your subscription is active. Marketing services are running.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileText className="h-5 w-5 text-slate-400" /> Invoice History
          </CardTitle>
          <CardDescription>View and download your official tax invoices.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <DataTable
            data={invoices}
            columns={[
              {
                header: "Invoice ID",
                render: (inv: any) => (
                  <span className="font-mono font-bold text-blue-600 text-[11px] uppercase tracking-tight">
                    {inv.display_id || `INV-${inv.id.slice(0,8).toUpperCase()}`}
                  </span>
                )
              },
              {
                header: "Description / Period",
                render: (inv: any) => (
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700">{inv.subscription?.plan_name || "Service Fee"}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(inv.period_start)} — {formatDate(inv.period_end)}</p>
                  </div>
                )
              },
              {
                header: "Amount",
                render: (inv: any) => <span className="font-bold text-xs text-slate-700">${Number(inv.amount).toLocaleString()}</span>
              },
              {
                header: "Status",
                render: (inv: any) => (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none text-[10px] font-black h-5 uppercase">
                    {inv.status}
                  </Badge>
                )
              },
              {
                header: "Paid On",
                render: (inv: any) => <span className="text-xs font-medium text-slate-400">{formatDate(inv.paid_at || inv.created_at)}</span>
              },
              {
                header: "Receipt",
                className: "text-right",
                render: (inv: any) => (
                  <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-[11px] border-slate-200 hover:border-[#0d47a1] hover:text-[#0d47a1] transition-all" onClick={() => downloadInvoice(inv.id)}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Payment History (Restored and Renamed to only show standalone payments) */}
      {standalonePayments.length > 0 && (
        <Card className="border-none shadow-md overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <DollarSign className="h-5 w-5 text-slate-400" /> Payment History
            </CardTitle>
            <CardDescription>Records of standalone and manual payments.</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <DataTable
              data={standalonePayments}
              columns={[
                {
                  header: "Payment ID",
                  render: (p: any) => (
                    <span className="font-mono font-bold text-slate-500 text-[11px] uppercase tracking-tight">
                      {p.display_id || `PAY-${p.id.slice(0,8).toUpperCase()}`}
                    </span>
                  )
                },
                {
                  header: "Type",
                  render: (p: any) => <span className="text-xs font-bold text-slate-700 capitalize">{(p.payment_type || "").replace(/_/g, " ")}</span>
                },
                {
                  header: "Amount",
                  render: (p: any) => <span className="font-bold text-xs text-slate-700">${Number(p.amount).toLocaleString()}</span>
                },
                {
                  header: "Status",
                  render: (p: any) => (
                    <Badge variant="outline" className="text-[10px] font-black border-slate-200 text-emerald-600 bg-emerald-50/50 shadow-none h-5 uppercase">
                      {p.status}
                    </Badge>
                  )
                },
                {
                  header: "Date",
                  className: "text-right",
                  render: (p: any) => <span className="text-xs font-medium text-slate-400">{formatDate(p.payment_date || p.created_at)}</span>
                }
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateBillingPage;
