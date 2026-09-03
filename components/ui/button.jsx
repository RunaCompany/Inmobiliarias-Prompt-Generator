'use client';

import { Button as AriaButton } from 'react-aria-components';
import { cx } from '../../utils/cx.js';

const variants = {
  primary: 'bg-brand-solid text-white shadow-xs hover:bg-brand-solid-hover data-[pressed]:bg-brand-solid-hover',
  secondary: 'border border-border bg-white text-foreground shadow-xs hover:bg-surface',
  tertiary: 'bg-transparent text-muted hover:bg-surface hover:text-foreground',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <AriaButton
      {...props}
      className={cx(
        'relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold outline-none transition duration-150 ease-out',
        'focus-visible:ring-3 focus-visible:ring-brand-subtle disabled:cursor-not-allowed disabled:opacity-45',
        size === 'lg' ? 'min-h-13 px-5 text-[15px]' : 'min-h-11 px-4 text-sm',
        variants[variant],
        className,
      )}
    >
      {children}
    </AriaButton>
  );
}
