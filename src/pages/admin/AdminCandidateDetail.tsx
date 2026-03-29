import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, billingApi } from "@/services/api";
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

import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, UserPlus, DollarSign, Shield, FileText, Plus, Briefcase, CheckCircle, XCircle, Clock, History, Award, Settings, BarChart, CreditCard, Pencil, Trash } from "lucide-react";
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
  const [interviewLogs, setInterviewLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("initial");
  const [payStatus, setPayStatus] = useState("completed");
  const [payNotes, setPayNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const fetchAll = async () => {
    try {
      const { data: cand } = await candidatesApi.detail(candidateId);
      setCandidate(cand);
      if (cand) {
        const [intakeRes, roleRes, credRes, payRes, interviewRes] = await Promise.all([
          candidatesApi.getIntake(candidateId).catch(() => ({ data: null })),
          candidatesApi.getRoles(candidateId).catch(() => ({ data: [] })),
          candidatesApi.getCredentials(candidateId).catch(() => ({ data: [] })),
          billingApi.payments(candidateId).catch(() => ({ data: [] })),
          candidatesApi.getInterviews(candidateId).catch(() => ({ data: [] })),
        ]);
        setIntake(intakeRes.data || null);
        setRoles(roleRes.data || []);
        setCredentials(credRes.data || []);
        setPayments(payRes.data || []);
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

  if (loading) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!candidate) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Candidate not found.</p></DashboardLayout>;

  const intakeData = intake?.data as Record<string, string> | null;
  const status = candidate.status;
  const isPlaced = status === "placed_closed";
  const STATUSES = [
    "pending_approval", "lead", "approved", "intake_submitted", "roles_published", 
    "roles_confirmed", "payment_completed", "credentials_submitted", "active_marketing", 
    "paused", "on_hold", "past_due", "cancelled", "placed_closed"
  ];

  return (
    <DashboardLayout title={`Candidate: ${candidate?.profile?.full_name || candidate?.full_name || "Unknown"}`} navItems={navItems}>
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
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="placement">Placement</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {candidate?.profile?.full_name || candidate?.full_name || "—"}</div>
              <div><span className="text-muted-foreground">Email:</span> {candidate?.profile?.email || candidate?.email || "—"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {candidate?.profile?.phone || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> {status.replace(/_/g, " ")}</div>
              <div><span className="text-muted-foreground">Registered:</span> {new Date(candidate.created_at).toLocaleDateString()}</div>
            </CardContent>
          </Card>
          {interviewLogs.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Interview Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div><span className="text-muted-foreground">Total:</span> <strong className="text-card-foreground">{interviewLogs.length}</strong></div>
                  <div><span className="text-muted-foreground">Scheduled:</span> <strong className="text-card-foreground">{interviewLogs.filter((l: any) => l.outcome === "scheduled").length}</strong></div>
                  <div><span className="text-muted-foreground">Completed:</span> <strong className="text-card-foreground">{interviewLogs.filter((l: any) => l.outcome === "completed").length}</strong></div>
                  <div><span className="text-muted-foreground">Offers:</span> <strong className="text-card-foreground">{interviewLogs.filter((l: any) => l.outcome === "selected").length}</strong></div>
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
            <CardContent>
              {intakeData ? (
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  {Object.entries(intakeData).map(([key, value]) => (
                    <div key={key}><span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span> <span className="text-card-foreground">{value || "—"}</span></div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">Intake form not submitted yet.</p>}
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

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Credential Intake History</CardTitle>
              <CardDescription>{credentials.length} version(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {credentials.length === 0 ? <p className="text-muted-foreground">No credential intake submitted yet.</p> : (
                <Accordion type="single" collapsible defaultValue={credentials[0]?.id}>
                  {credentials.map((v: any) => (
                    <AccordionItem key={v.id} value={v.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">v{v.version}</span>
                          <span className="text-sm text-muted-foreground">{v.editor_name || "Unknown"} · {new Date(v.created_at).toLocaleString()}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          {Object.entries(v.data as Record<string, string>).map(([key, value]) => value ? (
                            <div key={key}><span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span> <span className="text-card-foreground">{value}</span></div>
                          ) : null)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {!isPlaced && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Manual Payment</CardTitle>
            <CardDescription>Manually record a payment received outside the gateway (e.g. bank transfer). To request a subscription payment from the candidate, use the Billing tab.</CardDescription>
          </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Amount ($) *</Label><Input type="number" step="0.01" min="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="500.00" /></div>
                  <div><Label>Type</Label><Select value={payType} onValueChange={setPayType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="initial">Initial</SelectItem><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="refund">Refund</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent></Select></div>
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
          <AdminAuditTab candidateId={candidateId} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminCandidateDetail;
