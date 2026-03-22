import { useState, useEffect } from "react";
import { recruitersApi, authApi } from "@/services/api";
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
    try {
      const [assignRes, recruiterRes] = await Promise.all([
        recruitersApi.assignments(candidateId),
        authApi.allUsers({ role: 'recruiter', status: 'approved' }),
      ]);
      setAssignments(assignRes.data || []);
      setRecruiters(recruiterRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [candidateId]);

  const handleAssign = async () => {
    if (!selectedRecruiter || !selectedRole) return;
    setAssigning(true);
    try {
      await recruitersApi.assign({
        candidate: candidateId,
        recruiter: selectedRecruiter,
        role_type: selectedRole,
      });
      toast({ title: "Recruiter assigned" });
      setSelectedRecruiter("");
      setSelectedRole("");
      fetchData();
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
    setAssigning(false);
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      await recruitersApi.unassign(assignmentId);
      toast({ title: "Recruiter unassigned" });
      fetchData();
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
  };

  const handleStartMarketing = async () => {
    setStartingMarketing(true);
    try {
      await recruitersApi.startMarketing(candidateId);
      toast({ title: "Marketing started!" });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || "Failed", variant: "destructive" });
    }
    setStartingMarketing(false);
  };

  if (loading) return <p className="text-muted-foreground">Loading assignments...</p>;

  const canAssign = ["paid", "credential_completed", "active_marketing"].includes(candidateStatus);
  const canStartMarketing = ["paid", "credential_completed"].includes(candidateStatus) && hasCredentials && assignments.length > 0;

  return (
    <div className="space-y-4">
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
                    <p className="font-medium text-card-foreground">{a.recruiter_name || a.profile?.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{a.recruiter_email || a.profile?.email || ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.role_type === "primary_recruiter" ? "active" : "pending"} className="text-xs" />
                    <span className="text-xs text-muted-foreground capitalize">{(a.role_type || "").replace(/_/g, " ")}</span>
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
                      <SelectItem key={r.id} value={r.id}>{r.profile?.full_name || r.email} ({r.email})</SelectItem>
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
