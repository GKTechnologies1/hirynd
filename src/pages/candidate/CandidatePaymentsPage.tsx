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

interface Props {
  candidate: any;
  onStatusChange?: () => void;
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
  payingPaymentId?: string,
) => {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    toast({ title: "Could not load payment gateway", variant: "destructive" });
    return false;
  }

  // ── Real Razorpay checkout ──
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

// ── Status helpers ────────────────────────────────────────────────────────────
const statusIcon = (s: string) => {
  if (s === "completed") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (s === "failed")    return <XCircle    className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
};

const paymentTypeLabel = (t: string) =>
  (t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── Component ─────────────────────────────────────────────────────────────────
const CandidatePaymentsPage = ({ candidate, onStatusChange }: Props) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [payingSubscription, setPayingSubscription] = useState(false);
  const [payingId, setPayingId]         = useState<string | null>(null); // id of individual payment being paid

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

  // ── Pay the subscription plan (pending / unpaid / past_due) ──────────────
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

  // ── Pay an individual pending billing.Payment record ─────────────────────
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
    : 400; // Always show the $400 default even if subscription hasn't been assigned yet

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

        {/* ── Subscription Plan Card ─────────────────────────────────────── */}
        {loading ? (
          <Card className="border-none shadow-sm h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground animate-pulse">Fetching your plan details...</p>
            </div>
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
                      {subscription?.plan_name || "Monthly Service Fee"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      {subscription?.billing_cycle
                        ? subscription.billing_cycle.replace(/_/g, " ")
                        : "Monthly"} billing
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      subscription?.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${subscription?.status === "active" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      {subscription?.status
                        ? subscription.status.replace(/_/g, " ").toUpperCase()
                        : "PENDING PAYMENT"}
                    </span>
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Sync
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
              <div className="rounded-2xl bg-muted/40 p-6 space-y-4 border border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Core Marketing Services</span>
                  <span className="font-semibold">
                    $
                    {Number(subscription?.amount ?? 400).toLocaleString()}
                  </span>
                </div>

                {subscription?.addon_assignments?.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Additional Support</p>
                    {subscription.addon_assignments.map((a: any) => (
                      <div key={a.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary/60" />
                          {a.addon_detail?.name}
                        </span>
                        <span className="font-medium">
                          $
                          {Number(a.amount || a.addon_detail?.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-primary/20 pt-4 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Amount Due</p>
                    <h2 className="text-3xl font-black tracking-tighter">
                      $
                      {totalAmount.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {subscription?.currency || "USD"}
                      </span>
                    </h2>
                  </div>

                  {/* Pay Now button — shown when subscription is pending/unpaid/past_due */}
                  {subscriptionPending ? (
                    <Button
                      className="px-8 py-6 text-lg font-bold shadow-lg shadow-primary/20"
                      variant="hero"
                      onClick={handlePaySubscription}
                      disabled={payingSubscription}
                    >
                      {payingSubscription ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
                      ) : (
                        <span className="flex items-center gap-2">
                          Pay Now <CreditCard className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  ) : subscription?.status === "active" ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 text-emerald-600 rounded-lg font-bold text-sm border border-emerald-500/10">
                      <ShieldCheck className="h-5 w-5" /> SECURE &amp; ACTIVE
                    </div>
                  ) : !subscription ? (
                    // No subscription yet — show info that $400 plan will be assigned
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/5 text-amber-600 rounded-lg text-sm border border-amber-500/15 max-w-xs text-right">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                      <span>Your advisor will activate your plan once roles are confirmed.</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { icon: ShieldCheck, text: "SSL Encrypted" },
                  { icon: CreditCard, text: "PCI Compliant" },
                  { icon: FileText, text: "Auto Invoicing" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40">
                    <item.icon className="h-3 w-3" /> {item.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Pending Charges (with Pay buttons) ───────────────────────── */}
        {pendingPayments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-1">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pending Charges
              <Badge className="ml-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                {pendingPayments.length} Pending
              </Badge>
            </h3>
            <div className="grid gap-3">
              {pendingPayments.map((p: any) => {
                const isThisPaying = payingId === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 p-5 transition-all hover:border-amber-500/40"
                  >
                    <div className="p-3 rounded-xl bg-amber-500/10">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold tracking-tight">
                          ${Number(p.amount).toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground ml-1">{p.currency}</span>
                        </span>
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                          {paymentTypeLabel(p.payment_type)}
                        </p>
                        {p.payment_date && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <p className="text-xs text-muted-foreground">
                              Due: {formatDate(p.payment_date)}
                            </p>
                          </>
                        )}
                      </div>
                      {p.notes && !p.notes.includes("Razorpay") && (
                        <p className="text-xs text-muted-foreground/60 mt-1 italic">{p.notes}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="hero"
                      className="px-5 py-2.5 font-bold shrink-0 shadow-md shadow-primary/20"
                      onClick={() => handlePayIndividual(p.id)}
                      disabled={isThisPaying || !!payingId}
                    >
                      {isThisPaying ? (
                        <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Processing</>
                      ) : (
                        <><Zap className="mr-1.5 h-4 w-4" />Pay Now</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Transaction History (completed / failed) ─────────────────── */}
        {completedPayments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-1">
              <FileText className="h-5 w-5 text-primary/60" /> Transaction History
            </h3>
            <div className="grid gap-3">
              {completedPayments.map((p: any) => (
                <div
                  key={p.id}
                  className="group flex items-center gap-4 rounded-2xl bg-card border border-border p-5 transition-all hover:border-primary/30 hover:bg-muted/10"
                >
                  <div className={`p-3 rounded-xl ${p.status === "completed" ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                    {statusIcon(p.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold tracking-tight">
                        ${Number(p.amount).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-widest border-border/60">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                        {paymentTypeLabel(p.payment_type)}
                      </p>
                      <span className="text-muted-foreground/30">•</span>
                      <p className="text-xs text-muted-foreground">
                        {p.payment_date
                          ? formatDate(p.payment_date)
                          : formatDate(p.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!loading && payments.length === 0 && !subscription && (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">No Charges Yet</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Your default <strong>$400 monthly plan</strong> will appear here once your roles are confirmed.
                Additional charges may be added by your career advisor.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CandidatePaymentsPage;
