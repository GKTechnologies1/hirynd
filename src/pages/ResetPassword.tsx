import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, new_password: password, confirm_password: confirm });
      setSuccess(true);
      toast({ title: "Password reset successful" });
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.response?.data?.error || "Invalid or expired token.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center py-20">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 card-elevated text-center">
            <h1 className="text-xl font-bold text-card-foreground mb-2">Invalid Link</h1>
            <p className="text-sm text-muted-foreground mb-4">This password reset link is invalid or expired.</p>
            <Button variant="hero" onClick={() => navigate("/candidate-login")}>Back to Login</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center py-20">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-8 card-elevated">
          {success ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-secondary mb-4" />
              <h1 className="text-xl font-bold text-card-foreground mb-2">Password Reset!</h1>
              <p className="text-sm text-muted-foreground mb-4">Your password has been updated successfully.</p>
              <Button variant="hero" onClick={() => navigate("/candidate-login")}>Go to Login</Button>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-card-foreground">Set New Password</h1>
              <p className="mb-6 text-sm text-muted-foreground">Enter your new password below.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                <Button variant="hero" className="w-full" disabled={submitting}>
                  {submitting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
