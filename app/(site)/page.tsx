import FaqAccordion from "@/components/site/FaqAccordion";
import EnquiryForm from "@/components/site/EnquiryForm";

export default function HomePage() {
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
              SG Maid for you,
              <br />
              <span className="accent">more time with your family.</span>
            </h1>
            <p className="lead">
              We understand the devotion it takes to care for children under 16 or look after elderly parents over 67.
              You handle the love; let us handle the heavy lifting. We find the helper who fits your home&rsquo;s
              rhythm so you can finally reclaim your evenings.
            </p>
            <div className="btn-row">
              <a className="btn btn--primary" href="#find">
                Find Your Helper
                <svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg>
              </a>
              <a className="btn btn--whatsapp" href="/contact">
                <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
                WhatsApp an Expert Now
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <span className="hero-dot" aria-hidden="true" />
            <span className="hero-blob" aria-hidden="true" />
            <div className="photo hero-photo">
              <div className="photo__inner">
                <svg viewBox="0 0 24 24"><use href="#i-people" /></svg>
                <span className="photo__cap">Helper &amp; child at home — 4:5 portrait</span>
              </div>
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
              <p>
                School runs, meals and bedtime routines — you need someone your children warm to, who picks up your
                family&rsquo;s rhythm quickly.
              </p>
            </div>
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-elder" /></svg></div>
              <h4>Looking after elderly parents 67+</h4>
              <p>
                Medication, mobility and patient company through long days — you need someone gentle with your
                parents and dependable for you.
              </p>
            </div>
            <div className="card feature">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-home" /></svg></div>
              <h4>Running the household</h4>
              <p>Cooking, cleaning and marketing — you need someone who keeps the home steady so your evenings are yours again.</p>
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
              <div className="photo__inner">
                <svg viewBox="0 0 24 24"><use href="#i-home" /></svg>
                <span className="photo__cap">Our team / training centre</span>
              </div>
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
          <div className="helpers-grid">
            {/* DEVELOPMENT / PLACEHOLDER DATA — 4 identical cards; structure ready for real biodata (Phase 3) */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="helper" key={i}>
                <div className="photo">
                  <div className="photo__inner">
                    <svg viewBox="0 0 24 24"><use href="#i-user" /></svg>
                    <span className="photo__cap">Helper photo</span>
                  </div>
                </div>
                <div className="helper__body">
                  <div className="helper__top">
                    <h4>[Helper Name]</h4>
                    <span className="chip chip--orange">Available</span>
                  </div>
                  <span className="helper__id">Candidate ID · [SGM-0000]</span>
                  <div className="helper__tags">
                    <span className="chip">[Nationality]</span>
                    <span className="chip">[Age]</span>
                    <span className="chip">[Years&rsquo; experience]</span>
                  </div>
                  <p style={{ fontSize: ".86rem", color: "var(--ink-70)" }}>
                    Key skills: [childcare · elderly care · cooking · …]
                  </p>
                  <a className="btn btn--secondary btn--block" href="#">View profile</a>
                </div>
              </div>
            ))}
          </div>
          <div className="note-chip">
            <svg viewBox="0 0 24 24"><use href="#i-info" /></svg>
            <span>Helper biodata, photo consent and filter logic still to be confirmed — including whether profiles are public or gated behind an enquiry.</span>
          </div>
          <div className="btn-row">
            <a className="btn btn--secondary" href="#">Browse all helpers<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section pricing">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Transparent pricing</span>
            <h2>Simple, honest pricing</h2>
            <p className="lead">Zero hidden fees and flexible monthly installment plans that won&rsquo;t strain your family&rsquo;s budget.</p>
          </div>
          <div className="plans">
            <div className="plan">
              <h3>Basic</h3>
              <p style={{ fontSize: ".9rem", color: "var(--ink-70)" }}>Essential deployment for families seeking reliable, quality help.</p>
              <div className="plan__pending">Inclusions &amp; price to be confirmed</div>
              <a className="btn btn--secondary btn--block" href="/services">See what&rsquo;s included</a>
            </div>
            <div className="plan">
              <h3>Silver</h3>
              <p style={{ fontSize: ".9rem", color: "var(--ink-70)" }}>Enhanced administrative support for total convenience.</p>
              <div className="plan__pending">Inclusions &amp; price to be confirmed</div>
              <a className="btn btn--secondary btn--block" href="/services">See what&rsquo;s included</a>
            </div>
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
                  Mon&ndash;Fri: 10am – 7pm &nbsp;|&nbsp; Sat: 10am – 5pm
                </p>
              </div>
              <EnquiryForm
                heading="Find Your Helper"
                selectLabel="Who needs care?"
                selectOptions={["Children", "Elderly", "Household", "Multiple"]}
                submitLabel="Find Your Helper"
                altHref="/contact"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
