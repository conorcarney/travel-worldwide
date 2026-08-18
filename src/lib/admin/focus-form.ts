/** Scroll to an admin form and move keyboard focus to its first field. */
export function revealAdminForm(form: HTMLFormElement | null) {
  if (!form) return;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  const field = form.querySelector<HTMLElement>(
    "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])",
  );
  field?.focus({ preventScroll: true });
}
