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
import { motion } from "framer-motion";

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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-secondary" /> Assigned Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-card-foreground">No candidates assigned yet</p>
              <p className="text-xs text-muted-foreground mt-1">Candidates will appear here once assigned by an admin.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Designation</TableHead>
                    <TableHead className="text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c: any, i: number) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="font-medium text-sm">{c.profile?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.profile?.email || "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="capitalize text-sm">{c.assignment?.role_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/recruiter-dashboard/candidates/${c.id}`)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
