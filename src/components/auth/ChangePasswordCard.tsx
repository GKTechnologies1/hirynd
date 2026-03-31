import { useState } from "react";
import { authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export const ChangePasswordCard = () => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
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
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      toast({ title: "Password updated successfully" });
      setNewPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.response?.data?.error || "Failed to update password", 
        variant: "destructive" 
      });
    }
    setSubmitting(false);
  };

  const PasswordInput = ({ label, value, onChange, show, onToggle, error }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; error?: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input 
          type={show ? "text" : "password"} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className="pr-10"
        />
        <button 
          type="button" 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" 
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4 italic">Update your security credentials. Current password is not required while logged in.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput 
            label="New Password" 
            value={newPassword} 
            onChange={setNewPassword} 
            show={showNew} 
            onToggle={() => setShowNew(!showNew)} 
            error={errors.newPassword} 
          />
          <PasswordInput 
            label="Confirm New Password" 
            value={confirmPassword} 
            onChange={setConfirmPassword} 
            show={showConfirm} 
            onToggle={() => setShowConfirm(!showConfirm)} 
            error={errors.confirmPassword} 
          />
          <Button 
            variant="hero" 
            className="w-full mt-2" 
            disabled={submitting}
          >
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
