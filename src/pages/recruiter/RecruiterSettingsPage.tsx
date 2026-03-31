import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, User, Settings, HelpCircle } from "lucide-react";
import { ChangePasswordCard } from "@/components/auth/ChangePasswordCard";

const RecruiterSettingsPage = () => {
  return (
    <div className="max-w-lg space-y-6">
      <ChangePasswordCard />

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
  );
};

export default RecruiterSettingsPage;
