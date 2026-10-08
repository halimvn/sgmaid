/**
 * What the Add/Edit Maid Server Actions hand back to the form when a save fails, so the
 * form can say exactly which field is wrong and keep everything the admin typed.
 * Plain data only (it crosses the server/client boundary); no server-only imports.
 */
export type MaidFormState = {
  /** Problems not tied to one field (e.g. "profile not found"). */
  message?: string;
  /** Field name (as submitted) -> what is wrong with it, shown under that field. */
  fieldErrors: Record<string, string>;
  /** The same problems as a readable list for the summary at the top of the form. */
  errorList: { label: string; message: string }[];
  /** Everything the admin typed, to re-fill the form. Files cannot be kept. */
  values: Record<string, string | string[]>;
  /** True when a photo/PDF had been chosen — the browser drops those, so they must be re-selected. */
  filesDropped: boolean;
  /** Bumps on every failed save so the form re-fills and re-scrolls to the summary. */
  attempt: number;
} | null;
