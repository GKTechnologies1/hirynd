import { useState, useEffect, useCallback } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { DataTable } from "@/components/ui/DataTable";
import {
  FileText, Loader2, RefreshCw, Download, Info, CreditCard, Package, CheckCircle
} from "lucide-react";

const CandidateBillingPage = ({ candidate }: { candidate: any }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [addons, setAddons]             = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [invoices, setInvoices]         = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!candidate?.id) return;
    setLoading(true);
    try {
      const overviewRes = await billingApi.candidateOverview(candidate.id);
      setSubscription(overviewRes.data?.subscription || null);
      setAddons(overviewRes.data?.addons || []);
      setPurchaseHistory(overviewRes.data?.purchase_history || []);
      setInvoices(overviewRes.data?.invoices || []);
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
      const response = await billingApi.downloadInvoice(invoiceId);
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



  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      {/* Active Subscription Summary Card */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#0d47a1]" />
              <h2 className="text-lg font-bold text-slate-800">Active Subscription</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-slate-400 hover:text-[#0d47a1]" onClick={fetchData}>
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
                <Badge className="bg-emerald-500 text-white border-none shadow-none px-2 py-0 h-5 text-[10px] font-bold uppercase rounded-sm">
                  {subscription.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Plan</p>
                <p className="font-bold text-slate-800">{subscription.plan_name || "Hyrind Subscription"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Amount</p>
                <p className="font-bold text-slate-800">
                  ${Number(subscription.amount).toLocaleString()} <span className="text-slate-400 text-[10px] font-normal">/ {subscription.billing_cycle || "monthly"}</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {subscription.status === "pending_payment" || subscription.status === "past_due" ? "Payment Due Date" : "Next Billing Date"}
                </p>
                <p className="font-bold text-slate-800">{formatDate(subscription.next_billing_at)}</p>
              </div>
            </div>
          )}

          {subscription?.status === "active" && (
            <div className="mt-8 p-4 rounded-lg bg-blue-50/50 border border-blue-100 flex items-start gap-3">
              <div className="h-5 w-5 rounded-full border border-blue-400 flex items-center justify-center text-blue-500 text-[10px] font-bold shrink-0 mt-0.5">i</div>
              <div>
                <p className="text-[11px] font-bold text-blue-900">Subscription Notice</p>
                <p className="text-[11px] text-blue-700 mt-0.5">Your subscription is active. Marketing services are running.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stand-alone Purchased Addons (Purchase History Ledger) */}
      {!loading && purchaseHistory.length > 0 && (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-[#0d47a1]" />
              <h2 className="text-lg font-bold text-slate-800">Purchase History (Add-ons & Services)</h2>
            </div>
            <DataTable
              data={purchaseHistory}
              isLoading={loading}
              searchKey="service_name"
              searchPlaceholder="Search purchased services..."
              emptyMessage="No stand-alone purchases found."
              columns={[
                {
                  header: "Item / Service",
                  render: (ph: any) => (
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-700">{ph.service_name}</p>
                      {ph.invoice_reference && (
                        <p className="text-[9px] text-slate-400 font-mono">Ref: {ph.invoice_reference}</p>
                      )}
                    </div>
                  )
                },
                {
                  header: "Purchase Date",
                  render: (ph: any) => <span className="text-[11px] text-slate-500 font-medium">{formatDate(ph.created_at)}</span>
                },
                {
                  header: "Amount",
                  render: (ph: any) => <span className="text-[11px] text-slate-700 font-bold">${Number(ph.amount).toLocaleString()}</span>
                },
                {
                  header: "Purchased By",
                  render: (ph: any) => (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-semibold">
                      {ph.purchased_by}
                    </span>
                  )
                },
                {
                  header: "Transaction ID",
                  render: (ph: any) => <span className="text-[10px] text-slate-400 font-mono font-semibold">{ph.transaction_id || "—"}</span>
                },
                {
                  header: "Status",
                  render: () => (
                    <Badge className="bg-emerald-500 text-white border-none shadow-none text-[9px] font-bold h-4 px-1.5 rounded-sm uppercase flex items-center gap-1 w-fit">
                      <CheckCircle className="h-2.5 w-2.5" /> Completed
                    </Badge>
                  )
                }
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Payments & Invoice History */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileText className="h-5 w-5 text-slate-400" /> Payments & Invoice History
          </CardTitle>
          <CardDescription className="text-xs">Search for invoices by status (e.g. "paid", "pending").</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <DataTable
            data={invoices}
            isLoading={loading}
            searchKey="status"
            searchPlaceholder="Search invoices by status..."
            columns={[
              {
                header: "Candidate ID",
                render: (inv: any) => (
                  <Badge variant="outline" className="font-mono text-[10px] text-[#0d47a1] bg-blue-50/50 border-blue-200 px-2 py-0.5 font-bold shadow-none">
                    {inv.candidate_display_id || "—"}
                  </Badge>
                )
              },
              {
                header: "Invoice ID",
                render: (inv: any) => (
                  <span className="font-mono font-bold text-blue-600 text-[10px] uppercase hover:underline cursor-pointer">
                    {inv.display_id || `INV-${inv.id.slice(0,8).toUpperCase()}`}
                  </span>
                )
              },
              {
                header: "Description / Period",
                render: (inv: any) => (
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-700 font-sans">{inv.description || "Service Fee"}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(inv.period_start)} — {formatDate(inv.period_end)}</p>
                  </div>
                )
              },
              {
                header: "Amount",
                render: (inv: any) => (
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px] text-slate-700">${Number(inv.amount).toLocaleString()}</p>
                    {inv.tax_amount > 0 && (
                      <p className="text-[9px] text-slate-400 font-medium">Tax: ${Number(inv.tax_amount).toLocaleString()} ({inv.tax_rate}%)</p>
                    )}
                  </div>
                )
              },
              {
                header: "Status",
                render: (inv: any) => (
                  <Badge className="bg-emerald-500 text-white border-none shadow-none text-[9px] font-bold h-4 px-1.5 rounded-sm uppercase">
                    {inv.status}
                  </Badge>
                )
              },
              {
                header: "Paid On",
                render: (inv: any) => <span className="text-[11px] font-medium text-slate-400">{formatDate(inv.paid_at || inv.created_at)}</span>
              },
              {
                header: "Receipt",
                className: "text-right",
                render: (inv: any) => (
                  <Button variant="outline" size="sm" className="h-7 gap-2 text-[10px] font-bold border-slate-200 hover:bg-slate-50 transition-all px-3" onClick={() => downloadInvoice(inv.id)}>
                    <Download className="h-3 w-3" /> PDF
                  </Button>
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
