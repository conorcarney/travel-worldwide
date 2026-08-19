/** Scroll to an admin form and move keyboard focus to its first field. */
export function revealAdminForm(form: HTMLFormElement | null) {
  if (!form) return;
  const reveal = () => {
    const top = form.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    const field = form.querySelector<HTMLElement>(
      "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    field?.focus({ preventScroll: true });
  };
  window.requestAnimationFrame(reveal);
}
