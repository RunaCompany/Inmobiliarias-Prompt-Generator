import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({});

export function cx(...classes) {
  return twMerge(classes.filter(Boolean).join(' '));
}
