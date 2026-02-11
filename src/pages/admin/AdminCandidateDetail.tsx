import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, UserPlus, DollarSign, Shield, FileText, Plus, Briefcase, CheckCircle, XCircle, Clock, History } from "lucide-react";
import AdminAssignmentsTab from "@/components/admin/AdminAssignmentsTab";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
];

interface AdminCandidateDetailProps {
  candidateId: string;
}

const AdminCandidateDetail = ({ candidateId }: AdminCandidateDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [editorProfiles, setEditorProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // New role form
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("initial");
  const [payStatus, setPayStatus] = useState("completed");
  const [payNotes, setPayNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const fetchAll = async () => {
    const { data: cand } = await supabase.from("candidates").select("*").eq("id", candidateId).single();
    setCandidate(cand);

    if (cand) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", cand.user_id).single();
      setProfile(prof);

      const { data: intakeData } = await supabase.from("client_intake_sheets").select("*").eq("candidate_id", cand.id).maybeSingle();
      setIntake(intakeData);

      const { data: roleData } = await supabase.from("role_suggestions").select("*").eq("candidate_id", cand.id).order("created_at", { ascending: true });
      setRoles(roleData || []);

      const { data: credData } = await supabase.from("credential_intake_sheets").select("*").eq("candidate_id", cand.id).order("version", { ascending: false });
      setCredentials(credData || []);

      const { data: payData } = await supabase.from("payments").select("*").eq("candidate_id", cand.id).order("created_at", { ascending: false });
      setPayments(payData || []);

      // Editor profiles for credentials
      if (credData && credData.length > 0) {
        const editorIds = [...new Set(credData.map((v: any) => v.edited_by).filter(Boolean))];
        if (editorIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", editorIds);
          const map: Record<string, string> = {};
          profiles?.forEach((p: any) => { map[p.user_id] = p.full_name; });
          setEditorProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [candidateId]);

  const handleAddRole = async () => {
    if (!newRoleTitle.trim()) return;
    setAddingRole(true);
    const { error } = await supabase.rpc("add_role_suggestion", {
      _candidate_id: candidateId,
      _role_title: newRoleTitle.trim(),
      _description: newRoleDescription.trim(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewRoleTitle(""); setNewRoleDescription("");
      toast({ title: "Role suggestion added" });
      fetchAll();
    }
    setAddingRole(false);
  };

  const handleSuggestRoles = async () => {
    if (roles.length === 0) { toast({ title: "Add at least one role first", variant: "destructive" }); return; }
    const { error } = await supabase.rpc("admin_update_candidate_status", {
      _candidate_id: candidateId, _new_status: "roles_suggested", _reason: "Roles suggested by admin",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      await supabase.rpc("create_system_notification", {
        _user_id: candidate.user_id, _title: "Roles Suggested",
        _message: "Your team has suggested roles for your profile. Please review and confirm.",
        _link: "/candidate-dashboard/roles",
      });
      toast({ title: "Roles sent to candidate for confirmation" }); fetchAll();
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setAddingPayment(true);
    const { error } = await supabase.rpc("admin_record_payment", {
      _candidate_id: candidateId, _amount: Number(payAmount),
      _payment_type: payType, _status: payStatus, _notes: payNotes,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setPayAmount(""); setPayNotes(""); toast({ title: "Payment recorded" }); fetchAll(); }
    setAddingPayment(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.rpc("admin_update_candidate_status", {
      _candidate_id: candidateId, _new_status: newStatus, _reason: "",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Status updated" }); fetchAll(); }
  };

  if (loading) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!candidate) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Candidate not found.</p></DashboardLayout>;

  const intakeData = intake?.data as Record<string, string> | null;
  const status = candidate.status;

  // Readiness checklist
  const checklist = [
    { label: "Intake Submitted", done: !["lead", "approved"].includes(status) },
    { label: "Roles Confirmed", done: !["lead", "approved", "intake_submitted", "roles_suggested"].includes(status) },
    { label: "Payment Received", done: !["lead", "approved", "intake_submitted", "roles_suggested", "roles_confirmed"].includes(status) },
    { label: "Credentials Submitted", done: credentials.length > 0 },
  ];

  const STATUSES = ["lead","approved","intake_submitted","roles_suggested","roles_confirmed","paid","credential_completed","active_marketing","paused","cancelled","placed"];

  return (
    <DashboardLayout title={`Candidate: ${profile?.full_name || "Unknown"}`} navItems={navItems}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={status} />
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>← Back</Button>
      </div>

      {/* Readiness Checklist */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Readiness Checklist</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.done ? <CheckCircle className="h-5 w-5 text-secondary" /> : <XCircle className="h-5 w-5 text-muted-foreground/40" />}
              <span className={item.done ? "text-card-foreground font-medium" : "text-muted-foreground"}>{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {profile?.full_name}</div>
              <div><span className="text-muted-foreground">Email:</span> {profile?.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {profile?.phone || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> {status.replace(/_/g, " ")}</div>
              <div><span className="text-muted-foreground">Registered:</span> {new Date(candidate.created_at).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intake Tab */}
        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Intake Sheet</CardTitle>
              <CardDescription>{intake ? (intake.is_locked ? "Submitted & locked" : "Draft") : "Not submitted yet"}</CardDescription>
            </CardHeader>
            <CardContent>
              {intakeData ? (
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  {Object.entries(intakeData).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                      <span className="text-card-foreground">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Intake form not submitted yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Role Suggestions</CardTitle></CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <p className="text-muted-foreground">No roles suggested yet.</p>
              ) : (
                <div className="space-y-3">
                  {roles.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="font-medium">{r.role_title}</p>
                        {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                      </div>
                      <StatusBadge status={r.candidate_confirmed === true ? "active" : r.candidate_confirmed === false ? "rejected" : "pending"} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {["intake_submitted", "roles_suggested"].includes(status) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Role Suggestion</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Role Title *</Label><Input value={newRoleTitle} onChange={e => setNewRoleTitle(e.target.value)} placeholder="e.g. Data Analyst" /></div>
                <div><Label>Description / Rationale</Label><Textarea value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} /></div>
                <div className="flex gap-3">
                  <Button onClick={handleAddRole} disabled={addingRole || !newRoleTitle.trim()}>{addingRole ? "Adding..." : "Add Role"}</Button>
                  {status === "intake_submitted" && roles.length > 0 && (
                    <Button variant="hero" onClick={handleSuggestRoles}>Send Roles to Candidate</Button>
                  )}
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
              {credentials.length === 0 ? (
                <p className="text-muted-foreground">No credential intake submitted yet.</p>
              ) : (
                <Accordion type="single" collapsible defaultValue={credentials[0]?.id}>
                  {credentials.map((v: any) => (
                    <AccordionItem key={v.id} value={v.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">v{v.version}</span>
                          <span className="text-sm text-muted-foreground">
                            {editorProfiles[v.edited_by] || "Unknown"} · {new Date(v.created_at).toLocaleString()}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          {Object.entries(v.data as Record<string, string>).map(([key, value]) => (
                            value ? (
                              <div key={key}>
                                <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                                <span className="text-card-foreground">{value}</span>
                              </div>
                            ) : null
                          ))}
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
          {/* Record Payment Form */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Amount ($) *</Label><Input type="number" step="0.01" min="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="500.00" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={payType} onValueChange={setPayType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initial</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={payStatus} onValueChange={setPayStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Manual check, wire transfer, etc." /></div>
              <Button variant="hero" onClick={handleRecordPayment} disabled={addingPayment || !payAmount}>
                {addingPayment ? "Recording..." : "Record Payment"}
              </Button>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Payment History</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground">No payments recorded.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-start gap-4 rounded-lg border border-border p-4">
                      <div className="mt-0.5">
                        {p.status === "completed" ? <CheckCircle className="h-4 w-4 text-secondary" /> :
                         p.status === "failed" ? <XCircle className="h-4 w-4 text-destructive" /> :
                         <Clock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">${Number(p.amount).toLocaleString()} {p.currency}</p>
                          <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{p.payment_type.replace(/_/g, " ")}</p>
                        {p.notes && <p className="mt-1 text-sm text-muted-foreground">{p.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <AdminAssignmentsTab
            candidateId={candidateId}
            candidateStatus={status}
            hasCredentials={credentials.length > 0}
            onRefresh={fetchAll}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminCandidateDetail;
