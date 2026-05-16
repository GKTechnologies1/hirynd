import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, 
  Award, FileText, Upload, CheckCircle, RotateCcw, AlertCircle, 
  ChevronDown, ChevronUp, Globe, Link as LinkIcon, Building2, 
  Trash2, CloudUpload, Clock, Sparkles
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";

// --- Types & Constants ---

interface FormData {
  [key: string]: any;
}

const INITIAL_STATE: FormData = {
  timestamp: new Date().toLocaleString(),
  firstName: "",
  lastName: "",
  dob: "",
  phoneNumber: "",
  email: "",
  marketingEmail: "",
  marketingPhone: "",
  currentAddress: "",
  mailingAddress: "",
  visaStatus: "",
  firstEntryUS: "",
  totalYearsUS: "",
  skilledIn: "",
  recentlyLearned: "",
  experiencedWith: "",
  learningNow: "",
  otherNonTech: "",
  hasWorkExp: "",
  // Job 1
  job1_title: "",
  job1_company: "",
  job1_address: "",
  job1_start: "",
  job1_end: "",
  job1_type: "",
  job1_resp: "",
  hasMoreWork1: "",
  // Job 2
  job2_title: "",
  job2_company: "",
  job2_address: "",
  job2_start: "",
  job2_end: "",
  job2_type: "",
  job2_resp: "",
  hasMoreWork2: "",
  // Job 3
  job3_title: "",
  job3_company: "",
  job3_address: "",
  job3_start: "",
  job3_end: "",
  job3_type: "",
  job3_resp: "",
  // Education
  highestDegree: "",
  mastersField: "",
  mastersUni: "",
  mastersCountry: "",
  mastersGradDate: "",
  linkedinLink: "",
  bachelorsDegree: "",
  bachelorsField: "",
  bachelorsUni: "",
  bachelorsCountry: "",
  bachelorsGradDate: "",
  // Certifications
  hasCerts: "",
  certName: "",
  certOrg: "",
  certDate: "",
  // Documents
  docUpload: null,
  passportUpload: null,
  govIdUpload: null,
  visaUpload: null,
  workAuthUpload: null,
  // Preferences
  desiredRole: "",
  desiredExpYears: "",
  resumeUpload: null,
};

// --- Reusable UI Components ---

const FormField = ({ label, mandatory, children, error, icon: Icon, description }: any) => (
  <div className="space-y-2 group animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-sky-500" />}
      <Label className="text-sm font-bold text-slate-700 flex items-center">
        {label} {mandatory && <span className="text-rose-500 ml-1 font-black">*</span>}
      </Label>
    </div>
    {description && <p className="text-[10px] text-slate-400 font-medium">{description}</p>}
    <div className="relative">
      {children}
    </div>
    {error && <p className="text-[11px] font-bold text-rose-500 mt-1 animate-pulse">{error}</p>}
  </div>
);

