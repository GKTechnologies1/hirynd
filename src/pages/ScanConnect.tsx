import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Instagram, Linkedin } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/Footer";

const links = [
  { icon: Instagram, label: "Instagram", url: "https://www.instagram.com/hyrind_usa?igsh=NzZhcjJ1cmFzbXdu", color: "bg-gradient-to-br from-pink-500 to-amber-500" },
  { icon: Linkedin, label: "LinkedIn", url: "https://linkedin.com/company/hyrind", color: "bg-blue-600" },
  { icon: WhatsAppIcon, label: "WhatsApp Broadcast", url: "https://Wa.me/+1-314-354-0634/", color: "bg-green-600" },
];

const ScanConnect = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20">
        <div className="container">
          <div className="mx-auto max-w-md text-center">
            <h1 className="mb-2 text-3xl font-bold text-foreground">HYRIND</h1>
            <p className="mb-10 text-muted-foreground">Connect with us on social media</p>
            <div className="space-y-4">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-elevated flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:scale-[1.02]"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${link.color}`}>
                    <link.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-card-foreground">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ScanConnect;
