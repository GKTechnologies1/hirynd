import { useEffect, useState } from "react";
import { auditApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "registration", label: "Registration" },
  { value: "status_change", label: "Status Changes" },
  { value: "password", label: "Password" },
  { value: "login", label: "Login" },
  { value: "subscription", label: "Subscription" },
  { value: "payment", label: "Payment" },
  { value: "recruiter", label: "Recruiter" },
  { value: "credential", label: "Credential" },
  { value: "placement", label: "Placement" },
  { value: "admin", label: "Admin Actions" },
];

const AdminActivityPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await auditApi.globalLogs(actionFilter || undefined);
      setLogs(data || []);
    } catch { setLogs([]); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [actionFilter]);

  const actionColor = (action: string) => {
    if (action.includes("login")) return "bg-secondary/15 text-secondary";
    if (action.includes("password")) return "bg-accent/15 text-accent-foreground";
    if (action.includes("payment") || action.includes("subscription")) return "bg-primary/10 text-primary";
    if (action.includes("deactivat") || action.includes("rejected")) return "bg-destructive/15 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div>
            <Label className="text-xs text-muted-foreground">Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Activity Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Time</TableHead>
                    <TableHead className="text-xs font-semibold">Actor</TableHead>
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="text-xs font-semibold">Target</TableHead>
                    <TableHead className="text-xs font-semibold">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l: any) => (
                    <TableRow key={l.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {l.created_at ? format(new Date(l.created_at), "MMM d, HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{l.actor_name || l.actor?.profile?.full_name || "System"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${actionColor(l.action)}`}>
                          {l.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.target_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {l.details ? JSON.stringify(l.details).slice(0, 80) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivityPage;