const SectionHeader = ({ title, icon: Icon, isOpen, onToggle }: any) => (
  <div 
    onClick={onToggle}
    className="flex items-center justify-between p-6 bg-white cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center shadow-sm">
        <Icon className="h-5 w-5 text-sky-600" />
      </div>
      <h3 className="text-lg font-black text-slate-800">{title}</h3>
    </div>
    {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
  </div>
);

const CandidateIntakePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sendCopy, setSendCopy] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    skills: true,
    experience: true,
    education: true,
    certs: true,
    docs: true,
    prefs: true
  });

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await candidatesApi.me();
        const cid = meRes.data.id;
        setCandidateId(cid);
        if (user?.email) {
          setFormData(prev => ({ ...prev, email: user.email }));
        }
        // Check if intake already submitted & locked
        try {
          const intakeRes = await candidatesApi.getIntake(cid);
          const intake = intakeRes.data;
          if (intake?.is_locked) {
            setIsLocked(true);
            setIsSubmitted(true);
            if (intake.data) {
              setFormData(prev => ({
                ...prev,
                firstName: intake.data.first_name || "",
                lastName: intake.data.last_name || "",
                dob: intake.data.dob || "",
                phoneNumber: intake.data.phone_number || "",
                email: intake.data.email || prev.email,
                currentAddress: intake.data.current_address || "",
                mailingAddress: intake.data.mailing_address || "",
                visaStatus: intake.data.visa_status || "",
                firstEntryUS: intake.data.first_entry_us || "",
                totalYearsUS: intake.data.total_years_us || "",
                skilledIn: intake.data.skilled_in || "",
                recentlyLearned: intake.data.recently_learned || "",
                experiencedWith: intake.data.experienced_with || "",
                learningNow: intake.data.learning_now || "",
                otherNonTech: intake.data.other_non_tech || "",
                highestDegree: intake.data.highest_degree || "",
                mastersField: intake.data.masters_field || "",
                mastersUni: intake.data.masters_uni || "",
                mastersCountry: intake.data.masters_country || "",
                mastersGradDate: intake.data.masters_grad_date || "",
                linkedinLink: intake.data.linkedin_link || "",
                bachelorsDegree: intake.data.bachelors_degree || "",
                bachelorsField: intake.data.bachelors_field || "",
                bachelorsUni: intake.data.bachelors_uni || "",
                bachelorsCountry: intake.data.bachelors_country || "",
                bachelorsGradDate: intake.data.bachelors_grad_date || "",
                desiredRole: intake.data.desired_role || "",
                desiredExpYears: intake.data.desired_exp_years || "",
                timestamp: intake.submitted_at
                  ? new Date(intake.submitted_at).toLocaleString()
                  : prev.timestamp,
              }));
            }
          }
        } catch {
          // No existing intake — fresh form, do nothing
        }
      } catch {
        // candidatesApi.me() failed — not a candidate account
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [user]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const mandatoryFields = [
      "firstName", "lastName", "dob", "phoneNumber", "email", "currentAddress", "mailingAddress",
      "visaStatus", "firstEntryUS", "totalYearsUS", "skilledIn", "recentlyLearned", "experiencedWith",
      "learningNow", "otherNonTech", "hasWorkExp", "highestDegree", "mastersField", "mastersUni",
      "mastersCountry", "mastersGradDate", "linkedinLink", "bachelorsDegree", "bachelorsField",
      "bachelorsUni", "bachelorsCountry", "bachelorsGradDate", "hasCerts", "desiredRole", 
      "desiredExpYears"
    ];

    mandatoryFields.forEach(field => {
      if (!formData[field]) newErrors[field] = "Required";
    });

    // Chained Mandatory Fields
    if (formData.hasWorkExp === "yes") {
      if (!formData.hasMoreWork1) newErrors.hasMoreWork1 = "Please specify";
    }
    if (formData.hasMoreWork1 === "yes") {
      if (!formData.hasMoreWork2) newErrors.hasMoreWork2 = "Please specify";
    }
    if (formData.hasCerts === "yes") {
      ["certName", "certOrg", "certDate"].forEach(f => {
        if (!formData[f]) newErrors[f] = "Required";
      });
    }

    // Document Uploads (Mandatory)
    ["docUpload", "passportUpload", "govIdUpload", "visaUpload", "workAuthUpload", "resumeUpload"].forEach(f => {
      if (!formData[f]) newErrors[f] = "File required";
    });

    // Formatting
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.email = "Invalid format";
    if (formData.marketingEmail && !emailRegex.test(formData.marketingEmail)) newErrors.marketingEmail = "Invalid format";
    
    if (formData.linkedinLink && !formData.linkedinLink.includes("linkedin.com")) newErrors.linkedinLink = "Invalid URL";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ variant: "destructive", title: "Form Incomplete", description: "Please check the red marked fields." });
      const firstError = document.querySelector(".animate-pulse");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!candidateId) {
      toast({ variant: "destructive", title: "Error", description: "Could not identify candidate account. Please refresh." });
      return;
    }

    setIsSubmitting(true);
    try {
      // ── Step 1: Upload all file fields ──
      const fileFieldMap: Record<string, string> = {
        docUpload: "doc_url",
        passportUpload: "passport_url",
        govIdUpload: "gov_id_url",
        visaUpload: "visa_url",
        workAuthUpload: "work_auth_url",
        resumeUpload: "resume_url",
      };
      const uploadedUrls: Record<string, string> = {};
      for (const [field, urlKey] of Object.entries(fileFieldMap)) {
        const file = formData[field];
        if (file instanceof File) {
          setUploadProgress(`Uploading ${file.name}...`);
          const res = await filesApi.upload(file, urlKey.replace("_url", ""));
          uploadedUrls[urlKey] = res.data.url;
        }
      }
      setUploadProgress("");

      // ── Step 2: Build work experiences array ──
      const experiences: any[] = [];
      if (formData.hasWorkExp === "yes") {
        if (formData.job1_title || formData.job1_company) {
          experiences.push({
            job_title: formData.job1_title,
            company_name: formData.job1_company,
            company_address: formData.job1_address,
            start_date: formData.job1_start,
            end_date: formData.job1_end,
            job_type: formData.job1_type,
            responsibilities: formData.job1_resp,
          });
        }
        if (formData.hasMoreWork1 === "yes" && (formData.job2_title || formData.job2_company)) {
          experiences.push({
            job_title: formData.job2_title,
            company_name: formData.job2_company,
            company_address: formData.job2_address,
            start_date: formData.job2_start,
            end_date: formData.job2_end,
            job_type: formData.job2_type,
            responsibilities: formData.job2_resp,
          });
        }
        if (formData.hasMoreWork2 === "yes" && (formData.job3_title || formData.job3_company)) {
          experiences.push({
            job_title: formData.job3_title,
            company_name: formData.job3_company,
            company_address: formData.job3_address,
            start_date: formData.job3_start,
            end_date: formData.job3_end,
            job_type: formData.job3_type,
            responsibilities: formData.job3_resp,
          });
        }
      }

      // ── Step 3: Build certifications array ──
      const certifications: any[] = [];
      if (formData.hasCerts === "yes" && formData.certName) {
        certifications.push({
          name: formData.certName,
          organization: formData.certOrg,
          issued_date: formData.certDate,
        });
      }

      // ── Step 4: Build final payload (snake_case field names) ──
      const payload: Record<string, any> = {
        // Personal
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dob,
        phone_number: formData.phoneNumber,
        email: formData.email,
        marketing_email: formData.marketingEmail,
        marketing_phone: formData.marketingPhone,
        current_address: formData.currentAddress,
        mailing_address: formData.mailingAddress,
        visa_status: formData.visaStatus,
        first_entry_us: formData.firstEntryUS,
        total_years_us: formData.totalYearsUS,
        // Skills
        skilled_in: formData.skilledIn,
        recently_learned: formData.recentlyLearned,
        experienced_with: formData.experiencedWith,
        learning_now: formData.learningNow,
        other_non_tech: formData.otherNonTech,
        // Education
        highest_degree: formData.highestDegree,
        masters_field: formData.mastersField,
        masters_uni: formData.mastersUni,
        masters_country: formData.mastersCountry,
        masters_grad_date: formData.mastersGradDate,
        linkedin_link: formData.linkedinLink,
        bachelors_degree: formData.bachelorsDegree,
        bachelors_field: formData.bachelorsField,
        bachelors_uni: formData.bachelorsUni,
        bachelors_country: formData.bachelorsCountry,
        bachelors_grad_date: formData.bachelorsGradDate,
        // Certs
        has_certs: formData.hasCerts,
        // Preferences
        desired_role: formData.desiredRole,
        desired_exp_years: formData.desiredExpYears,
        // Work experience flag
        has_work_exp: formData.hasWorkExp,
        // Nested arrays
        experiences,
        certifications,
        // Uploaded file URLs
        ...uploadedUrls,
        // Timestamp
        submitted_timestamp: formData.timestamp,
      };

      // ── Step 5: Submit to backend ──
      await candidatesApi.submitIntake(candidateId, payload);

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast({ title: "✅ Intake Submitted!", description: "Your intake sheet has been saved successfully." });
    } catch (err: any) {
      const detail = err?.response?.data?.validation_errors
        ? Object.values(err.response.data.validation_errors).join(", ")
        : err?.response?.data?.error || "Submission failed. Please try again.";
      toast({ variant: "destructive", title: "Submission Failed", description: detail });
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  // Loading spinner while checking intake status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fbff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm font-bold uppercase tracking-widest">Checking your intake status...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f8fbff] flex flex-col items-center p-6 lg:p-12 animate-in fade-in zoom-in duration-500">
        <Card className="max-w-3xl w-full border-none shadow-[0_40px_80px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white mb-8">
          <div className={`h-3 bg-gradient-to-r ${isLocked ? "from-emerald-400 via-teal-500 to-green-600" : "from-sky-400 via-blue-500 to-indigo-600"}`} />
          <CardContent className="p-12 text-center space-y-10">
            <div className={`w-24 h-24 ${isLocked ? "bg-emerald-50" : "bg-sky-50"} rounded-full flex items-center justify-center mx-auto shadow-inner`}>
              <CheckCircle className={`h-12 w-12 ${isLocked ? "text-emerald-500" : "text-sky-500"}`} />
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {isLocked ? "Intake Sheet Submitted ✅" : "Submit Confirmation"}
              </h2>
              <div className="space-y-6 text-slate-600 font-medium leading-relaxed max-w-lg mx-auto">
                {isLocked ? (
                  <>
                    <p className="text-xl text-emerald-600 font-bold">Your intake sheet is locked and under review.</p>
                    <p>Our team is reviewing your profile. You'll be notified once roles are published for your approval.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 font-semibold text-left flex gap-3 items-start">
                      <span className="text-lg">🔒</span>
                      <span>To make any changes, please contact your admin to reopen the intake form.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xl text-sky-600 font-bold">You're one step away to get your application workflow started..!</p>
                    <p>Our team will now start setting up your application workflow. Please stay in touch via your Hyrind email and WhatsApp for future updates.</p>
                  </>
                )}
                <div className="pt-6 border-t border-slate-100">
                  <p className="italic text-slate-800 font-black">"Let's build your future together."</p>
                  <div className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
                    — Team Hyrind <br/>
                    <span className="text-[10px]">'You focus on skills. We'll handle the rest.'</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl flex flex-col gap-4 border border-slate-100 max-w-md mx-auto">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-3">
                <span>Submitted On</span>
                <span>{formData.timestamp}</span>
              </div>
              {!isLocked && (
                <div className="flex items-center gap-3">
                  <Checkbox id="send-copy" checked={sendCopy} onCheckedChange={v => setSendCopy(!!v)} className="data-[state=checked]:bg-sky-500" />
                  <Label htmlFor="send-copy" className="text-sm font-bold text-slate-700 cursor-pointer">Send me a copy of my responses</Label>
                </div>
              )}
            </div>

            {!isLocked && (
              <Button onClick={() => setIsSubmitted(false)} variant="outline" className="rounded-2xl h-16 px-10 border-slate-200 hover:bg-slate-50 font-bold text-slate-600 gap-3 shadow-sm hover:shadow transition-all">
                <RotateCcw className="h-5 w-5" /> Edit/View Responses
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4faff] pb-40 font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Header */}
      <header className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 h-[350px] w-full relative overflow-hidden flex items-center">
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[80%] bg-white/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[100%] bg-sky-400/20 rounded-full blur-[150px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        </div>
        <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-xl rounded-full text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl border border-white/20">
                <Sparkles className="h-3.5 w-3.5" /> Professional Portal
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">Client Intake Sheet</h1>
              <p className="text-sky-100 text-lg font-medium max-w-xl opacity-90 leading-relaxed">Please provide precise information to initialize your premium application workflow. Our team will review your data within 24 hours.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/20 text-white min-w-[280px] shadow-2xl group transition-transform hover:scale-105">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-200 mb-2 flex items-center gap-2 opacity-60">
                <Clock className="h-3.5 w-3.5" /> Auto-Generated
              </p>
              <p className="text-2xl font-black font-mono tracking-tight">{formData.timestamp}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-sky-200">
                <span>Fields</span>
                <span className="bg-sky-400/20 px-2 py-1 rounded-md text-sky-300 border border-sky-400/30">65 Total</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-24 relative z-20 pb-40">
        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* Section 1: Personal Details */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Personal Information" icon={User} isOpen={openSections.personal} onToggle={() => toggleSection("personal")} />
            {openSections.personal && (
              <CardContent className="p-10 space-y-10 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FormField label="First Name" mandatory icon={User} error={errors.firstName}>
                    <Input value={formData.firstName} onChange={e => handleChange("firstName", e.target.value)} placeholder="John" className="rounded-xl h-14 font-medium" />
                  </FormField>
                  <FormField label="Last Name" mandatory icon={User} error={errors.lastName}>
                    <Input value={formData.lastName} onChange={e => handleChange("lastName", e.target.value)} placeholder="Doe" className="rounded-xl h-14 font-medium" />
                  </FormField>
                  <FormField label="Date of Birth" mandatory icon={Calendar} error={errors.dob}>
                    <DatePicker value={formData.dob} onChange={v => handleChange("dob", v)} placeholder="MM/DD/YYYY" />
                  </FormField>
                  <FormField label="Phone Number" mandatory icon={Phone} error={errors.phoneNumber}>
                    <Input value={formData.phoneNumber} onChange={e => handleChange("phoneNumber", e.target.value)} placeholder="+1 123 456 7890" className="rounded-xl h-14 font-medium" />
                  </FormField>
                  <FormField label="Email Address" mandatory icon={Mail} error={errors.email}>
                    <Input value={formData.email} onChange={e => handleChange("email", e.target.value)} placeholder="official@email.com" className="rounded-xl h-14 font-medium" />
                  </FormField>
                  <FormField label="New E-mail for Marketing" icon={Mail}>
                    <Input value={formData.marketingEmail} onChange={e => handleChange("marketingEmail", e.target.value)} placeholder="marketing@email.com" className="rounded-xl h-14 font-medium" />
                  </FormField>
                  <FormField label="Contact Number for Marketing" icon={Phone}>
                    <Input value={formData.marketingPhone} onChange={e => handleChange("marketingPhone", e.target.value)} placeholder="+1 000 000 0000" className="rounded-xl h-14 font-medium" />
                  </FormField>
                  <FormField label="Current Visa Status" mandatory icon={Globe} error={errors.visaStatus}>
                    <Select value={formData.visaStatus} onValueChange={v => handleChange("visaStatus", v)}>
                      <SelectTrigger className="rounded-xl h-14 bg-slate-50 border-none font-bold text-slate-700">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                        {["F1-OPT", "H1B", "H4 EAD", "Green Card", "US Citizen", "Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="First Entry into the U.S." mandatory icon={Calendar} error={errors.firstEntryUS}>
                    <DatePicker value={formData.firstEntryUS} onChange={v => handleChange("firstEntryUS", v)} placeholder="DD/MM/YYYY" />
                  </FormField>
                  <FormField label="Total Years in the U.S." mandatory icon={Clock} error={errors.totalYearsUS}>
                    <Input type="number" value={formData.totalYearsUS} onChange={e => handleChange("totalYearsUS", e.target.value)} placeholder="e.g. 5" className="rounded-xl h-14 font-medium" />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField label="Current Address" mandatory icon={MapPin} error={errors.currentAddress}>
                    <Textarea value={formData.currentAddress} onChange={e => handleChange("currentAddress", e.target.value)} placeholder="Street, City, State, ZIP" className="rounded-2xl min-h-[100px]" />
                  </FormField>
                  <FormField label="Mailing Address" mandatory icon={MapPin} error={errors.mailingAddress}>
                    <Textarea value={formData.mailingAddress} onChange={e => handleChange("mailingAddress", e.target.value)} placeholder="Same as above or different" className="rounded-2xl min-h-[100px]" />
                  </FormField>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section 2: Skillset */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Technical Skillset" icon={Sparkles} isOpen={openSections.skills} onToggle={() => toggleSection("skills")} />
            {openSections.skills && (
              <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
                <FormField label="Skilled In" mandatory description="Python, Java, React, Node.js, etc." error={errors.skilledIn}>
                  <Textarea value={formData.skilledIn} onChange={e => handleChange("skilledIn", e.target.value)} className="rounded-2xl min-h-[120px]" />
                </FormField>
                <FormField label="Currently Learning / Recently Learned" mandatory error={errors.recentlyLearned}>
                  <Textarea value={formData.recentlyLearned} onChange={e => handleChange("recentlyLearned", e.target.value)} className="rounded-2xl min-h-[120px]" />
                </FormField>
                <FormField label="Experienced With" mandatory error={errors.experiencedWith}>
                  <Textarea value={formData.experiencedWith} onChange={e => handleChange("experiencedWith", e.target.value)} className="rounded-2xl min-h-[120px]" />
                </FormField>
                <FormField label="Learning Now / Self-Taught Tools" mandatory error={errors.learningNow}>
                  <Textarea value={formData.learningNow} onChange={e => handleChange("learningNow", e.target.value)} className="rounded-2xl min-h-[120px]" />
                </FormField>
                <FormField label="Other Non Technical Skills / Courses" mandatory error={errors.otherNonTech}>
                  <Textarea value={formData.otherNonTech} onChange={e => handleChange("otherNonTech", e.target.value)} className="rounded-2xl min-h-[120px]" />
                </FormField>
              </CardContent>
            )}
          </Card>

          {/* Section 3: Work Experience Chained */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Professional History" icon={Briefcase} isOpen={openSections.experience} onToggle={() => toggleSection("experience")} />
            {openSections.experience && (
              <CardContent className="p-10 space-y-12 animate-in fade-in duration-500">
                <FormField label="Work Experience (U.S. and/or International)" mandatory error={errors.hasWorkExp}>
                  <div className="flex gap-4 mt-2">
                    {["yes", "no"].map(v => (
                      <button 
                        key={v} type="button" 
                        onClick={() => handleChange("hasWorkExp", v)}
                        className={cn(
                          "px-8 py-3 rounded-xl border-2 font-black text-sm transition-all uppercase tracking-widest",
                          formData.hasWorkExp === v ? "bg-sky-600 border-sky-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-sky-200"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </FormField>

                {/* Section 1 */}
                {formData.hasWorkExp === "yes" && (
                  <div className="space-y-8 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-4">
                    <h4 className="font-black text-sky-700 uppercase tracking-widest text-xs">Work Experience Section 1</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <FormField label="Job Title"><Input value={formData.job1_title} onChange={e => handleChange("job1_title", e.target.value)} className="rounded-xl" /></FormField>
                      <FormField label="Company Name"><Input value={formData.job1_company} onChange={e => handleChange("job1_company", e.target.value)} className="rounded-xl" /></FormField>
                      <FormField label="Job Type">
                        <Select value={formData.job1_type} onValueChange={v => handleChange("job1_type", v)}>
                          <SelectTrigger className="rounded-xl h-10 font-bold border-slate-200">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Full-time", "Part-time", "Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Start Date"><DatePicker value={formData.job1_start} onChange={v => handleChange("job1_start", v)} placeholder="DD/MM/YYYY" /></FormField>
                      <FormField label="End Date"><DatePicker value={formData.job1_end} onChange={v => handleChange("job1_end", v)} placeholder="DD/MM/YYYY" /></FormField>
                    </div>
                    <FormField label="Company Address"><Textarea value={formData.job1_address} onChange={e => handleChange("job1_address", e.target.value)} className="rounded-xl min-h-[80px]" /></FormField>
                    <FormField label="Key Responsibilities / Projects"><Textarea value={formData.job1_resp} onChange={e => handleChange("job1_resp", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Did you work anywhere else..?" mandatory error={errors.hasMoreWork1}>
                      <div className="flex gap-4"><button type="button" onClick={() => handleChange("hasMoreWork1", "yes")} className={cn("px-6 py-2 rounded-lg border-2", formData.hasMoreWork1 === "yes" ? "bg-sky-500 text-white border-sky-500" : "bg-white border-slate-100")}>Yes</button> <button type="button" onClick={() => handleChange("hasMoreWork1", "no")} className={cn("px-6 py-2 rounded-lg border-2", formData.hasMoreWork1 === "no" ? "bg-sky-500 text-white border-sky-500" : "bg-white border-slate-100")}>No</button></div>
                    </FormField>
                  </div>
                )}

                {/* Section 2 */}
                {formData.hasMoreWork1 === "yes" && (
                  <div className="space-y-8 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-4">
                    <h4 className="font-black text-sky-700 uppercase tracking-widest text-xs">Work Experience Section 2</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <FormField label="Job Title"><Input value={formData.job2_title} onChange={e => handleChange("job2_title", e.target.value)} className="rounded-xl" /></FormField>
                      <FormField label="Company Name"><Input value={formData.job2_company} onChange={e => handleChange("job2_company", e.target.value)} className="rounded-xl" /></FormField>
                      <FormField label="Job Type">
                        <Select value={formData.job2_type} onValueChange={v => handleChange("job2_type", v)}>
                          <SelectTrigger className="rounded-xl h-10 font-bold border-slate-200"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{["Full-time", "Part-time", "Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Start Date"><DatePicker value={formData.job2_start} onChange={v => handleChange("job2_start", v)} placeholder="DD/MM/YYYY" /></FormField>
                      <FormField label="End Date"><DatePicker value={formData.job2_end} onChange={v => handleChange("job2_end", v)} placeholder="DD/MM/YYYY" /></FormField>
                    </div>
                    <FormField label="Company Address"><Textarea value={formData.job2_address} onChange={e => handleChange("job2_address", e.target.value)} className="rounded-xl min-h-[80px]" /></FormField>
                    <FormField label="Key Responsibilities / Projects"><Textarea value={formData.job2_resp} onChange={e => handleChange("job2_resp", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Did you work anywhere else..?" mandatory error={errors.hasMoreWork2}>
                      <div className="flex gap-4"><button type="button" onClick={() => handleChange("hasMoreWork2", "yes")} className={cn("px-6 py-2 rounded-lg border-2", formData.hasMoreWork2 === "yes" ? "bg-sky-500 text-white border-sky-500" : "bg-white border-slate-100")}>Yes</button> <button type="button" onClick={() => handleChange("hasMoreWork2", "no")} className={cn("px-6 py-2 rounded-lg border-2", formData.hasMoreWork2 === "no" ? "bg-sky-500 text-white border-sky-500" : "bg-white border-slate-100")}>No</button></div>
                    </FormField>
                  </div>
                )}

                {/* Section 3 */}
                {formData.hasMoreWork2 === "yes" && (
                  <div className="space-y-8 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-4">
                    <h4 className="font-black text-sky-700 uppercase tracking-widest text-xs">Work Experience Section 3</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <FormField label="Job Title"><Input value={formData.job3_title} onChange={e => handleChange("job3_title", e.target.value)} className="rounded-xl" /></FormField>
                      <FormField label="Company Name"><Input value={formData.job3_company} onChange={e => handleChange("job3_company", e.target.value)} className="rounded-xl" /></FormField>
                      <FormField label="Job Type">
                        <Select value={formData.job3_type} onValueChange={v => handleChange("job3_type", v)}>
                          <SelectTrigger className="rounded-xl h-10 font-bold border-slate-200"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{["Full-time", "Part-time", "Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Start Date"><DatePicker value={formData.job3_start} onChange={v => handleChange("job3_start", v)} placeholder="DD/MM/YYYY" /></FormField>
                      <FormField label="End Date"><DatePicker value={formData.job3_end} onChange={v => handleChange("job3_end", v)} placeholder="DD/MM/YYYY" /></FormField>
                    </div>
                    <FormField label="Company Address"><Textarea value={formData.job3_address} onChange={e => handleChange("job3_address", e.target.value)} className="rounded-xl min-h-[80px]" /></FormField>
                    <FormField label="Key Responsibilities / Projects"><Textarea value={formData.job3_resp} onChange={e => handleChange("job3_resp", e.target.value)} className="rounded-xl" /></FormField>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Section 4: Education */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Academic Background" icon={GraduationCap} isOpen={openSections.education} onToggle={() => toggleSection("education")} />
            {openSections.education && (
              <CardContent className="p-10 space-y-12 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <h4 className="font-black text-sky-700 uppercase tracking-widest text-xs">Masters Education Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FormField label="Highest Degree" mandatory error={errors.highestDegree}><Input value={formData.highestDegree} onChange={e => handleChange("highestDegree", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Field of Study" mandatory error={errors.mastersField}><Input value={formData.mastersField} onChange={e => handleChange("mastersField", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="University / Institution Name" mandatory error={errors.mastersUni}><Input value={formData.mastersUni} onChange={e => handleChange("mastersUni", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Country" mandatory error={errors.mastersCountry}><Input value={formData.mastersCountry} onChange={e => handleChange("mastersCountry", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Graduation Month & Year" mandatory error={errors.mastersGradDate}><Input value={formData.mastersGradDate} onChange={e => handleChange("mastersGradDate", e.target.value)} placeholder="e.g. May 2024" className="rounded-xl" /></FormField>
                    <FormField label="LinkedIn Profile Link" mandatory icon={LinkIcon} error={errors.linkedinLink}><Input value={formData.linkedinLink} onChange={e => handleChange("linkedinLink", e.target.value)} placeholder="https://linkedin.com/in/..." className="rounded-xl" /></FormField>
                  </div>
                </div>
                <div className="space-y-6 pt-10 border-t border-slate-100">
                  <h4 className="font-black text-sky-700 uppercase tracking-widest text-xs">Bachelors Education Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FormField label="Bachelors Degree" mandatory error={errors.bachelorsDegree}><Input value={formData.bachelorsDegree} onChange={e => handleChange("bachelorsDegree", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Field of Study" mandatory error={errors.bachelorsField}><Input value={formData.bachelorsField} onChange={e => handleChange("bachelorsField", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="University / Institution Name" mandatory error={errors.bachelorsUni}><Input value={formData.bachelorsUni} onChange={e => handleChange("bachelorsUni", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Country" mandatory error={errors.bachelorsCountry}><Input value={formData.bachelorsCountry} onChange={e => handleChange("bachelorsCountry", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Graduation Month & Year" mandatory error={errors.bachelorsGradDate}><Input value={formData.bachelorsGradDate} onChange={e => handleChange("bachelorsGradDate", e.target.value)} placeholder="e.g. June 2020" className="rounded-xl" /></FormField>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section 5: Certifications */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Professional Certifications" icon={Award} isOpen={openSections.certs} onToggle={() => toggleSection("certs")} />
            {openSections.certs && (
              <CardContent className="p-10 space-y-8 animate-in fade-in duration-500">
                <FormField label="Have you completed any professional certifications?" mandatory error={errors.hasCerts}>
                  <div className="flex gap-4"><button type="button" onClick={() => handleChange("hasCerts", "yes")} className={cn("px-8 py-3 rounded-xl border-2 font-black", formData.hasCerts === "yes" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-100")}>YES</button> <button type="button" onClick={() => handleChange("hasCerts", "no")} className={cn("px-8 py-3 rounded-xl border-2 font-black", formData.hasCerts === "no" ? "bg-sky-600 text-white border-sky-600" : "bg-white border-slate-100")}>NO</button></div>
                </FormField>
                {formData.hasCerts === "yes" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 bg-sky-50/50 rounded-3xl animate-in slide-in-from-top-4">
                    <FormField label="Certification Name" mandatory error={errors.certName}><Input value={formData.certName} onChange={e => handleChange("certName", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Issuing Organization" mandatory error={errors.certOrg}><Input value={formData.certOrg} onChange={e => handleChange("certOrg", e.target.value)} className="rounded-xl" /></FormField>
                    <FormField label="Issued Date" mandatory error={errors.certDate}><DatePicker value={formData.certDate} onChange={v => handleChange("certDate", v)} /></FormField>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Section 6: Documents */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Document Uploads" icon={FileText} isOpen={openSections.docs} onToggle={() => toggleSection("docs")} />
            {openSections.docs && (
              <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                {[
                  { id: "docUpload", label: "Upload Any Documents" },
                  { id: "passportUpload", label: "Please Upload Passport" },
                  { id: "govIdUpload", label: "Please Upload Government ID" },
                  { id: "visaUpload", label: "Please Upload Visa" },
                  { id: "workAuthUpload", label: "Work Authorization Proof" }
                ].map(d => (
                  <FormField key={d.id} label={d.label} mandatory error={errors[d.id]}>
                    <div 
                      onClick={() => document.getElementById(d.id)?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group",
                        formData[d.id] ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:border-sky-400"
                      )}
                    >
                      <input type="file" id={d.id} className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file && file.size <= 5*1024*1024) handleChange(d.id, file);
                        else toast({ variant: "destructive", title: "Error", description: "Max 5MB PDF/DOC/IMG" });
                      }} />
                      {formData[d.id] ? <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" /> : <CloudUpload className="h-8 w-8 text-slate-300 mx-auto group-hover:text-sky-500" />}
                      <p className="mt-2 text-xs font-bold text-slate-600 truncate">{formData[d.id] ? formData[d.id].name : "Select File"}</p>
                    </div>
                  </FormField>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Section 7: Job Preferences */}
          <Card className="border-none shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <SectionHeader title="Job Preferences" icon={Building2} isOpen={openSections.prefs} onToggle={() => toggleSection("prefs")} />
            {openSections.prefs && (
              <CardContent className="p-10 space-y-10 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField label="Desired Job Role / Roles" mandatory error={errors.desiredRole}><Input value={formData.desiredRole} onChange={e => handleChange("desiredRole", e.target.value)} placeholder="e.g. Software Engineer" className="rounded-xl h-12" /></FormField>
                  <FormField label="Desired Years of Experience" mandatory error={errors.desiredExpYears}><Input type="number" value={formData.desiredExpYears} onChange={e => handleChange("desiredExpYears", e.target.value)} placeholder="e.g. 3" className="rounded-xl h-12" /></FormField>
                </div>
                <FormField label="Please Upload Original Resume" mandatory error={errors.resumeUpload}>
                  <div 
                    onClick={() => document.getElementById("resumeUpload")?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer bg-sky-50/50",
                      formData.resumeUpload ? "border-emerald-400" : "border-sky-200 hover:border-sky-500"
                    )}
                  >
                    <input type="file" id="resumeUpload" className="hidden" onChange={e => handleChange("resumeUpload", e.target.files?.[0])} />
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"><Upload className="h-8 w-8 text-sky-600" /></div>
                      <div><p className="text-xl font-black text-slate-800">{formData.resumeUpload ? formData.resumeUpload.name : "Drop Original Resume Here"}</p><p className="text-sm text-slate-500 font-medium">Accepted: PDF, DOC, DOCX, PNG, JPG (Max 5MB)</p></div>
                    </div>
                  </div>
                </FormField>
              </CardContent>
            )}
          </Card>

          {/* Sticky Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-3xl border-t border-slate-100 p-6 z-[100] shadow-[0_-20px_80px_rgba(0,0,0,0.08)]">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
              <div className="hidden lg:flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center shadow-inner">
                  <AlertCircle className="h-6 w-6 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                    {uploadProgress ? "Uploading Assets..." : "Submission Ready"} 
                    <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md text-[10px] uppercase">Reviewing Form</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {uploadProgress ? "Please wait — processing files..." : "Verify all 65 fields before clicking"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <Button 
                  type="button" 
                  onClick={() => setFormData({...INITIAL_STATE, timestamp: new Date().toLocaleString(), email: user?.email || ""})} 
                  variant="ghost" 
                  disabled={isSubmitting}
                  className="h-14 px-8 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 gap-2 transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !candidateId}
                  className="flex-1 lg:flex-none h-14 px-16 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-xl shadow-sky-200 hover:shadow-sky-300 transition-all gap-3 text-lg active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <><div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> {uploadProgress ? "Uploading..." : "Submitting..."}</>
                  ) : (
                    <>Submit Sheet <CheckCircle className="h-5 w-5" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CandidateIntakePage;
