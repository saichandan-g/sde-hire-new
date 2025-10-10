'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'

export function SignupForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    if (signupSuccess) {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 5000) // Redirect after 5 seconds
      return () => clearTimeout(timer)
    }
  }, [signupSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
        },
      },
    })

    setLoading(false)

    console.log('Supabase signUp response:', { data, error }) // Log full response

    if (error) {
      console.log('Supabase signup error:', error.message)
      if (
        error.message.includes('User already registered') ||
        error.message.includes('Email already exists') ||
        error.message.includes('An account with this email already exists')
      ) {
        setError('Email already in use. Please try logging in or use a different email.')
      } else {
        setError(error.message || 'Something went wrong. Please try again.')
      }
    } else if (data.user && !data.user.identities?.length) {
      // If user exists but has no new identities, it means the email is already registered
      setError('Email already in use. Please use a different email.')
    } else {
      setSignupSuccess(true)
    }
  }

  if (signupSuccess) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-lg font-semibold">Check Your Email</h2>
        <p className="text-sm text-muted-foreground">
          A verification email has been sent to {email}. Please verify your email to continue.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters and include a number and a special character
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          required
        />
        <Label htmlFor="terms" className="text-sm font-normal">
          I agree to the{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </Label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
/*
// signup-form.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'

export function SignupForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    if (signupSuccess) {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 5000) // Redirect after 5 seconds
      return () => clearTimeout(timer)
    }
  }, [signupSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    setLoading(false)

    console.log('Supabase signUp response:', { data, error }) // Log full response

    if (error) {
      console.log('Supabase signup error:', error.message)
      if (
        error.message.includes('User already registered') ||
        error.message.includes('Email already exists') ||
        error.message.includes('An account with this email already exists')
      ) {
        setError('Email already in use. Please try logging in or use a different email.')
      } else {
        setError(error.message || 'Something went wrong. Please try again.')
      }
    } else if (data.user && !data.user.identities?.length) {
      // If user exists but has no new identities, it means the email is already registered
      setError('Email already in use. Please use a different email.')
    } else {
      setSignupSuccess(true)
    }
  }

  if (signupSuccess) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-lg font-semibold">Check Your Email</h2>
        <p className="text-sm text-muted-foreground">
          A verification email has been sent to {email}. Please verify your email to continue.
        </p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters and include a number and a special character
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          required
        />
        <Label htmlFor="terms" className="text-sm font-normal">
          I agree to the{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </Label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>

      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
 
*/