/**
 * Focuses the element with the given id and returns whether it exists.
 *
 * A MUI select puts its `id` on a hidden input, so for a select the visible
 * combobox next to it is focused instead.
 */
export function focusById(id: string): boolean {
  const element = document.getElementById(id);
  if (!element) return false;

  const target =
    element.getAttribute('aria-hidden') === 'true'
      ? element.parentElement?.querySelector<HTMLElement>('[role="combobox"]')
      : element;
  (target ?? element).focus();
  return true;
}
