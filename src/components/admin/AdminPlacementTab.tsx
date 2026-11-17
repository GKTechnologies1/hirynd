import { useState, useEffect } from "react";
import { candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, CheckCircle, Pencil, Plus, Trash2, History, Users, ShieldCheck } from "lucide-react";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { formatDate } from "@/lib/utils";
import { DatePicker } from "@/components/ui/DatePicker";
import { parse, format } from "date-fns";

interface AdminPlacementTabProps {
  candidateId: string;
  candidateStatus: string;
  onRefresh: () => void;
}

interface ContactItem {
  name: string;
  email: string;
  phone: string;
  role: string;
}

const AdminPlacementTab = ({ candidateId, candidateStatus, onRefresh }: AdminPlacementTabProps) => {
  const { toast } = useToast();
  const [placement, setPlacement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    company_name: "",
    role_title: "",
    start_date: "",
    salary: "",
    hr_name: "",
    hr_email: "",
    hr_phone: "",
    everified_employer: "UNKNOWN",
    h1b_sponsorship_willing: "UNKNOWN",
    offer_letter_url: "",
    interviewer_email: "",
    bgv_company_name: "",
    notes: "",
    change_reason: "",
    additional_contacts: [] as ContactItem[],
  });

  const populateForm = (data: any) => {
    setErrors({});
    setForm({
      company_name: data.company_name || "",
      role_title: data.role_title || "",
      start_date: data.start_date || "",
      salary: data.salary || "",
      hr_name: data.hr_name || "",
      hr_email: data.hr_email || "",
      hr_phone: data.hr_phone || "",
      everified_employer: (data.everified_employer || "UNKNOWN").toUpperCase(),
      h1b_sponsorship_willing: (data.h1b_sponsorship_willing || "UNKNOWN").toUpperCase(),
      offer_letter_url: data.offer_letter_url || "",
      interviewer_email: data.interviewer_email || "",
      bgv_company_name: data.bgv_company_name || "",
      notes: data.notes || data.placement_notes || "",
      change_reason: "",
      additional_contacts: Array.isArray(data.additional_contacts) ? data.additional_contacts : [],
    });
  };

  const fetchPlacement = () => {
    setLoading(true);
    candidatesApi.getPlacement(candidateId)
      .then(({ data }) => {
        if (data && Object.keys(data).length > 0) {
          setPlacement(data);
          populateForm(data);
        } else {
          setPlacement(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlacement();
  }, [candidateId]);

  const handleAddContact = () => {
    setForm(prev => ({
      ...prev,
      additional_contacts: [
        ...prev.additional_contacts,
        { name: "", email: "", phone: "", role: "" }
      ]
    }));
  };

  const handleUpdateContact = (index: number, field: keyof ContactItem, value: string) => {
    setForm(prev => {
      const updated = [...prev.additional_contacts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, additional_contacts: updated };
    });
  };

  const handleRemoveContact = (index: number) => {
    setForm(prev => ({
      ...prev,
      additional_contacts: prev.additional_contacts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[\p{L}\s.'-]+$/u;

    if (!form.company_name.trim()) newErrors.company_name = "Company name is required";
    if (!form.role_title.trim()) newErrors.role_title = "Role title is required";
    if (!form.start_date) newErrors.start_date = "Start date is required";
    if (!form.salary.trim()) newErrors.salary = "Salary is required";

    // HR Name validation
    const trimmedHrName = form.hr_name.trim();
    if (!trimmedHrName) {
      newErrors.hr_name = "HR Name is required (*)";
    } else if (trimmedHrName.length < 2) {
      newErrors.hr_name = "HR Name must be at least 2 characters long";
    } else if (!nameRegex.test(trimmedHrName)) {
      newErrors.hr_name = "HR Name contains invalid characters (letters, spaces, dots, hyphens only)";
    }

    // HR Email validation
    const trimmedHrEmail = form.hr_email.trim();
    if (!trimmedHrEmail) {
      newErrors.hr_email = "HR Email is required (*)";
    } else if (!emailRegex.test(trimmedHrEmail)) {
      newErrors.hr_email = "Please enter a valid HR Email address (e.g. hr@company.com)";
    }

    // Interviewer Email validation
    const trimmedInterviewerEmail = form.interviewer_email.trim();
    if (!trimmedInterviewerEmail) {
      newErrors.interviewer_email = "Interviewer Email is required (*)";
    } else if (!emailRegex.test(trimmedInterviewerEmail)) {
      newErrors.interviewer_email = "Please enter a valid Interviewer Email address (e.g. interviewer@company.com)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }

    if (!form.everified_employer || form.everified_employer === "") {
      toast({ title: "Please select E-Verify status (*)", variant: "destructive" });
      return;
    }
    if (!form.h1b_sponsorship_willing || form.h1b_sponsorship_willing === "") {
      toast({ title: "Please select H1B sponsorship status (*)", variant: "destructive" });
      return;
    }

    // Additional contacts email format validation
    for (const [idx, contact] of form.additional_contacts.entries()) {
      if (contact.email && !emailRegex.test(contact.email.trim())) {
        toast({
          title: "Validation Error",
          description: `Additional contact #${idx + 1} (${contact.name || "Contact"}) has an invalid email format`,
          variant: "destructive",
        });
        return;
      }
    }

    setErrors({});
    setSubmitting(true);
    try {
      let startDate = form.start_date;
      if (startDate) {
        const cleanDate = startDate.replace(/\//g, "-");
        if (cleanDate.includes("-")) {
          const parts = cleanDate.split("-");
          if (parts[0].length === 2 && parts[2].length === 4) {
            try {
              const parsed = parse(cleanDate, "MM-dd-yyyy", new Date());
              if (!isNaN(parsed.getTime())) startDate = format(parsed, "yyyy-MM-dd");
            } catch (e) { }
          }
        }
      }

      const { data } = await candidatesApi.closePlacement(candidateId, {
        company_name: form.company_name.trim(),
        role_title: form.role_title.trim(),
        start_date: startDate,
        salary: form.salary.trim(),
        hr_name: trimmedHrName,
        hr_email: trimmedHrEmail,
        hr_phone: form.hr_phone.trim(),
        everified_employer: form.everified_employer,
        h1b_sponsorship_willing: form.h1b_sponsorship_willing,
        additional_contacts: form.additional_contacts.filter(c => c.name.trim() || c.email.trim()),
        offer_letter_url: form.offer_letter_url.trim(),
        interviewer_email: trimmedInterviewerEmail,
        bgv_company_name: form.bgv_company_name.trim(),
        notes: form.notes,
        change_reason: form.change_reason.trim() || undefined,
      });
      toast({ title: placement ? "Placement details updated successfully!" : "Case closed successfully!" });
      setPlacement(data);
      populateForm(data);
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      let errorMsg = err.response?.data?.error || err.message;
      if (err.response?.data && typeof err.response.data === 'object' && !err.response.data.error) {
        errorMsg = Object.entries(err.response.data)
          .map(([key, val]) => `${key.replace('_', ' ').toUpperCase()}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join('\n');
      }
      toast({ title: "Error", description: errorMsg || "Failed to submit form", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleCancel = () => {
    setErrors({});
    if (placement) {
      populateForm(placement);
      setIsEditing(false);
    } else {
      setShowForm(false);
    }
  };

  if (loading) return <p className="text-muted-foreground p-4">Loading...</p>;

  if (placement && !isEditing) {
    const evStatus = (placement.everified_employer || "").toUpperCase();
    const isEverify = evStatus === "YES";
    const isEverifyNo = evStatus === "NO";
    const h1bStatus = (placement.h1b_sponsorship_willing || "").toUpperCase();
    const isH1bYes = h1bStatus === "YES";
    const isH1bNo = h1bStatus === "NO";
    const additionalContacts: ContactItem[] = Array.isArray(placement.additional_contacts) ? placement.additional_contacts : [];
    const auditLogs: any[] = Array.isArray(placement.audit_logs) ? placement.audit_logs : [];

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-secondary" /> Placement Closed</CardTitle>
              <CardDescription>This candidate has been successfully placed.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1 cursor-pointer">
              <Pencil className="h-3.5 w-3.5" /> Edit Details
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Company:</span> <strong>{placement.company_name}</strong></div>
            <div><span className="text-muted-foreground">Role:</span> <strong>{placement.role_title}</strong></div>
            <div><span className="text-muted-foreground mr-1">Start Date:</span> {formatDate(placement.start_date)}</div>
            <div><span className="text-muted-foreground">Salary:</span> {placement.salary}</div>

            <div>
              <span className="text-muted-foreground block text-xs">E-Verified Employer:</span>
              <Badge variant="outline" className={`mt-0.5 text-xs ${isEverify ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : isEverifyNo ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-muted text-muted-foreground'}`}>
                {isEverify ? 'Yes (Enrolled)' : isEverifyNo ? 'No' : 'Unknown / Unverified'}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground block text-xs">Willing to Sponsor H1B:</span>
              <Badge variant="outline" className={`mt-0.5 text-xs ${isH1bYes ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : isH1bNo ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-muted text-muted-foreground'}`}>
                {isH1bYes ? 'Yes (Willing to Sponsor)' : isH1bNo ? 'No (Does Not Sponsor)' : 'Unknown'}
              </Badge>
            </div>

            <div><span className="text-muted-foreground">HR Email:</span> {placement.hr_email}</div>
            {placement.hr_name && <div><span className="text-muted-foreground">HR Name:</span> {placement.hr_name}</div>}
            {placement.hr_phone && <div><span className="text-muted-foreground">HR Phone:</span> {placement.hr_phone}</div>}
            {placement.interviewer_email && <div><span className="text-muted-foreground">Interviewer:</span> {placement.interviewer_email}</div>}
            {placement.bgv_company_name && <div><span className="text-muted-foreground">BGV Company:</span> {placement.bgv_company_name}</div>}
            {placement.offer_letter_url && (
              <div><span className="text-muted-foreground">Offer Letter:</span>{" "}
                <DocumentPreview url={placement.offer_letter_url} label="View" className="text-primary underline" />
              </div>
            )}
            {placement.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notes:</span> {placement.notes}</div>}

            {/* Additional Contacts Display */}
            {additionalContacts.length > 0 && (
              <div className="sm:col-span-2 pt-2 border-t border-border/50">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                  <Users className="h-3.5 w-3.5 text-primary" /> Additional Employer Contacts ({additionalContacts.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {additionalContacts.map((ct, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs space-y-0.5">
                      <p className="font-semibold text-foreground">{ct.name || "Contact"}</p>
                      {ct.role && <p className="text-[11px] text-muted-foreground">{ct.role}</p>}
                      {ct.email && <p className="text-[11px] text-primary">{ct.email}</p>}
                      {ct.phone && <p className="text-[11px] text-muted-foreground">{ct.phone}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sm:col-span-2 text-xs text-muted-foreground pt-1">
              Closed on {new Date(placement.created_at).toLocaleString()}
              {placement.updated_at && placement.updated_at !== placement.created_at && (
                <span> • Last updated on {new Date(placement.updated_at).toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit History Log */}
        {auditLogs.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="py-3 px-5 border-b border-border/40">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                <History className="h-3.5 w-3.5 text-primary" /> Placement Edit History ({auditLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{log.changed_by_name || log.changed_by_email || "Admin"}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.change_reason && (
                      <p className="italic text-muted-foreground text-[11px]">Reason: &ldquo;{log.change_reason}&rdquo;</p>
                    )}
                    {log.changes && typeof log.changes === "object" && (
                      <div className="space-y-1 pt-1">
                        {Object.entries(log.changes).map(([field, delta]: [string, any]) => (
                          <div key={field} className="text-[11px] flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-foreground capitalize">{field.replace(/_/g, " ")}:</span>
                            <span className="text-rose-600 line-through">{String(delta.before ?? 'empty')}</span>
                            <span className="text-muted-foreground">&rarr;</span>
                            <span className="text-emerald-600 font-semibold">{String(delta.after ?? 'empty')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (!placement && !showForm) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">No placement closure yet.</p>
          <Button variant="hero" onClick={() => setShowForm(true)} className="cursor-pointer">
            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Placed / Close Case
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> {placement ? "Edit Placement Details" : "Case Closure Form"}</CardTitle>
        <CardDescription>{placement ? "Modify the placement details for this candidate. Changes will be audited and synced to central employer intelligence." : "Fill in placement details to close this candidate's case."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className={errors.company_name ? "text-destructive font-medium" : ""}>Company Name *</Label>
            <Input
              value={form.company_name}
              onChange={e => {
                setForm(p => ({ ...p, company_name: e.target.value }));
                if (errors.company_name) setErrors(p => ({ ...p, company_name: "" }));
              }}
              className={errors.company_name ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.company_name && <p className="text-xs text-destructive mt-1">{errors.company_name}</p>}
          </div>

          <div>
            <Label className={errors.role_title ? "text-destructive font-medium" : ""}>Role Title *</Label>
            <Input
              value={form.role_title}
              onChange={e => {
                setForm(p => ({ ...p, role_title: e.target.value }));
                if (errors.role_title) setErrors(p => ({ ...p, role_title: "" }));
              }}
              className={errors.role_title ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.role_title && <p className="text-xs text-destructive mt-1">{errors.role_title}</p>}
          </div>

          <div>
            <Label className={errors.start_date ? "text-destructive font-medium" : ""}>Start Date *</Label>
            <DatePicker
              value={form.start_date}
              onChange={val => {
                setForm(p => ({ ...p, start_date: val }));
                if (errors.start_date) setErrors(p => ({ ...p, start_date: "" }));
              }}
            />
            {errors.start_date && <p className="text-xs text-destructive mt-1">{errors.start_date}</p>}
          </div>

          <div>
            <Label className={errors.salary ? "text-destructive font-medium" : ""}>Salary *</Label>
            <Input
              value={form.salary}
              onChange={e => {
                setForm(p => ({ ...p, salary: e.target.value }));
                if (errors.salary) setErrors(p => ({ ...p, salary: "" }));
              }}
              placeholder="e.g. $85,000/year"
              className={errors.salary ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.salary && <p className="text-xs text-destructive mt-1">{errors.salary}</p>}
          </div>

          {/* E-Verified Employer Selector */}
          <div>
            <Label>E-Verified Employer? *</Label>
            <Select value={form.everified_employer} onValueChange={v => setForm(p => ({ ...p, everified_employer: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select E-Verify status *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YES">Yes (E-Verified)</SelectItem>
                <SelectItem value="NO">No (Not E-Verified)</SelectItem>
                <SelectItem value="UNKNOWN">Unknown / Not Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Willing to Sponsor H1B Selector */}
          <div>
            <Label>Willing to Sponsor H1B? *</Label>
            <Select value={form.h1b_sponsorship_willing} onValueChange={v => setForm(p => ({ ...p, h1b_sponsorship_willing: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select H1B Sponsorship *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YES">Yes (Willing to Sponsor H1B)</SelectItem>
                <SelectItem value="NO">No (Does Not Sponsor)</SelectItem>
                <SelectItem value="UNKNOWN">Unknown / Not Confirmed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={errors.hr_email ? "text-destructive font-medium" : ""}>HR Email *</Label>
            <Input
              type="email"
              value={form.hr_email}
              onChange={e => {
                setForm(p => ({ ...p, hr_email: e.target.value }));
                if (errors.hr_email) setErrors(p => ({ ...p, hr_email: "" }));
              }}
              placeholder="e.g. hr@company.com"
              className={errors.hr_email ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.hr_email && <p className="text-xs text-destructive mt-1">{errors.hr_email}</p>}
          </div>

          <div>
            <Label className={errors.hr_name ? "text-destructive font-medium" : ""}>HR Name *</Label>
            <Input
              value={form.hr_name}
              onChange={e => {
                setForm(p => ({ ...p, hr_name: e.target.value }));
                if (errors.hr_name) setErrors(p => ({ ...p, hr_name: "" }));
              }}
              placeholder="e.g. Jane Smith"
              className={errors.hr_name ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.hr_name && <p className="text-xs text-destructive mt-1">{errors.hr_name}</p>}
          </div>

          <div>
            <Label>HR Phone (Optional)</Label>
            <Input
              type="tel"
              value={form.hr_phone}
              onChange={e => setForm(p => ({ ...p, hr_phone: e.target.value }))}
              placeholder="e.g. +1 (555) 123-4567"
            />
          </div>

          <div>
            <Label className={errors.interviewer_email ? "text-destructive font-medium" : ""}>Interviewer Email *</Label>
            <Input
              type="email"
              value={form.interviewer_email}
              onChange={e => {
                setForm(p => ({ ...p, interviewer_email: e.target.value }));
                if (errors.interviewer_email) setErrors(p => ({ ...p, interviewer_email: "" }));
              }}
              placeholder="e.g. interviewer@company.com"
              className={errors.interviewer_email ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.interviewer_email && <p className="text-xs text-destructive mt-1">{errors.interviewer_email}</p>}
          </div>

          <div>
            <Label>Offer Letter URL</Label>
            <Input
              value={form.offer_letter_url}
              onChange={e => setForm(p => ({ ...p, offer_letter_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>BGV Company</Label>
            <Input
              value={form.bgv_company_name}
              onChange={e => setForm(p => ({ ...p, bgv_company_name: e.target.value }))}
            />
          </div>
        </div>

        {/* Dynamic Multiple Employer Contacts Sub-form */}
        <div className="pt-2 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Additional Employer Contacts
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Add other recruiter, coordinator or hiring manager contacts for this employer to sync to central directory.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddContact}
              className="h-8 text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Contact
            </Button>
          </div>

          {form.additional_contacts.length > 0 && (
            <div className="space-y-2">
              {form.additional_contacts.map((contact, idx) => (
                <div key={idx} className="p-3 bg-muted/30 border border-border/50 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Name</Label>
                    <Input
                      value={contact.name}
                      onChange={e => handleUpdateContact(idx, "name", e.target.value)}
                      placeholder="Contact Name"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={e => handleUpdateContact(idx, "email", e.target.value)}
                      placeholder="email@company.com"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Phone / Role</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        value={contact.phone}
                        onChange={e => handleUpdateContact(idx, "phone", e.target.value)}
                        placeholder="Phone"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={contact.role}
                        onChange={e => handleUpdateContact(idx, "role", e.target.value)}
                        placeholder="Role / Title"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContact(idx)}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Change Reason for Editing */}
        {placement && (
          <div className="pt-2 border-t border-border/50">
            <Label className="text-xs font-semibold text-foreground">
              Reason for Changes (Audit Record)
            </Label>
            <Input
              value={form.change_reason}
              onChange={e => setForm(p => ({ ...p, change_reason: e.target.value }))}
              placeholder="e.g. Corrected offer salary, updated HR contact number..."
              className="mt-1 text-xs"
            />
          </div>
        )}

        <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>

        <div className="flex gap-3 pt-2">
          <Button variant="hero" onClick={handleSubmit} disabled={submitting} className="cursor-pointer">
            {submitting ? "Saving..." : (placement ? "Save Changes" : "Close Case & Mark Placed")}
          </Button>
          <Button variant="outline" onClick={handleCancel} className="cursor-pointer">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlacementTab;
