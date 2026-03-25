import { useState, useEffect, useCallback } from "react";
import { billingApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, FileText, CheckCircle, XCircle, Clock, IndianRupee,
  Package, CreditCard, ShieldCheck, AlertTriangle, Loader2,
  LayoutDashboard, Briefcase, KeyRound, ClipboardList, Phone, UserPlus, MessageSquare, Settings
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Sheet", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Referral", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Messages", path: "/candidate-dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Settings", path: "/candidate-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

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

      // Mock mode (dev with placeholder keys)
      if (orderData.mode === "mock") {
        toast({ title: "Mock payment initiated (dev mode)" });
        const { data: result } = await billingApi.verifyPayment(candidate.id, {
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: "pay_mock_123",
          razorpay_signature: "mock_sig",
          mode: "mock",
        });
        toast({ title: "Mock payment verified!", description: `Status: ${result.candidate_status}` });
        fetchData();
        onStatusChange?.();
        setPaying(false);
        return;
      }

      // Real Razorpay checkout
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
            const { data: result } = await billingApi.verifyPayment(candidate.id, {
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
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => {
            toast({ title: "Payment cancelled" });
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
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
    <DashboardLayout title="Payments" navItems={CANDIDATE_NAV}>
      <div className="space-y-6">
        {/* Subscription plan card */}
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : !subscription ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No Payment Plan Assigned</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your advisor will assign a subscription plan after your roles are confirmed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {subscription.plan_name || "Subscription Plan"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {subscription.billing_cycle?.replace(/_/g, " ")} billing
                  </CardDescription>
                </div>
                <Badge
                  className={
                    subscription.status === "active"
                      ? "bg-green-100 text-green-800"
                      : (subscription.status === "pending_payment" || subscription.status === "pending" || subscription.status === "unpaid")
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-700"
                  }
                >
                  {subscription.status?.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount breakdown */}
              <div className="rounded-xl bg-background/70 border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Plan</span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />{Number(subscription.amount).toLocaleString()}
                  </span>
                </div>
                {subscription.addon_assignments?.map((a: any) => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />{a.addon_detail?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />{Number(a.addon_detail?.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* CTA */}
              {(subscription.status === "pending_payment" || subscription.status === "pending" || subscription.status === "unpaid") ? (
                <Button
                  className="w-full"
                  size="lg"
                  variant="hero"
                  onClick={handlePayNow}
                  disabled={paying}
                >
                  {paying ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
                  ) : (
                    <><IndianRupee className="mr-2 h-5 w-5" />Pay ₹{totalAmount.toLocaleString()} Now</>
                  )}
                </Button>
              ) : subscription.status === "active" ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <ShieldCheck className="h-5 w-5" />
                  Subscription Active — Thank you!
                </div>
              ) : null}

              {/* Note */}
              <p className="text-xs text-muted-foreground text-center">
                Payments are secure and powered by Razorpay. Contact support for billing queries.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-start gap-4 rounded-xl border border-border p-4">
                    <div className="mt-0.5">{statusIcon(p.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-card-foreground flex items-center gap-0.5">
                          <IndianRupee className="h-3.5 w-3.5" />{Number(p.amount).toLocaleString()} {p.currency}
                        </p>
                        <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">{p.payment_type?.replace(/_/g, " ")}</p>
                      {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CandidatePaymentsPage;
