import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { recruitersApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import RecruiterCandidateDetail from "@/pages/recruiter/RecruiterCandidateDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ClipboardList, User, Eye, Search, Filter } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visaFilter, setVisaFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchCandidates = async () => {
      try {
        const { data } = await recruitersApi.myCandidates();
        setCandidates(data || []);
      } catch {
        setCandidates([]);
      }
      setLoading(false);
    };
    fetchCandidates();
  }, [user]);

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = !search || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesVisa = visaFilter === "all" || c.profile?.visa_status === visaFilter;
    return matchesSearch && matchesStatus && matchesVisa;
  });

  const subPath = location.pathname.replace("/recruiter-dashboard", "").replace(/^\//, "");
  if (subPath.startsWith("candidates/")) {
    const candidateId = subPath.replace("candidates/", "");
    return <RecruiterCandidateDetail candidateId={candidateId} />;
  }

  return (
    <DashboardLayout title="Recruiter Dashboard" navItems={navItems}>
      <Card>
        <CardHeader className="pb-3 px-6 pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-secondary" /> Assigned Candidates
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search name or email..." 
                  className="pl-9 text-sm h-9" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="client_intake">Intake</SelectItem>
                  <SelectItem value="roles_suggested">Roles Suggested</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="active_marketing">Active Marketing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={visaFilter} onValueChange={setVisaFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Visa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visas</SelectItem>
                  <SelectItem value="H1B">H1B</SelectItem>
                  <SelectItem value="OPT">OPT</SelectItem>
                  <SelectItem value="CPT">CPT</SelectItem>
                  <SelectItem value="US Citizen">US Citizen</SelectItem>
                  <SelectItem value="Green Card">Green Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                    <TableHead className="text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((c: any, i: number) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="font-medium text-sm">
                        <div>
                          {c.full_name || "—"}
                          {c.profile?.visa_status && (
                            <span className="ml-2 text-[10px] bg-secondary/10 text-secondary px-1 py-0.5 rounded">
                              {c.profile.visa_status}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
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
