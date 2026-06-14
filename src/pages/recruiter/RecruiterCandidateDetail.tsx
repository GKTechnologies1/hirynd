import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, recruitersApi, billingApi, filesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, FileText, Briefcase, KeyRound, ClipboardList, Plus, Trash2, User, Phone, Shield, AlertTriangle, Sparkles, Loader2, MessageSquare, History, Globe, ExternalLink, Save, ChevronDown, Eye, EyeOff, LayoutDashboard, FileCheck, Calendar as CalendarIcon, Award, UserCheck, X, Pencil, CheckCircle, Upload } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { motion } from "framer-motion";
import RecruiterInterviewsTab from "@/components/recruiter/RecruiterInterviewsTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import ChatTab from "@/components/recruiter/ChatTab";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import CustomCredentialsDialog from "@/components/dashboard/CustomCredentialsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formatToMMDDYYYY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  if (dateStr.toLowerCase() === "present") return "Present";
  const formatted = formatDate(dateStr);
  return formatted === "—" ? dateStr : formatted;
};

const COUNTRY_CODES = [
  { code: "+1", country: "USA/Canada" },
  { code: "+91", country: "India" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+86", country: "China" },
];

const SENSITIVE_FIELDS = [
  "gmail_password", 
  "linkedin_password", 
  "indeed_password", 
  "dice_password", 
  "monster_password", 
  "ziprecruiter_password",
  "linkedin_pass",
  "indeed_pass",
  "dice_pass",
  "monster_pass",
  "ziprecruiter_pass"
];

const FormField = ({ id, label, mandatory, children, error, icon: Icon, description }: any) => (
  <div id={id} className="space-y-2 group text-left">
    <div className="flex items-center gap-2 ml-1">
      {Icon && <Icon className="h-4 w-4 text-secondary/80" />}
      <Label className="text-sm font-semibold text-card-foreground/90 flex items-center">
        {label} {mandatory && <span className="text-destructive ml-1 font-bold">*</span>}
      </Label>
    </div>
    {description && <p className="text-[10px] text-muted-foreground font-medium ml-1">{description}</p>}
    <div className="relative">
      {children}
    </div>
    {error && <p className="text-[11px] font-bold text-destructive mt-1 ml-1 animate-in fade-in duration-150">{error}</p>}
  </div>
);

const PasswordField = ({ value, onChange, placeholder, error, mandatory, label, icon: Icon, id }: any) => {
  const [show, setShow] = useState(false);
  return (
    <FormField id={id} label={label} mandatory={mandatory} error={error} icon={Icon}>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 rounded-xl bg-white border-amber-200 pr-10",
            error && "border-destructive ring-1 ring-destructive/20"
          )}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-secondary transition-colors p-2"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );
};

const CREDENTIAL_FIELD_LABELS: Record<string, string> = {
  email: "Email Address",
  bachelors_grad_date: "Bachelors Graduation Date",
  first_entry_us: "First Entry into the U.S.",
  masters_grad_date: "Masters Graduation Date",
  opt_start_date: "OPT Start Date",
  opt_offer_submitted: "Is OPT Offer Submitted?",
  offer_letter_url: "OPT Offer Letter",
  offer_letter_file: "OPT Offer Letter",
  full_name: "Full Name",
  personal_email: "Personal Email Address",
  phone_number: "Mobile Phone Number",
  location: "Location (City, State)",
  preferred_roles: "Preferred Job Roles",
  preferred_locations: "Preferred Location(s)",
  linkedin_id: "LinkedIn Login ID",
  linkedin_pass: "LinkedIn Password",
  indeed_id: "Indeed Login ID",
  indeed_pass: "Indeed Password",
  dice_id: "Dice Login ID",
  dice_pass: "Dice Password",
  monster_id: "Monster Login ID",
  monster_pass: "Monster Password",
  ziprecruiter_id: "ZipRecruiter Login ID",
  ziprecruiter_pass: "ZipRecruiter Password",
  other_platforms: "Other Platform accounts",

  // Recruiter/Admin Form Fields
  full_legal_name: "Full Legal Name",
  phone: "Phone Number",
  location_city_state: "Location (City, State)",
  preferred_job_roles: "Preferred Job Roles",
  linkedin_login_id: "LinkedIn Login ID",
  linkedin_password: "LinkedIn Password",
  indeed_login_id: "Indeed Login ID",
  indeed_password: "Indeed Password",
  dice_login_id: "Dice Login ID",
  dice_password: "Dice Password",
  monster_login_id: "Monster Login ID",
  monster_password: "Monster Password",
  ziprecruiter_login_id: "ZipRecruiter Login ID",
  ziprecruiter_password: "ZipRecruiter Password",
  bachelors_graduation_date: "Bachelors Graduation Date",
  masters_graduation_date: "Masters Graduation Date",
  shared_email: "Shared Email Address",
  opt_offer_letter_submitted: "Is OPT Offer Submitted?",
  opt_offer_letter_url: "OPT Offer Letter",
  gmail_password: "Gmail Password",
  current_title: "Current Title",
  years_experience: "Years of Experience",
  visa_details: "Visa Details",
  certifications: "Certifications",
  references_if_needed: "References If Needed",
  work_history_summary: "Work History Summary",
  skills_summary: "Skills Summary",
  tools_and_technologies: "Tools & Technologies",
};

const DUPLICATE_PAIRS: [string, string][] = [
  ["full_legal_name", "full_name"],
  ["phone", "phone_number"],
  ["location_city_state", "location"],
  ["preferred_job_roles", "preferred_roles"],
  ["linkedin_login_id", "linkedin_id"],
  ["linkedin_password", "linkedin_pass"],
  ["indeed_login_id", "indeed_id"],
  ["indeed_password", "indeed_pass"],
  ["dice_login_id", "dice_id"],
  ["dice_password", "dice_pass"],
  ["monster_login_id", "monster_id"],
  ["monster_password", "monster_pass"],
  ["ziprecruiter_login_id", "ziprecruiter_id"],
  ["ziprecruiter_password", "ziprecruiter_pass"],
  ["bachelors_graduation_date", "bachelors_grad_date"],
  ["masters_graduation_date", "masters_grad_date"],
  ["shared_email", "email"],
  ["opt_offer_letter_submitted", "opt_offer_submitted"],
  ["opt_offer_letter_url", "offer_letter_url"],
];

const JobDescriptionCell = ({ 
  company, 
  role, 
  description, 
  onReadMore 
}: { 
  company: string; 
  role: string; 
  description?: string; 
  onReadMore: (company: string, role: string, desc: string) => void; 
}) => {
  if (!description) return <span className="text-muted-foreground">—</span>;
  
  const isLengthy = description.length > 100;
  if (!isLengthy) {
    return <span className="text-xs whitespace-pre-wrap">{description}</span>;
  }
  
  const preview = description.slice(0, 100) + "...";
  return (
    <div className="text-xs">
      <span>{preview}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadMore(company, role, description);
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
      >
        Read More
      </button>
    </div>
  );
};


const navItems = [
  { label: "My Candidates", path: "/recruiter-dashboard", icon: <Users className="h-4 w-4" /> },
  { label: "Assigned To", path: "/recruiter-dashboard/assigned-to", icon: <UserCheck className="h-4 w-4" /> },
  { label: "Daily Log", path: "/recruiter-dashboard/daily-log", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "My Profile", path: "/recruiter-dashboard/profile", icon: <User className="h-4 w-4" /> },
];

