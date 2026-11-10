import React, { useState, useEffect, useCallback } from "react";
import { jobScraperApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  Layers,
  Users,
  RefreshCw,
  Calendar,
  Globe,
  Briefcase,
  ShieldAlert,
} from "lucide-react";

interface ScrapingCostAnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}

export const ScrapingCostAnalyticsModal: React.FC<ScrapingCostAnalyticsModalProps> = ({
  open,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPortal, setSelectedPortal] = useState("all");

  const loadCostData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (selectedPortal !== "all") params.portal = selectedPortal;

      const res = await jobScraperApi.costReports(params);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load cost analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedPortal]);

  useEffect(() => {
    if (open) {
      loadCostData();
    }
  }, [open, loadCostData]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Scraping Financial & Cost Analytics
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Metered infrastructure & API provider expenditures across sessions and roles. (Strictly Admin-Only)
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
              Confidential Admin
            </Badge>
          </div>
        </DialogHeader>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs w-36 bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs w-36 bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Portal:</span>
            <select
              value={selectedPortal}
              onChange={(e) => setSelectedPortal(e.target.value)}
              className="h-8 text-xs bg-white border border-slate-200 rounded px-2"
            >
              <option value="all">All Portals</option>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="glassdoor">Glassdoor</option>
              <option value="dice">Dice</option>
              <option value="ziprecruiter">ZipRecruiter</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCostData}
            className="h-8 text-xs font-semibold ml-auto"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Apply Filters
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Aggregating audited provider usage records...
          </div>
        ) : (
          <div className="space-y-4 py-1 text-xs">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 uppercase block">Total Metered Spend</span>
                <span className="text-2xl font-extrabold text-emerald-800">
                  ${Number(data?.total_spend_usd || 0).toFixed(4)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">USD billable usage</span>
              </Card>
              <Card className="p-3.5 bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200">
                <span className="text-[11px] font-bold text-blue-700 uppercase block">Total API Calls</span>
                <span className="text-2xl font-extrabold text-blue-800">
                  {(data?.total_api_calls || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5">Actor execution runs</span>
              </Card>
              <Card className="p-3.5 bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-200">
                <span className="text-[11px] font-bold text-purple-700 uppercase block">Jobs Scraped</span>
                <span className="text-2xl font-extrabold text-purple-800">
                  {(data?.total_jobs_scraped || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  Avg ${(Number(data?.total_spend_usd || 0) / Math.max(1, data?.total_jobs_scraped || 1)).toFixed(4)} / job
                </span>
              </Card>
            </div>

            {/* Grid 2-cols: By Portal and By Profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Cost by Portal */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-800 border-b flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-primary" />
                    Expenditure by Portal Source
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 border-b text-[11px] text-slate-600 font-medium">
                      <tr>
                        <th className="py-1.5 px-3">Portal</th>
                        <th className="py-1.5 px-3 text-right">Runs</th>
                        <th className="py-1.5 px-3 text-right">Collected</th>
                        <th className="py-1.5 px-3 text-right">Spend (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.by_portal || []).map((p: any) => (
                        <tr key={p.portal} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-semibold text-slate-900">{p.portal}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{p.api_calls}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{p.items_collected}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            ${Number(p.cost_usd).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost by Initiating Profile */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-800 border-b flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    Attribution by Initiating Profile
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 border-b text-[11px] text-slate-600 font-medium">
                      <tr>
                        <th className="py-1.5 px-3">Profile</th>
                        <th className="py-1.5 px-3 text-right">Sessions</th>
                        <th className="py-1.5 px-3 text-right">API Calls</th>
                        <th className="py-1.5 px-3 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.by_profile || []).map((prof: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-medium text-slate-900 truncate max-w-[150px]">
                            {prof.email}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{prof.sessions_count}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{prof.api_calls}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            ${Number(prof.cost_usd).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cost by Target Role */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-800 border-b flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                Top 10 Roles by Scraping Cost
              </div>
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b text-[11px] text-slate-600 font-medium">
                    <tr>
                      <th className="py-1.5 px-3">Role</th>
                      <th className="py-1.5 px-3 text-right">API Calls</th>
                      <th className="py-1.5 px-3 text-right">Jobs Collected</th>
                      <th className="py-1.5 px-3 text-right">Total Cost (USD)</th>
                      <th className="py-1.5 px-3 text-right">Cost / Job</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.by_role || []).map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.role}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{r.api_calls}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{r.items_collected}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          ${Number(r.cost_usd).toFixed(4)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          ${(Number(r.cost_usd) / Math.max(1, r.items_collected || 1)).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Close Financial Analytics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScrapingCostAnalyticsModal;

