"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Calendar,
  Users,
  BarChart3,
  Phone,
  Settings,
  FlaskConical,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getMockMode, setMockMode } from "@/lib/store";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Importer", href: "/importer", icon: Upload },
  { label: "Planer", href: "/scheduler", icon: Calendar },
  { label: "Kontakte", href: "/contacts", icon: Users },
  { label: "Statistiken", href: "/stats", icon: BarChart3 },
  { label: "Test", href: "/test", icon: FlaskConical },
  { label: "Einstellungen", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mockEnabled, setMockEnabled] = useState(true);

  useEffect(() => {
    setMockEnabled(getMockMode());
  }, []);

  const handleToggleMock = (checked: boolean) => {
    setMockEnabled(checked);
    setMockMode(checked);
    // Dispatch custom event so other pages can react
    window.dispatchEvent(new CustomEvent("mockmode-changed", { detail: checked }));
  };

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

      <SidebarFooter>
        <div className="px-3 py-3 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Switch
                checked={mockEnabled}
                onCheckedChange={handleToggleMock}
                id="mock-toggle"
              />
              <label
                htmlFor="mock-toggle"
                className="text-xs font-medium cursor-pointer select-none"
              >
                Mock-Calls
              </label>
            </div>
            <Badge
              className={
                mockEnabled
                  ? "bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]"
                  : "bg-green-100 text-green-800 border-green-300 text-[10px]"
              }
            >
              {mockEnabled ? "DEMO" : "LIVE"}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