interface RecruiterCandidateDetailProps {
  candidateId: string;
}

const JOB_STATUSES = ["Applied", "Screening", "Screening Scheduled", "Interview", "Interview Scheduled", "Offer", "Rejected", "No Response"];

const RecruiterCandidateDetail = ({ candidateId }: RecruiterCandidateDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeJobDesc, setActiveJobDesc] = useState<{ company: string; role: string; description: string } | null>(null);

  const [appSearchRole, setAppSearchRole] = useState("");
  const [appSearchDate, setAppSearchDate] = useState("");

  const filteredJobPostings = useMemo(() => {
    return jobPostings.filter(j => {
      const matchRole = !appSearchRole || j.role_title?.toLowerCase().includes(appSearchRole.toLowerCase());
      const matchDate = !appSearchDate || formatDate(j.log_date || j.created_at) === appSearchDate;
      return matchRole && matchDate;
    });
  }, [jobPostings, appSearchRole, appSearchDate]);

  const handleOpenDescription = (company: string, role: string, description: string) => {
    setActiveJobDesc({ company, role, description });
  };

  // Credential form
  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [credForm, setCredForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingCred, setSavingCred] = useState(false);
  const [showCredPasswords, setShowCredPasswords] = useState<Record<string, boolean>>({});

  const toggleCredPw = (k: string) => setShowCredPasswords(p => ({ ...p, [k]: !p[k] }));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daily log form
  const [logCount, setLogCount] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [jobLinks, setJobLinks] = useState<Array<{ company_name: string; role_title: string; job_url: string; job_description: string; resume_used: string; status: string; }>>([]);
  const [savingLog, setSavingLog] = useState(false);
  const [fetchingJob, setFetchingJob] = useState<Record<number, boolean>>({});

  const fetchAll = async (showLoading = true, isPolling = false) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    const backgroundConfig = isPolling ? { headers: { 'X-Background-Request': 'true' } } : undefined;
    try {
      const { data: cand } = await candidatesApi.detail(candidateId, backgroundConfig);
      setCandidate(cand);

      if (cand) {
        const [intakeRes, roleRes, credRes, logsRes, jobsRes, subRes] = await Promise.all([
          candidatesApi.getIntake(candidateId, backgroundConfig).catch(() => ({ data: null })),
          candidatesApi.getRoles(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          candidatesApi.getCredentials(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          recruitersApi.getDailyLogs(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          recruitersApi.getJobApplications(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          billingApi.subscription(candidateId, backgroundConfig).catch(() => ({ data: null })),
        ]);
        setIntake(intakeRes.data || null);
        setRoles(roleRes.data || []);
        const creds = credRes.data || [];
        setCredentials(creds);

        if (creds && creds.length > 0 && creds[0].data) {
          const data = creds[0].data;
          let country_code = "+1";
          let phone = data.phone_number || "";
          if (phone.startsWith("+")) {
            const parts = phone.split(" ");
            if (parts.length > 1) {
              country_code = parts[0];
              phone = parts.slice(1).join(" ");
            }
          }
          setCredForm({
            ...data,
            country_code,
            phone_number: phone,
            offer_letter_file: data.offer_letter_url || null,
          });
        } else {
          let country_code = "+1";
          let phone = cand?.profile?.phone || "";
          if (phone.startsWith("+")) {
            const parts = phone.split(" ");
            if (parts.length > 1) {
              country_code = parts[0];
              phone = parts.slice(1).join(" ");
            }
          }
          setCredForm({
            email: cand?.email || cand?.profile?.email || "",
            bachelors_grad_date: cand?.bachelors_graduation_date || "",
            first_entry_us: cand?.first_entry_us || "",
            masters_grad_date: cand?.masters_graduation_date || "",
            opt_start_date: cand?.opt_start_date || "",
            opt_offer_submitted: "no",
            offer_letter_file: null,
            preferred_roles: cand?.preferred_roles || "",
            preferred_locations: cand?.preferred_locations || "",
            full_name: cand?.full_name || cand?.profile?.full_name || "",
            personal_email: cand?.personal_email || "",
            country_code: country_code,
            phone_number: phone,
            location: cand?.current_location || "",
            linkedin_id: cand?.linkedin_url || cand?.profile?.linkedin_profile || "",
            linkedin_pass: "",
            indeed_id: "",
            indeed_pass: "",
            dice_id: "",
            dice_pass: "",
            monster_id: "",
            monster_pass: "",
            ziprecruiter_id: "",
            ziprecruiter_pass: "",
            other_platforms: "",
            custom_platforms: [],
          });
        }

        const logs = logsRes.data || [];
        setDailyLogs(logs);
        setJobPostings(jobsRes.data || []);
        setSubscription(subRes?.data?.id ? subRes.data : null);
      }
    } catch { }
    if (showLoading) setLoading(false);
  };

  const resumes = useMemo(() => {
    if (!credentials.length || !credentials[0].data) return [];
    const data = credentials[0].data;
    const list = [];
    if (data.primary_resume) list.push({ label: "Primary Resume", url: data.primary_resume });
    if (data.alternate_resume_versions && Array.isArray(data.alternate_resume_versions)) {
      data.alternate_resume_versions.forEach((url: string, i: number) => {
        list.push({ label: `Resume Version ${i + 1}`, url });
      });
    }
    return list;
  }, [credentials]);

  useEffect(() => {
    fetchAll(true, false);
    const interval = setInterval(() => {
      fetchAll(false, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [candidateId, user]);

  const handleCredChange = (field: string, value: any) => {
    setCredForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCredential = async () => {
    // Validation
    const required = [
      "email", "bachelors_grad_date", "first_entry_us", "masters_grad_date",
      "opt_start_date", "opt_offer_submitted", "preferred_roles",
      "preferred_locations", "full_name", "personal_email", "phone_number",
      "location", "linkedin_id", "linkedin_pass"
    ];
    for (const f of required) {
      if (!credForm[f] && f !== "offer_letter_file") {
        toast({
          title: "Validation Error",
          description: `${f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} is required.`,
          variant: "destructive"
        });
        return;
      }
    }

    if (credForm.opt_offer_submitted === "yes" && !credForm.offer_letter_file) {
      toast({
        title: "Validation Error",
        description: "Offer letter is required.",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (credForm.email && !emailRegex.test(credForm.email)) {
      toast({ title: "Validation Error", description: "Invalid email address format.", variant: "destructive" });
      return;
    }
    if (credForm.personal_email && !emailRegex.test(credForm.personal_email)) {
      toast({ title: "Validation Error", description: "Invalid personal email address format.", variant: "destructive" });
      return;
    }

    // Password validation (min 8)
    const passFields = ["linkedin_pass", "indeed_pass", "dice_pass", "monster_pass", "ziprecruiter_pass"];
    for (const field of passFields) {
      if (credForm[field] && credForm[field].toString().length < 8) {
        toast({ title: "Validation Error", description: `${field.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} must be at least 8 characters.`, variant: "destructive" });
        return;
      }
    }

    // Phone validation
    if (credForm.phone_number && !/^\d+$/.test(credForm.phone_number)) {
      toast({ title: "Validation Error", description: "Phone number must be numeric.", variant: "destructive" });
      return;
    }

    setSavingCred(true);
    try {
      // Step 1: Upload file if selected
      let offerLetterUrl = typeof credForm.offer_letter_file === "string" ? credForm.offer_letter_file : "";
      if (credForm.opt_offer_submitted === "yes" && credForm.offer_letter_file instanceof File) {
        const res = await filesApi.upload(credForm.offer_letter_file, "offer_letter");
        offerLetterUrl = res.data.url;
      }

      // Step 2: Build payload
      const payload = {
        email: credForm.email,
        bachelors_grad_date: credForm.bachelors_grad_date,
        first_entry_us: credForm.first_entry_us,
        masters_grad_date: credForm.masters_grad_date,
        opt_start_date: credForm.opt_start_date,
        opt_offer_submitted: credForm.opt_offer_submitted,
        offer_letter_url: credForm.opt_offer_submitted === "yes" ? (offerLetterUrl || undefined) : undefined,
        full_name: credForm.full_name,
        personal_email: credForm.personal_email,
        phone_number: `${credForm.country_code} ${credForm.phone_number}`.trim(),
        location: credForm.location,
        preferred_roles: credForm.preferred_roles,
        preferred_locations: credForm.preferred_locations,
        linkedin_id: credForm.linkedin_id,
        linkedin_pass: credForm.linkedin_pass,
        indeed_id: credForm.indeed_id,
        indeed_pass: credForm.indeed_pass,
        dice_id: credForm.dice_id,
        dice_pass: credForm.dice_pass,
        monster_id: credForm.monster_id,
        monster_pass: credForm.monster_pass,
        ziprecruiter_id: credForm.ziprecruiter_id,
        ziprecruiter_pass: credForm.ziprecruiter_pass,
        other_platforms: credForm.other_platforms,
        custom_platforms: credForm.custom_platforms || [],
        submitted_timestamp: new Date().toLocaleString(),
      };

      await candidatesApi.upsertCredential(candidateId, payload);
      toast({ title: "Credentials saved by Recruiter" });
      setIsEditingCreds(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingCred(false);
  };

  const handleUpdateJobStatus = async (jobId: string, status: string) => {
    try {
      const normalizedStatus = status.toLowerCase().replace(/ /g, "_");
      await recruitersApi.updateJobStatus(jobId, normalizedStatus);
      toast({ title: "Application status updated" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const addJobLink = () => {
    setJobLinks([...jobLinks, { company_name: "", role_title: "", job_url: "", job_description: "", resume_used: "", status: "Applied" }]);
  };

  const updateJobLink = (idx: number, field: string, value: string) => {
    const updated = [...jobLinks];
    (updated[idx] as any)[field] = value;
    setJobLinks(updated);
  };

  const removeJobLink = (idx: number) => {
    setJobLinks(jobLinks.filter((_, i) => i !== idx));
  };

  const handleFetchJobDetails = async (idx: number) => {
    const url = jobLinks[idx].job_url;
    if (!url || !url.startsWith("http")) {
      toast({ title: "Valid URL required", variant: "destructive" }); return;
    }
    setFetchingJob(prev => ({ ...prev, [idx]: true }));
    try {
      const { data } = await recruitersApi.fetchJobDetails(url);
      if (data.role_title || data.company_name || data.job_description) {
        const updated = [...jobLinks];
        if (data.role_title) updated[idx].role_title = data.role_title;
        if (data.company_name) updated[idx].company_name = data.company_name;
        if (data.job_description) updated[idx].job_description = data.job_description;
        setJobLinks(updated);
        toast({ title: "Job details fetched!" });
      } else {
        toast({ title: "Could not extract details", description: "Please enter manually." });
      }
    } catch {
      toast({ title: "Fetch failed" });
    }
    setFetchingJob(prev => ({ ...prev, [idx]: false }));
  };

  const handleSubmitDailyLog = async () => {
    if (!logCount || Number(logCount) < 0) {
      toast({ title: "Enter application count", variant: "destructive" }); return;
    }
    setSavingLog(true);
    try {
      await recruitersApi.submitDailyLog(candidateId, {
        applications_count: Number(logCount) || 0,
        notes: logNotes,
      });
      toast({ title: "Daily log submitted" });
      setLogCount(""); setLogNotes("");
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingLog(false);
  };

  const handleSubmitJobApplication = async () => {
    const validLinks = jobLinks.filter(j => j.job_url.trim() || j.company_name.trim());
    if (validLinks.length === 0) {
      toast({ title: "Add at least one job link", variant: "destructive" }); return;
    }
    setSavingLog(true);
    try {
      await recruitersApi.submitJobApplications(candidateId, {
        job_links: validLinks.map(j => ({
          company_name: j.company_name,
          role_title: j.role_title,
          job_url: j.job_url,
          job_description: j.job_description,
          resume_used: j.resume_used,
          status: j.status.toLowerCase().replace(/ /g, "_"),
        })),
      });
      toast({ title: "Job applications submitted" });
      setJobLinks([]);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingLog(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mr-2 inline" /> Loading candidate file...</div>;
  if (!candidate) return <div className="p-8 text-center text-muted-foreground">Candidate not found.</div>;

  const intakeData = intake?.data as Record<string, any> | null;

  const nameParts = (candidate?.profile?.full_name || candidate?.full_name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "—";
  const lastName = nameParts.slice(1).join(" ") || "—";

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={candidate.status} />
          <h2 className="text-xl font-bold">{candidate?.profile?.full_name || candidate?.full_name || "Unknown"}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{candidate?.email || candidate?.profile?.email || ""}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.history.back()} className="rounded-xl px-4">
          ← Back to Dashboard
        </Button>
      </div>

      {/* Banners */}
      {candidate.status === "placed" && (
        <Card className="mb-6 border-secondary/50 bg-secondary/10 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-6 w-6 text-secondary" />
            <p className="font-semibold text-secondary-foreground text-sm">Success! Candidate Placed. Submission logs are now archived.</p>
          </CardContent>
        </Card>
      )}
      {subscription && ["past_due", "canceled", "unpaid", "grace_period", "paused"].includes(subscription.status) && (
        <Card className="mb-6 border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-bold text-destructive text-sm italic">Billing Restriction Active — Marketing Suspended</p>
              <p className="text-xs text-destructive/80 mt-0.5">Marketing activities are disabled until the candidate resolves their subscription issue.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start border border-border/50 rounded-2xl shadow-sm">
          {[
            { value: "overview", label: "Overview", icon: <User className="h-3.5 w-3.5" /> },
            { value: "intake", label: "Intake", icon: <FileText className="h-3.5 w-3.5" /> },
            { value: "roles", label: "Roles", icon: <Briefcase className="h-3.5 w-3.5" /> },
            { value: "credentials", label: "Credentials", icon: <KeyRound className="h-3.5 w-3.5" /> },
            { value: "daily-log", label: "Daily Log", icon: <ClipboardList className="h-3.5 w-3.5" /> },
            { value: "applications", label: "Applications", icon: <Globe className="h-3.5 w-3.5" /> },
            { value: "interviews", label: "Interviews", icon: <Phone className="h-3.5 w-3.5" /> },
            { value: "messages", label: "Messages", icon: <MessageSquare className="h-3.5 w-3.5" /> },
            { value: "audit", label: "Audit", icon: <Shield className="h-3.5 w-3.5" /> },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold gap-2">
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-card/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Total Applications</p>
                    <h3 className="text-2xl font-bold mt-1">{candidate?.total_applications || 0}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Total Interviews</p>
                    <h3 className="text-2xl font-bold mt-1">{candidate?.total_interviews || 0}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader><CardTitle className="text-base font-bold">Registration Data</CardTitle></CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">First Name *</p>
                <p className="font-medium">{firstName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Last Name *</p>
                <p className="font-medium">{lastName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Email *</p>
                <p className="font-medium">{candidate?.profile?.email || candidate?.email || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Phone Number *</p>
                <p className="font-medium">{candidate?.profile?.phone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">University / College *</p>
                <p className="font-medium">{candidate?.university || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Degree & Major *</p>
                <p className="font-medium">
                  {candidate?.degree && candidate?.major
                    ? `${candidate.degree} / ${candidate.major}`
                    : (candidate?.degree || candidate?.major || "—")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Graduation Date *</p>
                <p className="font-medium">{formatToMMDDYYYY(candidate?.graduation_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">How did you hear about us? *</p>
                <p className="font-medium">{candidate?.referral_source || "—"}</p>
              </div>

              {candidate?.referral_source === "Friend" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Friend's Name *</p>
                  <p className="font-medium">{candidate?.referral_friend_name || "—"}</p>
                </div>
              )}

              {candidate?.referral_source === "Other" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Please Specify Other *</p>
                  <p className="font-medium">{candidate?.referral_friend_name || "—"}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">LinkedIn URL</p>
                <p className="font-medium">
                  {candidate?.linkedin_url ? (
                    <a href={candidate.linkedin_url.startsWith('http') ? candidate.linkedin_url : `https://${candidate.linkedin_url}`} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                      View Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">GitHub URL</p>
                <p className="font-medium">
                  {candidate?.github_url ? (
                    <a href={candidate.github_url.startsWith('http') ? candidate.github_url : `https://${candidate.github_url}`} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                      View Codebase <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Portfolio / Website</p>
                <p className="font-medium">
                  {candidate?.portfolio_url ? (
                    <a href={candidate.portfolio_url.startsWith('http') ? candidate.portfolio_url : `https://${candidate.portfolio_url}`} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                      Open Website <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Visa Status *</p>
                <p className="font-medium bg-secondary/10 text-secondary w-fit px-2 py-0.5 rounded text-xs">
                  {candidate?.visa_status || "—"}
                </p>
              </div>

              {candidate?.visa_status === "OPT" && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">OPT End Date</p>
                  <p className="font-medium">{formatToMMDDYYYY(candidate?.opt_end_date)}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Current Location *</p>
                <p className="font-medium">{candidate?.current_location || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Resume File (PDF/DOCX) *</p>
                <div className="font-medium mt-1">
                  {candidate?.resume_file || candidate?.resume_url ? (
                    <DocumentPreview
                      url={candidate.resume_file || candidate.resume_url}
                      label="View Resume"
                      variant="button"
                      className="h-8 text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-3 py-1 rounded-lg"
                    />
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Additional Notes</p>
                <p className="font-medium text-foreground whitespace-pre-wrap">{candidate?.notes || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intake" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader className="border-b border-border/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Client Intake Sheet</CardTitle>
                  <CardDescription className="text-xs">Comprehensive details provided by the candidate at onboarding.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {intakeData ? (
                <div className="space-y-8 animate-in fade-in duration-350">
                  {!intake.is_locked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-center gap-2">
                      <Clock className="h-4 w-4" /> This is a draft version. The candidate has not yet submitted and locked this form.
                    </div>
                  )}

                  {/* Personal & Contact Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Users className="h-4 w-4" /> Personal & Contact Details
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">First Name</p>
                        <p className="font-bold text-neutral-900">{intakeData.first_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Last Name</p>
                        <p className="font-bold text-neutral-900">{intakeData.last_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Date of Birth</p>
                        <p className="font-bold text-neutral-900">{intakeData.dob || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Phone Number</p>
                        <p className="font-bold text-neutral-900">{intakeData.phone_number || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Email Address</p>
                        <p className="font-bold text-neutral-900 break-all">{intakeData.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Marketing Email</p>
                        <p className="font-bold text-neutral-900 break-all">{intakeData.marketing_email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Marketing Phone</p>
                        <p className="font-bold text-neutral-900">{intakeData.marketing_phone || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground font-semibold mb-0.5">Current Address</p>
                        <p className="font-bold text-neutral-900 leading-relaxed">{intakeData.current_address || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground font-semibold mb-0.5">Mailing Address</p>
                        <p className="font-bold text-neutral-900 leading-relaxed">{intakeData.mailing_address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Education Background */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Award className="h-4 w-4" /> Educational Background
                    </h4>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Highest / Master's */}
                      <div className="bg-neutral-50/50 p-4 rounded-xl border space-y-3 text-xs">
                        <p className="font-bold text-primary/80 uppercase tracking-wider text-[10px]">Highest Degree Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <p className="text-muted-foreground font-semibold mb-0.5">University / College</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_uni || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Degree Type</p>
                            <p className="font-bold text-neutral-900">{intakeData.highest_degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Major / Field</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_field || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Country</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_country || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Graduation Date</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_grad_date || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bachelor's */}
                      <div className="bg-neutral-50/50 p-4 rounded-xl border space-y-3 text-xs">
                        <p className="font-bold text-primary/80 uppercase tracking-wider text-[10px]">Bachelor's Degree Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <p className="text-muted-foreground font-semibold mb-0.5">University / College</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_uni || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Degree Type</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Major / Field</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_field || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Country</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_country || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Graduation Date</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_grad_date || "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Immigration & U.S. Status */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Immigration & Eligibility
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-3 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Current Visa Status</p>
                        <p className="font-bold text-neutral-900">{intakeData.visa_status || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">First Entry into the U.S.</p>
                        <p className="font-bold text-neutral-900">{intakeData.first_entry_us || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Total Years in the U.S.</p>
                        <p className="font-bold text-neutral-900">{intakeData.total_years_us || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Skills Summary */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-500" /> Technical & Non-Technical Skills
                    </h4>
                    <div className="space-y-3 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Strongly Skilled In</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.skilled_in || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Recently Learned</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.recently_learned || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Experience / Familiarity With</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.experienced_with || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Learning Now</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.learning_now || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Other Non-Technical Skills</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.other_non_tech || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Job Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Job Preferences
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-2 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Desired Role</p>
                        <p className="font-bold text-neutral-900 text-sm">{intakeData.desired_role || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Desired Years of Experience</p>
                        <p className="font-bold text-neutral-900 text-sm">{intakeData.desired_exp_years || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Uploaded Documents */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <FileCheck className="h-4 w-4" /> Uploaded Verification Documents
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: "Resume / CV", url: intakeData.resume_url, required: true },
                        { label: "Passport (First & Last Page)", url: intakeData.passport_url, required: true },
                        { label: "Government Issued ID", url: intakeData.gov_id_url, required: true },
                        { label: "VISA", url: intakeData.visa_url, required: true },
                        { label: "Work Authorization Document", url: intakeData.work_auth_url, required: true },
                        { label: "Other Verification Document", url: intakeData.doc_url, required: false },
                      ].map((doc, idx) => (
                        <div key={idx} className="bg-neutral-50 p-4 rounded-xl border flex flex-col justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-neutral-800">{doc.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{doc.required ? "Mandatory Field" : "Optional Field"}</p>
                          </div>
                          {doc.url ? (
                            <DocumentPreview
                              url={doc.url}
                              label={`View ${doc.label}`}
                              variant="button"
                              className="w-full text-xs font-bold h-9 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                            />
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 p-2 rounded text-center border border-amber-100">Not Uploaded</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work Experience dynamic mapping */}
                  {intakeData.experiences && Array.isArray(intakeData.experiences) && intakeData.experiences.length > 0 && (
                    <>
                      <div className="h-[1px] bg-border/40 w-full" />
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Briefcase className="h-4 w-4" /> Professional Work History
                        </h4>
                        <div className="grid gap-6 sm:grid-cols-2">
                          {intakeData.experiences.map((exp: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border space-y-3 text-xs">
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Job Title</Label>
                                <p className="font-bold text-neutral-900 text-sm">{exp.job_title || "—"}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Company Name</Label>
                                  <p className="font-semibold text-neutral-800">{exp.company_name || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Job Type</Label>
                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold inline-block mt-0.5">{exp.job_type || "—"}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Start Date (MM/DD/YYYY)</Label>
                                  <p className="font-medium text-neutral-700">{formatToMMDDYYYY(exp.start_date)}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">End Date (MM/DD/YYYY)</Label>
                                  <p className="font-medium text-neutral-700">{formatToMMDDYYYY(exp.end_date)}</p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Company Address</Label>
                                <p className="text-neutral-700">{exp.company_address || "—"}</p>
                              </div>
                              {exp.responsibilities && (
                                <div className="pt-2 border-t mt-1">
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Key Responsibilities / Projects</Label>
                                  <p className="text-[11px] text-neutral-700 leading-relaxed bg-white p-2.5 rounded border italic whitespace-pre-wrap">{exp.responsibilities}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Certifications dynamic mapping */}
                  {intakeData.certifications && Array.isArray(intakeData.certifications) && intakeData.certifications.length > 0 && (
                    <>
                      <div className="h-[1px] bg-border/40 w-full" />
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Award className="h-4 w-4" /> Professional Certifications
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {intakeData.certifications.map((cert: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border space-y-3 text-xs flex flex-col justify-between">
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Certification Name</Label>
                                  <p className="font-bold text-neutral-900 text-sm leading-tight">{cert.name || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Issuing Organization</Label>
                                  <p className="font-semibold text-neutral-800">{cert.organization || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Certification ID</Label>
                                  <p className="text-neutral-700 font-medium">{cert.credential_id || cert.credentialId || "—"}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Issued Date</Label>
                                    <p className="text-neutral-700 font-medium">{formatToMMDDYYYY(cert.issued_date || cert.issuedDate)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Expiry Date</Label>
                                    <p className="text-neutral-700 font-medium">{formatToMMDDYYYY(cert.expires_date || cert.expiresDate)}</p>
                                  </div>
                                </div>
                              </div>
                              {(cert.credential_url || cert.file) && (
                                <div className="pt-2 border-t mt-2">
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Certification Preview</Label>
                                  <DocumentPreview
                                    url={cert.credential_url || cert.file}
                                    label="Preview Certification"
                                    variant="button"
                                    className="w-full text-xs font-bold h-9 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground bg-muted/10 rounded-3xl border border-dashed border-border/50 italic flex flex-col items-center gap-3">
                  <AlertTriangle className="h-8 w-8 opacity-20" />
                  Intake sheet not yet submitted by candidate.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader><CardTitle className="text-base font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-secondary" /> Preferred Roles</CardTitle></CardHeader>
            <CardContent>
              {roles.length === 0 ? <p className="text-muted-foreground text-center py-8">No specific roles confirmed yet.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {roles.map((r: any) => (
                    <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-border/50 p-4 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm tracking-tight">{r.role_title}</p>
                        <StatusBadge status={r.candidate_confirmed ? "active" : r.candidate_confirmed === false ? "rejected" : "pending"} />
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{r.description}</p>}
                    </div>
                  ))}
                </div>
              )}
              {roles.length > 4 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group mt-4">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Credential Intake History</CardTitle>
                  <CardDescription>{credentials.length} version(s)</CardDescription>
                </div>
                {!isEditingCreds && (
                  <div className="flex items-center gap-2">
                    <CustomCredentialsDialog candidateId={candidateId} onRefresh={fetchAll} />
                    <Button variant="outline" size="sm" onClick={() => setIsEditingCreds(true)} className="gap-2">
                      <Pencil className="h-3.5 w-3.5" /> Edit Current Credentials
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingCreds ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Section 1: Timeline & Education */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600">Timeline & Education</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Email Address *</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm.email || ""} onChange={e => setCredForm(prev => ({ ...prev, email: e.target.value }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Bachelor's Graduation Date *</Label>
                        <DatePicker id="rec-cred-bach" value={credForm.bachelors_grad_date} onChange={val => setCredForm(p => ({ ...p, bachelors_grad_date: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">First Entry US *</Label>
                        <DatePicker id="rec-cred-entry" value={credForm.first_entry_us} onChange={val => setCredForm(p => ({ ...p, first_entry_us: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Master's Graduation Date *</Label>
                        <DatePicker id="rec-cred-mast" value={credForm.masters_grad_date} onChange={val => setCredForm(p => ({ ...p, masters_grad_date: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">OPT Start Date *</Label>
                        <DatePicker id="rec-cred-opt" value={credForm.opt_start_date} onChange={val => setCredForm(p => ({ ...p, opt_start_date: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Is OPT Offer Submitted? *</Label>
                        <Select value={credForm.opt_offer_submitted || "no"} onValueChange={val => setCredForm(p => ({ ...p, opt_offer_submitted: val, offer_letter_file: val === "yes" ? p.offer_letter_file : null }))}>
                          <SelectTrigger className="h-10 rounded-lg bg-neutral-50">
                            <SelectValue placeholder="Select Response" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="waiting">Waiting for One</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {credForm.opt_offer_submitted === "yes" && (
                        <div className="sm:col-span-2 p-5 border-2 border-dashed rounded-lg bg-neutral-50 border-neutral-300 hover:border-primary/40 transition-all text-center">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={e => setCredForm(p => ({ ...p, offer_letter_file: e.target.files?.[0] || null }))}
                            accept=".pdf,.doc,.docx"
                          />
                          <div className="space-y-2 group text-left">
                            <div className="flex items-center gap-2 ml-1">
                              <Label className="text-sm font-semibold text-card-foreground/90 flex items-center">
                                Upload OPT Offer Letter <span className="text-destructive ml-1 font-bold">*</span>
                              </Label>
                            </div>
                            <div className="flex flex-col items-center gap-2 mt-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => fileInputRef.current?.click()} 
                                className="bg-white border-neutral-300"
                              >
                                <Upload className="h-4 w-4 mr-2" /> Choose Document File
                              </Button>
                              {credForm.offer_letter_file ? (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-xs font-bold text-green-700">
                                    {typeof credForm.offer_letter_file === "string" 
                                      ? "Previously uploaded offer letter" 
                                      : (credForm.offer_letter_file as File).name}
                                  </span>
                                  {typeof credForm.offer_letter_file === "string" && (
                                    <DocumentPreview 
                                      url={credForm.offer_letter_file} 
                                      label="Preview" 
                                      className="text-xs font-semibold text-green-700 hover:underline ml-1" 
                                    />
                                  )}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, DOCX up to 5MB</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Personal Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
                      <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">Personal Information</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Full Name *</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm.full_name || ""} onChange={e => setCredForm(prev => ({ ...prev, full_name: e.target.value }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Personal Email Address *</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm.personal_email || ""} onChange={e => setCredForm(prev => ({ ...prev, personal_email: e.target.value }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Mobile Phone Number *</Label>
                        <div className="flex gap-2">
                          <Select value={credForm.country_code || "+1"} onValueChange={v => setCredForm(p => ({ ...p, country_code: v }))}>
                            <SelectTrigger className="w-[100px] h-10 bg-neutral-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input 
                            value={credForm.phone_number || ""} 
                            onChange={e => setCredForm(p => ({ ...p, phone_number: e.target.value }))} 
                            placeholder="1234567890" 
                            className="flex-1 h-10 bg-muted/30 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Location (City, State) *</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm.location || ""} onChange={e => setCredForm(prev => ({ ...prev, location: e.target.value }))} />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Preferred Job Roles *</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm.preferred_roles || ""} onChange={e => setCredForm(prev => ({ ...prev, preferred_roles: e.target.value }))} />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Preferred Location(s) *</Label>
                        <Input className="bg-muted/30 text-sm h-10" value={credForm.preferred_locations || ""} onChange={e => setCredForm(prev => ({ ...prev, preferred_locations: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Account Credentials */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 space-y-6 overflow-hidden">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-200 flex items-center justify-center">
                          <KeyRound className="h-4 w-4 text-amber-900" />
                        </div>
                        <h3 className="font-bold text-xs uppercase tracking-widest text-amber-900">Account Credentials</h3>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">LinkedIn Login ID *</Label>
                        <Input value={credForm.linkedin_id || ""} onChange={e => setCredForm(p => ({ ...p, linkedin_id: e.target.value }))} placeholder="LinkedIn username or email" className="h-11 bg-white border-amber-200" />
                      </div>
                      <PasswordField id="linkedin_pass" label="LinkedIn Password" mandatory value={credForm.linkedin_pass || ""} onChange={(v: string) => setCredForm(p => ({ ...p, linkedin_pass: v }))} placeholder="Password" />

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Indeed Login ID (Optional)</Label>
                        <Input value={credForm.indeed_id || ""} onChange={e => setCredForm(p => ({ ...p, indeed_id: e.target.value }))} placeholder="Indeed Email ID" className="h-11 bg-white border-amber-200" />
                      </div>
                      <PasswordField id="indeed_pass" label="Indeed Password" value={credForm.indeed_pass || ""} onChange={(v: string) => setCredForm(p => ({ ...p, indeed_pass: v }))} placeholder="Password" />

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Dice Login ID (Optional)</Label>
                        <Input value={credForm.dice_id || ""} onChange={e => setCredForm(p => ({ ...p, dice_id: e.target.value }))} placeholder="Dice username/email" className="h-11 bg-white border-amber-200" />
                      </div>
                      <PasswordField id="dice_pass" label="Dice Password" value={credForm.dice_pass || ""} onChange={(v: string) => setCredForm(p => ({ ...p, dice_pass: v }))} placeholder="Password" />

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Monster Login ID (Optional)</Label>
                        <Input value={credForm.monster_id || ""} onChange={e => setCredForm(p => ({ ...p, monster_id: e.target.value }))} placeholder="Monster email" className="h-11 bg-white border-amber-200" />
                      </div>
                      <PasswordField id="monster_pass" label="Monster Password" value={credForm.monster_pass || ""} onChange={(v: string) => setCredForm(p => ({ ...p, monster_pass: v }))} placeholder="Password" />

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">ZipRecruiter Login ID (Optional)</Label>
                        <Input value={credForm.ziprecruiter_id || ""} onChange={e => setCredForm(p => ({ ...p, ziprecruiter_id: e.target.value }))} placeholder="ZipRecruiter email" className="h-11 bg-white border-amber-200" />
                      </div>
                      <PasswordField id="ziprecruiter_pass" label="ZipRecruiter Password" value={credForm.ziprecruiter_pass || ""} onChange={(v: string) => setCredForm(p => ({ ...p, ziprecruiter_pass: v }))} placeholder="Password" />

                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Mention other Platform accounts (Optional)</Label>
                        <Textarea 
                          value={credForm.other_platforms || ""} 
                          onChange={e => setCredForm(p => ({ ...p, other_platforms: e.target.value }))}
                          placeholder="Mention N/A if none."
                          className="bg-white border-amber-200 min-h-[100px]"
                        />
                      </div>
                    </div>

                    {/* Custom Job Platforms */}
                    <div className="border-t border-amber-200/60 pt-4 mt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Custom Job Platforms</Label>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-white text-amber-900 border-amber-200" onClick={() => {
                          setCredForm(p => ({
                            ...p,
                            custom_platforms: [...(p.custom_platforms || []), { platform_name: "", username_email: "", password: "" }]
                          }));
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Platform
                        </Button>
                      </div>
                      {credForm.custom_platforms?.map((cp: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white/60 rounded-xl border border-amber-100 relative group">
                          <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                            const n = [...credForm.custom_platforms]; n.splice(idx, 1);
                            setCredForm({ ...credForm, custom_platforms: n });
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase text-amber-700">Platform Name</Label>
                              <Input className="h-8 text-xs bg-white" placeholder="e.g. Monster, ZipRecruiter" value={cp.platform_name} onChange={e => {
                                const n = [...credForm.custom_platforms]; n[idx].platform_name = e.target.value;
                                setCredForm({ ...credForm, custom_platforms: n });
                              }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase text-amber-700">Username / Email</Label>
                              <Input className="h-8 text-xs bg-white" placeholder="Username or email" value={cp.username_email || ""} onChange={e => {
                                const n = [...credForm.custom_platforms]; n[idx].username_email = e.target.value;
                                setCredForm({ ...credForm, custom_platforms: n });
                              }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold uppercase text-amber-700">Password</Label>
                              <div className="relative">
                                <Input className="h-8 text-xs bg-white pr-8" type={showCredPasswords[`cp_${idx}`] ? "text" : "password"} value={cp.password} onChange={e => {
                                  const n = [...credForm.custom_platforms]; n[idx].password = e.target.value;
                                  setCredForm({ ...credForm, custom_platforms: n });
                                }} />
                                <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent" onClick={() => toggleCredPw(`cp_${idx}`)}>
                                  {showCredPasswords[`cp_${idx}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="hero"
                      className={`flex-1 h-11 font-bold transition-all ${credForm.full_name?.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                      onClick={handleSaveCredential}
                      disabled={savingCred}
                    >
                      {savingCred ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Update Candidate Credentials
                    </Button>
                    <Button variant="outline" className="h-11" onClick={() => setIsEditingCreds(false)} disabled={savingCred}>Cancel</Button>
                  </div>
                </div>
              ) : credentials.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No credential intake submitted yet.</p>
              ) : (
                <Accordion type="single" collapsible defaultValue={credentials[0]?.id}>
                  {credentials.map((v: any) => {
                    const cData = v.data as Record<string, any>;
                    const optOfferVal = cData.opt_offer_submitted || cData.opt_offer_letter_submitted || cData.optOfferLetterSubmitted || "";
                    const optOfferDisplay = optOfferVal === "yes" ? "Yes" : optOfferVal === "no" ? "No" : optOfferVal === "waiting" ? "Waiting for One" : optOfferVal || "—";
                    return (
                      <AccordionItem key={v.id} value={v.id} className="border-none shadow-sm mb-4 bg-muted/20 rounded-xl overflow-hidden px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <Badge variant="secondary" className="h-6">v{v.version}</Badge>
                            <div>
                              <span className="font-semibold block">{v.editor_name || "Candidate Submission"}</span>
                              <span className="text-[10px] uppercase text-muted-foreground font-bold">{formatDate(v.created_at)}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6">
                          <div className="space-y-8 pt-4">
                            {/* Top Identity Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Full Name</p><p className="font-medium">{cData.full_name || cData.full_legal_name || "—"}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Personal Email</p><p className="font-medium">{cData.personal_email || cData.personalEmail || "—"}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Phone</p><p className="font-medium">{cData.phone_number || cData.phone || cData.phoneNumber || "—"}</p></div>
                              <div className="col-span-2 md:col-span-3"><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold">Location</p><p className="font-medium">{cData.location || cData.location_city_state || "—"}</p></div>
                            </div>

                            {/* OPT & Entry */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-white p-4 rounded-lg shadow-sm border border-muted">
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Bachelor's Graduation Date</p><p className="font-semibold">{cData.bachelors_grad_date || cData.bachelors_graduation_date || "—"}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Master's Graduation Date</p><p className="font-semibold">{cData.masters_grad_date || cData.masters_graduation_date || "—"}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">First Entry US</p><p className="font-semibold">{cData.first_entry_us || cData.firstEntryUS || "—"}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">OPT Start Date</p><p className="font-semibold">{cData.opt_start_date || cData.optStartDate || "—"}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Offer Submitted</p><Badge variant="outline" className="mt-1">{optOfferDisplay}</Badge></div>
                              {(optOfferVal === "yes" && (cData.offer_letter_url || cData.opt_offer_letter_url)) && (
                                <div>
                                  <p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Offer Letter</p>
                                  <DocumentPreview
                                    url={cData.offer_letter_url || cData.opt_offer_letter_url}
                                    label="View attached letter"
                                    className="text-blue-600 underline font-semibold cursor-pointer mt-1 block"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Job Portals - CRITICAL DATA */}
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive flex items-center gap-2">
                                <Shield className="h-3 w-3" /> Job Portal Credentials
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {[
                                  { label: 'LinkedIn', id: 'linkedin_id', altId: 'linkedin_login_id', pw: 'linkedin_pass', altPw: 'linkedin_password' },
                                  { label: 'Indeed', id: 'indeed_id', altId: 'indeed_login_id', pw: 'indeed_pass', altPw: 'indeed_password' },
                                  { label: 'Dice', id: 'dice_id', altId: 'dice_login_id', pw: 'dice_pass', altPw: 'dice_password' },
                                  { label: 'Monster', id: 'monster_id', altId: 'monster_login_id', pw: 'monster_pass', altPw: 'monster_password' },
                                  { label: 'ZipRecruiter', id: 'ziprecruiter_id', altId: 'ziprecruiter_login_id', pw: 'ziprecruiter_pass', altPw: 'ziprecruiter_password' }
                                ].map(portal => {
                                  const username = cData[portal.id] || cData[portal.altId];
                                  const password = cData[portal.pw] || cData[portal.altPw];
                                  if (!username && !password) return null;
                                  return (
                                    <div key={portal.label} className="bg-white border rounded-lg p-3">
                                      <p className="font-bold text-[10px] text-muted-foreground mb-2">{portal.label}</p>
                                      <div className="space-y-1">
                                        <p className="text-[11px] truncate">Email/ID: <span className="font-medium">{username || "N/A"}</span></p>
                                        <p className="text-[11px] truncate">PW: <span className="font-mono bg-muted px-1 rounded cursor-pointer hover:bg-muted/80" title="Click to reveal details" onClick={() => toggleCredPw(`${v.id}_${portal.pw}`)}>{password ? (showCredPasswords[`${v.id}_${portal.pw}`] ? password : "••••••••") : "N/A"}</span></p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {cData.other_platforms && (
                                <div className="mt-4 bg-white border rounded-lg p-3 text-xs">
                                  <p className="font-bold text-[10px] text-muted-foreground mb-2">Other Platform Accounts</p>
                                  <p className="whitespace-pre-wrap leading-relaxed">{cData.other_platforms}</p>
                                </div>
                              )}

                              {cData.custom_platforms && Array.isArray(cData.custom_platforms) && cData.custom_platforms.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2 mb-3">
                                    <Shield className="h-3 w-3" /> Custom Platforms
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {cData.custom_platforms.map((cp: any, idx: number) => (
                                      <div key={idx} className="bg-white border border-amber-200/50 rounded-lg p-3">
                                        <p className="font-bold text-[10px] text-amber-700 mb-2">{cp.platform_name || "Platform"}</p>
                                        <div className="space-y-1">
                                          <p className="text-[11px] truncate">Email/ID: <span className="font-medium">{cp.username_email || "N/A"}</span></p>
                                          <p className="text-[11px] truncate">PW: <span className="font-mono bg-muted px-1 rounded cursor-pointer hover:bg-muted/80" title="Click to reveal details" onClick={() => toggleCredPw(`${v.id}_cp_${idx}`)}>{cp.password ? (showCredPasswords[`${v.id}_cp_${idx}`] ? cp.password : "••••••••") : "N/A"}</span></p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>

                            {/* Preferences */}
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="bg-primary/5 p-3 rounded-lg">
                                <p className="text-[9px] font-bold uppercase text-primary mb-1">Preferred Roles</p>
                                <p className="text-xs font-medium">{cData.preferred_roles || cData.preferred_job_roles || cData.preferredRoles || "—"}</p>
                              </div>
                              <div className="bg-primary/5 p-3 rounded-lg">
                                <p className="text-[9px] font-bold uppercase text-primary mb-1">Preferred Locations</p>
                                <p className="text-xs font-medium">{cData.preferred_locations || cData.preferredLocations || "—"}</p>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-log" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/60 overflow-hidden">
            <div className="h-1 bg-secondary w-full" />
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-secondary" /> Daily Submission Journal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Total Applications Submitted Today *</Label>
                  <Input type="number" min="0" value={logCount} onChange={e => setLogCount(e.target.value)} placeholder="Enter count..." className="h-11 bg-background/50 border-border/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">General Internal Notes</Label>
                  <Input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Recruiter notes for today..." className="h-11 bg-background/50 border-border/50" />
                </div>
              </div>

              <Button
                variant="hero"
                className={`w-full h-12 text-sm font-bold tracking-tight rounded-2xl transition-all ${logCount ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/10' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                onClick={handleSubmitDailyLog}
                disabled={savingLog || !logCount}
              >
                {savingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                Submit Daily Record
              </Button>

              {/* Daily Log History */}
              {dailyLogs.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                    <History className="h-4 w-4 text-secondary" /> Journal History
                  </h4>
                  <div className="space-y-3">
                    {dailyLogs.map((log: any, idx: number) => (
                      <div key={idx} className="bg-muted/10 p-4 rounded-xl border border-border/40">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{formatDate(log.log_date || log.created_at)}</span>
                          <Badge variant="secondary" className="text-[9px] font-bold py-0.5 px-2">Total Applications Submitted Today: {log.total_applications_submitted_today}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Notes</p>
                          <p className="text-xs text-foreground font-medium">{log.notes || <span className="italic text-muted-foreground opacity-60">No notes provided.</span>}</p>
                        </div>
                      </div>
                    ))}
                    {dailyLogs.length > 5 && (
                      <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                        <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader><CardTitle className="text-base font-bold">Submit Job Application</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">Jobs & URLs <span className="text-[11px] font-medium text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">{jobLinks.length}</span></h4>
                  <Button variant="ghost" size="sm" onClick={addJobLink} className="h-8 text-[11px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/5 rounded-lg border border-secondary/20">
                    <Plus className="mr-1 h-3 w-3" /> Add Job Application Link
                  </Button>
                </div>

                {jobLinks.length === 0 && (
                  <div className="p-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/50 text-xs text-muted-foreground italic">
                    Add specific job links that were submitted for more granular tracking.
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  {jobLinks.map((job, idx) => (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={idx} className="rounded-2xl border border-border/50 p-4 bg-muted/5 space-y-3 relative group">
                      <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeJobLink(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <div className="grid gap-3 grid-cols-2">
                        <Input placeholder="Company Name" className="h-9 text-xs bg-background/50" value={job.company_name} onChange={e => updateJobLink(idx, "company_name", e.target.value)} />
                        <Input placeholder="Role Title" className="h-9 text-xs bg-background/50" value={job.role_title} onChange={e => updateJobLink(idx, "role_title", e.target.value)} />
                      </div>
                      <Textarea placeholder="Job Description (Optional)" className="text-xs bg-background/50 min-h-[80px]" value={job.job_description} onChange={e => updateJobLink(idx, "job_description", e.target.value)} />
                      <div className="relative">
                        <Input placeholder="Job Application Link" className="h-9 text-xs bg-background/50 pr-8" value={job.job_url} onChange={e => updateJobLink(idx, "job_url", e.target.value)} />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-secondary" onClick={() => handleFetchJobDetails(idx)} disabled={fetchingJob[idx]}>
                          {fetchingJob[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Add google drive link of resume"
                          className="flex-1 h-9 text-[10px] font-bold bg-background/50"
                          value={job.resume_used}
                          onChange={e => updateJobLink(idx, "resume_used", e.target.value)}
                        />
                        <Select value={job.status} onValueChange={v => updateJobLink(idx, "status", v)}>
                          <SelectTrigger className="w-36 h-9 text-[10px] font-bold bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JOB_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {jobLinks.length > 3 && (
                        <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                          <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button
                variant="hero"
                className={`w-full h-12 text-sm font-bold tracking-tight rounded-2xl transition-all ${jobLinks.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/10' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                onClick={handleSubmitJobApplication}
                disabled={savingLog || jobLinks.length === 0}
              >
                {savingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                Submit Job Application
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card/60 mt-6">
            <CardHeader><CardTitle className="text-base font-bold">Submission Pipeline</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    placeholder="Search by role..."
                    value={appSearchRole}
                    onChange={(e) => setAppSearchRole(e.target.value)}
                    className="pl-9 pr-8 h-9 text-sm bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                  />
                  {appSearchRole && (
                    <button
                      onClick={() => setAppSearchRole("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="w-full sm:w-48">
                  <DatePicker
                    value={appSearchDate}
                    onChange={setAppSearchDate}
                    placeholder="Filter by date"
                    className="h-9 text-sm bg-muted/30 border-border/60 focus:bg-background transition-colors font-normal w-full"
                  />
                </div>
              </div>
              <DataTable
                data={filteredJobPostings}
                isLoading={loading}
                searchPlaceholder="Search company..."
                searchKey="company_name"
                emptyMessage="No applications recorded in the system."
                columns={[
                  {
                    header: "ID",
                    className: "pl-6 py-4",
                    render: (j: any) => (
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                        {`HYRSUB${j.id.toString().slice(-6).toUpperCase()}`}
                      </span>
                    )
                  },
                  {
                    header: "Company Name",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <span className="font-bold text-sm tracking-tight">{j.company_name || "—"}</span>
                    )
                  },
                  {
                    header: "Role Title",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <span className="text-sm font-medium">{j.role_title || "—"}</span>
                    )
                  },
                  {
                    header: "Job Description",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <JobDescriptionCell 
                        company={j.company_name} 
                        role={j.role_title} 
                        description={j.job_description} 
                        onReadMore={handleOpenDescription} 
                      />
                    )
                  },
                  {
                    header: "Job Link",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      j.job_url ? (
                        <DocumentPreview 
                          url={j.job_url} 
                          label="View Job" 
                          className="inline-flex items-center gap-1 text-xs text-secondary hover:underline cursor-pointer font-semibold" 
                        />
                      ) : "—"
                    )
                  },
                  {
                    header: "Application Status",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <Select value={(j.application_status || j.status || "").toLowerCase().replace(/ /g, "_")} onValueChange={(v) => handleUpdateJobStatus(j.id, v)}>
                        <SelectTrigger className="w-40 h-8 text-[11px] font-bold border-none bg-muted/50 focus-visible:ring-0">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/ /g, "_")} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )
                  },
                  {
                    header: "Resume Used",
                    className: "px-6 py-4",
                    render: (j: any) => {
                      const isUrl = j.resume_used?.startsWith('http');
                      const resumeName = isUrl ? (resumes.find(r => r.url === j.resume_used)?.label || "View Resume") : (j.resume_used || "Standard");
                      return isUrl ? (
                        <DocumentPreview url={j.resume_used} label={resumeName} className="text-[11px] font-bold" />
                      ) : (
                        <span className="text-xs font-mono opacity-80">{resumeName}</span>
                      );
                    }
                  },
                  {
                    header: "Logged Date",
                    className: "px-6 py-4 text-right pr-6",
                    render: (j: any) => <span className="text-[11px] text-muted-foreground font-medium">{formatDate(j.log_date || j.created_at)}</span>
                  }
                ]}
              />
              {filteredJobPostings.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>

          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <RecruiterInterviewsTab candidateId={candidateId} candidateUserId={candidate.user_id} />
        </TabsContent>

        <TabsContent value="messages">
          <ChatTab candidateId={candidateId} />
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditTab targetId={candidateId} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl p-6 shadow-2xl border border-border/50">
          <DialogHeader className="border-b border-border/10 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Job Description</span>
              <span className="text-card-foreground">{activeJobDesc?.role}</span>
              <span className="text-primary text-sm font-medium">{activeJobDesc?.company}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[55vh] overflow-y-auto pr-2">
            {activeJobDesc?.description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterCandidateDetail;
