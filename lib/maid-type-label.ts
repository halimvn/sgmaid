/** How a stored maid type is shown to people (employer cards and profile, admin). Pure — safe in client code. */
const MAID_TYPE_LABEL: Record<string, string> = {
  NEW: "New Maid",
  TRANSFER: "Transfer Maid",
  EX_SINGAPORE: "Ex-Singapore Maid",
  EX_OTHERS: "Ex-Others Maid",
};

/** The display label for a maid type, or null when none is set. */
export function maidTypeLabel(maidType: string | null | undefined): string | null {
  if (!maidType) return null;
  return MAID_TYPE_LABEL[maidType] ?? maidType;
}
