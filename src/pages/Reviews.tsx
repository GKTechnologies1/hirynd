import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import SEO from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Quote, Search } from "lucide-react";
import { reviewsApi } from "@/services/api";
import { StarRating } from "@/components/ui/StarRating";

const testimonials = [
  {
    name: "Priya M.",
    role: "Software Engineer",
    text: "HYRIND completely changed my job search experience. My recruiter optimized my resume for every application and I had full visibility into where my profile was being submitted. The daily submission logs in my portal kept me informed at every step. I landed a role within 6 weeks.",
  },
  {
    name: "Ahmed R.",
    role: "Data Analyst",
    text: "The screening call practice was a game-changer. I used to freeze during recruiter calls, but after multiple mock sessions and detailed feedback from my HYRIND team, I felt confident and prepared for every conversation. The STAR method coaching made a real difference.",
  },
  {
    name: "Jessica L.",
    role: "Business Analyst",
    text: "What I appreciated most was the transparency. I could see daily how many applications were submitted, which companies, and the status of each. No other service gave me that level of visibility. My recruiter treated my job search like their own priority.",
  },
  {
    name: "Ravi K.",
    role: "Full Stack Developer",
    text: "As an international student on OPT, I was overwhelmed by the US job market. HYRIND's team guided me through everything — resume format, interview prep, role-specific training, and screening call practice. They understood the visa complexities and tailored their approach accordingly. Highly recommend.",
  },
  {
    name: "Sarah T.",
    role: "Product Manager",
    text: "The dedicated recruiter model is what sets HYRIND apart. My recruiter knew my goals, my strengths, and marketed me accordingly. It felt like having a career partner, not just a service. The weekly check-ins and strategy adjustments were invaluable.",
  },
  {
    name: "Michael C.",
    role: "QA Engineer",
    text: "I was skeptical at first, but the results spoke for themselves. Within the first month, I had multiple screening calls and two interviews lined up. The daily submission logs, interview coaching, and recruiter outreach to hiring managers made all the difference in my career outcome.",
  },
];

