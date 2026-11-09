import { Link } from '@mui/material';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Lets keyboard users jump past the navbar. Hidden until it gets focus.
 * Each page renders its own `<main>`, so the link finds it when used.
 */
export default function SkipLink() {
  const { t } = useTranslation();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.querySelector('main');
    if (!main) return;
    event.preventDefault();
    main.setAttribute('tabindex', '-1');
    main.focus();
  }

  return (
    <Link
      href="#main"
      onClick={handleClick}
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 3,
        fontWeight: 600,
        left: 16,
        px: 2,
        py: 1,
        position: 'absolute',
        top: 8,
        transform: 'translateY(-200%)',
        zIndex: 'tooltip',
        '&:focus': { transform: 'none' },
      }}
    >
      {t('common.skipToContent')}
    </Link>
  );
}
