import { useEffect, useState } from "react";
import { billingApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, AlertTriangle, CreditCard, Download, History, FileText, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { TransactionDetailView } from "@/components/admin/TransactionDetailView";

const AdminFinancialsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, invRes] = await Promise.all([
        billingApi.billingAnalytics(),
        billingApi.allPayments(),
        billingApi.allInvoices(),
      ]);
      
      setSummary(sumRes.data);
      setPayments(payRes.data || []);
      setInvoices(invRes.data || []); 
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchFinancials(); }, []);

  const statusColor = (s: string) => {
    if (s === "completed" || s === "paid" || s === "active") return "bg-emerald-500/10 text-emerald-600";
    if (s === "pending") return "bg-amber-500/10 text-amber-600";
    if (s === "failed") return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const exportToCSV = () => {
    const data = statusFilter === "invoices" ? invoices : payments;
    if (!data.length) return;
    
    const headers = ["Reference", "Candidate", "Email", "Amount", "Status", "Date"];
    const csvRows = [
      headers.join(","),
      ...data.map(row => [
        row.display_id,
        row.candidate_name,
        row.candidate_email,
        row.amount,
        row.status,
        row.created_at || row.period_start
      ].join(","))
    ];
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyrind_financials_${statusFilter}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const downloadPdf = async (e: any, invoiceId: string, displayId: string) => {
    e.stopPropagation();
    if (!invoiceId) return;
    try {
      const response = await billingApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hyrind_invoice_${displayId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Success", description: "Invoice downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Download failed", description: "Could not generate invoice PDF.", variant: "destructive" });
    }
  };

  const sharedCandidateColumn = { 
    header: "Candidate", 
    render: (p: any) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-foreground">{p.candidate_name || "—"}</span>
          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase">{p.candidate_display_id}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{p.candidate_email}</span>
      </div>
    )
  };

  const paymentColumns = [
    { 
      header: "Transaction Ref", 
      className: "pl-6 py-5",
      render: (p: any) => (
        <span className="text-[10px] font-black bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md uppercase whitespace-nowrap tracking-wider border border-blue-500/20">
          {p.display_id}
        </span>
      )
    },
    sharedCandidateColumn,
    {
      header: "Payment Type",
      render: (p: any) => (
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {p.payment_type?.replace(/_/g, " ") || "General"}
        </span>
      )
    },
    {
      header: "Amount",
      render: (p: any) => <span className="font-black text-sm text-foreground">${Number(p.amount).toLocaleString()}</span>
    },
    {
      header: "Status",
      render: (p: any) => <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 ${statusColor(p.status)}`}>{p.status.toUpperCase()}</Badge>
    },
    {
      header: "Transaction Date",
      render: (p: any) => <span className="text-[11px] font-bold text-muted-foreground">{p.payment_date || p.created_at ? format(new Date(p.payment_date || p.created_at), "MMM d, yyyy") : "—"}</span>
    },
    {
      header: "Actions",
      className: "pr-6 text-right",
      render: (p: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight px-3 hover:bg-primary hover:text-white transition-all" onClick={() => setSelectedTx(p)}>
            Details
          </Button>
          {p.associated_invoice_id && (
             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-emerald-500/10 hover:text-emerald-600" onClick={(e) => downloadPdf(e, p.associated_invoice_id, p.display_id)}>
                <Download className="h-3.5 w-3.5" />
             </Button>
          )}
        </div>
      )
    }
  ];

  const invoiceColumns = [
    { 
      header: "Invoice Ref", 
      className: "pl-6 py-5",
      render: (p: any) => (
        <span className="text-[10px] font-black bg-purple-500/10 text-purple-600 px-2 py-1 rounded-md uppercase whitespace-nowrap tracking-wider border border-purple-500/20">
          {p.display_id}
        </span>
      )
    },
    sharedCandidateColumn,
    {
      header: "Subscription Plan",
      render: (p: any) => (
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {p.plan_name || "Manual / One-off"}
        </span>
      )
    },
    {
      header: "Amount",
      render: (p: any) => <span className="font-black text-sm text-foreground">${Number(p.amount).toLocaleString()}</span>
    },
    {
      header: "Status",
      render: (p: any) => <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 ${statusColor(p.status)}`}>{p.status.toUpperCase()}</Badge>
    },
    {
      header: "Billing Period",
      render: (p: any) => (
        <div className="flex flex-col text-[10px] font-bold text-muted-foreground">
           <span>{p.period_start ? format(new Date(p.period_start), "MMM d, yyyy") : "—"}</span>
           <span className="opacity-60">to {p.period_end ? format(new Date(p.period_end), "MMM d, yyyy") : "—"}</span>
        </div>
      )
    },
    {
      header: "Actions",
      className: "pr-6 text-right",
      render: (p: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight px-3 hover:bg-primary hover:text-white transition-all" onClick={() => setSelectedTx(p)}>
            Details
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-emerald-500/10 hover:text-emerald-600" onClick={(e) => downloadPdf(e, p.id, p.display_id)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Operations</h1>
          <p className="text-sm text-muted-foreground">Monitor revenue, process invoices, and manage the system-wide transaction ledger.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchFinancials} disabled={loading}>
            <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="hero" size="sm" onClick={exportToCSV} disabled={loading}>
            <Download className="mr-2 h-4 w-4" /> Export Ledger
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Revenue", value: `$${(summary.total_revenue || 0).toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: "bg-emerald-500/10 text-emerald-600" },
            { label: "This Month", value: `$${(summary.monthly_revenue || 0).toLocaleString()}`, icon: <TrendingUp className="h-5 w-5" />, color: "bg-blue-500/10 text-blue-600" },
            { label: "Outstanding", value: `$${(summary.past_due_revenue || 0).toLocaleString()}`, icon: <AlertTriangle className="h-5 w-5" />, color: "bg-amber-500/10 text-amber-600" },
            { label: "Success Rate", value: "98.4%", icon: <CreditCard className="h-5 w-5" />, color: "bg-purple-500/10 text-purple-600" },
          ].map((w, i) => (
            <motion.div key={w.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-none shadow-sm ring-1 ring-border/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color}`}>{w.icon}</div>
                  <div>
                    <p className="text-xl font-black text-foreground tracking-tight">{w.value}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Financial Ledger Section */}
      <Card className="border-none shadow-sm ring-1 ring-border/40 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-0 pt-6">
          <div className="flex flex-row items-center justify-between mb-6 px-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Financial History Ledger
            </CardTitle>
            <div className="flex bg-muted p-1 rounded-xl">
              <button 
                onClick={() => setStatusFilter("payments")} 
                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${statusFilter !== "invoices" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                TRANSACTIONS
              </button>
              <button 
                onClick={() => setStatusFilter("invoices")} 
                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${statusFilter === "invoices" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                INVOICES
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={statusFilter === "invoices" ? invoices : payments}
            isLoading={loading}
            searchKey="candidate_name"
            searchPlaceholder="Search by candidate or reference..."
            columns={statusFilter === "invoices" ? invoiceColumns : paymentColumns}
          />
        </CardContent>
      </Card>

      <TransactionDetailView 
        transaction={selectedTx} 
        open={!!selectedTx} 
        onOpenChange={(open) => !open && setSelectedTx(null)} 
      />
    </div>
  );
};

export default AdminFinancialsPage;

