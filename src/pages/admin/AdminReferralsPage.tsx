import { useState, useEffect, useMemo } from "react";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { DatePicker } from "@/components/ui/DatePicker";

import { useToast } from "@/hooks/use-toast";
import { Users, FileText, Settings, Search, X } from "lucide-react";

const AdminReferralsPage = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async (showLoading = true, isPolling = false) => {
    if (showLoading) setLoading(true);
    const backgroundConfig = isPolling ? { headers: { 'X-Background-Request': 'true' } } : undefined;
    try {
      const { data } = await candidatesApi.adminListReferrals(backgroundConfig);
      setReferrals(data || []);
    } catch {
      setReferrals([]);
    }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData(true, false);
    const interval = setInterval(() => {
      fetchData(false, true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchName = !searchName || r.friend_name?.toLowerCase().includes(searchName.toLowerCase());

      let matchDate = true;
      if (r.created_at) {
        // Construct date at local midnight to avoid timezone shift
        const cleanDate = r.created_at.split("T")[0];
        const [y, m, d] = cleanDate.split("-").map((s: string) => parseInt(s, 10));
        const itemDate = new Date(y, m - 1, d);
        itemDate.setHours(0, 0, 0, 0);

        if (fromDate) {
          const fParts = fromDate.split(/[-\/]/);
          if (fParts.length === 3) {
            const fd = new Date(parseInt(fParts[2], 10), parseInt(fParts[0], 10) - 1, parseInt(fParts[1], 10));
            fd.setHours(0, 0, 0, 0);
            if (itemDate < fd) matchDate = false;
          }
        }
        
        if (toDate) {
          const tParts = toDate.split(/[-\/]/);
          if (tParts.length === 3) {
            const td = new Date(parseInt(tParts[2], 10), parseInt(tParts[0], 10) - 1, parseInt(tParts[1], 10));
            td.setHours(23, 59, 59, 999);
            if (itemDate > td) matchDate = false;
          }
        }
      } else {
        if (fromDate || toDate) matchDate = false;
      }

      const matchStatus = statusFilter === "all" || r.status?.toLowerCase() === statusFilter.toLowerCase();
      
      return matchName && matchDate && matchStatus;
    });
  }, [referrals, searchName, fromDate, toDate, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await candidatesApi.updateReferral(id, { status: newStatus });
      toast({ title: "Status updated" }); fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    try {
      await candidatesApi.updateReferral(id, { notes });
      toast({ title: "Notes saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const STATUSES = ["sent", "contacted", "onboarded", "closed"];

  const hasActiveFilters = searchName || fromDate || toDate || statusFilter !== "all";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> All Referrals</CardTitle>
          <CardDescription>{filteredReferrals.length} referral(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 pt-4 pb-2">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-4 items-end">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    placeholder="Search friend name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-8 pr-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                  />
                  {searchName && (
                    <button
                      onClick={() => setSearchName("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From Date</Label>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Date</Label>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">
                        {s === 'sent' ? 'New' : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex h-8 items-center">
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchName("");
                      setFromDate("");
                      setToDate("");
                      setStatusFilter("all");
                    }}
                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DataTable
            data={filteredReferrals}
            isLoading={loading}
            emptyMessage="No referrals yet."
            columns={[
              { 
                header: "Referred By", 
                accessorKey: "referrer_name",
                sortable: true,
                className: "font-medium text-sm pl-6"
              },
              { 
                header: "Friend Name", 
                accessorKey: "friend_name",
                sortable: true,
                className: "text-sm"
              },
              { 
                header: "Email", 
                accessorKey: "friend_email",
                sortable: true,
                className: "text-sm"
              },
              { 
                header: "Phone", 
                sortable: true,
                accessorKey: "friend_phone",
                render: (r: any) => <span className="text-sm">{r.friend_phone || "—"}</span>
              },
              { 
                header: "Status", 
                sortable: true,
                accessorKey: "status",
                render: (r: any) => (
                  <Select value={r.status} onValueChange={v => handleStatusChange(r.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s === 'sent' ? 'New' : s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )
              },
              { 
                header: "Candidate Notes", 
                sortable: true,
                accessorKey: "referral_note",
                render: (r: any) => (
                  <span className="text-xs text-muted-foreground max-w-[150px] truncate block" title={r.referral_note || ""}>
                    {r.referral_note || "—"}
                  </span>
                )
              },
              { 
                header: "Date", 
                sortable: true,
                accessorKey: "created_at",
                render: (r: any) => <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              },
              { 
                header: "Actions", 
                className: "pr-6",
                render: (r: any) => (
                  <Input
                    placeholder="Admin notes"
                    defaultValue={r.notes || ""}
                    onBlur={e => handleNotesChange(r.id, e.target.value)}
                    className="w-40 h-8 text-xs"
                  />
                )
              }
            ]}
          />
        </CardContent>

      </Card>
    </div>
  );
};

export default AdminReferralsPage;
