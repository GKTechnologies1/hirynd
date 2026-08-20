import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { recruitersApi, getPreviewTargetUrl } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  User, Mail, Phone, MapPin, Briefcase, Award, Calendar,
  TrendingUp, Save, ArrowLeft, Loader2, Shield, CheckCircle2,
  Users, Eye, EyeOff, Landmark, Linkedin, FileUp, Check
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AdminAuditTab from "@/components/admin/AdminAuditTab";

const ROLE_COLORS: Record<string, string> = {
  recruiter: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  team_lead: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  team_manager: "bg-pink-500/10 text-pink-700 border-pink-500/20",
};

const ROLE_LABELS: Record<string, string> = {
  recruiter: "Recruiter",
  team_lead: "Team Lead",
  team_manager: "Team Manager",
};

export default function RecruiterTeamMemberDetailPage() {
  const { teamMemberId } = useParams<{ teamMemberId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Sub-data states
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Edit section toggles
  const [isIdentityEditing, setIsIdentityEditing] = useState(false);
  const [isEducationEditing, setIsEducationEditing] = useState(false);
  const [isStaffEditing, setIsStaffEditing] = useState(false);
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [isReferralEditing, setIsReferralEditing] = useState(false);
  const [isProfessionalEditing, setIsProfessionalEditing] = useState(false);

  // Bank details state
  const [bankDetails, setBankDetails] = useState<any>({
    bank_name: "",
    account_number: "",
    routing_number: ""
  });
  const [maskAccount, setMaskAccount] = useState(true);
  const [maskIfsc, setMaskIfsc] = useState(true);
  const [savingBank, setSavingBank] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    university: "",
    degree: "",
    major: "",
    graduation_date: "",
    linkedin_url: "",
    social_profile_url: "",
    company_name: "",
    employee_id: "",
    date_of_joining: "",
    department: "",
    specialization: "",
    max_clients: 3,
    prior_recruitment_experience: "",
    work_type_preference: "",
    referral_source: "",
    referral_friend_name: "",
    resume_file: ""
  });

  const fetchData = async () => {
    if (!teamMemberId) return;
    setLoading(true);
    try {
      const { data } = await recruitersApi.getTeamMember(teamMemberId);
      setMember(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "",
        university: data.university || "",
        degree: data.degree || "",
        major: data.major || "",
        graduation_date: data.graduation_date || "",
        linkedin_url: data.linkedin_url || "",
        social_profile_url: data.social_profile_url || "",
        company_name: data.company_name || "",
        employee_id: data.employee_id || "",
        date_of_joining: data.date_of_joining || "",
        department: data.department || "",
        specialization: data.specialization || "",
        max_clients: data.max_clients || 3,
        prior_recruitment_experience: data.prior_recruitment_experience || "",
        work_type_preference: data.work_type_preference || "",
        referral_source: data.referral_source || "",
        referral_friend_name: data.referral_friend_name || "",
        resume_file: data.resume_file || ""
      });

      if (data.bank_details) {
        setBankDetails({
          bank_name: data.bank_details.bank_name || "",
          account_number: data.bank_details.account_number || "",
          routing_number: data.bank_details.ifsc_code || data.bank_details.routing_number || ""
        });
      }
    } catch (err: any) {
      toast({
        title: "Error loading team member details",
        description: err.response?.data?.error || err.message,
        variant: "destructive"
      });
      navigate("/recruiter-dashboard/team");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!teamMemberId) return;
    setSavingBank(true);
    try {
      await recruitersApi.updateTeamMember(teamMemberId, { bank_details: bankDetails });
      toast({ title: "Bank details updated successfully" });
      setIsBankEditing(false);
      setMaskAccount(true);
      setMaskIfsc(true);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  };

  const handleCancelBank = () => {
    if (!member) return;
    const bank = member.bank_details || {};
    setBankDetails({
      bank_name: bank.bank_name || "",
      account_number: bank.account_number || "",
      routing_number: bank.ifsc_code || bank.routing_number || ""
    });
    setIsBankEditing(false);
    setMaskAccount(true);
    setMaskIfsc(true);
  };

  const fetchAssignments = async () => {
    if (!teamMemberId) return;
    setLoadingAssignments(true);
    try {
      const { data } = await recruitersApi.getTeamMemberAssignments(teamMemberId);
      setAssignments(data || []);
    } catch (err) {
      console.warn("Failed to load team member assignments", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchPerformance = async () => {
    if (!teamMemberId) return;
    setLoadingStats(true);
    try {
      const { data } = await recruitersApi.stats({ user_id: teamMemberId });
      setStats(data);
    } catch (err) {
      console.warn("Failed to load performance stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teamMemberId]);

  useEffect(() => {
    if (activeTab === "assigned_candidates") {
      fetchAssignments();
    } else if (activeTab === "performance") {
      fetchPerformance();
    }
  }, [activeTab, teamMemberId]);

  // Authorization Check
  if (currentUser && !["team_lead", "team_manager", "admin"].includes(currentUser.role)) {
    return <Navigate to="/recruiter-dashboard" replace />;
  }

  // Save Handlers
  const handleSaveIdentity = async () => {
    if (!teamMemberId) return;
    setSaving(true);
    try {
      await recruitersApi.updateTeamMember(teamMemberId, {
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        country: formData.country,
      });
      toast({ title: "Identity details updated successfully" });
      setIsIdentityEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Update failed", 
        description: err.response?.data?.error || "Check your input", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelIdentity = () => {
    if (!member) return;
    setFormData(prev => ({
      ...prev,
      full_name: member.full_name || "",
      phone: member.phone || "",
      city: member.city || "",
      state: member.state || "",
      country: member.country || ""
    }));
    setIsIdentityEditing(false);
  };

  const handleSaveEducation = async () => {
    if (!teamMemberId) return;
    setSaving(true);
    try {
      let gradDate = formData.graduation_date;
      if (gradDate && (gradDate.includes("-") || gradDate.includes("/"))) {
        try {
          const parsed = parse(gradDate.replace(/\//g, "-"), "MM-dd-yyyy", new Date());
          if (!isNaN(parsed.getTime())) gradDate = format(parsed, "yyyy-MM-dd");
        } catch (e) { }
      }
      await recruitersApi.updateTeamMember(teamMemberId, {
        university: formData.university,
        degree: formData.degree,
        major: formData.major,
        graduation_date: gradDate || null,
      });
      toast({ title: "Education details updated successfully" });
      setIsEducationEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Update failed", 
        description: err.response?.data?.error || "Check your input", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEducation = () => {
    if (!member) return;
    setFormData(prev => ({
      ...prev,
      university: member.university || "",
      degree: member.degree || "",
      major: member.major || "",
      graduation_date: member.graduation_date || ""
    }));
    setIsEducationEditing(false);
  };

  const handleSaveStaff = async () => {
    if (!teamMemberId) return;
    setSaving(true);
    try {
      let doj = formData.date_of_joining;
      if (doj && (doj.includes("-") || doj.includes("/"))) {
        try {
          const parsed = parse(doj.replace(/\//g, "-"), "MM-dd-yyyy", new Date());
          if (!isNaN(parsed.getTime())) doj = format(parsed, "yyyy-MM-dd");
        } catch (e) { }
      }
      await recruitersApi.updateTeamMember(teamMemberId, {
        date_of_joining: doj || null,
        max_clients: formData.max_clients,
      });
      toast({ title: "Staff details updated successfully" });
      setIsStaffEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Update failed", 
        description: err.response?.data?.error || "Check your input", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelStaff = () => {
    if (!member) return;
    setFormData(prev => ({
      ...prev,
      date_of_joining: member.date_of_joining || "",
      max_clients: member.max_clients || 3,
    }));
    setIsStaffEditing(false);
  };

  const handleSaveReferral = async () => {
    if (!teamMemberId) return;
    setSaving(true);
    try {
      await recruitersApi.updateTeamMember(teamMemberId, {
        referral_source: formData.referral_source,
        referral_friend_name: formData.referral_friend_name,
        work_type_preference: formData.work_type_preference,
      });
      toast({ title: "Registration & referral details updated successfully" });
      setIsReferralEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Update failed", 
        description: err.response?.data?.error || "Check your input", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReferral = () => {
    if (!member) return;
    setFormData(prev => ({
      ...prev,
      referral_source: member.referral_source || "",
      referral_friend_name: member.referral_friend_name || "",
      work_type_preference: member.work_type_preference || ""
    }));
    setIsReferralEditing(false);
  };

  const handleSaveProfessional = async () => {
    if (!teamMemberId) return;
    setSaving(true);
    try {
      await recruitersApi.updateTeamMember(teamMemberId, {
        linkedin_url: formData.linkedin_url,
        social_profile_url: formData.social_profile_url,
        prior_recruitment_experience: formData.prior_recruitment_experience,
      });
      toast({ title: "Professional details updated successfully" });
      setIsProfessionalEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Update failed", 
        description: err.response?.data?.error || "Check your input", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfessional = () => {
    if (!member) return;
    setFormData(prev => ({
      ...prev,
      linkedin_url: member.linkedin_url || "",
      social_profile_url: member.social_profile_url || "",
      prior_recruitment_experience: member.prior_recruitment_experience || ""
    }));
    setIsProfessionalEditing(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading profile details...</p>
        </div>
      </div>
    );
  }

  if (!member) return null;

  const displayName = member.full_name || "Unset Name";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-6">
        <Button
          id="back-to-team-btn"
          variant="ghost"
          size="sm"
          className="w-fit gap-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40"
          onClick={() => navigate("/recruiter-dashboard/team")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Team
        </Button>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary text-2xl font-black shadow-inner ring-1 ring-primary/20">
              {displayName?.[0] || member.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`capitalize font-bold text-[10px] h-6 px-3 rounded-full ${ROLE_COLORS[member.role] || ""}`}>
                  {ROLE_LABELS[member.role] || member.role}
                </Badge>
                <div className={`h-1.5 w-1.5 rounded-full ${member.approval_status === "approved" ? "bg-green-500" : "bg-amber-500"}`} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{member.approval_status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/50 p-1 border border-border/40 rounded-2xl mb-6">
          <TabsTrigger value="overview" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="assigned_candidates" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Assigned Candidates</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Staff Details</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Performance</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Audit Log</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Identity & Contact Card */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-primary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Identity & Contact
                </CardTitle>
                {!isIdentityEditing && (
                  <Button id="edit-identity-btn" variant="outline" size="sm" onClick={() => setIsIdentityEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input
                    id="input-detail-full_name"
                    value={formData.full_name}
                    disabled={!isIdentityEditing}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address (Read Only)</Label>
                  <Input
                    value={member.email}
                    disabled
                    className="h-11 rounded-xl bg-muted/40 opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <Input
                    id="input-detail-phone"
                    value={formData.phone}
                    disabled={!isIdentityEditing}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                    <Input id="input-detail-city" disabled={!isIdentityEditing} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                    <Input id="input-detail-state" disabled={!isIdentityEditing} value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                    <Input id="input-detail-country" disabled={!isIdentityEditing} value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                </div>
                {isIdentityEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button id="cancel-identity-btn" variant="outline" className="flex-1 h-11" onClick={handleCancelIdentity} disabled={saving}>
                      Cancel
                    </Button>
                    <Button id="save-identity-btn" className="flex-1 h-11" onClick={handleSaveIdentity} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Details Card */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-secondary/5 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-secondary" /> Bank Details
                  </CardTitle>
                </div>
                {!isBankEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsBankEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Bank Name</Label>
                  <Input disabled={!isBankEditing} className="bg-background/50 h-10 text-sm" value={bankDetails.bank_name} onChange={e => setBankDetails({ ...bankDetails, bank_name: e.target.value })} placeholder="e.g. Chase Bank, Wells Fargo" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Account Number</Label>
                  <div className="relative">
                    <Input
                      disabled={!isBankEditing}
                      type={maskAccount ? "password" : "text"}
                      className="bg-background/50 h-10 text-sm tracking-wider pr-10"
                      value={bankDetails.account_number}
                      onChange={e => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                    />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent" onClick={() => setMaskAccount(!maskAccount)}>
                      {maskAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">IFSC Code</Label>
                  <div className="relative">
                    <Input
                      disabled={!isBankEditing}
                      type={maskIfsc ? "password" : "text"}
                      className="bg-background/50 h-10 text-sm tracking-wider pr-10 uppercase"
                      value={bankDetails.routing_number}
                      onChange={e => setBankDetails({ ...bankDetails, routing_number: e.target.value })}
                      placeholder="Enter 11-digit IFSC code"
                    />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent" onClick={() => setMaskIfsc(!maskIfsc)}>
                      {maskIfsc ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {isBankEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-11" onClick={handleCancelBank} disabled={savingBank}>
                      Cancel
                    </Button>
                    <Button className="flex-1 h-11" onClick={handleSaveBankDetails} disabled={savingBank}>
                      {savingBank ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education Card */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-secondary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-secondary" /> University / College
                </CardTitle>
                {!isEducationEditing && (
                  <Button id="edit-education-btn" variant="outline" size="sm" onClick={() => setIsEducationEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">University/college</Label>
                  <Input
                    id="input-detail-university"
                    value={formData.university}
                    disabled={!isEducationEditing}
                    onChange={e => setFormData({ ...formData, university: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                {isEducationEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Degree</Label>
                      <Input
                        id="input-detail-degree"
                        value={formData.degree}
                        onChange={e => setFormData({ ...formData, degree: e.target.value })}
                        className="h-11 rounded-xl bg-muted/20"
                        placeholder="e.g. Bachelor of Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Major</Label>
                      <Input
                        id="input-detail-major"
                        value={formData.major}
                        onChange={e => setFormData({ ...formData, major: e.target.value })}
                        className="h-11 rounded-xl bg-muted/20"
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Degree & Major</Label>
                    <Input
                      value={`${formData.degree || ""}${formData.degree && formData.major ? " & " : ""}${formData.major || ""}`}
                      disabled
                      className="h-11 rounded-xl bg-muted/20"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Graduation Date</Label>
                  <DatePicker
                    value={formData.graduation_date}
                    disabled={!isEducationEditing}
                    onChange={val => setFormData({ ...formData, graduation_date: val })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                {isEducationEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button id="cancel-education-btn" variant="outline" className="flex-1 h-11" onClick={handleCancelEducation} disabled={saving}>
                      Cancel
                    </Button>
                    <Button id="save-education-btn" className="flex-1 h-11" onClick={handleSaveEducation} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Registration & Referral Card */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40 flex flex-col">
              <CardHeader className="bg-primary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Registration & Referral
                </CardTitle>
                {!isReferralEditing && (
                  <Button id="edit-referral-btn" variant="outline" size="sm" onClick={() => setIsReferralEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 flex-1">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Discovery Source</Label>
                  <Input
                    id="input-detail-referral-source"
                    value={formData.referral_source}
                    disabled={!isReferralEditing}
                    onChange={e => setFormData({ ...formData, referral_source: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                    placeholder="e.g. LinkedIn, Google, Friend, etc."
                  />
                </div>
                {(formData.referral_source?.toLowerCase() === "friend" || formData.referral_source?.toLowerCase() === "other") && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      {formData.referral_source?.toLowerCase() === "friend" ? "Friend's Name" : "Specified Other"}
                    </Label>
                    <Input
                      id="input-detail-referral-friend"
                      value={formData.referral_friend_name}
                      disabled={!isReferralEditing}
                      onChange={e => setFormData({ ...formData, referral_friend_name: e.target.value })}
                      className="h-11 rounded-xl bg-muted/20"
                      placeholder={formData.referral_source?.toLowerCase() === "friend" ? "Name of the referring friend" : "Specified other source"}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Work Type Preference</Label>
                  <Select
                    value={formData.work_type_preference}
                    disabled={!isReferralEditing}
                    onValueChange={v => setFormData({ ...formData, work_type_preference: v })}
                  >
                    <SelectTrigger id="select-work-type-trigger" className="h-11 rounded-xl bg-muted/20">
                      <SelectValue placeholder="Select Preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Full-time", "Part-time", "Contract", "Remote"].map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2 border-t mt-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 block mb-2">Registration Resume</Label>
                  {formData.resume_file ? (
                    <div className="flex items-center gap-3">
                      <Button
                        id="view-resume-btn"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 flex items-center gap-2 h-10 px-4"
                        onClick={() => window.open(getPreviewTargetUrl(formData.resume_file), "_blank")}
                      >
                        <FileUp className="h-4 w-4" /> View / Download Resume
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic ml-1">No resume uploaded during registration</p>
                  )}
                </div>
                {isReferralEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button id="cancel-referral-btn" variant="outline" className="flex-1 h-11" onClick={handleCancelReferral} disabled={saving}>
                      Cancel
                    </Button>
                    <Button id="save-referral-btn" className="flex-1 h-11" onClick={handleSaveReferral} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Profile Card */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-primary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Professional Profile
                </CardTitle>
                {!isProfessionalEditing && (
                  <Button id="edit-professional-btn" variant="outline" size="sm" onClick={() => setIsProfessionalEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">LinkedIn URL</Label>
                  {isProfessionalEditing ? (
                    <Input
                      id="input-detail-linkedin"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                      className="h-11 rounded-xl bg-muted/20"
                      placeholder="https://linkedin.com/in/..."
                    />
                  ) : (
                    formData.linkedin_url ? (
                      <div className="h-11 rounded-xl bg-muted/10 border border-border/40 flex items-center px-4">
                        <a
                          href={formData.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 truncate"
                        >
                          <Linkedin className="h-4 w-4 shrink-0 text-primary" />
                          <span className="text-primary hover:underline truncate">{formData.linkedin_url}</span>
                        </a>
                      </div>
                    ) : (
                      <div className="h-11 rounded-xl bg-muted/10 border border-border/40 flex items-center px-4 text-sm text-muted-foreground italic">
                        No LinkedIn URL provided
                      </div>
                    )
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">GitHub Profile</Label>
                  {isProfessionalEditing ? (
                    <Input
                      id="input-detail-github"
                      type="url"
                      value={formData.social_profile_url}
                      onChange={e => setFormData({ ...formData, social_profile_url: e.target.value })}
                      className="h-11 rounded-xl bg-muted/20"
                      placeholder="https://github.com/..."
                    />
                  ) : (
                    formData.social_profile_url ? (
                      <div className="h-11 rounded-xl bg-muted/10 border border-border/40 flex items-center px-4">
                        <a
                          href={formData.social_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 truncate"
                        >
                          <span className="text-primary hover:underline truncate">{formData.social_profile_url}</span>
                        </a>
                      </div>
                    ) : (
                      <div className="h-11 rounded-xl bg-muted/10 border border-border/40 flex items-center px-4 text-sm text-muted-foreground italic">
                        No GitHub profile provided
                      </div>
                    )
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Prior Recruitment Experience</Label>
                  <Input
                    id="input-detail-prior-experience"
                    value={formData.prior_recruitment_experience}
                    disabled={!isProfessionalEditing}
                    onChange={e => setFormData({ ...formData, prior_recruitment_experience: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                {isProfessionalEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button id="cancel-professional-btn" variant="outline" className="flex-1 h-11" onClick={handleCancelProfessional} disabled={saving}>
                      Cancel
                    </Button>
                    <Button id="save-professional-btn" className="flex-1 h-11" onClick={handleSaveProfessional} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Assigned Candidates */}
        <TabsContent value="assigned_candidates">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40 overflow-hidden rounded-3xl">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Active Assignments
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">Candidates this team member is currently marketing.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={assignments}
                isLoading={loadingAssignments}
                searchPlaceholder="Search candidates..."
                searchKey="candidate_name"
                emptyMessage="No active candidate assignments."
                columns={[
                  {
                    header: "Candidate ID",
                    accessorKey: "candidate_display_id",
                    render: (a: any) => (
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap font-mono pl-6">
                        {a.candidate_display_id || `HYRCDT${a.candidate_id.toString().slice(-6).toUpperCase()}`}
                      </span>
                    )
                  },
                  {
                    header: "Candidate Name",
                    sortable: true,
                    accessorKey: "candidate_name",
                    className: "font-bold text-xs uppercase tracking-widest",
                    render: (a: any) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">{a.candidate_name || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{a.candidate_email}</span>
                      </div>
                    )
                  },
                  {
                    header: "Relation Type",
                    sortable: true,
                    accessorKey: "role_type",
                    className: "text-center",
                    render: (a: any) => (
                      <div className="flex justify-center">
                        <Badge variant="outline" className="capitalize bg-secondary/5 border-secondary/20 text-secondary text-[10px] font-bold tracking-wider px-3 h-6 rounded-full">
                          {a.role_type?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )
                  },
                  {
                    header: "Status",
                    sortable: true,
                    accessorKey: "status",
                    className: "text-center",
                    render: (a: any) => (
                      <div className="flex justify-center">
                        <StatusBadge status={a.status} className="text-[9px]" />
                      </div>
                    )
                  },
                  {
                    header: "Assigned Date",
                    sortable: true,
                    accessorKey: "assigned_at",
                    render: (a: any) => (
                      <span className="text-xs text-muted-foreground font-medium">
                        {a.assigned_at ? format(new Date(a.assigned_at), "MMM dd, yyyy") : "—"}
                      </span>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Staff Details */}
        <TabsContent value="staff">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
            <CardHeader className="bg-secondary/5 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-secondary" /> Administrative Information
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight text-secondary/70">Metadata and Staff configurations</CardDescription>
              </div>
              {!isStaffEditing && (
                <Button id="edit-staff-btn" variant="outline" size="sm" onClick={() => setIsStaffEditing(true)}>Edit</Button>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Date of Joining */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Date of Joining</Label>
                  <DatePicker
                    value={formData.date_of_joining}
                    disabled={!isStaffEditing}
                    onChange={val => setFormData({ ...formData, date_of_joining: val })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                {/* Max Clients */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">System Limit (Max Clients)</Label>
                  <Input
                    id="input-detail-max_clients"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.max_clients}
                    disabled={!isStaffEditing}
                    onChange={e => setFormData({ ...formData, max_clients: parseInt(e.target.value) || 3 })}
                    className="h-11 rounded-xl bg-muted/20 font-bold"
                  />
                </div>
              </div>

              {isStaffEditing && (
                <div className="flex gap-2 pt-2">
                  <Button id="cancel-staff-btn" variant="outline" className="flex-1 h-11" onClick={handleCancelStaff} disabled={saving}>
                    Cancel
                  </Button>
                  <Button id="save-staff-btn" className="flex-1 h-11" onClick={handleSaveStaff} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Performance */}
        <TabsContent value="performance">
          <div className="p-2 space-y-6">
            {loadingStats ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Calculating metrics...</p>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Today Card */}
                  <Card className="border-none bg-primary/5 ring-1 ring-primary/10 overflow-hidden relative group rounded-2xl">
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
                  <Card className="border-none bg-secondary/5 ring-1 ring-secondary/10 overflow-hidden relative group rounded-2xl">
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
                  <div className="p-5 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-between group hover:bg-muted/60 transition-colors col-span-2">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm ring-1 ring-amber-500/20 group-hover:rotate-12 transition-transform">
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
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <p>Performance is calculated based on daily submission logs and job link status updates from the last 7 days.</p>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-muted-foreground font-medium">Unable to load metrics.</div>
            )}
          </div>
        </TabsContent>

        {/* Tab 5: Audit Log */}
        <TabsContent value="audit">
          <AdminAuditTab targetId={teamMemberId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
