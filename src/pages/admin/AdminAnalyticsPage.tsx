import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { Activity, Users, FileText, Download, RefreshCw, Laptop, Smartphone, Tablet, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatDate } from "@/lib/utils";

const AdminAnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("7days");
  const [data, setData] = useState<any>(null);
  
  const { data: analyticsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: () => analyticsApi.getDashboardStats(dateRange).then((res) => res.data),
    refetchInterval: 30000, // auto-refresh every 30 seconds
  });

  useEffect(() => {
    if (analyticsData) {
      setData(analyticsData);
    }
  }, [analyticsData]);

  const handleExport = () => {
    if (!data) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Views,Unique Visitors\n";
    
    (data.trend_chart || []).forEach((row: any) => {
      csvContent += `${row.date},${row.views},${row.unique_visitors}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hyrind_analytics_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { kpis, trend_chart, top_pages, login_activity, device_breakdown, recent_activity } = data;

  const getDeviceIcon = (device: string) => {
    switch (device?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4 text-sky-500" />;
      case "tablet":
        return <Tablet className="h-4 w-4 text-indigo-500" />;
      default:
        return <Laptop className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200";
      case "recruiter":
      case "team_lead":
      case "team_manager":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
      case "candidate":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Analytics & User Tracking</h2>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-muted-foreground">Monitor platform traffic, visitor behavior, and real-time user activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5"
            title="Refresh analytics data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExport} title="Export CSV Data">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-secondary/20 bg-secondary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{kpis?.active_now ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active in last 5 minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{kpis?.total_page_views ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{kpis?.unique_visitors ?? 0}</div>
            <p className="text-xs text-muted-foreground">Distinct visitor sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins Today</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{kpis?.logged_in_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">Unique authenticated users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Traffic & Page Views Trend</CardTitle>
            <CardDescription>Daily breakdown for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend_chart || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="views" name="Page Views" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unique_visitors" name="Unique Visitors" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Login & User Activity</CardTitle>
              <CardDescription>User metrics for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-medium">Successful Logins</span>
                  <span className="font-bold text-green-600">{login_activity?.successful_logins ?? 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-medium">Failed Logins</span>
                  <span className="font-bold text-destructive">{login_activity?.failed_logins ?? 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-medium">Active Candidates</span>
                  <span className="font-bold">{login_activity?.active_candidates ?? 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-medium">Active Recruiters</span>
                  <span className="font-bold">{login_activity?.active_recruiters ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Platform Users</span>
                  <span className="font-bold">{kpis?.total_registered_users ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          {device_breakdown && device_breakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {device_breakdown.map((d: any) => (
                    <div key={d.device_type || 'other'} className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-muted/30">
                      {getDeviceIcon(d.device_type)}
                      <span className="text-xs font-semibold capitalize mt-1">{d.device_type || 'desktop'}</span>
                      <span className="text-sm font-bold text-muted-foreground mt-0.5">{d.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Live User & Visitor Activity Tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent User & Visitor Activity Tracking</CardTitle>
              <CardDescription>Real-time log of recent page visits, authenticated users, and devices</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-mono">
              Last {recent_activity?.length || 0} visits
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                header: "User / Visitor",
                render: (row: any) => (
                  <div className="flex flex-col gap-0.5">
                    {row.user_email ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs">{row.user_name || row.user_email}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-medium ${getRoleBadgeColor(row.user_role)}`}>
                            {row.user_role}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">{row.user_email}</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Guest Visitor</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-muted text-muted-foreground rounded font-mono truncate max-w-[120px]">
                          {row.visitor_id?.slice(0, 10)}...
                        </span>
                      </div>
                    )}
                  </div>
                ),
                className: "min-w-[200px]"
              },
              {
                header: "Page Visited",
                render: (row: any) => (
                  <span className="font-mono text-xs bg-muted/60 px-2 py-1 rounded text-primary">
                    {row.url_path}
                  </span>
                ),
                className: "min-w-[180px]"
              },
              {
                header: "Device",
                render: (row: any) => (
                  <div className="flex items-center gap-1.5 capitalize text-xs">
                    {getDeviceIcon(row.device_type)}
                    <span>{row.device_type || "desktop"}</span>
                  </div>
                )
              },
              {
                header: "Referrer",
                render: (row: any) => (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                    {row.referrer || "Direct"}
                  </span>
                )
              },
              {
                header: "IP Address",
                render: (row: any) => (
                  <span className="text-xs font-mono text-muted-foreground">
                    {row.ip_address || "—"}
                  </span>
                )
              },
              {
                header: "Time",
                render: (row: any) => (
                  <span className="text-xs text-muted-foreground">
                    {row.timestamp ? formatDate(row.timestamp) : "—"} {row.timestamp ? new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
                  </span>
                ),
                className: "text-right"
              }
            ]}
            data={recent_activity || []}
            searchKey="url_path"
            searchPlaceholder="Filter recent activity by URL path..."
          />
        </CardContent>
      </Card>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
          <CardDescription>Most visited pages during the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "URL Path", accessorKey: "url_path", className: "font-mono text-sm" },
              { header: "Page Views", accessorKey: "views", className: "text-right font-semibold" },
              { header: "Unique Visitors", accessorKey: "unique_visitors", className: "text-right font-semibold" },
            ]}
            data={top_pages || []}
            searchKey="url_path"
            searchPlaceholder="Filter pages..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsPage;
