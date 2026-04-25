import { useState, useEffect } from "react";
import { recruitersApi, authApi, candidatesApi } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, MapPin, UserCheck, UserPlus, RefreshCw, BarChart3, TrendingUp, Calendar, Briefcase, Award, Loader2, Eye, Settings2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const AdminRecruitersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Performance Modal State
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.allUsers();
      const list = data?.results ?? data ?? [];
      setRecruiters(list.filter((u: any) => u.role === "recruiter" || u.role === "team_lead" || u.role === "team_manager"));
    } catch (err: any) {
      toast({ title: "Error fetch recruiters", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecruiters(); }, []);

  const handleViewPerformance = async (recruiter: any) => {
    setSelectedRecruiter(recruiter);
    setLoadingStats(true);
    setStats(null);
    try {
      // Use the new user_id param to fetch this specific recruiter's stats
      const { data } = await recruitersApi.stats({ user_id: recruiter.id } as any);
      setStats(data);
    } catch (err) {
      toast({ title: "Failed to load stats", variant: "destructive" });
    } finally {
      setLoadingStats(false);
    }
  };

  const filtered = recruiters.filter(r => 
    (r.full_name || r.profile?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Recruiter Management</h2>
          <p className="text-sm text-muted-foreground font-medium">Monitor and analyze your recruitment team's productivity and success.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecruiters} disabled={loading} className="rounded-xl border-border/50 h-10 px-4">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input 
            className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl" 
            placeholder="Search recruiters by name or email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="h-11 px-6 rounded-xl bg-primary/5 text-primary border-primary/10 font-semibold">
          {filtered.length} Active Team Members
        </Badge>
      </div>

      <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-border/40">
        <CardContent className="p-0">
          <DataTable
            data={filtered}
            isLoading={loading}
            searchPlaceholder="Filter results..."
            searchKey="full_name"
            emptyMessage="No results found."
            columns={[
              { 
                header: "ID", 
                className: "pl-6 py-4",
                render: (r: any, _?: any, idx?: number) => (
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                    {`HYRREC${String((idx ?? 0) + 1).padStart(6, '0')}`}
                  </span>
                )
              },
              { 
                header: "Recruiter Info", 
                sortable: true,
                accessorKey: "full_name",
                className: "py-4 font-bold text-xs uppercase tracking-widest",
                render: (r: any) => {
                  const name = r.full_name || r.profile?.full_name || "Unset Name";
                  const email = r.email;
                  return (
                    <div className="flex items-center gap-3 py-1 pl-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20">
                        {name?.[0] || email?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{name}</p>
                        <p className="text-[11px] text-muted-foreground font-medium opacity-80">{email}</p>
                      </div>
                    </div>
                  );
                }
              },
              {
                header: "Assigned To",
                className: "font-bold text-xs uppercase tracking-widest text-center",
                render: (r: any) => (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Badge variant="outline" className="h-7 px-3 rounded-xl bg-secondary/5 text-secondary border-secondary/20 font-black text-xs">
                      {r.assigned_candidate_count || 0}
                    </Badge>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Candidates</span>
                  </div>
                )
              },
              { 
                header: "Role", 
                sortable: true,
                accessorKey: "role",
                className: "font-bold text-xs uppercase tracking-widest text-center",
                render: (r: any) => (
                  <div className="flex justify-center">
                    <Badge variant="outline" className="capitalize bg-secondary/5 border-secondary/20 text-secondary text-[10px] font-bold tracking-wider px-3 h-6 rounded-full">
                      {r.role?.replace("_", " ")}
                    </Badge>
                  </div>
                )
              },
              { 
                header: "Professional Background", 
                className: "font-bold text-xs uppercase tracking-widest",
                render: (r: any) => {
                  const university = r.university || r.profile?.university;
                  const degree = r.degree || r.profile?.degree;
                  const major = r.major || r.profile?.major;
                  const linkedin = r.linkedin_url || r.profile?.linkedin_url;
                  const social = r.social_profile_url || r.profile?.social_profile_url;
                  
                  return (
                    <div className="space-y-1.5 py-1">
                      {university && (
                        <p className="text-[11px] flex items-center gap-2 text-foreground font-bold">
                          <Award className="h-3 w-3 text-secondary" /> {university}
                        </p>
                      )}
                      {(degree || major) && (
                        <p className="text-[10px] text-muted-foreground font-medium pl-5">{degree || "—"}{major ? ` / ${major}` : ""}</p>
                      )}
                      <div className="flex gap-3 mt-1 pl-5">
                        {linkedin && (
                          <a href={linkedin} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                             LinkedIn
                          </a>
                        )}
                        {social && (
                          <a href={social} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                             Social
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }
              },
              { 
                header: "Contact Details", 
                className: "font-bold text-xs uppercase tracking-widest",
                render: (r: any) => {
                  const phone = r.phone || r.profile?.phone;
                  const city = r.city || r.profile?.city;
                  const state = r.state || r.profile?.state;
                  const country = r.country || r.profile?.country;
                  
                  return (
                    <div className="space-y-1">
                      <p className="text-[11px] flex items-center gap-2 text-muted-foreground font-medium">
                        <Phone className="h-3 w-3 opacity-60" /> {phone || "No phone listed"}
                      </p>
                      {city && (
                        <p className="text-[11px] flex items-center gap-2 text-muted-foreground font-medium">
                          <MapPin className="h-3 w-3 opacity-60" /> {city}, {state ? `${state}, ` : ""}{country}
                        </p>
                      )}
                    </div>
                  );
                }
              },
              { 
                header: "Status", 
                sortable: true,
                accessorKey: "approval_status",
                className: "font-bold text-xs uppercase tracking-widest text-center",
                render: (r: any) => (
                  <div className="flex justify-center">
                    <Badge variant={r.approval_status === "approved" ? "secondary" : "outline"} className={`h-6 text-[9px] font-bold uppercase tracking-widest rounded-lg px-2 flex items-center gap-1.5 ${r.approval_status === "approved" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${r.approval_status === "approved" ? "bg-green-500" : "bg-amber-500"}`} />
                      {r.approval_status}
                    </Badge>
                  </div>
                )
              },
              { 
                header: "Actions", 
                className: "text-right font-bold text-xs uppercase tracking-widest pr-6",
                render: (r: any) => (
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 text-primary border border-transparent hover:border-primary/20"
                      onClick={() => navigate(`/admin-dashboard/recruiters/${r.id}`)}
                      title="View Full Profile"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-4 text-xs font-bold gap-2 rounded-xl border border-transparent hover:bg-secondary/5 hover:text-secondary hover:border-secondary/10 transition-all font-black tracking-tighter"
                      onClick={() => handleViewPerformance(r)}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Analytics
                    </Button>
                  </div>
                )
              }
            ]}
          />
          {filtered.length > 5 && (
            <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
              <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
            </div>
          )}
        </CardContent>
      </Card>


      {/* Performance Stats Modal */}
      <Dialog open={!!selectedRecruiter} onOpenChange={() => setSelectedRecruiter(null)}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden rounded-[2rem]">
          <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center flex-wrap gap-4 mb-2">
              <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary text-2xl font-black shadow-inner ring-1 ring-primary/20">
                {selectedRecruiter?.full_name?.[0] || "?"}
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">{selectedRecruiter?.full_name}'s Performance</DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">Detailed metrics and submission output analytics.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 pt-0 space-y-6">
            {loadingStats ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Calculating metrics...</p>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Today Card */}
                  <Card className="border-none bg-primary/5 ring-1 ring-primary/10 overflow-hidden relative group">
                    <TrendingUp className="absolute -right-4 -bottom-4 h-24 w-24 text-primary/5 group-hover:scale-110 transition-transform" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary/70">Today's Output</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">{stats.apps_today}</span>
                        <span className="text-xs font-bold text-muted-foreground">applications</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Week Card */}
                  <Card className="border-none bg-secondary/5 ring-1 ring-secondary/10 overflow-hidden relative group">
                    <TrendingUp className="absolute -right-4 -bottom-4 h-24 w-24 text-secondary/5 group-hover:scale-110 transition-transform" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-secondary/20 text-secondary">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-secondary/70">Weekly Total</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">{stats.apps_week}</span>
                        <span className="text-xs font-bold text-muted-foreground">submissions</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-muted/40 border border-border/30 flex items-center justify-between group hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm ring-1 ring-amber-500/20 group-hover:rotate-12 transition-transform">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Interviews</p>
                        <p className="text-xl font-black text-foreground">Scheduled This Week</p>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity pr-2">{stats.interviews_week}</span>
                  </div>


                </div>

                <div className="bg-primary/5 rounded-2xl p-4 flex gap-3 text-xs text-primary font-medium border border-primary/10">
                  <BarChart3 className="h-4 w-4 shrink-0" />
                  <p>Performance is calculated based on daily submission logs and job link status updates from the last 7 days.</p>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-muted-foreground font-medium">Unable to load metrics.</div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
              <Button onClick={() => setSelectedRecruiter(null)} className="rounded-2xl px-8 h-12 font-black tracking-tighter shadow-lg shadow-primary/20">Close Analysis</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecruitersPage;
