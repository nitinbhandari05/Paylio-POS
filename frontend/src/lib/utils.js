import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs) => twMerge(clsx(inputs));
export const money = (value) => `₹${Math.round(Number(value) || 0)}`;
