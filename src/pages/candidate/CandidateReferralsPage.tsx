import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, Phone, Send } from "lucide-react";

interface CandidateReferralsPageProps {
  candidate: any;
}

const CandidateReferralsPage = ({ candidate }: CandidateReferralsPageProps) => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [friendPhone, setFriendPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [referralNote, setReferralNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReferrals = async () => {
    if (!candidate?.id) return;
    try {
      const { data } = await candidatesApi.getReferrals(candidate.id);
      setReferrals(data || []);
    } catch {
      setReferrals([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReferrals(); }, [candidate?.id]);

  const handleSubmit = async () => {
    if (!friendName.trim() || !friendEmail.trim() || !friendPhone.trim()) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(friendEmail)) {
      toast({ title: "Enter a valid email", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      await candidatesApi.submitReferral(candidate.id, {
        friend_name: friendName.trim(),
        friend_email: friendEmail.trim(),
        friend_phone: `${countryCode} ${friendPhone.trim()}`,
        referral_note: referralNote.trim(),
      });
      toast({ title: "Referral submitted! Thank you." });
      setFriendName(""); setFriendEmail(""); setFriendPhone(""); setReferralNote("");
      fetchReferrals();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Refer a Friend to HYRIND</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Friend's Name *</Label><Input value={friendName} onChange={e => setFriendName(e.target.value)} placeholder="John Doe" /></div>
              <div><Label>Friend's Email *</Label><Input type="email" value={friendEmail} onChange={e => setFriendEmail(e.target.value)} placeholder="john@example.com" /></div>
              <div>
                <Label>Friend's Phone *</Label>
                <div className="flex gap-2 mt-1.5">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="h-10 w-[90px] rounded-xl bg-background/50 border-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+91">🇮🇳 +91</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={friendPhone} onChange={e => setFriendPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="1234567890" className="flex-1" />
                </div>
              </div>
              <div><Label className="mb-1.5 inline-block">Note (optional)</Label><Input value={referralNote} onChange={e => setReferralNote(e.target.value)} placeholder="How do you know them?" /></div>
            </div>
            <Button 
              variant="hero" 
              className={`h-11 px-6 font-bold transition-all ${friendName.trim() && friendEmail.trim() && friendPhone.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`} 
              onClick={handleSubmit} 
              disabled={submitting}
            >
              <Send className="mr-2 h-4 w-4" /> {submitting ? "Submitting..." : "Submit Referral"}
            </Button>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card>
          <CardHeader><CardTitle>My Referrals</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={referrals}
              isLoading={loading}
              searchPlaceholder="Search friend name..."
              searchKey="friend_name"
              emptyMessage="No referrals yet."
              columns={[
                { 
                  header: "Name", 
                  accessorKey: "friend_name",
                  sortable: true,
                  className: "font-medium text-sm pl-6"
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
                  sortable: true,
                  accessorKey: "status",
                  render: (r: any) => <StatusBadge status={r.status} />
                },
                { 
                  header: "Date", 
                  sortable: true,
                  accessorKey: "created_at",
                  render: (r: any) => <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                }
              ]}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default CandidateReferralsPage;
