"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Award, Star, Building2, Briefcase, Code, Users } from "lucide-react"
import { useAuth } from "@/lib/context/auth-context"
import { useProgress } from "@/lib/context/progress-context"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface UserProfile {
  experience_level: string
  target_companies: string[]
  target_roles: string[]
  preferred_languages: string[]
}

export function ProfileSidebar() {
  const { user } = useAuth()
  const { state: progressState } = useProgress()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [hrInterviewCount, setHrInterviewCount] = useState<number>(0)

  // Get total problems count from questions.json
  const questions = require("@/app/dsa-tutor/questions.json")
  const totalProblems = questions.length

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('profile, hr_interview_count')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          if (data.profile) {
            setUserProfile(data.profile)
          }
          setHrInterviewCount(data.hr_interview_count || 0)
        }
      }
    }

    fetchUserProfile()
  }, [user?.id])

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }
    return user?.email || "Guest User"
  }

  const getInitials = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
    }
    return "U"
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage
              src={user?.user_metadata?.avatar || "/abstract-geometric-shapes.png"}
              alt="User"
            />
            <AvatarFallback>
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-1 text-center">
            {getDisplayName()}
          </h2>
          {userProfile?.experience_level && (
            <p className="text-muted-foreground mb-4">
              {userProfile.experience_level} Developer
            </p>
          )}

          <div className="w-full mt-4 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Problems Solved</span>
                <span className="text-sm font-medium">
                  {progressState.totalSolved}/{totalProblems}
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(progressState.totalSolved / totalProblems) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Streak</span>
                <span className="text-sm font-medium">{progressState.streak} days</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(progressState.streak * 10, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">HR Interviews</span>
                <span className="text-sm font-medium">{hrInterviewCount} completed</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${Math.min(hrInterviewCount * 20, 100)}%` }}
                ></div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Profile Information */}
            {userProfile && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Target Companies</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.target_companies?.slice(0, 3).map((company) => (
                      <Badge key={company} variant="secondary" className="text-xs">
                        {company}
                      </Badge>
                    ))}
                    {userProfile.target_companies?.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{userProfile.target_companies.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Target Roles</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.target_roles?.slice(0, 2).map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                    {userProfile.target_roles?.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{userProfile.target_roles.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Languages</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.preferred_languages?.slice(0, 3).map((language) => (
                      <Badge key={language} variant="secondary" className="text-xs">
                        {language}
                      </Badge>
                    ))}
                    {userProfile.preferred_languages?.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{userProfile.preferred_languages.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted rounded-md">
                <Award className="h-5 w-5 mb-1 text-primary" />
                <span className="text-sm font-medium">Rank</span>
                <span className="text-lg font-bold">
                  {progressState.totalSolved > 0 ? "Beginner" : "-"}
                </span>
              </div>

              <div className="flex flex-col items-center p-3 bg-muted rounded-md">
                <Star className="h-5 w-5 mb-1 text-yellow-500" />
                <span className="text-sm font-medium">Points</span>
                <span className="text-lg font-bold">{progressState.totalSolved * 10}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



 