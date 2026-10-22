import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services — SG Maid",
};

export default function ServicesPage() {
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
        <div className="pagehero-grid">
          <div>
            <div className="crumb"><Link href="/">Home</Link> › Services</div>
            <span className="eyebrow">Our Services</span>
            <h1>Transparent &amp; Family-First</h1>
            <p className="lead">
              We&rsquo;ve got you covered through the whole journey, supporting you from the first interview to your
              helper&rsquo;s safe journey home.
            </p>
            <div className="btn-row">
              <a className="btn btn--primary" href="/login">
                Find Your Helper
                <svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg>
              </a>
              <a className="btn btn--whatsapp" href="https://wa.me/6589983434" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
                WhatsApp Us Now
              </a>
            </div>
          </div>
          <div className="photo pagehero-photo">
            <Image src="/Training Center/Unknown-25.png" alt="Helper and family together, warm and human" fill sizes="(max-width: 900px) 100vw, 460px" style={{ objectFit: "cover" }} />
          </div>
        </div>
      </section>

      {/* DEPLOYMENT */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Deployment</span>
            <h2>Domestic Helper Deployment</h2>
            <p className="lead">We specialize in recruiting skilled Indonesian domestic helpers. Our process is built on transparency:</p>
          </div>
          <div className="cards-2">
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-match" /></svg></div>
              <h4>Customized Matching</h4>
              <p>Screening based on your specific requirements for childcare, elderly care, or housekeeping.</p>
            </div>
            <div className="card feature">
              <div className="medallion medallion--orange"><svg viewBox="0 0 24 24"><use href="#i-chat" /></svg></div>
              <h4>Remote Interviews</h4>
              <p>Video calls that respect your schedule and privacy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOUSE CALL & REPATRIATION */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">We come to you</span>
            <h2>House Call &amp; Repatriation Services</h2>
          </div>
          <div className="cards-2">
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-doorstep" /></svg></div>
              <h4>The Ultimate Convenience</h4>
              <p>For the busy professional, we offer doorstep service for all contract signings and consultations.</p>
            </div>
            <div className="card feature">
              <div className="medallion medallion--orange"><svg viewBox="0 0 24 24"><use href="#i-plane" /></svg></div>
              <h4>Hassle-Free Repatriation</h4>
              <p>When a contract ends, we handle the logistics, ensuring a respectful and smooth journey home for your helper.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COUNSELING */}
      <section className="section" style={{ background: "var(--lavender-bg)" }}>
        <div className="wrap">
          <div className="split rev">
            <div className="photo counseling-photo">
              <Image src="/Training Center/Unknown-37.png" alt="Counselling session, helper and employer talking" fill sizes="(max-width: 900px) 100vw, 460px" style={{ objectFit: "cover" }} />
            </div>
            <div>
              <span className="eyebrow">Ongoing support</span>
              <h2>Counseling &amp; Mediation Services</h2>
              <p className="lead" style={{ marginTop: 16 }}>
                The journey doesn&rsquo;t end at deployment. We provide a safe, supportive space to address challenges
                and mediate complex household dynamics. This service ensures long-term placement stability and gives
                both you and your helper the confidence to succeed together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PERMIT RENEWAL */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Paperwork, handled</span>
            <h2>Renewal of Permit</h2>
            <p className="lead">Let us handle the red tape. Our team manages the full renewal process, including:</p>
          </div>
          <div className="cards-4">
            <div className="card feature"><div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-doc" /></svg></div><h4>MOM Work Permit Renewals</h4></div>
            <div className="card feature"><div className="medallion medallion--orange"><svg viewBox="0 0 24 24"><use href="#i-pin" /></svg></div><h4>ICA Documentation &amp; Passport Renewals</h4></div>
            <div className="card feature"><div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-doc" /></svg></div><h4>Indonesian Embassy Endorsements</h4></div>
            <div className="card feature">
              <div className="medallion medallion--orange"><svg viewBox="0 0 24 24"><use href="#i-shield" /></svg></div>
              <h4>Insurance &amp; Security Bond Processing</h4>
              <p style={{ marginTop: 10 }}>Including Bond Protectors from $54.50.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONNECTIVE TISSUE */}
      <section className="section connective">
        <div className="wrap">
          <p>Have a specific question about your situation? <a href="/contact">Contact Us</a> for personalized guidance.</p>
        </div>
      </section>
    </>
  );
}
