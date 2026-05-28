import { useState, useEffect, useCallback } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  DollarSign, FileText, CheckCircle, XCircle, Clock,
  Package, CreditCard, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Zap,
} from "lucide-react";

declare global {
  interface Window { Razorpay: any; }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const openRazorpay = async (
  orderData: any,
  candidateId: string,
  toast: any,
  onSuccess: () => void,
) => {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    toast({ title: "Could not load payment gateway", variant: "destructive" });
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const rzp = new window.Razorpay({
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Hyrind",
      description: orderData.description,
      order_id: orderData.order_id,
      prefill: orderData.prefill,
      theme: { color: "#0f172a" }, // Dark slate premium theme
      handler: async (response: any) => {
        try {
          const verifyData: Record<string, any> = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            internal_order_id: orderData.internal_order_id,
          };
          if (orderData.billing_payment_id) {
            await billingApi.verifyIndividualPayment(candidateId, orderData.billing_payment_id, verifyData);
          } else {
            await billingApi.verifyPayment(candidateId, verifyData);
          }
          toast({ title: "✅ Payment successful!", description: "Thank you! Your payment is confirmed." });
          onSuccess();
          resolve(true);
        } catch (err: any) {
          toast({ title: "Verification failed", description: err.response?.data?.error || err.message, variant: "destructive" });
          resolve(false);
        }
      },
      modal: {
        ondismiss: () => {
          toast({ title: "Payment cancelled" });
          resolve(false);
        },
      },
    });
    rzp.on("payment.failed", (resp: any) => {
      toast({ title: "Payment failed", description: resp.error.description, variant: "destructive" });
      resolve(false);
    });
    rzp.open();
  });
};

