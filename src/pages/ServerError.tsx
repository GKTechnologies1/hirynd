import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

const ServerError = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <span className="text-[12rem] font-bold select-none text-destructive">500</span>
          </div>
          <div className="relative z-10 flex justify-center">
            <div className="h-24 w-24 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive animate-pulse shadow-xl shadow-destructive/5">
              <AlertTriangle className="h-12 w-12" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Server Error</h1>
          <p className="text-muted-foreground text-lg">
            Something went wrong on our end. Our engineers are already looking into it. Please try again later.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button 
            variant="outline" 
            className="rounded-xl h-11 px-6 gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
          <Button asChild className="bg-secondary hover:bg-secondary/90 text-white rounded-xl h-11 px-6 shadow-lg shadow-secondary/20">
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-sm text-muted-foreground border-t border-border/50">
          <p>If the problem persists, please <Link to="/contact" className="text-secondary hover:underline">contact support</Link>.</p>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
