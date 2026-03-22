import { useState, useEffect } from "react";
import { adminConfigApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, MousePointer, Mail } from "lucide-react";

const CONFIG_KEYS = [
  { key: "site_url", label: "Site URL (used in email links)" },
  { key: "admin_notification_email", label: "Admin Notification Email(s) (comma-separated)" },
  { key: "cal_screening_practice", label: "Screening Practice Cal.com URL" },
  { key: "cal_interview_training", label: "Interview Training Cal.com URL" },
  { key: "cal_operations_call", label: "Operations Call Cal.com URL" },
  { key: "default_grace_period_days", label: "Default Grace Period (days)" },
  { key: "subscription_amount_default", label: "Default Subscription Amount (₹)" },
  { key: "allow_auto_resume_after_payment", label: "Auto Resume After Payment (true/false)" },
  { key: "email_admin_on_daily_logs", label: "Email Admin on Daily Logs (true/false)" },
  { key: "email_admin_on_interview_logs", label: "Email Admin on Interview Logs (true/false)" },
];

const AdminConfigPage = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [trainingClicks, setTrainingClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchData = async () => {
    try {
      const [configRes, clicksRes] = await Promise.all([
        adminConfigApi.list(),
        adminConfigApi.trainingClicks().catch(() => ({ data: [] })),
      ]);
      const map: Record<string, string> = {};
      if (Array.isArray(configRes.data)) {
        configRes.data.forEach((c: any) => { map[c.config_key] = c.config_value; });
      } else if (configRes.data && typeof configRes.data === 'object') {
        Object.assign(map, configRes.data);
      }
      setConfigs(map);
      setTrainingClicks(clicksRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminConfigApi.save(configs);
      toast({ title: "Configuration saved" });
    } catch (e: any) {
      toast({ title: "Error saving", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleTestEmail = async () => {
    setSendingTest(true);
    try {
      await adminConfigApi.sendTestEmail();
      toast({ title: "Test email sent", description: `Sent to ${configs["admin_notification_email"] || "configured admin email"}` });
    } catch {
      toast({ title: "Test email failed", variant: "destructive" });
    }
    setSendingTest(false);
  };

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const clicksLast7 = trainingClicks.filter(c => c.created_at >= sevenDaysAgo);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CONFIG_KEYS.map((item) => (
            <div key={item.key}>
              <Label>{item.label}</Label>
              <Input
                value={configs[item.key] || ""}
                onChange={e => setConfigs(prev => ({ ...prev, [item.key]: e.target.value }))}
                placeholder="Enter value..."
              />
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Configuration"}
            </Button>
            <Button variant="outline" onClick={handleTestEmail} disabled={sendingTest}>
              <Mail className="mr-2 h-4 w-4" /> {sendingTest ? "Sending..." : "Send Test Admin Email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MousePointer className="h-5 w-5" /> Training Link Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-6 text-sm">
            <span className="text-muted-foreground">Last 7 days: <strong className="text-card-foreground">{clicksLast7.length}</strong></span>
            <span className="text-muted-foreground">Last 30 days: <strong className="text-card-foreground">{trainingClicks.length}</strong></span>
          </div>
          {trainingClicks.length === 0 ? (
            <p className="text-muted-foreground">No training link clicks recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Training Type</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingClicks.slice(0, 50).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.candidate_name || "Unknown"}</TableCell>
                    <TableCell className="capitalize">{(c.training_type || "").replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConfigPage;
