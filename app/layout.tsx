import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

/**
 * Poppins via next/font replaces the original per-page
 * <link href="https://fonts.googleapis.com/..."> tag. Same font,
 * same weights — now self-hosted and loaded once for the whole app
 * instead of a render-blocking request repeated on every page.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SG Maid — Compassionate care. Peace of mind.",
  description:
    "SG Maid helps Singapore families find and support the right domestic helper — from matching and paperwork to ongoing counselling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
