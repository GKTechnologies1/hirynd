import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/DataTable";
import { Activity, Users, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatDate } from "@/lib/utils";

const AdminAnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("7days");
  const [data, setData] = useState<any>(null);
  
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: () => analyticsApi.getDashboardStats(dateRange).then((res) => res.data),
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
    
    data.trend_chart.forEach((row: any) => {
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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const { kpis, trend_chart, top_pages, login_activity } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Overview</h2>
          <p className="text-muted-foreground">Monitor website traffic and user activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
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
          <Button variant="outline" size="icon" onClick={handleExport} title="Export Data">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.active_now}</div>
            <p className="text-xs text-muted-foreground">Visitors in last 5 minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total_page_views}</div>
            <p className="text-xs text-muted-foreground">Total for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.unique_visitors}</div>
            <p className="text-xs text-muted-foreground">Total for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.logged_in_today}</div>
            <p className="text-xs text-muted-foreground">Unique authenticated users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Visitor & Page Views Trend</CardTitle>
            <CardDescription>Daily breakdown for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend_chart}>
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

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Login Activity</CardTitle>
            <CardDescription>Authentication stats for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Successful Logins</span>
                <span className="font-bold text-green-600">{login_activity.successful_logins}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Failed Logins</span>
                <span className="font-bold text-destructive">{login_activity.failed_logins}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Active Candidates</span>
                <span className="font-bold">{login_activity.active_candidates}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Active Recruiters</span>
                <span className="font-bold">{login_activity.active_recruiters}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="font-medium">Total Platform Users</span>
                <span className="font-bold">{kpis.total_registered_users}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            data={top_pages}
            searchKey="url_path"
            searchPlaceholder="Filter pages..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsPage;
