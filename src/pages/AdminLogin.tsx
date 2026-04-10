import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error, user: loggedUser } = await signIn(email, password);

    if (error) {
      setSubmitting(false);
      const msg = typeof error === "string" ? error : (error.error || error.detail || "Invalid email or password.");
      toast({
        title: "Login failed",
        description: msg,
        variant: "destructive",
      });
    } else if (loggedUser?.role !== "admin") {
      await signOut();
      setSubmitting(false);
      toast({ title: "Access denied", description: "Insufficient permissions.", variant: "destructive" });
    } else {
      setSubmitting(false);
      navigate("/admin-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="mx-auto w-full max-w-md animate-in">
          <div className="bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-100/50">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-200">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Admin Portal</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Authorized Access Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-neutral-500 ml-1">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@hyrind.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <PasswordField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword(p => !p)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-xl bg-neutral-50 border-neutral-200 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="flex justify-end pr-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline underline-offset-4 decoration-primary/30"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="hero"
                  className={`w-full h-12 rounded-xl text-md font-bold transition-all ${email.trim() && password.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                  disabled={submitting}
                >
                  {submitting ? "Authenticating..." : "Admin Sign In"}
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-neutral-100 text-center">
              <p className="text-xs text-neutral-400 font-medium">
                Protected by Hyrind Security Protocols
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-6">
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogin;

