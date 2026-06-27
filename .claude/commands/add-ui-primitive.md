---
description: Tạo 1 UI primitive headless trong shared/ui (Button, Input, Card...)
argument-hint: <ComponentName>
---

Tạo UI primitive `$ARGUMENTS` trong `app/shared/ui/`. Theo pattern của `button.tsx`.

## Quy tắc cứng

- **Headless / generic**: không có business meaning. Có thể copy sang dự án khác.
- **Chỉ phụ thuộc**: Tailwind + `cn()` từ `~/shared/lib/cn`. KHÔNG import provider, hook, config của app.
- **Class semantic** (`bg-primary`, `text-foreground`, `border-border`...). TUYỆT ĐỐI không hex.
- **Forward ref**: `forwardRef<HTMLXxxElement, Props>`.
- **Props**: extends HTML element props gốc (vd `ButtonHTMLAttributes<HTMLButtonElement>`).
- **Variant + size**: dùng `Record<Variant, string>` map sang class. Default `variant="primary"`, `size="md"`.
- **File**: `kebab-case.tsx`. Component PascalCase. Props interface tên `XxxProps` cùng file.

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

## Bước

1. Tạo `app/shared/ui/<kebab-name>.tsx` theo template trên.
2. Re-export trong `app/shared/ui/index.ts`: `export { Xxx, type XxxProps } from "./<kebab-name>";`
3. Chạy `npm run typecheck`.
4. Báo cho user: import qua `import { Xxx } from "~/shared/ui";`.
