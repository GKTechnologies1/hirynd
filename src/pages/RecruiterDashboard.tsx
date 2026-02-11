import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import RecruiterCandidateDetail from "@/pages/recruiter/RecruiterCandidateDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ClipboardList, User, Eye } from "lucide-react";

const navItems = [
  { label: "My Candidates", path: "/recruiter-dashboard", icon: <Users className="h-4 w-4" /> },
  { label: "Daily Log", path: "/recruiter-dashboard/daily-log", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "My Profile", path: "/recruiter-dashboard/profile", icon: <User className="h-4 w-4" /> },
];

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCandidates = async () => {
      const { data: assignments } = await supabase
        .from("candidate_assignments")
        .select("candidate_id, role_type")
        .eq("recruiter_id", user.id)
        .eq("is_active", true);

      if (assignments && assignments.length > 0) {
        const candidateIds = assignments.map((a: any) => a.candidate_id);
        const { data: cands } = await supabase
          .from("candidates")
          .select("id, status, user_id")
          .in("id", candidateIds);

        if (cands) {
          const userIds = cands.map((c: any) => c.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);

          const merged = cands.map((c: any) => ({
            ...c,
            profile: profiles?.find((p: any) => p.user_id === c.user_id),
            assignment: assignments.find((a: any) => a.candidate_id === c.id),
          }));
          setCandidates(merged);
        }
      }
      setLoading(false);
    };
    fetchCandidates();
  }, [user]);

  // Sub-routing for candidate detail
  const subPath = location.pathname.replace("/recruiter-dashboard", "").replace(/^\//, "");
  if (subPath.startsWith("candidates/")) {
    const candidateId = subPath.replace("candidates/", "");
    return <RecruiterCandidateDetail candidateId={candidateId} />;
  }

  return (
    <DashboardLayout title="Recruiter Dashboard" navItems={navItems}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Assigned Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground">No candidates assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.profile?.full_name || "—"}</TableCell>
                    <TableCell>{c.profile?.email || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="capitalize">{c.assignment?.role_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/recruiter-dashboard/candidates/${c.id}`)}>
                        <Eye className="mr-1 h-4 w-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
