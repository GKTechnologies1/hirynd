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
import { useToast } from "@/hooks/use-toast";

import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, Phone, Send } from "lucide-react";

const navItems = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Refer a Friend", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
];

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
        friend_phone: friendPhone.trim(),
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
    <DashboardLayout title="Refer a Friend" navItems={navItems}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Refer a Friend to HYRIND</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Friend's Name *</Label><Input value={friendName} onChange={e => setFriendName(e.target.value)} placeholder="John Doe" /></div>
              <div><Label>Friend's Email *</Label><Input type="email" value={friendEmail} onChange={e => setFriendEmail(e.target.value)} placeholder="john@example.com" /></div>
              <div><Label>Friend's Phone *</Label><Input value={friendPhone} onChange={e => setFriendPhone(e.target.value)} placeholder="+1 (555) 000-0000" /></div>
              <div><Label>Note (optional)</Label><Input value={referralNote} onChange={e => setReferralNote(e.target.value)} placeholder="How do you know them?" /></div>
            </div>
            <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
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
                  className: "font-medium text-sm pl-6"
                },
                { 
                  header: "Email", 
                  accessorKey: "friend_email",
                  className: "text-sm"
                },
                { 
                  header: "Phone", 
                  render: (r: any) => <span className="text-sm">{r.friend_phone || "—"}</span>
                },
                { 
                  header: "Status", 
                  render: (r: any) => <StatusBadge status={r.status} />
                },
                { 
                  header: "Date", 
                  render: (r: any) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                }
              ]}
            />
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default CandidateReferralsPage;
