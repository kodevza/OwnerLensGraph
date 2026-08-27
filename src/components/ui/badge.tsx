import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva('ui-badge', {
  variants: {
    variant: {
      default: 'ui-badge-default',
      secondary: 'ui-badge-secondary',
      outline: 'ui-badge-outline',
      warning: 'ui-badge-warning',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
