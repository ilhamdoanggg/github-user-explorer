import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const baseUrl = import.meta.env.DEV  ? "/api"  : "https://api.github.com";
