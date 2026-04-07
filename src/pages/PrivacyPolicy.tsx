import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <SEO title="Privacy Policy" description="Privacy policy for using HYRIND services." path="/privacy-policy" />
      <Header />
      <main className="flex-1 pt-32 pb-20">
        <div className="container px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold text-[#0d47a1] mb-8">Privacy Policy</h1>
          <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-8 text-neutral-600">
            
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Introduction</h2>
              <p>This privacy policy sets out how HYRIND PRIVATE LIMITED uses and protects any information that you give HYRIND PRIVATE LIMITED when you visit our website and/or agree to purchase from us.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Information We May Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name</li>
                <li>Contact information including email address</li>
                <li>Demographic information such as postcode, preferences and interests, if required</li>
                <li>Other information relevant to customer surveys and/or offers</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Internal record keeping.</li>
                <li>To improve our products and services.</li>
                <li>To send periodic promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.</li>
                <li>To contact you for market research purposes by email, phone, fax or mail if required.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">What We Do With The Information</h2>
              <p>We require this information to understand your needs and provide you with a better service.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Security</h2>
              <p>We are committed to ensuring that your information is secure. In order to prevent unauthorised access or disclosure we have put in suitable measures.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Cookies</h2>
              <p>We use cookies to identify which pages are being used. This helps us analyse data about webpage traffic to improve our website. Cookies do not give us access to your computer or any information about you other than the data you choose to share with us. You can accept or decline cookies through your browser settings.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Controlling Your Personal Information</h2>
              <p>You may choose to restrict the collection or use of your personal information in the following ways:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>When asked to fill in a form on the website, look for the box that you can click to indicate that you do not want the information to be used for direct marketing purposes.</li>
                <li>If you have previously agreed to us using your personal information for direct marketing purposes, you may change your mind at any time by writing to or emailing us at support@hyrind.com</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Sharing and Disclosure</h2>
              <p>We will not sell, distribute or lease your personal information to third parties unless we have your permission or are required by law. We may use your personal information to send you promotional information about third parties if you request this.</p>
            </section>

            <section className="space-y-4 p-6 bg-neutral-50 rounded-xl border border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-900">Contact Us</h2>
              <p className="mb-4">For all inquiries and support, please visit our contact page:</p>
              <a 
                href="https://merchant.razorpay.com/policy/Rn2giKHxuBBdz0/contact_us" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#0d47a1] text-white font-semibold hover:bg-[#0d47a1]/90 transition-all"
              >
                Contact Page
              </a>
            </section>

            <div className="pt-10 flex flex-col items-center gap-4">
              <a 
                href="https://merchant.razorpay.com/policy/Rn2giKHxuBBdz0/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-[#0d47a1]/10 text-[#0d47a1] font-bold hover:bg-[#0d47a1]/20 transition-all border border-[#0d47a1]/20"
              >
                More Details & Razorpay Policies
              </a>
              <p className="text-sm text-neutral-400 font-medium">Last updated: Dec 3 2025</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
