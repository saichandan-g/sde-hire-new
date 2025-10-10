'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/context/auth-context'

const EXPERIENCE_LEVELS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
  { value: 'Expert', label: 'Expert' },
]

const TARGET_COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Uber' 
]

const TARGET_ROLES = [
  'Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer' 
]

const PREFERRED_LANGUAGES = [
  'Python', 'JavaScript','Java', 'C++', 'C' 
]

export function RegistrationForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [experienceLevel, setExperienceLevel] = useState('')
  const [targetCompanies, setTargetCompanies] = useState<string[]>([])
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!user?.id) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    // Validate required fields
    if (!experienceLevel) {
      setError('Please select your experience level')
      setLoading(false)
      return
    }

    if (targetCompanies.length === 0) {
      setError('Please select at least one target company')
      setLoading(false)
      return
    }

    if (targetRoles.length === 0) {
      setError('Please select at least one target role')
      setLoading(false)
      return
    }

    if (preferredLanguages.length === 0) {
      setError('Please select at least one preferred programming language')
      setLoading(false)
      return
    }

    try {
      const profileData = {
        experience_level: experienceLevel,
        target_companies: targetCompanies,
        target_roles: targetRoles,
        preferred_languages: preferredLanguages,
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          profile: profileData,
          is_registered: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addTargetCompany = (company: string) => {
    if (!targetCompanies.includes(company)) {
      setTargetCompanies([...targetCompanies, company])
    }
  }

  const removeTargetCompany = (company: string) => {
    setTargetCompanies(targetCompanies.filter(c => c !== company))
  }

  const addTargetRole = (role: string) => {
    if (!targetRoles.includes(role)) {
      setTargetRoles([...targetRoles, role])
    }
  }

  const removeTargetRole = (role: string) => {
    setTargetRoles(targetRoles.filter(r => r !== role))
  }

  const addPreferredLanguage = (language: string) => {
    if (!preferredLanguages.includes(language)) {
      setPreferredLanguages([...preferredLanguages, language])
    }
  }

  const removePreferredLanguage = (language: string) => {
    setPreferredLanguages(preferredLanguages.filter(l => l !== language))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="experience-level">Experience Level</Label>
        <Select value={experienceLevel} onValueChange={setExperienceLevel} required>
          <SelectTrigger>
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target Companies</Label>
        <div className="space-y-2">
          <Select onValueChange={addTargetCompany}>
            <SelectTrigger>
              <SelectValue placeholder="Add target companies" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_COMPANIES.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {targetCompanies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetCompanies.map((company) => (
                <Badge key={company} variant="secondary" className="gap-1">
                  {company}
                  <button
                    type="button"
                    onClick={() => removeTargetCompany(company)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Roles</Label>
        <div className="space-y-2">
          <Select onValueChange={addTargetRole}>
            <SelectTrigger>
              <SelectValue placeholder="Add target roles" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {targetRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetRoles.map((role) => (
                <Badge key={role} variant="secondary" className="gap-1">
                  {role}
                  <button
                    type="button"
                    onClick={() => removeTargetRole(role)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred Programming Languages</Label>
        <div className="space-y-2">
          <Select onValueChange={addPreferredLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Add preferred languages" />
            </SelectTrigger>
            <SelectContent>
              {PREFERRED_LANGUAGES.map((language) => (
                <SelectItem key={language} value={language}>
                  {language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preferredLanguages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {preferredLanguages.map((language) => (
                <Badge key={language} variant="secondary" className="gap-1">
                  {language}
                  <button
                    type="button"
                    onClick={() => removePreferredLanguage(language)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button className="w-full" size="lg" type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save & Continue'}
      </Button>
    </form>
  )
} 