import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { recruitersApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Search, Globe, X, ExternalLink, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const JobDescriptionCell = ({ 
  company, 
  role, 
  description, 
  onReadMore 
}: { 
  company: string; 
  role: string; 
  description?: string; 
  onReadMore: (company: string, role: string, desc: string) => void; 
}) => {
  if (!description) return <span className="text-slate-400">—</span>;
  
  const isLengthy = description.length > 100;
  if (!isLengthy) {
    return <span className="text-xs whitespace-pre-wrap">{description}</span>;
  }
  
  const preview = description.slice(0, 100) + "...";
  return (
    <div className="text-xs text-center">
      <span>{preview}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadMore(company, role, description);
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer block mt-1 mx-auto"
      >
        Read More
      </button>
    </div>
  );
};

export default function JobAlert() {
  const { toast } = useToast();
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobDesc, setActiveJobDesc] = useState<{ company: string; role: string; description: string } | null>(null);

  const [searchRole, setSearchRole] = useState("");
  const [searchCompany, setSearchCompany] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await recruitersApi.getPublicJobAlerts();
        setJobPostings(res.data || []);
      } catch (err: any) {
        console.error("Error fetching job alerts:", err);
        toast({
          title: "Error loading job alerts",
          description: "Could not fetch job alerts. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [toast]);

  const filteredJobs = useMemo(() => {
    return jobPostings.filter((job) => {
      const matchRole = !searchRole || job.role_title?.toLowerCase().includes(searchRole.toLowerCase());
      const matchCompany = !searchCompany || job.company_name?.toLowerCase().includes(searchCompany.toLowerCase());
      return matchRole && matchCompany;
    });
  }, [jobPostings, searchRole, searchCompany]);

  const handleOpenDescription = (company: string, role: string, description: string) => {
    setActiveJobDesc({ company, role, description });
  };

  return (
    <div className="job-alerts-page min-h-screen flex flex-col">
      <SEO 
        title="Job Alerts | HYRIND" 
        description="View real-time job openings submitted and assigned by our recruiter network. Apply directly using the provided links." 
        path="/job-alert" 
      />
      <Header />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .job-alerts-page {
          background-color: #fcfdfe;
          color: #1e293b;
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
        }

        .hero-section {
          background: radial-gradient(circle at top right, #1e40af, #0d47a1);
          color: white;
          padding: 160px 24px 100px;
          text-align: center;
          clip-path: ellipse(150% 100% at 50% 0%);
          position: relative;
          overflow: hidden;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.1;
          pointer-events: none;
        }

        .hero-content {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .hero-title {
          font-size: clamp(3rem, 8vw, 4.5rem);
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          opacity: 0.9;
          font-weight: 300;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .job-alerts-main {
          padding: 80px 24px;
          background-color: #f8fafc;
          flex-grow: 1;
        }

        .job-alerts-container {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        .filter-card {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
          background-color: white;
          border-radius: 16px;
        }

        .table-card {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
          background-color: white;
          border-radius: 16px;
          overflow: hidden;
        }

        .apply-btn {
          background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
          color: white;
          border: none;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 10px rgba(13, 71, 161, 0.2);
        }

        .apply-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(13, 71, 161, 0.3);
          background: linear-gradient(135deg, #1565c0 0%, #1e40af 100%);
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Live Job Alerts</h1>
          <p className="hero-subtitle">
            Explore live job listings sourced and vetted by our recruitment partners. Any visitor can apply directly.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="job-alerts-main">
        <div className="job-alerts-container space-y-8">
          {/* Filters Panel */}
          <Card className="filter-card">
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="search-role" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Search by Role
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="search-role"
                      placeholder="e.g. Software Engineer, Product Manager"
                      value={searchRole}
                      onChange={(e) => setSearchRole(e.target.value)}
                      className="pl-10 h-10 border-slate-200 focus-visible:ring-primary rounded-xl"
                    />
                    {searchRole && (
                      <button
                        onClick={() => setSearchRole("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-company" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Search by Company
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="search-company"
                      placeholder="e.g. Google, Amazon"
                      value={searchCompany}
                      onChange={(e) => setSearchCompany(e.target.value)}
                      className="pl-10 h-10 border-slate-200 focus-visible:ring-primary rounded-xl"
                    />
                    {searchCompany && (
                      <button
                        onClick={() => setSearchCompany("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings Table */}
          <Card className="table-card">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Globe className="h-5 w-5 text-primary" />
                All Available Job Alerts ({filteredJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={filteredJobs}
                isLoading={loading}
                emptyMessage="No job alerts match your search."
                pageSize={10}
                columns={[
                  {
                    header: "Company Name",
                    accessorKey: "company_name",
                    sortable: true,
                    className: "font-semibold text-slate-700 text-sm py-4",
                  },
                  {
                    header: "Role Title",
                    accessorKey: "role_title",
                    sortable: true,
                    className: "text-slate-800 font-bold text-sm py-4",
                  },
                  {
                    header: "Job Description",
                    render: (job: any) => (
                      <JobDescriptionCell
                        company={job.company_name}
                        role={job.role_title}
                        description={job.job_description}
                        onReadMore={handleOpenDescription}
                      />
                    ),
                    className: "max-w-md py-4",
                  },
                  {
                    header: "Job Link",
                    render: (job: any) => (
                      job.job_url ? (
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="apply-btn px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition-all text-xs"
                        >
                          Apply Now
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )
                    ),
                    className: "py-4",
                  },
                  {
                    header: "Log Date",
                    sortable: true,
                    accessorKey: "log_date",
                    render: (job: any) => (
                      <div className="flex items-center gap-1 text-slate-500 font-medium text-xs justify-center">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDate(job.log_date || job.created_at)}</span>
                      </div>
                    ),
                    className: "py-4",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Description Modal */}
      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 font-sans">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Job Description</span>
              <span className="text-slate-800 font-extrabold text-xl">{activeJobDesc?.role}</span>
              <span className="text-primary text-sm font-semibold">{activeJobDesc?.company}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-slate-600 max-h-[50vh] overflow-y-auto pr-2 font-medium">
            {activeJobDesc?.description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
