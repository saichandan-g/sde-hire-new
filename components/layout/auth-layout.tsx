"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Code, Home, LogOut, Settings, User, Menu, X, MessageSquare, Users } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/context/auth-context"

interface AuthLayoutProps {
  children: ReactNode
}
 

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading, logout } = useAuth() // Add loading here
  //const { user, logout } = useAuth()
  
  //const { state, logout } = useAuth()
  const router = useRouter()

useEffect(() => {
    if (!loading && !user) { // Only redirect if not loading and no user
      router.push("/login")
    }
  }, [user, loading, router]) // Add loading and router to dependencies


  // Close sidebar when route changes (especially on mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isActive = (path: string) => {
    return pathname === path
  }

  const handleLogout = () => {
    logout()
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }
    return user?.email || "Account"
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Overlay for mobile - closes sidebar when clicking outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center">
            <span className="font-bold"><span className="text-blue-600">Upady</span><span className="text-yellow-500">ai</span></span>
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          <Button
            variant={isActive("/dashboard") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </Button>

          <Button
            variant={isActive("/dsa-tutor") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href="/dsa-tutor" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>DSA Tutor</span>
            </Link>
          </Button>

          <Button
            variant={isActive("/problems") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href="/problems" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Problems</span>
            </Link>
          </Button>

          <Button
            variant={isActive("/technical-interview") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href="/technical-interview" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Technical Interview</span>
            </Link>
          </Button>

          <Button
            variant={isActive("/hr-interview") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href="/hr-interview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>HR Interview</span>
            </Link>
          </Button>

          <Button
            variant={isActive("/profile") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start md:hidden"
            asChild
          >
            <Link href="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </Button>

          {/* Settings page temporarily hidden - keeping code for future use */}
          {/* <Button
            variant={isActive("/settings") ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start md:hidden"
            asChild
          >
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </Button> */}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background z-10 h-14">
          <div className="flex h-full items-center px-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1"></div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <User className="h-4 w-4" />
                    {getDisplayName()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {/* Settings page temporarily hidden - keeping code for future use */}
                  {/* <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer text-red-500"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t py-4 px-6 bg-background">
          <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground mb-2 md:mb-0">© 2025 Upadyai. All rights reserved.</div>
            <div className="flex space-x-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                Contact Us
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
