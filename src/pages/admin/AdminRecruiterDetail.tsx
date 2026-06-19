import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { recruitersApi, authApi, auditApi, filesApi, getFileUrl, getPreviewTargetUrl } from "@/services/api";
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
  BarChart3, TrendingUp, History, Save, ArrowLeft, Loader2,
  Shield, CheckCircle2, XCircle, Clock, Eye, EyeOff, Landmark, Users, FileUp, Check, Linkedin
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";
import StatusBadge from "@/components/dashboard/StatusBadge";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

interface AdminRecruiterDetailProps {
  id?: string;
  onLoaded?: (name: string) => void;
}

const AdminRecruiterDetail = ({ id: propId, onLoaded }: AdminRecruiterDetailProps) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [recruiter, setRecruiter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(`admin_recruiter_active_tab_${id}`) || "overview";
  });

  useEffect(() => {
    const stored = sessionStorage.getItem(`admin_recruiter_active_tab_${id}`) || "overview";
    setActiveTab(stored);
  }, [id]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    sessionStorage.setItem(`admin_recruiter_active_tab_${id}`, val);
  };

  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

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
  const [bankDetails, setBankDetails] = useState<any>({
    bank_name: "",
    account_number: "",
    routing_number: ""
  });
  const [maskAccount, setMaskAccount] = useState(true);
  const [maskIfsc, setMaskIfsc] = useState(true);
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [isIdentityEditing, setIsIdentityEditing] = useState(false);
  const [isEducationEditing, setIsEducationEditing] = useState(false);
  const [isReferralEditing, setIsReferralEditing] = useState(false);
  const [isProfessionalEditing, setIsProfessionalEditing] = useState(false);
  const [isStaffEditing, setIsStaffEditing] = useState(false);

  // Document upload states
  const [documents, setDocuments] = useState<any>({
    highest_degree_certificate_file: null,
    government_id_card_file: null,
    pan_card_file: null,
    bank_passbook_file: null
  });
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({
    highest_degree_certificate: false,
    government_id_card: false,
    pan_card: false,
    bank_passbook: false
  });

  // File input refs
  const degreeInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const panCardInputRef = useRef<HTMLInputElement>(null);
  const bankPassbookInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await recruitersApi.adminGetDetail(id);
      setRecruiter(data);
      if (onLoaded) {
        const name = data.full_name || data.profile?.full_name || data.email || "Recruiter";
        onLoaded(name);
      }
      setFormData({
        full_name: data.full_name || data.profile?.full_name || "",
        phone: data.phone || data.profile?.phone || "",
        city: data.city || data.profile?.city || "",
        state: data.state || data.profile?.state || "",
        country: data.country || data.profile?.country || "",
        university: data.university || data.profile?.university || "",
        degree: data.degree || data.profile?.degree || "",
        major: data.major || data.profile?.major || "",
        graduation_date: data.graduation_date || data.profile?.graduation_date || "",
        linkedin_url: data.linkedin_url || data.profile?.linkedin_url || "",
        social_profile_url: data.social_profile_url || data.profile?.social_profile_url || "",
        company_name: data.company_name || data.profile?.company_name || "",
        employee_id: data.employee_id || data.profile?.employee_id || "",
        date_of_joining: data.date_of_joining || data.profile?.date_of_joining || "",
        department: data.department || data.profile?.department || "",
        specialization: data.specialization || data.profile?.specialization || "",
        max_clients: data.max_clients || data.profile?.max_clients || 3,
        prior_recruitment_experience: data.prior_recruitment_experience || data.profile?.prior_recruitment_experience || "",
        work_type_preference: data.work_type_preference || data.profile?.work_type_preference || "",
        referral_source: data.referral_source || "",
        referral_friend_name: data.referral_friend_name || "",
        resume_file: data.resume_file || ""
      });

      if (data.bank_details || data.profile?.bank_details) {
        const bank = data.bank_details || data.profile?.bank_details;
        setBankDetails({
          bank_name: bank.bank_name || "",
          account_number: bank.account_number || "",
          routing_number: bank.ifsc_code || ""
        });
      }

      // Load document information
      setDocuments({
        highest_degree_certificate_file: data.highest_degree_certificate_file || data.profile?.highest_degree_certificate_file,
        government_id_card_file: data.government_id_card_file || data.profile?.government_id_card_file,
        pan_card_file: data.pan_card_file || data.profile?.pan_card_file,
        bank_passbook_file: data.bank_passbook_file || data.profile?.bank_passbook_file
      });

      // Fetch stats
      setLoadingStats(true);
      const { data: statsData } = await recruitersApi.stats({ user_id: id });
      setStats(statsData);

      // Fetch assignments
      setLoadingAssignments(true);
      try {
        const { data: assignData } = await recruitersApi.adminGetAssignments(id);
        setAssignments(assignData || []);
      } catch (err) {
        console.error("Failed to fetch assignments", err);
      } finally {
        setLoadingAssignments(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load recruiter data", variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    setRecruiter(null);
    fetchData();
  }, [id]);

  const handleSaveIdentity = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await recruitersApi.adminUpdateProfile(id, {
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
      toast({ title: "Update failed", description: err.response?.data?.error || "Check your input", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelIdentity = () => {
    if (!recruiter) return;
    const data = recruiter;
    setFormData(prev => ({
      ...prev,
      full_name: data.full_name || data.profile?.full_name || "",
      phone: data.phone || data.profile?.phone || "",
      city: data.city || data.profile?.city || "",
      state: data.state || data.profile?.state || "",
      country: data.country || data.profile?.country || ""
    }));
    setIsIdentityEditing(false);
  };

  const handleSaveEducation = async () => {
    if (!id) return;
    setSaving(true);
    try {
      let gradDate = formData.graduation_date;
      if (gradDate && (gradDate.includes("-") || gradDate.includes("/"))) {
        try {
          const parsed = parse(gradDate.replace(/\//g, "-"), "MM-dd-yyyy", new Date());
          if (!isNaN(parsed.getTime())) gradDate = format(parsed, "yyyy-MM-dd");
        } catch (e) { }
      }
      const cleanGradDate = gradDate ? gradDate : null;

      await recruitersApi.adminUpdateProfile(id, {
        university: formData.university,
        degree: formData.degree,
        major: formData.major,
        graduation_date: cleanGradDate,
      });
      toast({ title: "Education details updated successfully" });
      setIsEducationEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.error || "Check your input", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEducation = () => {
    if (!recruiter) return;
    const data = recruiter;
    setFormData(prev => ({
      ...prev,
      university: data.university || data.profile?.university || "",
      degree: data.degree || data.profile?.degree || "",
      major: data.major || data.profile?.major || "",
      graduation_date: data.graduation_date || data.profile?.graduation_date || ""
    }));
    setIsEducationEditing(false);
  };

  const handleSaveReferral = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await recruitersApi.adminUpdateProfile(id, {
        referral_source: formData.referral_source,
        referral_friend_name: formData.referral_friend_name,
        work_type_preference: formData.work_type_preference,
      });
      toast({ title: "Registration & referral details updated successfully" });
      setIsReferralEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.error || "Check your input", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReferral = () => {
    if (!recruiter) return;
    const data = recruiter;
    setFormData(prev => ({
      ...prev,
      referral_source: data.referral_source || "",
      referral_friend_name: data.referral_friend_name || "",
      work_type_preference: data.work_type_preference || data.profile?.work_type_preference || ""
    }));
    setIsReferralEditing(false);
  };

  const handleSaveProfessional = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await recruitersApi.adminUpdateProfile(id, {
        linkedin_url: formData.linkedin_url,
        social_profile_url: formData.social_profile_url,
        prior_recruitment_experience: formData.prior_recruitment_experience,
      });
      toast({ title: "Professional details updated successfully" });
      setIsProfessionalEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.error || "Check your input", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProfessional = () => {
    if (!recruiter) return;
    const data = recruiter;
    setFormData(prev => ({
      ...prev,
      linkedin_url: data.linkedin_url || data.profile?.linkedin_url || "",
      social_profile_url: data.social_profile_url || data.profile?.social_profile_url || "",
      prior_recruitment_experience: data.prior_recruitment_experience || data.profile?.prior_recruitment_experience || ""
    }));
    setIsProfessionalEditing(false);
  };

  const handleSaveStaff = async () => {
    if (!id) return;
    setSaving(true);
    try {
      let doj = formData.date_of_joining;
      if (doj && (doj.includes("-") || doj.includes("/"))) {
        try {
          const parsed = parse(doj.replace(/\//g, "-"), "MM-dd-yyyy", new Date());
          if (!isNaN(parsed.getTime())) doj = format(parsed, "yyyy-MM-dd");
        } catch (e) { }
      }
      const cleanDoj = doj ? doj : null;

      await recruitersApi.adminUpdateProfile(id, {
        date_of_joining: cleanDoj,
        max_clients: formData.max_clients,
      });
      toast({ title: "Administrative details updated successfully" });
      setIsStaffEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.error || "Check your input", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelStaff = () => {
    if (!recruiter) return;
    const data = recruiter;
    setFormData(prev => ({
      ...prev,
      date_of_joining: data.date_of_joining || data.profile?.date_of_joining || "",
      max_clients: data.max_clients || data.profile?.max_clients || 3
    }));
    setIsStaffEditing(false);
  };

  const handleSaveBankDetails = async () => {
    setSavingBank(true);
    try {
      await recruitersApi.adminUpdateProfile(id!, { bank_details: bankDetails });
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
    if (!recruiter) return;
    const bank = recruiter.bank_details || recruiter.profile?.bank_details || {};
    setBankDetails({
      bank_name: bank.bank_name || "",
      account_number: bank.account_number || "",
      routing_number: bank.ifsc_code || ""
    });
    setIsBankEditing(false);
    setMaskAccount(true);
    setMaskIfsc(true);
  };

  const handleDocumentUpload = async (docType: string, file: File) => {
    setUploadingDocs(prev => ({ ...prev, [docType]: true }));
    try {
      const { data } = await filesApi.upload(file, docType);

      // Map docType to API field name
      const fieldMap: Record<string, string> = {
        'highest_degree_certificate': 'highest_degree_certificate_id',
        'government_id_card': 'government_id_card_id',
        'pan_card': 'pan_card_id',
        'bank_passbook': 'bank_passbook_id'
      };

      const fieldName = fieldMap[docType];
      await recruitersApi.adminUpdateProfile(id!, { [fieldName]: data.id });

      // Update local documents state
      setDocuments(prev => ({
        ...prev,
        [`${docType}_file`]: {
          id: data.id,
          name: file.name,
          url: data.url,
          uploaded_at: new Date().toISOString()
        }
      }));

      toast({ title: "Success", description: `${docType.replace(/_/g, ' ')} uploaded successfully` });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to upload document", variant: "destructive" });
    } finally {
      setUploadingDocs(prev => ({ ...prev, [docType]: false }));
    }
  };

  if (loading && !recruiter) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-60" />
      <p className="text-sm font-bold text-muted-foreground animate-pulse">Retrieving recruiter profile...</p>
    </div>
  );

  if (!recruiter) return (
    <div className="p-12 text-center flex flex-col items-center gap-4">
      <XCircle className="h-12 w-12 text-destructive opacity-40" />
      <p className="text-lg font-bold text-muted-foreground">Recruiter profile not found.</p>
      <Button variant="outline" onClick={() => navigate("/admin-dashboard/recruiters")}>Back to List</Button>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin-dashboard/recruiters")} className="h-10 w-10 p-0 rounded-xl border border-border/40">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black shadow-sm ring-1 ring-primary/20">
              {recruiter.full_name?.[0] || "?"}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">{recruiter.full_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="h-5 px-2 text-[10px] uppercase font-bold tracking-widest border-primary/20 bg-primary/5 text-primary">
                  {recruiter.role}
                </Badge>
                <div className={`h-1.5 w-1.5 rounded-full ${recruiter.approval_status === "approved" ? "bg-green-500" : "bg-amber-500"}`} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{recruiter.approval_status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-card/50 p-1 border border-border/40 rounded-2xl mb-6">
          <TabsTrigger value="overview" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="assigned_candidates" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Assigned Candidates</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Staff Details</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Documents</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Performance</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-primary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Identity & Contact
                </CardTitle>
                {!isIdentityEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsIdentityEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input
                    value={formData.full_name}
                    disabled={!isIdentityEditing}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address (Read Only)</Label>
                  <Input
                    value={recruiter.email}
                    disabled
                    className="h-11 rounded-xl bg-muted/40 opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <Input
                    value={formData.phone}
                    disabled={!isIdentityEditing}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                    <Input disabled={!isIdentityEditing} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                    <Input disabled={!isIdentityEditing} value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                    <Input disabled={!isIdentityEditing} value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                </div>
                {isIdentityEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-11" onClick={handleCancelIdentity} disabled={saving}>
                      Cancel
                    </Button>
                    <Button className="flex-1 h-11" onClick={handleSaveIdentity} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

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

            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-secondary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-secondary" /> University / College
                </CardTitle>
                {!isEducationEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEducationEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">University/college</Label>
                  <Input
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
                        value={formData.degree}
                        onChange={e => setFormData({ ...formData, degree: e.target.value })}
                        className="h-11 rounded-xl bg-muted/20"
                        placeholder="e.g. Bachelor of Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Major</Label>
                      <Input
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
                    <Button variant="outline" className="flex-1 h-11" onClick={handleCancelEducation} disabled={saving}>
                      Cancel
                    </Button>
                    <Button className="flex-1 h-11" onClick={handleSaveEducation} disabled={saving}>
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
                  <Button variant="outline" size="sm" onClick={() => setIsReferralEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4 flex-1">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Discovery Source</Label>
                  <Input
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
                    <SelectTrigger className="h-11 rounded-xl bg-muted/20">
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
                    <Button variant="outline" className="flex-1 h-11" onClick={handleCancelReferral} disabled={saving}>
                      Cancel
                    </Button>
                    <Button className="flex-1 h-11" onClick={handleSaveReferral} disabled={saving}>
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
                  <Button variant="outline" size="sm" onClick={() => setIsProfessionalEditing(true)}>Edit</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">LinkedIn URL</Label>
                  {isProfessionalEditing ? (
                    <Input
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
                    value={formData.prior_recruitment_experience}
                    disabled={!isProfessionalEditing}
                    onChange={e => setFormData({ ...formData, prior_recruitment_experience: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                {isProfessionalEditing && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-11" onClick={handleCancelProfessional} disabled={saving}>
                      Cancel
                    </Button>
                    <Button className="flex-1 h-11" onClick={handleSaveProfessional} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assigned Candidates Tab */}
        <TabsContent value="assigned_candidates">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40 overflow-hidden rounded-3xl">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Assigned Candidates
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-tight text-primary/70 mt-1">
                    Manage and monitor candidates assigned to this recruiter
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="h-6 px-3 rounded-full bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                  {assignments.length} Total Assignments
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={assignments}
                isLoading={loadingAssignments}
                searchKey="candidate_name"
                searchPlaceholder="Search candidates..."
                emptyMessage="No candidates assigned to this recruiter."
                columns={[
                  {
                    header: "Candidate ID",
                    className: "pl-6",
                    render: (a: any) => (
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap font-mono">
                        {a.candidate_display_id || `HYRCDT${(a.candidate_id || a.id)?.toString().slice(-6).toUpperCase()}`}
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
                  },
                  {
                    header: "Actions",
                    className: "text-right pr-6",
                    render: (a: any) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 text-primary"
                        onClick={() => navigate(`/admin-dashboard/candidates/${a.candidate_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Details Tab */}
        <TabsContent value="staff">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
            <CardHeader className="bg-secondary/10 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-secondary" /> Administrative Information
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-tight text-secondary/70">Internal metadata controlled by Admin</CardDescription>
              </div>
              {!isStaffEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsStaffEditing(true)}>Edit</Button>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Date of Joining</Label>
                  <DatePicker
                    value={formData.date_of_joining}
                    disabled={!isStaffEditing}
                    onChange={val => setFormData({ ...formData, date_of_joining: val })}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">System Limit (Max Clients)</Label>
                  <Input
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
                  <Button variant="outline" className="flex-1 h-11" onClick={handleCancelStaff} disabled={saving}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-11" onClick={handleSaveStaff} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileUp className="h-5 w-5 text-primary" /> Document Verification
              </CardTitle>
              <CardDescription>Manage recruiter's document uploads and verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 text-xs text-blue-700 dark:text-blue-400">
                <Shield className="h-5 w-5 shrink-0" />
                <p>Admin can upload or update recruiter documents on their behalf</p>
              </div>

              <div className="grid gap-6">
                {/* Highest Degree Certificate */}
                <div className="space-y-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Highest Degree Certificate</Label>
                    {documents.highest_degree_certificate_file && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Uploaded
                      </div>
                    )}
                  </div>
                  <input
                    ref={degreeInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && handleDocumentUpload('highest_degree_certificate', e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {documents.highest_degree_certificate_file ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">File: {documents.highest_degree_certificate_file.name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded: {new Date(documents.highest_degree_certificate_file.uploaded_at).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-xs"
                          disabled={uploadingDocs.highest_degree_certificate}
                          onClick={() => degreeInputRef.current?.click()}
                        >
                          {uploadingDocs.highest_degree_certificate ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                            </>
                          ) : (
                            <>
                              <FileUp className="h-4 w-4 mr-2" /> Replace File
                            </>
                          )}
                        </Button>
                        <DocumentPreview url={documents.highest_degree_certificate_file?.url} label="View" variant="button" />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      disabled={uploadingDocs.highest_degree_certificate}
                      onClick={() => degreeInputRef.current?.click()}
                    >
                      {uploadingDocs.highest_degree_certificate ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4 mr-2" /> Upload Certificate
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Government ID Card */}
                <div className="space-y-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Government ID Card (Aadhaar)</Label>
                    {documents.government_id_card_file && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Uploaded
                      </div>
                    )}
                  </div>
                  <input
                    ref={idCardInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && handleDocumentUpload('government_id_card', e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {documents.government_id_card_file ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">File: {documents.government_id_card_file.name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded: {new Date(documents.government_id_card_file.uploaded_at).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-xs"
                          disabled={uploadingDocs.government_id_card}
                          onClick={() => idCardInputRef.current?.click()}
                        >
                          {uploadingDocs.government_id_card ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                            </>
                          ) : (
                            <>
                              <FileUp className="h-4 w-4 mr-2" /> Replace File
                            </>
                          )}
                        </Button>
                        <DocumentPreview url={documents.government_id_card_file?.url} label="View" variant="button" />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      disabled={uploadingDocs.government_id_card}
                      onClick={() => idCardInputRef.current?.click()}
                    >
                      {uploadingDocs.government_id_card ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4 mr-2" /> Upload ID Card
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* PAN Card */}
                <div className="space-y-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">PAN Card</Label>
                    {documents.pan_card_file && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Uploaded
                      </div>
                    )}
                  </div>
                  <input
                    ref={panCardInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && handleDocumentUpload('pan_card', e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {documents.pan_card_file ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">File: {documents.pan_card_file.name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded: {new Date(documents.pan_card_file.uploaded_at).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-xs"
                          disabled={uploadingDocs.pan_card}
                          onClick={() => panCardInputRef.current?.click()}
                        >
                          {uploadingDocs.pan_card ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                            </>
                          ) : (
                            <>
                              <FileUp className="h-4 w-4 mr-2" /> Replace File
                            </>
                          )}
                        </Button>
                        <DocumentPreview url={documents.pan_card_file?.url} label="View" variant="button" />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      disabled={uploadingDocs.pan_card}
                      onClick={() => panCardInputRef.current?.click()}
                    >
                      {uploadingDocs.pan_card ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4 mr-2" /> Upload PAN Card
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Bank Passbook */}
                <div className="space-y-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Bank Passbook First Page</Label>
                    {documents.bank_passbook_file && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Uploaded
                      </div>
                    )}
                  </div>
                  <input
                    ref={bankPassbookInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && handleDocumentUpload('bank_passbook', e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  {documents.bank_passbook_file ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">File: {documents.bank_passbook_file.name}</p>
                      <p className="text-xs text-muted-foreground">Uploaded: {new Date(documents.bank_passbook_file.uploaded_at).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 text-xs"
                          disabled={uploadingDocs.bank_passbook}
                          onClick={() => bankPassbookInputRef.current?.click()}
                        >
                          {uploadingDocs.bank_passbook ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                            </>
                          ) : (
                            <>
                              <FileUp className="h-4 w-4 mr-2" /> Replace File
                            </>
                          )}
                        </Button>
                        <DocumentPreview url={documents.bank_passbook_file?.url} label="View" variant="button" />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      disabled={uploadingDocs.bank_passbook}
                      onClick={() => bankPassbookInputRef.current?.click()}
                    >
                      {uploadingDocs.bank_passbook ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                        </>
                      ) : (
                        <>
                          <FileUp className="h-4 w-4 mr-2" /> Upload Passbook
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          {stats ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none bg-primary/5 shadow-none ring-1 ring-primary/10 overflow-hidden relative group rounded-3xl">
                <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-primary/5 group-hover:scale-110 transition-transform" />
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-primary/70">Activity Overview</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-4xl font-black text-foreground tracking-tighter">{stats.apps_today}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Apps Today</p>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-foreground tracking-tighter">{stats.apps_week}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 rounded-[2rem] bg-amber-500/5 ring-1 ring-amber-500/10 flex items-center justify-between group hover:bg-amber-500/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm ring-1 ring-amber-500/20 group-hover:rotate-12 transition-transform">
                      <Briefcase className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest leading-tight">Pipeline</p>
                      <p className="text-xl font-black text-foreground tracking-tight">Active Interviews</p>
                    </div>
                  </div>
                  <span className="text-4xl font-black text-amber-600 pr-4">{stats.interviews_week}</span>
                </div>


              </div>
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <BarChart3 className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-sm font-bold text-muted-foreground">No performance data available for this period.</p>
            </div>
          )}
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40 overflow-hidden rounded-3xl">
            <AdminAuditTab targetId={id!} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRecruiterDetail;
