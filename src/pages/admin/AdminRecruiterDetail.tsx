import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { recruitersApi, authApi, auditApi, filesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Mail, Phone, MapPin, Briefcase, Award, Calendar, 
  BarChart3, TrendingUp, History, Save, ArrowLeft, Loader2,
  Shield, CheckCircle2, XCircle, Clock, Eye, EyeOff, Landmark, Users, FileUp, Check
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";
import StatusBadge from "@/components/dashboard/StatusBadge";

interface AdminRecruiterDetailProps {
  id?: string;
}

const AdminRecruiterDetail = ({ id: propId }: AdminRecruiterDetailProps) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [recruiter, setRecruiter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    work_type_preference: ""
  });
  const [bankDetails, setBankDetails] = useState<any>({
    bank_name: "",
    account_number: "",
    routing_number: ""
  });
  const [maskBank, setMaskBank] = useState(true);
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

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
        work_type_preference: data.work_type_preference || data.profile?.work_type_preference || ""
      });

      if (data.bank_details || data.profile?.bank_details) {
        const bank = data.bank_details || data.profile?.bank_details;
        setBankDetails({
          bank_name: bank.bank_name || "",
          account_number: bank.account_number_last4 ? `****${bank.account_number_last4}` : bank.account_number || "",
          routing_number: bank.routing_number_last4 ? `****${bank.routing_number_last4}` : bank.routing_number || ""
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

  useEffect(() => { fetchData(); }, [id]);

  const handleUpdate = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const cleanData = { ...formData };
      
      // Convert MM-dd-yyyy back to yyyy-MM-dd for backend
      if (cleanData.graduation_date && cleanData.graduation_date.includes("-")) {
        try {
          // DatePicker gives MM-dd-yyyy
          const parts = cleanData.graduation_date.split("-");
          if (parts[0].length === 2 && parts[2].length === 4) {
            const parsed = parse(cleanData.graduation_date, "MM-dd-yyyy", new Date());
            if (!isNaN(parsed.getTime())) cleanData.graduation_date = format(parsed, "yyyy-MM-dd");
          }
        } catch(e) {}
      }
      
      if (cleanData.date_of_joining && cleanData.date_of_joining.includes("-")) {
        try {
          const parts = cleanData.date_of_joining.split("-");
          if (parts[0].length === 2 && parts[2].length === 4) {
             const parsed = parse(cleanData.date_of_joining, "MM-dd-yyyy", new Date());
             if (!isNaN(parsed.getTime())) cleanData.date_of_joining = format(parsed, "yyyy-MM-dd");
          }
        } catch(e) {}
      }

      if (!cleanData.graduation_date) (cleanData.graduation_date as any) = null;
      if (!cleanData.date_of_joining) (cleanData.date_of_joining as any) = null;
      
      await recruitersApi.adminUpdateProfile(id, cleanData);
      toast({ title: "Profile updated successfully" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.response?.data?.error || "Check your input", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setSavingBank(true);
    try {
      await recruitersApi.adminUpdateProfile(id!, { bank_details: bankDetails });
      toast({ title: "Bank details updated successfully" });
      setIsBankEditing(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
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

  if (loading) return (
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
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">{recruiter.full_name}</h2>
                <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">
                  {recruiter.display_id}
                </span>
              </div>
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
          <Button 
            onClick={handleUpdate} 
            disabled={saving}
            className="rounded-xl px-6 h-11 font-black tracking-tight shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-card/50 p-1 border border-border/40 rounded-2xl mb-6">
          <TabsTrigger value="overview" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="assigned_candidates" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Assigned Candidates</TabsTrigger>
          <TabsTrigger value="professional" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Professional</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Staff Details</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Documents</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Performance</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Identity & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
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
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                    <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                    <Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="h-10 rounded-lg bg-muted/20 text-xs" />
                  </div>
                </div>
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
                  <Input disabled={!isBankEditing} className="bg-background/50 h-10 text-sm" value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})} placeholder="e.g. Chase Bank, Wells Fargo" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Account Number</Label>
                  <div className="relative">
                    <Input 
                      disabled={!isBankEditing}
                      type={maskBank ? "password" : "text"} 
                      className="bg-background/50 h-10 text-sm tracking-wider pr-10" 
                      value={bankDetails.account_number} 
                      onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} 
                    />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground" onClick={() => setMaskBank(!maskBank)}>
                      {maskBank ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Routing Number</Label>
                  <Input disabled={!isBankEditing} className="bg-background/50 h-10 text-sm" value={bankDetails.routing_number} onChange={e => setBankDetails({...bankDetails, routing_number: e.target.value})} />
                </div>
                {isBankEditing && (
                  <Button className="w-full h-11" onClick={handleSaveBankDetails} disabled={savingBank}>
                    {savingBank ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Bank Details
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-secondary/5 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-secondary" /> Education Background
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">University / Institute</Label>
                  <Input 
                    value={formData.university} 
                    onChange={e => setFormData({...formData, university: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Degree & Major</Label>
                  <Input 
                    value={`${formData.degree || ""}${formData.degree && formData.major ? " & " : ""}${formData.major || ""}`} 
                    onChange={e => {
                      const val = e.target.value;
                      const [d, ...m] = val.split("&");
                      setFormData(prev => ({ 
                        ...prev, 
                        degree: (d || "").trim(), 
                        major: m.join("/").trim() 
                      }));
                    }}
                    className="h-11 rounded-xl bg-muted/20"
                    placeholder="e.g., Master's in Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Graduation Date</Label>
                  <DatePicker 
                    value={formData.graduation_date} 
                    onChange={val => setFormData({...formData, graduation_date: val})} 
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
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
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                        {a.display_id || `HYRCDT${(a.candidate_id || a.id)?.toString().slice(-6).toUpperCase()}`}
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

        {/* Professional Tab */}
        <TabsContent value="professional">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Professional Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">LinkedIn URL</Label>
                  <Input 
                    type="url"
                    value={formData.linkedin_url} 
                    onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                  {formData.linkedin_url && (
                    <a href={formData.linkedin_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 ml-1">
                      Open Profile Link
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Other Social Profile (GitHub/Portfolio)</Label>
                  <Input 
                    type="url"
                    value={formData.social_profile_url} 
                    onChange={e => setFormData({...formData, social_profile_url: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md ring-1 ring-border/40">
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" /> Preferences & Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Work Type Preference</Label>
                  <Input 
                    value={formData.work_type_preference} 
                    onChange={e => setFormData({...formData, work_type_preference: e.target.value})}
                    placeholder="e.g. Full-time, Remote"
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Prior Recruitment Experience</Label>
                  <Input 
                    value={formData.prior_recruitment_experience} 
                    onChange={e => setFormData({...formData, prior_recruitment_experience: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
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
            </CardHeader>
            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Company Name</Label>
                  <Input 
                    value={formData.company_name} 
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Employee ID</Label>
                  <Input 
                    value={formData.employee_id} 
                    onChange={e => setFormData({...formData, employee_id: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Date of Joining</Label>
                  <DatePicker 
                    value={formData.date_of_joining} 
                    onChange={val => setFormData({...formData, date_of_joining: val})} 
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Department</Label>
                  <Input 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className="h-11 rounded-xl bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Specialization</Label>
                  <Input 
                    value={formData.specialization} 
                    onChange={e => setFormData({...formData, specialization: e.target.value})}
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
                    onChange={e => setFormData({...formData, max_clients: parseInt(e.target.value) || 3})}
                    className="h-11 rounded-xl bg-muted/20 font-bold"
                  />
                </div>
              </div>
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
                            <FileUp className="h-4 w-4 mr-2" /> Replace File
                          </>
                        )}
                      </Button>
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
                            <FileUp className="h-4 w-4 mr-2" /> Replace File
                          </>
                        )}
                      </Button>
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
                            <FileUp className="h-4 w-4 mr-2" /> Replace File
                          </>
                        )}
                      </Button>
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
                            <FileUp className="h-4 w-4 mr-2" /> Replace File
                          </>
                        )}
                      </Button>
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
