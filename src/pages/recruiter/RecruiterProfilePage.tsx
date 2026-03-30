import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { recruitersApi, authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Linkedin, Landmark, ShieldCheck, Wallet, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

const RecruiterProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    linkedin_url: ""
  });
  const [bankDetails, setBankDetails] = useState<any>({
    bank_name: "",
    account_number: "",
    routing_number: ""
  });
  const [maskBank, setMaskBank] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: prof }, { data: bank }] = await Promise.all([
          recruitersApi.getProfile(),
          recruitersApi.getBankDetails().catch(() => ({ data: null }))
        ]);
        
        const fullName = user?.profile?.full_name || prof?.full_name || "";
        const nameParts = fullName.split(" ");
        const fName = nameParts[0] || "";
        const lName = nameParts.slice(1).join(" ") || "";

        setProfile({
          first_name: user?.first_name || prof?.first_name || fName,
          last_name: user?.last_name || prof?.last_name || lName,
          email: user?.email || prof?.email || "",
          phone: user?.profile?.phone || prof?.phone || "",
          city: prof?.city || "",
          state: prof?.state || "",
          country: prof?.country || "",
          linkedin_url: prof?.linkedin_url || ""
        });

        if (bank) {
          setBankDetails({
            bank_name: bank.bank_name || "",
            account_number: bank.account_number_last4 ? `****${bank.account_number_last4}` : "",
            routing_number: bank.routing_number_last4 ? `****${bank.routing_number_last4}` : ""
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await recruitersApi.updateProfile(profile);
      // Update basic auth fields as well if changed
      await authApi.updateProfile({ 
          first_name: profile.first_name, 
          last_name: profile.last_name,
          phone: profile.phone
      });
      await refreshUser();
      toast({ title: "Profile updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setSavingBank(true);
    try {
      await recruitersApi.updateBankDetails(bankDetails);
      toast({ title: "Bank details saved", description: "Audit record created and admin notified." });
      // Update masked view
      if (bankDetails.account_number.length > 4) {
          setBankDetails(prev => ({
              ...prev,
              account_number: `****${bankDetails.account_number.slice(-4)}`,
              routing_number: `****${bankDetails.routing_number.slice(-4)}`
          }));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to update bank details", variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mr-2" /> Loading your profile...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile & Payroll</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage your personal information and banking details for payroll.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Info */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Recruiter Information
            </CardTitle>
            <CardDescription>Your public and internal profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">First Name</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input className="pl-9 bg-background/50 h-10 text-sm" value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Last Name</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input className="pl-9 bg-background/50 h-10 text-sm" value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Email Address</Label>
              <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input readOnly className="pl-9 bg-muted/30 border-dashed cursor-not-allowed h-10 text-sm opacity-80" value={profile.email} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Phone Number</Label>
              <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input className="pl-9 bg-background/50 h-10 text-sm" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">City</Label>
                <Input className="bg-background/50 h-10 text-xs" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">State</Label>
                <Input className="bg-background/50 h-10 text-xs" value={profile.state} onChange={e => setProfile({...profile, state: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Country</Label>
                <Input className="bg-background/50 h-10 text-xs" value={profile.country} onChange={e => setProfile({...profile, country: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">LinkedIn URL</Label>
              <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input placeholder="https://linkedin.com/in/..." className="pl-9 bg-background/50 h-10 text-sm" value={profile.linkedin_url} onChange={e => setProfile({...profile, linkedin_url: e.target.value})} />
              </div>
            </div>

            <Button className="w-full h-11 bg-primary text-white font-semibold rounded-xl mt-4 gap-2" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Update Profile Information
            </Button>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-secondary/20">
            <div className="h-1 bg-secondary shadow-[0_0_15px_rgba(var(--secondary),0.5)]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-secondary">
                <Landmark className="h-5 w-5" /> Bank Details
              </CardTitle>
              <CardDescription>Sensitive information. Securely handled and audited.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 text-xs text-amber-700 dark:text-amber-400 mb-2">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <p>Bank details are masked after save. Updates trigger notifications to administrators and are recorded in the system audit log.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Bank Name</Label>
                <Input className="bg-background/50 h-10 text-sm" value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})} placeholder="e.g. Chase Bank, Wells Fargo" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Account Number</Label>
                <div className="relative">
                  <Input 
                    type={maskBank ? "text" : "text"} 
                    className="bg-background/50 h-10 text-sm tracking-wider pr-10" 
                    value={bankDetails.account_number} 
                    onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} 
                    placeholder="Enter full account number"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground h-8 w-8 hover:bg-transparent" onClick={() => setMaskBank(!maskBank)}>
                    {maskBank ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Routing Number</Label>
                <Input className="bg-background/50 h-10 text-sm tracking-wider" value={bankDetails.routing_number} onChange={e => setBankDetails({...bankDetails, routing_number: e.target.value})} placeholder="9-digit routing number" />
              </div>

              <Button variant="secondary" className="w-full h-11 text-white font-semibold rounded-xl mt-4 gap-2" onClick={handleSaveBankDetails} disabled={savingBank}>
                {savingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                Securely Save Bank Details
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold">Payroll Schedule</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Payments are processed bi-weekly. Ensure bank details are correct to avoid delays.</p>
                    </div>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default RecruiterProfilePage;
