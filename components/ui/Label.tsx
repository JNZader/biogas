import React from 'react';
import { cn } from '../../lib/utils';

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-sm font-medium text-text-primary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5",
      className
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
