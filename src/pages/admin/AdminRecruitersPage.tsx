import { useState, useEffect } from "react";
import { authApi, candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, MapPin, UserCheck, UserPlus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminRecruitersPage = () => {
  const { toast } = useToast();
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.allUsers();
      const list = data?.results ?? data ?? [];
      // Filter for recruiters and team leads
      setRecruiters(list.filter((u: any) => u.role === "recruiter" || u.role === "team_lead"));
    } catch (err: any) {
      toast({ title: "Error fetch recruiters", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecruiters(); }, []);

  const filtered = recruiters.filter(r => 
    (r.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Recruiter Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor recruitment team performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecruiters} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9" 
            placeholder="Search recruiters by name or email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="h-10 px-4">
          {filtered.length} Total Recruiters
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 transition-colors">
                <TableHead className="py-4">Recruiter Info</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading recruiters...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No recruiters found.</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {r.full_name?.[0] || r.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{r.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-secondary/5 border-secondary/20 text-secondary">
                      {r.role?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" /> {r.phone || "No phone"}
                      </p>
                      {r.profile?.city && (
                        <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {r.profile.city}, {r.profile.country}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.approval_status === "approved" ? "default" : "secondary"} className="h-5 text-[10px] uppercase">
                      {r.approval_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                      View Performance
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Quick Assign / Team Overview sections could go here */}
    </div>
  );
};

export default AdminRecruitersPage;
