import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/services/api";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";
import logo from "@/assets/image.png";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!uid || !token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [uid, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords match error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    
    if (password.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await authApi.resetPassword({
        uidb64: uid,
        token: token,
        new_password: password,
        confirm_new_password: confirmPassword
      });
      
      setCompleted(true);
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });
      
      // Auto-redirect after 3 seconds
      setTimeout(() => navigate("/candidate-login"), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to reset password. The link may be expired.";
      setError(msg);
      toast({
        title: "Reset failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="mx-auto w-full max-w-md bg-white rounded-2xl border border-neutral-200 p-10 shadow-xl shadow-neutral-100/50">
          {error ? (
            <div className="text-center animate-in fade-in zoom-in">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-sm">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-3">Reset link invalid</h1>
              <p className="text-muted-foreground mb-8">{error}</p>
              <Link to="/forgot-password">
                <Button variant="hero" className="w-full h-12 rounded-xl font-semibold shadow-lg shadow-primary/10">
                  Request New Link
                </Button>
              </Link>
            </div>
          ) : !completed ? (
            <>
              <div className="text-center mb-10">
                <div className="mx-auto mb-6 transition-transform hover:scale-105 duration-300">
                  <img 
                    src={logo} 
                    alt="Hyrind Logo" 
                    className="h-16 w-16 mx-auto rounded-full border-2 border-primary/20 p-1 bg-white shadow-sm"
                  />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">New Password</h1>
                <p className="text-muted-foreground">Please create a strong new password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-2">
                <PasswordField
                  label="New Password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                />

                <PasswordField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                />

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="hero" 
                    className={`w-full h-12 rounded-xl text-md font-semibold transition-all ${password.trim() && confirmPassword.trim() && password === confirmPassword ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`} 
                    disabled={submitting}
                  >
                    {submitting ? "Updating..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-4 animate-in fade-in zoom-in">
              <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-100 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-3 tracking-tight">Success!</h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your password has been successfully reset. You can now use your new password to log in.
              </p>
              
              <div className="text-sm text-neutral-400 mb-8 animate-pulse">
                Redirecting to login page...
              </div>

              <Link to="/candidate-login" className="w-full">
                <Button variant="hero" className="w-full h-12 rounded-xl text-md font-semibold shadow-lg shadow-primary/10">
                  Go to Login Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
