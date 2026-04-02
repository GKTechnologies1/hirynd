import { useState, useEffect, useCallback } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, FileText, CheckCircle, XCircle, Clock,
  Package, CreditCard, ShieldCheck, AlertTriangle, Loader2, RefreshCw,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
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

const CandidatePaymentsPage = ({ candidate, onStatusChange }: Props) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

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

  const handlePayNow = async () => {
    if (!candidate?.id) return;

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast({ title: "Could not load payment gateway. Check your connection.", variant: "destructive" });
      return;
    }

    setPaying(true);
    try {
      const { data: orderData } = await billingApi.createOrder(candidate.id);

      // 1. Handle mock mode for simulation/testing
      if (orderData.mode === 'mock') {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
          await billingApi.verifyPayment(candidate.id, {
            mode: 'mock',
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
            internal_order_id: orderData.internal_order_id,
          });
          toast({ title: "Mock payment successful!", description: "Status updated in mock mode." });
          fetchData();
          onStatusChange?.();
        } catch (err: any) {
          toast({ title: "Mock payment failed", description: err.response?.data?.error || err.message, variant: "destructive" });
        } finally {
          setPaying(false);
        }
        return;
      }

      // 2. Real Razorpay checkout flow
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Hyrind",
        description: orderData.description,
        order_id: orderData.order_id,
        prefill: orderData.prefill,
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            await billingApi.verifyPayment(candidate.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              internal_order_id: orderData.internal_order_id,
            });
            toast({ title: "Payment successful!", description: "Your subscription is now active." });
            fetchData();
            onStatusChange?.();
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.response?.data?.error || err.message, variant: "destructive" });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast({ title: "Payment cancelled" });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
         setPaying(false);
         toast({ 
           title: "Payment failed", 
           description: response.error.description, 
           variant: "destructive" 
         });
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Could not initiate payment", description: err.response?.data?.error || err.message, variant: "destructive" });
      setPaying(false);
    }
  };

  const totalAmount = subscription
    ? (Number(subscription.amount) + Number(subscription.total_addons_amount || 0))
    : 0;

  const statusIcon = (s: string) => {
    if (s === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Billing & Payments
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and view your transaction history.
          </p>
        </div>

        {/* Subscription plan card */}
        {loading ? (
          <Card className="border-none shadow-sm h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground animate-pulse">Fetching your plan details...</p>
            </div>
          </Card>
        ) : !subscription ? (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">No Payment Plan Assigned</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Your career advisor will assign a tailored marketing plan once your roles and target locations are confirmed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-none shadow-xl bg-card transition-all hover:shadow-2xl hover:shadow-primary/5">
            <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary/80" />
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        {subscription.plan_name || "Active Marketing Plan"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        Next billing cycle: {subscription.billing_cycle?.replace(/_/g, " ")}
                      </CardDescription>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      subscription.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 px-3"
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${subscription.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      {subscription.status?.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-normal" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    Sync Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {/* Amount breakdown */}
              <div className="rounded-2xl bg-muted/40 p-6 space-y-4 border border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Core Marketing Services</span>
                  <span className="font-semibold text-foreground">
                    {subscription.currency === 'INR' ? "₹" : "$"}{Number(subscription.amount).toLocaleString()}
                  </span>
                </div>
                
                {subscription.addon_assignments?.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Additional Support</p>
                    {subscription.addon_assignments.map((a: any) => (
                      <div key={a.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary/60" />
                          {a.addon_detail?.name}
                        </span>
                        <span className="font-medium text-foreground">
                          {subscription.currency === 'INR' ? "₹" : "$"}{Number(a.amount || a.addon_detail?.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-primary/20 pt-4 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Amount Due</p>
                    <h2 className="text-3xl font-black tracking-tighter text-foreground">
                      {subscription.currency === 'INR' ? "₹" : "$"}{totalAmount.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{subscription.currency}</span>
                    </h2>
                  </div>
                  
                  {(subscription.status?.includes("pending") || subscription.status === "unpaid" || subscription.status === "past_due") ? (
                    <Button
                      className="px-8 py-6 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      variant="hero"
                      onClick={handlePayNow}
                      disabled={paying}
                    >
                      {paying ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Securing Payment...</>
                      ) : (
                        <span className="flex items-center gap-2">
                          Complete Payment <CreditCard className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  ) : subscription.status === "active" ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 text-emerald-600 rounded-lg font-bold text-sm border border-emerald-500/10">
                      <ShieldCheck className="h-5 w-5" />
                      SECURE & ACTIVE
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { icon: ShieldCheck, text: "SSL Encrypted" },
                  { icon: CreditCard, text: "PCI Compliant" },
                  { icon: FileText, text: "Auto Invoicing" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40">
                    <item.icon className="h-3 w-3" />
                    {item.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-1">
              <FileText className="h-5 w-5 text-primary/60" /> 
              Transaction History
            </h3>
            <div className="grid gap-3">
              {payments.map((p: any) => (
                <div key={p.id} className="group flex items-center gap-4 rounded-2xl bg-card border border-border p-5 transition-all hover:border-primary/30 hover:bg-muted/10">
                  <div className={`p-3 rounded-xl ${p.status === 'completed' ? 'bg-emerald-500/5 text-emerald-500' : 'bg-amber-500/5 text-amber-500'}`}>
                    {statusIcon(p.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold tracking-tight">
                        {p.currency === 'INR' ? "₹" : "$"}{Number(p.amount).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-widest border-border/60">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                       <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                         {p.payment_type?.replace(/_/g, " ")}
                       </p>
                       <span className="text-muted-foreground/30">•</span>
                       <p className="text-xs text-muted-foreground">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                       <Loader2 className="h-4 w-4 text-muted-foreground/40" />
                    </Button>
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
