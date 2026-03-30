// Tiny utility to concatenate conditional class names — compatible with shadcn examples.
export function cn(...classes: Array<string | number | null | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

