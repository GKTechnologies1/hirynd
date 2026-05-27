import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { candidatesApi } from "@/services/api";

interface CustomCredentialsDialogProps {
  candidateId: string;
  readOnly?: boolean;
  onRefresh?: () => void;
  trigger?: React.ReactNode;
}

const CustomCredentialsDialog: React.FC<CustomCredentialsDialogProps> = ({
  candidateId,
  readOnly = false,
  onRefresh,
  trigger
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customPlatforms, setCustomPlatforms] = useState<any[]>([]);
  const [latestData, setLatestData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const fetchCredentials = async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const res = await candidatesApi.getCredentials(candidateId);
      const latest = res.data?.[0];
      if (latest && latest.data) {
        setLatestData(latest.data);
        setCustomPlatforms(latest.data.custom_platforms || []);
      } else {
        setLatestData({});
        setCustomPlatforms([]);
      }
    } catch (err: any) {
      console.error("Failed to load custom platforms", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchCredentials();
    }
  }, [open, candidateId]);

  const togglePassword = (key: string) => {
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddPlatform = () => {
    setCustomPlatforms(prev => [...prev, { platform_name: "", password: "" }]);
  };

  const handleRemovePlatform = (idx: number) => {
    setCustomPlatforms(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFieldChange = (idx: number, field: string, val: string) => {
    setCustomPlatforms(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSave = async () => {
    const invalid = customPlatforms.some(cp => !cp.platform_name?.trim() || !cp.password?.trim());
    if (invalid) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const updatedPayload = {
        ...(latestData || {}),
        custom_platforms: customPlatforms
      };
      
      await candidatesApi.upsertCredential(candidateId, updatedPayload);
      toast({ title: "Custom credentials saved" });
      setOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({ title: "Error saving credentials", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl">
            <KeyRound className="h-4 w-4" /> Custom Job Platforms
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <KeyRound className="h-5 w-5 text-amber-600" /> Custom Job Platform Credentials
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            View or manage custom platform logins. These credentials sync automatically.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 py-1">
            {customPlatforms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No custom platforms added yet.</p>
            ) : (
              customPlatforms.map((cp, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl border bg-amber-50/10 border-amber-200/50 relative group text-left">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Platform Name</Label>
                      <Input
                        className="h-9 bg-white text-sm"
                        placeholder="e.g. Glassdoor"
                        disabled={readOnly}
                        value={cp.platform_name || ""}
                        onChange={e => handleFieldChange(idx, "platform_name", e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Password</Label>
                      <div className="relative">
                        <Input
                          className="h-9 bg-white pr-9 text-sm"
                          type={showPassword[`cp_${idx}`] ? "text" : "password"}
                          placeholder="Password"
                          disabled={readOnly}
                          value={cp.password || ""}
                          onChange={e => handleFieldChange(idx, "password", e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-muted-foreground"
                          onClick={() => togglePassword(`cp_${idx}`)}
                        >
                          {showPassword[`cp_${idx}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute -top-2 -right-2 h-6 w-6 bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePlatform(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
            
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" className="w-full h-9 border-dashed gap-1" onClick={handleAddPlatform}>
                <Plus className="h-4 w-4" /> Add Custom Platform
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Close
          </Button>
          {!readOnly && (
            <Button type="button" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomCredentialsDialog;
