import Link from "next/link";
import type { Metadata } from "next";
import EnquiryForm from "@/components/site/EnquiryForm";

export const metadata: Metadata = {
  title: "Contact Us — SG Maid",
};

export default function ContactPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="pagehero">
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="24" stroke="currentColor" />
          <circle cx="100" cy="100" r="44" stroke="currentColor" />
          <circle cx="100" cy="100" r="64" stroke="currentColor" />
          <circle cx="100" cy="100" r="84" stroke="currentColor" />
        </svg>
        <div className="wrap">
          <div className="crumb"><Link href="/">Home</Link> › Contact</div>
          <span className="eyebrow">Get in Touch</span>
          <h1>Seamless Connection</h1>
          <p className="lead">Accessibility is the foundation of our service. We offer multiple touchpoints to ensure help is always just a message away.</p>
        </div>
      </section>

      {/* DIRECT CONTACT */}
      <section className="section">
        <div className="wrap">
          <div className="split">
            <div>
              <span className="eyebrow">Reach us</span>
              <h2>Direct Contact Details</h2>
              <div className="detail-card" style={{ marginTop: 24 }}>
                <h4>Head Office</h4>
                <p>970 Geylang Road #02-04A<br />Tristar Complex<br />Singapore 423492</p>
                <h4>Operating Hours</h4>
                <p>Mon&ndash;Fri: 10am – 7pm<br />Sat: 10am – 5pm</p>
                <h4>Corporate Line</h4>
                <p>+65 6222 9800</p>
              </div>
            </div>
            <div className="photo contact-photo">
              <div className="photo__inner">
                <svg viewBox="0 0 24 24"><use href="#i-pin" /></svg>
                <span className="photo__cap">Map — 970 Geylang Road #02-04A, Tristar Complex</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIGITAL CONNECT */}
      <section className="section" id="connect" style={{ background: "var(--lilac-100)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Stay connected</span>
            <h2>Digital Connect</h2>
          </div>
          <div className="cards-2">
            <div className="card connect-card">
              <div className="medallion medallion--whatsapp"><svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg></div>
              <h3>Get Instant Answers via WhatsApp!</h3>
              <p>Skip the queue — message us directly for a fast, personal reply.</p>
              <a className="btn btn--whatsapp" href="https://wa.me/6589983434" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
                WhatsApp Us Now
              </a>
            </div>
            <div className="card connect-card">
              <h3>Follow Us for Tips &amp; Advice</h3>
              <p>
                Our social media accounts (TikTok, Instagram and Facebook) are registered via corporate credentials,
                ensuring we remain a permanent resource for your family. Follow us for:
              </p>
              <ul>
                <li><svg viewBox="0 0 24 24"><use href="#i-check" /></svg>Daily tips from our Settling-In Program (SIP)</li>
                <li><svg viewBox="0 0 24 24"><use href="#i-check" /></svg>Advice on managing domestic harmony</li>
                <li><svg viewBox="0 0 24 24"><use href="#i-check" /></svg>Updates on the latest MOM regulations</li>
              </ul>
              <div className="socials">
                <a href="https://www.instagram.com/sgmaidagency/" target="_blank" rel="noopener" aria-label="Instagram">
                  <svg viewBox="0 0 24 24"><use href="#i-ig" /></svg>
                </a>
                <a href="https://www.facebook.com/SGMaidsagency" target="_blank" rel="noopener" aria-label="Facebook">
                  <svg viewBox="0 0 24 24"><use href="#i-fb" /></svg>
                </a>
                <a href="https://www.tiktok.com/@sg.maid.agency" target="_blank" rel="noopener" aria-label="TikTok">
                  <svg viewBox="0 0 24 24"><use href="#i-tt" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ENQUIRY FORM */}
      <section className="section final" id="enquire">
        <div className="wrap" style={{ padding: 0 }}>
          <div className="final-panel">
            <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="26" stroke="currentColor" />
              <circle cx="100" cy="100" r="48" stroke="currentColor" />
              <circle cx="100" cy="100" r="70" stroke="currentColor" />
              <circle cx="100" cy="100" r="92" stroke="currentColor" />
            </svg>
            <div className="final-grid">
              <div>
                <span className="eyebrow">Get started</span>
                <h2>Send us your details</h2>
                <p className="lead" style={{ marginTop: 14 }}>Fill in the form and we&rsquo;ll come to you — no office visit needed.</p>
                <ul>
                  <li><svg viewBox="0 0 24 24"><use href="#i-check" /></svg>Free doorstep house call</li>
                  <li><svg viewBox="0 0 24 24"><use href="#i-check" /></svg>Zero upfront placement fees</li>
                  <li><svg viewBox="0 0 24 24"><use href="#i-check" /></svg>12-month guarantee</li>
                </ul>
                <p className="contact-line">
                  970 Geylang Road #02-04A, Tristar Complex, Singapore 423492
                  <br />
                  Mon&ndash;Fri: 10am – 7pm &nbsp;|&nbsp; Sat: 10am – 5pm
                </p>
              </div>
              <EnquiryForm
                heading="Find Your Helper"
                selectLabel="Which service do you need?"
                selectOptions={["Deployment", "Packages", "House Call", "Counselling", "Permit Renewal"]}
                submitLabel="Send Enquiry"
                altHref="https://wa.me/6589983434"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAID PORTAL CTA */}
      <section className="section portalband">
        <div className="wrap">
          <div className="section-head center" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Registered employers</span>
            <h2>Ready to start your search?</h2>
            <p className="lead">Registered employers can enter the Maid Portal now.</p>
          </div>
          <div className="btn-row">
            {/* Auth guard will be applied in Phase 2 — see app/dashboard/layout.tsx */}
            <a className="btn btn--dashed" href="/dashboard">
              Enter Maid Portal
              <svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg>
            </a>
          </div>
          <div className="note-chip">
            <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
            <span>
              Login gate — content required. This links straight to the dashboard for review; the real button needs
              an employer login/registration step in front of it.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
