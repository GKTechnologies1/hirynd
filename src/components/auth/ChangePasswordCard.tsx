import { useState } from "react";
import { authApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
  id: string;
}

const PasswordInput = ({ label, value, onChange, show, onToggle, error, id }: PasswordInputProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        current_password: ""
      });
      toast({ title: "Password updated successfully" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-6 italic border-l-2 border-secondary/30 pl-3 py-1">
          Update your security credentials. Current password is not required while logged in.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordInput
            id="new-password"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew(!showNew)}
            error={errors.newPassword}
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm(!showConfirm)}
            error={errors.confirmPassword}
          />
          <Button
            variant="hero"
            className={`w-full mt-4 h-11 font-bold transition-all ${newPassword.trim() && confirmPassword.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
            disabled={submitting}
          >
            {submitting ? "Updating Security..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
