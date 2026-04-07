import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";

const Terms = () => {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <SEO title="Terms & Conditions" description="Terms and conditions for using HYRIND services." path="/terms" />
      <Header />
      <main className="flex-1 pt-32 pb-20">
        <div className="container px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold text-[#0d47a1] mb-8">Terms and Conditions</h1>
          <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-8 text-neutral-600">
            
            <section className="space-y-4">
              <p className="text-right text-sm text-neutral-400 font-medium">Effective Date: November 18, 2025</p>
              <p>Welcome to HYRIND. These Terms and Conditions ("Terms") govern your use of our web platform and services, which are designed to assist Master's students, especially F-1 OPT holders, in their career advancement. By accessing or using our services, you agree to be bound by these Terms.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">1. Eligibility and Account Creation</h2>
              <p>Our services are primarily offered to individuals who are Master's students or F-1 OPT holders. You must provide accurate and complete information during the interest form and intake questionnaire process. Account activation and access to marketing services are subject to <strong>final approval by the HYRIND Admin team.</strong></p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">2. Billing and Payments</h2>
              <ul className="list-disc pl-6 space-y-3">
                <li><span className="font-bold text-neutral-900">Setup Fee:</span> A <strong>one-time setup charge</strong> is required upon completing the setup payment phase of the onboarding flow. This fee is non-refundable unless otherwise stated in our Refund Policy.</li>
                <li><span className="font-bold text-neutral-900">Subscription:</span> You agree to a <strong>recurring monthly subscription fee</strong> which will be charged on your designated 'marketing start date' and subsequently on the same day each month (subject to month-end edge rules).</li>
                <li><span className="font-bold text-neutral-900">Payment Method:</span> You must provide a valid payment method (card) for the recurring charges, which will be tokenized and stored securely by our payment aggregator, Xflow.</li>
                <li><span className="font-bold text-neutral-900">Payment Failure:</span> If a recurring payment fails, we will follow a defined retry policy (e.g., +1 day, +3 days, +7 days). If persistent failure occurs (e.g., after 3 retries), your status will be set to 'past due', and the marketing of your profile will be <strong>paused</strong> until the account is settled.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">3. Use of Resume and Profile</h2>
              <p>The core service involves HYRIND (via Admin) building or refining your professional resume and skills roadmap, and subsequently <strong>marketing your profile monthly</strong> to Recruiters/Operators and external CRM/ATS systems. By agreeing to these Terms, you provide consent for this sharing and marketing activity.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">4. Termination of Service</h2>
              <p>We reserve the right to suspend or terminate your service and access to the platform for reasons including, but not limited to: material breach of these Terms, failure to make required payments, or providing fraudulent or misleading information. You may cancel your subscription at any time; however, the service will remain active until the next billing date, and no partial refunds will be issued for the current paid month.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">5. Warranties and Limitation of Liability</h2>
              <p>HYRIND provides its service on an "as-is" basis. We do not guarantee job placement or specific outcomes from the marketing activities. Our liability shall be limited to the fees you have paid to us for the specific month in which the claim arose.</p>
            </section>

            <div className="pt-10 flex flex-col items-center gap-4">
              <a 
                href="https://merchant.razorpay.com/policy/Rn2giKHxuBBdz0/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-[#0d47a1]/10 text-[#0d47a1] font-bold hover:bg-[#0d47a1]/20 transition-all border border-[#0d47a1]/20"
              >
                More Details & Razorpay Policies
              </a>
              <p className="text-sm text-neutral-400 font-medium">Last updated: April 7, 2026</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
