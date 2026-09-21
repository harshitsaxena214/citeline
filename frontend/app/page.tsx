import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Capabilities } from "@/components/landing/capabilities";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { UseCases } from "@/components/landing/use-cases";
import { Grounding } from "@/components/landing/grounding";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Citeline — Document Intelligence, Grounded in Your Sources",
  description:
    "Citeline turns dense PDFs into clear answers, summaries, and comparisons grounded in the source. Ask questions, summarize, and compare documents.",
};

export default function LandingPage() {
  return (
    <div className="bg-[#F5F1E8]">
      <Navbar />
      <main>
        <Hero />
        <Capabilities />
        <HowItWorks />
        <ProductShowcase />
        <UseCases />
        <Grounding />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
