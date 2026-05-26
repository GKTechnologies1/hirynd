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
      theme: { color: "#3b82f6" },
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

const CandidatePaymentsPage = ({ candidate, onStatusChange }: { candidate: any, onStatusChange?: () => void }) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [payingSubscription, setPayingSubscription] = useState(false);
  const [payingId, setPayingId]         = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!candidate?.id) return;
    setLoading(true);
    try {
      const [subRes, payRes] = await Promise.all([
        billingApi.subscription(candidate.id),
        billingApi.payments(candidate.id),
      ]);
      setSubscription(subRes.data?.id ? subRes.data : null);
      setPayments(payRes.data || []);
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

  const totalAmount = subscription
    ? Number(subscription.amount) + Number(subscription.total_addons_amount || 0)
    : 400;

  const subscriptionPending = subscription?.status
    ? ["payment_pending", "pending_payment", "unpaid", "past_due"].some((s) => subscription.status.includes(s))
    : false;

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const completedPayments = payments.filter((p) => p.status !== "pending");

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Billing &amp; Payments
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and clear any pending charges below.
          </p>
        </div>

        {/* Subscription Plan Card */}
        {loading ? (
          <Card className="border-none shadow-sm h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          </Card>
        ) : (
          <Card className="overflow-hidden border-none shadow-xl bg-card">
            <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary/80" />
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                      {subscription?.plan_name || "Hyrind Subscription"}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{subscription?.billing_cycle ? subscription.billing_cycle.replace(/_/g, " ") : "monthly"} billing</span>
                      {subscription?.next_billing_at && (
                        <>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="font-semibold text-foreground/80">
                            {subscription.status === "pending_payment" || subscription.status === "past_due" ? "Due" : "Next Billing"}: {formatDate(subscription.next_billing_at)}
                          </span>
                        </>
                      )}
                    </CardDescription>

                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary" className={subscription?.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <span className={`h-2 w-2 rounded-full ${subscription?.status === "active" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      {subscription?.status ? subscription.status.replace(/_/g, " ").toUpperCase() : "PENDING PAYMENT"}
                    </span>
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={fetchData}>
                    <RefreshCw className="mr-2 h-3 w-3" /> Sync
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="rounded-2xl bg-muted/40 p-6 space-y-4 border border-border/50">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground">Core Marketing Services</span>
                  <span className="font-bold text-lg">${Number(subscription?.amount ?? 400).toLocaleString()}</span>
                </div>
                {subscription?.addon_assignments?.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    {subscription.addon_assignments.map((a: any) => (
                      <div key={a.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary/60" /> {a.addon_detail?.name}
                        </span>
                        <span className="font-bold">${Number(a.amount || a.addon_detail?.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-primary/20 pt-4 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      {subscriptionPending ? "Total Amount Due" : "Active Package Total"}
                    </p>
                    <h2 className="text-3xl font-black tracking-tighter">
                      ${totalAmount.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{subscription?.currency || "USD"}</span>
                    </h2>
                  </div>
                  {subscriptionPending ? (
                    <Button className="px-8 py-6 text-lg font-bold shadow-lg shadow-primary/20" variant="hero" onClick={handlePaySubscription} disabled={payingSubscription}>
                      {payingSubscription ? "Processing..." : "Pay Now"}
                    </Button>
                  ) : subscription?.status === "active" ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 text-emerald-600 rounded-lg font-bold text-sm border border-emerald-500/10">
                      <ShieldCheck className="h-5 w-5" /> SECURE & ACTIVE
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Charges */}
        {pendingPayments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-1">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Pending Charges
            </h3>
            <div className="grid gap-3">
              {pendingPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
                    <div>
                      <p className="font-bold text-lg">${Number(p.amount).toLocaleString()} {p.currency}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{(p.payment_type || "").replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Button variant="hero" size="sm" className="px-6 font-bold" onClick={() => handlePayIndividual(p.id)} disabled={payingId === p.id}>
                    {payingId === p.id ? "Processing..." : "Pay Now"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History (Restored) */}
        {completedPayments.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-1">
              <FileText className="h-5 w-5 text-primary/60" /> Transaction History
            </h3>
            <div className="grid gap-3">
              {completedPayments.map((p: any) => (
                <div key={p.id} className="group flex items-center gap-4 rounded-2xl bg-card border border-border p-5 transition-all hover:border-primary/30 hover:bg-muted/5">
                  <div className={`p-3 rounded-xl ${p.status === "completed" || p.status === "paid" ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                    {statusIcon(p.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold tracking-tight">${Number(p.amount).toLocaleString()}</span>
                      <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-widest border-border/60">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                        {(p.payment_type || "").replace(/_/g, " ")}
                      </p>
                      <span className="text-muted-foreground/30">•</span>
                      <p className="text-xs text-muted-foreground">{formatDate(p.payment_date || p.created_at)}</p>
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
