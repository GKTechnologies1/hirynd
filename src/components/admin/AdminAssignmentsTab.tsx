import { useState, useEffect } from "react";
import { recruitersApi, candidatesApi, authApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
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
        authApi.allUsers({ role: 'recruiter' }),
      ]);
      setAssignments(assignRes.data || []);
      // backend returns { results: [], total: 0 }
      const recruiterList = Array.isArray(recruiterRes.data) ? recruiterRes.data : recruiterRes.data?.results || [];
      setRecruiters(recruiterList);
    } catch {
      setAssignments([]); setRecruiters([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [candidateId]);

  const handleAssign = async () => {
    if (!selectedRecruiter || !selectedRole) return;
    setAssigning(true);
    try {
      await recruitersApi.assign({ candidate: candidateId, recruiter: selectedRecruiter, role_type: selectedRole });
      toast({ title: "Recruiter assigned" });
      setSelectedRecruiter("");
      setSelectedRole("");
      fetchData();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setAssigning(false);
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      await recruitersApi.unassign(assignmentId);
      toast({ title: "Recruiter unassigned" });
      fetchData();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleStartMarketing = async () => {
    setStartingMarketing(true);
    try {
      await candidatesApi.updateStatus(candidateId, "active_marketing");
      toast({ title: "Marketing started!" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setStartingMarketing(false);
  };

  if (loading) return <p className="text-muted-foreground">Loading assignments...</p>;

  const canAssign = ["payment_completed", "credentials_submitted", "active_marketing"].includes(candidateStatus);
  const canStartMarketing = ["payment_completed", "credentials_submitted"].includes(candidateStatus) && hasCredentials && assignments.length > 0;

  return (
    <div className="space-y-4">
      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Active Assignments</CardTitle>
          <CardDescription>{assignments.length} recruiter(s) assigned</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={assignments}
            isLoading={loading}
            searchPlaceholder="Search recruiters..."
            searchKey="recruiter_name"
            emptyMessage="No recruiters assigned yet."
            columns={[
              { 
                header: "Recruiter", 
                sortable: true,
                accessorKey: "recruiter_name",
                render: (a: any) => (
                  <div className="pl-6">
                    <p className="font-medium text-sm text-card-foreground">{a.recruiter_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{a.recruiter_email}</p>
                  </div>
                )
              },
              { 
                header: "Designation", 
                sortable: true,
                accessorKey: "role_type",
                render: (a: any) => (
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.role_type === "primary_recruiter" ? "active" : "pending"} className="text-[10px]" />
                    <span className="text-xs text-muted-foreground capitalize">{a.role_type?.replace(/_/g, " ")}</span>
                  </div>
                )
              },
              { 
                header: "Actions", 
                className: "pr-6 text-right",
                render: (a: any) => (
                  <Button variant="ghost" size="sm" onClick={() => handleUnassign(a.id)} className="h-8 w-8 p-0 hover:bg-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                )
              }
            ]}
          />
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
          Recruiter assignment is available when candidate status is payment_completed, credentials_submitted, or active_marketing.
        </p>
      )}
    </div>
  );
};

export default AdminAssignmentsTab;
