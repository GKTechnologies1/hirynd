import { useState, useEffect } from "react";
import { adminReferralsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

const AdminReferralsPage = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data } = await adminReferralsApi.list();
      setReferrals(data || []);
    } catch { setReferrals([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await adminReferralsApi.updateStatus(id, newStatus);
      toast({ title: "Status updated" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    try {
      await adminReferralsApi.updateNotes(id, notes);
      toast({ title: "Notes saved" });
    } catch (e: any) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const STATUSES = ["new", "contacted", "onboarded", "closed"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> All Referrals</CardTitle>
          <CardDescription>{referrals.length} referral(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> :
            referrals.length === 0 ? <p className="text-muted-foreground">No referrals yet.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred By</TableHead>
                    <TableHead>Friend Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.referrer_name || "Unknown"}</TableCell>
                      <TableCell>{r.friend_name}</TableCell>
                      <TableCell>{r.friend_email}</TableCell>
                      <TableCell>{r.friend_phone || "—"}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={v => handleStatusChange(r.id, v)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="Admin notes"
                          defaultValue={r.notes || ""}
                          onBlur={e => handleNotesChange(r.id, e.target.value)}
                          className="w-40"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralsPage;
