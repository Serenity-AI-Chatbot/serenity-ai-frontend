"use client"

import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar"
import { Home, MessageSquare, LineChart, Book, Activity, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function DashboardSidebar() {
  const router = useRouter()

  const sidebarLinks = [
    {
      label: "Home",
      href: "/dashboard",
      icon: <Home className="w-5 h-5 text-emerald-500" />,
    },
    {
      label: "Chat",
      href: "/chat",
      icon: <MessageSquare className="w-5 h-5 text-emerald-500" />,
    },
    {
      label: "Insights",
      href: "/insights",
      icon: <LineChart className="w-5 h-5 text-emerald-500" />,
    },
    {
      label: "Journal",
      href: "/journal",
      icon: <Book className="w-5 h-5 text-emerald-500" />,
    },
    {
      label: "Activity",
      href: "/activities",
      icon: <Activity className="w-5 h-5 text-emerald-500" />,
    },
  ]

  const handleSignOut = async () => {
    try {
      const response = await fetch("/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error('Sign out failed')
      }
      
      // Force a page reload to reflect the signed-out state
      window.location.href = '/'
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <Sidebar>
      <SidebarBody>
        <div className="flex flex-col h-full justify-between">
          {/* Main navigation links */}
          <div className="flex flex-col gap-2">
            {sidebarLinks.map((link) => (
              <SidebarLink key={link.href} link={link} />
            ))}
          </div>

          {/* Sign out button at bottom */}
          <div>
            <SidebarLink
              link={{
                label: "Sign Out",
                href: "#",
                icon: <LogOut className="w-5 h-5 text-emerald-500" />,
              }}
              className="hover:bg-red-500/10"
              onClick={handleSignOut}
            />
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  )
}

