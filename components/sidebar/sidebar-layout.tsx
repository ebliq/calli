"use client";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar } from "./app-sidebar";

function ContentArea({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  const sidebarWidth =
    isMobile || !state
      ? "0px"
      : state === "expanded"
        ? "var(--sidebar-width)"
        : "var(--sidebar-width-icon)";

  return (
    <div
      className="min-h-svh transition-[margin-left,width] duration-200 ease-linear"
      style={{
        marginLeft: sidebarWidth,
        width: `calc(100% - ${sidebarWidth})`,
      }}
    >
      {children}
    </div>
  );
}

export function SidebarLayout({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <ContentArea>{children}</ContentArea>
    </SidebarProvider>
  );
}
