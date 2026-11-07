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
  XCircle, Clock, AlertTriangle, Layers, Database, Building2,
  Search, ShieldCheck, Award, ExternalLink, X, Info, Globe
} from "lucide-react";

interface RoleConfig {
  role: string;
  limit: number;
}

interface CompanyVisaItem {
  id: number;
  company_name: string;
  company_name_norm: string;
  h1b_total_filings: number;
  h1b_approvals: number;
  h1b_denials: number;
  h1b_approval_rate: string | number;
  h1b_avg_salary?: number;
  green_card_sponsor?: boolean;
  everify_enrolled?: boolean;
  visa_friendly_score: number;
  visa_grade?: string;
  aliases?: string[];
}

const AVAILABLE_SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "indeed", label: "Indeed" },
  { id: "glassdoor", label: "Glassdoor" },
  { id: "dice", label: "Dice" },
  { id: "monster", label: "Monster" },
  { id: "ziprecruiter", label: "ZipRecruiter" },
];

const getGradeBadge = (grade?: string, score?: number) => {
  if (!grade) {
    return <Badge variant="outline" className="text-[11px] text-slate-500">Unrated</Badge>;
  }
  const g = grade.toUpperCase();
  let color = "bg-slate-100 text-slate-700 border-slate-300";
  if (g === "A") color = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
  else if (g === "B") color = "bg-blue-100 text-blue-800 border-blue-300 font-semibold";
  else if (g === "C") color = "bg-amber-100 text-amber-800 border-amber-300 font-medium";
  else if (g === "D") color = "bg-orange-100 text-orange-800 border-orange-300";
  else if (g === "E" || g === "F") color = "bg-red-100 text-red-800 border-red-300";

  return (
    <Badge variant="outline" className={`${color} px-1.5 py-0.5 text-[11px] flex items-center gap-1`}>
      <Award className="h-3 w-3" />
      Grade {g} {score !== undefined && score > 0 ? `(${score})` : ""}
    </Badge>
  );
};

