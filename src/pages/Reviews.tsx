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
    const count = normalizedReviews.filter((r) => Math.round(r.rating) === stars).length;
    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
    return { stars, count, percentage };
  });

  // Filter & Search
  const filteredReviews = normalizedReviews.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.heading && r.heading.toLowerCase().includes(query)) ||
      (r.text && r.text.toLowerCase().includes(query))
    );
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

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <SEO title="Reviews" description="Hear from candidates who landed jobs through HYRIND's recruiter-led profile marketing and interview support." path="/reviews" />
      <Header />
      <main className="flex-1">
        <section className="bg-white border-b border-neutral-200 pt-32 pb-10 lg:pt-40 lg:pb-12">
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
            <div className="flex flex-col lg:flex-row gap-6 items-stretch mb-12">
              {/* Left Card: Search & Sort */}
              <div className="flex-1 bg-white border border-neutral-200 rounded-3xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
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

              {/* Right Card: Ratings Summary */}
              <div className="w-full lg:w-[450px] bg-white border border-neutral-200 rounded-3xl p-5 flex items-center justify-between gap-6 shadow-sm">
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

                {/* Vertical Divider */}
                <div className="w-[1px] h-12 bg-neutral-100 hidden sm:block" />

                {/* Star Progress Bars */}
                <div className="flex-1 space-y-1.5 min-w-[180px]">
                  {starBuckets.map((bucket) => (
                    <div key={bucket.stars} className="flex items-center gap-2 text-[10px]">
                      <span className="w-8 font-bold text-neutral-500 whitespace-nowrap text-right">
                        {bucket.stars} Star
                      </span>
                      <div className="flex-1 h-2 bg-neutral-50 border border-neutral-100 rounded-full overflow-hidden">
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
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {sortedReviews.map((t, i) => (
                  <motion.div
                    key={`${t.name}-${t.index}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="flex flex-col flex-1">
                      <Quote className="mb-5 h-8 w-8 text-[#0d47a1]/20" />
                      
                      {t.imageUrl && (
                        <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-100 max-h-72 flex items-center justify-center bg-neutral-50 shadow-inner">
                          <img src={t.imageUrl} alt={`${t.name} review highlight`} className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
                        </div>
                      )}

                      {t.heading && (
                        <h4 className="text-base font-bold text-neutral-900 mb-3 leading-snug">
                          {t.heading}
                        </h4>
                      )}

                      <p className="mb-8 text-sm leading-relaxed text-neutral-700 flex-1">"{t.text}"</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-auto">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {t.avatarUrl ? (
                          <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border border-neutral-200 shadow-sm">
                            <img src={t.avatarUrl} alt={t.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          // initials avatar for dynamic reviews
                          t.heading && (
                            <div className="h-10 w-10 shrink-0 rounded-full bg-[#0d47a1]/10 text-[#0d47a1] flex items-center justify-center font-bold text-sm shadow-sm border border-[#0d47a1]/10">
                              {t.name?.[0]?.toUpperCase()}
                            </div>
                          )
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate text-sm">{t.name}</p>
                          {t.role && <p className="text-xs font-medium text-neutral-500 truncate">{t.role}</p>}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <StarRating rating={t.rating} size={5} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;
