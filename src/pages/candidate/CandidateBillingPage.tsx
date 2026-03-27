import { useState, useEffect } from "react";
import { billingApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { DollarSign, FileText, CreditCard, AlertTriangle, CheckCircle, Clock, XCircle, Info, IndianRupee } from "lucide-react";


const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <span className="h-4 w-4">📋</span> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <span className="h-4 w-4">💼</span> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <span className="h-4 w-4">🔑</span> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
];

interface CandidateBillingPageProps {
  candidate: any;
}

const statusColors: Record<string, string> = {
  active: "bg-secondary/10 text-secondary border-secondary/30",
  trialing: "bg-primary/10 text-primary border-primary/30",
  past_due: "bg-destructive/10 text-destructive border-destructive/30",
  grace_period: "bg-destructive/10 text-destructive border-destructive/30",
  paused: "bg-muted text-muted-foreground border-border",
  canceled: "bg-muted text-muted-foreground border-border",
  unpaid: "bg-destructive/10 text-destructive border-destructive/30",
};

const invoiceStatusBadge: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  paid: "bg-secondary/10 text-secondary",
  failed: "bg-destructive/10 text-destructive",
  waived: "bg-muted text-muted-foreground",
};

const statusHelperText: Record<string, string> = {
  active: "Your subscription is active. Marketing services are running.",
  trialing: "You are on a trial period. Your first charge will be on your next billing date.",
  past_due: "Your payment is overdue. Please update your payment method to avoid service disruption.",
  grace_period: "You are in a grace period. Payment must be received before the grace period ends.",
  paused: "Your subscription is paused. Marketing services are on hold. Contact support to resume.",
  canceled: "Your subscription has been cancelled. Contact support to reactivate.",
  unpaid: "Your subscription has an unpaid balance. Please contact support.",
};

const CandidateBillingPage = ({ candidate }: CandidateBillingPageProps) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidate) return;
    const fetchBilling = async () => {
      try {
        const [subRes, invRes] = await Promise.all([
          billingApi.subscription(candidate.id),
          billingApi.invoices(candidate.id),
        ]);
        setSubscription(subRes.data?.id ? subRes.data : null);
        setInvoices(invRes.data || []);
        setPaymentMethods([]);
      } catch {
        setSubscription(null);
        setInvoices([]);
        setPaymentMethods([]);
      }
      setLoading(false);
    };
    fetchBilling();
  }, [candidate]);

  const graceRemaining = () => {
    if (!subscription?.grace_period_ends_at) return null;
    const diff = new Date(subscription.grace_period_ends_at).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.ceil(diff / 86400000);
    return `${days} day${days !== 1 ? "s" : ""} remaining`;
  };

  return (
    <DashboardLayout title="Billing & Subscription" navItems={CANDIDATE_NAV}>
      {/* Past Due / Grace Period Banner */}
      {subscription && ["past_due", "grace_period"].includes(subscription.status) && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-card-foreground">Payment Past Due</p>
              <p className="text-sm text-muted-foreground">
                Please update your payment method to avoid marketing disruption.
                {graceRemaining() && ` Grace period: ${graceRemaining()}.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paused / Canceled Banner */}
      {subscription && ["paused", "canceled"].includes(subscription.status) && (
        <Card className="mb-6 border-muted bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="font-semibold text-card-foreground">
                {subscription.status === "paused" ? "Subscription Paused" : "Subscription Cancelled"}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscription.status === "paused"
                  ? "Your subscription is paused. Marketing services are on hold. Contact support to resume."
                  : "Your subscription has been cancelled. Contact support to reactivate."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Subscription Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !subscription ? (
            <p className="text-muted-foreground">No active subscription. Your admin team will set this up when your account is ready.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[subscription.status] || ""}>
                    {subscription.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium text-card-foreground">{subscription.plan_name || "Monthly Marketing"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Amount</p>
                  <p className="text-lg font-bold text-card-foreground flex items-center gap-0.5"><IndianRupee className="h-4 w-4" />{Number(subscription.amount).toLocaleString()} {subscription.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Charge Date</p>
                  <p className="text-card-foreground">{subscription.next_billing_at ? new Date(subscription.next_billing_at).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Payment</p>
                  <p className="text-card-foreground">{subscription.last_payment_at ? new Date(subscription.last_payment_at).toLocaleDateString() : "—"}</p>
                </div>
                {["past_due", "grace_period"].includes(subscription.status) && subscription.grace_period_ends_at && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Grace Period Ends</p>
                    <p className="text-destructive font-semibold">
                      {new Date(subscription.grace_period_ends_at).toLocaleDateString()} ({graceRemaining()})
                    </p>
                  </div>
                )}
              </div>

              {/* Helper text */}
              <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{statusHelperText[subscription.status] || ""}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethods.length > 0 ? (
            <div className="space-y-2">
              {paymentMethods.map((pm: any) => (
                <div key={pm.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-card-foreground">{pm.method_label}</p>
                    {pm.last4 && <p className="text-sm text-muted-foreground">{pm.brand ? `${pm.brand} ` : ""}•••• {pm.last4}{pm.exp_month ? ` (${pm.exp_month}/${pm.exp_year})` : ""}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">Payment is handled via secure Razorpay link provided by the admin team.</p>
              <Button variant="outline" disabled>
                Update Payment Method (Coming Soon)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Invoice History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={invoices}
            isLoading={loading}
            searchPlaceholder="Search invoices..."
            searchKey="status" // Using status as a search key example
            emptyMessage="No invoices yet."
            columns={[
              { 
                header: "Period", 
                render: (inv: any) => <span className="text-sm">{new Date(inv.period_start).toLocaleDateString()} – {new Date(inv.period_end).toLocaleDateString()}</span>
              },
              { 
                header: "Amount", 
                render: (inv: any) => (
                  <span className="font-medium flex items-center gap-0.5 text-sm">
                    <IndianRupee className="h-4 w-4" />{Number(inv.amount).toLocaleString()} {inv.currency}
                  </span>
                )
              },
              { 
                header: "Status", 
                render: (inv: any) => <Badge className={invoiceStatusBadge[inv.status] || ""}>{inv.status.toUpperCase()}</Badge>
              },
              { 
                header: "Paid Date", 
                render: (inv: any) => <span className="text-sm">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</span>
              }
            ]}
          />
        </CardContent>
      </Card>

    </DashboardLayout>
  );
};

export default CandidateBillingPage;