const statusIcon = (s: string) => {
  if (s === "completed" || s === "paid") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (s === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
};

const cleanNotes = (notes: string) => {
  if (!notes) return "";
  let cleaned = notes
    .replace(/(?:\s*\|\s*|\s*-\s*|\s*,\s*|^|\b)Razorpay\s*(?:payment|:)?\s*[a-zA-Z0-9_]+/gi, "")
    .trim();
  // Remove dangling separators
  cleaned = cleaned.replace(/^[|,\-\s]+|[|,\-\s]+$/g, "").trim();
  return cleaned;
};

const CandidatePaymentsPage = ({ candidate, onStatusChange }: { candidate: any, onStatusChange?: () => void }) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [addons, setAddons]             = useState<any[]>([]);
  const [payments, setPayments]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [payingSubscription, setPayingSubscription] = useState(false);
  const [payingId, setPayingId]         = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!candidate?.id) return;
    setLoading(true);
    try {
      const overviewRes = await billingApi.candidateOverview(candidate.id);
      setSubscription(overviewRes.data?.subscription || null);
      setAddons(overviewRes.data?.addons || []);
      setPayments(overviewRes.data?.payments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [candidate?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePaySubscription = async () => {
    if (!candidate?.id) return;
    setPayingSubscription(true);
    try {
      const { data: orderData } = await billingApi.createOrder(candidate.id);
      await openRazorpay(orderData, candidate.id, toast, () => {
        fetchData();
        onStatusChange?.();
      });
    } catch (err: any) {
      toast({ title: "Could not initiate payment", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setPayingSubscription(false);
    }
  };

  const handlePayIndividual = async (paymentId: string) => {
    if (!candidate?.id) return;
    setPayingId(paymentId);
    try {
      const { data: orderData } = await billingApi.initiatePayment(candidate.id, paymentId);
      await openRazorpay(orderData, candidate.id, toast, () => {
        fetchData();
        onStatusChange?.();
      });
    } catch (err: any) {
      toast({ title: "Could not initiate payment", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const subscriptionPending = subscription?.status
    ? ["pending_payment", "unpaid", "past_due", "expired"].includes(subscription.status)
    : false;

  // Filter completed and pending stand-alone addons
  const pendingAddons = addons.filter((a) => a.status === "pending");

  const getSubBadgeStyles = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
      case "expiring_soon":
        return "bg-orange-500/10 text-orange-600 border border-orange-500/20 animate-pulse";
      case "pending_payment":
        return "bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse";
      case "expired":
        return "bg-red-500/10 text-red-600 border border-red-500/20";
      case "cancelled":
        return "bg-slate-500/10 text-slate-600 border border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border border-slate-500/20";
    }
  };

  const completedPayments = payments.filter((p) => p.status !== "pending");

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Billing &amp; Payments
          </h1>
          <p className="text-muted-foreground text-sm">
            Review your recurring plan subscriptions, activate pending add-on services, and download payment receipts.
          </p>
        </div>

        {/* Subscription Plan Card */}
        {loading ? (
          <Card className="border-none shadow-sm h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          </Card>
        ) : (
          <Card className="overflow-hidden border border-slate-200/60 shadow-xl bg-card rounded-2xl">
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {subscription?.plan_name || "Base Plan Subscription"}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-1.5 mt-1 text-slate-500 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="capitalize">{subscription?.billing_cycle ? subscription.billing_cycle.replace(/_/g, " ") : "monthly"} billing cycle</span>
                      {subscription?.next_billing_at && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {subscription.status === "pending_payment" || subscription.status === "past_due" ? "Due Date" : "Next Billing Date"}: {formatDate(subscription.next_billing_at)}
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant="secondary" className={`${getSubBadgeStyles(subscription?.status)} px-2.5 py-0.5`}>
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${subscription?.status === "active" ? "bg-emerald-500" : subscription?.status === "expiring_soon" ? "bg-orange-500" : "bg-amber-500"}`} />
                      {subscription?.status ? subscription.status.replace(/_/g, " ").toUpperCase() : "PENDING PAYMENT"}
                    </span>
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100" onClick={fetchData}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Sync Status
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-4 border border-slate-100 dark:border-slate-800/40">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-500">Standard Marketing Fee</span>
                  <span className="font-bold text-lg text-slate-850 dark:text-slate-100">${Number(subscription?.amount ?? 400).toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {subscriptionPending ? "Total Amount Due" : "Core Subscription Fee"}
                    </p>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                      ${Number(subscription?.amount ?? 400).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{subscription?.currency || "USD"}</span>
                    </h2>
                  </div>
                  {subscriptionPending ? (
                    <Button className="px-8 py-6 text-md font-bold shadow-lg shadow-blue-500/10" variant="hero" onClick={handlePaySubscription} disabled={payingSubscription}>
                      {payingSubscription ? "Processing..." : "Pay Plan Now"}
                    </Button>
                  ) : subscription?.status === "active" ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 text-emerald-600 rounded-xl font-bold text-xs border border-emerald-500/10">
                      <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" /> SECURE & ACTIVE
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Standalone Addons Awaiting Payment */}
        {pendingAddons.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Stand-alone Services Awaiting Payment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAddons.map((addon) => {
                const pendingPayment = payments.find(p => p.addon_assignment === addon.id && p.status === "pending");
                return (
                  <Card key={addon.id} className="overflow-hidden border border-amber-500/20 bg-amber-500/[0.02] shadow-sm rounded-xl p-5 hover:bg-amber-500/[0.04] transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[9px] font-bold py-0.5 px-2 uppercase rounded-md">
                          Awaiting Payment
                        </Badge>
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">${Number(addon.amount).toLocaleString()}</span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">{addon.addon_detail?.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{addon.addon_detail?.description || "Decoupled standalone training module."}</p>
                    </div>

                    <div className="pt-5 border-t border-amber-500/10 mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">Assigned {formatDate(addon.added_at)}</span>
                      {pendingPayment && (
                        <Button 
                          variant="hero" 
                          size="sm" 
                          className="h-8 px-4 font-bold text-xs" 
                          onClick={() => handlePayIndividual(pendingPayment.id)} 
                          disabled={payingId === pendingPayment.id}
                        >
                          {payingId === pendingPayment.id ? "Processing..." : "Pay Now"}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}



        {/* Transaction History */}
        {completedPayments.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
              <FileText className="h-5 w-5 text-slate-400" /> Transaction History
            </h3>
            <div className="grid gap-3">
              {completedPayments.map((p: any) => (
                <div key={p.id} className="group flex items-center gap-4 rounded-2xl bg-card border border-slate-200/50 dark:border-slate-800/40 p-5 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/[0.3]">
                  <div className={`p-3 rounded-xl ${p.status === "completed" || p.status === "paid" ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                    {statusIcon(p.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold tracking-tight text-slate-850 dark:text-slate-100">${Number(p.amount).toLocaleString()}</span>
                      <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-widest border-slate-200/60 dark:border-slate-800">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        {p.payment_type === "addon" ? <Package className="h-3 w-3 inline text-slate-400" /> : <CreditCard className="h-3 w-3 inline text-slate-400" />}
                        {(p.payment_type || "").replace(/_/g, " ")}
                      </p>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <p className="text-xs text-slate-400">{formatDate(p.payment_date || p.created_at)}</p>
                      {cleanNotes(p.notes) && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <p className="text-xs text-slate-500 truncate max-w-sm">{cleanNotes(p.notes)}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePaymentsPage;
