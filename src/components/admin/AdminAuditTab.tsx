import { useState, useEffect } from "react";
import { auditApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { Shield } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";

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
        
        if (dateFrom) {
          let dFrom = dateFrom;
          if (dFrom.includes("-") && dFrom.split("-")[0].length === 2) {
            try {
              const parsed = parse(dFrom, "MM-dd-yyyy", new Date());
              if (!isNaN(parsed.getTime())) dFrom = format(parsed, "yyyy-MM-dd");
            } catch(e) {}
          }
          filtered = filtered.filter((l: any) => l.created_at >= dFrom);
        }
        
        if (dateTo) {
          let dTo = dateTo;
          if (dTo.includes("-") && dTo.split("-")[0].length === 2) {
            try {
              const parsed = parse(dTo, "MM-dd-yyyy", new Date());
              if (!isNaN(parsed.getTime())) dTo = format(parsed, "yyyy-MM-dd");
            } catch(e) {}
          }
          filtered = filtered.filter((l: any) => l.created_at <= dTo + "T23:59:59");
        }
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
              <DatePicker value={dateFrom} onChange={setDateFrom} className="w-40 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">To Date</Label>
              <DatePicker value={dateTo} onChange={setDateTo} className="w-40 h-8 text-xs" />
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
                sortable: true,
                accessorKey: "created_at",
                render: (log: any) => <span className="text-xs text-muted-foreground whitespace-nowrap pl-6">{new Date(log.created_at).toLocaleString()}</span>
              },
              { 
                header: "Actor", 
                accessorKey: "actor_name",
                sortable: true,
                className: "text-sm",
                render: (log: any) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{log.actor_name}</span>
                    {log.actor_display_id && <span className="text-[10px] font-bold text-muted-foreground opacity-60">{log.actor_display_id}</span>}
                  </div>
                )
              },
              { 
                header: "Action", 
                sortable: true,
                accessorKey: "action",
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
