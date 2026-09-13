import IconSprite from "@/components/IconSprite";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileBar from "@/components/MobileBar";
import "./site.css";

/**
 * Shared chrome for every public marketing page (Home / About /
 * Services / Contact). The (site) segment is a route group — it
 * organises these routes without adding "/site" to the URL.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IconSprite />
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileBar />
    </>
  );
}
