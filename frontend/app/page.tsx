import { LandingPage } from "@/components/landing/landing-page";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Educore",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "Sistema integral de gestion escolar todo-en-uno para escuelas en Mexico y Latinoamerica.",
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    priceCurrency: "MXN",
  },
  publisher: {
    "@type": "Organization",
    name: "Educore",
    url: "https://onlineu.mx/educore/",
    logo: "https://onlineu.mx/educore/og-educore.svg",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
