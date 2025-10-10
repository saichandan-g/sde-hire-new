'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/context/auth-context'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const { login, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = await login(email, password)
if (err) {
  setError(err.message || 'Invalid credentials')
}
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError(null)
          }}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
        <Label htmlFor="remember" className="text-sm font-normal">
          Remember me for 30 days
        </Label>
      </div>

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>

      <div className="text-center text-sm">
        Don't have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </form>
  )
}




 