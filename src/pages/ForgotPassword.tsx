import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/services/api";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import logo from "@/assets/image.png";

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnTo") || "/candidate-login";
  
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await authApi.requestPasswordReset(email);
      setSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "If an account exists with that email, you will receive a reset link shortly.",
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Just mock success even if 404 to avoid email enumeration
        setSubmitted(true);
        toast({
          title: "Reset link sent",
          description: "If an account exists with that email, you will receive a reset link shortly.",
        });
      } else {
        toast({
          title: "Request failed",
          description: error.response?.data?.error || "Something went wrong. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="mx-auto w-full max-w-md bg-white rounded-2xl border border-neutral-200 p-10 shadow-xl shadow-neutral-100/50">
          {!submitted ? (
            <>
              <div className="text-center mb-10">
                <div className="mx-auto mb-6 transition-transform hover:scale-105 duration-300">
                  <img 
                    src={logo} 
                    alt="Hyrind Logo" 
                    className="h-16 w-16 mx-auto rounded-full border-2 border-primary/20 p-1 bg-white shadow-sm"
                  />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">Forgot Password</h1>
                <p className="text-muted-foreground">Enter your email and we'll send you a link to reset your password.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium ml-1">Account Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-12 pl-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="w-full h-12 rounded-xl text-md font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all" 
                    disabled={submitting}
                  >
                    {submitting ? "Sending Link..." : "Send Reset Link"}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
                <Link 
                  to={returnUrl} 
                  className="inline-flex items-center text-sm font-semibold text-neutral-500 hover:text-primary transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                  Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-4 animate-in fade-in zoom-in">
              <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-100 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-3 tracking-tight">Check your email</h1>
              <p className="text-muted-foreground mb-10 leading-relaxed">
                We've sent a password reset link to <span className="font-semibold text-neutral-900">{email}</span>. Please check your inbox and follow the instructions.
              </p>
              
              <div className="bg-neutral-50 rounded-xl p-5 mb-8 border border-neutral-100 text-sm text-neutral-500">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  variant="hero" 
                  className="h-12 rounded-xl text-md font-semibold shadow-lg shadow-primary/10" 
                  onClick={() => setSubmitted(false)}
                >
                  Resend Email
                </Button>
                <Link to={returnUrl}>
                  <Button variant="ghost" className="w-full h-12 rounded-xl text-neutral-500 hover:text-foreground">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
