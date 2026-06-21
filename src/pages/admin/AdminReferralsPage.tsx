import { useState, useEffect } from "react";
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

import { useToast } from "@/hooks/use-toast";
import { Users, FileText, Settings } from "lucide-react";

const AdminReferralsPage = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> All Referrals</CardTitle>
          <CardDescription>{referrals.length} referral(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={referrals}
            isLoading={loading}
            searchPlaceholder="Search friend name..."
            searchKey="friend_name"
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
                render: (r: any) => <span className="text-sm">{r.friend_phone || "—"}</span>
              },
              { 
                header: "Status", 
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
