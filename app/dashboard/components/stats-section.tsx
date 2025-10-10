"use client"

import { useEffect, useState } from "react"
import { BookOpen, Award, Clock, Users, Target } from "lucide-react"
import { StatsCard } from "./stats-card"
import { useProgress } from "@/lib/context/progress-context"
import { supabase } from "@/lib/supabase"

interface HRReport {
  id: string
  behavioral_metrics?: {
    overallScore?: number
  }
  created_at: string
}

export function StatsSection() {
  const { state, getInterviewHistory } = useProgress()

  // DSA & Progress Stats
  const [totalProblems, setTotalProblems] = useState<number | null>(null)

  // Tech Interview Stats
  const [totalTech, setTotalTech] = useState(0)
  const [avgTech, setAvgTech] = useState(0)

  // HR Interview Stats
  const [totalHR, setTotalHR] = useState(0)
  const [avgHR, setAvgHR] = useState(0)

  // ------------------- Fetch Total DSA Problems -------------------
  useEffect(() => {
    const fetchTotalProblems = async () => {
      try {
        const { count, error } = await supabase
          .from("problems")
          .select("*", { count: "exact", head: true })

        if (error) throw error
        setTotalProblems(count ?? 0)
      } catch (err) {
        console.error("Error fetching total problems:", err)
        setTotalProblems(0)
      }
    }
    fetchTotalProblems()
  }, [])

  // ------------------- Fetch Tech Interview Stats -------------------
  useEffect(() => {
    const fetchTechStats = async () => {
      try {
        const interviewHistory = getInterviewHistory() || []

        if (interviewHistory.length === 0) {
          setTotalTech(0)
          setAvgTech(0)
          return
        }

        const sessionIds = interviewHistory.map((i: any) => i.sessionId)

        const res = await fetch("/api/interview-evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionIds }),
        })

        if (!res.ok) throw new Error("Failed to fetch interview evaluations")

        const data = await res.json()
        // Note: we only need interviewHistory to calculate stats
        setTotalTech(interviewHistory.length)
        const avg = Math.round(
          interviewHistory.reduce((sum: number, i: any) => sum + (i.mcqMarks || 0), 0) /
            interviewHistory.length
        )
        setAvgTech(avg)
      } catch (err) {
        console.error("Error fetching tech interview stats:", err)
        setTotalTech(0)
        setAvgTech(0)
      }
    }
    fetchTechStats()
  }, [getInterviewHistory])

  // ------------------- Fetch HR Interview Stats -------------------
  useEffect(() => {
    const fetchHRStats = async () => {
      try {
        const res = await fetch("/api/hr-reports")
        if (!res.ok) throw new Error("Failed to fetch HR reports")

        const data = await res.json()
        const reports: HRReport[] = data.reports || []

        setTotalHR(reports.length)
        if (reports.length > 0) {
          const avg = Math.round(
            reports.reduce((sum, r) => sum + (r.behavioral_metrics?.overallScore || 0), 0) /
              reports.length
          )
          setAvgHR(avg)
        }
      } catch (err) {
        console.error("Error fetching HR interview stats:", err)
        setTotalHR(0)
        setAvgHR(0)
      }
    }
    fetchHRStats()
  }, [])

  return (
  <div className="space-y-8 mb-4">
    {/*  DSA/Progress Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatsCard
        title="DSA Problems"
        description="Practice data structures and algorithms"
        value={totalProblems !== null ? totalProblems : "Loading..."}
        icon={<BookOpen className="h-4 w-4" />}
        linkHref="/problems"
        linkText="View Problems"
      />

      <StatsCard
        title="Completed"
        description="Problems you've solved"
        value={state.totalSolved}
        icon={<Award className="h-4 w-4" />}
        linkHref="/profile"
        linkText="View Progress"
      />

      <StatsCard
        title="Streak"
        description="Your daily coding streak"
        value={`${state.streak} days`}
        icon={<Clock className="h-4 w-4" />}
        linkHref="/profile"
        linkText="View Activity"
      />

      {/* ⭐ New Upadyai Score Card */}
      <StatsCard
        title="Upadyai Score"
        description="Your overall progress score"
        value={
          totalProblems && totalProblems > 0
            ? `${Math.round((state.totalSolved / totalProblems) * 100)}%`
            : "0%"
        }
        icon={<Target className="h-4 w-4" />}
      />
    </div>

    {/* Interview Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Tech Interviews"
        description="Total technical interviews"
        value={totalTech}
        icon={<Users className="h-4 w-4" />}
      />

      <StatsCard
        title="Tech Avg Score"
        description="Average technical performance"
        value={`${avgTech}%`}
        icon={<Target className="h-4 w-4" />}
      />

      <StatsCard
        title="HR Interviews"
        description="Total HR interviews"
        value={totalHR}
        icon={<Users className="h-4 w-4" />}
      />

      <StatsCard
        title="HR Avg Score"
        description="Average HR performance"
        value={`${avgHR}%`}
        icon={<Target className="h-4 w-4" />}
      />
    </div>
  </div>
)

}
