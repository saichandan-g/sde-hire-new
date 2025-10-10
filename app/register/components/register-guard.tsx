'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/context/auth-context'

interface RegisterGuardProps {
  children: React.ReactNode
}

export function RegisterGuard({ children }: RegisterGuardProps) {
  const { user, loading, isRegistered } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        router.push('/login')
        return
      }

      // If already registered, redirect to dashboard
      if (isRegistered) {
        router.push('/dashboard')
        return
      }
    }
  }, [user, loading, isRegistered, router])

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if user is not authenticated or already registered
  if (!user || isRegistered) {
    return null
  }

  return <>{children}</>
} 