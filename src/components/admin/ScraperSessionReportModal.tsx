import React, { useState, useEffect, useCallback } from "react";
import { jobScraperApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import {
  RefreshCw,
  BarChart3,
  Layers,
  Users,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Send,
  Check,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

interface ScraperSessionReportModalProps {
  execution: any | null;
  open: boolean;
  onClose: () => void;
}

export const ScraperSessionReportModal: React.FC<ScraperSessionReportModalProps> = ({
  execution,
  open,
  onClose,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [rolesBreakdown, setRolesBreakdown] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any>(null);

  // Assignment Form State
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);
  const [selectedRoleForAssign, setSelectedRoleForAssign] = useState<string>("all");
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const loadSessionData = useCallback(async (execId: string) => {
    setLoading(true);
    try {
      const [repRes, rolesRes, distRes] = await Promise.all([
        jobScraperApi.sessionReport(execId).catch(() => ({ data: null })),
        jobScraperApi.rolesBreakdown(execId).catch(() => ({ data: [] })),
        jobScraperApi.distribution(execId).catch(() => ({ data: null })),
      ]);
      setReport(repRes.data);
      setRolesBreakdown(rolesRes.data || []);
      setDistributionData(distRes.data || null);
    } catch (err) {
      console.error("Failed to load session report data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && execution?.id) {
      loadSessionData(execution.id);
      setSelectedRecruiterIds([]);
      setAssignNotes("");
      setSelectedRoleForAssign("all");
    } else {
      setReport(null);
      setRolesBreakdown([]);
      setDistributionData(null);
    }
  }, [open, execution, loadSessionData]);

  const handleToggleRecruiter = (recruiterId: string) => {
    setSelectedRecruiterIds((prev) =>
      prev.includes(recruiterId)
        ? prev.filter((id) => id !== recruiterId)
        : [...prev, recruiterId]
    );
  };

  const handleExecuteAssign = async () => {
    if (!execution?.id || selectedRecruiterIds.length === 0) {
      toast({
        title: "Recruiters Required",
        description: "Please select at least one recruiter for job distribution.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingAssign(true);
    try {
      const res = await jobScraperApi.assign(execution.id, {
        recruiter_ids: selectedRecruiterIds,
        role_names: selectedRoleForAssign === "all" ? [] : [selectedRoleForAssign],
        notes: assignNotes,
      });

      toast({
        title: "Distribution Complete",
        description: res.data?.message || "Jobs successfully distributed to recruiters.",
      });

      // Reload distribution & roles data
      await loadSessionData(execution.id);
      setSelectedRecruiterIds([]);
      setAssignNotes("");
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.response?.data?.error || "Could not distribute jobs.",
        variant: "destructive",
      });
    } finally {
      setSubmittingAssign(false);
    }
  };

  if (!execution) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Scraping Execution Audit Report
              </DialogTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {execution.id.slice(0, 8)}
              </Badge>
            </div>
            <Badge
              variant="outline"
              className={
                execution.status === "completed"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : execution.status === "failed"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
              }
            >
              {execution.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Started: {formatDateTime(execution.started_at)} • Type: {execution.trigger_type}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Generating comprehensive session report and role breakdown...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-9 mb-4">
              <TabsTrigger value="summary" className="text-xs">
                Session Summary
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-xs">
                Per-Role Report ({rolesBreakdown.length})
              </TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">
                Recruiter Distribution
              </TabsTrigger>
              <TabsTrigger value="costs" className="text-xs">
                Cost Analytics ($)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SESSION SUMMARY */}
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <Card className="p-3 bg-slate-50 border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Requested</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {report?.total_jobs_requested ?? (execution.config?.roles?.reduce((acc: number, r: any) => acc + (r.limit || 15), 0) || 0)}
                  </span>
                </Card>
                <Card className="p-3 bg-blue-50/50 border-blue-200">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">Collected</span>
                  <span className="text-xl font-extrabold text-blue-700">
                    {report?.total_jobs_collected ?? execution.total_jobs_found}
                  </span>
                </Card>
                <Card className="p-3 bg-emerald-50/50 border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">New Inserted</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    {report?.total_unique_jobs ?? execution.total_inserted}
                  </span>
                </Card>
                <Card className="p-3 bg-sky-50/50 border-sky-200">
                  <span className="text-[10px] text-sky-600 uppercase font-bold block">Updated</span>
                  <span className="text-xl font-extrabold text-sky-700">
                    {report?.total_updated ?? execution.total_updated ?? 0}
                  </span>
                </Card>
                <Card className="p-3 bg-amber-50/50 border-amber-200">
                  <span className="text-[10px] text-amber-600 uppercase font-bold block">Duplicates</span>
                  <span className="text-xl font-extrabold text-amber-700">
                    {report?.total_duplicates ?? execution.total_duplicates}
                  </span>
                </Card>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <Card className="p-3 bg-purple-50/50 border-purple-200">
                  <span className="text-[10px] text-purple-600 uppercase font-bold block">Scored</span>
                  <span className="text-xl font-extrabold text-purple-700">
                    {report?.total_scored_jobs ?? 0}
                  </span>
                </Card>
                <Card className="p-3 bg-emerald-50/50 border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Qualified</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    {report?.total_qualified ?? Math.max(0, (report?.total_jobs_collected ?? execution.total_jobs_found ?? 0) - (report?.total_below_threshold ?? 0))}
                  </span>
                </Card>
                <Card className="p-3 bg-rose-50/50 border-rose-200">
                  <span className="text-[10px] text-rose-600 uppercase font-bold block">Below Threshold</span>
                  <span className="text-xl font-extrabold text-rose-700">
                    {report?.total_below_threshold ?? 0}
                  </span>
                </Card>
                <Card className="p-3 bg-slate-50 border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Metered API Calls</span>
                  <span className="text-xl font-extrabold text-slate-800">
                    {report?.api_calls_count ?? execution.api_calls_count ?? 0}
                  </span>
                </Card>
                <Card className="p-3 bg-emerald-50/50 border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Session Cost</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    ${Number(report?.total_cost_usd ?? execution.total_cost_usd ?? 0).toFixed(4)}
                  </span>
                </Card>
              </div>

              {/* Execution Details Table */}
              <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-800 border-b">
                  Execution Parameters & Metadata
                </div>
                <div className="divide-y divide-slate-100 p-1">
                  <div className="grid grid-cols-3 px-3 py-1.5">
                    <span className="text-slate-500">Initiated By</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      {report?.started_by || execution.triggered_by_email}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-3 py-1.5">
                    <span className="text-slate-500">Execution Mode</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      {report?.execution_mode || execution.config?.mode || "STANDARD"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-3 py-1.5">
                    <span className="text-slate-500">Minimum Score Filter</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      {report?.minimum_score ? `${report.minimum_score}/100` : "None (All jobs retained)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-3 py-1.5">
                    <span className="text-slate-500">Active Portals</span>
                    <span className="col-span-2 flex flex-wrap gap-1">
                      {(execution.config?.sources || []).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px] capitalize">
                          {s}
                        </Badge>
                      ))}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-3 py-1.5">
                    <span className="text-slate-500">Duration</span>
                    <span className="col-span-2 font-medium text-slate-900">
                      {report?.duration_seconds || execution.duration_seconds || 0} seconds
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PER-ROLE SCRAPING REPORT */}
            <TabsContent value="roles" className="space-y-3">
              <div className="rounded-md border border-slate-200 overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-right">Requested</th>
                      <th className="py-2.5 px-3 text-right">Collected</th>
                      <th className="py-2.5 px-3 text-right">Unique</th>
                      <th className="py-2.5 px-3 text-right">Duplicates</th>
                      <th className="py-2.5 px-3 text-right">Scored</th>
                      <th className="py-2.5 px-3 text-right">Assigned</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rolesBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No per-role records found for this execution.
                        </td>
                      </tr>
                    ) : (
                      rolesBreakdown.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-semibold text-slate-900">{r.role}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{r.requested}</td>
                          <td className="py-2 px-3 text-right font-medium text-blue-700">{r.collected}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">{r.unique}</td>
                          <td className="py-2 px-3 text-right text-amber-600">{r.duplicates}</td>
                          <td className="py-2 px-3 text-right text-purple-700">{r.scored}</td>
                          <td className="py-2 px-3 text-right text-indigo-700 font-medium">{r.assigned}</td>
                          <td className="py-2 px-3 text-right text-slate-500 font-medium">{r.remaining}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 3: RECRUITER DISTRIBUTION & ASSIGNMENT */}
            <TabsContent value="distribution" className="space-y-4">
              <div className="space-y-2">
                <span className="font-semibold text-slate-900 text-xs block">
                  Current Recruiter Distribution for this Session:
                </span>
                <div className="rounded-md border border-slate-200 overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Recruiter</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3 text-right">Jobs Visible</th>
                        <th className="py-2 px-3">Distributed Roles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {distributionData?.distributed_recruiters?.length > 0 ? (
                        distributionData.distributed_recruiters.map((rec: any) => (
                          <tr key={rec.recruiter_id}>
                            <td className="py-2 px-3 font-medium text-slate-900">{rec.name}</td>
                            <td className="py-2 px-3 text-slate-500">{rec.email}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              {rec.assigned_jobs_count}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {(rec.roles || []).map((rl: string) => (
                                  <Badge key={rl} variant="outline" className="text-[10px]">
                                    {rl}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No custom assignments created yet. (Recruiters see jobs matching their assigned candidate roles by default).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assignment Form */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
                <span className="font-bold text-slate-900 text-xs block flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-primary" />
                  Distribute Opportunities to Additional Recruiters
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Filter Target Role to Distribute:
                    </Label>
                    <select
                      value={selectedRoleForAssign}
                      onChange={(e) => setSelectedRoleForAssign(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-200 rounded px-2"
                    >
                      <option value="all">All Roles in Session</option>
                      {rolesBreakdown.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.role} ({r.unique} jobs)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Distribution Note (Optional):
                    </Label>
                    <Input
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      placeholder="e.g. Distributed for Q4 recruitment drive"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                    Select Recruiter(s) ({selectedRecruiterIds.length} selected):
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-white rounded border border-slate-200">
                    {(distributionData?.available_recruiters || []).map((rec: any) => (
                      <label
                        key={rec.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${selectedRecruiterIds.includes(rec.id)
                          ? "bg-primary/10 font-semibold text-primary"
                          : "hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <Checkbox
                          checked={selectedRecruiterIds.includes(rec.id)}
                          onCheckedChange={() => handleToggleRecruiter(rec.id)}
                        />
                        <span className="truncate">{rec.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleExecuteAssign}
                    disabled={submittingAssign || selectedRecruiterIds.length === 0}
                    className="h-8 text-xs font-semibold"
                  >
                    {submittingAssign ? "Distributing..." : "Distribute Selected Jobs"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: COST ANALYTICS */}
            <TabsContent value="costs" className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-emerald-50/50 border-emerald-200">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">Total Session Cost</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    ${Number(report?.total_cost_usd ?? execution.total_cost_usd ?? 0).toFixed(4)}
                  </span>
                </Card>
                <Card className="p-3 bg-blue-50/50 border-blue-200">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block">Metered API Calls</span>
                  <span className="text-xl font-extrabold text-blue-700">
                    {report?.api_calls_count ?? execution.api_calls_count ?? 0}
                  </span>
                </Card>
                <Card className="p-3 bg-slate-50 border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Cost per Unique Job</span>
                  <span className="text-xl font-extrabold text-slate-800">
                    {report?.total_unique_jobs > 0
                      ? `$${((report?.total_cost_usd || 0) / report?.total_unique_jobs).toFixed(4)}`
                      : "$0.0000"}
                  </span>
                </Card>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <span className="font-semibold text-slate-900 block">Cost Attribution & Methodology:</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Scraping executions query external job search platforms via metered Apify Actor workloads. Costs are captured directly from actual billable provider responses (usageTotalUsd) or calculated based on actor query rate cards. Financial cost data is strictly restricted to administrative users.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="border-t pt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Close Audit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScraperSessionReportModal;

