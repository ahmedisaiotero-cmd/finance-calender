import { LandingPage } from "@/components/marketing/landing-page";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `${SITE_PRODUCT.name} — ${SITE_PRODUCT.tagline}`,
  description: SITE_PRODUCT.description,
};

export default function WelcomePage() {
  return <LandingPage />;
}
