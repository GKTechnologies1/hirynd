import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { Eye, FileText, Download, Users, Activity, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";

const AdminInterestedCandidatesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [activeFilter, setActiveFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const total = candidates.length;
    const today = candidates.filter(c => {
      if (!c.created_at) return false;
      const date = new Date(c.created_at);
      return date.toDateString() === new Date().toDateString();
    }).length;
    
    const withResume = candidates.filter(c => c.resume_url || c.resume_file).length;

    return [
      { key: "all", label: "Total Interest", count: total, icon: <Users className="h-4 w-4" />, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", activeClass: "ring-2 ring-blue-500 dark:ring-blue-400 shadow-md" },
      { key: "today", label: "Today's Leads", count: today, icon: <Activity className="h-4 w-4" />, color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300", activeClass: "ring-2 ring-orange-500 dark:ring-orange-400 shadow-md" },
      { key: "resume", label: "With Resume", count: withResume, icon: <FileText className="h-4 w-4" />, color: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300", activeClass: "ring-2 ring-teal-500 dark:ring-teal-400 shadow-md" },
      { key: "conversion", label: "Conversion Rate", count: "—", icon: <CheckCircle className="h-4 w-4" />, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300", activeClass: "" },
    ];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (activeFilter === "today") {
        if (!c.created_at) return false;
        const date = new Date(c.created_at);
        return date.toDateString() === new Date().toDateString();
      }
      if (activeFilter === "resume") {
        return !!(c.resume_url || c.resume_file);
      }
      return true;
    });
  }, [candidates, activeFilter]);

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((w, i) => {
          const isFilterable = w.key !== "conversion";
          const isActive = activeFilter === w.key;
          return (
            <motion.div
              key={w.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`border-0 ${w.color} ${
                  isFilterable 
                    ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" 
                    : ""
                } ${isActive ? w.activeClass : isFilterable ? "opacity-75 hover:opacity-100" : ""}`}
                onClick={() => {
                  if (isFilterable) {
                    setActiveFilter(prev => prev === w.key ? "all" : w.key);
                  }
                }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 dark:bg-black/20">
                    {w.icon}
                  </div>
                  <div>
                    <p className="text-xl font-bold">{w.count}</p>
                    <p className="text-xs text-muted-foreground">{w.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 mb-2 animate-in fade-in duration-200">
          <span className="text-xs text-muted-foreground font-semibold">
            Filtered by: {activeFilter === "today" ? "Today's Leads" : "With Resume"}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setActiveFilter("all")} 
            className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear Filter
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {activeFilter === "all" 
              ? "Interested Candidate Records" 
              : activeFilter === "today" 
                ? "Today's Leads" 
                : "Interested Candidates with Resume"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCandidates}
            isLoading={loading}
            searchKey="name"
            searchPlaceholder="Search leads..."
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
                className: "text-xs pl-4"
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
                className: "text-xs text-right pr-4"
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInterestedCandidatesPage;
