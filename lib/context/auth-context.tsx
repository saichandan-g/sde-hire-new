
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  user: any
  loading: boolean
  isRegistered: boolean
  login: (email: string, password: string) => Promise<any>
  logout: () => Promise<void>
  checkRegistrationStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)
  const router = useRouter()

  // Check if user is registered
  const checkRegistrationStatus = async () => {
    if (!user?.id) {
      setIsRegistered(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_registered')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error checking registration status:', error)
        setIsRegistered(false)
        return
      }

      setIsRegistered(data?.is_registered || false)
    } catch (error) {
      console.error('Error checking registration status:', error)
      setIsRegistered(false)
    }
  }

  // Load session on mount
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        // Check registration status after user is set
        setTimeout(() => checkRegistrationStatus(), 100)
      }
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        // Check registration status when auth state changes
        setTimeout(() => checkRegistrationStatus(), 100)
      } else {
        setIsRegistered(false)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user || null)
      
      // Check registration status and redirect accordingly
      const checkAndRedirect = async () => {
        await checkRegistrationStatus()
        // Use the updated isRegistered state
        const { data: userData } = await supabase
          .from('users')
          .select('is_registered')
          .eq('id', data?.user?.id)
          .single()
        
        if (userData?.is_registered) {
          router.push('/dashboard')
        } else {
          router.push('/register')
        }
      }
      
      setTimeout(checkAndRedirect, 300)
    }

    setLoading(false)
    return error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsRegistered(false)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isRegistered, 
      login, 
      logout, 
      checkRegistrationStatus 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error(
      "❌ useAuth() must be used within an <AuthProvider>. Check if the component using it is a client component and wrapped correctly."
    )
  }
  return context
}

