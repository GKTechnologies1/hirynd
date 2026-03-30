import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_ADDRESS = "HYRIND <noreply@hyrind.com>";
const REPLY_TO = "support@hyrind.com";
const DEFAULT_SITE_URL = "https://hyrnd.netlify.app";

interface EmailRequest {
  type: "interest_confirmation" | "admin_notification" | "referral_email";
  to: string;
  data: Record<string, string>;
}

async function getSiteUrl(req?: Request): Promise<string> {
  try {
    const { data } = await supabase
      .from("admin_config")
      .select("config_value")
      .eq("config_key", "site_url")
      .single();
    if (data?.config_value) return data.config_value.replace(/\/+$/, "");
  } catch (e) {
    console.warn("Failed to read site_url from admin_config:", e);
  }
  if (req) {
    const origin = req.headers.get("origin");
    if (origin) return origin.replace(/\/+$/, "");
  }
  return DEFAULT_SITE_URL;
}

async function logEmail(email_type: string, recipient_email: string, status: string, error_message?: string) {
  try {
    await supabase.from("email_logs").insert({
      email_type,
      recipient_email,
      status,
      error_message: error_message || null,
    });
  } catch (e) {
    console.error("Failed to log email:", e);
  }
}

async function getAdminEmails(): Promise<string[]> {
  const { data } = await supabase
    .from("admin_config")
    .select("config_value")
    .eq("config_key", "admin_notification_email")
    .single();

  if (data?.config_value) {
    const emails = data.config_value.split(",").map((e: string) => e.trim()).filter(Boolean);
    if (emails.length > 0) return emails;
  }
  console.warn("No admin_notification_email configured in admin_config");
  return [];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing type or to" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const siteUrl = await getSiteUrl(req);

    let subject = "";
    let html = "";
    let recipients: string[] = [to];

    switch (type) {
      case "interest_confirmation":
        subject = "Thank you for your interest in HYRIND!";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1e3a5f;">Welcome to HYRIND!</h1>
            <p>Hi ${data.name || "there"},</p>
            <p>Thank you for expressing interest in HYRIND's profile marketing and career support services.</p>
            <p>Our team will review your submission and reach out within <strong>24–48 hours</strong> to schedule a discovery call.</p>
            <h3>What happens next?</h3>
            <ol>
              <li>A team member will contact you to learn more about your career goals</li>
              <li>We'll assess your profile and recommend the best service plan</li>
              <li>Once approved, you'll get access to your personal candidate portal</li>
            </ol>
            <p>In the meantime, feel free to explore our website: <a href="${siteUrl}">${siteUrl}</a></p>
            <p>Best regards,<br/>The HYRIND Team</p>
          </div>
        `;
        break;

      case "admin_notification":
        subject = `New Interest Form: ${data.name || "Unknown"}`;
        recipients = await getAdminEmails();
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">New Interest Form Submission</h2>
            <table style="border-collapse: collapse; width: 100%;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.name || "—"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.email || "—"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.phone || "—"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">University</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.university || "—"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Visa Status</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.visa_status || "—"}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Referral Source</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.referral_source || "—"}</td></tr>
            </table>
            <p style="margin-top: 16px;"><a href="${siteUrl}/admin-dashboard">View in Admin Dashboard</a></p>
          </div>
        `;
        break;

      case "referral_email":
        subject = `${data.referrer_name || "A friend"} thinks you'd be great for HYRIND!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1e3a5f;">You've Been Referred to HYRIND!</h1>
            <p>Hi ${data.friend_name || "there"},</p>
            <p><strong>${data.referrer_name || "Someone you know"}</strong> thinks you'd benefit from HYRIND's career support services.</p>
            ${data.referral_note ? `<p><em>"${data.referral_note}"</em></p>` : ""}
            <h3>What is HYRIND?</h3>
            <p>HYRIND is a recruiter-led profile marketing platform that helps job seekers land interviews and full-time roles through:</p>
            <ul>
              <li>Dedicated recruiter support</li>
              <li>Daily job submissions on your behalf</li>
              <li>Resume optimization and interview preparation</li>
            </ul>
            <p><a href="${siteUrl}/contact" style="display: inline-block; padding: 12px 24px; background: #1e3a5f; color: white; text-decoration: none; border-radius: 6px;">Learn More & Get Started</a></p>
            <p>Best regards,<br/>The HYRIND Team</p>
          </div>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    const emailResponse = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipients,
      subject,
      html,
      reply_to: REPLY_TO,
    });

    console.log("Email sent:", type, recipients, emailResponse);
    await logEmail(type, recipients.join(","), "sent");

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    try {
      const body = await req.clone().json().catch(() => ({}));
      await logEmail(body.type || "unknown", body.to || "unknown", "failed", error.message);
    } catch (_) {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
