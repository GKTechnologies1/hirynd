import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { candidatesApi } from "@/services/api";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Activity, CheckCircle, FileText, ClipboardList, DollarSign, Briefcase, Users, AlertTriangle, MousePointer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";


const STATUSES = [
  "pending_approval", "lead", "approved", "intake_submitted", "roles_published",
  "roles_confirmed", "payment_completed", "credentials_submitted", "active_marketing", "paused", "cancelled", "placed_closed"
];

const AdminCandidatesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cands } = await candidatesApi.list();
      if (cands) {
        setCandidates(cands);
        const counts: Record<string, number> = {};
        STATUSES.forEach((s) => { counts[s] = 0; });
        cands.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
        setPipelineCounts(counts);
      }
    } catch (err: any) {
      toast({ title: "Error fetching candidates", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await candidatesApi.updateStatus(candidateId, newStatus);
      toast({ title: "Status updated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const pipelineWidgets = [
    { key: "lead", label: "New Leads", count: pipelineCounts["lead"] || 0, icon: <Activity className="h-4 w-4" />, filter: "lead", color: "bg-muted" },
    { key: "approved", label: "Approved", count: pipelineCounts["approved"] || 0, icon: <CheckCircle className="h-4 w-4" />, filter: "approved", color: "bg-secondary/10" },
    { key: "intake_submitted", label: "Intake Submitted", count: pipelineCounts["intake_submitted"] || 0, icon: <FileText className="h-4 w-4" />, filter: "intake_submitted", color: "bg-accent/10" },
    { key: "roles_published", label: "Roles Published", count: pipelineCounts["roles_published"] || 0, icon: <Briefcase className="h-4 w-4" />, filter: "roles_published", color: "bg-accent/10" },
    { key: "roles_confirmed", label: "Roles Confirmed", count: pipelineCounts["roles_confirmed"] || 0, icon: <ClipboardList className="h-4 w-4" />, filter: "roles_confirmed", color: "bg-accent/20" },
    { key: "payment_completed", label: "Payment Completed", count: pipelineCounts["payment_completed"] || 0, icon: <DollarSign className="h-4 w-4" />, filter: "payment_completed", color: "bg-secondary/20" },
    { key: "credentials_submitted", label: "Credentials Ready", count: pipelineCounts["credentials_submitted"] || 0, icon: <Briefcase className="h-4 w-4" />, filter: "credentials_submitted", color: "bg-secondary/30" },
    { key: "active_marketing", label: "Active Marketing", count: pipelineCounts["active_marketing"] || 0, icon: <Activity className="h-4 w-4" />, filter: "active_marketing", color: "bg-secondary/40" },
    { key: "placed_closed", label: "Placed", count: pipelineCounts["placed_closed"] || 0, icon: <Users className="h-4 w-4" />, filter: "placed_closed", color: "bg-secondary text-secondary-foreground" },
  ];

  const filteredCandidates = activeFilter
    ? candidates.filter(c => c.status === activeFilter)
    : candidates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Candidate Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage the end-to-end candidate lifecycle</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {pipelineWidgets.map((w, i) => (
          <motion.div
            key={w.key}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === w.filter ? "ring-2 ring-secondary" : ""}`}
              onClick={() => setActiveFilter(prev => prev === w.filter ? null : w.filter)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${w.color}`}>
                  {w.icon}
                </div>
                <div>
                  <p className="text-xl font-bold">{w.count}</p>
                  <p className="text-xs text-muted-foreground">{w.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          <StatusBadge status={activeFilter} />
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveFilter(null)}>Clear Filter</Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Candidate Records</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCandidates}
            isLoading={loading}
            searchKey="full_name"
            searchPlaceholder="Search candidates by name..."
            emptyMessage="No candidates found in this stage."
            columns={[
              { header: "Name", accessorKey: "full_name", className: "text-xs font-semibold" },
              { header: "Email", accessorKey: "email", className: "text-xs font-semibold" },
              { 
                header: "Status", 
                render: (c: any) => <StatusBadge status={c.status} />,
                className: "text-xs font-semibold"
              },
              { 
                header: "Update Status", 
                render: (c: any) => (
                  <Select value={c.status} onValueChange={(val) => handleStatusChange(c.id, val)}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
                className: "text-xs font-semibold"
              },
              { 
                header: "Actions", 
                render: (c: any) => (
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => navigate(`/admin-dashboard/candidates/${c.id}`)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Detail
                  </Button>
                ),
                className: "text-xs font-semibold text-right"
              }
            ]}
          />
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminCandidatesPage;
