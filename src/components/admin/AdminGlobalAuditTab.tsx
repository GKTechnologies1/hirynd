import { useState, useEffect } from "react";
import { auditApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "registration", label: "Registration" },
  { value: "status_change", label: "Status Changes" },
  { value: "password", label: "Password" },
  { value: "login", label: "Login" },
  { value: "subscription", label: "Subscription" },
  { value: "payment", label: "Payments" },
  { value: "recruiter", label: "Assignments" },
  { value: "credential", label: "Credentials" },
  { value: "placement", label: "Placement" },
  { value: "intake", label: "Intake" },
  { value: "interview", label: "Interviews" },
];

const actionColor = (action: string) => {
  if (action.includes("login")) return "bg-primary/10 text-primary";
  if (action.includes("registration") || action.includes("approved")) return "bg-secondary/10 text-secondary";
  if (action.includes("rejected") || action.includes("failed") || action.includes("cancel")) return "bg-destructive/10 text-destructive";
  if (action.includes("payment") || action.includes("subscription")) return "bg-accent/10 text-accent-foreground";
  return "bg-muted text-muted-foreground";
};

const AdminGlobalAuditTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const { data } = await auditApi.globalLogs(actionFilter || undefined);
        setLogs(data || []);
      } catch { setLogs([]); }
      setLoading(false);
    };
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((log: any) => {
    if (dateFrom && log.created_at < dateFrom) return false;
    if (dateTo && log.created_at > dateTo + "T23:59:59") return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Global Audit Logs</CardTitle>
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

        {loading ? <p className="text-muted-foreground">Loading...</p> : filteredLogs.length === 0 ? <p className="text-muted-foreground">No audit logs found.</p> : (
          <div className="rounded-xl border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Timestamp</TableHead>
                  <TableHead className="text-xs font-semibold">Actor</TableHead>
                  <TableHead className="text-xs font-semibold">Action</TableHead>
                  <TableHead className="text-xs font-semibold">Entity</TableHead>
                  <TableHead className="text-xs font-semibold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{log.actor_name || "System"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${actionColor(log.action)}`}>
                        {(log.action || "").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{(log.target_type || log.entity_type || "").replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminGlobalAuditTab;
