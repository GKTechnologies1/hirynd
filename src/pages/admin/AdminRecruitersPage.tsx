import { useState, useEffect } from "react";
import { recruitersApi, authApi, candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, MapPin, UserCheck, UserPlus, RefreshCw, BarChart3, TrendingUp, Calendar, Briefcase, Award, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const AdminRecruitersPage = () => {
  const { toast } = useToast();
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Performance Modal State
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Staff Edit Modal State
  const [editingRecruiter, setEditingRecruiter] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    company_name: "",
    employee_id: "",
    date_of_joining: "",
    department: "",
    specialization: "",
    max_clients: 3
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);

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
  
  const handleEditStaff = async (recruiter: any) => {
    setEditingRecruiter(recruiter);
    setLoadingProfile(true);
    try {
      const { data } = await recruitersApi.adminGetProfile(recruiter.id);
      setEditForm({
        company_name: data.company_name || "",
        employee_id: data.employee_id || "",
        date_of_joining: data.date_of_joining || "",
        department: data.department || "",
        specialization: data.specialization || "",
        max_clients: data.max_clients || 3
      });
    } catch (err) {
      toast({ title: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveStaff = async () => {
    if (!editingRecruiter) return;
    setSavingStaff(true);
    try {
      await recruitersApi.adminUpdateProfile(editingRecruiter.id, editForm);
      toast({ title: "Staff details updated successfully" });
      setEditingRecruiter(null);
      fetchRecruiters();
    } catch (err: any) {
      toast({ 
        title: "Update failed", 
        description: err.response?.data?.error || "Could not update staff details", 
        variant: "destructive" 
      });
    } finally {
      setSavingStaff(false);
    }
  };

  const filtered = recruiters.filter(r => 
    (r.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
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
                header: "Recruiter Info", 
                className: "py-4 font-bold text-xs uppercase tracking-widest pl-6",
                render: (r: any) => (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20">
                      {r.full_name?.[0] || r.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <p className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{r.full_name || "Unset Name"}</p>
                      <p className="text-[11px] text-muted-foreground font-medium opacity-80">{r.email}</p>
                    </div>
                  </div>
                )
              },
              { 
                header: "Role", 
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
                render: (r: any) => (
                  <div className="space-y-1.5 py-1">
                    {r.university && (
                      <p className="text-[11px] flex items-center gap-2 text-foreground font-bold">
                        <Award className="h-3 w-3 text-secondary" /> {r.university}
                      </p>
                    )}
                    {r.major && (
                      <p className="text-[10px] text-muted-foreground font-medium pl-5">{r.major}</p>
                    )}
                    <div className="flex gap-3 mt-1 pl-5">
                      {r.linkedin_url && (
                        <a href={r.linkedin_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                           LinkedIn
                        </a>
                      )}
                      {r.social_profile_url && (
                        <a href={r.social_profile_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                           Social
                        </a>
                      )}
                    </div>
                  </div>
                )
              },
              { 
                header: "Contact Details", 
                className: "font-bold text-xs uppercase tracking-widest",
                render: (r: any) => (
                  <div className="space-y-1">
                    <p className="text-[11px] flex items-center gap-2 text-muted-foreground font-medium">
                      <Phone className="h-3 w-3 opacity-60" /> {r.phone || "No phone listed"}
                    </p>
                    {r.city && (
                      <p className="text-[11px] flex items-center gap-2 text-muted-foreground font-medium">
                        <MapPin className="h-3 w-3 opacity-60" /> {r.city}, {r.state ? `${r.state}, ` : ""}{r.country}
                      </p>
                    )}
                  </div>
                )
              },
              { 
                header: "Status", 
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
                      className="h-9 w-9 p-0 rounded-xl hover:bg-secondary/10 text-secondary"
                      onClick={() => handleEditStaff(r)}
                      title="Edit Staff Info"
                    >
                      <Briefcase className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-4 text-xs font-bold gap-2 rounded-xl border border-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/10 transition-all"
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

                  <div className="p-5 rounded-3xl bg-muted/40 border border-border/30 flex items-center justify-between group hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm ring-1 ring-green-500/20 group-hover:rotate-12 transition-transform">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Placements</p>
                        <p className="text-xl font-black text-foreground">Offers This Week</p>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-green-600 opacity-60 group-hover:opacity-100 transition-opacity pr-2">{stats.offers_week}</span>
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
      
      {/* Staff Details Edit Modal */}
      <Dialog open={!!editingRecruiter} onOpenChange={() => setEditingRecruiter(null)}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden rounded-[2rem]">
          <div className="h-1.5 bg-gradient-to-r from-secondary via-primary to-secondary" />
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center flex-wrap gap-4 mb-2">
              <div className="h-16 w-16 rounded-[1.5rem] bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-black shadow-inner ring-1 ring-secondary/20">
                <Briefcase className="h-8 w-8" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">Edit Staff Details</DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">Manage internal metadata for {editingRecruiter?.full_name}.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 pt-0 space-y-4">
            {loadingProfile ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-secondary opacity-60" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading recruiter profile...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Company Name</Label>
                    <Input 
                      value={editForm.company_name} 
                      onChange={e => setEditForm({...editForm, company_name: e.target.value})}
                      placeholder="e.g. Hyrind"
                      className="h-11 rounded-xl bg-muted/30 border-border/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Employee ID</Label>
                    <Input 
                      value={editForm.employee_id} 
                      onChange={e => setEditForm({...editForm, employee_id: e.target.value})}
                      placeholder="e.g. HY-101"
                      className="h-11 rounded-xl bg-muted/30 border-border/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Department</Label>
                    <Input 
                      value={editForm.department} 
                      onChange={e => setEditForm({...editForm, department: e.target.value})}
                      placeholder="e.g. Talent Acquisition"
                      className="h-11 rounded-xl bg-muted/30 border-border/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Specialization</Label>
                    <Input 
                      value={editForm.specialization} 
                      onChange={e => setEditForm({...editForm, specialization: e.target.value})}
                      placeholder="e.g. IT Recruitment"
                      className="h-11 rounded-xl bg-muted/30 border-border/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Date of Joining</Label>
                    <Input 
                      type="date"
                      value={editForm.date_of_joining} 
                      onChange={e => setEditForm({...editForm, date_of_joining: e.target.value})}
                      className="h-11 rounded-xl bg-muted/30 border-border/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Max Clients</Label>
                    <Input 
                      type="number"
                      min={1}
                      max={20}
                      value={editForm.max_clients} 
                      onChange={e => setEditForm({...editForm, max_clients: parseInt(e.target.value) || 3})}
                      className="h-11 rounded-xl bg-muted/30 border-border/40"
                    />
                  </div>
                </div>

                <div className="bg-secondary/5 rounded-2xl p-4 flex gap-3 text-xs text-secondary font-medium border border-secondary/10 mt-2">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  <p>Changes to these fields are internal and will be reflected in the recruitment staff's administrative profile.</p>
                </div>
              </>
            )}
            
            <DialogFooter className="pt-4 border-t border-border/20 mt-4">
              <Button variant="ghost" onClick={() => setEditingRecruiter(null)} className="rounded-xl px-6 h-11 font-bold">Cancel</Button>
              <Button 
                onClick={handleSaveStaff} 
                className="rounded-xl px-8 h-11 font-black tracking-tighter shadow-lg shadow-secondary/20 bg-secondary hover:bg-secondary/90"
                disabled={savingStaff || loadingProfile}
              >
                {savingStaff ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Details
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRecruitersPage;
