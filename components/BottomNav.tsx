"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Video, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/", label: "HOME", Icon: Home },
  { href: "/schedule", label: "SCHEDULE", Icon: CalendarDays },
  { href: "/live", label: "LIVE", Icon: Video },
  { href: "/trends", label: "TRENDS", Icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-md mx-auto flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  active ? "bg-blue-600 text-white" : "text-gray-400"
                }`}
              >
                <Icon size={20} />
              </div>
              <span
                className={`text-[9px] font-semibold tracking-widest ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
