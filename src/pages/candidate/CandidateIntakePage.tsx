import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, filesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User, Mail, Phone, MapPin, Calendar, Briefcase,
  Award, FileText, Upload, CheckCircle, RotateCcw, AlertCircle,
  Globe, Link as LinkIcon, Building2, Trash2, CloudUpload, Clock, Sparkles, Lock, FileCheck
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";
import DocumentPreview from "@/components/dashboard/DocumentPreview";

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
  visaStatusOther: "",
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
  hasMoreCerts1: "",
  cert2Name: "",
  cert2Org: "",
  cert2Date: "",
  hasMoreCerts2: "",
  cert3Name: "",
  cert3Org: "",
  cert3Date: "",
  hasMoreWork3: "",
  hasMoreCerts3: "",
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

interface CandidateIntakePageProps {
  candidate?: any;
  onStatusChange?: () => void;
}

const CandidateIntakePage = ({ candidate, onStatusChange }: CandidateIntakePageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(INITIAL_STATE);
  const [countryCode, setCountryCode] = useState("+1");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sendCopy, setSendCopy] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  
  const [certifications, setCertifications] = useState<any[]>([
    { id: Math.random().toString(), name: "", organization: "", credentialId: "", issuedDate: "", expiresDate: "", notes: "", file: null }
  ]);

  const addCertification = () => {
    setCertifications(prev => [
      ...prev,
      { id: Math.random().toString(), name: "", organization: "", credentialId: "", issuedDate: "", expiresDate: "", notes: "", file: null }
    ]);
  };

  const removeCertification = (id: string) => {
    setCertifications(prev => {
      const filtered = prev.filter(c => c.id !== id);
      return filtered.length > 0 ? filtered : [{ id: Math.random().toString(), name: "", organization: "", credentialId: "", issuedDate: "", expiresDate: "", notes: "", file: null }];
    });
  };

  const updateCertification = (id: string, field: string, value: any) => {
    setCertifications(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
    setErrors(prev => {
      const next = { ...prev };
      delete next[`cert_${id}_${field}`];
      return next;
    });
  };

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
            setIsSubmitted(false);
            if (intake.data) {
              // Parse phone number
              let rawPhone = intake.data.phone_number || "";
              let loadedCountryCode = "+1";
              let loadedPhoneNumber = rawPhone;
              const codes = ["+91", "+44", "+1"];
              for (const code of codes) {
                if (rawPhone.startsWith(code)) {
                  loadedCountryCode = code;
                  loadedPhoneNumber = rawPhone.slice(code.length).trim();
                  break;
                }
              }
              setCountryCode(loadedCountryCode);

              setFormData(prev => ({
                ...prev,
                firstName: intake.data.first_name || "",
                lastName: intake.data.last_name || "",
                dob: intake.data.dob || "",
                phoneNumber: loadedPhoneNumber,
                email: intake.data.email || prev.email,
                marketingEmail: intake.data.marketing_email || "",
                marketingPhone: intake.data.marketing_phone || "",
                currentAddress: intake.data.current_address || "",
                mailingAddress: intake.data.mailing_address || "",
                visaStatus: ["F1-OPT", "H1B", "H4 EAD", "Green Card", "US Citizen"].includes(intake.data.visa_status) 
                  ? intake.data.visa_status 
                  : (intake.data.visa_status ? "Other" : ""),
                visaStatusOther: ["F1-OPT", "H1B", "H4 EAD", "Green Card", "US Citizen"].includes(intake.data.visa_status)
                  ? ""
                  : (intake.data.visa_status || ""),
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
                hasWorkExp: intake.data.has_work_exp || "",
                hasCerts: intake.data.has_certs || "",
                // Document URLs
                docUpload: intake.data.doc_url || null,
                passportUpload: intake.data.passport_url || null,
                govIdUpload: intake.data.gov_id_url || null,
                visaUpload: intake.data.visa_url || null,
                workAuthUpload: intake.data.work_auth_url || null,
                resumeUpload: intake.data.resume_url || null,
                // Nested work experiences mapping
                job1_title: intake.data.experiences?.[0]?.job_title || "",
                job1_company: intake.data.experiences?.[0]?.company_name || "",
                job1_address: intake.data.experiences?.[0]?.company_address || "",
                job1_start: intake.data.experiences?.[0]?.start_date || "",
                job1_end: intake.data.experiences?.[0]?.end_date || "",
                job1_type: intake.data.experiences?.[0]?.job_type || "",
                job1_resp: intake.data.experiences?.[0]?.responsibilities || "",
                hasMoreWork1: intake.data.experiences?.length > 1 ? "yes" : "no",

                job2_title: intake.data.experiences?.[1]?.job_title || "",
                job2_company: intake.data.experiences?.[1]?.company_name || "",
                job2_address: intake.data.experiences?.[1]?.company_address || "",
                job2_start: intake.data.experiences?.[1]?.start_date || "",
                job2_end: intake.data.experiences?.[1]?.end_date || "",
                job2_type: intake.data.experiences?.[1]?.job_type || "",
                job2_resp: intake.data.experiences?.[1]?.responsibilities || "",
                hasMoreWork2: intake.data.experiences?.length > 2 ? "yes" : "no",

                job3_title: intake.data.experiences?.[2]?.job_title || "",
                job3_company: intake.data.experiences?.[2]?.company_name || "",
                job3_address: intake.data.experiences?.[2]?.company_address || "",
                job3_start: intake.data.experiences?.[2]?.start_date || "",
                job3_end: intake.data.experiences?.[2]?.end_date || "",
                job3_type: intake.data.experiences?.[2]?.job_type || "",
                job3_resp: intake.data.experiences?.[2]?.responsibilities || "",
                hasMoreWork3: intake.data.experiences?.length === 3 ? "no" : "",

                // Certification details mapping
                certName: intake.data.certifications?.[0]?.name || "",
                certOrg: intake.data.certifications?.[0]?.organization || "",
                certDate: intake.data.certifications?.[0]?.issued_date || "",
                hasMoreCerts1: intake.data.certifications?.length > 1 ? "yes" : "no",
                
                cert2Name: intake.data.certifications?.[1]?.name || "",
                cert2Org: intake.data.certifications?.[1]?.organization || "",
                cert2Date: intake.data.certifications?.[1]?.issued_date || "",
                hasMoreCerts2: intake.data.certifications?.length > 2 ? "yes" : "no",
                
                cert3Name: intake.data.certifications?.[2]?.name || "",
                cert3Org: intake.data.certifications?.[2]?.organization || "",
                cert3Date: intake.data.certifications?.[2]?.issued_date || "",
                hasMoreCerts3: intake.data.certifications?.length === 3 ? "no" : "",

                timestamp: intake.submitted_at
                  ? new Date(intake.submitted_at).toLocaleString()
                  : prev.timestamp,
              }));

              const dbCerts = intake.data?.certifications || intake.certifications || [];
              const mappedCerts = dbCerts.map((c: any) => ({
                id: c.id || Math.random().toString(),
                name: c.name || "",
                organization: c.organization || "",
                credentialId: c.credential_id || c.credentialId || "",
                issuedDate: c.issued_date || c.issuedDate || "",
                expiresDate: c.expires_date || c.expiresDate || "",
                notes: c.notes || "",
                file: c.credential_url || c.file || null,
              }));
              if (mappedCerts.length > 0) {
                setCertifications(mappedCerts);
              }
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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === "visaStatus" && value !== "Other") {
        updated.visaStatusOther = "";
      }
      
      // If hasWorkExp is changed to "no", reset all Job 1, 2, 3 details and chain fields
      if (field === "hasWorkExp" && value === "no") {
        updated.job1_title = "";
        updated.job1_company = "";
        updated.job1_address = "";
        updated.job1_start = "";
        updated.job1_end = "";
        updated.job1_type = "";
        updated.job1_resp = "";
        
        updated.hasMoreWork1 = "";
        updated.job2_title = "";
        updated.job2_company = "";
        updated.job2_address = "";
        updated.job2_start = "";
        updated.job2_end = "";
        updated.job2_type = "";
        updated.job2_resp = "";
        
        updated.hasMoreWork2 = "";
        updated.job3_title = "";
        updated.job3_company = "";
        updated.job3_address = "";
        updated.job3_start = "";
        updated.job3_end = "";
        updated.job3_type = "";
        updated.job3_resp = "";
        
        updated.hasMoreWork3 = "";
      }
      
      // If hasMoreWork1 is changed to "no", reset Job 2 and 3 details and hasMoreWork2
      if (field === "hasMoreWork1" && value === "no") {
        updated.job2_title = "";
        updated.job2_company = "";
        updated.job2_address = "";
        updated.job2_start = "";
        updated.job2_end = "";
        updated.job2_type = "";
        updated.job2_resp = "";
        
        updated.hasMoreWork2 = "";
        updated.job3_title = "";
        updated.job3_company = "";
        updated.job3_address = "";
        updated.job3_start = "";
        updated.job3_end = "";
        updated.job3_type = "";
        updated.job3_resp = "";
        
        updated.hasMoreWork3 = "";
      }
      
      // If hasMoreWork2 is changed to "no", reset Job 3 details and hasMoreWork3
      if (field === "hasMoreWork2" && value === "no") {
        updated.job3_title = "";
        updated.job3_company = "";
        updated.job3_address = "";
        updated.job3_start = "";
        updated.job3_end = "";
        updated.job3_type = "";
        updated.job3_resp = "";
        
        updated.hasMoreWork3 = "";
      }

      // If hasCerts is changed to "no", reset all Cert 1, 2, 3 details and chain fields
      if (field === "hasCerts" && value === "no") {
        updated.certName = "";
        updated.certOrg = "";
        updated.certDate = "";
        
        updated.hasMoreCerts1 = "";
        updated.cert2Name = "";
        updated.cert2Org = "";
        updated.cert2Date = "";
        
        updated.hasMoreCerts2 = "";
        updated.cert3Name = "";
        updated.cert3Org = "";
        updated.cert3Date = "";
        
        updated.hasMoreCerts3 = "";
        setCertifications([
          { id: Math.random().toString(), name: "", organization: "", credentialId: "", issuedDate: "", expiresDate: "", notes: "", file: null }
        ]);
      }
      
      // If hasMoreCerts1 is changed to "no", reset Cert 2 and 3 details and hasMoreCerts2
      if (field === "hasMoreCerts1" && value === "no") {
        updated.cert2Name = "";
        updated.cert2Org = "";
        updated.cert2Date = "";
        
        updated.hasMoreCerts2 = "";
        updated.cert3Name = "";
        updated.cert3Org = "";
        updated.cert3Date = "";
        
        updated.hasMoreCerts3 = "";
      }
      
      // If hasMoreCerts2 is changed to "no", reset Cert 3 details and hasMoreCerts3
      if (field === "hasMoreCerts2" && value === "no") {
        updated.cert3Name = "";
        updated.cert3Org = "";
        updated.cert3Date = "";
        
        updated.hasMoreCerts3 = "";
      }
      
      return updated;
    });

    setErrors(prev => {
      const next = { ...prev };
      if (next[field]) {
        delete next[field];
      }
      
      if (field === "visaStatus" && value !== "Other") {
        delete next["visaStatusOther"];
      }
      
      // Also clear chained errors if parent is set to "no"
      if (field === "hasWorkExp" && value === "no") {
        ["job1_title", "job1_company", "job1_start", "job1_type", "hasMoreWork1",
         "job2_title", "job2_company", "job2_start", "job2_type", "hasMoreWork2",
         "job3_title", "job3_company", "job3_start", "job3_type", "hasMoreWork3"].forEach(f => {
           delete next[f];
         });
      }
      if (field === "hasMoreWork1" && value === "no") {
        ["job2_title", "job2_company", "job2_start", "job2_type", "hasMoreWork2",
         "job3_title", "job3_company", "job3_start", "job3_type", "hasMoreWork3"].forEach(f => {
           delete next[f];
         });
      }
      if (field === "hasMoreWork2" && value === "no") {
        ["job3_title", "job3_company", "job3_start", "job3_type", "hasMoreWork3"].forEach(f => {
           delete next[f];
         });
      }

      if (field === "hasCerts" && value === "no") {
        ["certName", "certOrg", "certDate", "hasMoreCerts1",
         "cert2Name", "cert2Org", "cert2Date", "hasMoreCerts2",
         "cert3Name", "cert3Org", "cert3Date", "hasMoreCerts3"].forEach(f => {
           delete next[f];
         });
        Object.keys(next).forEach(key => {
          if (key.startsWith("cert_")) {
            delete next[key];
          }
        });
      }
      if (field === "hasMoreCerts1" && value === "no") {
        ["cert2Name", "cert2Org", "cert2Date", "hasMoreCerts2",
         "cert3Name", "cert3Org", "cert3Date", "hasMoreCerts3"].forEach(f => {
           delete next[f];
         });
      }
      if (field === "hasMoreCerts2" && value === "no") {
        ["cert3Name", "cert3Org", "cert3Date", "hasMoreCerts3"].forEach(f => {
           delete next[f];
         });
      }
      
      return next;
    });
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
    if (formData.visaStatus === "Other") {
      if (!formData.visaStatusOther || !formData.visaStatusOther.trim()) {
        newErrors.visaStatusOther = "Required";
      }
    }
    if (formData.hasWorkExp === "yes") {
      if (!formData.hasMoreWork1) newErrors.hasMoreWork1 = "Please specify";
    }
    if (formData.hasMoreWork1 === "yes") {
      if (!formData.hasMoreWork2) newErrors.hasMoreWork2 = "Please specify";
    }
    if (formData.hasMoreWork2 === "yes") {
      if (!formData.hasMoreWork3) newErrors.hasMoreWork3 = "Please specify";
    }
    if (formData.hasCerts === "yes") {
      certifications.forEach(cert => {
        if (!cert.name || !cert.name.trim()) {
          newErrors[`cert_${cert.id}_name`] = "Required";
        }
        if (!cert.organization || !cert.organization.trim()) {
          newErrors[`cert_${cert.id}_organization`] = "Required";
        }
        if (!cert.issuedDate) {
          newErrors[`cert_${cert.id}_issuedDate`] = "Required";
        }
        if (!cert.file) {
          newErrors[`cert_${cert.id}_file`] = "Document required";
        }
      });
    }

    // Document Uploads (Mandatory)
    ["passportUpload", "govIdUpload", "visaUpload", "workAuthUpload", "resumeUpload"].forEach(f => {
      if (!formData[f]) newErrors[f] = "File required";
    });

    // Formatting
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.email = "Invalid format";
    if (formData.marketingEmail && !emailRegex.test(formData.marketingEmail)) newErrors.marketingEmail = "Invalid format";

    if (formData.linkedinLink && !formData.linkedinLink.includes("linkedin.com")) newErrors.linkedinLink = "Invalid URL";

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = "Phone number must be exactly 10 digits";
    }

    if (formData.totalYearsUS !== "" && parseFloat(formData.totalYearsUS) < 0) {
      newErrors.totalYearsUS = "Cannot be negative";
    }

    setErrors(newErrors);

    const hasErrors = Object.keys(newErrors).length > 0;
    if (hasErrors) {
      const fieldOrder = [
        "firstName", "lastName", "dob", "phoneNumber", "marketingEmail", "marketingPhone",
        "visaStatus", "visaStatusOther", "firstEntryUS", "totalYearsUS", "currentAddress", "mailingAddress",
        "skilledIn", "recentlyLearned", "experiencedWith", "learningNow", "otherNonTech",
        "hasWorkExp", "hasMoreWork1", "hasMoreWork2", "hasMoreWork3",
        "highestDegree", "mastersField", "mastersUni", "mastersCountry", "mastersGradDate",
        "linkedinLink", "bachelorsDegree", "bachelorsField", "bachelorsUni", "bachelorsCountry", "bachelorsGradDate",
        "hasCerts", "certName", "certOrg", "certDate", "hasMoreCerts1", "cert2Name", "cert2Org", "cert2Date", "hasMoreCerts2", "cert3Name", "cert3Org", "cert3Date", "hasMoreCerts3",
        "passportUpload", "govIdUpload", "visaUpload", "workAuthUpload", "docUpload",
        "desiredRole", "desiredExpYears", "resumeUpload"
      ];
      const firstErrorField = fieldOrder.find(field => newErrors[field]) || Object.keys(newErrors)[0];
      if (firstErrorField) {
        setTimeout(() => {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = element.querySelector("input, textarea, select, button") || element;
            if (focusable && typeof (focusable as any).focus === "function") {
              (focusable as any).focus();
            }
          }
        }, 100);
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ variant: "destructive", title: "Form Incomplete", description: "Please check the red marked fields." });
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
        } else if (typeof file === "string") {
          // Previously uploaded URL
          uploadedUrls[urlKey] = file;
        } else {
          uploadedUrls[urlKey] = "";
        }
      }

      // ── Step 1.5: Upload all certification files ──
      const finalCertifications: any[] = [];
      if (formData.hasCerts === "yes") {
        for (const cert of certifications) {
          let credentialUrl = "";
          if (cert.file instanceof File) {
            setUploadProgress(`Uploading ${cert.file.name}...`);
            const res = await filesApi.upload(cert.file, "certification");
            credentialUrl = res.data.url;
          } else if (typeof cert.file === "string") {
            credentialUrl = cert.file;
          }

          finalCertifications.push({
            name: cert.name,
            organization: cert.organization,
            credential_id: cert.credentialId || "",
            issued_date: cert.issuedDate,
            expires_date: cert.expiresDate || null,
            notes: cert.notes || "",
            credential_url: credentialUrl,
          });
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

      // ── Step 4: Build final payload (snake_case field names) ──
      const payload: Record<string, any> = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dob,
        phone_number: `${countryCode} ${formData.phoneNumber.trim()}`,
        email: formData.email,
        marketing_email: formData.marketingEmail,
        marketing_phone: formData.marketingPhone,
        current_address: formData.currentAddress,
        mailing_address: formData.mailingAddress,
        visa_status: formData.visaStatus === "Other" ? formData.visaStatusOther : formData.visaStatus,
        first_entry_us: formData.firstEntryUS,
        total_years_us: formData.totalYearsUS,
        skilled_in: formData.skilledIn,
        recently_learned: formData.recentlyLearned,
        experienced_with: formData.experiencedWith,
        learning_now: formData.learningNow,
        other_non_tech: formData.otherNonTech,
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
        has_certs: formData.hasCerts,
        desired_role: formData.desiredRole,
        desired_exp_years: formData.desiredExpYears,
        has_work_exp: formData.hasWorkExp,
        experiences,
        certifications: finalCertifications,
        ...uploadedUrls,
        submitted_timestamp: formData.timestamp,
      };

      // ── Step 5: Submit to backend ──
      await candidatesApi.submitIntake(candidateId, payload);

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast({ title: "✅ Intake Submitted!", description: "Your intake sheet has been saved successfully." });
      onStatusChange?.();
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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

  const renderDocBox = (fieldId: string, label: string, required: boolean = true) => {
    const value = formData[fieldId];
    const isUrl = typeof value === "string";
    const isUploaded = !!value;
    const error = errors[fieldId];

    return (
      <div id={fieldId} className="space-y-2 text-left">
        <Label className="text-sm font-medium">{label}{required ? " *" : ""}</Label>
        <div
          className={cn(
            "p-5 border-2 border-dashed rounded-lg transition-all text-center relative",
            isUploaded ? "bg-green-50 border-green-300" : (error ? "bg-red-50 border-destructive" : "bg-neutral-50 border-neutral-300 hover:border-primary/40")
          )}
        >
          {!isLocked && (
            <input
              type="file"
              id={fieldId + "_input"}
              accept=".pdf,image/*,.docx"
              className="mb-2 h-10 w-full py-1.5 cursor-pointer text-xs bg-white border border-neutral-200 rounded px-2"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const name = file.name.toLowerCase();
                  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
                  const isImg = /\.(jpe?g|png|gif|webp|bmp)$/i.test(name) || file.type.startsWith("image/");
                  const isDocx = name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                  
                  if (!isPdf && !isImg && !isDocx) {
                    toast({
                      variant: "destructive",
                      title: "Invalid File Type",
                      description: "Only PDF, Images (JPG, PNG, WEBP), and DOCX files are allowed.",
                    });
                    e.target.value = ""; // Clear file input
                    return;
                  }
                  
                  if (file.size > 5 * 1024 * 1024) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "File size must be 5MB or less.",
                    });
                    e.target.value = ""; // Clear file input
                    return;
                  }
                  
                  handleChange(fieldId, file);
                }
              }}
            />
          )}
          {error && !isUploaded && <p className="text-[10px] text-destructive mt-1 font-medium">{error}</p>}
          {isUploaded ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <FileCheck className="h-6 w-6 text-green-600" />
              <p className="text-xs font-bold text-green-700">
                {isUrl ? "Document Uploaded" : (value as File).name}
              </p>
              {isUrl && (
                <DocumentPreview
                  url={value as string}
                  label="View Document"
                  className="text-xs text-green-600 hover:text-green-800 font-bold underline cursor-pointer"
                />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, Images, DOCX (Max 5MB)</p>
          )}
        </div>
      </div>
    );
  };

  // Loading spinner while checking intake status
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Checking your intake status...</p>
      </div>
    );
  }

  if (isSubmitted && !isLocked) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-in fade-in zoom-in duration-500">
        <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-card">
          <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-700" />
          <CardContent className="p-8 md:p-12 text-center space-y-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-card-foreground tracking-tight">Submit Confirmation</h2>
              <div className="space-y-4 text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                <p className="text-base text-blue-600 font-bold">You're one step away to get your application workflow started!</p>
                <p>Our team will now start setting up your application workflow. Please stay in touch via your Hyrind email and WhatsApp for future updates.</p>
                <div className="pt-6 border-t border-border/40">
                  <p className="italic text-card-foreground font-semibold">"Let's build your future together."</p>
                  <div className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    — Team Hyrind <br />
                    <span className="text-[10px] font-normal">'You focus on skills. We'll handle the rest.'</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-2xl flex flex-col gap-4 border border-border/40 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2.5">
                <span>Submitted On</span>
                <span>{formData.timestamp}</span>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="send-copy" checked={sendCopy} onCheckedChange={v => setSendCopy(!!v)} className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                <Label htmlFor="send-copy" className="text-sm font-semibold text-card-foreground cursor-pointer">Send me a copy of my responses</Label>
              </div>
            </div>

            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="rounded-xl h-12 px-6 border-border hover:bg-muted/50 font-bold text-muted-foreground gap-2 shadow-sm transition-all">
              <RotateCcw className="h-4 w-4" /> Edit/View Responses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-xl shadow-neutral-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6 text-left">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                <FileText className="h-6 w-6 text-primary" /> Enhanced Client Intake Sheet
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">Complete professional details for our comprehensive review.</p>
            </div>
            {isLocked && (
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                <Lock className="h-3 w-3" /> Submitted & Locked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form className="space-y-12" onSubmit={handleSubmit}>
            <fieldset disabled={isLocked} className="space-y-12">

              {/* ── SECTION 1: PERSONAL DETAILS ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600">Personal Details</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-left">
                  <div id="firstName" className="space-y-2">
                    <Label className="text-sm font-medium">First Name *</Label>
                    <Input value={formData.firstName} onChange={e => handleChange("firstName", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.firstName && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.firstName && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.firstName}</p>}
                  </div>
                  <div id="lastName" className="space-y-2">
                    <Label className="text-sm font-medium">Last Name *</Label>
                    <Input value={formData.lastName} onChange={e => handleChange("lastName", e.target.value)} disabled={isLocked} required className={cn("h-10 rounded-lg bg-neutral-50", errors.lastName && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.lastName && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.lastName}</p>}
                  </div>
                  <div id="dob" className="space-y-2">
                    <Label className="text-sm font-medium">Date of Birth *</Label>
                    <DatePicker value={formData.dob} onChange={val => handleChange("dob", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none", errors.dob && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.dob && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.dob}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Address *</Label>
                    <Input type="email" value={formData.email} disabled className="h-10 rounded-lg bg-neutral-50 opacity-60" />
                  </div>
                  <div id="phoneNumber" className="space-y-2">
                    <Label className="text-sm font-medium">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode} disabled={isLocked}>
                        <SelectTrigger className="w-[100px] h-10 rounded-lg bg-neutral-50 border-neutral-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+91">🇮🇳 +91</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={e => handleChange("phoneNumber", e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={isLocked}
                        required
                        placeholder="1234567890"
                        className={cn("h-10 flex-1 rounded-lg bg-neutral-50", errors.phoneNumber && "border-destructive ring-1 ring-destructive/20")}
                      />
                    </div>
                    {errors.phoneNumber && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.phoneNumber}</p>}
                  </div>
                  <div id="marketingEmail" className="space-y-2">
                    <Label className="text-sm font-medium">New E-mail for Marketing</Label>
                    <Input type="email" value={formData.marketingEmail} onChange={e => handleChange("marketingEmail", e.target.value)} disabled={isLocked} placeholder="Optional" className="h-10 rounded-lg bg-neutral-50" />
                  </div>
                  <div id="marketingPhone" className="space-y-2">
                    <Label className="text-sm font-medium">Contact number for Marketing</Label>
                    <Input type="tel" value={formData.marketingPhone} onChange={e => handleChange("marketingPhone", e.target.value)} disabled={isLocked} placeholder="Optional" className="h-10 rounded-lg bg-neutral-50" />
                  </div>
                  <div id="visaStatus" className="space-y-2">
                    <Label className="text-sm font-medium">Current Visa Status *</Label>
                    <Select value={formData.visaStatus} onValueChange={v => handleChange("visaStatus", v)} disabled={isLocked}>
                      <SelectTrigger className={cn("h-10 rounded-lg bg-neutral-50", errors.visaStatus && "border-destructive ring-1 ring-destructive/20")}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {["F1-OPT", "H1B", "H4 EAD", "Green Card", "US Citizen", "Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.visaStatus && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.visaStatus}</p>}
                  </div>
                  {formData.visaStatus === "Other" && (
                    <div id="visaStatusOther" className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label className="text-sm font-medium">Specify Visa Status *</Label>
                      <Input
                        value={formData.visaStatusOther}
                        onChange={e => handleChange("visaStatusOther", e.target.value)}
                        disabled={isLocked}
                        placeholder="Please specify visa status"
                        className={cn("h-10 rounded-lg bg-neutral-50", errors.visaStatusOther && "border-destructive ring-1 ring-destructive/20")}
                      />
                      {errors.visaStatusOther && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.visaStatusOther}</p>}
                    </div>
                  )}
                  <div id="firstEntryUS" className="space-y-2">
                    <Label className="text-sm font-medium">First Entry into the U.S. *</Label>
                    <DatePicker value={formData.firstEntryUS} onChange={val => handleChange("firstEntryUS", val)} placeholder="MM-DD-YYYY" className={cn("h-10", isLocked && "opacity-50 pointer-events-none", errors.firstEntryUS && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.firstEntryUS && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.firstEntryUS}</p>}
                  </div>
                  <div id="totalYearsUS" className="space-y-2">
                    <Label className="text-sm font-medium">Total Years in the U.S. *</Label>
                    <Input
                      type="number"
                      min="0"
                      onKeyPress={e => {
                        if (e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      value={formData.totalYearsUS}
                      onChange={e => {
                        const val = e.target.value;
                        if (val && parseFloat(val) < 0) return;
                        handleChange("totalYearsUS", val);
                      }}
                      disabled={isLocked}
                      placeholder="e.g. 3"
                      className={cn("h-10 rounded-lg bg-neutral-50", errors.totalYearsUS && "border-destructive ring-1 ring-destructive/20")}
                    />
                    {errors.totalYearsUS && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.totalYearsUS}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <div id="currentAddress" className="space-y-2">
                    <Label className="text-sm font-medium">Current Address *</Label>
                    <Textarea value={formData.currentAddress} onChange={e => handleChange("currentAddress", e.target.value)} disabled={isLocked} required className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.currentAddress && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.currentAddress && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.currentAddress}</p>}
                  </div>
                  <div id="mailingAddress" className="space-y-2">
                    <Label className="text-sm font-medium">Mailing Address *</Label>
                    <Textarea value={formData.mailingAddress} onChange={e => handleChange("mailingAddress", e.target.value)} disabled={isLocked} className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.mailingAddress && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.mailingAddress && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.mailingAddress}</p>}
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: SKILLS ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">Skills</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <div id="skilledIn" className="sm:col-span-2 space-y-2">
                    <Label className="text-sm font-medium">Skilled In (Skills you can confidently work with, e.g., Python, React, Java) *</Label>
                    <Textarea value={formData.skilledIn} onChange={e => handleChange("skilledIn", e.target.value)} disabled={isLocked} required className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.skilledIn && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.skilledIn && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.skilledIn}</p>}
                  </div>
                  <div id="recentlyLearned" className="space-y-2">
                    <Label className="text-sm font-medium">Currently Learning / Recently Learned *</Label>
                    <Textarea value={formData.recentlyLearned} onChange={e => handleChange("recentlyLearned", e.target.value)} disabled={isLocked} className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.recentlyLearned && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.recentlyLearned && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.recentlyLearned}</p>}
                  </div>
                  <div id="experiencedWith" className="space-y-2">
                    <Label className="text-sm font-medium">Experienced With Tools *</Label>
                    <Textarea value={formData.experiencedWith} onChange={e => handleChange("experiencedWith", e.target.value)} disabled={isLocked} className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.experiencedWith && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.experiencedWith && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.experiencedWith}</p>}
                  </div>
                  <div id="learningNow" className="space-y-2">
                    <Label className="text-sm font-medium">Learning Now / Self-Taught Tools *</Label>
                    <Textarea value={formData.learningNow} onChange={e => handleChange("learningNow", e.target.value)} disabled={isLocked} className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.learningNow && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.learningNow && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.learningNow}</p>}
                  </div>
                  <div id="otherNonTech" className="space-y-2">
                    <Label className="text-sm font-medium">Other Non-Technical Skills / Courses *</Label>
                    <Textarea value={formData.otherNonTech} onChange={e => handleChange("otherNonTech", e.target.value)} disabled={isLocked} className={cn("rounded-lg bg-neutral-50 min-h-[80px]", errors.otherNonTech && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.otherNonTech && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.otherNonTech}</p>}
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: WORK EXPERIENCE ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-orange-600">Work Experience</h3>
                </div>

                <div className="space-y-4 text-left">
                  <div id="hasWorkExp" className="space-y-2">
                    <Label className="text-sm font-medium">Do you have any work experience (U.S. and/or International)? *</Label>
                    <div className={cn("flex items-center gap-6 py-2.5 px-4 bg-neutral-50 rounded-lg border", errors.hasWorkExp ? "border-destructive ring-1 ring-destructive/20" : "border-neutral-200")}>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                        <input type="radio" name="hasWorkExp" checked={formData.hasWorkExp === "yes"} onChange={() => handleChange("hasWorkExp", "yes")} disabled={isLocked} className="accent-primary h-4 w-4" /> Yes
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                        <input type="radio" name="hasWorkExp" checked={formData.hasWorkExp === "no"} onChange={() => handleChange("hasWorkExp", "no")} disabled={isLocked} className="accent-primary h-4 w-4" /> No
                      </label>
                    </div>
                    {errors.hasWorkExp && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.hasWorkExp}</p>}
                  </div>

                  {formData.hasWorkExp === "yes" && (
                    <div className="space-y-6">
                      {/* Job 1 */}
                      <Card className="border border-neutral-200 rounded-lg p-5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-4">Work Experience Section 1</h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Job Title</Label>
                            <Input value={formData.job1_title} onChange={e => handleChange("job1_title", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Company Name</Label>
                            <Input value={formData.job1_company} onChange={e => handleChange("job1_company", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Job Type</Label>
                            <Select value={formData.job1_type} onValueChange={v => handleChange("job1_type", v)} disabled={isLocked}>
                              <SelectTrigger className="h-9 rounded-lg bg-neutral-50"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full_time">Full Time</SelectItem>
                                <SelectItem value="part_time">Part Time</SelectItem>
                                <SelectItem value="internship">Internship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Start Date</Label>
                            <DatePicker value={formData.job1_start} onChange={val => handleChange("job1_start", val)} placeholder="MM-DD-YYYY" className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">End Date</Label>
                            <DatePicker value={formData.job1_end} onChange={val => handleChange("job1_end", val)} placeholder="MM-DD-YYYY" className="h-9" />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                            <Label className="text-xs font-medium">Company Address</Label>
                            <Input value={formData.job1_address} onChange={e => handleChange("job1_address", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                            <Label className="text-xs font-medium">Key Responsibilities / Projects</Label>
                            <Textarea value={formData.job1_resp} onChange={e => handleChange("job1_resp", e.target.value)} disabled={isLocked} className="rounded-lg bg-neutral-50 min-h-[60px]" />
                          </div>
                        </div>

                        <div id="hasMoreWork1" className="mt-4 pt-4 border-t border-neutral-100">
                          <Label className="text-xs font-medium">Did you work anywhere else? *</Label>
                          <div className="flex gap-4 mt-1.5">
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                              <input type="radio" name="hasMoreWork1" checked={formData.hasMoreWork1 === "yes"} onChange={() => handleChange("hasMoreWork1", "yes")} disabled={isLocked} className="accent-primary h-3.5 w-3.5" /> Yes
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                              <input type="radio" name="hasMoreWork1" checked={formData.hasMoreWork1 === "no"} onChange={() => handleChange("hasMoreWork1", "no")} disabled={isLocked} className="accent-primary h-3.5 w-3.5" /> No
                            </label>
                          </div>
                          {errors.hasMoreWork1 && <p className="text-[10px] text-destructive mt-1 font-medium">{errors.hasMoreWork1}</p>}
                        </div>
                      </Card>

                      {/* Job 2 */}
                      {formData.hasMoreWork1 === "yes" && (
                        <Card className="border border-neutral-200 rounded-lg p-5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-4">Work Experience Section 2</h4>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Job Title</Label>
                              <Input value={formData.job2_title} onChange={e => handleChange("job2_title", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Company Name</Label>
                              <Input value={formData.job2_company} onChange={e => handleChange("job2_company", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Job Type</Label>
                              <Select value={formData.job2_type} onValueChange={v => handleChange("job2_type", v)} disabled={isLocked}>
                                <SelectTrigger className="h-9 rounded-lg bg-neutral-50"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="full_time">Full Time</SelectItem>
                                  <SelectItem value="part_time">Part Time</SelectItem>
                                  <SelectItem value="internship">Internship</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Start Date</Label>
                              <DatePicker value={formData.job2_start} onChange={val => handleChange("job2_start", val)} placeholder="MM-DD-YYYY" className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">End Date</Label>
                              <DatePicker value={formData.job2_end} onChange={val => handleChange("job2_end", val)} placeholder="MM-DD-YYYY" className="h-9" />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                              <Label className="text-xs font-medium">Company Address</Label>
                              <Input value={formData.job2_address} onChange={e => handleChange("job2_address", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                              <Label className="text-xs font-medium">Key Responsibilities / Projects</Label>
                              <Textarea value={formData.job2_resp} onChange={e => handleChange("job2_resp", e.target.value)} disabled={isLocked} className="rounded-lg bg-neutral-50 min-h-[60px]" />
                            </div>
                          </div>

                          <div id="hasMoreWork2" className="mt-4 pt-4 border-t border-neutral-100">
                            <Label className="text-xs font-medium">Did you work anywhere else? *</Label>
                            <div className="flex gap-4 mt-1.5">
                              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                                <input type="radio" name="hasMoreWork2" checked={formData.hasMoreWork2 === "yes"} onChange={() => handleChange("hasMoreWork2", "yes")} disabled={isLocked} className="accent-primary h-3.5 w-3.5" /> Yes
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                                <input type="radio" name="hasMoreWork2" checked={formData.hasMoreWork2 === "no"} onChange={() => handleChange("hasMoreWork2", "no")} disabled={isLocked} className="accent-primary h-3.5 w-3.5" /> No
                              </label>
                            </div>
                            {errors.hasMoreWork2 && <p className="text-[10px] text-destructive mt-1 font-medium">{errors.hasMoreWork2}</p>}
                          </div>
                        </Card>
                      )}

                      {/* Job 3 */}
                      {formData.hasMoreWork2 === "yes" && (
                        <Card className="border border-neutral-200 rounded-lg p-5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-4">Work Experience Section 3</h4>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Job Title</Label>
                              <Input value={formData.job3_title} onChange={e => handleChange("job3_title", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Company Name</Label>
                              <Input value={formData.job3_company} onChange={e => handleChange("job3_company", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Job Type</Label>
                              <Select value={formData.job3_type} onValueChange={v => handleChange("job3_type", v)} disabled={isLocked}>
                                <SelectTrigger className="h-9 rounded-lg bg-neutral-50"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="full_time">Full Time</SelectItem>
                                  <SelectItem value="part_time">Part Time</SelectItem>
                                  <SelectItem value="internship">Internship</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Start Date</Label>
                              <DatePicker value={formData.job3_start} onChange={val => handleChange("job3_start", val)} placeholder="MM-DD-YYYY" className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">End Date</Label>
                              <DatePicker value={formData.job3_end} onChange={val => handleChange("job3_end", val)} placeholder="MM-DD-YYYY" className="h-9" />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                              <Label className="text-xs font-medium">Company Address</Label>
                              <Input value={formData.job3_address} onChange={e => handleChange("job3_address", e.target.value)} disabled={isLocked} className="h-9 rounded-lg bg-neutral-50" />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                              <Label className="text-xs font-medium">Key Responsibilities / Projects</Label>
                              <Textarea value={formData.job3_resp} onChange={e => handleChange("job3_resp", e.target.value)} disabled={isLocked} className="rounded-lg bg-neutral-50 min-h-[60px]" />
                            </div>
                          </div>

                          <div id="hasMoreWork3" className="mt-4 pt-4 border-t border-neutral-100">
                            <Label className="text-xs font-medium">Did you work anywhere else? *</Label>
                            <div className="flex gap-4 mt-1.5">
                              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                                <input type="radio" name="hasMoreWork3" checked={formData.hasMoreWork3 === "yes"} onChange={() => handleChange("hasMoreWork3", "yes")} disabled={isLocked} className="accent-primary h-3.5 w-3.5" /> Yes
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                                <input type="radio" name="hasMoreWork3" checked={formData.hasMoreWork3 === "no"} onChange={() => handleChange("hasMoreWork3", "no")} disabled={isLocked} className="accent-primary h-3.5 w-3.5" /> No
                              </label>
                            </div>
                            {formData.hasMoreWork3 === "yes" && (
                              <p className="text-[11px] text-amber-600 mt-1.5 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" /> Note: A maximum of 3 work experiences can be added.
                              </p>
                            )}
                            {errors.hasMoreWork3 && <p className="text-[10px] text-destructive mt-1 font-medium">{errors.hasMoreWork3}</p>}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION 4: EDUCATION ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-purple-600">Education</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <div id="highestDegree" className="space-y-2">
                    <Label className="text-sm font-medium">Highest Degree *</Label>
                    <Input value={formData.highestDegree} onChange={e => handleChange("highestDegree", e.target.value)} disabled={isLocked} placeholder="e.g. Masters" className={cn("h-10 rounded-lg bg-neutral-50", errors.highestDegree && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.highestDegree && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.highestDegree}</p>}
                  </div>
                  <div id="mastersField" className="space-y-2">
                    <Label className="text-sm font-medium">Field of Study (Highest Degree) *</Label>
                    <Input value={formData.mastersField} onChange={e => handleChange("mastersField", e.target.value)} disabled={isLocked} placeholder="e.g. Computer Science" className={cn("h-10 rounded-lg bg-neutral-50", errors.mastersField && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.mastersField && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.mastersField}</p>}
                  </div>
                  <div id="mastersUni" className="space-y-2">
                    <Label className="text-sm font-medium">University / Institution Name (Highest) *</Label>
                    <Input value={formData.mastersUni} onChange={e => handleChange("mastersUni", e.target.value)} disabled={isLocked} className={cn("h-10 rounded-lg bg-neutral-50", errors.mastersUni && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.mastersUni && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.mastersUni}</p>}
                  </div>
                  <div id="mastersCountry" className="space-y-2">
                    <Label className="text-sm font-medium">Country (Highest) *</Label>
                    <Input value={formData.mastersCountry} onChange={e => handleChange("mastersCountry", e.target.value)} disabled={isLocked} className={cn("h-10 rounded-lg bg-neutral-50", errors.mastersCountry && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.mastersCountry && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.mastersCountry}</p>}
                  </div>
                  <div id="mastersGradDate" className="space-y-2">
                    <Label className="text-sm font-medium">Graduation Month & Year (Highest) *</Label>
                    <DatePicker
                      value={formData.mastersGradDate}
                      onChange={val => handleChange("mastersGradDate", val)}
                      placeholder="MM-DD-YYYY"
                      className={cn("h-10", isLocked && "opacity-50 pointer-events-none", errors.mastersGradDate && "border-destructive ring-1 ring-destructive/20")}
                    />
                    {errors.mastersGradDate && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.mastersGradDate}</p>}
                  </div>
                  <div id="linkedinLink" className="space-y-2">
                    <Label className="text-sm font-medium">LinkedIn Profile Link *</Label>
                    <Input value={formData.linkedinLink} onChange={e => handleChange("linkedinLink", e.target.value)} disabled={isLocked} placeholder="https://linkedin.com/in/..." className={cn("h-10 rounded-lg bg-neutral-50", errors.linkedinLink && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.linkedinLink && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.linkedinLink}</p>}
                  </div>

                  <div className="sm:col-span-2 border-t border-neutral-200 pt-4 mt-4 text-left">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">Additional Education Detail (Bachelors)</h4>
                  </div>

                  <div id="bachelorsDegree" className="space-y-2">
                    <Label className="text-sm font-medium">Bachelors Degree *</Label>
                    <Input value={formData.bachelorsDegree} onChange={e => handleChange("bachelorsDegree", e.target.value)} disabled={isLocked} className={cn("h-10 rounded-lg bg-neutral-50", errors.bachelorsDegree && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.bachelorsDegree && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.bachelorsDegree}</p>}
                  </div>
                  <div id="bachelorsField" className="space-y-2">
                    <Label className="text-sm font-medium">Field of Study *</Label>
                    <Input value={formData.bachelorsField} onChange={e => handleChange("bachelorsField", e.target.value)} disabled={isLocked} className={cn("h-10 rounded-lg bg-neutral-50", errors.bachelorsField && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.bachelorsField && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.bachelorsField}</p>}
                  </div>
                  <div id="bachelorsUni" className="space-y-2">
                    <Label className="text-sm font-medium">University / Institution Name *</Label>
                    <Input value={formData.bachelorsUni} onChange={e => handleChange("bachelorsUni", e.target.value)} disabled={isLocked} className={cn("h-10 rounded-lg bg-neutral-50", errors.bachelorsUni && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.bachelorsUni && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.bachelorsUni}</p>}
                  </div>
                  <div id="bachelorsCountry" className="space-y-2">
                    <Label className="text-sm font-medium">Country *</Label>
                    <Input value={formData.bachelorsCountry} onChange={e => handleChange("bachelorsCountry", e.target.value)} disabled={isLocked} className={cn("h-10 rounded-lg bg-neutral-50", errors.bachelorsCountry && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.bachelorsCountry && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.bachelorsCountry}</p>}
                  </div>
                  <div id="bachelorsGradDate" className="space-y-2">
                    <Label className="text-sm font-medium">Graduation Month & Year *</Label>
                    <DatePicker
                      value={formData.bachelorsGradDate}
                      onChange={val => handleChange("bachelorsGradDate", val)}
                      placeholder="MM-DD-YYYY"
                      className={cn("h-10", isLocked && "opacity-50 pointer-events-none", errors.bachelorsGradDate && "border-destructive ring-1 ring-destructive/20")}
                    />
                    {errors.bachelorsGradDate && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.bachelorsGradDate}</p>}
                  </div>
                </div>
              </div>

              {/* ── SECTION 5: CERTIFICATIONS ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-600">Certifications & Credentials</h3>
                </div>

                <div className="space-y-4 text-left">
                  <div id="hasCerts" className="space-y-2">
                    <Label className="text-sm font-medium">Have you completed any professional certifications? *</Label>
                    <div className={cn("flex items-center gap-6 py-2.5 px-4 bg-neutral-50 rounded-lg border", errors.hasCerts ? "border-destructive ring-1 ring-destructive/20" : "border-neutral-200")}>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                        <input type="radio" name="hasCerts" checked={formData.hasCerts === "yes"} onChange={() => handleChange("hasCerts", "yes")} disabled={isLocked} className="accent-primary h-4 w-4" /> Yes
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                        <input type="radio" name="hasCerts" checked={formData.hasCerts === "no"} onChange={() => handleChange("hasCerts", "no")} disabled={isLocked} className="accent-primary h-4 w-4" /> No
                      </label>
                    </div>
                    {errors.hasCerts && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.hasCerts}</p>}
                  </div>

                  {formData.hasCerts === "yes" && (
                    <div className="space-y-6">
                      {certifications.map((cert, index) => (
                        <Card key={cert.id} className="border border-neutral-200 rounded-lg p-5 text-left relative overflow-hidden transition-all shadow-sm hover:shadow-md">
                          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                              <Award className="h-3.5 w-3.5 text-red-500" /> Certification #{index + 1}
                            </h4>
                            {!isLocked && certifications.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => removeCertification(cert.id)}
                                className="h-8 px-2 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-bold gap-1 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remove
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div id={`cert_${cert.id}_name`} className="space-y-1">
                              <Label className="text-xs font-medium">Certification Name *</Label>
                              <Input
                                value={cert.name}
                                onChange={e => updateCertification(cert.id, "name", e.target.value)}
                                disabled={isLocked}
                                className={cn("h-9 rounded-lg bg-neutral-50", errors[`cert_${cert.id}_name`] && "border-destructive")}
                              />
                              {errors[`cert_${cert.id}_name`] && (
                                <p className="text-[10px] text-destructive mt-1 font-medium">{errors[`cert_${cert.id}_name`]}</p>
                              )}
                            </div>
                            
                            <div id={`cert_${cert.id}_organization`} className="space-y-1">
                              <Label className="text-xs font-medium">Issuing Organization *</Label>
                              <Input
                                value={cert.organization}
                                onChange={e => updateCertification(cert.id, "organization", e.target.value)}
                                disabled={isLocked}
                                className={cn("h-9 rounded-lg bg-neutral-50", errors[`cert_${cert.id}_organization`] && "border-destructive")}
                              />
                              {errors[`cert_${cert.id}_organization`] && (
                                <p className="text-[10px] text-destructive mt-1 font-medium">{errors[`cert_${cert.id}_organization`]}</p>
                              )}
                            </div>
                            
                            <div id={`cert_${cert.id}_credentialId`} className="space-y-1">
                              <Label className="text-xs font-medium">Credential ID / Certification ID (Optional)</Label>
                              <Input
                                value={cert.credentialId || ""}
                                onChange={e => updateCertification(cert.id, "credentialId", e.target.value)}
                                disabled={isLocked}
                                placeholder="e.g. 123-456"
                                className="h-9 rounded-lg bg-neutral-50"
                              />
                            </div>
                            
                            <div id={`cert_${cert.id}_issuedDate`} className="space-y-1">
                              <Label className="text-xs font-medium">Issued Date *</Label>
                              <DatePicker
                                value={cert.issuedDate}
                                onChange={val => updateCertification(cert.id, "issuedDate", val)}
                                className={cn("h-9", isLocked && "opacity-50 pointer-events-none", errors[`cert_${cert.id}_issuedDate`] && "border-destructive")}
                              />
                              {errors[`cert_${cert.id}_issuedDate`] && (
                                <p className="text-[10px] text-destructive mt-1 font-medium">{errors[`cert_${cert.id}_issuedDate`]}</p>
                              )}
                            </div>
                            
                            <div id={`cert_${cert.id}_expiresDate`} className="space-y-1">
                              <Label className="text-xs font-medium">Expiry Date (Optional)</Label>
                              <DatePicker
                                value={cert.expiresDate || ""}
                                onChange={val => updateCertification(cert.id, "expiresDate", val)}
                                className={cn("h-9", isLocked && "opacity-50 pointer-events-none")}
                              />
                            </div>
                            
                            <div id={`cert_${cert.id}_notes`} className="sm:col-span-2 lg:col-span-3 space-y-1">
                              <Label className="text-xs font-medium">Description / Notes (Optional)</Label>
                              <Textarea
                                value={cert.notes || ""}
                                onChange={e => updateCertification(cert.id, "notes", e.target.value)}
                                disabled={isLocked}
                                placeholder="e.g. Completed with honors, key focus areas, etc."
                                className="rounded-lg bg-neutral-50 min-h-[60px]"
                              />
                            </div>
                            
                            <div id={`cert_${cert.id}_file`} className="sm:col-span-2 lg:col-span-3 space-y-2">
                              <Label className="text-xs font-medium">Upload Certification Document *</Label>
                              <div
                                className={cn(
                                  "p-4 border-2 border-dashed rounded-lg transition-all text-center relative",
                                  cert.file ? "bg-green-50 border-green-300" : (errors[`cert_${cert.id}_file`] ? "bg-red-50 border-destructive" : "bg-neutral-50 border-neutral-300 hover:border-primary/40")
                                )}
                              >
                                {!isLocked && (
                                  <input
                                    type="file"
                                    id={`cert_${cert.id}_file_input`}
                                    accept=".pdf,image/*,.doc,.docx"
                                    className="mb-2 h-10 w-full py-1.5 cursor-pointer text-xs bg-white border border-neutral-200 rounded px-2"
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const name = file.name.toLowerCase();
                                        const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
                                        const isImg = /\.(jpe?g|png|gif|webp|bmp)$/i.test(name) || file.type.startsWith("image/");
                                        const isDoc = name.endsWith(".doc") || name.endsWith(".docx") || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                                        
                                        if (!isPdf && !isImg && !isDoc) {
                                          toast({
                                            variant: "destructive",
                                            title: "Invalid File Type",
                                            description: "Only PDF, DOC/DOCX, and Images (JPG, PNG) are allowed.",
                                          });
                                          e.target.value = "";
                                          return;
                                        }
                                        
                                        if (file.size > 5 * 1024 * 1024) {
                                          toast({
                                            variant: "destructive",
                                            title: "Error",
                                            description: "File size must be 5MB or less.",
                                          });
                                          e.target.value = "";
                                          return;
                                        }
                                        
                                        updateCertification(cert.id, "file", file);
                                      }
                                    }}
                                  />
                                )}
                                {errors[`cert_${cert.id}_file`] && !cert.file && (
                                  <p className="text-[10px] text-destructive mt-1 font-medium">{errors[`cert_${cert.id}_file`]}</p>
                                )}
                                {cert.file ? (
                                  <div className="flex flex-col items-center gap-1.5 mt-1">
                                    <FileCheck className="h-5 w-5 text-green-600" />
                                    <p className="text-xs font-bold text-green-700">
                                      {typeof cert.file === "string" ? "Document Uploaded" : cert.file.name}
                                    </p>
                                    {typeof cert.file === "string" && (
                                      <DocumentPreview
                                        url={cert.file}
                                        label="View Document"
                                        className="text-xs text-green-600 hover:text-green-800 font-bold underline cursor-pointer"
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Accepted: PDF, DOC/DOCX, Images (Max 5MB)</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCertification}
                          className="w-full h-10 border-dashed border-primary/40 text-primary hover:bg-primary/5 rounded-lg flex items-center justify-center font-bold text-xs gap-2 transition-all"
                        >
                          <Award className="h-4 w-4" /> + Add Certification
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION 6: DOCUMENTS ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-teal-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-teal-600">Identity & Legal Documents</h3>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 text-left">
                  {renderDocBox("passportUpload", "Please Upload Passport")}
                  {renderDocBox("govIdUpload", "Please Upload Government ID")}
                  {renderDocBox("visaUpload", "Please Upload Visa")}
                  {renderDocBox("workAuthUpload", "Work Authorization Proof")}
                  <div className="sm:col-span-2">
                    {renderDocBox("docUpload", "Upload Any Additional Documents (Optional)", false)}
                  </div>
                </div>
              </div>

              {/* ── SECTION 7: JOB PREFERENCES ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-4 text-left">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-600">Job Preferences</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <div id="desiredRole" className="space-y-2">
                    <Label className="text-sm font-medium">Desired Job Role / Roles *</Label>
                    <Input value={formData.desiredRole} onChange={e => handleChange("desiredRole", e.target.value)} disabled={isLocked} placeholder="e.g. Software Engineer" className={cn("h-10 rounded-lg bg-neutral-50", errors.desiredRole && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.desiredRole && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.desiredRole}</p>}
                  </div>
                  <div id="desiredExpYears" className="space-y-2">
                    <Label className="text-sm font-medium">Desired Years of Experience *</Label>
                    <Input type="number" value={formData.desiredExpYears} onChange={e => handleChange("desiredExpYears", e.target.value)} disabled={isLocked} placeholder="e.g. 3" className={cn("h-10 rounded-lg bg-neutral-50", errors.desiredExpYears && "border-destructive ring-1 ring-destructive/20")} />
                    {errors.desiredExpYears && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{errors.desiredExpYears}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    {renderDocBox("resumeUpload", "Please Upload Original Resume")}
                  </div>
                </div>
              </div>

            </fieldset>

            {/* ── SUBMIT BUTTON ── */}
            {!isLocked && (
              <div className="pt-8 border-t border-neutral-200">
                <Button
                  onClick={handleSubmit}
                  type="submit"
                  className="w-full h-12 text-base font-bold transition-all duration-300 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                  disabled={isSubmitting || !candidateId}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Lock className="h-5 w-5 animate-pulse" />
                      {uploadProgress ? uploadProgress : "Submitting..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">Submit & Lock Intake Form <CheckCircle className="h-5 w-5" /></span>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground mt-4 font-medium italic opacity-70">
                  ⚠️ Submitting this form will lock it for administrative review. Ensure all details are accurate before submitting.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateIntakePage;
