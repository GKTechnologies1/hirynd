import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, CreditCard, ClipboardList, Phone, UserPlus, MessageSquare, Settings, Eye, EyeOff, HelpCircle } from "lucide-react";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Sheet", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Billing", path: "/candidate-dashboard/billing", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Interviews", path: "/candidate-dashboard/interviews", icon: <Phone className="h-4 w-4" /> },
  { label: "Referral", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Messages", path: "/candidate-dashboard/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Settings", path: "/candidate-dashboard/settings", icon: <Settings className="h-4 w-4" /> },
];

const CandidateSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = "Current password is required";
    if (!newPassword || newPassword.length < 8) errs.newPassword = "Min 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(newPassword))
      errs.newPassword = "Must contain uppercase, lowercase, number, and special character";
    if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      toast({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to update password", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const PasswordInput = ({ label, value, onChange, show, onToggle, error }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; error?: string;
  }) => (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={onToggle}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );

  return (
    <DashboardLayout title="Settings" navItems={CANDIDATE_NAV}>
      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordInput label="Current Password" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} error={errors.currentPassword} />
              <PasswordInput label="New Password" value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} error={errors.newPassword} />
              <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} error={errors.confirmPassword} />
              <Button variant="hero" disabled={submitting}>{submitting ? "Updating..." : "Update Password"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4" /> Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Need help? Contact our support team.</p>
            <Button variant="outline" onClick={() => window.location.href = "/contact"}>
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CandidateSettingsPage;