export const AdminJobScraperPage = () => {
  const { toast } = useToast();

  // Roles state
  const [dbRoles, setDbRoles] = useState<{ role: string; source: string; count: number }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<RoleConfig[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Scraping mode state (Mode A vs Mode B)
  const [scrapeMode, setScrapeMode] = useState<"STANDARD" | "VISA_FILTERED">("STANDARD");
  const [minimumScore, setMinimumScore] = useState<number>(70);

  // Companies state (from Visa Refresh DB)
  const [companySearch, setCompanySearch] = useState("");
  const [dbCompanies, setDbCompanies] = useState<CompanyVisaItem[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<CompanyVisaItem[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [viewCompanyModal, setViewCompanyModal] = useState<any>(null);

  // Sources & executions state
  const [selectedSources, setSelectedSources] = useState<string[]>(["linkedin", "indeed", "glassdoor", "dice"]);
  const [triggering, setTriggering] = useState(false);
  const [activeExecution, setActiveExecution] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [selectedExecutionModal, setSelectedExecutionModal] = useState<any>(null);

  // Fetch roles from DB
  const fetchDbRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await jobScraperApi.roles(40);
      setDbRoles(res.data?.results || []);
    } catch (err: any) {
      console.warn("Failed to load DB roles:", err);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Fetch companies from Visa Refresh DB
  const fetchCompanies = useCallback(async (query: string = "") => {
    setLoadingCompanies(true);
    try {
      const res = await jobScraperApi.companies({
        search: query.trim() || undefined,
        page_size: 15,
        ordering: "-h1b_total_filings",
      });
      setDbCompanies(res.data?.results || []);
    } catch (err: any) {
      console.warn("Failed to load companies from Visa DB:", err);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  // Fetch executions history
  const fetchExecutions = useCallback(async () => {
    setLoadingExecutions(true);
    try {
      const res = await jobScraperApi.executions({ page_size: 15 });
      setExecutions(res.data?.results || []);

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
    fetchCompanies("");
    fetchExecutions();
  }, [fetchDbRoles, fetchCompanies, fetchExecutions]);

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
              description: `Inserted ${res.data.total_inserted} new vacancies (${res.data.total_duplicates} duplicates avoided).`,
            });
          } else {
            toast({
              title: "Scraping Run Ended with Notice",
              description: res.data.error_message || "Execution encountered warnings.",
              variant: "destructive",
            });
          }
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeExecution, fetchExecutions, toast]);

  // Role Handlers
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

  // Company Handlers
  const handleToggleCompany = (company: CompanyVisaItem) => {
    const exists = selectedCompanies.some(c => c.company_name.toLowerCase() === company.company_name.toLowerCase());
    if (exists) {
      setSelectedCompanies(prev => prev.filter(c => c.company_name.toLowerCase() !== company.company_name.toLowerCase()));
    } else {
      setSelectedCompanies(prev => [...prev, company]);
    }
  };

  const handleRemoveCompany = (companyName: string) => {
    setSelectedCompanies(prev => prev.filter(c => c.company_name !== companyName));
  };

  const handleViewCompanyDetail = async (companyId: number) => {
    try {
      const res = await jobScraperApi.companyVisaDetail(companyId);
      setViewCompanyModal(res.data);
    } catch (e) {
      toast({ title: "Failed to load company details", variant: "destructive" });
    }
  };

  // Source toggle
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
        companies: scrapeMode === "VISA_FILTERED" ? selectedCompanies.map(c => c.company_name) : [],
        sources: selectedSources,
        mode: scrapeMode,
        minimum_score: scrapeMode === "VISA_FILTERED" ? minimumScore : 0,
      });

      toast({
        title: "Scraper Triggered Successfully",
        description: `Background execution started (ID: ${res.data.execution_id.slice(0, 8)}).`,
      });

      setActiveExecution({
        id: res.data.execution_id,
        status: "pending",
        total_roles: selectedRoles.length,
        total_jobs_found: 0,
        total_inserted: 0,
        total_duplicates: 0,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Jobs Scraper Control Panel
          </h1>
          <p className="text-sm text-slate-500">
            Configure target roles and companies to crawl vacancies across LinkedIn, Indeed, Glassdoor & Dice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchDbRoles(); fetchExecutions(); }}
            className="h-9 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh History
          </Button>
        </div>
      </div>

      {/* Active Execution Banner */}
      {activeExecution && (activeExecution.status === "running" || activeExecution.status === "pending") && (
        <Card className="border-blue-300 bg-blue-50/50 shadow-xs animate-pulse">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">
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
            <Progress value={activeExecution.total_jobs_found ? 65 : 25} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Execution Mode Selector (Mode A vs Mode B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setScrapeMode("STANDARD")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            scrapeMode === "STANDARD"
              ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${scrapeMode === "STANDARD" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900">Mode A: Standard Scraping</h3>
                {scrapeMode === "STANDARD" && <Badge className="text-[10px] bg-primary">Active</Badge>}
              </div>
              <p className="text-xs text-slate-500">Broad Crawl across All Companies</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Crawls listings broadly for the selected job roles across all employers without restricting by company visa data. Visa Intelligence scores are automatically calculated after collection.
          </p>
        </div>

        <div
          onClick={() => setScrapeMode("VISA_FILTERED")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            scrapeMode === "VISA_FILTERED"
              ? "border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${scrapeMode === "VISA_FILTERED" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900">Mode B: Visa-Filtered Scraping</h3>
                {scrapeMode === "VISA_FILTERED" && <Badge className="text-[10px] bg-emerald-600">Active</Badge>}
              </div>
              <p className="text-xs text-slate-500">Target Verified Sponsors & Score Qualification</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Targets employers pre-selected from the Visa Refresh database. Collects vacancies, calculates 5-factor Visa Intelligence scores, and measures qualification against your minimum score threshold.
          </p>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Roles & Companies Selection (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Job Roles */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Step 1: Select Job Roles to Scrape
              </CardTitle>
              <CardDescription className="text-xs">
                Select roles from your candidate database or type any custom target role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active Roles in Database */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                  Confirmed Candidate Roles ({dbRoles.length})
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-md border border-slate-200 bg-slate-50/50">
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
                  placeholder="Or enter custom role (e.g. Senior Python Engineer)..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomRole()}
                  className="text-xs"
                />
                <Button variant="secondary" size="sm" onClick={handleAddCustomRole} className="shrink-0 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Custom Role
                </Button>
              </div>

              {/* Selected Roles List with Limits */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Selected Roles & Limits ({selectedRoles.length})
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
                  <div className="text-center py-5 border border-dashed rounded-lg text-slate-400 text-xs">
                    No roles selected yet. Click any role above or add a custom one.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedRoles.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs shadow-2xs"
                      >
                        <span className="font-semibold text-slate-900 truncate max-w-[220px]">
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
                            className="w-16 h-7 text-center text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRole(item.role)}
                            className="h-7 w-7 text-slate-400 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Target Companies from Visa Refresh Database (Optional) */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Step 2: Target Companies from Visa Database ({scrapeMode === "VISA_FILTERED" ? "Active" : "Optional"})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {scrapeMode === "VISA_FILTERED"
                      ? "Search and select verified sponsor employers from the quarterly Visa Refresh database."
                      : "Restrict scraping to specific employers, or leave empty for broad crawling across all employers."}
                  </CardDescription>
                </div>
                {selectedCompanies.length > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                    {selectedCompanies.length} selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visa Score Qualification Threshold (Mode B) */}
              {scrapeMode === "VISA_FILTERED" && (
                <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Minimum Qualification Visa Score Threshold:
                    </span>
                    <Badge className="bg-emerald-600 text-white font-mono">{minimumScore} / 100</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minimumScore}
                      onChange={(e) => setMinimumScore(parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-800 w-10 text-right">{minimumScore}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    All collected vacancies will be preserved and scored. Listings with Visa score &ge; {minimumScore} will be distinguished as qualified.
                  </p>
                </div>
              )}
              {/* Selected Companies Chips */}
              {selectedCompanies.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Selected Target Employers ({selectedCompanies.length})
                    </Label>
                    <button
                      onClick={() => setSelectedCompanies([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear companies
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-slate-200 bg-slate-50/50">
                    {selectedCompanies.map((comp) => (
                      <span
                        key={comp.company_name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs"
                      >
                        {comp.company_name}
                        {getGradeBadge(comp.visa_grade, comp.visa_friendly_score)}
                        <button
                          type="button"
                          onClick={() => handleRemoveCompany(comp.company_name)}
                          className="ml-1 text-slate-400 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Company Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search employers in Visa database (e.g. Google, Apple, Microsoft, Oracle)..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    fetchCompanies(e.target.value);
                  }}
                  className="pl-8 text-xs"
                />
              </div>

              {/* Company Results from Visa DB */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {loadingCompanies ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                    Searching Visa Refresh Database...
                  </div>
                ) : dbCompanies.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No matching companies found in Visa history.
                  </div>
                ) : (
                  dbCompanies.map((comp) => {
                    const isSelected = selectedCompanies.some(
                      c => c.company_name.toLowerCase() === comp.company_name.toLowerCase()
                    );
                    return (
                      <div
                        key={comp.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/5 border-primary/40 font-medium"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCompany(comp)}
                            className="font-semibold text-slate-900 hover:underline text-left"
                          >
                            {comp.company_name}
                          </button>
                          {getGradeBadge(comp.visa_grade, comp.visa_friendly_score)}
                          <span className="text-[10px] text-slate-500">
                            {comp.h1b_total_filings.toLocaleString()} filings
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCompanyDetail(comp.id)}
                            className="h-6 px-1.5 text-[11px] text-slate-500"
                            title="View Visa Breakdown"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleCompany(comp)}
                            className="h-6 px-2 text-[11px]"
                          >
                            {isSelected ? "Selected" : "+ Add"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Source Portals */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Step 3: Source Portals
              </CardTitle>
              <CardDescription className="text-xs">
                Select which platforms the scraper engine will query.
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
                    <span className="text-xs">{s.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scraping Summary & Launch Card (1 col) */}
        <div>
          <Card className="sticky top-6 border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scraping Summary</CardTitle>
              <CardDescription className="text-xs">Review before launching execution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Target Roles</span>
                  <strong className="text-slate-900">{selectedRoles.length}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Target Employers</span>
                  <strong className="text-slate-900">
                    {selectedCompanies.length > 0 ? `${selectedCompanies.length} specific` : "All companies"}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Active Portals</span>
                  <strong className="text-slate-900">{selectedSources.length}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Total Vacancies Requested</span>
                  <strong className="text-primary text-sm">{totalRequestedJobs}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Execution Mode</span>
                  <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">Async Background</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Automatic Visa Matching
                </p>
                <p className="text-[11px] leading-relaxed">
                  Upon completion, all newly captured listings are automatically normalized and scored against the H1B/PERM visa database.
                </p>
              </div>

              <Button
                onClick={handleTriggerScraper}
                disabled={triggering || selectedRoles.length === 0}
                className="w-full gap-2 text-xs font-semibold h-10"
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
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Scraper Execution History
          </CardTitle>
          <CardDescription className="text-xs">
            Log of manual runs and automatic daily 6:00 PM IST schedules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Trigger</th>
                  <th className="py-2.5 px-3">Roles</th>
                  <th className="py-2.5 px-3">Found</th>
                  <th className="py-2.5 px-3">New Inserted</th>
                  <th className="py-2.5 px-3">Duplicates</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingExecutions ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
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
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {e.id.slice(0, 8)}
                      </td>
                      <td className="py-2 px-3 capitalize">
                        {e.trigger_type}
                      </td>
                      <td className="py-2 px-3">
                        {e.total_roles || e.config?.roles?.length || 0}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {e.total_jobs_found || 0}
                      </td>
                      <td className="py-2 px-3 font-semibold text-green-700">
                        {e.total_inserted || 0}
                      </td>
                      <td className="py-2 px-3 text-amber-700">
                        {e.total_duplicates || 0}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={
                            e.status === "completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : e.status === "failed"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {e.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(e.started_at)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecutionModal(e)}
                          className="h-7 px-2 text-xs"
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
      <Dialog open={!!selectedExecutionModal} onOpenChange={(open) => !open && setSelectedExecutionModal(null)}>
        <DialogContent className="max-w-xl">
          {selectedExecutionModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold">
                  Scraper Execution Details ({selectedExecutionModal.id.slice(0, 8)})
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Started at {formatDateTime(selectedExecutionModal.started_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Trigger:</span>
                    <strong className="capitalize">{selectedExecutionModal.trigger_type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <strong>{selectedExecutionModal.status}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Found:</span>
                    <strong>{selectedExecutionModal.total_jobs_found}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">New Inserted:</span>
                    <strong className="text-green-700">{selectedExecutionModal.total_inserted}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duplicates Avoided:</span>
                    <strong className="text-amber-700">{selectedExecutionModal.total_duplicates}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration:</span>
                    <strong>{selectedExecutionModal.duration_seconds || 0} seconds</strong>
                  </div>
                </div>

                {selectedExecutionModal.error_message && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
                    <strong>Error / Notes:</strong> {selectedExecutionModal.error_message}
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-slate-700 block mb-1">
                    Configured Roles & Targets:
                  </Label>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] overflow-x-auto max-h-40">
                    {JSON.stringify(selectedExecutionModal.config, null, 2)}
                  </pre>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedExecutionModal(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Company Visa Detail Modal */}
      <Dialog open={!!viewCompanyModal} onOpenChange={(open) => !open && setViewCompanyModal(null)}>
        <DialogContent className="max-w-md">
          {viewCompanyModal && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {getGradeBadge(viewCompanyModal.visa_grade, viewCompanyModal.visa_friendly_score)}
                  {viewCompanyModal.everify_enrolled && (
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                      E-Verify Enrolled
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {viewCompanyModal.company_name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Visa history and sponsorship intelligence
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total H1B Filings:</span>
                    <strong className="text-sm font-bold text-slate-900">
                      {viewCompanyModal.h1b_total_filings?.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">H1B Approval Rate:</span>
                    <strong className="text-sm font-bold text-slate-900">
                      {viewCompanyModal.h1b_approval_rate}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Approvals / Denials:</span>
                    <strong>
                      {viewCompanyModal.h1b_approvals?.toLocaleString()} / {viewCompanyModal.h1b_denials?.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Average Salary:</span>
                    <strong>
                      {viewCompanyModal.h1b_avg_salary ? `$${viewCompanyModal.h1b_avg_salary.toLocaleString()}` : "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PERM Green Card:</span>
                    <strong>
                      {viewCompanyModal.green_card_sponsor ? "Yes" : `${viewCompanyModal.perm_total_filings || 0} filings`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Last Active Filing:</span>
                    <strong>{viewCompanyModal.h1b_last_filing_year || "Recent"}</strong>
                  </div>
                </div>

                {viewCompanyModal.aliases && viewCompanyModal.aliases.length > 0 && (
                  <div>
                    <span className="text-slate-500 block text-[10px] mb-1">Known Match Aliases:</span>
                    <div className="flex flex-wrap gap-1">
                      {viewCompanyModal.aliases.map((a: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] bg-white">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setViewCompanyModal(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobScraperPage;
