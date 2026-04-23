import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <span className="text-[12rem] font-bold select-none">404</span>
          </div>
          <div className="relative z-10 flex justify-center">
            <div className="h-24 w-24 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary animate-bounce shadow-xl shadow-secondary/5">
              <FileQuestion className="h-12 w-12" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground text-lg">
            Oops! The page you're looking for doesn't exist or has been moved to a new location.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild variant="outline" className="rounded-xl h-11 px-6">
            <Link to={-1 as any} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild className="bg-secondary hover:bg-secondary/90 text-white rounded-xl h-11 px-6 shadow-lg shadow-secondary/20">
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-sm text-muted-foreground border-t border-border/50">
          <p>Requested URL: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{location.pathname}</code></p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
