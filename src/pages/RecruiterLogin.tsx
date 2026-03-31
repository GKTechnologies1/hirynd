import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/services/api";
import { Clock, XCircle } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";

const SOURCE_OPTIONS = ["LinkedIn", "Google", "University", "Friend", "Social Media", "Other"];
const WORK_TYPE_OPTIONS = ["Full-time", "Part-time", "Contract", "Remote"];

const RecruiterLogin = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reg, setReg] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm_password: "",
    university_name: "", major_degree: "", graduation_date: "",
    how_did_you_hear: "", friend_name: "",
    linkedin_url: "", social_profile: "",
    city: "", state: "", country: "",
    company_name: "", employee_id: "", date_of_joining: "",
    department: "", specialization: "", max_clients: 3,
    prior_recruitment_experience: "",
    work_type_preference: "",
    consent_to_terms: false,
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const updateReg = (field: string, value: any) => {
    setReg(prev => ({ ...prev, [field]: value }));
    setRegErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateRegistration = (): boolean => {
    const errors: Record<string, string> = {};
    if (!reg.first_name.trim()) errors.first_name = "First name is required";
    else if (/\d/.test(reg.first_name)) errors.first_name = "Numbers not allowed";

    if (!reg.last_name.trim()) errors.last_name = "Last name is required";
    else if (/\d/.test(reg.last_name)) errors.last_name = "Numbers not allowed";

    if (!reg.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) errors.email = "Enter a valid email address";

    if (!reg.phone.trim()) errors.phone = "Phone number is required";

    if (!reg.password) errors.password = "Password is required";
    else if (reg.password.length < 8) errors.password = "Min 8 chars required";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(reg.password))
      errors.password = "Must contain uppercase, lowercase, number, and special character";

    if (reg.password !== reg.confirm_password) errors.confirm_password = "Passwords do not match";

    if (!reg.university_name.trim()) errors.university_name = "University is required";
    if (!reg.major_degree.trim()) errors.major_degree = "Major/degree is required";
    if (!reg.graduation_date) errors.graduation_date = "Graduation date is required";

    if (!reg.linkedin_url.trim() && !reg.social_profile?.trim()) 
      errors.linkedin_url = "Must provide at least one professional link (LinkedIn or Social Profile)";

    if (!reg.how_did_you_hear) errors.how_did_you_hear = "This field is required";
    if (reg.how_did_you_hear === "Friend" && !reg.friend_name.trim()) errors.friend_name = "Friend name is required";
    
    if (!reg.consent_to_terms) errors.consent_to_terms = "You must agree to the Terms and Conditions";

    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApprovalStatus(null);
    const { error, approval_status, user: loggedUser } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      setSubmitting(false);
      if (approval_status === "pending") {
        setApprovalStatus("pending_approval");
      } else if (approval_status === "rejected") {
        setApprovalStatus("rejected");
      } else {
        const msg = typeof error === "string" ? error : (error.error || error.detail || "Invalid email or password.");
        toast({ title: "Login failed", description: msg, variant: "destructive" });
      }
    } else if (!["recruiter", "team_lead", "team_manager"].includes(loggedUser?.role || "")) {
      await signOut();
      setSubmitting(false);
      toast({ title: "Access denied", description: "This account is not registered as recruitment staff.", variant: "destructive" });
    } else {
      setSubmitting(false);
      navigate("/recruiter-dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegistration()) return;
    setSubmitting(true);
    
    const dataToSubmit = {
      ...reg,
      first_name: reg.first_name.trim(),
      last_name: reg.last_name.trim(),
      email: reg.email.toLowerCase().trim(),
      role: "recruiter",
      company_name: reg.company_name.trim(),
      employee_id: reg.employee_id.trim(),
      date_of_joining: reg.date_of_joining || null,
      department: reg.department.trim(),
      specialization: reg.specialization.trim(),
      max_clients: reg.max_clients,
      consent_to_terms: reg.consent_to_terms,
    };

    try {
      await authApi.register(dataToSubmit as any);
      await signOut(); // Section 3.3 Step 9
      setRegistrationComplete(true);
    } catch (err: any) {
      let msg = "Something went wrong";
      const error = err.response?.data;
      if (typeof error === "string") {
        msg = error;
      } else if (error) {
        const firstKey = Object.keys(error)[0];
        if (firstKey) {
          const firstErr = error[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    }
    setSubmitting(false);
  };

  // Section 3.4 Pending Approval Screen
  if (registrationComplete || approvalStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="mx-auto w-full max-w-md bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl animate-in text-center">
            <div className="relative mb-8 flex justify-center">
              <div className="relative h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-sm">
                <Clock className="h-10 w-10 text-primary" />
              </div>
            </div>
            
            <h1 className="mb-3 text-2xl font-bold text-neutral-900 tracking-tight">Thank you for registering with Hyrind</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">Your registration has been received and is under review.</p>
            
            <div className="bg-muted/30 rounded-2xl p-6 mb-8 border border-border/40 inline-block w-full text-center">
              <p className="text-sm font-semibold text-foreground mb-2">Expected review time: <span className="text-primary font-bold">24–48 hours</span></p>
              <p className="text-xs text-muted-foreground">You will receive an email once your profile is approved.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button variant="hero" className="h-11 rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30" onClick={() => { setRegistrationComplete(false); setApprovalStatus(null); }}>
                Logout
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Need help? <Link to="/contact" className="underline decoration-muted-foreground/30 hover:text-primary transition-colors">Contact Support</Link>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="mx-auto w-full max-w-md bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl animate-in text-center">
            <div className="relative mb-6 flex justify-center">
              <div className="relative h-16 w-16 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-100 shadow-sm">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-destructive">Application Status</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We appreciate your interest. However, your recruiter application was not approved at this time.
            </p>
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 mb-8 text-sm">
              If you require further details or wish to discuss this decision, please contact our administrative team.
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/contact" className="inline-flex items-center justify-center h-11 rounded-xl bg-destructive text-white font-semibold shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-[0.98]">
                Contact Administration
              </Link>
              <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => setApprovalStatus(null)}>
                Back to Login
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="mx-auto w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-10 shadow-xl shadow-neutral-100/50">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">Recruiter Portal</h1>
            <p className="text-muted-foreground italic">"Empowering recruitment with analytics and precision"</p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-8 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              <TabsTrigger value="login" className="rounded-lg py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0 animate-in" style={{animationDelay: '0.1s'}}>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium ml-1">Work Email</Label>
                  <Input 
                    id="login-email"
                    type="email" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    placeholder="official@hyrind.com"
                    className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                    required 
                  />
                </div>
                <PasswordField 
                  label="Password" 
                  value={loginPassword} 
                  onChange={setLoginPassword} 
                  show={showLoginPassword} 
                  onToggle={() => setShowLoginPassword(!showLoginPassword)} 
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                
                <div className="flex justify-end pr-1">
                  <Link 
                    to="/forgot-password" 
                    className="text-xs font-semibold text-primary hover:underline underline-offset-4 decoration-primary/30"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                <div className="pt-2">
                  <Button variant="hero" className="w-full h-12 rounded-xl text-md font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all" disabled={submitting}>
                    {submitting ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0 animate-in" style={{animationDelay: '0.1s'}}>
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-6 max-h-[52vh] overflow-y-auto pr-2 custom-scrollbar py-1">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Personal Identity</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">First Name *</Label>
                      <Input 
                        value={reg.first_name} 
                        onChange={e => updateReg("first_name", e.target.value)} 
                        maxLength={60} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                      />
                      {regErrors.first_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.first_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Last Name *</Label>
                      <Input 
                        value={reg.last_name} 
                        onChange={e => updateReg("last_name", e.target.value)} 
                        maxLength={60} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                      />
                      {regErrors.last_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.last_name}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Email *</Label>
                    <Input 
                      type="email" 
                      value={reg.email} 
                      onChange={e => updateReg("email", e.target.value)} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                    {regErrors.email && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Phone *</Label>
                    <Input 
                      type="tel" 
                      value={reg.phone} 
                      onChange={e => updateReg("phone", e.target.value)} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                    />
                    {regErrors.phone && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.phone}</p>}
                  </div>
                  
                  <PasswordField 
                    label="Password *" 
                    value={reg.password} 
                    onChange={v => updateReg("password", v)} 
                    error={regErrors.password} 
                    placeholder="Minimum 8 characters"
                  />
                  
                  <PasswordField 
                    label="Confirm Password *" 
                    value={reg.confirm_password} 
                    onChange={v => updateReg("confirm_password", v)} 
                    error={regErrors.confirm_password} 
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Background</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">University *</Label><Input value={reg.university_name} onChange={e => updateReg("university_name", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" />
                    {regErrors.university_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.university_name}</p>}</div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Major / Degree *</Label><Input value={reg.major_degree} onChange={e => updateReg("major_degree", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" />
                    {regErrors.major_degree && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.major_degree}</p>}</div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Graduation Date *</Label><Input type="date" value={reg.graduation_date} onChange={e => updateReg("graduation_date", e.target.value)} className="block w-full h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" />
                    {regErrors.graduation_date && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.graduation_date}</p>}</div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Recruitment Staff Information</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Company Name</Label><Input value={reg.company_name} onChange={e => updateReg("company_name", e.target.value)} placeholder="e.g. Hyrind" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 shadow-sm" /></div>
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Employee ID</Label><Input value={reg.employee_id} onChange={e => updateReg("employee_id", e.target.value)} placeholder="e.g. HY-101" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 shadow-sm" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Department</Label><Input value={reg.department} onChange={e => updateReg("department", e.target.value)} placeholder="e.g. Talent Acquisition" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 shadow-sm" /></div>
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Specialization</Label><Input value={reg.specialization} onChange={e => updateReg("specialization", e.target.value)} placeholder="e.g. IT Recruitment" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 shadow-sm" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Date of Joining</Label><Input type="date" value={reg.date_of_joining} onChange={e => updateReg("date_of_joining", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 shadow-sm" /></div>
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">Max Clients</Label><Input type="number" min={1} max={10} value={reg.max_clients} onChange={e => updateReg("max_clients", parseInt(e.target.value) || 3)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 shadow-sm" /></div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Professional Profile</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">LinkedIn URL *</Label>
                    <Input 
                      type="url" 
                      value={reg.linkedin_url} 
                      onChange={e => updateReg("linkedin_url", e.target.value)} 
                      placeholder="https://linkedin.com/in/..."
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm"
                    />
                    {regErrors.linkedin_url && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.linkedin_url}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Other Social Profile (Optional)</Label>
                    <Input 
                      type="url" 
                      value={reg.social_profile} 
                      onChange={e => updateReg("social_profile", e.target.value)} 
                      placeholder="GitHub, Website, etc."
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Discovery Source *</Label>
                    <Select value={reg.how_did_you_hear} onValueChange={v => updateReg("how_did_you_hear", v)}>
                      <SelectTrigger className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    {regErrors.how_did_you_hear && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.how_did_you_hear}</p>}
                  </div>
                  
                  {reg.how_did_you_hear === "Friend" && (
                    <div className="space-y-2 animate-in slide-in-from-top-1"><Label className="text-sm font-medium ml-1">Friend's Name *</Label><Input value={reg.friend_name} onChange={e => updateReg("friend_name", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" />
                      {regErrors.friend_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.friend_name}</p>}</div>
                  )}
                </div>

                <div className="space-y-4 pt-2 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Location & Preferences</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">City</Label><Input value={reg.city} onChange={e => updateReg("city", e.target.value)} placeholder="e.g. Dallas" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" /></div>
                    <div className="space-y-2"><Label className="text-sm font-medium ml-1">State</Label><Input value={reg.state} onChange={e => updateReg("state", e.target.value)} placeholder="e.g. TX" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" /></div>
                    <div className="col-span-2 space-y-2"><Label className="text-sm font-medium ml-1">Country</Label><Input value={reg.country} onChange={e => updateReg("country", e.target.value)} placeholder="e.g. USA" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm" /></div>
                  </div>
                  
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Prior Recruitment Experience</Label><Textarea value={reg.prior_recruitment_experience} onChange={e => updateReg("prior_recruitment_experience", e.target.value)} maxLength={500} placeholder="Briefly describe your experience" className="rounded-lg bg-white/50 border-white/40 min-h-[100px]" /></div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Work Type Preference</Label>
                    <Select value={reg.work_type_preference} onValueChange={v => updateReg("work_type_preference", v)}>
                      <SelectTrigger className="h-10 rounded-lg bg-neutral-50 border-neutral-200 transition-all shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{WORK_TYPE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  </div>

                  <div className="pt-2 px-1">
                    <div className="flex items-start space-x-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 shadow-sm transition-all hover:bg-white">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          id="consent_to_terms"
                          checked={reg.consent_to_terms}
                          onChange={e => updateReg("consent_to_terms", e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/20 accent-primary"
                        />
                      </div>
                      <Label htmlFor="consent_to_terms" className="text-xs text-muted-foreground leading-normal cursor-pointer select-none">
                        I hereby confirm that all information provided is accurate and agree to the{" "}
                        <a href="https://merchant.razorpay.com/policy/Rn2giKHxuBBdz0/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Terms of Service</a>
                         {" "}and{" "}
                        <a href="https://merchant.razorpay.com/policy/Rn2giKHxuBBdz0/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Privacy Policy</a>. *
                      </Label>
                    </div>
                    {regErrors.consent_to_terms && <p className="text-[10px] text-destructive mt-1 font-medium ml-2">{regErrors.consent_to_terms}</p>}
                  </div>

                </div>{/* end scrollable fields */}

                <div className="pt-3 pb-1 border-t border-neutral-100">
                  <Button variant="hero" className="w-full h-12 rounded-xl text-md font-semibold" disabled={submitting}>
                    {submitting ? "Processing Application..." : "Create Recruiter Account"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RecruiterLogin;
