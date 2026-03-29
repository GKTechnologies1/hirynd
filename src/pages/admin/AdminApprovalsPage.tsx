import { useEffect, useState } from "react";
import { authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck, Mail, UserX } from "lucide-react";
import { format } from "date-fns";

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingUser {
  id: string;
  email: string;
  role: string;
  approval_status: string;
  created_at: string;
  full_name: string;
  phone: string;
  university: string;
  major: string;
  graduation_date: string | null;
  linkedin_url: string;
  social_profile_url: string;
  city: string;
  state: string;
  country: string;
  // Candidate specifics
  opt_end_date: string | null;
  github_url: string;
  visa_status: string;
  referral_source: string;
  referral_friend_name: string;
  notes: string;
  // Recruiter specifics
  company_name: string;
  employee_id: string;
  date_of_joining: string | null;
  department: string;
  specialization: string;
  max_clients: number | null;
  prior_recruitment_experience: string;
  work_type_preference: string;
  profile?: {
    full_name: string;
    phone: string | null;
  };
}

const AdminApprovalsPage = () => {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const { toast } = useToast();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.pendingApprovals();
      setPending(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (userId: string, action: "approved" | "rejected") => {
    setProcessing(userId);
    try {
      await authApi.approveUser(userId, action);
      toast({ title: action === "approved" ? "User Approved" : "User Rejected" });
      setSelectedUser(null);
      fetchPending();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleBlock = async (userId: string) => {
    if (!confirm("Are you sure you want to block this user? They will not be able to log in.")) return;
    setProcessing(userId);
    try {
      await authApi.updateUser(userId, { is_active: false, approval_status: "rejected" });
      toast({ title: "User Blocked" });
      fetchPending();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Registration Approvals</h2>
        <Button variant="outline" size="sm" onClick={fetchPending} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="border-secondary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-secondary" /> 
            Pending Queue 
            <Badge variant="secondary" className="ml-2 bg-secondary/10 text-secondary border-secondary/20 font-bold">
              {pending.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={pending}
            isLoading={loading}
            searchPlaceholder="Search by name or email..."
            searchKey="email"
            emptyMessage="No pending registrations in queue."
            columns={[
              { 
                header: "Candidate / Recruiter", 
                render: (u: any) => (
                  <div className="pl-6 py-1">
                    <p className="font-bold text-sm text-foreground">{u.profile?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</p>
                  </div>
                )
              },
              { 
                header: "Phone", 
                render: (u: any) => <span className="text-xs font-medium">{u.profile?.phone || "—"}</span>
              },
              { 
                header: "Role", 
                render: (u: any) => (
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${
                    u.role === 'candidate' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-teal-200 text-teal-700 bg-teal-50'
                  }`}>
                    {u.role}
                  </Badge>
                )
              },
              { 
                header: "Submission Date", 
                render: (u: any) => (
                  <div className="text-xs">
                    <p className="font-medium text-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(u.created_at), "hh:mm a")}</p>
                  </div>
                )
              },
              { 
                header: "Quick Options", 
                className: "pr-6 text-right",
                render: (u: PendingUser) => (
                  <div className="flex gap-1.5 justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 px-3 text-xs border-primary/20 hover:bg-primary/5 text-primary"
                      onClick={() => setSelectedUser(u)}
                    >
                      View Details
                    </Button>
                    <Separator orientation="vertical" className="h-8 mx-0.5" />
                    <Button size="sm" variant="hero" className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 shadow-sm" disabled={processing === u.id}
                      onClick={() => handleAction(u.id, "approved")}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/5" disabled={processing === u.id}
                      onClick={() => handleAction(u.id, "rejected")}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-hidden flex flex-col border-l shadow-2xl">
          <SheetHeader className="p-6 pb-4 border-b bg-card">
            <div className="flex items-center justify-between pr-8">
              <div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  Registration Details
                  <Badge variant="outline" className="uppercase text-[10px]">
                    {selectedUser?.role}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Reviewing submission from {selectedUser?.full_name}
                </SheetDescription>
              </div>
            </div>
            <div className="flex gap-2.5 pt-4">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 h-10 shadow-sm transition-all" 
                onClick={() => selectedUser && handleAction(selectedUser.id, "approved")}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve User
              </Button>
              <Button variant="outline" className="flex-1 h-10 border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                onClick={() => selectedUser && handleAction(selectedUser.id, "rejected")}>
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 px-6 pb-8 bg-muted/10">
            <div className="space-y-6 pt-6">
              {/* Identity Section */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Primary Identity
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-muted">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Full Name</p>
                    <p className="text-sm font-medium">{selectedUser?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email Address</p>
                    <p className="text-sm font-medium">{selectedUser?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Phone</p>
                    <p className="text-sm font-medium">{selectedUser?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Role</p>
                    <p className="text-sm font-medium capitalize">{selectedUser?.role}</p>
                  </div>
                </div>
              </section>

              {/* Education Section */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Education Profile
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-muted">
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">University</p>
                    <p className="text-sm font-medium">{selectedUser?.university || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Major / Degree</p>
                    <p className="text-sm font-medium">{selectedUser?.major || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Graduation Date</p>
                    <p className="text-sm font-medium">{selectedUser?.graduation_date ? format(new Date(selectedUser.graduation_date), "PP") : "—"}</p>
                  </div>
                </div>
              </section>

              {/* Location Section */}
              <section>
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Location & Social
                </h3>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-muted">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Location</p>
                    <p className="text-sm font-medium">
                      {[selectedUser?.city, selectedUser?.state, selectedUser?.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">LinkedIn</p>
                    {selectedUser?.linkedin_url ? (
                      <a href={selectedUser.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        View Profile
                      </a>
                    ) : <p className="text-sm">—</p>}
                  </div>
                </div>
              </section>

              {/* Role Specific Section */}
              {selectedUser?.role === 'candidate' && (
                <section>
                  <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    Candidate Specifics
                  </h3>
                  <div className="space-y-4 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Visa Status</p>
                        <p className="text-sm font-medium">{selectedUser?.visa_status || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">OPT End Date</p>
                        <p className="text-sm font-medium">{selectedUser?.opt_end_date ? format(new Date(selectedUser.opt_end_date), "PP") : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">GitHub</p>
                        {selectedUser?.github_url ? (
                          <a href={selectedUser.github_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                            View GitHub
                          </a>
                        ) : <p className="text-sm">—</p>}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Source</p>
                        <p className="text-sm font-medium">{selectedUser?.referral_source} {selectedUser?.referral_friend_name ? `(${selectedUser.referral_friend_name})` : ""}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Additional Notes</p>
                      <p className="text-xs text-foreground mt-1 bg-white p-2 rounded border border-blue-100 italic">
                        {selectedUser?.notes || "No additional notes provided."}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {selectedUser?.role === 'recruiter' && (
                <section>
                  <h3 className="text-sm font-semibold text-teal-600 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    Recruitment Details
                  </h3>
                  <div className="space-y-4 p-4 rounded-xl border border-teal-100 bg-teal-50/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Company</p>
                        <p className="text-sm font-medium">{selectedUser?.company_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Employee ID</p>
                        <p className="text-sm font-medium">{selectedUser?.employee_id || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</p>
                        <p className="text-sm font-medium">{selectedUser?.work_type_preference || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Max Clients</p>
                        <p className="text-sm font-medium">{selectedUser?.max_clients}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Prior Experience</p>
                      <p className="text-xs text-foreground mt-1 italic">
                        {selectedUser?.prior_recruitment_experience || "None specified."}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminApprovalsPage;
