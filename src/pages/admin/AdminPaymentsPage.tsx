import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, AlertTriangle, CreditCard, Download, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

/** Map raw status keys to human-readable labels */
const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  pending: "Pending",
  pending_payment: "Pending Payment",
  payment_pending: "Payment Pending",
  trialing: "Trialing",
  past_due: "Past Due",
  failed: "Failed",
  canceled: "Cancelled",
  cancelled: "Cancelled",
  paused: "Paused",
  grace_period: "Grace Period",
};

/** Map raw payment_type keys to human-readable labels */
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  monthly_service: "Marketing Service",
  one_time: "One-Time",
  addon: "Add-On",
  refund: "Refund",
  setup_fee: "Setup Fee",
};

const AdminPaymentsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [tab, setTab] = useState<"overview" | "payments">("overview");

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalType, setSubModalType] = useState<"active" | "past_due" | null>(null);
  const [subSearch, setSubSearch] = useState("");
  const [loadingSubs, setLoadingSubs] = useState(false);

  const openSubscriptionsModal = async (type: "active" | "past_due") => {
    setSubModalType(type);
    setSubModalOpen(true);
    setLoadingSubs(true);
    setSubSearch("");
    try {
      const { data } = await billingApi.allSubscriptions();
      setSubscriptions(data || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load subscriptions list",
        variant: "destructive"
      });
    }
    setLoadingSubs(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, payRes] = await Promise.all([
        billingApi.billingAnalytics(),
        billingApi.allPayments(statusFilter && statusFilter !== "all" ? { status: statusFilter } : undefined),
      ]);
      setSummary(sumRes.data);
      setPayments(payRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const exportPaymentsCSV = () => {
    const headers = ["Candidate ID", "Payment ID", "Candidate Name", "Amount", "Currency", "Type", "Status", "Date"];
    const rows = payments.map((p: any) => [
      p.candidate_display_id || "", p.display_id || "", p.candidate_name || "", p.amount, p.currency, p.payment_type, p.status,
      p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments_export.csv";
    a.click();
  };

  const statusColor = (s: string) => {
    if (s === "completed" || s === "active") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (s === "pending" || s === "pending_payment" || s === "payment_pending" || s === "trialing") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (s === "failed" || s === "past_due" || s === "canceled" || s === "cancelled") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (s === "paused" || s === "grace_period") return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    return "bg-muted text-muted-foreground";
  };

  const formatStatus = (s: string) => STATUS_LABELS[s] || s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const formatPaymentType = (t: string) => PAYMENT_TYPE_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const filteredSubs = subscriptions.filter((sub: any) => {
    const isActive = sub.status === "active" || sub.status === "expiring_soon";
    const isPastDue = ["past_due", "grace_period", "pending_payment", "expired"].includes(sub.status);
    
    if (subModalType === "active" && !isActive) return false;
    if (subModalType === "past_due" && !isPastDue) return false;
    
    if (subSearch) {
      const search = subSearch.toLowerCase();
      const name = (sub.candidate_name || "").toLowerCase();
      const email = (sub.candidate_email || "").toLowerCase();
      return name.includes(search) || email.includes(search);
    }
    return true;
  });

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: "Payment History" },
  ] as const;


  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key ? "bg-card text-card-foreground border border-b-0 border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Revenue", value: `$${(summary.total_revenue || 0).toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: "bg-secondary/10 text-secondary" },
            { label: "Monthly Revenue", value: `$${(summary.monthly_revenue || 0).toLocaleString()}`, icon: <TrendingUp className="h-5 w-5" />, color: "bg-accent/10 text-accent-foreground" },
            { label: "Active Subscriptions", value: summary.active_subscriptions, icon: <CreditCard className="h-5 w-5" />, color: "bg-primary/10 text-primary", onClick: () => openSubscriptionsModal("active"), hoverable: true },
            { label: "Past Due", value: summary.past_due_subscriptions, icon: <AlertTriangle className="h-5 w-5" />, color: summary.past_due_subscriptions > 0 ? "bg-destructive/10 text-destructive" : "bg-muted", onClick: () => openSubscriptionsModal("past_due"), hoverable: true },
          ].map((w, i) => (
            <motion.div key={w.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="w-full">
              <Card 
                className={w.hoverable ? "cursor-pointer hover:shadow-md transition-all hover:border-primary/20 hover:scale-[1.01]" : ""}
                onClick={w.onClick}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color}`}>{w.icon}</div>
                  <div>
                    <p className="text-xl font-bold text-card-foreground">{w.value !== undefined ? w.value : "0"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {w.label}
                      {w.hoverable && <span className="text-[9px] font-bold text-secondary bg-secondary/5 px-1 py-0.2 rounded hover:underline ml-1">View Details</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Payment History Tab */}
      {tab === "payments" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">All Payments ({payments.length})</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportPaymentsCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={payments}
              isLoading={loading}
              searchKey="candidate_name"
              searchPlaceholder="Search by candidate..."
              emptyMessage="No payments found."
              columns={[
                {
                  header: "Candidate ID",
                  sortable: true,
                  accessorKey: "candidate_display_id",
                  render: (p: any) => (
                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap font-mono">
                      {p.candidate_display_id || "—"}
                    </span>
                  ),
                  className: "pl-4 text-xs"
                },
                {
                  header: "Payment ID",
                  sortable: true,
                  accessorKey: "display_id",
                  render: (p: any) => (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase whitespace-nowrap font-mono">
                      {p.display_id || `PAY${p.id.toString().slice(-6).toUpperCase()}`}
                    </span>
                  ),
                  className: "text-xs"
                },
                { 
                  header: "Candidate",
                  accessorKey: "candidate_name",
                  sortable: true,
                  className: "font-medium text-sm",
                  render: (p: any) => (
                    <span className="font-semibold text-sm">{p.candidate_name || "—"}</span>
                  )
                },
                {
                  header: "Amount",
                  sortable: true,
                  accessorKey: "amount",
                  render: (p: any) => <span className="text-sm font-semibold">${Number(p.amount).toLocaleString()}</span>
                },
                {
                  header: "Type",
                  accessorKey: "payment_type",
                  sortable: true,
                  render: (p: any) => (
                    <span className="text-xs font-medium text-muted-foreground">{formatPaymentType(p.payment_type)}</span>
                  )
                },
                {
                  header: "Status",
                  sortable: true,
                  accessorKey: "status",
                  render: (p: any) => <Badge variant="secondary" className={`text-xs font-semibold ${statusColor(p.status)}`}>{formatStatus(p.status)}</Badge>
                },
                {
                  header: "Date",
                  sortable: true,
                  accessorKey: "created_at",
                  render: (p: any) => <span className="text-xs text-muted-foreground">{p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}</span>
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Drilldown Modal */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="sm:max-w-[640px] bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {subModalType === "active" ? (
                <>
                  <CreditCard className="h-5 w-5 text-secondary animate-pulse" />
                  Active Subscriptions ({filteredSubs.length})
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive animate-bounce" />
                  Past Due Subscriptions ({filteredSubs.length})
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              List of members who are currently {subModalType === "active" ? "active" : "past due"} on their subscription billing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                placeholder="Search members by name or email..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="pl-9 pr-4 h-9 text-sm"
              />
            </div>

            {/* Members Table */}
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b sticky top-0 bg-background z-10">
                    <tr className="text-muted-foreground font-semibold">
                      <th className="px-4 py-2.5 text-left">Member</th>
                      <th className="px-4 py-2.5 text-left">Plan</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingSubs ? (
                      <tr>
                        <td colSpan={4} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-secondary" />
                            Loading members...
                          </div>
                        </td>
                      </tr>
                    ) : filteredSubs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-24 text-center text-muted-foreground">
                          No members found in this category.
                        </td>
                      </tr>
                    ) : (
                      filteredSubs.map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-foreground">{sub.candidate_name || "—"}</span>
                              <span className="text-xs text-muted-foreground">{sub.candidate_email || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-foreground">{sub.plan_name || "Standard Plan"}</span>
                              <span className="text-xs text-muted-foreground">${Number(sub.amount).toLocaleString()}/{sub.billing_cycle}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColor(sub.status)}`}>
                              {formatStatus(sub.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSubModalOpen(false);
                                navigate(`/admin-dashboard/candidates/${sub.candidate}`);
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsPage;
