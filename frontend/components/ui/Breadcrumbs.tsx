"use client";

import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-400" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-zinc-200 transition">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-300">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
