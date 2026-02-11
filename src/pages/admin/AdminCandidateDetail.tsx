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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, UserPlus, DollarSign, Shield, FileText, ClipboardList, Activity, Eye, Plus, Briefcase } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  // New role form
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const fetchAll = async () => {
    const { data: cand } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();
    setCandidate(cand);

    if (cand) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", cand.user_id)
        .single();
      setProfile(prof);

      const { data: intakeData } = await supabase
        .from("client_intake_sheets")
        .select("*")
        .eq("candidate_id", cand.id)
        .maybeSingle();
      setIntake(intakeData);

      const { data: roleData } = await supabase
        .from("role_suggestions")
        .select("*")
        .eq("candidate_id", cand.id)
        .order("created_at", { ascending: true });
      setRoles(roleData || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [candidateId]);

  const handleAddRole = async () => {
    if (!newRoleTitle.trim()) return;
    setAddingRole(true);

    const { error } = await supabase.from("role_suggestions").insert({
      candidate_id: candidateId,
      role_title: newRoleTitle.trim(),
      description: newRoleDescription.trim(),
      suggested_by: user!.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewRoleTitle("");
      setNewRoleDescription("");
      toast({ title: "Role suggestion added" });
      fetchAll();
    }
    setAddingRole(false);
  };

  const handleSuggestRoles = async () => {
    if (roles.length === 0) {
      toast({ title: "Add at least one role first", variant: "destructive" });
      return;
    }

    // Update status
    await supabase
      .from("candidates")
      .update({ status: "roles_suggested" as any })
      .eq("id", candidateId);

    // Audit log
    await supabase.from("audit_logs").insert({
      actor_id: user!.id,
      action: "roles_suggested",
      entity_type: "candidate",
      entity_id: candidateId,
      new_value: { roles_count: roles.length },
    });

    // Notify candidate via secure RPC function
    if (candidate) {
      await supabase.rpc("create_system_notification", {
        _user_id: candidate.user_id,
        _title: "Roles Suggested",
        _message: "Your team has suggested roles for your profile. Please review and confirm.",
        _link: "/candidate-dashboard/roles",
      });
    }

    toast({ title: "Roles sent to candidate for confirmation" });
    fetchAll();
  };

  if (loading) {
    return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  }

  if (!candidate) {
    return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Candidate not found.</p></DashboardLayout>;
  }

  const intakeData = intake?.data as Record<string, string> | null;

  return (
    <DashboardLayout title={`Candidate: ${profile?.full_name || "Unknown"}`} navItems={navItems}>
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={candidate.status} />
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>← Back to Candidates</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {profile?.full_name}</div>
              <div><span className="text-muted-foreground">Email:</span> {profile?.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {profile?.phone || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> {candidate.status.replace(/_/g, " ")}</div>
              <div><span className="text-muted-foreground">Registered:</span> {new Date(candidate.created_at).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="roles" className="space-y-4">
          {/* Existing roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Role Suggestions</CardTitle>
            </CardHeader>
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

          {/* Add role form — only if intake_submitted */}
          {["intake_submitted", "roles_suggested"].includes(candidate.status) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Role Suggestion</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Role Title *</Label><Input value={newRoleTitle} onChange={e => setNewRoleTitle(e.target.value)} placeholder="e.g. Data Analyst" /></div>
                <div><Label>Description / Rationale</Label><Textarea value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} placeholder="Why this role fits the candidate" /></div>
                <div className="flex gap-3">
                  <Button onClick={handleAddRole} disabled={addingRole || !newRoleTitle.trim()}>
                    {addingRole ? "Adding..." : "Add Role"}
                  </Button>
                  {candidate.status === "intake_submitted" && roles.length > 0 && (
                    <Button variant="hero" onClick={handleSuggestRoles}>
                      Send Roles to Candidate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminCandidateDetail;
