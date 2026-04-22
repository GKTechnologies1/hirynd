import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { recruitersApi, authApi, filesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Linkedin, Landmark, ShieldCheck, Wallet, Eye, EyeOff, Loader2, Save, FileUp, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

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
  const [countryCode, setCountryCode] = useState("+1");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isBankEditing, setIsBankEditing] = useState(false);
  
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

        const rawPhone = user?.profile?.phone || prof?.phone || "";
        if (rawPhone.startsWith("+")) {
            const parts = rawPhone.split(" ");
            if (parts.length > 1) {
                setCountryCode(parts[0]);
                setProfile(prev => ({ ...prev, phone: parts.slice(1).join("") }));
            } else {
                setCountryCode(rawPhone.slice(0, 3));
                setProfile(prev => ({ ...prev, phone: rawPhone.slice(3) }));
            }
        }

        if (bank) {
          setBankDetails({
            bank_name: bank.bank_name || "",
            account_number: bank.account_number_last4 ? `****${bank.account_number_last4}` : "",
            routing_number: bank.routing_number_last4 ? `****${bank.routing_number_last4}` : ""
          });
        }

        // Load document information
        setDocuments({
          highest_degree_certificate_file: prof?.highest_degree_certificate_file,
          government_id_card_file: prof?.government_id_card_file,
          pan_card_file: prof?.pan_card_file,
          bank_passbook_file: prof?.bank_passbook_file
        });
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const submissionProfile = {
        ...profile,
        phone: `${countryCode} ${profile.phone}`
    };

    try {
      await recruitersApi.updateProfile(submissionProfile);
      // Update basic auth fields as well if changed
      await authApi.updateProfile({ 
          first_name: submissionProfile.first_name, 
          last_name: submissionProfile.last_name,
          phone: submissionProfile.phone
      });
      await refreshUser();
      toast({ title: "Profile updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
      setIsProfileEditing(false);
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
      setIsBankEditing(false);
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
      await recruitersApi.updateProfile({ [fieldName]: data.id });
      
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" /> Recruiter Information
              </CardTitle>
              <CardDescription>Your public and internal profile details</CardDescription>
            </div>
            {!isProfileEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsProfileEditing(true)}>Edit</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">First Name</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input disabled={!isProfileEditing} className="pl-9 bg-background/50 h-10 text-sm" value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Last Name</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input disabled={!isProfileEditing} className="pl-9 bg-background/50 h-10 text-sm" value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} />
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
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60 ml-1">Phone Number</Label>
              <div className="flex gap-2">
                <Select disabled={!isProfileEditing} value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="h-10 w-[90px] rounded-xl bg-background/50 border-neutral-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input 
                      disabled={!isProfileEditing}
                      className="pl-9 bg-background/50 h-10 text-sm rounded-xl" 
                      value={profile.phone} 
                      onChange={e => setProfile({...profile, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
                      placeholder="1234567890"
                    />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">City</Label>
                <Input disabled={!isProfileEditing} className="bg-background/50 h-10 text-xs" value={profile.city} onChange={e => setProfile({...profile, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">State</Label>
                <Input disabled={!isProfileEditing} className="bg-background/50 h-10 text-xs" value={profile.state} onChange={e => setProfile({...profile, state: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Country</Label>
                <Input disabled={!isProfileEditing} className="bg-background/50 h-10 text-xs" value={profile.country} onChange={e => setProfile({...profile, country: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest opacity-60">LinkedIn URL</Label>
              <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input disabled={!isProfileEditing} placeholder="https://linkedin.com/in/..." className="pl-9 bg-background/50 h-10 text-sm" value={profile.linkedin_url} onChange={e => setProfile({...profile, linkedin_url: e.target.value})} />
              </div>
            </div>

            {isProfileEditing && (
              <Button className="w-full h-11 bg-primary text-white font-semibold rounded-xl mt-4 gap-2" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Update Profile Information
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Bank Details */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-secondary/20">
            <div className="h-1 bg-secondary shadow-[0_0_15px_rgba(var(--secondary),0.5)]" />
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg text-secondary">
                  <Landmark className="h-5 w-5" /> Bank Details
                </CardTitle>
                <CardDescription>Sensitive information. Securely handled and audited.</CardDescription>
              </div>
              {!isBankEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsBankEditing(true)}>Edit</Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 text-xs text-amber-700 dark:text-amber-400 mb-2">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <p>Bank details are masked after save. Updates trigger notifications to administrators and are recorded in the system audit log.</p>
              </div>

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
                    placeholder="Enter full account number"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground h-8 w-8 hover:bg-transparent" onClick={() => setMaskBank(!maskBank)}>
                    {maskBank ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Routing Number</Label>
                <Input disabled={!isBankEditing} className="bg-background/50 h-10 text-sm tracking-wider" value={bankDetails.routing_number} onChange={e => setBankDetails({...bankDetails, routing_number: e.target.value})} placeholder="9-digit routing number" />
              </div>

              {isBankEditing && (
                <Button variant="secondary" className="w-full h-11 text-white font-semibold rounded-xl mt-4 gap-2" onClick={handleSaveBankDetails} disabled={savingBank}>
                  {savingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                  Securely Save Bank Details
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Uploads Section */}
      <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileUp className="h-5 w-5 text-primary" /> Document Verification
          </CardTitle>
          <CardDescription>Upload required documents for verification (all fields are mandatory)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 text-xs text-blue-700 dark:text-blue-400">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p>Please upload clear images or documents of your certificates, IDs, and passbook. These will be verified by our team.</p>
          </div>

          <div className="grid gap-6">
            {/* Highest Degree Certificate */}
            <div className="space-y-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Highest Degree Certificate *</Label>
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
                accept=".pdf"
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
                          <FileUp className="h-4 w-4 mr-2" /> Update File
                        </>
                      )}
                    </Button>
                    <DocumentPreview url={documents.highest_degree_certificate_file} label="View" variant="button" />
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
                <Label className="text-sm font-semibold">Government ID Card (Aadhaar) *</Label>
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
                          <FileUp className="h-4 w-4 mr-2" /> Update File
                        </>
                      )}
                    </Button>
                    <DocumentPreview url={documents.government_id_card_file} label="View" variant="button" />
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
                <Label className="text-sm font-semibold">PAN Card *</Label>
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
                          <FileUp className="h-4 w-4 mr-2" /> Update File
                        </>
                      )}
                    </Button>
                    <DocumentPreview url={documents.pan_card_file} label="View" variant="button" />
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
                <Label className="text-sm font-semibold">Bank Passbook First Page *</Label>
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
                          <FileUp className="h-4 w-4 mr-2" /> Update File
                        </>
                      )}
                    </Button>
                    <DocumentPreview url={documents.bank_passbook_file} label="View" variant="button" />
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
    </motion.div>
  );
};

export default RecruiterProfilePage;
