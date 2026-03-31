import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Shield, Users, UserPlus, Briefcase, DollarSign, CreditCard, AlertTriangle, Bell, BarChart, Settings, HelpCircle } from "lucide-react";
import { ChangePasswordCard } from "@/components/auth/ChangePasswordCard";

const AdminSettingsPage = () => {
  return (
    <div className="max-w-lg space-y-6">
      <ChangePasswordCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" /> Admin Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">For critical system issues or account recovery, please contact the lead developer.</p>
          <Button variant="outline" onClick={() => window.location.href = "mailto:hyrind.operations@gmail.com"}>
            Email Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;
