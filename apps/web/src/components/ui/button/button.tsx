import type { ButtonHTMLAttributes, ReactElement } from 'react';

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
): ReactElement {
  return <button {...props} />;
}
