import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { billingApi, filesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, FileText, CreditCard, AlertTriangle, CheckCircle, Clock, XCircle, Info, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <span className="h-4 w-4">📋</span> },
  { label: "Intake Sheet", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <span className="h-4 w-4">💼</span> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <span className="h-4 w-4">🔑</span> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
];

interface CandidateBillingPageProps {
  candidate: any;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  trialing: "bg-blue-100 text-blue-800 border-blue-200",
  past_due: "bg-red-100 text-red-800 border-red-200",
  pending_payment: "bg-yellow-100 text-yellow-800 border-yellow-200",
  grace_period: "bg-red-100 text-red-800 border-red-200",
  paused: "bg-gray-100 text-gray-800 border-gray-200",
  canceled: "bg-gray-100 text-gray-800 border-gray-200",
  unpaid: "bg-red-100 text-red-800 border-red-200",
};

const invoiceStatusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  waived: "bg-gray-100 text-gray-800",
};

const statusHelperText: Record<string, string> = {
  active: "Your subscription is active. Marketing services are running.",
  pending_payment: "Your cycle has ended or a new plan was assigned. Please pay to continue services.",
  trialing: "You are on a trial period. Your first charge will be on your next billing date.",
  past_due: "Your payment is overdue. Please update your payment method to avoid service disruption.",
  grace_period: "You are in a grace period. Payment must be received before the grace period ends.",
  paused: "Your subscription is paused. Marketing services are on hold. Contact support to resume.",
  canceled: "Your subscription has been cancelled. Contact support to reactivate.",
  unpaid: "Your subscription has an unpaid balance. Please contact support.",
};

const CandidateBillingPage = ({ candidate }: CandidateBillingPageProps) => {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!candidate) return;
    const fetchOverview = async () => {
      try {
        const { data } = await billingApi.candidateOverview(candidate.id);
        setSubscription(data.subscription);
        setInvoices(data.invoices || []);
      } catch (err: any) {
        toast({ title: "Failed to load billing overview", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [candidate, toast]);

  const handleDownloadInvoice = async (invoiceId: string) => {
    setDownloading(invoiceId);
    try {
      const response = await billingApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `hyrind_invoice_${invoiceId.split('-')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast({ title: "Error downloading invoice", variant: "destructive" });
    }
    setDownloading(null);
  };

  const isPendingPayment = subscription && ["past_due", "grace_period", "pending_payment", "unpaid"].includes(subscription.status);

  return (
    <DashboardLayout title="Billing & Subscription" navItems={CANDIDATE_NAV}>
      {/* Alert Banners */}
      {isPendingPayment && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Payment Required</p>
                <p className="text-sm text-red-700">
                  Your cycle requires payment. Please complete your payment to avoid marketing disruption.
                </p>
              </div>
            </div>
            <Button asChild variant="hero">
              <Link to="/candidate-dashboard/payments">Pay Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {subscription && ["paused", "canceled"].includes(subscription.status) && (
        <Card className="mb-6 border-gray-200 bg-gray-50">
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

      {/* Subscription Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Active Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !subscription ? (
            <p className="text-muted-foreground">No active subscription. Your admin team will set this up.</p>
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
                  <p className="font-medium text-foreground">{subscription.plan_name || "Marketing Plan"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-xl font-bold text-foreground">
                    {subscription.currency === 'INR' ? "₹" : "$"}{Number(subscription.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Next Billing Date</p>
                  <p className={`font-semibold ${isPendingPayment ? 'text-red-600' : 'text-foreground'}`}>
                    {subscription.next_billing_at ? new Date(subscription.next_billing_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                <Info className="h-5 w-5 mt-0.5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Subscription Notice</p>
                  <p className="text-sm text-blue-700 mt-1">{statusHelperText[subscription.status] || "Your subscription is currently being processed."}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid On</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {new Date(inv.period_start).toLocaleDateString()} — {new Date(inv.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {inv.currency === 'INR' ? "₹" : "$"}{Number(inv.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={invoiceStatusBadge[inv.status] || ""}>{inv.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "paid" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownloadInvoice(inv.id)}
                          disabled={downloading === inv.id}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {downloading === inv.id ? "Downloading..." : "PDF"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CandidateBillingPage;
