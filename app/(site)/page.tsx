import Image from "next/image";
import FaqAccordion from "@/components/site/FaqAccordion";
import EnquiryForm from "@/components/site/EnquiryForm";
import GoogleMapEmbed from "@/components/GoogleMapEmbed";
import { getPublicMaidPreviews } from "@/lib/services/public-maids";

const OFFICE_ADDRESS = "970 Geylang Road #02-04A, Tristar Complex, Singapore 423492";

// The "Meet available helpers" cards read live MaidProfile rows, so this page
// must render per request rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const helperPreviews = await getPublicMaidPreviews();
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="20" stroke="currentColor" />
          <circle cx="100" cy="100" r="38" stroke="currentColor" />
          <circle cx="100" cy="100" r="56" stroke="currentColor" />
          <circle cx="100" cy="100" r="74" stroke="currentColor" />
          <circle cx="100" cy="100" r="92" stroke="currentColor" />
        </svg>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              <span className="accent">More time with your family.</span>
            </h1>
            <p className="lead">
              We understand the devotion it takes to care for children under 16 or look after elderly parents over 67.
              You handle the love; let us handle the heavy lifting. We find the helper who fits your home&rsquo;s
              rhythm so you can finally reclaim your evenings.
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
          <div className="hero-visual">
            <span className="hero-dot" aria-hidden="true" />
            <span className="hero-blob" aria-hidden="true" />
            <div className="photo hero-photo">
              <Image
                src="/Training Center/home1.jpeg"
                alt="SG Maid helper training at our own training centre"
                fill
                sizes="(max-width: 900px) 100vw, 460px"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <div className="hero-floatcard">
              <span className="medallion"><svg viewBox="0 0 24 24"><use href="#i-shield" /></svg></span>
              <div>
                <b>Trained &amp; guaranteed</b>
                <span>Own Indonesian training centres</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="trust section-sm">
        <div className="wrap">
          <div className="trust-grid">
            <div className="stat"><b>24+</b><span>Years of placement heritage</span></div>
            <div className="stat"><b>12</b><span>Month replacement guarantee</span></div>
            <div className="stat"><b>$0</b><span>Upfront placement fees</span></div>
            <div className="stat"><b>Own</b><span>Indonesian training centres</span></div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">We understand</span>
            <h2>Hiring a helper is a huge decision</h2>
            <p className="lead">
              You want to be absolutely sure your family and home are in safe, caring hands. We take care of all the
              stressful training and confusing paperwork so you don&rsquo;t have to worry about a thing.
            </p>
          </div>
          <div className="cards-3">
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-child" /></svg></div>
              <h4>Caring for children under 16</h4>
            </div>
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-elder" /></svg></div>
              <h4>Looking after elderly parents 67+</h4>
            </div>
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-home" /></svg></div>
              <h4>Running the household</h4>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section about">
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="26" stroke="currentColor" />
          <circle cx="100" cy="100" r="46" stroke="currentColor" />
          <circle cx="100" cy="100" r="66" stroke="currentColor" />
          <circle cx="100" cy="100" r="86" stroke="currentColor" />
        </svg>
        <div className="wrap">
          <div className="split">
            <div className="photo about-photo">
              <Image
                src="/Training Center/imgabout.png"
                alt="The SG Maid team at our training centre"
                fill
                sizes="(max-width: 900px) 100vw, 460px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div>
              <span className="eyebrow">About us</span>
              <h2>Roots that run deep</h2>
              <p>
                While the SG Maid name is a fresh new chapter — marked by our moon icon reflecting our commitment to
                the values of the Muslim community — our roots run deep. We carry over 24 years of experience.
              </p>
              <p>
                Choosing us means tapping into decades of placement expertise, ensuring your hiring journey is
                low-risk and highly reliable. The hearts and hands behind our agency aren&rsquo;t new at all.
              </p>
              <div className="btn-row">
                <a className="btn btn--secondary" href="/about">
                  Read our story
                  <svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">What we handle</span>
            <h2>Everything we handle for you</h2>
            <p className="lead">From matching to permits, we cover the full journey.</p>
          </div>
          <div className="services-grid">
            <div className="card card--cream svc">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-match" /></svg></div>
              <h3>Customized Helper Deployment</h3>
              <p>We don&rsquo;t just match resumes; we match personalities to your family&rsquo;s specific needs.</p>
              <a className="linkarrow" href="/services">Learn more<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            </div>
            <div className="card card--lilac svc">
              <div className="medallion medallion--orange"><svg viewBox="0 0 24 24"><use href="#i-wallet" /></svg></div>
              <h3>Flexible Hiring Packages</h3>
              <p>Affordable options including our Basic and Silver plans designed to protect your household budget.</p>
              <a className="linkarrow" href="/services">Learn more<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            </div>
            <div className="card card--cream svc">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-doorstep" /></svg></div>
              <h3>Doorstep House Calls</h3>
              <p>We bring the consultations and contract signings directly to your living room.</p>
              <a className="linkarrow" href="/services">Learn more<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            </div>
            <div className="card card--lilac svc">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-chat" /></svg></div>
              <h3>Ongoing Counseling</h3>
              <p>Our support continues long after the first day, mediating household dynamics to keep the peace.</p>
              <a className="linkarrow" href="/services">Learn more<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            </div>
            <div className="card card--cream svc">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-doc" /></svg></div>
              <h3>Seamless Permit Renewals</h3>
              <p>We handle the administrative maze of MOM, ICA, and the Indonesian Embassy for you.</p>
              <a className="linkarrow" href="/services">Learn more<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            </div>
            <div className="card svc--cta">
              <h3>See the full picture</h3>
              <p>Explore every service, package and price in detail.</p>
              <a className="btn btn--accent" href="/services">See all services<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">Simple process</span>
            <h2>How hiring works with us</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="num">1</div>
              <h4>Tell Us Your Needs</h4>
              <p>Share your household routine, care needs and preferences so we can help you find a suitable helper.</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h4>Meet Your Match</h4>
              <p>Browse shortlisted helper profiles, arrange interviews and confirm your preferred candidate.</p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h4>Let Us Guide the Arrangements</h4>
              <p>We guide you through the paperwork, required approvals and preparations for your helper to join your household.</p>
            </div>
            <div className="step">
              <div className="num">4</div>
              <h4>Welcome Your Helper Home</h4>
              <p>Begin your journey together with guidance to help your helper settle in and ongoing support when you need it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HELPERS (teaser) */}
      <section className="section" id="helpers" style={{ background: "var(--white)" }}>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Meet your match</span>
            <h2>Meet available helpers</h2>
            <p className="lead">
              We connect you directly with available helpers so you can easily chat and interview them right from the
              comfort of your home.
            </p>
          </div>
          {helperPreviews.length > 0 ? (
            <div className="helpers-grid">
              {/* Real, database-driven ACTIVE+AVAILABLE profiles — see
                  lib/services/public-maids.ts. Deliberately a narrow
                  public-safe DTO: first name only, no biodata; the photo
                  goes through /helpers/photo/[code], never a raw storage URL. Every card sends
                  a visitor to /login — there is no public maid-detail
                  page. */}
              {helperPreviews.map((maid) => (
                <div className="helper" key={maid.profileCode}>
                  <div className="photo">
                    {maid.hasPhoto ? (
                      <Image
                        src={`/helpers/photo/${encodeURIComponent(maid.profileCode)}`}
                        alt={`Photo of ${maid.displayName}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        style={{ objectFit: "cover" }}
                        // Served by a route that redirects to a short-lived signed URL;
                        // the browser fetches it directly (not via the image optimiser).
                        unoptimized
                      />
                    ) : (
                      <div className="photo__inner">
                        <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
                        <span className="photo__cap">Helper photo</span>
                      </div>
                    )}
                  </div>
                  <div className="helper__body">
                    <div className="helper__top">
                      <h4>{maid.displayName}</h4>
                      <span className="chip chip--orange">Available</span>
                    </div>
                    <span className="helper__id">Candidate ID · {maid.profileCode}</span>
                    <div className="helper__tags">
                      <span className="chip">{maid.nationality}</span>
                      <span className="chip">{maid.age != null ? `${maid.age} yrs` : "Age N/A"}</span>
                      <span className="chip">{maid.yearsExperience} yrs&rsquo; experience</span>
                    </div>
                    <a className="btn btn--secondary btn--block" href="/login">View profile</a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="note-chip">
              <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
              <span>New helper profiles are being added. Log in to check the latest availability.</span>
            </div>
          )}
          {helperPreviews.length > 0 && (
            <div className="note-chip">
              <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
              <span>Full profiles and biodata are available to registered employers after login.</span>
            </div>
          )}
          <div className="btn-row">
            <a className="btn btn--secondary" href="/login">Browse all helpers<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Good to know</span>
            <h2>Common questions</h2>
          </div>
          <FaqAccordion />
          <div className="btn-row">
            <a className="btn btn--secondary" href="#">See all FAQs<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
          </div>
        </div>
      </section>

      {/* FINAL CTA / ENQUIRY FORM */}
      <section className="section final" id="find">
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
                <h2>Let&rsquo;s find your family&rsquo;s match</h2>
                <p className="lead" style={{ marginTop: 14 }}>
                  Tell us about your home and we&rsquo;ll come to you — no office visit needed.
                </p>
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
                <GoogleMapEmbed
                  address={OFFICE_ADDRESS}
                  title="SG Maid office location at Tristar Complex"
                  className="contact-map"
                />
                <a
                  className="contact-map-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions
                </a>
              </div>
              <EnquiryForm
                heading="Find Your Helper"
                selectLabel="Who needs care?"
                selectOptions={["Children", "Elderly", "Household", "Multiple"]}
                submitLabel="Find Your Helper"
                altHref="https://wa.me/6589983434"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
