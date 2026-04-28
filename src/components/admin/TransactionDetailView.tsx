import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Calendar, User, Hash, FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { billingApi } from "@/services/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TransactionDetailViewProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailView = ({ transaction, open, onOpenChange }: TransactionDetailViewProps) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  
  if (!transaction) return null;

  const isInvoice = !!transaction.items;
  const invoiceId = isInvoice ? transaction.id : transaction.associated_invoice_id;

  const handleDownload = async () => {
    if (!invoiceId) {
      toast({ title: "No invoice available", description: "This transaction does not have a generated invoice.", variant: "destructive" });
      return;
    }
    
    setDownloading(true);
    try {
      const response = await billingApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hyrind_invoice_${transaction.display_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Success", description: "Invoice downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Download failed", description: "Could not generate invoice PDF. Please try again later.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const statusColor = (s: string) => {
    const status = s?.toLowerCase();
    if (status === "paid" || status === "completed" || status === "active") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (status === "pending") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    if (status === "failed") return "bg-destructive/10 text-destructive border-destructive/20";
    return "bg-muted text-muted-foreground border-border/50";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-6 pb-4 border-b border-primary/10">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" /> 
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {isInvoice ? "Invoice Details" : "Payment Record"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{transaction.display_id}</p>
                </div>
              </div>
              <Badge variant="outline" className={`${statusColor(transaction.status)} px-3 py-1 text-[10px] font-bold tracking-widest`}>
                {transaction.status?.toUpperCase()}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-12">
            <div className="space-y-1.5">
              <Label uppercase icon={<Calendar className="h-3 w-3" />}>Transaction Date</Label>
              <p className="text-sm font-bold text-foreground">
                {format(new Date(transaction.payment_date || transaction.created_at || transaction.period_start), "MMMM d, yyyy")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label uppercase icon={<DollarSign className="h-3 w-3" />}>Total Amount</Label>
              <p className="text-xl font-black text-primary tracking-tight">
                ${Number(transaction.amount).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label uppercase icon={<User className="h-3 w-3" />}>Candidate Details</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{transaction.candidate_name || "N/A"}</p>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase">{transaction.candidate_display_id}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">{transaction.candidate_email}</p>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Line Items Breakdown */}
          <div className="space-y-4">
            <Label uppercase>Detailed Breakdown</Label>
            <div className="space-y-2.5">
              {transaction.items && transaction.items.length > 0 ? (
                transaction.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-muted/30 hover:bg-muted/50 p-3.5 rounded-2xl border border-border/40 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{item.name}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter opacity-70">{item.item_type}</span>
                    </div>
                    <span className="font-black text-sm text-foreground">${Number(item.amount).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center bg-muted/30 p-3.5 rounded-2xl border border-border/40">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{transaction.payment_type?.replace(/_/g, " ").toUpperCase() || "General Payment"}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter opacity-70">Standard Transaction</span>
                  </div>
                  <span className="font-black text-sm text-foreground">${Number(transaction.amount).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {transaction.notes && (
            <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
              <Label uppercase icon={<History className="h-3 w-3" />} className="text-amber-600 mb-2">Remarks</Label>
              <p className="text-xs text-amber-800/80 leading-relaxed font-medium">"{transaction.notes}"</p>
            </div>
          )}
        </div>

        <div className="bg-muted/30 p-6 flex items-center justify-between border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground font-bold hover:text-foreground">Close Detail</Button>
          <div className="flex gap-2">
            <Button 
              variant="hero" 
              size="sm" 
              className="font-black shadow-lg shadow-primary/20"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Invoice PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Label = ({ children, uppercase = false, icon, className }: { children: React.ReactNode, uppercase?: boolean, icon?: React.ReactNode, className?: string }) => (
  <div className={`flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground tracking-widest ${uppercase ? 'uppercase' : ''} ${className}`}>
    {icon} {children}
  </div>
);
