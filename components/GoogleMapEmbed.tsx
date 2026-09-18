/**
 * Reusable Google Maps embed — plain iframe pointed at a fixed address,
 * no API key required (the `google.com/maps?...&output=embed` URL is
 * Google's own no-key embed endpoint, distinct from the Maps
 * JavaScript/Embed APIs that do need one). Deliberately not the Maps
 * JS SDK — that would add real frontend JS weight for something a
 * static iframe already does (zoom/pan/open-larger-map all work
 * natively inside the iframe).
 *
 * Sizing/border/radius are the caller's responsibility via `className`
 * (e.g. the homepage's `.contact-map`) so this component stays a plain,
 * unopinionated wrapper reusable anywhere a fixed-location map is needed.
 */
export default function GoogleMapEmbed({
  address,
  title,
  className,
}: {
  /** The exact address to center the map on — never the visitor's location. */
  address: string;
  /** Accessible iframe title, e.g. "SG Maid office location at Tristar Complex". */
  title: string;
  className?: string;
}) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  return (
    <div className={className}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
