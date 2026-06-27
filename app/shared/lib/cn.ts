import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Gộp class Tailwind, loại bỏ class trùng/đè đúng thứ tự.
 * Cho phép pattern composable kiểu shadcn:
 *   <div className={cn("p-4", isActive && "bg-primary", className)} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
