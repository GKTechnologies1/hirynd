import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTable } from "@/components/ui/DataTable";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { Eye, Download, Users, Clock, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUSES = ["lead", "contacted", "reviewed", "converted", "closed"];

const AdminInterestedCandidatesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await candidatesApi.interestedList();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];
      setCandidates(data);
    } catch (err: any) {
      toast({ title: "Error fetching leads", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await candidatesApi.updateInterested(id, { status: newStatus });
      toast({ title: "Status updated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchName = !searchName || 
        c.name?.toLowerCase().includes(searchName.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchName.toLowerCase());

      let matchDate = true;
      if (c.created_at) {
        const cleanDate = c.created_at.split("T")[0];
        const [y, m, d] = cleanDate.split("-").map((s: string) => parseInt(s, 10));
        const itemDate = new Date(y, m - 1, d);
        itemDate.setHours(0, 0, 0, 0);

        if (fromDate) {
          const fParts = fromDate.split(/[-\/]/);
          if (fParts.length === 3) {
            const fd = new Date(parseInt(fParts[2], 10), parseInt(fParts[0], 10) - 1, parseInt(fParts[1], 10));
            fd.setHours(0, 0, 0, 0);
            if (itemDate < fd) matchDate = false;
          }
        }
        
        if (toDate) {
          const tParts = toDate.split(/[-\/]/);
          if (tParts.length === 3) {
            const td = new Date(parseInt(tParts[2], 10), parseInt(tParts[0], 10) - 1, parseInt(tParts[1], 10));
            td.setHours(23, 59, 59, 999);
            if (itemDate > td) matchDate = false;
          }
        }
      } else {
        if (fromDate || toDate) matchDate = false;
      }

      const matchStatus = statusFilter === "all" || (c.status || "lead").toLowerCase() === statusFilter.toLowerCase();
      
      return matchName && matchDate && matchStatus;
    });
  }, [candidates, searchName, fromDate, toDate, statusFilter]);

  const hasActiveFilters = searchName || fromDate || toDate || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Interested Candidates</h2>
          <p className="text-sm text-muted-foreground mt-1">Review candidates who expressed interest via public forms</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <Clock className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Sync Leads
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-secondary" /> All Interested Candidates
              </CardTitle>
              <CardDescription className="mt-0.5">
                {filteredCandidates.length} candidate(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-3.5 py-1.5 rounded-full font-bold text-xs w-fit">
              <Users className="h-3.5 w-3.5" />
              <span>Total Interest: <strong>{candidates.length}</strong></span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 pt-4 pb-2">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-4 items-end">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    placeholder="Search candidate name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-8 pr-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                  />
                  {searchName && (
                    <button
                      onClick={() => setSearchName("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From Date</Label>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Date</Label>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="MM-DD-YYYY"
                  formatStr="MM-dd-yyyy"
                  className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">
                        {s === 'lead' ? 'Lead' : s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex h-8 items-center">
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchName("");
                      setFromDate("");
                      setToDate("");
                      setStatusFilter("all");
                    }}
                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DataTable
            data={filteredCandidates}
            isLoading={loading}
            emptyMessage="No interested candidates found."
            columns={[
              { 
                header: "ID", 
                render: (c: any) => (
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-mono">
                    {c.display_id || `HYRLD${String(c.seq_number || 0).padStart(4, '0')}`}
                  </span>
                ),
                sortable: true,
                accessorKey: "id",
                className: "text-xs pl-6"
              },
              { 
                header: "Name", 
                accessorKey: "name",
                className: "text-xs font-bold",
                sortable: true,
                render: (c: any) => (
                  <div className="flex flex-col">
                    <span className="font-bold">{c.name || "—"}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{c.email}</span>
                  </div>
                )
              },
              { 
                header: "Academic", 
                className: "text-xs",
                render: (c: any) => {
                  let academicInfo = c.degree_major || "";
                  if (!academicInfo) {
                    if (c.degree && c.major) {
                      if (c.degree.trim().toLowerCase() === c.major.trim().toLowerCase()) {
                        academicInfo = c.degree;
                      } else {
                        academicInfo = `${c.degree} & ${c.major}`;
                      }
                    } else {
                      academicInfo = c.degree || c.major || "—";
                    }
                  }
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium truncate max-w-[150px]">{c.university || "—"}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {academicInfo}
                      </span>
                    </div>
                  );
                }
              },
              { 
                header: "Visa", 
                className: "text-xs",
                render: (c: any) => (
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-medium bg-muted/50">
                    {c.visa_status || "—"}
                  </Badge>
                )
              },
              { 
                header: "Source", 
                className: "text-xs",
                render: (c: any) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{c.referral_source || c.how_did_you_hear || "Interest Form"}</span>
                    {c.referral_friend_name && <span className="text-[9px] text-secondary">Ref: {c.referral_friend_name}</span>}
                  </div>
                )
              },
              { 
                header: "Status", 
                sortable: true,
                accessorKey: "status",
                render: (c: any) => (
                  <Select value={c.status || "lead"} onValueChange={v => handleStatusChange(c.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="capitalize text-xs">
                          {s === 'lead' ? 'Lead' : s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              },
              {
                header: "Resume",
                className: "text-xs",
                render: (c: any) => (
                  c.resume_url || c.resume_file ? (
                    <div className="flex items-center gap-2">
                      <DocumentPreview url={c.resume_url || c.resume_file} label={<Download className="h-4 w-4" />} className="text-secondary hover:underline cursor-pointer" />
                      <DocumentPreview url={c.resume_url || c.resume_file} label={<Eye className="h-4 w-4" />} variant="icon" className="h-7 w-7" />
                    </div>
                  ) : <span className="text-[10px] text-muted-foreground italic">—</span>
                )
              },
              {
                header: "Submission",
                render: (c: any) => (
                  <div className="text-[10px]">
                    <p className="font-bold">{formatDate(c.created_at)}</p>
                    <p className="opacity-50">{c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</p>
                  </div>
                ),
                sortable: true,
                accessorKey: "created_at"
              },
              { 
                header: "Actions", 
                render: (c: any) => (
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => navigate(`/admin-dashboard/interested-candidates/${c.id}`)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Lead
                  </Button>
                ),
                className: "text-xs text-right pr-6"
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInterestedCandidatesPage;
