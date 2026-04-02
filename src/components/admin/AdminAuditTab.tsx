import { useState, useEffect } from "react";
import { auditApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { Shield } from "lucide-react";

interface AdminAuditTabProps {
  targetId: string;
}

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "status_change", label: "Status Changes" },
  { value: "intake_submitted", label: "Intake" },
  { value: "roles_confirmed", label: "Roles" },
  { value: "payment_recorded", label: "Payments" },
  { value: "credential", label: "Credentials" },
  { value: "recruiter", label: "Assignments" },
  { value: "marketing", label: "Marketing" },
  { value: "placement", label: "Placement" },
  { value: "interview", label: "Interviews" },
];

const AdminAuditTab = ({ targetId }: AdminAuditTabProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const { data: allLogs } = await auditApi.candidateLogs(targetId);
        let filtered = allLogs || [];
        if (actionFilter !== "all") {
          filtered = filtered.filter((l: any) => l.action?.toLowerCase().includes(actionFilter.toLowerCase()));
        }
        if (dateFrom) filtered = filtered.filter((l: any) => l.created_at >= dateFrom);
        if (dateTo) filtered = filtered.filter((l: any) => l.created_at <= dateTo + "T23:59:59");
        setLogs(filtered);
      } catch {
        setLogs([]);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [targetId, actionFilter, dateFrom, dateTo]);

  const renderDiff = (details: any) => {
    if (!details) return "—";
    if (typeof details === "object") {
      const entries = Object.entries(details);
      if (entries.length === 0) return "—";
      return entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ").slice(0, 150);
    }
    return String(details).slice(0, 150);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Audit Log</CardTitle>
      </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="flex flex-wrap gap-3 px-6 mb-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-8 text-xs" />
            </div>
          </div>

          <DataTable
            data={logs}
            isLoading={loading}
            searchPlaceholder="Search actor..."
            searchKey="actor_name"
            emptyMessage="No audit logs found."
            columns={[
              { 
                header: "Timestamp", 
                render: (log: any) => <span className="text-xs text-muted-foreground whitespace-nowrap pl-6">{new Date(log.created_at).toLocaleString()}</span>
              },
              { 
                header: "Actor", 
                accessorKey: "actor_name",
                className: "text-sm"
              },
              { 
                header: "Action", 
                render: (log: any) => <span className="text-sm font-medium capitalize">{log.action?.replace(/_/g, " ")}</span>
              },
              { 
                header: "Details", 
                render: (log: any) => <span className="text-xs text-muted-foreground max-w-xs truncate pr-6 inline-block w-full">{renderDiff(log.details)}</span>
              }
            ]}
          />
        </CardContent>
    </Card>
  );
};

export default AdminAuditTab;
