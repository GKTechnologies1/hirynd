import { useState, useEffect } from "react";
import { auditApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";

interface AdminAuditTabProps {
  candidateId: string;
}

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
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

const AdminAuditTab = ({ candidateId }: AdminAuditTabProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (actionFilter) params.action = actionFilter;
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;
        const { data } = await auditApi.candidateLogs(candidateId, params);
        setLogs(data || []);
      } catch { setLogs([]); }
      setLoading(false);
    };
    fetchLogs();
  }, [candidateId, actionFilter, dateFrom, dateTo]);

  const renderDiff = (oldVal: any, newVal: any) => {
    if (!oldVal && !newVal) return "—";
    const parts: string[] = [];
    if (oldVal && typeof oldVal === "object") {
      Object.keys(oldVal).forEach(k => {
        if (newVal && newVal[k] !== oldVal[k]) {
          parts.push(`${k}: ${oldVal[k]} → ${newVal[k]}`);
        }
      });
    }
    if (parts.length > 0) return parts.join(", ");
    if (newVal && typeof newVal === "object") return Object.entries(newVal).map(([k, v]) => `${k}: ${v}`).join(", ");
    return JSON.stringify(newVal || oldVal);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <Label className="text-xs">Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          </div>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> : logs.length === 0 ? <p className="text-muted-foreground">No audit logs found.</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{log.actor_name || "System"}</TableCell>
                  <TableCell className="text-sm font-medium capitalize">{(log.action || "").replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{renderDiff(log.old_value, log.new_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAuditTab;
