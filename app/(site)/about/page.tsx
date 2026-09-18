import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — SG Maid",
};

export default function AboutPage() {
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
            <div className="crumb"><Link href="/">Home</Link> › About Us</div>
            <span className="eyebrow">About SG Maid</span>
            <h1>Family, Trust, and Decades of Dedication.</h1>
            <p className="lead">Bringing peace of mind to Singaporean homes since 1998.</p>
            <div className="btn-row">
              <Link className="btn btn--primary" href="/login">
                Find Your Helper
                <svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg>
              </Link>
              <a className="btn btn--whatsapp" href="https://wa.me/6589983434" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
                WhatsApp Us Now
              </a>
            </div>
          </div>
          <div className="photo pagehero-photo">
            <Image
              src="/Training Center/aboutus1.jpeg"
              alt="The SG Maid team"
              fill
              sizes="(max-width: 900px) 100vw, 460px"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="section">
        <div className="wrap">
          <div className="split rev">
            <div className="photo story-photo">
              <Image
                src="/Training Center/aboutus2.jpeg"
                alt="SG Maid at work"
                fill
                sizes="(max-width: 900px) 100vw, 460px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="about-copy">
              <span className="eyebrow">Our story</span>
              <h2>About Us</h2>
              <p>
                At SG Maid Agency, we believe finding a helper is a deeply personal family matter. Our founder comes
                from a lineage of care, with over two decades of experience.
              </p>
              <p>
                Your home is your safe space, and we want to help you keep it that way with reliable helper support
                365 days a year. Whether it&rsquo;s managing daily housework or caring for your parents, we understand
                the family routines that matter most to you. With over 24 years of experience, we are always here to
                listen and help resolve any household challenges, giving you absolute peace of mind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="section gallery">
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="26" stroke="currentColor" />
          <circle cx="100" cy="100" r="46" stroke="currentColor" />
          <circle cx="100" cy="100" r="66" stroke="currentColor" />
          <circle cx="100" cy="100" r="86" stroke="currentColor" />
        </svg>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Behind the scenes</span>
            <h2>Happy helpers, happy homes</h2>
            <p className="lead">Transparency is at our core. Explore our gallery to see our Indonesian training centres in action.</p>
          </div>
          <div className="gallery-grid">
            <div className="photo"><div className="photo__inner"><svg viewBox="0 0 24 24"><use href="#i-home" /></svg><span className="photo__cap">Training centre, wide</span></div></div>
            <div className="photo"><div className="photo__inner"><svg viewBox="0 0 24 24"><use href="#i-people" /></svg><span className="photo__cap">Image</span></div></div>
            <div className="photo"><div className="photo__inner"><svg viewBox="0 0 24 24"><use href="#i-people" /></svg><span className="photo__cap">Image</span></div></div>
            <div className="photo"><div className="photo__inner"><svg viewBox="0 0 24 24"><use href="#i-people" /></svg><span className="photo__cap">Image</span></div></div>
            <div className="photo"><div className="photo__inner"><svg viewBox="0 0 24 24"><use href="#i-people" /></svg><span className="photo__cap">Image</span></div></div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="section">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">Meet the team</span>
            <h2>The people behind the match</h2>
          </div>
          <div className="team-wrap">
            <div className="team-card">
              <div className="photo"><div className="photo__inner"><svg viewBox="0 0 24 24"><use href="#i-user" /></svg><span className="photo__cap">Photo</span></div></div>
              <h4>[Name]</h4>
              <span>[Role]</span>
            </div>
          </div>
          <div className="note-chip note-inline">
            <svg viewBox="0 0 24 24"><use href="#i-check" /></svg>
            <span>Team section — recommended, content required. Optional; cut this section if the client prefers to keep focus on the founder.</span>
          </div>
        </div>
      </section>

      {/* PROMISES */}
      <section className="section promises">
        <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="24" stroke="currentColor" />
          <circle cx="100" cy="100" r="44" stroke="currentColor" />
          <circle cx="100" cy="100" r="64" stroke="currentColor" />
          <circle cx="100" cy="100" r="84" stroke="currentColor" />
        </svg>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Our promise</span>
            <h2>Five promises we make to every family</h2>
          </div>
          <div className="promises-grid">
            <div className="promise">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-wallet" /></svg></div>
              <h4>Zero Upfront Placement Fees</h4>
              <p>
                The maid&rsquo;s loan is advanced by us and repaid via salary deductions — protecting your immediate
                cash flow
                <svg className="tick" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg>
              </p>
            </div>
            <div className="promise">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-doorstep" /></svg></div>
              <h4>Free Doorstep House Calls</h4>
              <p>
                We travel to you for all signatures and consultations
                <svg className="tick" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg>
              </p>
            </div>
            <div className="promise">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-shield" /></svg></div>
              <h4>Own Indonesian Training Centres</h4>
              <p>
                Every helper is prepared with our One-Day Training Handbook and Settling In Program
                <svg className="tick" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg>
              </p>
            </div>
            <div className="promise">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-star" /></svg></div>
              <h4>12-Month Guarantee</h4>
              <p>
                If the fit isn&rsquo;t right, our guarantee lowers the risk of a failed placement
                <svg className="tick" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg>
              </p>
            </div>
            <div className="promise">
              <div className="medallion"><svg viewBox="0 0 24 24"><use href="#i-heart" /></svg></div>
              <h4>24+ Years of Experience</h4>
              <p>
                The stability of a multi-generational business, brought to your modern household
                <svg className="tick" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check" /></svg>
              </p>
            </div>
          </div>
          <div className="btn-row">
            <Link className="btn btn--accent" href="/login">Find Your Helper<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></Link>
          </div>
        </div>
      </section>

      {/* SERVICES BRIDGE */}
      <section className="section ctaband">
        <div className="wrap">
          <div className="section-head center">
            <h2>How we help make your home life a little lighter.</h2>
            <p className="lead">
              From finding the perfect helper for your family&rsquo;s daily routine to handling all the messy
              paperwork and being here with friendly guidance every single day of the year; here is how we look
              after you.
            </p>
          </div>
          <div className="btn-row">
            <a className="btn btn--primary" href="/services">View our services<svg viewBox="0 0 24 24"><use href="#i-arrow" /></svg></a>
            <a className="btn btn--whatsapp" href="https://wa.me/6589983434" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
              WhatsApp Us Now
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
