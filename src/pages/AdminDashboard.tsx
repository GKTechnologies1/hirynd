import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AdminCandidateDetail from "@/pages/admin/AdminCandidateDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, ClipboardList, Shield, FileText, DollarSign, UserPlus, Activity, Eye, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
];

const STATUSES = [
  "lead", "approved", "intake_submitted", "roles_suggested", "roles_confirmed",
  "paid", "credential_completed", "active_marketing", "paused", "cancelled", "placed"
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: cands } = await supabase.from("candidates").select("*");
    if (cands) {
      const userIds = cands.map((c: any) => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const merged = cands.map((c: any) => ({
        ...c,
        profile: profiles?.find((p: any) => p.user_id === c.user_id),
      }));
      setCandidates(merged);

      const counts: Record<string, number> = {};
      STATUSES.forEach((s) => { counts[s] = 0; });
      cands.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setPipelineCounts(counts);
    }

    // Fetch admin notifications
    if (user) {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(notifs || []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    const old = candidates.find((c) => c.id === candidateId);
    const { error } = await supabase
      .from("candidates")
      .update({ status: newStatus as any })
      .eq("id", candidateId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("audit_logs").insert({
        actor_id: user!.id,
        action: "status_change",
        entity_type: "candidate",
        entity_id: candidateId,
        old_value: { status: old?.status },
        new_value: { status: newStatus },
      });
      toast({ title: "Status updated" });
      fetchData();
    }
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Sub-routing
  const subPath = location.pathname.replace("/admin-dashboard", "").replace(/^\//, "");

  // Candidate detail view: /admin-dashboard/candidates/:id
  if (subPath.startsWith("candidates/")) {
    const candidateId = subPath.replace("candidates/", "");
    return <AdminCandidateDetail candidateId={candidateId} />;
  }

  const pipelineWidgets = [
    { key: "lead", label: "New Leads", icon: <Activity className="h-4 w-4" /> },
    { key: "approved", label: "Approved", icon: <Users className="h-4 w-4" /> },
    { key: "intake_submitted", label: "Intake Pending", icon: <FileText className="h-4 w-4" /> },
    { key: "roles_suggested", label: "Roles Suggested", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "roles_confirmed", label: "Roles Confirmed", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "paid", label: "Paid", icon: <DollarSign className="h-4 w-4" /> },
    { key: "active_marketing", label: "Active Marketing", icon: <Activity className="h-4 w-4" /> },
    { key: "placed", label: "Placed", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout title="Admin Operations" navItems={navItems}>
      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications ({notifications.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className="flex items-start justify-between rounded-lg border border-border bg-accent/5 p-3">
                <div className="flex-1">
                  <p className="font-medium text-card-foreground text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.link && <Button variant="outline" size="sm" onClick={() => navigate(n.link)}>View</Button>}
                  <Button variant="ghost" size="sm" onClick={() => markNotifRead(n.id)}>✓</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pipeline Widgets */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pipelineWidgets.map((w) => (
          <Card key={w.key}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                {w.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{pipelineCounts[w.key] || 0}</p>
                <p className="text-sm text-muted-foreground">{w.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Change Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.profile?.full_name || "—"}</TableCell>
                    <TableCell>{c.profile?.email || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(val) => handleStatusChange(c.id, val)}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin-dashboard/candidates/${c.id}`)}>
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

export default AdminDashboard;
