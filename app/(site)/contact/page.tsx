import type { Metadata } from "next";
import EnquiryForm from "@/components/site/EnquiryForm";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";

export const metadata: Metadata = {
  title: "Contact Us — SG Maid",
};

const OFFICE_ADDRESS = "970 Geylang Road #02-04A, Tristar Complex, Singapore 423492";

export default function ContactPage() {
  return (
    <>
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
                <p>Mon&ndash;Fri: 10am – 6pm<br />Sat: 10am – 2pm</p>
                <h4>Corporate Line</h4>
                <p>+65 8998 3434</p>
              </div>
            </div>
            <GoogleMapEmbed
              className="contact-photo-map"
              address={OFFICE_ADDRESS}
              title="SG Maid head office location: 970 Geylang Road, Tristar Complex"
            />
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
                  Mon&ndash;Fri: 10am – 6pm &nbsp;|&nbsp; Sat: 10am – 2pm
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
