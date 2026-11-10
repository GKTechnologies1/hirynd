import React, { useState, useEffect, useCallback } from "react";
import { employerDiscoveryApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { VisaGradeBadge } from "@/components/visa/VisaGradeBadge";
import {
  Building2, Search, Filter, RefreshCw, Plus, ExternalLink,
  ShieldCheck, Award, Users, DollarSign, Calendar, MapPin,
  Globe, Mail, Phone, CheckCircle2, ChevronLeft, ChevronRight,
  Eye, Edit3, Briefcase, FileCheck
} from "lucide-react";

export const AdminEmployerDiscoveryPage: React.FC = () => {
  const { toast } = useToast();

  // Filters & Query state
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [hasPlacementsOnly, setHasPlacementsOnly] = useState(false);
  const [hasH1bOnly, setHasH1bOnly] = useState(false);
  const [hasLcaOnly, setHasLcaOnly] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("-placement_count");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data state
  const [employers, setEmployers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Modals state
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit Employer state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Create Employer state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<any>({
    company_name: "",
    website: "",
    industry: "",
    headquarters: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    verification_status: "VERIFIED",
    notes: "",
  });
  const [creatingEmployer, setCreatingEmployer] = useState(false);

  // Add Placement state
  const [addPlacementModalOpen, setAddPlacementModalOpen] = useState(false);
  const [placementFormData, setPlacementFormData] = useState<any>({
    candidate_name: "",
    role_title: "",
    offer_salary: "",
    currency: "USD",
    start_date: "",
    hr_contact: "",
    verification_status: "VERIFIED",
    notes: "",
  });
  const [savingPlacement, setSavingPlacement] = useState(false);

  // Fetch overview statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await employerDiscoveryApi.statistics();
      setStats(res.data);
    } catch (err) {
      console.warn("Failed to load employer stats:", err);
    }
  }, []);

  // Fetch paginated employers
  const fetchEmployers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: pageSize,
        ordering: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedIndustry !== "all") params.industry = selectedIndustry;
      if (selectedGrade !== "all") params.grade = selectedGrade;
      if (hasPlacementsOnly) params.has_placements = true;
      if (hasH1bOnly) params.has_h1b = true;
      if (hasLcaOnly) params.has_lca = true;
      if (selectedStatus !== "all") params.verification_status = selectedStatus;

      const res = await employerDiscoveryApi.list(params);
      setEmployers(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      setTotalPages(res.data?.num_pages || 1);
    } catch (err) {
      console.error("Failed to load employers:", err);
      toast({
        title: "Load Error",
        description: "Failed to load employers from database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage, pageSize, sortOrder, search, selectedIndustry,
    selectedGrade, hasPlacementsOnly, hasH1bOnly, hasLcaOnly, selectedStatus, toast
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const handleOpenDetail = async (companyId: number) => {
    setLoadingDetail(true);
    setDetailTab("overview");
    try {
      const res = await employerDiscoveryApi.detail(companyId);
      setSelectedEmployer(res.data);
    } catch (err) {
      toast({
        title: "Load Error",
        description: "Could not load employer details.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEdit = (emp: any) => {
    setEditFormData({
      id: emp.id,
      company_name: emp.company_name,
      website: emp.website || "",
      industry: emp.industry || "",
      headquarters: emp.headquarters || "",
      contact_name: emp.contact_name || "",
      contact_email: emp.contact_email || "",
      contact_phone: emp.contact_phone || "",
      verification_status: emp.verification_status || "VERIFIED",
      notes: emp.notes || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const res = await employerDiscoveryApi.update(editFormData.id, editFormData);
      toast({
        title: "Employer Updated",
        description: `Successfully updated ${res.data?.company_name}.`,
      });

      // Update in local lists
      setEmployers((prev) =>
        prev.map((e) => (e.id === editFormData.id ? { ...e, ...res.data } : e))
      );
      if (selectedEmployer && selectedEmployer.id === editFormData.id) {
        setSelectedEmployer(res.data);
      }
      setEditModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.error || "Failed to update employer profile.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateEmployer = async () => {
    if (!createFormData.company_name.trim()) {
      toast({
        title: "Company Name Required",
        description: "Please specify an employer name.",
        variant: "destructive",
      });
      return;
    }

    setCreatingEmployer(true);
    try {
      const res = await employerDiscoveryApi.create(createFormData);
      toast({
        title: "Employer Created",
        description: `Successfully registered ${res.data?.company_name} in database.`,
      });
      setCreateModalOpen(false);
      setCreateFormData({
        company_name: "",
        website: "",
        industry: "",
        headquarters: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        verification_status: "VERIFIED",
        notes: "",
      });
      fetchEmployers();
      fetchStats();
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err.response?.data?.error || "Could not create employer.",
        variant: "destructive",
      });
    } finally {
      setCreatingEmployer(false);
    }
  };

  const handleSavePlacement = async () => {
    if (!selectedEmployer || !placementFormData.role_title.trim()) {
      toast({
        title: "Role Required",
        description: "Please enter the offered role title.",
        variant: "destructive",
      });
      return;
    }

    setSavingPlacement(true);
    try {
      await employerDiscoveryApi.addPlacement(selectedEmployer.id, placementFormData);
      toast({
        title: "Placement Enriched",
        description: "Verified placement added to employer record.",
      });

      // Reload detail
      const res = await employerDiscoveryApi.detail(selectedEmployer.id);
      setSelectedEmployer(res.data);
      setAddPlacementModalOpen(false);
      setPlacementFormData({
        candidate_name: "",
        role_title: "",
        offer_salary: "",
        currency: "USD",
        start_date: "",
        hr_contact: "",
        verification_status: "VERIFIED",
        notes: "",
      });
      fetchEmployers();
      fetchStats();
    } catch (err: any) {
      toast({
        title: "Placement Save Failed",
        description: err.response?.data?.error || "Could not attach placement.",
        variant: "destructive",
      });
    } finally {
      setSavingPlacement(false);
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Employer Intelligence & Placement Discovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Central repository of 42,000+ verified H1B/LCA employers enriched with Hyrind placement and offer intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add New Employer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchEmployers();
              fetchStats();
            }}
            className="h-9 px-2.5 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Top Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Employers</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
            {(stats?.total_employers || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Database baseline</span>
        </Card>
        <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-blue-600 block">With H1B History</span>
          <p className="text-2xl font-extrabold text-blue-700 mt-0.5">
            {(stats?.employers_with_h1b || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-blue-500">Verified USCIS filings</span>
        </Card>
        <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-purple-600 block">With PERM/LCA</span>
          <p className="text-2xl font-extrabold text-purple-700 mt-0.5">
            {(stats?.employers_with_lca || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-purple-500">Green card sponsors</span>
        </Card>
        <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 block">Hyrind Placements</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
            {(stats?.employers_with_placements || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-500">
            {stats?.total_hyrind_placements || 0} candidate offers
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-amber-600 block">Verified Profiles</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-0.5">
            {(stats?.verified_employers || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-500">
            {stats?.unverified_employers || 0} unverified
          </span>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search employer by name, industry, headquarters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50/50"
              />
            </div>

            {/* Visa Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-8 text-xs bg-white border border-slate-200 rounded px-2 text-slate-700"
            >
              <option value="all">All Visa Grades</option>
              <option value="A">Grade A (90-100)</option>
              <option value="B">Grade B (75-89)</option>
              <option value="C">Grade C (55-74)</option>
              <option value="D">Grade D</option>
              <option value="F">Grade F / Unrated</option>
            </select>

            {/* Verification Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 text-xs bg-white border border-slate-200 rounded px-2 text-slate-700"
            >
              <option value="all">All Verification Status</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="INCOMPLETE">Incomplete</option>
            </select>

            {/* Toggle Filters */}
            <div className="flex items-center gap-3 pl-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={hasPlacementsOnly}
                  onChange={(e) => setHasPlacementsOnly(e.target.checked)}
                  className="rounded border-slate-300 text-primary h-3.5 w-3.5"
                />
                <span>Hyrind Placed</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={hasH1bOnly}
                  onChange={(e) => setHasH1bOnly(e.target.checked)}
                  className="rounded border-slate-300 text-primary h-3.5 w-3.5"
                />
                <span>H1B Sponsor</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={hasLcaOnly}
                  onChange={(e) => setHasLcaOnly(e.target.checked)}
                  className="rounded border-slate-300 text-primary h-3.5 w-3.5"
                />
                <span>PERM Sponsor</span>
              </label>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-8 text-xs bg-white border border-slate-200 rounded px-2 text-slate-700 ml-auto"
            >
              <option value="-placement_count">Most Placements First</option>
              <option value="-h1b_total_filings">Highest H1B Filings</option>
              <option value="-visa_friendly_score">Highest Visa Score</option>
              <option value="company_name">Company Name (A-Z)</option>
              <option value="-updated_at">Recently Updated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Employers Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Employer Records ({totalCount.toLocaleString()})
            </CardTitle>
            <CardDescription className="text-xs">
              Showing page {currentPage} of {totalPages}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 text-xs bg-white border border-slate-200 rounded px-1"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Employer</th>
                  <th className="py-2.5 px-3">Visa Intelligence</th>
                  <th className="py-2.5 px-3 text-right">H1B Filings</th>
                  <th className="py-2.5 px-3 text-right">Approval Rate</th>
                  <th className="py-2.5 px-3 text-right">PERM Filings</th>
                  <th className="py-2.5 px-3 text-center">E-Verify</th>
                  <th className="py-2.5 px-3 text-center">Hyrind Placements</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading employers...
                    </td>
                  </tr>
                ) : employers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No employers found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  employers.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employer Details */}
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <button
                          onClick={() => handleOpenDetail(emp.id)}
                          className="font-bold text-slate-900 hover:text-primary hover:underline text-left block truncate text-xs"
                        >
                          {emp.company_name}
                        </button>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate mt-0.5">
                          {emp.industry && <span>{emp.industry}</span>}
                          {emp.headquarters && (
                            <>
                              <span>•</span>
                              <span>{emp.headquarters}</span>
                            </>
                          )}
                          {emp.website && (
                            <a
                              href={emp.website.startsWith("http") ? emp.website : `https://${emp.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center ml-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Visa Grade Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <VisaGradeBadge
                          grade={emp.visa_grade}
                          score={emp.visa_friendly_score}
                          visaMatched={true}
                          filingsCount={emp.h1b_total_filings}
                        />
                      </td>

                      {/* H1B Total Filings */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {emp.h1b_total_filings?.toLocaleString() || "0"}
                      </td>

                      {/* Approval Rate */}
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        {emp.h1b_approval_rate ? `${Number(emp.h1b_approval_rate).toFixed(1)}%` : "—"}
                      </td>

                      {/* PERM Filings */}
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {emp.perm_total_filings?.toLocaleString() || "0"}
                      </td>

                      {/* E-Verify */}
                      <td className="py-2.5 px-3 text-center">
                        {emp.everify_enrolled ? (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[9px] py-0 px-1">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Hyrind Placements Count */}
                      <td className="py-2.5 px-3 text-center">
                        {emp.placement_count > 0 ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2">
                            {emp.placement_count} Placed
                          </Badge>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            emp.verification_status === "VERIFIED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : emp.verification_status === "UNVERIFIED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }
                        >
                          {emp.verification_status || "VERIFIED"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(emp.id)}
                            className="h-7 px-2 text-xs font-medium"
                          >
                            <Eye className="h-3 w-3 mr-1 text-slate-500" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(emp)}
                            className="h-7 px-1.5 text-xs text-slate-500"
                            title="Edit Employer Details"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing {employers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} employers
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="h-8 px-2.5"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employer Profile & Placement Drawer/Dialog */}
      <Dialog open={!!selectedEmployer} onOpenChange={(open) => !open && setSelectedEmployer(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {selectedEmployer && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <VisaGradeBadge
                      grade={selectedEmployer.visa_grade}
                      score={selectedEmployer.visa_friendly_score}
                      visaMatched={true}
                      filingsCount={selectedEmployer.h1b_total_filings}
                    />
                    <Badge variant="outline" className="text-xs">
                      {selectedEmployer.verification_status || "VERIFIED"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleOpenEdit(selectedEmployer);
                    }}
                    className="h-7 px-2 text-xs flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Profile
                  </Button>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
                  {selectedEmployer.company_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {selectedEmployer.industry || "General Industry"} •{" "}
                  {selectedEmployer.headquarters || "USA"} • Updated:{" "}
                  {formatDate(selectedEmployer.updated_at)}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full text-xs">
                <TabsList className="grid grid-cols-3 w-full h-8 mb-3">
                  <TabsTrigger value="overview" className="text-xs">
                    Overview & Contacts
                  </TabsTrigger>
                  <TabsTrigger value="visa" className="text-xs">
                    USCIS & LCA History
                  </TabsTrigger>
                  <TabsTrigger value="placements" className="text-xs">
                    Placements ({selectedEmployer.placements?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW & CONTACTS */}
                <TabsContent value="overview" className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Website:</span>
                      {selectedEmployer.website ? (
                        <a
                          href={selectedEmployer.website.startsWith("http") ? selectedEmployer.website : `https://${selectedEmployer.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          {selectedEmployer.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not Disclosed</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Industry:</span>
                      <strong className="text-slate-800">{selectedEmployer.industry || "Not Specified"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Headquarters:</span>
                      <strong className="text-slate-800">{selectedEmployer.headquarters || "United States"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Data Provenance:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(selectedEmployer.data_sources || ["USCIS"]).map((src: string) => (
                          <Badge key={src} variant="secondary" className="text-[9px] py-0 px-1">
                            {src}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Employer Contact Card */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="font-semibold text-slate-900 block text-xs">
                      Employer HR & Talent Acquisition Contacts:
                    </span>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Contact Person:</span>
                        <strong className="text-slate-900">{selectedEmployer.contact_name || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Official Email:</span>
                        <span className="text-slate-900">{selectedEmployer.contact_email || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Phone Number:</span>
                        <span className="text-slate-900">{selectedEmployer.contact_phone || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {selectedEmployer.notes && (
                    <div className="p-2.5 bg-slate-50 rounded border text-slate-700 text-xs">
                      <span className="font-semibold block text-[11px] mb-0.5">Internal Notes:</span>
                      {selectedEmployer.notes}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 2: USCIS & VISA INTELLIGENCE */}
                <TabsContent value="visa" className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">H1B Total Filings</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {selectedEmployer.h1b_total_filings?.toLocaleString() || "0"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Approvals / Denials</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {(selectedEmployer.h1b_approvals || 0).toLocaleString()} / {(selectedEmployer.h1b_denials || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Approval Rate</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        {selectedEmployer.h1b_approval_rate ? `${Number(selectedEmployer.h1b_approval_rate).toFixed(1)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Average H1B Salary</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {selectedEmployer.h1b_avg_salary ? `$${selectedEmployer.h1b_avg_salary.toLocaleString()}` : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">PERM Green Card Sponsorship</span>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedEmployer.green_card_sponsor ? "Yes (Authoritative Sponsor)" : `${selectedEmployer.perm_total_filings || 0} filings recorded`}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Federal E-Verify Enrolled</span>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedEmployer.everify_enrolled ? "Yes (Verified Enrolled)" : "Not Confirmed"}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: HYRIND PLACEMENTS */}
                <TabsContent value="placements" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">
                      Hyrind Candidate Offers & Placements:
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setAddPlacementModalOpen(true)}
                      className="h-7 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Placement Record
                    </Button>
                  </div>

                  <div className="rounded-md border border-slate-200 overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Candidate</th>
                          <th className="py-2 px-3 text-right">Offered Salary</th>
                          <th className="py-2 px-3">Start Date</th>
                          <th className="py-2 px-3">HR Contact</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedEmployer.placements && selectedEmployer.placements.length > 0 ? (
                          selectedEmployer.placements.map((plc: any) => (
                            <tr key={plc.id} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-semibold text-slate-900">{plc.role_title}</td>
                              <td className="py-2 px-3 text-slate-700">{plc.candidate_name || "Placed Candidate"}</td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-700">
                                {plc.offer_salary ? `$${Number(plc.offer_salary).toLocaleString()} ${plc.currency}` : "Undisclosed"}
                              </td>
                              <td className="py-2 px-3 text-slate-500">{plc.start_date || "—"}</td>
                              <td className="py-2 px-3 text-slate-600">{plc.hr_contact || "—"}</td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">
                                  {plc.verification_status || "VERIFIED"}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400">
                              No placements recorded yet for this employer.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="border-t pt-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedEmployer(null)} className="h-8 text-xs">
                  Close Profile
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employer Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Edit3 className="h-4 w-4 text-primary" />
              Edit Employer Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update company contacts, website, and verification info.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Website</Label>
              <Input
                value={editFormData.website || ""}
                onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                placeholder="https://company.com"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Industry</Label>
                <Input
                  value={editFormData.industry || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                  placeholder="e.g. Technology"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Headquarters</Label>
                <Input
                  value={editFormData.headquarters || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, headquarters: e.target.value })}
                  placeholder="e.g. Austin, TX"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Contact Person</Label>
                <Input
                  value={editFormData.contact_name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })}
                  placeholder="HR / Recruiter"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Contact Email</Label>
                <Input
                  value={editFormData.contact_email || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                  placeholder="hr@company.com"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Contact Phone</Label>
                <Input
                  value={editFormData.contact_phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Verification Status</Label>
                <select
                  value={editFormData.verification_status || "VERIFIED"}
                  onChange={(e) => setEditFormData({ ...editFormData, verification_status: e.target.value })}
                  className="h-8 w-full text-xs bg-white border border-slate-200 rounded px-2 mt-1"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="UNVERIFIED">UNVERIFIED</option>
                  <option value="INCOMPLETE">INCOMPLETE</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Internal Notes</Label>
              <Input
                value={editFormData.notes || ""}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Notes on hiring process, recruiter references..."
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit} className="h-8 text-xs font-semibold">
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Employer Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" />
              Register New Employer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new company entity into the central employer intelligence database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Company Legal / Display Name *</Label>
              <Input
                value={createFormData.company_name}
                onChange={(e) => setCreateFormData({ ...createFormData, company_name: e.target.value })}
                placeholder="e.g. Acme Corporation LLC"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Website</Label>
                <Input
                  value={createFormData.website}
                  onChange={(e) => setCreateFormData({ ...createFormData, website: e.target.value })}
                  placeholder="https://acme.com"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Industry</Label>
                <Input
                  value={createFormData.industry}
                  onChange={(e) => setCreateFormData({ ...createFormData, industry: e.target.value })}
                  placeholder="Technology / Health"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Contact Email</Label>
                <Input
                  value={createFormData.contact_email}
                  onChange={(e) => setCreateFormData({ ...createFormData, contact_email: e.target.value })}
                  placeholder="careers@acme.com"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Headquarters</Label>
                <Input
                  value={createFormData.headquarters}
                  onChange={(e) => setCreateFormData({ ...createFormData, headquarters: e.target.value })}
                  placeholder="New York, NY"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateEmployer} disabled={creatingEmployer} className="h-8 text-xs font-semibold">
              {creatingEmployer ? "Creating..." : "Create Employer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Placement Record Modal */}
      <Dialog open={addPlacementModalOpen} onOpenChange={setAddPlacementModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              Attach Candidate Placement
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record verified candidate offer and placement details for {selectedEmployer?.company_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Role Title *</Label>
              <Input
                value={placementFormData.role_title}
                onChange={(e) => setPlacementFormData({ ...placementFormData, role_title: e.target.value })}
                placeholder="e.g. Senior Backend Engineer"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Candidate Name / Email</Label>
              <Input
                value={placementFormData.candidate_name}
                onChange={(e) => setPlacementFormData({ ...placementFormData, candidate_name: e.target.value })}
                placeholder="Candidate name or reference"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Offered Salary ($)</Label>
                <Input
                  type="number"
                  value={placementFormData.offer_salary}
                  onChange={(e) => setPlacementFormData({ ...placementFormData, offer_salary: e.target.value })}
                  placeholder="120000"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Start Date</Label>
                <Input
                  type="date"
                  value={placementFormData.start_date}
                  onChange={(e) => setPlacementFormData({ ...placementFormData, start_date: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">HR Contact / Notes</Label>
              <Input
                value={placementFormData.hr_contact}
                onChange={(e) => setPlacementFormData({ ...placementFormData, hr_contact: e.target.value })}
                placeholder="hr@company.com / Recruiter note"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddPlacementModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePlacement} disabled={savingPlacement} className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
              {savingPlacement ? "Saving..." : "Save Placement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployerDiscoveryPage;

