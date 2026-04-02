import { useEffect, useState } from "react";
import { authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck, Mail, UserX, LayoutDashboard, Users, Award, CreditCard, Briefcase, Loader2 } from "lucide-react";
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
        <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col border-l shadow-2xl">
          <SheetHeader className="p-6 pb-4 border-b bg-card">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  Registration Review
                  <Badge variant="secondary" className="uppercase text-[10px] font-bold">
                    {selectedUser?.role}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="flex items-center gap-1.5 mt-0.5">
                   Submitted on {selectedUser?.created_at && format(new Date(selectedUser.created_at), "PPp")}
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex gap-3 pt-5">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 h-11 shadow-sm transition-all font-bold" 
                onClick={() => selectedUser && handleAction(selectedUser.id, "approved")}
                disabled={!!processing}
              >
                {processing === selectedUser?.id ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Approve Registration
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-11 border-destructive/20 text-destructive hover:bg-destructive/10 transition-all font-medium"
                onClick={() => selectedUser && handleAction(selectedUser.id, "rejected")}
                disabled={!!processing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 bg-muted/20">
            <div className="p-6 space-y-6">
              {/* Profile Card */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3 py-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Primary Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Full Name</p>
                      <p className="font-semibold text-foreground">{selectedUser?.profile?.full_name || selectedUser?.full_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Email Address</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5 underline decoration-primary/20 decoration-2 underline-offset-4">
                        {selectedUser?.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Phone Number</p>
                      <p className="font-medium text-foreground">{selectedUser?.profile?.phone || selectedUser?.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">User Role</p>
                      <p className="font-medium text-foreground capitalize">{selectedUser?.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Education Card */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3 py-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Award className="h-4 w-4" /> Education & Background
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 grid grid-cols-2 gap-y-4 text-sm">
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">University / Institute</p>
                    <p className="font-semibold text-foreground">{selectedUser?.university || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Major / Degree</p>
                    <p className="font-medium text-foreground">{selectedUser?.major || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Graduation</p>
                    <p className="font-medium text-foreground">
                      {selectedUser?.graduation_date ? format(new Date(selectedUser.graduation_date), "MMM yyyy") : "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Links */}
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3 py-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Location & Professional Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 grid grid-cols-2 gap-y-4 text-sm">
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Current Location</p>
                    <p className="font-medium text-foreground">
                      {[selectedUser?.city, selectedUser?.state, selectedUser?.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">LinkedIn URL</p>
                    {selectedUser?.linkedin_url ? (
                      <a href={selectedUser.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                        View Profile <Mail className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">Not provided</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Other Profile</p>
                    {selectedUser?.social_profile_url ? (
                      <a href={selectedUser.social_profile_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline">
                        Visit Site
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">Not provided</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Role Specific Details */}
              {selectedUser?.role === 'candidate' ? (
                <Card className="border-blue-100 bg-blue-50/20 shadow-sm overflow-hidden">
                  <CardHeader className="bg-blue-600/5 pb-3 py-4 border-b border-blue-100">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-700 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Candidate Specifics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-blue-600/60 font-bold tracking-tight">Visa Status</p>
                        <p className="font-semibold text-blue-900">{selectedUser?.visa_status || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-blue-600/60 font-bold tracking-tight">OPT End Date</p>
                        <p className="font-medium text-blue-900">{selectedUser?.opt_end_date ? format(new Date(selectedUser.opt_end_date), "PP") : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-blue-600/60 font-bold tracking-tight">GitHub Profile</p>
                        {selectedUser?.github_url ? (
                          <a href={selectedUser.github_url} target="_blank" rel="noreferrer" className="text-blue-700 font-medium hover:underline">
                            View GitHub
                          </a>
                        ) : <p className="text-slate-400 italic text-xs">Not provided</p>}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-blue-600/60 font-bold tracking-tight">Referral Source</p>
                        <p className="font-medium text-blue-900">{selectedUser?.referral_source || "Organic"} {selectedUser?.referral_friend_name ? `(${selectedUser.referral_friend_name})` : ""}</p>
                      </div>
                    </div>
                    <Separator className="bg-blue-100" />
                    <div>
                      <p className="text-[10px] uppercase text-blue-600/60 font-bold tracking-tight block mb-1">Additional Candidate Notes</p>
                      <div className="text-xs text-blue-800 leading-relaxed bg-white border border-blue-200 p-3 rounded-lg shadow-inner">
                        {selectedUser?.notes || "No additional comments from candidate."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : selectedUser?.role === 'recruiter' && (
                <Card className="border-teal-100 bg-teal-50/20 shadow-sm overflow-hidden">
                  <CardHeader className="bg-teal-600/5 pb-3 py-4 border-b border-teal-100">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-teal-700 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Professional & Academic
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-teal-600/60 font-bold tracking-tight">University</p>
                        <p className="font-semibold text-teal-900">{selectedUser?.university || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-teal-600/60 font-bold tracking-tight">Major</p>
                        <p className="font-medium text-teal-900">{selectedUser?.major || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase text-teal-600/60 font-bold tracking-tight mb-1">Professional Links</p>
                        <div className="flex flex-wrap gap-2">
                           {selectedUser?.linkedin_url && (
                             <a href={selectedUser.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-bold bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-200 transition-colors">
                               LinkedIn Profile
                             </a>
                           )}
                           {selectedUser?.social_profile_url && (
                             <a href={selectedUser.social_profile_url} target="_blank" rel="noreferrer" className="text-xs font-bold bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-200 transition-colors">
                               Social Profile
                             </a>
                           )}
                           {!selectedUser?.linkedin_url && !selectedUser?.social_profile_url && <p className="text-xs italic text-teal-600">No links provided</p>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-teal-600/60 font-bold tracking-tight">Internal Company</p>
                        <p className="font-semibold text-teal-900">{selectedUser?.company_name || "—"}</p>
                      </div>
                       <div>
                        <p className="text-[10px] uppercase text-teal-600/60 font-bold tracking-tight">Experience</p>
                        <p className="font-medium text-teal-900 line-clamp-2">{selectedUser?.prior_recruitment_experience || "None specified"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t bg-card flex justify-center">
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground text-[10px] uppercase tracking-tighter"
                onClick={() => selectedUser && handleBlock(selectedUser.id)}
            >
                <UserX className="h-3 w-3 mr-1" /> Block User ID Permanently
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminApprovalsPage;
