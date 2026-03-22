import { useState, useEffect } from "react";
import { authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Search, RefreshCw, ShieldCheck, UserX, Mail } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  candidate: "bg-blue-100 text-blue-800",
  recruiter: "bg-teal-100 text-teal-800",
  team_lead: "bg-orange-100 text-orange-800",
  team_manager: "bg-pink-100 text-pink-800",
};

const APPROVAL_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
};

interface EditUserForm {
  full_name: string;
  phone: string;
  email: string;
  role: string;
  approval_status: string;
  is_active: boolean;
}

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Edit dialog
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    full_name: "", phone: "", email: "", role: "", approval_status: "", is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.allUsers();
      // all_users now returns {total, results}
      const list = data?.results ?? data ?? [];
      setUsers(list);
      setFiltered(list);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== "all") result = result.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, roleFilter, users]);

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || user.profile?.full_name || "",
      phone: user.phone || user.profile?.phone || "",
      email: user.email || "",
      role: user.role || "candidate",
      approval_status: user.approval_status || "pending",
      is_active: user.is_active !== false,
    });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await authApi.updateUser(editUser.id, editForm);
      toast({ title: "User updated successfully" });
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authApi.deleteUser(deleteTarget.id);
      toast({ title: "User deleted" });
      setDeleteTarget(null);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const quickApprove = async (user: any) => {
    try {
      await authApi.approveUser(user.id, "approved");
      toast({ title: `${user.full_name || user.email} approved` });
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const bulkApprovePending = async () => {
    const pending = users.filter(u => u.approval_status === "pending");
    if (!pending.length) { toast({ title: "No pending users" }); return; }
    await Promise.all(pending.map(u => authApi.approveUser(u.id, "approved").catch(() => {})));
    toast({ title: `Approved ${pending.length} user(s)` });
    fetchUsers();
  };

  const countByRole = (role: string) => users.filter(u => u.role === role).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground mt-1">View, edit, and manage all users across Hyrind</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
        <Button variant="default" size="sm" onClick={bulkApprovePending}>
          <ShieldCheck className="mr-2 h-4 w-4" />Approve All Pending
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Candidates", role: "candidate", color: "bg-blue-50 text-blue-700" },
          { label: "Recruiters", role: "recruiter", color: "bg-teal-50 text-teal-700" },
          { label: "Team", role: "team_lead", color: "bg-orange-50 text-orange-700" },
          { label: "Admins", role: "admin", color: "bg-purple-50 text-purple-700" },
        ].map(c => (
          <Card key={c.role} className={`${c.color} border-0`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{countByRole(c.role)}</p>
              <p className="text-sm font-medium">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="candidate">Candidate</SelectItem>
            <SelectItem value="recruiter">Recruiter</SelectItem>
            <SelectItem value="team_lead">Team Lead</SelectItem>
            <SelectItem value="team_manager">Team Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} users</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{u.full_name || "(name not set)"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />{u.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || "bg-gray-100"}`}>
                      {u.role?.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${APPROVAL_COLORS[u.approval_status] || "bg-gray-100"}`}>
                      {u.approval_status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${u.is_active !== false ? "text-green-600" : "text-red-500"}`}>
                      {u.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.approval_status === "pending" && (
                        <Button size="icon" variant="ghost" className="text-green-600" title="Quick Approve" onClick={() => quickApprove(u)}>
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="candidate">Candidate</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="team_manager">Team Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approval Status</Label>
              <Select value={editForm.approval_status} onValueChange={v => setEditForm(f => ({ ...f, approval_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Status</Label>
              <Select value={editForm.is_active ? "active" : "inactive"} onValueChange={v => setEditForm(f => ({ ...f, is_active: v === "active" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="hero" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersPage;
