/** Floating WhatsApp button, fixed to the bottom-right corner of every marketing page. */
export default function WhatsAppFloat() {
  return (
    <a
      className="wa-float"
      href="https://wa.me/6589983434"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-whatsapp" /></svg>
    </a>
  );
}
