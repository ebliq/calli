"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Calendar,
  Users,
  BarChart3,
  Settings,
  FlaskConical,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Importer", href: "/importer", icon: Upload },
  { label: "Planer", href: "/scheduler", icon: Calendar },
  { label: "Kalender", href: "/calendar", icon: Calendar },
  { label: "Kontakte", href: "/contacts", icon: Users },
  { label: "Statistiken", href: "/stats", icon: BarChart3 },
  { label: "Test", href: "/test", icon: FlaskConical },
  { label: "Einstellungen", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:hidden"
          >
            <img src="/logo.svg" alt="Calli" className="h-8 w-8" />
            <span className="text-xl font-bold text-primary">Calli</span>
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
