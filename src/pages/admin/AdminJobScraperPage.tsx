import React, { useState, useEffect, useCallback } from "react";
import { jobScraperApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Compass, Play, RefreshCw, Plus, Trash2, CheckCircle2,
  XCircle, Clock, AlertTriangle, Layers, Database, ArrowRight
} from "lucide-react";

interface RoleConfig {
  role: string;
  limit: number;
}

const AVAILABLE_SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "indeed", label: "Indeed" },
  { id: "glassdoor", label: "Glassdoor" },
  { id: "dice", label: "Dice" },
  { id: "monster", label: "Monster" },
  { id: "ziprecruiter", label: "ZipRecruiter" },
];

export const AdminJobScraperPage = () => {
  const { toast } = useToast();

  // State
  const [dbRoles, setDbRoles] = useState<{ role: string; source: string; count: number }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<RoleConfig[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["linkedin", "indeed", "glassdoor", "dice"]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Execution states
  const [triggering, setTriggering] = useState(false);
  const [activeExecution, setActiveExecution] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [selectedExecutionModal, setSelectedExecutionModal] = useState<any>(null);

  // Fetch available roles from DB
  const fetchDbRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await jobScraperApi.roles(30);
      setDbRoles(res.data?.results || []);
    } catch (err: any) {
      console.warn("Failed to load DB roles:", err);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Fetch executions history
  const fetchExecutions = useCallback(async () => {
    setLoadingExecutions(true);
    try {
      const res = await jobScraperApi.executions({ page_size: 15 });
      setExecutions(res.data?.results || []);

      // Check if any is currently running
      const running = (res.data?.results || []).find((e: any) => e.status === "running" || e.status === "pending");
      if (running) {
        setActiveExecution(running);
      }
    } catch (err: any) {
      console.warn("Failed to load executions:", err);
    } finally {
      setLoadingExecutions(false);
    }
  }, []);

  useEffect(() => {
    fetchDbRoles();
    fetchExecutions();
  }, [fetchDbRoles, fetchExecutions]);

  // Polling for active execution
  useEffect(() => {
    if (!activeExecution || (activeExecution.status !== "running" && activeExecution.status !== "pending")) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await jobScraperApi.executionDetail(activeExecution.id);
        setActiveExecution(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") {
          fetchExecutions();
          if (res.data.status === "completed") {
            toast({
              title: "Scraping Completed",
              description: `Found ${res.data.total_jobs_found} jobs (${res.data.total_inserted} new, ${res.data.total_duplicates} duplicates).`,
            });
          } else {
            toast({
              title: "Scraping Failed",
              description: res.data.error_message || "Execution encountered an error.",
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeExecution, fetchExecutions, toast]);

  // Role selection handlers
  const handleToggleDbRole = (roleName: string) => {
    const existing = selectedRoles.find(r => r.role.toLowerCase() === roleName.toLowerCase());
    if (existing) {
      setSelectedRoles(prev => prev.filter(r => r.role.toLowerCase() !== roleName.toLowerCase()));
    } else {
      setSelectedRoles(prev => [...prev, { role: roleName, limit: 15 }]);
    }
  };

  const handleAddCustomRole = () => {
    const trimmed = customRoleInput.trim();
    if (!trimmed) return;
    if (selectedRoles.some(r => r.role.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Role already added", variant: "destructive" });
      return;
    }
    setSelectedRoles(prev => [...prev, { role: trimmed, limit: 15 }]);
    setCustomRoleInput("");
  };

  const handleUpdateLimit = (roleName: string, newLimit: number) => {
    setSelectedRoles(prev => prev.map(r => r.role === roleName ? { ...r, limit: Math.max(1, newLimit) } : r));
  };

  const handleRemoveRole = (roleName: string) => {
    setSelectedRoles(prev => prev.filter(r => r.role !== roleName));
  };

  const handleToggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      if (selectedSources.length === 1) {
        toast({ title: "At least one source portal must be selected", variant: "destructive" });
        return;
      }
      setSelectedSources(prev => prev.filter(s => s !== sourceId));
    } else {
      setSelectedSources(prev => [...prev, sourceId]);
    }
  };

  const totalRequestedJobs = selectedRoles.reduce((acc, curr) => acc + curr.limit, 0);

  // Trigger manual scrape
  const handleTriggerScraper = async () => {
    if (selectedRoles.length === 0) {
      toast({ title: "Please select at least one role to scrape", variant: "destructive" });
      return;
    }

    setTriggering(true);
    try {
      const res = await jobScraperApi.run({
        roles: selectedRoles,
        sources: selectedSources,
      });

      toast({
        title: "Scraper Triggered Successfully",
        description: `Execution started in background (ID: ${res.data.execution_id.slice(0, 8)}).`,
      });

      // Set active execution for live progress tracking
      setActiveExecution({
        id: res.data.execution_id,
        status: "pending",
        total_roles: selectedRoles.length,
        total_jobs_found: 0,
        total_inserted: 0,
        total_duplicates: 0,
        config: { roles: selectedRoles, sources: selectedSources },
      });

      fetchExecutions();
    } catch (err: any) {
      toast({
        title: "Failed to trigger scraper",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Jobs Scraper Engine
          </h1>
          <p className="text-sm text-slate-500">
            Configure target roles and execute on-demand automated scraping across supported job portals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchDbRoles(); fetchExecutions(); }}
            disabled={loadingExecutions}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingExecutions ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Execution Banner (if running) */}
      {activeExecution && (activeExecution.status === "running" || activeExecution.status === "pending") && (
        <Card className="border-blue-300 bg-blue-50/50 shadow-sm animate-pulse">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    Scraping in Progress (ID: {activeExecution.id?.slice(0, 8)})
                  </h4>
                  <p className="text-xs text-slate-600">
                    Processing {activeExecution.total_roles || activeExecution.config?.roles?.length || 0} role(s)...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                <span>Found: <strong className="text-slate-900">{activeExecution.total_jobs_found || 0}</strong></span>
                <span>New: <strong className="text-green-700">{activeExecution.total_inserted || 0}</strong></span>
                <span>Duplicates: <strong className="text-amber-700">{activeExecution.total_duplicates || 0}</strong></span>
              </div>
            </div>
            <Progress value={activeExecution.total_jobs_found ? 65 : 20} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Scraper Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Role Selection & Portals (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Step 1: Select Job Roles to Scrape
              </CardTitle>
              <CardDescription>
                Click roles from your candidate and hiring database to add them, or type a custom role below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Database Roles Badges */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                  Active Roles in Database ({dbRoles.length})
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-md border border-slate-100 bg-slate-50/50">
                  {loadingRoles ? (
                    <span className="text-xs text-slate-400 p-2">Loading roles from database...</span>
                  ) : dbRoles.length === 0 ? (
                    <span className="text-xs text-slate-400 p-2">No roles found in database.</span>
                  ) : (
                    dbRoles.map((r, i) => {
                      const isSelected = selectedRoles.some(sr => sr.role.toLowerCase() === r.role.toLowerCase());
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleToggleDbRole(r.role)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-medium"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {r.role}
                          {r.count > 0 && <span className="ml-1 opacity-75">({r.count})</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Custom Role */}
              <div className="flex gap-2">
                <Input
                  placeholder="Or enter custom role (e.g., Senior Rust Developer)..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomRole()}
                  className="text-sm"
                />
                <Button variant="secondary" onClick={handleAddCustomRole} className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Custom Role
                </Button>
              </div>

              {/* Selected Roles List with Limits */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Selected Roles & Target Job Count ({selectedRoles.length})
                  </Label>
                  {selectedRoles.length > 0 && (
                    <button
                      onClick={() => setSelectedRoles([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {selectedRoles.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg text-slate-400 text-sm">
                    No roles selected yet. Click any role above or add a custom one.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedRoles.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white shadow-xs"
                      >
                        <span className="font-medium text-sm text-slate-900 truncate max-w-[220px]">
                          {item.role}
                        </span>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-500">Jobs:</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={item.limit}
                            onChange={(e) => handleUpdateLimit(item.role, parseInt(e.target.value) || 1)}
                            className="w-18 h-8 text-center text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRole(item.role)}
                            className="h-8 w-8 text-slate-400 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Portals & Launch */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Step 2: Source Portals
              </CardTitle>
              <CardDescription>
                Select which external platforms the scraping engine will query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABLE_SOURCES.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedSources.includes(s.id)
                        ? "border-primary/50 bg-primary/5 text-slate-900 font-medium"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedSources.includes(s.id)}
                      onCheckedChange={() => handleToggleSource(s.id)}
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary & Trigger Card (1 col) */}
        <div>
          <Card className="sticky top-6 border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scraping Summary</CardTitle>
              <CardDescription>Review before launching the crawler run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm divide-y divide-slate-100">
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Selected Roles</span>
                  <strong className="text-slate-900">{selectedRoles.length}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Active Portals</span>
                  <strong className="text-slate-900">{selectedSources.length}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Total Requested Jobs</span>
                  <strong className="text-primary text-base">{totalRequestedJobs}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Execution Mode</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">Async Background</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Production Safety
                </p>
                <p>
                  Scraping executes asynchronously in the background. Duplicate vacancies are automatically flagged via SHA-256 content hashing.
                </p>
              </div>

              <Button
                onClick={handleTriggerScraper}
                disabled={triggering || selectedRoles.length === 0}
                className="w-full gap-2 text-sm font-semibold"
                size="lg"
              >
                {triggering ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Starting Scraper...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Run Scraper Now ({totalRequestedJobs} Jobs)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Execution History Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Scraper Execution History
              </CardTitle>
              <CardDescription>
                Recent manual and scheduled runs with statistics and execution logs.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Run ID</th>
                  <th className="py-2.5 px-3 font-semibold">Trigger</th>
                  <th className="py-2.5 px-3 font-semibold">Roles</th>
                  <th className="py-2.5 px-3 font-semibold">Found</th>
                  <th className="py-2.5 px-3 font-semibold">New Inserted</th>
                  <th className="py-2.5 px-3 font-semibold">Duplicates</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Started At</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingExecutions ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading executions...
                    </td>
                  </tr>
                ) : executions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No executions recorded yet. Run a scraper above or wait for the daily 6:00 PM IST schedule.
                    </td>
                  </tr>
                ) : (
                  executions.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {e.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={e.trigger_type === "scheduled" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}
                        >
                          {e.trigger_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {e.total_roles}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {e.total_jobs_found}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-green-700">
                        {e.total_inserted}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-amber-600">
                        {e.total_duplicates}
                      </td>
                      <td className="py-2.5 px-3">
                        {e.status === "completed" && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Completed
                          </Badge>
                        )}
                        {e.status === "running" && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 w-max">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Running
                          </Badge>
                        )}
                        {e.status === "failed" && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Failed
                          </Badge>
                        )}
                        {e.status === "pending" && (
                          <Badge className="bg-slate-100 text-slate-800">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {e.started_at ? formatDateTime(e.started_at) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecutionModal(e)}
                          className="h-7 text-xs"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Execution Detail Modal */}
      <Dialog
        open={!!selectedExecutionModal}
        onOpenChange={(open) => !open && setSelectedExecutionModal(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              Run ID: {selectedExecutionModal?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedExecutionModal && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <span className="text-slate-500 block">Trigger Mode</span>
                  <strong className="capitalize">{selectedExecutionModal.trigger_type}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Triggered By</span>
                  <strong>{selectedExecutionModal.triggered_by_email || "System"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <strong className="capitalize">{selectedExecutionModal.status}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration</span>
                  <strong>{selectedExecutionModal.duration_seconds} seconds</strong>
                </div>
              </div>

              {selectedExecutionModal.error_message && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-800">
                  <strong className="block mb-1">Error / Warning Message:</strong>
                  <p className="whitespace-pre-wrap">{selectedExecutionModal.error_message}</p>
                </div>
              )}

              <div>
                <Label className="font-semibold text-slate-700 block mb-1">Configured Roles</Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 bg-slate-50">
                  {(selectedExecutionModal.config?.roles || []).map((r: any, i: number) => (
                    <div key={i} className="flex justify-between py-1 border-b last:border-b-0">
                      <span>{r.role}</span>
                      <span className="text-slate-500">{r.limit} jobs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedExecutionModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobScraperPage;

