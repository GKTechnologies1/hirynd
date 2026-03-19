import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Clock, XCircle, Eye, EyeOff } from "lucide-react";

const SOURCE_OPTIONS = ["LinkedIn", "Google", "University", "Friend", "Social Media", "Other"];
const VISA_OPTIONS = ["H1B", "OPT", "CPT", "Green Card", "US Citizen", "EAD", "TN", "Other"];

const CandidateLogin = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Registration fields per spec Section 3.1
  const [reg, setReg] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm_password: "",
    university_name: "", major_degree: "", graduation_date: "",
    how_did_you_hear: "", friend_name: "",
    linkedin_url: "", portfolio_url: "", visa_status: "", current_location: "",
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const updateReg = (field: string, value: string) => {
    setReg(prev => ({ ...prev, [field]: value }));
    setRegErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateRegistration = (): boolean => {
    const errors: Record<string, string> = {};
    if (!reg.first_name) errors.first_name = "First name is required";
    if (!reg.last_name) errors.last_name = "Last name is required";
    if (!reg.email) errors.email = "Email is required";
    if (!reg.phone) errors.phone = "Phone number is required";
    if (!reg.password || reg.password.length < 8) errors.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(reg.password))
      errors.password = "Must contain uppercase, lowercase, number, and special character";
    if (reg.password !== reg.confirm_password) errors.confirm_password = "Passwords do not match";
    if (!reg.university_name) errors.university_name = "University is required";
    if (!reg.major_degree) errors.major_degree = "Major/degree is required";
    if (!reg.graduation_date) errors.graduation_date = "Graduation date is required";
    if (!reg.how_did_you_hear) errors.how_did_you_hear = "This field is required";
    if (reg.how_did_you_hear === "Friend" && !reg.friend_name) errors.friend_name = "Friend name is required when source is Friend";
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApprovalStatus(null);
    const { error, approval_status } = await signIn(loginEmail, loginPassword);
    setSubmitting(false);
    if (error) {
      if (approval_status === "pending") {
        setApprovalStatus("pending_approval");
      } else if (approval_status === "rejected") {
        setApprovalStatus("rejected");
      } else {
        toast({ title: "Login failed", description: typeof error === "string" ? error : "Invalid credentials", variant: "destructive" });
      }
    } else {
      navigate("/candidate-dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegistration()) return;
    setSubmitting(true);
    const { error } = await signUp(reg);
    setSubmitting(false);
    if (error) {
      toast({ title: "Registration failed", description: typeof error === "string" ? error : JSON.stringify(error), variant: "destructive" });
    } else {
      setRegistrationComplete(true);
    }
  };

  const { signUp: signUpRaw } = useAuth();
  const signUp = async (data: typeof reg) => {
    try {
      const { authApi } = await import("@/services/api");
      await authApi.register({
        email: data.email, password: data.password,
        first_name: data.first_name, last_name: data.last_name,
        phone: data.phone, role: "candidate",
        university_name: data.university_name, major_degree: data.major_degree,
        graduation_date: data.graduation_date, how_did_you_hear: data.how_did_you_hear,
        friend_name: data.friend_name, linkedin_url: data.linkedin_url,
        portfolio_url: data.portfolio_url, visa_status: data.visa_status,
        current_location: data.current_location,
      });
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data || err.message };
    }
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center py-20">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 card-elevated text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-secondary" />
            <h1 className="mb-2 text-2xl font-bold text-card-foreground">Thank you for registering with Hyrind</h1>
            <p className="text-muted-foreground">Your registration has been received and is under review.</p>
            <p className="mt-2 text-sm text-muted-foreground">Expected review time: <strong>24–48 hours</strong></p>
            <p className="mt-2 text-sm text-muted-foreground">You will receive an email once your profile is approved.</p>
            <Button variant="outline" className="mt-6" onClick={() => { setRegistrationComplete(false); setApprovalStatus(null); }}>
              Back to Login
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (approvalStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center py-20">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 card-elevated text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-secondary" />
            <h1 className="mb-2 text-2xl font-bold text-card-foreground">Thank you for registering with Hyrind</h1>
            <p className="text-muted-foreground">Your registration has been received and is under review.</p>
            <p className="mt-2 text-sm text-muted-foreground">Expected review time: 24–48 hours</p>
            <p className="mt-2 text-sm text-muted-foreground">You will receive an email once your profile is approved.</p>
            <Button variant="outline" className="mt-6" onClick={() => setApprovalStatus(null)}>Logout</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center py-20">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 card-elevated text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="mb-2 text-2xl font-bold text-card-foreground">Account Not Approved</h1>
            <p className="text-muted-foreground">
              Your HYRIND account application was not approved at this time. If you believe this was made in error, please <Link to="/contact" className="font-medium text-secondary hover:underline">contact us</Link>.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setApprovalStatus(null)}>Back to Login</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const PasswordField = ({ label, value, onChange, show, onToggle, error }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; error?: string;
  }) => (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} required />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={onToggle}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center py-12">
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-8 card-elevated">
          <h1 className="mb-2 text-2xl font-bold text-card-foreground">Candidate Portal</h1>
          <p className="mb-6 text-sm text-muted-foreground">Access your candidate dashboard</p>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div><Label>Email</Label><Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required /></div>
                <PasswordField label="Password" value={loginPassword} onChange={setLoginPassword} show={showLoginPassword} onToggle={() => setShowLoginPassword(!showLoginPassword)} />
                <Button variant="hero" className="w-full" disabled={submitting}>{submitting ? "Signing in..." : "Sign In"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name *</Label><Input value={reg.first_name} onChange={e => updateReg("first_name", e.target.value)} maxLength={60} />
                    {regErrors.first_name && <p className="text-xs text-destructive mt-1">{regErrors.first_name}</p>}</div>
                  <div><Label>Last Name *</Label><Input value={reg.last_name} onChange={e => updateReg("last_name", e.target.value)} maxLength={60} />
                    {regErrors.last_name && <p className="text-xs text-destructive mt-1">{regErrors.last_name}</p>}</div>
                </div>
                <div><Label>Email *</Label><Input type="email" value={reg.email} onChange={e => updateReg("email", e.target.value)} />
                  {regErrors.email && <p className="text-xs text-destructive mt-1">{regErrors.email}</p>}</div>
                <div><Label>Phone Number *</Label><Input type="tel" value={reg.phone} onChange={e => updateReg("phone", e.target.value)} />
                  {regErrors.phone && <p className="text-xs text-destructive mt-1">{regErrors.phone}</p>}</div>
                <PasswordField label="Password *" value={reg.password} onChange={v => updateReg("password", v)} show={showRegPassword} onToggle={() => setShowRegPassword(!showRegPassword)} error={regErrors.password} />
                <PasswordField label="Confirm Password *" value={reg.confirm_password} onChange={v => updateReg("confirm_password", v)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} error={regErrors.confirm_password} />

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Education</p>
                <div><Label>University *</Label><Input value={reg.university_name} onChange={e => updateReg("university_name", e.target.value)} maxLength={120} />
                  {regErrors.university_name && <p className="text-xs text-destructive mt-1">{regErrors.university_name}</p>}</div>
                <div><Label>Major / Degree *</Label><Input value={reg.major_degree} onChange={e => updateReg("major_degree", e.target.value)} maxLength={120} />
                  {regErrors.major_degree && <p className="text-xs text-destructive mt-1">{regErrors.major_degree}</p>}</div>
                <div><Label>Graduation Date *</Label><Input type="date" value={reg.graduation_date} onChange={e => updateReg("graduation_date", e.target.value)} />
                  {regErrors.graduation_date && <p className="text-xs text-destructive mt-1">{regErrors.graduation_date}</p>}</div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">How did you hear about us?</p>
                <div>
                  <Select value={reg.how_did_you_hear} onValueChange={v => updateReg("how_did_you_hear", v)}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>{SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  {regErrors.how_did_you_hear && <p className="text-xs text-destructive mt-1">{regErrors.how_did_you_hear}</p>}
                </div>
                {reg.how_did_you_hear === "Friend" && (
                  <div><Label>Friend's Name *</Label><Input value={reg.friend_name} onChange={e => updateReg("friend_name", e.target.value)} maxLength={120} />
                    {regErrors.friend_name && <p className="text-xs text-destructive mt-1">{regErrors.friend_name}</p>}</div>
                )}

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Optional</p>
                <div><Label>LinkedIn URL</Label><Input type="url" value={reg.linkedin_url} onChange={e => updateReg("linkedin_url", e.target.value)} /></div>
                <div><Label>Portfolio URL</Label><Input type="url" value={reg.portfolio_url} onChange={e => updateReg("portfolio_url", e.target.value)} /></div>
                <div>
                  <Label>Visa Status</Label>
                  <Select value={reg.visa_status} onValueChange={v => updateReg("visa_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select visa type" /></SelectTrigger>
                    <SelectContent>{VISA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Current Location</Label><Input value={reg.current_location} onChange={e => updateReg("current_location", e.target.value)} placeholder="City, State, Country" /></div>

                <Button variant="hero" className="w-full" disabled={submitting}>{submitting ? "Registering..." : "Create Account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Need help? <Link to="/contact" className="font-medium text-secondary hover:underline">Contact Us</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CandidateLogin;
