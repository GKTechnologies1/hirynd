import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, billingApi, authApi, BACKEND_URL, getFileUrl, filesApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/DataTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, User, Users, UserPlus, DollarSign, Shield, FileText, Plus, Briefcase, CheckCircle, XCircle, Clock, History, Award, Settings, BarChart, CreditCard, Pencil, Trash, Trash2, RefreshCw, Activity, Eye, EyeOff, AlertTriangle, ClipboardList, KeyRound, Save, Download, ChevronDown, Calendar as CalendarIcon, FileCheck, Sparkles, Upload, MapPin } from "lucide-react";
import AdminAssignmentsTab from "@/components/admin/AdminAssignmentsTab";
import AdminPlacementTab from "@/components/admin/AdminPlacementTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import AdminQAChecklist from "@/components/admin/AdminQAChecklist";
import AdminBillingTab from "@/components/admin/AdminBillingTab";
import CandidateApplicationsPage from "@/pages/candidate/CandidateApplicationsPage";
import CandidateInterviewsPage from "@/pages/candidate/CandidateInterviewsPage";
import { DatePicker } from "@/components/ui/DatePicker";
import CustomCredentialsDialog from "@/components/dashboard/CustomCredentialsDialog";

const formatToMMDDYYYY = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  if (typeof date === "string") {
    if (date.toLowerCase() === "present") return "Present";
    const clean = date.trim();
    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const m = slashMatch[1].padStart(2, '0');
      const d = slashMatch[2].padStart(2, '0');
      const y = slashMatch[3];
      return `${m}-${d}-${y}`;
    }
    const dashMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const m = dashMatch[1].padStart(2, '0');
      const d = dashMatch[2].padStart(2, '0');
      const y = dashMatch[3];
      return `${m}-${d}-${y}`;
    }
    const isoDashMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoDashMatch) {
      const y = isoDashMatch[1];
      const m = isoDashMatch[2].padStart(2, '0');
      const d = isoDashMatch[3].padStart(2, '0');
      return `${m}-${d}-${y}`;
    }
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return typeof date === "string" ? date : "—";
  
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const year = d.getUTCFullYear();
  
  return `${month}-${day}-${year}`;
};

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
  { label: "Reports", path: "/admin-dashboard/reports", icon: <BarChart className="h-4 w-4" /> },
  { label: "Configuration", path: "/admin-dashboard/config", icon: <Settings className="h-4 w-4" /> },
];

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

interface AdminCandidateDetailProps {
  candidateId: string;
  onLoaded?: (name: string) => void;
}

