import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { recruitersApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/dashboard/StatusBadge";

import { ClipboardList, Plus, CheckCircle2, ChevronRight, Search, TrendingUp, AlertCircle, FilePlus, Calendar, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const DailyLogPage = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [logsSummary, setLogsSummary] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: cands } = await recruitersApi.myCandidates();
        setCandidates(cands || []);
        
        // Check which candidates have logs for today
        const todayStr = new Date().toISOString().split('T')[0];
        const statusMap: Record<string, boolean> = {};
        
        await Promise.all(cands.map(async (c: any) => {
          try {
            const { data: logs } = await recruitersApi.getDailyLogs(c.id);
            statusMap[c.id] = logs.some((l: any) => l.log_date === todayStr);
          } catch {
            statusMap[c.id] = false;
          }
        }));
        
        setLogsSummary(statusMap);
      } catch (err) {
        console.error("Failed to fetch candidates for logs", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const loggedCount = Object.values(logsSummary).filter(Boolean).length;
  const totalCount = candidates.length;
  const progressPercent = totalCount > 0 ? (loggedCount / totalCount) * 100 : 0;

  const filteredCandidates = candidates.filter(c => 
    c.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2"><ClipboardList className="h-5 w-5 animate-pulse" /> Loading candidates...</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Daily Activity Logs</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Log your candidate application activity for today, {formatDate(new Date())}.</p>
        </div>
        <div className="flex items-center gap-4 bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-sm min-w-[300px]">
           <div className="flex-1 space-y-1.5">
             <div className="flex justify-between items-end">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Log Progress</p>
                <p className="text-[10px] font-bold text-secondary">{loggedCount}/{totalCount} Done</p>
             </div>
             <Progress value={progressPercent} className="h-2 bg-secondary/10" />
           </div>
           <div className={`h-10 w-10 flex items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/20`}>
              <TrendingUp className="h-5 w-5" />
           </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-2 border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden">
             <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-secondary" /> My Candidate Pool</CardTitle>
                        <CardDescription className="text-xs">Quick log access for your assigned candidates.</CardDescription>
                    </div>
                    <div className="relative w-48">
                        {!search && <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />}
                        <Input 
                            placeholder="Filter candidates..." 
                            className="h-8 pl-8 text-xs bg-background/50 border-none ring-1 ring-border/50" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
             </CardHeader>
             <CardContent className="p-0">
                <DataTable
                  data={filteredCandidates}
                  isLoading={loading}
                  searchPlaceholder="Filter candidates..."
                  searchKey="full_name"
                  emptyMessage="No candidates assigned."
                  columns={[
                    { 
                      header: "ID", 
                      className: "px-6 py-4",
                      render: (c: any) => (
                        <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                          {`HYRCDT${c.id.toString().slice(-6).toUpperCase()}`}
                        </span>
                      )
                    },
                    { 
                      header: "Candidate", 
                      sortable: true,
                      accessorKey: "full_name",
                      className: "px-6 py-4",
                      render: (c: any) => (
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm group-hover:text-secondary transition-colors">{c.full_name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.profile?.visa_status || "No Visa Set"}</span>
                        </div>
                      )
                    },
                    { 
                      header: "Pipeline Status", 
                      sortable: true,
                      accessorKey: "status",
                      className: "px-6 py-4",
                      render: (c: any) => <StatusBadge status={c.status} />
                    },
                    { 
                      header: "Total Apps", 
                      sortable: true,
                      accessorKey: "total_applications",
                      className: "px-6 py-4 text-center",
                      render: (c: any) => (
                        <span className="font-bold text-sm text-primary">{c.total_applications || 0}</span>
                      )
                    },
                    { 
                      header: "Interviews", 
                      sortable: true,
                      accessorKey: "total_interviews",
                      className: "px-6 py-4 text-center",
                      render: (c: any) => (
                        <span className="font-bold text-sm text-amber-600">{c.total_interviews || 0}</span>
                      )
                    },
                    { 
                      header: "Today's Log", 
                      className: "px-6 py-4 text-center",
                      render: (c: any) => logsSummary[c.id] ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-500 bg-emerald-500/10 py-1 px-2 rounded-full w-fit mx-auto border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">Logged</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-amber-500 bg-amber-500/10 py-1 px-2 rounded-full w-fit mx-auto border border-amber-500/20">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">Pending</span>
                        </div>
                      )
                    },
                    { 
                      header: "Activity", 
                      className: "px-6 py-4 text-right",
                      render: (c: any) => (
                        <div className="flex justify-end">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 px-4 text-xs font-bold rounded-lg text-white"
                            asChild
                          >
                            <Link to={`/recruiter-dashboard/candidates/${c.id}?tab=daily-log`}>
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> {logsSummary[c.id] ? "View Log" : "Log Now"}
                            </Link>
                          </Button>
                        </div>
                      )
                    }
                  ]}
                />
             </CardContent>
        {filteredCandidates.length > 5 && (
          <div className="py-2 flex justify-center border-t border-border/30 bg-muted/10">
            <ChevronDown className="h-4 w-4 text-muted-foreground/40 animate-bounce" />
          </div>
        )}
      </Card>

      <div className="space-y-6">
              <Card className="border-none shadow-sm bg-primary/5 border-primary/20 relative overflow-hidden group">
                  <div className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-100 transition-opacity animate-bounce pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-primary" />
                  </div>
                  <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-primary">Weekly Goals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Daily Target</span>
                          <span className="font-bold underline underline-offset-4 decoration-primary/40">60 Applications / Day</span>
                      </div>
                      <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Weekly Target</span>
                          <span className="font-bold underline underline-offset-4 decoration-primary/40">300 Applications / Week</span>
                      </div>
                      <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl text-[11px] text-muted-foreground leading-relaxed border border-primary/10">
                          <p className="font-bold text-primary flex items-center gap-1 mb-1"><FilePlus className="h-3 w-3" /> Tip:</p>
                          Consistent daily logging ensures accurate performance statistics and keeps the marketing pipeline active.
                      </div>
                  </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-secondary/20">
                  <CardHeader>
                      <CardTitle className="text-base text-secondary font-bold">Latest Submissions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className="divide-y divide-border/40">
                          {[1,2,3].map(i => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors cursor-pointer">
                                <div>
                                    <p className="text-xs font-bold">Log #{5420 - i}</p>
                                    <p className="text-[10px] text-muted-foreground">Mar 27, 2026</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                          ))}
                      </div>
                      <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/5 rounded-none h-10">
                          View All Activity
                      </Button>
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
};

export default DailyLogPage;
