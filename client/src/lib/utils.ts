import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getNodeStatus(waterLevel: number, threshold: number): 'normal' | 'warning' | 'danger' {
  const percentage = (waterLevel / threshold) * 100
  
  if (percentage >= 90) return 'danger'
  if (percentage >= 70) return 'warning'
  return 'normal'
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}