const AdminCandidateDetail = ({ candidateId, onLoaded }: AdminCandidateDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [proposedRoles, setProposedRoles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [interviewLogs, setInterviewLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const [confirmRoleModal, setConfirmRoleModal] = useState<any>(null);
  const [addingProposedRole, setAddingProposedRole] = useState(false);

  const [removeRoleModal, setRemoveRoleModal] = useState<any>(null);
  const [removingProposedRole, setRemovingProposedRole] = useState(false);

  const [editingRole, setEditingRole] = useState<any>(null);
  const [editRoleTitle, setEditRoleTitle] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [savingEditedRole, setSavingEditedRole] = useState(false);


  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("subscription");
  const [payStatus, setPayStatus] = useState("pending");
  const [payNotes, setPayNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const [isEditingCreds, setIsEditingCreds] = useState(false);
  const [credForm, setCredForm] = useState<Record<string, any>>({});
  const [savingCred, setSavingCred] = useState(false);
  const [showCredPasswords, setShowCredPasswords] = useState<Record<string, boolean>>({});
  const toggleCredPw = (k: string) => setShowCredPasswords(p => ({ ...p, [k]: !p[k] }));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(`admin_candidate_active_tab_${candidateId}`) || "overview";
  });

  useEffect(() => {
    const stored = sessionStorage.getItem(`admin_candidate_active_tab_${candidateId}`) || "overview";
    if (candidate && candidate.status === 'lead') {
      const validLeadTabs = ["overview", "assignments", "audit"];
      if (!validLeadTabs.includes(stored)) {
        setActiveTab("overview");
        return;
      }
    }
    setActiveTab(stored);
  }, [candidateId, candidate?.status]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    sessionStorage.setItem(`admin_candidate_active_tab_${candidateId}`, val);
  };

  const fetchAll = async (showLoading = true, isPolling = false) => {
    if (showLoading) setLoading(true);
    const backgroundConfig = isPolling ? { headers: { 'X-Background-Request': 'true' } } : undefined;
    try {
      const { data: cand } = await candidatesApi.detail(candidateId, backgroundConfig);
      setCandidate(cand);
      if (cand) {
        if (onLoaded) {
          const name = cand.full_name || cand.profile?.full_name || cand.email || "Candidate";
          onLoaded(name);
        }
        const [intakeRes, roleRes, credRes, payRes, subRes, interviewRes, proposedRoleRes] = await Promise.all([
          candidatesApi.getIntake(candidateId, backgroundConfig).catch(() => ({ data: null })),
          candidatesApi.getRoles(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          candidatesApi.getCredentials(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          billingApi.payments(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          billingApi.subscription(candidateId, backgroundConfig).catch(() => ({ data: null })),
          candidatesApi.getInterviews(candidateId, backgroundConfig).catch(() => ({ data: [] })),
          candidatesApi.getProposedRoles(candidateId, backgroundConfig).catch(() => ({ data: [] })),
        ]);
        setIntake(intakeRes.data || null);
        setRoles(roleRes.data || []);
        setProposedRoles(proposedRoleRes.data || []);
        setCredentials(credRes.data || []);
        if (credRes.data && credRes.data.length > 0 && credRes.data[0].data) {
          const data = credRes.data[0].data;
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
        setPayments(payRes.data || []);
        setSubscription(subRes.data?.id ? subRes.data : null);
        setInterviewLogs(interviewRes.data || []);
      }
    } catch { }
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    setCandidate(null);
    fetchAll(true, false);
    const interval = setInterval(() => {
      fetchAll(false, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [candidateId]);

  const handleAddRole = async () => {
    if (!newRoleTitle.trim()) return;

    const isDuplicate = roles.some(r => r.role_title.toLowerCase().trim() === newRoleTitle.toLowerCase().trim());
    if (isDuplicate) {
      toast({ title: "Duplicate Role", description: "This role has already been suggested.", variant: "destructive" });
      return;
    }

    setAddingRole(true);
    try {
      await candidatesApi.addRole(candidateId, { role_title: newRoleTitle.trim(), description: newRoleDescription.trim() });
      setNewRoleTitle(""); setNewRoleDescription("");
      toast({ title: "Role suggestion added" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setAddingRole(false);
  };

  const handleConfirmProposedRole = async () => {
    if (!confirmRoleModal) return;
    setAddingProposedRole(true);
    try {
      await candidatesApi.addRole(candidateId, {
        role_title: confirmRoleModal.custom_role_title,
        description: confirmRoleModal.custom_reason || "",
        delete_proposed_role_id: confirmRoleModal.id
      });
      toast({ title: "Role suggestion added" });
      setConfirmRoleModal(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setAddingProposedRole(false);
  };

  const handleRemoveProposedRole = async () => {
    if (!removeRoleModal) return;
    setRemovingProposedRole(true);
    try {
      await candidatesApi.deleteProposedRole(candidateId, removeRoleModal.id);
      toast({ title: "Proposed role removed" });
      setRemoveRoleModal(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setRemovingProposedRole(false);
  };

  const handleUpdateSuggestedRole = async () => {
    if (!editingRole || !editRoleTitle.trim()) return;
    setSavingEditedRole(true);
    try {
      await candidatesApi.updateRole(candidateId, editingRole.id, {
        role_title: editRoleTitle.trim(),
        description: editRoleDescription.trim()
      });
      toast({ title: "Suggested role updated" });
      setEditingRole(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingEditedRole(false);
  };

  const handleDeleteSuggestedRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this suggested role?")) return;
    try {
      await candidatesApi.deleteRole(candidateId, roleId);
      toast({ title: "Suggested role deleted" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleSuggestRoles = async () => {

    if (roles.length === 0) { toast({ title: "Add at least one role first", variant: "destructive" }); return; }
    try {
      await candidatesApi.updateStatus(candidateId, "roles_published");
      toast({ title: "Roles published to candidate for confirmation" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setAddingPayment(true);
    try {
      await billingApi.recordPayment(candidateId, { amount: Number(payAmount), payment_type: payType, status: payStatus, notes: payNotes });
      setPayAmount(""); setPayNotes("");
      toast({ title: "Payment recorded" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setAddingPayment(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await billingApi.deletePayment(paymentId);
      toast({ title: "Payment deleted" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePayment = async (paymentId: string, currentAmount: string, currentNotes: string) => {
    const amount = prompt("Update Amount ($):", currentAmount);
    if (amount === null) return;
    const notes = prompt("Update Notes:", currentNotes);
    if (notes === null) return;

    try {
      await billingApi.updatePayment(paymentId, { amount: parseFloat(amount), notes });
      toast({ title: "Payment updated" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleReopenIntake = async () => {
    try {
      await candidatesApi.reopenIntake(candidateId);
      toast({ title: "Intake form reopened" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleReopenRoles = async () => {
    try {
      await candidatesApi.reopenRoles(candidateId);
      toast({ title: "Roles reset and status reverted to Intake Submitted" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await candidatesApi.updateStatus(candidateId, newStatus);
      toast({ title: "Status updated" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
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
      toast({ title: "Credentials updated by Admin" });
      setIsEditingCreds(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingCred(false);
  };

  const handlePauseResume = async () => {
    const nextStatus = status === "paused" ? "active_marketing" : "paused";
    try {
      await candidatesApi.updateStatus(candidateId, nextStatus);
      toast({ title: status === "paused" ? "Marketing resumed" : "Marketing paused" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this profile? This will trigger billing closure.")) return;
    try {
      await candidatesApi.updateStatus(candidateId, "cancelled");
      toast({ title: "Profile cancelled" }); fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading && !candidate) return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading candidate data...</p></div>;
  if (!candidate) return <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed"><p className="text-muted-foreground">Candidate not found or internal system error.</p></div>;

  const intakeData = intake?.data as Record<string, any> | null;
  const status = candidate.status;
  const isPlaced = status === "placed_closed";
  const STATUSES = [
    "pending_approval", "lead", "approved", "intake_submitted", "roles_published",
    "roles_candidate_responded", "roles_confirmed", "payment_pending", "pending_payment", "payment_completed",
    "credentials_submitted", "active_marketing", "paused", "on_hold", "past_due",
    "cancelled", "placed_closed"
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={status} />
        {!isPlaced && (
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>

            {(status === "active_marketing" || status === "paused") && (
              <Button variant="outline" size="sm" onClick={handlePauseResume}>
                {status === "paused" ? "Resume Marketing" : "Pause Marketing"}
              </Button>
            )}

            {status !== "cancelled" && (
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={handleCancel}>
                Cancel Profile
              </Button>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>← Back</Button>
      </div>

      {/* QA Checklist */}
      <AdminQAChecklist candidateId={candidateId} candidateStatus={status} />

      {/* Intake Warning */}
      {!intake && status !== 'lead' && status !== 'pending_approval' && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Intake Sheet Pending</p>
                <p className="text-sm text-amber-700/80">The candidate has not submitted their professional intake form yet. Review the registration data below in the meantime.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => handleStatusChange('lead')}>
              Remind Candidate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Placed Banner */}
      {isPlaced && (
        <Card className="mb-6 border-secondary/50 bg-secondary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-6 w-6 text-secondary" />
            <div>
              <p className="font-semibold text-card-foreground">Case Closed — Candidate Placed</p>
              <p className="text-sm text-muted-foreground">This candidate has been successfully placed. Marketing and daily logs are locked.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {status !== 'lead' && (
            <>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </>
          )}
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          {status !== 'lead' && <TabsTrigger value="applications">Applications</TabsTrigger>}
          {status !== 'lead' && <TabsTrigger value="interviews">Interviews</TabsTrigger>}
          {status !== 'lead' && <TabsTrigger value="placement">Placement</TabsTrigger>}
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Primary Profile */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> {status === 'lead' ? 'Interest Snapshot' : 'Registration Profile'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Full Name</Label>
                  <p className="font-semibold text-foreground text-base tracking-tight">{candidate?.profile?.full_name || candidate?.full_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Contact Details</Label>
                  <p className="font-medium text-foreground">{candidate?.profile?.email || candidate?.email || "—"}</p>
                  <p className="font-medium text-muted-foreground mt-0.5">{candidate?.profile?.phone || "—"}</p>
                  {intakeData?.marketing_email && (
                    <div className="mt-2">
                      <Label className="text-[9px] uppercase text-muted-foreground font-bold">Marketing Email</Label>
                      <p className="font-medium text-foreground">{intakeData.marketing_email}</p>
                    </div>
                  )}
                  {intakeData?.marketing_phone && (
                    <div className="mt-1">
                      <Label className="text-[9px] uppercase text-muted-foreground font-bold">Marketing Phone</Label>
                      <p className="font-medium text-foreground">{intakeData.marketing_phone}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Base Currency</Label>
                    <p className="font-medium text-foreground">{subscription?.currency || "USD"}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">{status === 'lead' ? 'Submitted At' : 'Date Joined'}</Label>
                    <p className="font-medium text-foreground">{formatDate(candidate.created_at || candidate.date_joined)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">{status === 'lead' ? 'Submitted Resume' : 'Registered Resume'}</Label>
                  {(candidate?.resume_file || candidate?.resume_url) ? (
                    <div className="flex items-center gap-3">
                      <DocumentPreview
                        url={candidate.resume_file || candidate.resume_url}
                        label={`View ${status === 'lead' ? 'Lead' : 'Registration'} Resume`}
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No resume uploaded during registration</p>
                  )}
                </div>
                {intakeData?.target_roles && (
                  <div className="pt-2 border-t mt-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Candidate Written Roles</Label>
                    <p className="font-medium text-foreground whitespace-pre-wrap text-sm leading-relaxed">{intakeData.target_roles}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education Profile */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> Educational Background
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">University / College</Label>
                  <p className="font-semibold text-foreground tracking-tight">{candidate?.university || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Degree & Major</Label>
                    <p className="font-medium text-foreground">
                      {candidate?.degree || "—"}
                      {candidate?.major ? ` & ${candidate.major}` : ""}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Graduation Date</Label>
                  <p className="font-medium text-foreground">
                    {formatToMMDDYYYY(candidate?.graduation_date)}
                    {candidate?.graduation_year && !candidate?.graduation_date && ` (${candidate.graduation_year})`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location & Professional Links */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Location & Professional Links
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Current Location</Label>
                    <p className="font-medium text-foreground">{candidate?.current_location || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Preferred Location(s)</Label>
                    <p className="font-medium text-foreground">{candidate?.preferred_locations || "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">LinkedIn</Label>
                    {candidate?.linkedin_url ? (
                      <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1 mt-1">
                        View Profile <Eye className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">No URL Provided</p>}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">GitHub</Label>
                    {candidate?.github_url ? (
                      <a href={candidate.github_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1 mt-1">
                        View Codebase <FileText className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">No URL Provided</p>}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Portfolio</Label>
                    {candidate?.portfolio_url ? (
                      <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline flex items-center gap-1 mt-1">
                        Open Portfolio <LayoutDashboard className="h-3 w-3" />
                      </a>
                    ) : <p className="text-muted-foreground italic text-xs">No URL Provided</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visa & Eligibility */}
            <Card className="border-none shadow-sm flex flex-col">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Visa & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid gap-y-4 text-sm flex-1">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Work Authorization</Label>
                  <p className="font-semibold text-foreground text-base">{candidate?.visa_status || "—"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">OPT / STEM End Date</Label>
                  <p className="font-medium text-foreground">{formatToMMDDYYYY(candidate?.opt_end_date)}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Source / Referral</Label>
                  <p className="font-medium text-foreground">{candidate?.referral_source || "Direct"}</p>
                  {candidate?.referral_friend_name && <p className="text-xs text-muted-foreground mt-0.5 font-medium">Referred by: {candidate.referral_friend_name}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {candidate?.notes && (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 pb-2">
                <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Additional Candidate Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="text-sm text-foreground/80 italic leading-relaxed">"{candidate.notes}"</p>
              </CardContent>
            </Card>
          )}

          {interviewLogs.length > 0 && (
            <Card className="bg-blue-600 shadow-lg border-none text-white">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest opacity-90"><BarChart className="h-4 w-4" /> Pipeline Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-8 text-sm">
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Total Interviews</span> <strong className="text-2xl">{interviewLogs.length}</strong></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Scheduled</span> <strong className="text-2xl">{interviewLogs.filter((l: any) => l.outcome === "scheduled").length}</strong></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Success Rate</span> <strong className="text-2xl">{Math.round((interviewLogs.filter((l: any) => l.outcome === "selected").length / interviewLogs.length) * 100)}%</strong></div>
                  <div className="flex flex-col"><span className="text-[10px] font-bold opacity-70 uppercase">Offers Received</span> <strong className="text-2xl">{interviewLogs.filter((l: any) => l.outcome === "selected").length}</strong></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Intake Tab */}
        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Client Intake Sheet</CardTitle>
                  <CardDescription>{intake ? (intake.is_locked ? "Submitted & locked" : "Draft") : "Not submitted yet"}</CardDescription>
                </div>
                {intake?.is_locked && (
                  <Button variant="outline" size="sm" onClick={handleReopenIntake} className="text-secondary border-secondary/30 hover:bg-secondary/5">
                    <History className="mr-1 h-3.5 w-3.5" /> Reopen for Editing
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="min-h-[300px] p-6">
              {intakeData ? (
                <div className="space-y-8 animate-in fade-in duration-350">
                  {!intake.is_locked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-center gap-2">
                      <Clock className="h-4 w-4" /> This is a draft version. The candidate has not yet submitted and locked this form.
                    </div>
                  )}

                  {/* Personal Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                      <User className="h-4 w-4" /> Personal Details
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">First Name *</p>
                        <p className="font-bold text-neutral-900">{intakeData.first_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Last Name *</p>
                        <p className="font-bold text-neutral-900">{intakeData.last_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Date of Birth *</p>
                        <p className="font-bold text-neutral-900">{formatToMMDDYYYY(intakeData.date_of_birth || intakeData.dob)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Email Address *</p>
                        <p className="font-bold text-neutral-900 break-all">{intakeData.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Phone Number *</p>
                        <p className="font-bold text-neutral-900">{intakeData.phone_number || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">New E-mail for Marketing</p>
                        <p className="font-bold text-neutral-900 break-all">{intakeData.marketing_email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Contact number for Marketing</p>
                        <p className="font-bold text-neutral-900">{intakeData.marketing_phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Current Visa Status *</p>
                        <p className="font-bold text-neutral-900">{intakeData.visa_status || intakeData.visa_type || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">First Entry into the U.S. *</p>
                        <p className="font-bold text-neutral-900">{formatToMMDDYYYY(intakeData.first_entry_us)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Total Years in the U.S. *</p>
                        <p className="font-bold text-neutral-900">{intakeData.total_years_us || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground font-semibold mb-0.5">Current Address *</p>
                        <p className="font-bold text-neutral-900 leading-relaxed">{intakeData.current_address || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground font-semibold mb-0.5">Mailing Address *</p>
                        <p className="font-bold text-neutral-900 leading-relaxed">{intakeData.mailing_address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Skills */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-green-600 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Skills
                    </h4>
                    <div className="space-y-3 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Skilled In (Skills you can confidently work with, e.g., Python, React, Java) *</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.skilled_in || intakeData.primary_skills || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Currently Learning / Recently Learned *</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.recently_learned || intakeData.currently_learning || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Experienced With Tools *</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.experienced_with || intakeData.experienced_tools || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Learning Now / Self-Taught Tools *</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.learning_now || intakeData.learning_tools || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Other Non-Technical Skills / Courses *</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.other_non_tech || intakeData.non_technical_skills || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Work Experience */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-orange-600 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Work Experience
                    </h4>
                    <div className="space-y-4 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Do you have any work experience (U.S. and/or International)? *</p>
                        <p className="font-bold text-neutral-900 uppercase">{intakeData.has_work_exp || intakeData.has_work_experience || "—"}</p>
                      </div>

                      {(intakeData.has_work_exp === "yes" || intakeData.has_work_experience === "yes") && intakeData.experiences && Array.isArray(intakeData.experiences) && intakeData.experiences.length > 0 && (
                        <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t">
                          {intakeData.experiences.map((exp: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-white border space-y-3">
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Work Experience Section {idx + 1}</h5>
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
                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold inline-block mt-0.5">
                                    {exp.job_type === "full_time" ? "Full Time" : exp.job_type === "part_time" ? "Part Time" : exp.job_type === "internship" ? "Internship" : exp.job_type || "—"}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Start Date</Label>
                                  <p className="font-medium text-neutral-700">{formatToMMDDYYYY(exp.start_date)}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">End Date</Label>
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
                                  <p className="text-[11px] text-neutral-700 leading-relaxed bg-neutral-50 p-2.5 rounded border italic whitespace-pre-wrap">{exp.responsibilities}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Education */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-purple-600 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Education
                    </h4>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Highest Degree */}
                      <div className="bg-neutral-50/50 p-4 rounded-xl border space-y-3 text-xs">
                        <p className="font-bold text-purple-600 uppercase tracking-wider text-[10px]">Highest Degree Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <p className="text-muted-foreground font-semibold mb-0.5">University / Institution Name (Highest) *</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_uni || intakeData.highest_university || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Highest Degree *</p>
                            <p className="font-bold text-neutral-900">{intakeData.highest_degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Field of Study (Highest Degree) *</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_field || intakeData.highest_field_of_study || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Country (Highest) *</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_country || intakeData.highest_country || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Graduation Date (Highest)*</p>
                            <p className="font-bold text-neutral-900">{formatToMMDDYYYY(intakeData.highest_graduation_date || intakeData.masters_grad_date)}</p>
                          </div>
                          <div className="col-span-2 pt-2 border-t">
                            <p className="text-muted-foreground font-semibold mb-0.5">LinkedIn Profile Link *</p>
                            {intakeData.linkedin_link || intakeData.linkedin_url ? (
                              <a href={(intakeData.linkedin_link || intakeData.linkedin_url).startsWith('http') ? (intakeData.linkedin_link || intakeData.linkedin_url) : `https://${intakeData.linkedin_link || intakeData.linkedin_url}`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                                {intakeData.linkedin_link || intakeData.linkedin_url} <Eye className="h-3.5 w-3.5" />
                              </a>
                            ) : <p className="font-bold text-neutral-900">—</p>}
                          </div>
                        </div>
                      </div>

                      {/* Bachelor's */}
                      <div className="bg-neutral-50/50 p-4 rounded-xl border space-y-3 text-xs">
                        <p className="font-bold text-purple-600 uppercase tracking-wider text-[10px]">Additional Education Detail (Bachelors)</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <p className="text-muted-foreground font-semibold mb-0.5">University / Institution Name *</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_uni || intakeData.bachelors_university || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Bachelors Degree *</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Field of Study *</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_field || intakeData.bachelors_field_of_study || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Country *</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_country || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Graduation Date *</p>
                            <p className="font-bold text-neutral-900">{formatToMMDDYYYY(intakeData.bachelors_graduation_date || intakeData.bachelors_grad_date)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Certifications & Credentials */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Certifications & Credentials
                    </h4>
                    <div className="space-y-4 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Have you completed any professional certifications? *</p>
                        <p className="font-bold text-neutral-900 uppercase">{intakeData.has_certs || intakeData.has_certifications || "—"}</p>
                      </div>

                      {(intakeData.has_certs === "yes" || intakeData.has_certifications === "yes") && intakeData.certifications && Array.isArray(intakeData.certifications) && intakeData.certifications.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t">
                          {intakeData.certifications.map((cert: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-white border space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Certification #{idx + 1}</h5>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Certification Name *</Label>
                                  <p className="font-bold text-neutral-900 text-sm leading-tight">{cert.name || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Issuing Organization *</Label>
                                  <p className="font-semibold text-neutral-800">{cert.organization || "—"}</p>
                                </div>
                                <div>
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Credential ID / Certification ID (Optional)</Label>
                                  <p className="text-neutral-700 font-medium">{cert.credential_id || cert.credentialId || "—"}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Issued Date *</Label>
                                    <p className="text-neutral-700 font-medium">{formatToMMDDYYYY(cert.issued_date || cert.issuedDate)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Expiry Date (Optional)</Label>
                                    <p className="text-neutral-700 font-medium">{formatToMMDDYYYY(cert.expires_date || cert.expiresDate)}</p>
                                  </div>
                                </div>
                                {cert.notes && (
                                  <div>
                                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-0.5">Description / Notes (Optional)</Label>
                                    <p className="text-neutral-700">{cert.notes}</p>
                                  </div>
                                )}
                              </div>
                              {(cert.credential_url || cert.file) && (
                                <div className="pt-2 border-t mt-2">
                                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-1">Upload Certification Document *</Label>
                                  <DocumentPreview
                                    url={cert.credential_url || cert.file}
                                    label="Preview Certification"
                                    variant="button"
                                    className="w-full text-xs font-bold h-9 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Identity & Legal Documents */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-teal-600 flex items-center gap-2">
                      <FileCheck className="h-4 w-4" /> Identity & Legal Documents
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: "Please Upload Passport", url: intakeData.passport_url, required: true },
                        { label: "Please Upload Government ID", url: intakeData.gov_id_url, required: true },
                        { label: "Please Upload Visa", url: intakeData.visa_url, required: true },
                        { label: "Work Authorization Proof", url: intakeData.work_auth_url, required: true },
                        { label: "Upload Any Additional Documents (Optional)", url: intakeData.doc_url, required: false },
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

                  <Separator />

                  {/* Job Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-600 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Job Preferences
                    </h4>
                    <div className="space-y-4 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground font-semibold mb-0.5">Desired Job Role / Roles *</p>
                          <p className="font-bold text-neutral-900 text-sm">{intakeData.desired_role || intakeData.target_roles || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-semibold mb-0.5">Desired Years of Experience *</p>
                          <p className="font-bold text-neutral-900 text-sm">{intakeData.desired_exp_years || intakeData.desired_years_of_experience || "—"}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="font-semibold text-neutral-800 mb-2">Please Upload Original Resume</p>
                        {intakeData.resume_url ? (
                          <DocumentPreview
                            url={intakeData.resume_url}
                            label="View Resume"
                            variant="button"
                            className="w-full sm:w-auto text-xs font-bold h-9 px-4 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          />
                        ) : (
                          <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 p-2 rounded text-center border border-amber-100 inline-block">Not Uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 w-full border-2 border-dashed rounded-2xl bg-muted/5">
                  <ClipboardList className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-bold text-card-foreground">Intake Form Pending</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                    The candidate has not yet submitted their professional intake questionnaire.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Role Suggestions</CardTitle>
                {!["pending_approval", "lead", "approved", "intake_submitted"].includes(status) && (
                  <Button variant="outline" size="sm" onClick={handleReopenRoles} className="text-secondary border-secondary/30 hover:bg-secondary/5">
                    <History className="mr-1 h-3.5 w-3.5" /> Reopen & Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={roles}
                isLoading={loading}
                searchPlaceholder="Search roles..."
                searchKey="role_title"
                emptyMessage="No roles suggested yet."
                columns={[
                  {
                    header: "Title",
                    accessorKey: "role_title",
                    className: "font-medium text-sm pl-6"
                  },
                  {
                    header: "Description",
                    render: (r: any) => <span className="text-xs text-muted-foreground line-clamp-1">{r.description || "—"}</span>
                  },
                  {
                    header: "Candidate Response",
                    render: (r: any) => (
                      <div className="space-y-1">
                        <StatusBadge status={r.candidate_confirmed === true ? "active" : r.candidate_confirmed === false ? "rejected" : "pending"} />
                        {r.candidate_confirmed === false && r.change_request_note && (
                          <p className="text-[11px] text-destructive/80 italic max-w-[220px] line-clamp-2">
                            Reason: {r.change_request_note}
                          </p>
                        )}
                      </div>
                    )
                  },
                  {
                    header: "Actions",
                    className: "pr-6 text-right",
                    render: (r: any) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingRole(r);
                            setEditRoleTitle(r.role_title);
                            setEditRoleDescription(r.description || "");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteSuggestedRole(r.id)}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
              {roles.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Candidate-Proposed Custom Roles */}
          {proposedRoles.length > 0 && (
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4 text-secondary" /> Candidate-Proposed Roles
                </CardTitle>
                <p className="text-xs text-muted-foreground">Roles the candidate suggested during their role confirmation step.</p>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={proposedRoles}
                  isLoading={loading}
                  searchPlaceholder="Search proposed roles..."
                  searchKey="custom_role_title"
                  emptyMessage="No proposed roles."
                  columns={[
                    {
                      header: "Proposed Role Title",
                      accessorKey: "custom_role_title",
                      className: "font-medium text-sm pl-6 text-secondary"
                    },
                    {
                      header: "Reason / Context",
                      render: (r: any) => <span className="text-xs text-muted-foreground">{r.custom_reason || "—"}</span>
                    },
                    {
                      header: "Proposed On",
                      render: (r: any) => <span className="text-xs text-muted-foreground">{formatDate(r.responded_at)}</span>
                    },
                    {
                      header: "Action",
                      className: "pr-6 text-right",
                      render: (r: any) => (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                            onClick={() => setRemoveRoleModal(r)}
                          >
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-secondary/30 text-secondary hover:bg-secondary/5"
                            onClick={() => {
                              const isDuplicate = roles.some(role => role.role_title.toLowerCase().trim() === r.custom_role_title.toLowerCase().trim());
                              if (isDuplicate) {
                                toast({ title: "Duplicate Role", description: "This role has already been suggested.", variant: "destructive" });
                                return;
                              }
                              setConfirmRoleModal(r);
                            }}
                          >
                            Add to Suggestions
                          </Button>
                        </div>
                      )
                    }
                  ]}
                />
                {proposedRoles.length > 5 && (
                  <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                    <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {!isPlaced && ["intake_submitted", "roles_suggested"].includes(status) && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Role Suggestion</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Role Title *</Label><Input value={newRoleTitle} onChange={e => setNewRoleTitle(e.target.value)} placeholder="e.g. Data Analyst" /></div>
                <div><Label>Description / Rationale</Label><Textarea value={newRoleDescription} onChange={e => setNewRoleDescription(e.target.value)} /></div>
                <div className="flex gap-3">
                  <Button onClick={handleAddRole} disabled={addingRole || !newRoleTitle.trim()}>{addingRole ? "Adding..." : "Add Role"}</Button>
                  <Button
                    variant="hero"
                    className={`font-bold transition-all ${status === "intake_submitted" && roles.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                    onClick={handleSuggestRoles}
                  >
                    Publish Suggested Roles
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
                        <DatePicker id="admin-cred-bach" value={credForm.bachelors_grad_date} onChange={val => setCredForm(p => ({ ...p, bachelors_grad_date: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">First Entry US *</Label>
                        <DatePicker id="admin-cred-entry" value={credForm.first_entry_us} onChange={val => setCredForm(p => ({ ...p, first_entry_us: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Master's Graduation Date *</Label>
                        <DatePicker id="admin-cred-mast" value={credForm.masters_grad_date} onChange={val => setCredForm(p => ({ ...p, masters_grad_date: val }))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">OPT Start Date *</Label>
                        <DatePicker id="admin-cred-opt" value={credForm.opt_start_date} onChange={val => setCredForm(p => ({ ...p, opt_start_date: val }))} />
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
                      {savingCred ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
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
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Bachelor's Graduation Date</p><p className="font-semibold">{formatToMMDDYYYY(cData.bachelors_grad_date || cData.bachelors_graduation_date)}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">Master's Graduation Date</p><p className="font-semibold">{formatToMMDDYYYY(cData.masters_grad_date || cData.masters_graduation_date)}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">First Entry US</p><p className="font-semibold">{formatToMMDDYYYY(cData.first_entry_us || cData.firstEntryUS)}</p></div>
                              <div><p className="text-muted-foreground mb-1 uppercase text-[9px] font-bold italic text-blue-600">OPT Start Date</p><p className="font-semibold">{formatToMMDDYYYY(cData.opt_start_date || cData.optStartDate)}</p></div>
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
                                    <div key={portal.label} className="bg-white border rounded-lg p-3 flex flex-col justify-between min-h-[90px]">
                                      <div>
                                        <p className="font-bold text-[10px] text-muted-foreground mb-1.5">{portal.label}</p>
                                        <p className="text-[11px] truncate mb-1">Email/ID: <span className="font-medium">{username || "N/A"}</span></p>
                                      </div>
                                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-neutral-100 mt-1.5">
                                        <p className="text-[11px] truncate flex-1">
                                          PW: <span className="font-mono bg-muted px-1.5 py-0.5 rounded font-medium">{password ? (showCredPasswords[`${v.id}_${portal.pw}`] ? password : "••••••••") : "N/A"}</span>
                                        </p>
                                        {password && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            className="h-6 w-6 hover:bg-neutral-100 text-muted-foreground/60 hover:text-secondary rounded-md"
                                            onClick={() => toggleCredPw(`${v.id}_${portal.pw}`)}
                                            title={showCredPasswords[`${v.id}_${portal.pw}`] ? "Hide password" : "Show password"}
                                          >
                                            {showCredPasswords[`${v.id}_${portal.pw}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                          </Button>
                                        )}
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
                                      <div key={idx} className="bg-white border border-amber-200/50 rounded-lg p-3 flex flex-col justify-between min-h-[90px]">
                                        <div>
                                          <p className="font-bold text-[10px] text-amber-700 mb-1.5">{cp.platform_name || "Platform"}</p>
                                          <p className="text-[11px] truncate mb-1">Email/ID: <span className="font-medium">{cp.username_email || "N/A"}</span></p>
                                        </div>
                                        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-amber-100 mt-1.5">
                                          <p className="text-[11px] truncate flex-1">
                                            PW: <span className="font-mono bg-muted px-1.5 py-0.5 rounded font-medium">{cp.password ? (showCredPasswords[`${v.id}_cp_${idx}`] ? cp.password : "••••••••") : "N/A"}</span>
                                          </p>
                                          {cp.password && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              type="button"
                                              className="h-6 w-6 hover:bg-amber-50 text-amber-800/60 hover:text-amber-900 rounded-md"
                                              onClick={() => toggleCredPw(`${v.id}_cp_${idx}`)}
                                              title={showCredPasswords[`${v.id}_cp_${idx}`] ? "Hide password" : "Show password"}
                                            >
                                              {showCredPasswords[`${v.id}_cp_${idx}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </Button>
                                          )}
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {subscription && (
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-secondary" />
                      Plan: {subscription.plan_name || "Unknown"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Status: <span className="capitalize font-semibold">{subscription.status?.replace(/_/g, " ")}</span> | Amount: ${Number(subscription.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {subscription.status === 'active' && payments.filter(p => p.status === 'completed').length === 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-[10px] uppercase font-bold"
                        onClick={async () => {
                          if (confirm("No completed payments found. Revert status to Pending Payment?")) {
                            try {
                              await billingApi.updateSubscription(candidateId, { status: 'pending_payment' });
                              toast({ title: "Status reverted to Pending Payment" });
                              fetchAll();
                            } catch (err: any) { toast({ title: "Sync failed", variant: "destructive" }); }
                          }
                        }}
                      >
                        Revert to Pending
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => fetchAll()} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {!isPlaced && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Record Manual Payment</CardTitle>
                <CardDescription>Manually record a payment received outside the gateway (e.g. bank transfer). To request a subscription payment from the candidate, use the Billing tab.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      onKeyDown={(e) => {
                        if (e.key === '-') {
                          e.preventDefault();
                        }
                      }}
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value.replace(/-/g, ""))}
                      placeholder="500.00"
                    />
                  </div>
                  <div><Label>Type</Label>
                    <Select value={payType} onValueChange={setPayType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly_service">Marketing Service Fee</SelectItem>
                        <SelectItem value="mock_practice">Mock Practice Fee</SelectItem>
                        <SelectItem value="interview_support">Interview Support Fee</SelectItem>
                        <SelectItem value="operations_support">Operations Support Fee</SelectItem>
                        <SelectItem value="manual">Manual / Other</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label><Select value={payStatus} onValueChange={setPayStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></div>
                </div>
                <div><Label>Notes</Label><Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Manual check, wire transfer, etc." /></div>
                <Button
                  variant="hero"
                  className={`w-full h-11 font-bold transition-all ${payAmount && Number(payAmount) > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                  onClick={handleRecordPayment}
                  disabled={addingPayment || !payAmount}
                >
                  {addingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <AdminAssignmentsTab candidateId={candidateId} candidateStatus={status} hasCredentials={credentials.length > 0} onRefresh={fetchAll} />
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <CandidateApplicationsPage candidate={candidate} />
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews">
          <CandidateInterviewsPage candidate={candidate} />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <AdminBillingTab candidateId={candidateId} onRefresh={fetchAll} />
        </TabsContent>

        {/* Placement Tab */}
        <TabsContent value="placement">
          <AdminPlacementTab candidateId={candidateId} candidateStatus={status} onRefresh={fetchAll} />
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <AdminAuditTab targetId={candidateId} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirmRoleModal} onOpenChange={(open) => !open && setConfirmRoleModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Proposed Role to Suggestions</DialogTitle>
            <DialogDescription>
              Are you sure you want to add <strong>{confirmRoleModal?.custom_role_title}</strong> to the official suggested roles?
              It will be removed from the candidate's proposed roles list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            {confirmRoleModal?.custom_reason && (
              <p><strong>Reason provided:</strong> {confirmRoleModal.custom_reason}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRoleModal(null)}>Cancel</Button>
            <Button
              onClick={handleConfirmProposedRole}
              disabled={addingProposedRole}
            >
              {addingProposedRole ? "Adding..." : "Add to Suggestions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeRoleModal} onOpenChange={(open) => !open && setRemoveRoleModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Proposed Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to completely remove <strong>{removeRoleModal?.custom_role_title}</strong> from the candidate's proposed roles? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveRoleModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRemoveProposedRole}
              disabled={removingProposedRole}
            >
              {removingProposedRole ? "Removing..." : "Remove Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Suggested Role</DialogTitle>
            <DialogDescription>
              Modify the suggested role's title and description for this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-title">Role Title *</Label>
              <Input
                id="edit-role-title"
                value={editRoleTitle}
                onChange={(e) => setEditRoleTitle(e.target.value)}
                placeholder="e.g. Data Analyst"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-desc">Description / Rationale</Label>
              <Textarea
                id="edit-role-desc"
                value={editRoleDescription}
                onChange={(e) => setEditRoleDescription(e.target.value)}
                placeholder="Explain why this role fits the candidate..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button
              onClick={handleUpdateSuggestedRole}
              disabled={savingEditedRole || !editRoleTitle.trim()}
            >
              {savingEditedRole ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default AdminCandidateDetail;
