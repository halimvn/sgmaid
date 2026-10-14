/** "N Helpers available" pill for the employer dashboard — sits beside the live viewers pill. */
export default function HelpersAvailablePill({ count }: { count: number }) {
  return (
    <div className="live-pill">
      <svg className="live-pill__icon live-pill__icon--orange" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 19.5c.4-3.4 2.7-5.3 5.5-5.3 1.3 0 2.4.4 3.3 1.1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="m14.5 17.5 2 2 4-4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="live-pill__count">{count}</span>
      <span className="live-pill__label">{count === 1 ? "Helper" : "Helpers"} available</span>
    </div>
  );
}
