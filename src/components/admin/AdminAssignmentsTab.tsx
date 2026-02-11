import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, XCircle, Rocket, Users } from "lucide-react";

interface AdminAssignmentsTabProps {
  candidateId: string;
  candidateStatus: string;
  hasCredentials: boolean;
  onRefresh: () => void;
}

const ROLE_TYPES = [
  { value: "primary_recruiter", label: "Primary Recruiter" },
  { value: "secondary_recruiter", label: "Secondary Recruiter" },
  { value: "team_lead", label: "Team Lead" },
  { value: "team_manager", label: "Team Manager" },
];

const AdminAssignmentsTab = ({ candidateId, candidateStatus, hasCredentials, onRefresh }: AdminAssignmentsTabProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [startingMarketing, setStartingMarketing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Fetch active assignments
    const { data: assigns } = await supabase
      .from("candidate_assignments")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("is_active", true);

    if (assigns && assigns.length > 0) {
      const recruiterIds = assigns.map((a: any) => a.recruiter_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", recruiterIds);
      setAssignments(assigns.map((a: any) => ({
        ...a,
        profile: profiles?.find((p: any) => p.user_id === a.recruiter_id),
      })));
    } else {
      setAssignments([]);
    }

    // Fetch all recruiters for dropdown
    const { data: recruiterRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "recruiter");
    if (recruiterRoles && recruiterRoles.length > 0) {
      const rIds = recruiterRoles.map((r: any) => r.user_id);
      const { data: rProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", rIds);
      setRecruiters(rProfiles || []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [candidateId]);

  const handleAssign = async () => {
    if (!selectedRecruiter || !selectedRole) return;
    setAssigning(true);
    const { error } = await supabase.rpc("admin_assign_recruiter", {
      _candidate_id: candidateId,
      _recruiter_id: selectedRecruiter,
      _role_type: selectedRole,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Recruiter assigned" });
      setSelectedRecruiter("");
      setSelectedRole("");
      fetchData();
      onRefresh();
    }
    setAssigning(false);
  };

  const handleUnassign = async (assignmentId: string) => {
    const { error } = await supabase.rpc("admin_unassign_recruiter", {
      _assignment_id: assignmentId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Recruiter unassigned" });
      fetchData();
      onRefresh();
    }
  };

  const handleStartMarketing = async () => {
    setStartingMarketing(true);
    const { error } = await supabase.rpc("admin_start_marketing", {
      _candidate_id: candidateId,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marketing started!" });
      onRefresh();
    }
    setStartingMarketing(false);
  };

  if (loading) return <p className="text-muted-foreground">Loading assignments...</p>;

  const canAssign = ["paid", "credential_completed", "active_marketing"].includes(candidateStatus);
  const canStartMarketing = ["paid", "credential_completed"].includes(candidateStatus) && hasCredentials && assignments.length > 0;

  return (
    <div className="space-y-4">
      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Active Assignments</CardTitle>
          <CardDescription>{assignments.length} recruiter(s) assigned</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground">No recruiters assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-card-foreground">{a.profile?.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{a.profile?.email}</p>
                    {a.profile?.phone && <p className="text-xs text-muted-foreground">{a.profile.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.role_type === "primary_recruiter" ? "active" : "pending"} className="text-xs" />
                    <span className="text-xs text-muted-foreground capitalize">{a.role_type.replace(/_/g, " ")}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleUnassign(a.id)}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign New */}
      {canAssign && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Assign Recruiter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Recruiter</Label>
                <Select value={selectedRecruiter} onValueChange={setSelectedRecruiter}>
                  <SelectTrigger><SelectValue placeholder="Select recruiter" /></SelectTrigger>
                  <SelectContent>
                    {recruiters.map((r: any) => (
                      <SelectItem key={r.user_id} value={r.user_id}>{r.full_name} ({r.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAssign} disabled={assigning || !selectedRecruiter || !selectedRole}>
              {assigning ? "Assigning..." : "Assign Recruiter"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start Marketing */}
      {canStartMarketing && (
        <Card className="border-secondary/30">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-card-foreground">Ready to Start Marketing</p>
              <p className="text-sm text-muted-foreground">Credentials submitted and recruiter assigned.</p>
            </div>
            <Button variant="hero" onClick={handleStartMarketing} disabled={startingMarketing}>
              <Rocket className="mr-2 h-4 w-4" /> {startingMarketing ? "Starting..." : "Start Marketing"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!canAssign && (
        <p className="text-sm text-muted-foreground">
          Recruiter assignment is available when candidate status is paid, credential_completed, or active_marketing.
        </p>
      )}
    </div>
  );
};

export default AdminAssignmentsTab;
