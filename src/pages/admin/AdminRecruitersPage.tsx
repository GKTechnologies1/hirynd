import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, recruitersApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, UserCheck, UserX, Download, Eye, Users } from "lucide-react";
import { format } from "date-fns";

interface RecruiterItem {
  id: string;
  email: string;
  role: string;
  approval_status: string;
  is_active?: boolean;
  created_at: string;
  profile?: { full_name: string; phone: string | null };
  assigned_candidates_count?: number;
}

const AdminRecruitersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [recruiters, setRecruiters] = useState<RecruiterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editUser, setEditUser] = useState<RecruiterItem | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", role: "", approval_status: "" });
  const [saving, setSaving] = useState(false);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { role: "recruiter" };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await authApi.allUsers(params);
      setRecruiters(data || []);
    } catch { setRecruiters([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecruiters(); }, [statusFilter]);

  const handleApprove = async (userId: string, action: "approved" | "rejected") => {
    try {
      await authApi.approveUser(userId, action);
      toast({ title: `Recruiter ${action}` });
      fetchRecruiters();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const openEdit = (u: RecruiterItem) => {
    setEditUser(u);
    setEditForm({
      full_name: u.profile?.full_name || "",
      phone: u.profile?.phone || "",
      role: u.role,
      approval_status: u.approval_status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await authApi.updateUser(editUser.id, editForm);
      toast({ title: "Recruiter updated" });
      setEditUser(null);
      fetchRecruiters();
    } catch { toast({ title: "Error updating", variant: "destructive" }); }
    setSaving(false);
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Joined"];
    const rows = recruiters.map(u => [
      u.profile?.full_name || "", u.email, u.role, u.approval_status,
      format(new Date(u.created_at), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "recruiters_export.csv"; a.click();
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return "bg-secondary/15 text-secondary";
    if (s === "pending") return "bg-accent/15 text-accent-foreground";
    return "bg-destructive/15 text-destructive";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchRecruiters()} className="pl-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRecruiters}><Search className="mr-1 h-3.5 w-3.5" /> Search</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> Export</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Recruiters ({recruiters.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Role</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Joined</TableHead>
                    <TableHead className="text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruiters.map(u => (
                    <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm">{u.profile?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs bg-accent/10 text-accent-foreground capitalize">{u.role.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${statusBadge(u.approval_status)}`}>{u.approval_status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {u.approval_status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-secondary" onClick={() => handleApprove(u.id, "approved")} title="Approve">
                                <UserCheck className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleApprove(u.id, "rejected")} title="Reject">
                                <UserX className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)} title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Recruiter — {editUser.email}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div>
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="team_lead">Team Lead</SelectItem>
                    <SelectItem value="team_manager">Team Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Approval Status</Label>
                <Select value={editForm.approval_status} onValueChange={v => setEditForm(p => ({ ...p, approval_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button variant="hero" onClick={handleSaveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminRecruitersPage;