const Reviews = () => {
  const [dynamicReviews, setDynamicReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPublicReviews = async () => {
      try {
        const { data } = await reviewsApi.listPublic();
        if (data && data.length > 0) {
          setDynamicReviews(data);
        }
      } catch (err) {
        console.error("Failed to fetch public reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicReviews();
  }, []);
  const [sortBy, setSortBy] = useState<'latest' | 'highest' | 'lowest'>('latest');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStars, setSelectedStars] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedStars(null);
  }, [searchQuery, sortBy]);

  const reviewsToShow = dynamicReviews.length > 0 ? dynamicReviews : testimonials;

  const normalizedReviews = reviewsToShow.map((r: any, idx: number) => ({
    name: r.candidate_name || r.name,
    role: r.candidate_name ? null : r.role, // Remove subtag for dynamic reviews, keep specific role for testimonials
    heading: r.job_title || null,
    text: r.review_text || r.text,
    rating: r.rating !== undefined ? r.rating : 5.0,
    imageUrl: r.image_url || null,
    avatarUrl: r.candidate_avatar || null,
    created_at: r.created_at || null,
    index: idx,
  }));

  // Calculations for summary card
  const totalCount = normalizedReviews.length;
  const averageRating = totalCount > 0 
    ? Number((normalizedReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1))
    : 0;

  const starBuckets = [5, 4, 3, 2, 1].map((stars) => {
    const count = normalizedReviews.filter((r) => {
      const rating = r.rating;
      if (stars === 1) return rating > 0 && rating <= 1;
      if (stars === 2) return rating > 1 && rating <= 2;
      if (stars === 3) return rating > 2 && rating <= 3;
      if (stars === 4) return rating > 3 && rating <= 4;
      if (stars === 5) return rating > 4 && rating <= 5;
      return false;
    }).length;
    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
    return { stars, count, percentage };
  });

  // Filter & Search
  const filteredReviews = normalizedReviews.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.heading && r.heading.toLowerCase().includes(query)) ||
      (r.text && r.text.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (selectedStars !== null) {
      const rating = r.rating;
      if (selectedStars === 1) return rating > 0 && rating <= 1;
      if (selectedStars === 2) return rating > 1 && rating <= 2;
      if (selectedStars === 3) return rating > 2 && rating <= 3;
      if (selectedStars === 4) return rating > 3 && rating <= 4;
      if (selectedStars === 5) return rating > 4 && rating <= 5;
    }

    return true;
  });

  // Sort
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'highest') {
      return b.rating - a.rating;
    }
    if (sortBy === 'lowest') {
      return a.rating - b.rating;
    }
    
    // sortBy === 'latest'
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (a.created_at) return -1;
    if (b.created_at) return 1;
    return a.index - b.index;
  });

  const reviewsPerPage = 15;
  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const paginatedReviews = sortedReviews.slice(startIndex, startIndex + reviewsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <SEO title="Reviews" description="Hear from candidates who landed jobs through HYRIND's recruiter-led profile marketing and interview support." path="/reviews" />
      <Header />
      <main className="flex-1">
        <section className="bg-white border-b border-neutral-200 pt-20 pb-8 lg:pt-24 lg:pb-10">
          <div className="container px-4 md:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-[#0d47a1] sm:text-5xl">What Our Candidates Say</h1>
              <p className="mt-6 text-lg text-neutral-600">
                Real feedback from job seekers who trusted HYRIND with their career journey. Our candidates value the transparency, recruiter support, and real results.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="container px-4 md:px-6">
            
            {/* Unified Search, Sort, and Rating layout matching user image */}
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row gap-6 items-center justify-between mb-12">
              {/* Left Part: Search & Sort */}
              <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center justify-between">
                {/* Search Input */}
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search reviews by candidate name, title, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d47a1] focus:border-transparent transition-all"
                  />
                </div>

                {/* Sort Buttons */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
                  <span className="text-sm font-medium text-neutral-500 whitespace-nowrap">Sort by:</span>
                  <button
                    onClick={() => setSortBy('latest')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      sortBy === 'latest'
                        ? 'bg-[#0d47a1] text-white shadow-sm'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
                    }`}
                  >
                    Latest
                  </button>
                  <button
                    onClick={() => setSortBy('highest')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      sortBy === 'highest'
                        ? 'bg-[#0d47a1] text-white shadow-sm'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
                    }`}
                  >
                    Highest Stars
                  </button>
                  <button
                    onClick={() => setSortBy('lowest')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      sortBy === 'lowest'
                        ? 'bg-[#0d47a1] text-white shadow-sm'
                        : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
                    }`}
                  >
                    Lowest Stars
                  </button>
                </div>
              </div>

              {/* Vertical Divider (between Left Part and Right Part) */}
              <div className="hidden lg:block w-[1px] h-14 bg-neutral-200 mx-2" />

              {/* Right Part: Ratings Summary */}
              <div className="w-full lg:w-auto flex items-center justify-between gap-6 shrink-0">
                {/* Overall score */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-4xl font-extrabold text-neutral-900 leading-none">{averageRating.toFixed(1)}</span>
                  <div className="flex flex-col items-start justify-center">
                    <StarRating rating={averageRating} size={5} />
                    <span className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                      Based on {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                </div>

                {/* Inner Vertical Divider inside Ratings Summary */}
                <div className="w-[1px] h-12 bg-neutral-100 hidden sm:block" />

                {/* Star Progress Bars */}
                <div className="flex-1 space-y-1.5 min-w-[180px]">
                  {starBuckets.map((bucket) => (
                    <div 
                      key={bucket.stars}
                      onClick={() => setSelectedStars(prev => prev === bucket.stars ? null : bucket.stars)}
                      className={`flex items-center gap-2 text-[10px] cursor-pointer hover:bg-neutral-50 px-2 py-0.5 rounded-lg transition-all ${
                        selectedStars === bucket.stars ? "ring-1 ring-[#0d47a1] bg-neutral-50 font-semibold" : ""
                      }`}
                      title={`Click to filter by ${bucket.stars} stars`}
                    >
                      <span className="w-8 font-bold text-neutral-500 whitespace-nowrap text-right">
                        {bucket.stars} Star
                      </span>
                      <div className="flex-1 h-2 bg-neutral-50 border border-neutral-100 rounded-full overflow-hidden min-w-[60px]">
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${bucket.percentage}%` }}
                        />
                      </div>
                      <span className="w-4 font-semibold text-neutral-400 text-left">
                        {bucket.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="h-8 w-8 border-4 border-[#0d47a1] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-neutral-500 font-medium">Loading reviews...</p>
              </div>
            ) : sortedReviews.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-neutral-200 shadow-sm">
                <p className="text-neutral-500 font-medium">No reviews found matching your search criteria.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-6 w-full">
                  {paginatedReviews.map((t, i) => {
                    const reviewId = `${t.name}-${t.index}`;

                    return (
                      <motion.div
                        key={reviewId}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: (i % reviewsPerPage) * 0.05 }}
                        className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm transition-shadow hover:shadow-md flex flex-col md:flex-row gap-6 items-start w-full"
                      >
                        {/* Profile Info - Left column on desktop, top row on mobile */}
                        <div className="flex items-center md:items-start gap-4 md:flex-col md:w-48 shrink-0 w-full md:w-auto pb-4 md:pb-0 border-b border-neutral-100 md:border-b-0 md:border-r md:border-neutral-100 pr-0 md:pr-6">
                          {t.avatarUrl ? (
                            <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden border border-neutral-200 shadow-sm">
                              <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            // initials avatar for dynamic reviews
                            t.heading && (
                              <div className="h-12 w-12 shrink-0 rounded-full bg-[#0d47a1]/10 text-[#0d47a1] flex items-center justify-center font-bold text-base shadow-sm border border-[#0d47a1]/10">
                                {t.name?.[0]?.toUpperCase()}
                              </div>
                            )
                          )}
                          <div className="min-w-0 md:mt-1">
                            <p className="font-bold text-neutral-900 truncate text-sm">{t.name}</p>
                            {t.role && <p className="text-xs font-medium text-neutral-500 truncate mt-0.5">{t.role}</p>}
                            <div className="mt-2 flex items-center gap-1">
                              <StarRating rating={t.rating} size={5} />
                            </div>
                          </div>
                        </div>

                        {/* Review Content - Right column on desktop, main body on mobile */}
                        <div className="flex-1 min-w-0 space-y-4">
                          <Quote className="h-6 w-6 text-[#0d47a1]/20" />
                          
                          {t.heading && (
                            <h4 className="text-base font-bold text-neutral-900 leading-snug">
                              {t.heading}
                            </h4>
                          )}

                          <p className="text-sm leading-relaxed text-neutral-700 font-normal whitespace-pre-line">
                            "{t.text}"
                          </p>

                          {t.imageUrl && (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-100 max-h-72 max-w-md flex items-center justify-center bg-neutral-50 shadow-inner">
                              <img src={t.imageUrl} alt={`${t.name} review highlight`} className="w-full h-full object-contain transition-transform duration-500 hover:scale-[1.02]" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-600 focus:outline-none"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-9 w-9 text-xs font-bold rounded-xl transition-all focus:outline-none ${
                            currentPage === pageNum
                              ? "bg-[#0d47a1] text-white shadow-sm"
                              : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-600 focus:outline-none"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;
