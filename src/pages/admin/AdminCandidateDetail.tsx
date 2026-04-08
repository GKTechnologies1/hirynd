import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, billingApi, authApi, BACKEND_URL } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/DataTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, UserPlus, DollarSign, Shield, FileText, Plus, Briefcase, CheckCircle, XCircle, Clock, History, Award, Settings, BarChart, CreditCard, Pencil, Trash, RefreshCw, Activity, Eye, AlertTriangle, ClipboardList, KeyRound, Save } from "lucide-react";
import AdminAssignmentsTab from "@/components/admin/AdminAssignmentsTab";
import AdminPlacementTab from "@/components/admin/AdminPlacementTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import AdminQAChecklist from "@/components/admin/AdminQAChecklist";
import AdminBillingTab from "@/components/admin/AdminBillingTab";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
  { label: "Reports", path: "/admin-dashboard/reports", icon: <BarChart className="h-4 w-4" /> },
  { label: "Configuration", path: "/admin-dashboard/config", icon: <Settings className="h-4 w-4" /> },
];

interface AdminCandidateDetailProps {
  candidateId: string;
}

const AdminCandidateDetail = ({ candidateId }: AdminCandidateDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [interviewLogs, setInterviewLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("subscription");
  const [payStatus, setPayStatus] = useState("pending");
  const [payNotes, setPayNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [savingCred, setSavingCred] = useState(false);

  const fetchAll = async () => {
    try {
      const { data: cand } = await candidatesApi.detail(candidateId);
      setCandidate(cand);
      if (cand) {
        const [intakeRes, roleRes, credRes, payRes, subRes, interviewRes] = await Promise.all([
          candidatesApi.getIntake(candidateId).catch(() => ({ data: null })),
          candidatesApi.getRoles(candidateId).catch(() => ({ data: [] })),
          candidatesApi.getCredentials(candidateId).catch(() => ({ data: [] })),
          billingApi.payments(candidateId).catch(() => ({ data: [] })),
          billingApi.subscription(candidateId).catch(() => ({ data: null })),
          candidatesApi.getInterviews(candidateId).catch(() => ({ data: [] })),
        ]);
        setIntake(intakeRes.data || null);
        setRoles(roleRes.data || []);
        setCredentials(credRes.data || []);
        if (credRes.data && credRes.data.length > 0 && credRes.data[0].data) {
          setCredForm(credRes.data[0].data as Record<string, string>);
        }
        setPayments(payRes.data || []);
        setSubscription(subRes.data?.id ? subRes.data : null);
        setInterviewLogs(interviewRes.data || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [candidateId]);

  const handleAddRole = async () => {
    if (!newRoleTitle.trim()) return;
    setAddingRole(true);
    try {
      await candidatesApi.addRole(candidateId, { role_title: newRoleTitle.trim(), description: newRoleDescription.trim() });
      setNewRoleTitle(""); setNewRoleDescription("");
      toast({ title: "Role suggestion added" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setAddingRole(false);
  };

  const handleSuggestRoles = async () => {
    if (roles.length === 0) { toast({ title: "Add at least one role first", variant: "destructive" }); return; }
    try {
      await candidatesApi.updateStatus(candidateId, "roles_published");
      toast({ title: "Roles published to candidate for confirmation" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setAddingPayment(true);
    try {
      await billingApi.recordPayment(candidateId, { amount: Number(payAmount), payment_type: payType, status: payStatus, notes: payNotes });
      setPayAmount(""); setPayNotes("");
      toast({ title: "Payment recorded" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setAddingPayment(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await billingApi.deletePayment(paymentId);
      toast({ title: "Payment deleted" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePayment = async (paymentId: string, currentAmount: string, currentNotes: string) => {
    const amount = prompt("Update Amount ($):", currentAmount);
    if (amount === null) return;
    const notes = prompt("Update Notes:", currentNotes);
    if (notes === null) return;

    try {
      await billingApi.updatePayment(paymentId, { amount: parseFloat(amount), notes });
      toast({ title: "Payment updated" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleReopenIntake = async () => {
    try {
      await candidatesApi.reopenIntake(candidateId);
      toast({ title: "Intake form reopened" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleReopenRoles = async () => {
    try {
      await candidatesApi.reopenRoles(candidateId);
      toast({ title: "Roles reset and status reverted to Intake Submitted" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await candidatesApi.updateStatus(candidateId, newStatus);
      toast({ title: "Status updated" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleSaveCredential = async () => {
    if (!credForm.full_legal_name?.trim()) {
      toast({ title: "Full legal name is required", variant: "destructive" }); return;
    }
    setSavingCred(true);
    try {
      await candidatesApi.upsertCredential(candidateId, credForm);
      toast({ title: "Credentials updated by Admin" });
      setIsEditingCreds(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingCred(false);
  };

  const handlePauseResume = async () => {
    const nextStatus = status === "paused" ? "active_marketing" : "paused";
    try {
      await candidatesApi.updateStatus(candidateId, nextStatus);
      toast({ title: status === "paused" ? "Marketing resumed" : "Marketing paused" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this profile? This will trigger billing closure.")) return;
    try {
      await candidatesApi.updateStatus(candidateId, "cancelled");
      toast({ title: "Profile cancelled" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading candidate data...</p></div>;
  if (!candidate) return <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed"><p className="text-muted-foreground">Candidate not found or internal system error.</p></div>;

  const intakeData = intake?.data as Record<string, string> | null;
  const status = candidate.status;
  const isPlaced = status === "placed_closed";
  const STATUSES = [
    "pending_approval", "lead", "approved", "intake_submitted", "roles_published", 
    "roles_candidate_responded", "roles_confirmed", "payment_pending", "pending_payment", "payment_completed", 
    "credentials_submitted", "active_marketing", "paused", "on_hold", "past_due", 
    "cancelled", "placed_closed"
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={status} />
        {!isPlaced && (
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>

            {(status === "active_marketing" || status === "paused") && (
              <Button variant="outline" size="sm" onClick={handlePauseResume}>
                {status === "paused" ? "Resume Marketing" : "Pause Marketing"}
              </Button>
            )}

            {status !== "cancelled" && (
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={handleCancel}>
                Cancel Profile
              </Button>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>← Back</Button>
      </div>

      {/* QA Checklist */}
      <AdminQAChecklist candidateId={candidateId} candidateStatus={status} />

      {/* Intake Warning */}
      {!intake && status !== 'lead' && status !== 'pending_approval' && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Intake Sheet Pending</p>
                <p className="text-sm text-amber-700/80">The candidate has not submitted their professional intake form yet. Review the registration data below in the meantime.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => handleStatusChange('lead')}>
              Remind Candidate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Placed Banner */}
      {isPlaced && (
        <Card className="mb-6 border-secondary/50 bg-secondary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-6 w-6 text-secondary" />
            <div>
              <p className="font-semibold text-card-foreground">Case Closed — Candidate Placed</p>
              <p className="text-sm text-muted-foreground">This candidate has been successfully placed. Marketing and daily logs are locked.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {status !== 'lead' && (
            <>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </>
          )}
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          {status !== 'lead' && <TabsTrigger value="placement">Placement</TabsTrigger>}
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Primary Profile */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> {status === 'lead' ? 'Interest Snapshot' : 'Registration Profile'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Full Name</Label>
                  <p className="font-semibold text-foreground text-base tracking-tight">{candidate?.profile?.full_name || candidate?.full_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Contact Details</Label>
                  <p className="font-medium text-foreground">{candidate?.profile?.email || candidate?.email || "—"}</p>
                  <p className="font-medium text-muted-foreground mt-0.5">{candidate?.profile?.phone || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Base Currency</Label>
                    <p className="font-medium text-foreground">{subscription?.currency || "USD"}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">{status === 'lead' ? 'Submitted At' : 'Date Joined'}</Label>
                    <p className="font-medium text-foreground">{formatDate(candidate.created_at || candidate.date_joined)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">{status === 'lead' ? 'Submitted Resume' : 'Registered Resume'}</Label>
                    {(candidate?.resume_file || candidate?.resume_url) ? (
                      <Button variant="outline" size="sm" className="h-9 w-full justify-start gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary" asChild>
                        <a 
                          href={(candidate.resume_file || candidate.resume_url).startsWith('http') ? (candidate.resume_file || candidate.resume_url) : `${BACKEND_URL}${candidate.resume_file || candidate.resume_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <FileText className="h-4 w-4" /> View {status === 'lead' ? 'Lead' : 'Registration'} Resume
                        </a>
                      </Button>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No resume uploaded during registration</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Education Profile */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> Educational Background
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">University / College</Label>
                  <p className="font-semibold text-foreground tracking-tight">{candidate?.university || intakeData?.university_name || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Degree / Major</Label>
                    <p className="font-medium text-foreground">
                      {candidate?.degree || intakeData?.degree || "—"}
                      {(candidate?.major || intakeData?.major) ? ` / ${candidate?.major || intakeData?.major}` : ""}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Graduation Date</Label>
                  <p className="font-medium text-foreground">
                    {formatDate(candidate?.graduation_date || intakeData?.graduation_date)} 
                    {candidate?.graduation_year && !candidate?.graduation_date && ` (${candidate.graduation_year})`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Professional Presence */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Presence & Socials
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Current Location</Label>
                  <p className="font-medium text-foreground">{candidate?.current_location || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">LinkedIn</Label>
                    {candidate?.linkedin_url ? (
                      <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1 mt-1">
                        View Profile <Eye className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">No URL Provided</p>}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">GitHub</Label>
                    {candidate?.github_url ? (
                      <a href={candidate.github_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1 mt-1">
                        View Codebase <FileText className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">No URL Provided</p>}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Portfolio</Label>
                    {candidate?.portfolio_url ? (
                      <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1 mt-1">
                        Open Portfolio <LayoutDashboard className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">No URL Provided</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visa & Eligibility */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Visa & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Work Authorization</Label>
                  <p className="font-semibold text-foreground text-base">{candidate?.visa_status || "—"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">OPT / STEM End Date</Label>
                  <p className="font-medium text-foreground">{formatDate(candidate?.opt_end_date)}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Source / Referral</Label>
                  <p className="font-medium text-foreground">{candidate?.referral_source || "Direct"}</p>
                  {candidate?.referral_friend_name && <p className="text-xs text-muted-foreground mt-0.5 font-medium">Referred by: {candidate.referral_friend_name}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {candidate?.notes && (
            <Card className="border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-muted/10 pb-2">
                 <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                   <FileText className="h-3 w-3" /> Additional Candidate Notes
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-4 pt-1">
                 <p className="text-sm text-foreground/80 italic leading-relaxed">"{candidate.notes}"</p>
               </CardContent>
            </Card>
          )}

          {interviewLogs.length > 0 && (
            <Card className="bg-blue-600 shadow-lg border-none text-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest opacity-90"><BarChart className="h-4 w-4" /> Pipeline Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-8 text-sm">
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Total Interviews</span> <strong className="text-2xl">{interviewLogs.length}</strong></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Scheduled</span> <strong className="text-2xl">{interviewLogs.filter((l: any) => l.outcome === "scheduled").length}</strong></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Success Rate</span> <strong className="text-2xl">{Math.round((interviewLogs.filter((l: any) => l.outcome === "selected").length / interviewLogs.length) * 100)}%</strong></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Offers Received</span> <strong className="text-2xl">{interviewLogs.filter((l: any) => l.outcome === "selected").length}</strong></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Intake Tab */}
        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Client Intake Sheet</CardTitle>
                  <CardDescription>{intake ? (intake.is_locked ? "Submitted & locked" : "Draft") : "Not submitted yet"}</CardDescription>
                </div>
                {intake?.is_locked && (
                  <Button variant="outline" size="sm" onClick={handleReopenIntake} className="text-secondary border-secondary/30 hover:bg-secondary/5">
                    <History className="mr-1 h-3.5 w-3.5" /> Reopen for Editing
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {intakeData ? (
                <div className="space-y-8">
                  {!intake.is_locked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-center gap-2">
                       <Clock className="h-4 w-4" /> This is a draft version. The candidate has not yet submitted and locked this form.
                    </div>
                  )}

                  {/* Personal & Contact */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Personal & Contact</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">Full Name</p><p className="font-semibold text-sm">{(intakeData.first_name && intakeData.last_name) ? `${intakeData.first_name} ${intakeData.last_name}` : (intakeData.full_name || "—")}</p></div>
                        <div><p className="text-muted-foreground mb-1">DOB</p><p className="font-semibold">{intakeData.date_of_birth || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Primary Phone</p><p className="font-semibold">{intakeData.phone_number || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Alternate Phone</p><p className="font-semibold">{intakeData.alternate_phone || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Email</p><p className="font-semibold">{intakeData.email || "—"}</p></div>
                        <div className="col-span-2 space-y-1">
                          <p className="text-muted-foreground mb-1">Address</p>
                          <p className="font-semibold">{intakeData.current_address || "—"}</p>
                          <p className="font-semibold">{intakeData.city}{intakeData.city && intakeData.state ? ", " : ""}{intakeData.state} {intakeData.zip_code} {intakeData.country}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Immigration & Eligibility</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div><p className="text-muted-foreground mb-1">Visa Type</p><p className="font-semibold">{intakeData.visa_type === "Other" ? intakeData.visa_other : (intakeData.visa_type || "—")}</p></div>
                        <div><p className="text-muted-foreground mb-1">Visa Expiry</p><p className="font-semibold">{intakeData.visa_expiry_date || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Auth Status</p><p className="font-semibold">{intakeData.work_authorization_status || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Sponsorship Required</p><p className="font-semibold">{intakeData.sponsorship_required?.toString() === "true" ? "Yes" : intakeData.sponsorship_required?.toString() === "false" ? "No" : "—"}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">Country of Auth</p><p className="font-semibold">{intakeData.country_of_work_authorization || "—"}</p></div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Education & Career */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Education</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">Degree / Major</p><p className="font-semibold text-sm">{intakeData.degree === "other" ? intakeData.degree_other : (intakeData.degree || "—")}{intakeData.major ? ` / ${intakeData.major}` : ""}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">University</p><p className="font-medium text-sm">{intakeData.university_name || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Graduation Date</p><p className="font-medium">{intakeData.graduation_date || "—"}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">Certifications</p><p className="font-medium whitespace-pre-wrap">{intakeData.additional_certifications || "—"}</p></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Job Preferences</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="col-span-2"><p className="text-muted-foreground mb-1 text-sm">Target Roles</p><p className="font-bold text-primary text-sm">{intakeData.target_roles || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Salary Expectation</p><p className="font-bold text-sm">{intakeData.salary_expectation ? `$${intakeData.salary_expectation}` : "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Remote Preference</p><p className="font-medium">{intakeData.remote_preference || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Relocate?</p><p className="font-medium">{intakeData.relocation_preference?.toString() === "true" ? "Yes" : intakeData.relocation_preference?.toString() === "false" ? "No" : "—"}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">Preferred Locations</p><p className="font-medium">{intakeData.preferred_locations || "—"}</p></div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Professional Background */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Professional Background</h4>
                    <div className="grid gap-4 md:grid-cols-3 text-xs">
                      <div><p className="text-muted-foreground mb-1">Experience</p><p className="font-semibold">{intakeData.years_of_experience || "—"} Years</p></div>
                      <div><p className="text-muted-foreground mb-1">Recent Employer</p><p className="font-semibold">{intakeData.recent_employer || "—"}</p></div>
                      <div><p className="text-muted-foreground mb-1">Current Title</p><p className="font-semibold">{intakeData.current_job_title || "—"}</p></div>
                      <div className="md:col-span-3"><p className="text-muted-foreground mb-1">Skills Summary</p><p className="bg-muted p-3 rounded font-medium leading-relaxed">{intakeData.technologies_or_skills || "—"}</p></div>
                      <div className="md:col-span-3"><p className="text-muted-foreground mb-1">Academic Projects</p><p className="bg-muted/30 p-3 rounded font-medium italic">{intakeData.academic_projects || "No projects listed"}</p></div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 pt-2">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Social & Portfolio</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-white p-2 rounded border"><span>LinkedIn</span>{intakeData.linkedin_url ? <a href={intakeData.linkedin_url} target="_blank" className="text-blue-600 underline">View Profile</a> : <span>—</span>}</div>
                        <div className="flex justify-between items-center bg-white p-2 rounded border"><span>GitHub</span>{intakeData.github_url ? <a href={intakeData.github_url} target="_blank" className="text-blue-600 underline">View GitHub</a> : <span>—</span>}</div>
                        <div className="flex justify-between items-center bg-white p-2 rounded border"><span>Portfolio</span>{intakeData.portfolio_url ? <a href={intakeData.portfolio_url} target="_blank" className="text-blue-600 underline">View Portfolio</a> : <span>—</span>}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Marketing & Availability</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div><p className="text-muted-foreground mb-1">Ready to Start</p><p className="font-semibold">{intakeData.ready_to_start_date || "—"}</p></div>
                        <div><p className="text-muted-foreground mb-1">Emp Type</p><p className="font-semibold">{intakeData.preferred_employment_type || "—"}</p></div>
                        <div className="col-span-2"><p className="text-muted-foreground mb-1">Notes</p><p className="font-medium italic">{intakeData.additional_notes || "—"}</p></div>
                      </div>
                    </div>
                  </div>

                  {intakeData.resume_url && (
                    <div className="pt-4">
                      <Button variant="outline" className="w-full flex items-center gap-2 border-primary/20 bg-primary/5 text-primary" asChild>
                        <a href={intakeData.resume_url} target="_blank" rel="noreferrer">
                          <FileText className="h-4 w-4" /> Download / Preview Submitted Resume
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 w-full border-2 border-dashed rounded-2xl bg-muted/5">
                  <ClipboardList className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-bold text-card-foreground">Intake Form Pending</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                    The candidate has not yet submitted their professional intake questionnaire.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Role Suggestions</CardTitle>
                {["roles_published", "roles_confirmed"].includes(status) && (
                  <Button variant="outline" size="sm" onClick={handleReopenRoles} className="text-secondary border-secondary/30 hover:bg-secondary/5">
                    <History className="mr-1 h-3.5 w-3.5" /> Reopen & Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={roles}
                isLoading={loading}
                searchPlaceholder="Search roles..."
                searchKey="role_title"
                emptyMessage="No roles suggested yet."
                columns={[
                  { 
                    header: "Title", 
                    accessorKey: "role_title",
                    className: "font-medium text-sm pl-6"
                  },
                  { 
                    header: "Description", 
                    render: (r: any) => <span className="text-xs text-muted-foreground line-clamp-1">{r.description || "—"}</span>
                  },
                  { 
                    header: "Confirmation", 
                    className: "pr-6 text-right",
                    render: (r: any) => <StatusBadge status={r.candidate_confirmed === true ? "active" : r.candidate_confirmed === false ? "rejected" : "pending"} />
                  }
                ]}
              />
            </CardContent>
          </Card>
          {!isPlaced && ["intake_submitted", "roles_suggested"].includes(status) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Role Suggestion</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Role Title *</Label><Input value={newRoleTitle} onChange={e => setNewRoleTitle(e.target.value)} placeholder="e.g. Data Analyst" /></div>
                <div><Label>Description / Rationale</Label><Textarea value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} /></div>
                <div className="flex gap-3">
                  <Button onClick={handleAddRole} disabled={addingRole || !newRoleTitle.trim()}>{addingRole ? "Adding..." : "Add Role"}</Button>
                  {status === "intake_submitted" && roles.length > 0 && <Button variant="hero" onClick={handleSuggestRoles}>Publish Suggested Roles</Button>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Credential Intake History</CardTitle>
                  <CardDescription>{credentials.length} version(s)</CardDescription>
                </div>
                {!isEditingCreds && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingCreds(true)} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" /> Edit Current Credentials
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingCreds ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {["full_legal_name", "email", "phone", "linkedin_url", "current_title", "years_experience", "certifications"].map((field) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">{field.replace(/_/g, " ")}</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm[field] || ""} onChange={e => setCredForm(prev => ({ ...prev, [field]: e.target.value }))} />
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-amber-800 flex items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5" /> Account Credentials
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Shared Email (All Platforms) *</Label>
                        <Input type="email" className="bg-white text-sm h-10 border-border/50" value={credForm["shared_email"] || ""} onChange={e => setCredForm(prev => ({ ...prev, "shared_email": e.target.value }))} />
                      </div>
                      {["gmail_password", "linkedin_password", "indeed_password", "dice_password", "foundit_password"].map((field) => (
                        <div key={field} className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">{field.replace(/_/g, " ")} {["gmail_password", "linkedin_password"].includes(field) ? "*" : "(Optional)"}</Label>
                          <Input type="password" placeholder="••••••••" className="bg-white text-sm h-10 border-border/50" value={credForm[field] || ""} onChange={e => setCredForm(prev => ({ ...prev, [field]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Skills Summary & Keywords</Label>
                    <Textarea rows={5} className="bg-muted/30 text-sm border-border/50 italic" value={credForm["skills_summary"] || ""} onChange={e => setCredForm(prev => ({ ...prev, ["skills_summary"]: e.target.value }))} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="hero" className="flex-1 h-11 font-bold shadow-lg shadow-primary/10" onClick={handleSaveCredential} disabled={savingCred}>
                      {savingCred ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Update Candidate Credentials
                    </Button>
                    <Button variant="outline" className="h-11" onClick={() => setIsEditingCreds(false)} disabled={savingCred}>Cancel</Button>
                  </div>
                </div>
              ) : credentials.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No credential intake submitted yet.</p>
              ) : (
                <Accordion type="single" collapsible defaultValue={credentials[0]?.id}>
                  {credentials.map((v: any) => {
                    const cData = v.data as Record<string, string>;
                    return (
                    <AccordionItem key={v.id} value={v.id} className="border-none shadow-sm mb-4 bg-muted/20 rounded-xl overflow-hidden px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="secondary" className="h-6">v{v.version}</Badge>
                          <div>
                            <span className="font-semibold block">{v.editor_name || "Candidate Submission"}</span>
                            <span className="text-[10px] uppercase text-muted-foreground font-bold">{formatDate(v.created_at)}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-6">
                        <div className="space-y-8 pt-4">
                          {/* Top Identity Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Personal Email</p><p className="font-medium">{cData.personal_email || cData.personalEmail || "—"}</p></div>
                            <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Phone</p><p className="font-medium">{cData.phone_number || cData.phoneNumber || "—"}</p></div>
                            <div className="col-span-2"><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Location</p><p className="font-medium">{cData.location || "—"}</p></div>
                          </div>

                          {/* OPT & Entry */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-white p-4 rounded-lg shadow-sm border border-muted">
                            <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">OPT Start Date</p><p className="font-semibold">{cData.opt_start_date || cData.optStartDate || "—"}</p></div>
                            <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">First Entry US</p><p className="font-semibold">{cData.first_entry_us || cData.firstEntryUS || "—"}</p></div>
                            <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Offer Submitted</p><Badge variant="outline" className="mt-1">{cData.opt_offer_letter_submitted || cData.optOfferLetterSubmitted || "No"}</Badge></div>
                          </div>

                          {/* Job Portals - CRITICAL DATA */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive flex items-center gap-2">
                               <Shield className="h-3 w-3" /> Job Portal Credentials
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {[
                                 { label: 'LinkedIn', id: 'linkedin_id', pw: 'linkedin_password' },
                                 { label: 'Gmail', id: 'shared_email', pw: 'gmail_password' },
                                 { label: 'Indeed', id: 'shared_email', pw: 'indeed_password' },
                                 { label: 'Dice', id: 'shared_email', pw: 'dice_password' },
                                 { label: 'Foundit', id: 'shared_email', pw: 'foundit_password' }
                               ].map(portal => (
                                 <div key={portal.label} className="bg-white border rounded-lg p-3">
                                   <p className="font-bold text-[10px] text-muted-foreground mb-2">{portal.label}</p>
                                   <div className="space-y-1">
                                     <p className="text-[11px] truncate">Email/ID: <span className="font-medium">{cData[portal.id] || "N/A"}</span></p>
                                     <p className="text-[11px] truncate">PW: <span className="font-mono bg-muted px-1 rounded">{cData[portal.pw] ? "••••••••" : "N/A"}</span></p>
                                   </div>
                                 </div>
                               ))}
                            </div>
                          </div>

                          {/* Preferences */}
                          <div className="grid gap-4 md:grid-cols-2">
                             <div className="bg-primary/5 p-3 rounded-lg">
                               <p className="text-[9px] font-bold uppercase text-primary mb-1">Preferred Roles</p>
                               <p className="text-xs font-medium">{cData.preferred_job_roles || cData.preferredRoles || "—"}</p>
                             </div>
                             <div className="bg-primary/5 p-3 rounded-lg">
                               <p className="text-[9px] font-bold uppercase text-primary mb-1">Preferred Locations</p>
                               <p className="text-xs font-medium">{cData.preferred_locations || cData.preferredLocations || "—"}</p>
                             </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )})}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {subscription && (
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                       <CreditCard className="h-4 w-4 text-secondary" />
                       Plan: {subscription.plan_name || "Unknown"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Status: <span className="capitalize font-semibold">{subscription.status?.replace(/_/g, " ")}</span> | Amount: {subscription.currency === "INR" ? "₹" : "$"}{Number(subscription.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {subscription.status === 'active' && payments.filter(p => p.status === 'completed').length === 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 text-[10px] uppercase font-bold"
                        onClick={async () => {
                           if(confirm("No completed payments found. Revert status to Pending Payment?")) {
                             try {
                               await billingApi.updateSubscription(candidateId, { status: 'pending_payment' });
                               toast({ title: "Status reverted to Pending Payment" });
                               fetchAll();
                             } catch(err: any) { toast({ title: "Sync failed", variant: "destructive" }); }
                           }
                        }}
                      >
                        Revert to Pending
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={fetchAll} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {!isPlaced && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Manual Payment</CardTitle>
            <CardDescription>Manually record a payment received outside the gateway (e.g. bank transfer). To request a subscription payment from the candidate, use the Billing tab.</CardDescription>
          </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Amount ($) *</Label><Input type="number" step="0.01" min="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="500.00" /></div>
                  <div><Label>Type</Label>
                    <Select value={payType} onValueChange={setPayType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly_service">Monthly Service Fee</SelectItem>
                        <SelectItem value="mock_practice">Mock Practice Fee</SelectItem>
                        <SelectItem value="interview_support">Interview Support Fee</SelectItem>
                        <SelectItem value="operations_support">Operations Support Fee</SelectItem>
                        <SelectItem value="manual">Manual / Other</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label><Select value={payStatus} onValueChange={setPayStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label>Notes</Label><Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Manual check, wire transfer, etc." /></div>
                <Button variant="hero" onClick={handleRecordPayment} disabled={addingPayment || !payAmount}>{addingPayment ? "Recording..." : "Record Payment"}</Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Payment History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={payments}
                isLoading={loading}
                searchPlaceholder="Search payments..."
                searchKey="payment_type"
                emptyMessage="No payments recorded."
                columns={[
                  { 
                    header: "Date", 
                    render: (p: any) => <span className="text-sm pl-6">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</span>
                  },
                  { 
                    header: "Amount", 
                    render: (p: any) => (
                      <span className="font-bold text-foreground flex items-center gap-0.5 text-sm">
                        <DollarSign className="h-3 w-3" />{Number(p.amount).toLocaleString()}
                      </span>
                    )
                  },
                  { 
                    header: "Type", 
                    render: (p: any) => <span className="text-sm capitalize text-muted-foreground">{p.payment_type?.replace(/_/g, " ")}</span>
                  },
                  { 
                    header: "Status", 
                    render: (p: any) => (
                      <div className="flex items-center gap-1.5">
                        {p.status === "completed" ? <CheckCircle className="h-3.5 w-3.5 text-secondary" /> : p.status === "failed" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-xs uppercase font-bold opacity-60 tracking-tighter">{p.status}</span>
                      </div>
                    )
                  },
                  {
                    header: "Actions",
                    className: "pr-6 text-right",
                    render: (p: any) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleUpdatePayment(p.id, p.amount, p.notes)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePayment(p.id)}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>


        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <AdminAssignmentsTab candidateId={candidateId} candidateStatus={status} hasCredentials={credentials.length > 0} onRefresh={fetchAll} />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <AdminBillingTab candidateId={candidateId} onRefresh={fetchAll} />
        </TabsContent>

        {/* Placement Tab */}
        <TabsContent value="placement">
          <AdminPlacementTab candidateId={candidateId} candidateStatus={status} onRefresh={fetchAll} />
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <AdminAuditTab targetId={candidateId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCandidateDetail;
