# Prompt: Add UI Primitive

Tao 1 UI primitive headless trong `app/shared/ui/`.

## Input

`<ComponentName>` (PascalCase).

## Quy tac cung

- **Headless / generic**: khong business meaning. Copy duoc sang du an khac.
- **Chi phu thuoc**: Tailwind + `cn()` tu `~/shared/lib/cn`. KHONG import provider, hook, config cua app.
- **Class semantic** (`bg-primary`, `text-foreground`, `border-border`...). TUYET DOI khong hex.
- **Forward ref**: `forwardRef<HTMLXxxElement, Props>`.
- **Props**: extends HTML element props goc.
- **Variant + size**: `Record<Variant, string>` map sang class. Default `variant="primary"`, `size="md"`.
- **File**: `kebab-case.tsx`. Component PascalCase. Props interface `XxxProps` cung file.

## Template

```tsx
import { forwardRef, type <HTMLAttrsType> } from "react";
import { cn } from "~/shared/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "...",
  // ...
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "...",
  md: "...",
  lg: "...",
};

export interface XxxProps extends <HTMLAttrsType> {
  variant?: Variant;
  size?: Size;
}

export const Xxx = forwardRef<HTMLXxxElement, XxxProps>(
  function Xxx({ className, variant = "primary", size = "md", ...props }, ref) {
    return (
      <element
        ref={ref}
        className={cn(
          "base-classes",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
```

## Steps

1. Tao `app/shared/ui/<kebab-name>.tsx` theo template.
2. Re-export trong `app/shared/ui/index.ts`: `export { Xxx, type XxxProps } from "./<kebab-name>";`
3. Chay `pnpm typecheck`.
4. Bao user: import qua `import { Xxx } from "~/shared/ui";`.
