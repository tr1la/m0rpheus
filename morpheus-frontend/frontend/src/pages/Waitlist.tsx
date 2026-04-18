import { Waitlist } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import WaveBackground from "../../../src/ui/lightswind/wave-background";
// Clerk uses default light theme
import WaitlistStatusCheck from "@/components/waitlist/WaitlistStatusCheck";

export default function WaitlistPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      {/* Hide global header on this page */}
      <style dangerouslySetInnerHTML={{ __html: `header { display: none !important; }` }} />

      {/* Background */}
      <WaveBackground 
      className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-foreground/5 z-1"></div>

      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <button onClick={() => navigate("/")} aria-label="Back to homepage" className="button-outline text-foreground px-3 py-1.5 rounded-[1px] flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      <main className="relative z-10 w-full max-w-[1450px]">
        {/* Hero Header (CTA-style, aligned like homepage sections) */}
        <div className="mx-auto max-w-4xl text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/logo-watermark.png" alt="Morpheus Logo" className="w-10 h-10 object-contain hover:animate-spin transition-all duration-300" />
            <span className="text-2xl font-medium text-foreground font-outfit">Morpheus</span>
          </div>
          <h1 className="text-xl md:text-4xl font-bold tracking-tight text-foreground leading-relaxed flex flex-wrap items-center justify-center gap-2">
            Join the 
            <span className="inline-flex align-middle px-3 py-1 rounded-lg ml-1 mr-1 button-gradient text-[#1F2937]">
              waitlist
            </span>
            - Get
            <span className="inline-flex align-middle px-3 py-1 rounded-lg ml-1 button-gradient text-[#1F2937]">
              early access
            </span>
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground">
            Watch the product demo, then join the waitlist to be the first to try Morpheus.
          </p>
        </div>

        {/* Two-column layout (simple, no card, no padding) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-auto xl:gap-auto place-content-center lg:min-h-0 lg:place-content-stretch">
          {/* Video placeholder (left, 2/3 width) */}
          <section className="lg:col-span-2 flex items-center justify-center order-2 lg:order-1 z-0">
              <video className="w-full rounded-2xl border border-border max-w-5xl aspect-video object-cover bg-card/50" controls preload="auto" loop={true} autoPlay src="/video-demo-main.mov">
              </video>
          </section>

          {/* Waitlist (right, 1/3 width) */}
          <section className="order-1 lg:order-2 flex flex-col items-center justify-center z-10 gap-4">
            <div className="w-full bg-muted shadow-none border rounded-lg p-4">
              <WaitlistStatusCheck />
            </div>
            <Waitlist
            appearance={{
                  elements: {
                    headerTitle: "text-foreground",
                    headerSubtitle: "text-foreground",
                    formButtonPrimary: "w-full button-gradient",
                    card: "bg-muted shadow-none border",
                    socialButtonsBlockButton: "w-full button-gradient mb-4",
                    dividerLine: "bg-border",
                    fontFamily: "Inter",
                    dividerText: "text-xs text-muted-foreground",
                    formFieldInput: "bg-white border-border text-foreground",
                    formFieldLabel: "text-sm font-medium text-foreground",
                    footerActionLink: "text-foreground hover:text-accent hover:underline",
                    identityPreviewText: "text-muted-foreground",
                    formFieldSuccessText: "text-green-700",
                    formFieldErrorText: "text-red-600"

                   },
                  variables: {
                    colorText: "#1F2937",
                    colorBackground: "#FFF9F5",
                  },
                  layout: {
                    unsafe_disableDevelopmentModeWarnings: true,
                    animations: true,
                  }
                }}
                />
          </section>
        </div>
      </main>
    </div>
  );
}


