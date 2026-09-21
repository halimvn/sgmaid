import Image from "next/image";
import Link from "next/link";

/** Shared marketing-site footer. Content unchanged from the original design. */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-in">
        <div className="footer-grid">
          <div className="footer-brand">
            <Image
              src="/sgmaid-logo-colored.png"
              alt="SG Maid — more time with your family"
              width={260}
              height={108}
              style={{ height: 52, width: "auto" }}
            />
            <p>Compassionate care. Peace of mind. Serving Singaporean homes since 1998.</p>
            <p className="footer-licence">MOM EA licence no. — to be confirmed</p>
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

          <div>
            <h4>Explore</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/#helpers">Our Helpers</Link></li>
              <li><Link href="/services">Pricing</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4>Services</h4>
            <ul>
              <li><Link href="/services">Helper Deployment</Link></li>
              <li><Link href="/services">Hiring Packages</Link></li>
              <li><Link href="/services">Doorstep House Calls</Link></li>
              <li><Link href="/services">Counselling Support</Link></li>
              <li><Link href="/services">Permit Renewals</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Contact</h4>
            <p>
              970 Geylang Road #02-04A<br />Tristar Complex<br />Singapore 423492<br /><br />
              +65 8998 3434<br />
              Email — to be confirmed<br /><br />
              Mon&ndash;Fri: 10am – 6pm<br />Sat: 10am – 2pm
            </p>
            <a className="btn btn--whatsapp" href="https://wa.me/6589983434" target="_blank" rel="noopener noreferrer" style={{ marginTop: 6, padding: "12px 20px", fontSize: ".88rem" }}>
              <svg viewBox="0 0 24 24"><use href="#i-whatsapp" /></svg>
              WhatsApp Us Now
            </a>
          </div>
        </div>

        <div className="footer-legal">
          <span>© 2026 SG Maid. All rights reserved.</span>
          <span>Privacy Policy &nbsp;·&nbsp; Terms of Service &nbsp;·&nbsp; PDPA</span>
        </div>
      </div>
    </footer>
  );
}
