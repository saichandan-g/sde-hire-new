"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react"
import { useAuth } from "@/lib/context/auth-context"
import { supabase } from "@/lib/supabase"
import type { Question } from "@/app/dsa-tutor/types"

type ProblemStatus = "unsolved" | "solved" | "attempted"

type ProblemProgress = {
  id: number
  status: ProblemStatus
  lastAttempted?: string
  completedAt?: string
  attempts: number
  codeLength?: number
  solveTime?: number
  errorCount?: number
}

// Interview progress types
type InterviewProgress = {
  sessionId: string
  techStack: string
  mcqMarks: number
  totalQuestions: number
  avgTimePerQuestion: number
  completedAt: string
  evaluationData?: any
}

type ProgressState = {
  problemsProgress: Record<number, ProblemProgress>
  totalSolved: number
  totalAttempted: number
  streak: number
  lastActive?: string
  // Interview progress
  interviewsProgress: Record<string, InterviewProgress>
  totalInterviews: number
  averageInterviewScore: number
  lastInterviewDate?: string
}

type ProgressAction =
  | { type: "INIT_PROGRESS"; payload: ProgressState }
  | { type: "MARK_SOLVED"; payload: { problemId: number; codeLength?: number; solveTime?: number; errorCount?: number } }
  | { type: "MARK_ATTEMPTED"; payload: { problemId: number; errorCount?: number } }
  | { type: "RESET_PROGRESS" }
  | { type: "UPDATE_STREAK" }
  // Interview actions
  | { type: "ADD_INTERVIEW"; payload: InterviewProgress }
  | { type: "UPDATE_INTERVIEW"; payload: InterviewProgress }
  | { type: "LOAD_INTERVIEWS"; payload: Record<string, InterviewProgress> }

type ProgressContextType = {
  state: ProgressState
  markProblemSolved: (problemId: number, codeLength?: number, solveTime?: number, errorCount?: number) => void
  markProblemAttempted: (problemId: number, errorCount?: number) => void
  resetProgress: () => void
  getProblemStatus: (problemId: number) => ProblemStatus
  getProgressByDifficulty: (difficulty: string) => { solved: number; total: number }
  // Interview functions
  addInterview: (interview: InterviewProgress) => void
  updateInterview: (interview: InterviewProgress) => void
  getInterviewHistory: () => InterviewProgress[]
  getInterviewStats: () => { total: number; average: number; lastDate?: string }
}

const initialState: ProgressState = {
  problemsProgress: {},
  totalSolved: 0,
  totalAttempted: 0,
  streak: 0,
  // Interview initial state
  interviewsProgress: {},
  totalInterviews: 0,
  averageInterviewScore: 0,
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "INIT_PROGRESS":
      return action.payload

    case "MARK_SOLVED": {
      const { problemId, codeLength, solveTime, errorCount } = action.payload
      const existingProgress = state.problemsProgress[problemId]
      const isNewlySolved = !existingProgress || existingProgress.status !== "solved"

      return {
        ...state,
        problemsProgress: {
          ...state.problemsProgress,
          [problemId]: {
            id: problemId,
            status: "solved",
            attempts: existingProgress ? existingProgress.attempts + 1 : 1,
            lastAttempted: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            codeLength: codeLength ?? existingProgress?.codeLength,
            solveTime: solveTime ?? existingProgress?.solveTime,
            errorCount: errorCount ?? existingProgress?.errorCount ?? 0,
          },
        },
        totalSolved: isNewlySolved ? state.totalSolved + 1 : state.totalSolved,
        totalAttempted: existingProgress ? state.totalAttempted : state.totalAttempted + 1,
        lastActive: new Date().toISOString(),
      }
    }

    case "MARK_ATTEMPTED": {
      const { problemId, errorCount } = action.payload
      const existingProgress = state.problemsProgress[problemId]
      const isFirstAttempt = !existingProgress

      return {
        ...state,
        problemsProgress: {
          ...state.problemsProgress,
          [problemId]: {
            id: problemId,
            status: existingProgress?.status === "solved" ? "solved" : "attempted",
            attempts: existingProgress ? existingProgress.attempts + 1 : 1,
            lastAttempted: new Date().toISOString(),
            completedAt: existingProgress?.completedAt,
            codeLength: existingProgress?.codeLength,
            solveTime: existingProgress?.solveTime,
            errorCount: errorCount !== undefined ? errorCount : (existingProgress?.errorCount ?? 0) + 1,
          },
        },
        totalAttempted: isFirstAttempt ? state.totalAttempted + 1 : state.totalAttempted,
        lastActive: new Date().toISOString(),
      }
    }

    case "UPDATE_STREAK": {
      const today = new Date().toDateString()
      const lastActiveDate = state.lastActive ? new Date(state.lastActive).toDateString() : null

      if (lastActiveDate === today) {
        return state
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toDateString()

      if (lastActiveDate === yesterdayString) {
        return { ...state, streak: state.streak + 1 }
      }

      return { ...state, streak: 0 }
    }

    case "RESET_PROGRESS":
      return initialState

    case "ADD_INTERVIEW": {
      const { payload: interview } = action
      console.log('📊 Progress Reducer - ADD_INTERVIEW action:', interview);
      const existingInterviews = state.interviewsProgress
      const newInterviews = { ...existingInterviews, [interview.sessionId]: interview }
      const totalInterviews = Object.keys(newInterviews).length
      const allScores = Object.values(newInterviews).map(i => i.mcqMarks)
      const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0

      console.log('📊 Progress Reducer - Updated state:', {
        totalInterviews,
        averageScore,
        lastDate: interview.completedAt,
        interviewCount: Object.keys(newInterviews).length
      });

      return {
        ...state,
        interviewsProgress: newInterviews,
        totalInterviews,
        averageInterviewScore: averageScore,
        lastInterviewDate: interview.completedAt,
      }
    }

    case "UPDATE_INTERVIEW": {
      const { payload: interview } = action
      const updatedInterviews = { ...state.interviewsProgress, [interview.sessionId]: interview }
      const totalInterviews = Object.keys(updatedInterviews).length
      const allScores = Object.values(updatedInterviews).map(i => i.mcqMarks)
      const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0

      return {
        ...state,
        interviewsProgress: updatedInterviews,
        totalInterviews,
        averageInterviewScore: averageScore,
        lastInterviewDate: interview.completedAt,
      }
    }

    case "LOAD_INTERVIEWS": {
      const { payload: interviews } = action
      const totalInterviews = Object.keys(interviews).length
      const allScores = Object.values(interviews).map(i => i.mcqMarks)
      const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0
      const lastDate = Object.values(interviews).length > 0 
        ? Object.values(interviews).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0].completedAt
        : undefined

      return {
        ...state,
        interviewsProgress: interviews,
        totalInterviews,
        averageInterviewScore: averageScore,
        lastInterviewDate: lastDate,
      }
    }

    default:
      return state
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(progressReducer, initialState)
  const [problems, setProblems] = useState<Question[]>([])

  // Fetch problems from Supabase
  const loadProblems = useCallback(async () => {
    const { data, error } = await supabase
      .from("problems")
      .select("id, difficulty, metadata")
      .order("id", { ascending: true })

    if (error) {
      console.error("Error fetching problems:", error)
      setProblems([])
      return
    }

    setProblems(data as Question[])
  }, [])

  const loadProgress = useCallback(async () => {
    if (!user || !user.id) {
      console.warn("No user or user.id available, initializing empty progress")
      dispatch({ type: "INIT_PROGRESS", payload: initialState })
      return
    }

    try {
      console.log("Fetching progress for user ID:", user.id)
      const { data, error } = await supabase
        .from("users")
        .select("progress, progress_technicalinterview, first_name, last_name, display_name, role")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        throw new Error(`Supabase error: ${error.message}, code: ${error.code}, details: ${error.details}`)
      }

      if (!data) {
        console.warn("No user found, creating new progress record")
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            progress: initialState,
            first_name: user.user_metadata?.first_name || "Unknown",
            last_name: user.user_metadata?.last_name || "User",
            display_name: user.user_metadata?.display_name || null,
            role: "user",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (insertError) {
          throw new Error(`Failed to create user: ${insertError.message}`)
        }

        dispatch({ type: "INIT_PROGRESS", payload: initialState })
        return
      }

      const progress = data.progress || initialState
      console.log("Fetched progress:", progress)
      const safeProgress: ProgressState = {
        problemsProgress: progress.problemsProgress || {},
        totalSolved: progress.totalSolved || 0,
        totalAttempted: progress.totalAttempted || 0,
        streak: progress.streak || 0,
        lastActive: progress.lastActive,
        // Interview progress
        interviewsProgress: progress.interviewsProgress || {},
        totalInterviews: progress.totalInterviews || 0,
        averageInterviewScore: progress.averageInterviewScore || 0,
        lastInterviewDate: progress.lastInterviewDate,
      }
      dispatch({ type: "INIT_PROGRESS", payload: safeProgress })

      // Load interview progress from progress_technicalinterview column
      if (data.progress_technicalinterview) {
        try {
          const interviewProgress = data.progress_technicalinterview
          if (interviewProgress && typeof interviewProgress === 'object') {
            dispatch({ type: "LOAD_INTERVIEWS", payload: interviewProgress })
          }
        } catch (error) {
          console.error("Error parsing interview progress:", error)
        }
      }
    } catch (error) {
      console.error("Error fetching progress:", error)
      dispatch({ type: "INIT_PROGRESS", payload: initialState })
    }

    dispatch({ type: "UPDATE_STREAK" })
  }, [user])

  const saveProgress = async (updatedState: ProgressState) => {
    if (!user || !user.id) {
      console.warn("No user or user.id available, skipping progress save")
      return
    }

    try {
      console.log("Saving progress for user ID:", user.id, "Data:", updatedState)
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("first_name, last_name, display_name, role")
        .eq("id", user.id)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch user for update: ${fetchError.message}`)
      }

      const { error } = await supabase
        .from("users")
        .update({
          progress: updatedState,
          progress_technicalinterview: updatedState.interviewsProgress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        throw new Error(`Supabase error: ${error.message}, code: ${error.code}, details: ${error.details}`)
      }
      console.log("Progress saved successfully:", updatedState)
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  useEffect(() => {
    console.log("User from useAuth:", user)
    if (user) {
      loadProblems()
      loadProgress()
    }
  }, [user, loadProblems, loadProgress])

  const markProblemSolved = (problemId: number, codeLength?: number, solveTime?: number, errorCount?: number) => {
    const updatedState = progressReducer(state, { type: "MARK_SOLVED", payload: { problemId, codeLength, solveTime, errorCount } })
    dispatch({ type: "MARK_SOLVED", payload: { problemId, codeLength, solveTime, errorCount } })
    saveProgress(updatedState)
  }

  const markProblemAttempted = (problemId: number, errorCount?: number) => {
    const updatedState = progressReducer(state, { type: "MARK_ATTEMPTED", payload: { problemId, errorCount } })
    dispatch({ type: "MARK_ATTEMPTED", payload: { problemId, errorCount } })
    saveProgress(updatedState)
  }

  const resetProgress = () => {
    dispatch({ type: "RESET_PROGRESS" })
    saveProgress(initialState)
  }

  const getProblemStatus = (problemId: number): ProblemStatus => {
    return state.problemsProgress[problemId]?.status || "unsolved"
  }

  const getProgressByDifficulty = (difficulty: string) => {
    const problemsByDifficulty = problems.filter(
      (q) => q.difficulty.toLowerCase() === difficulty.toLowerCase(),
    )
    const solvedCount = problemsByDifficulty.filter(
      (q) => state.problemsProgress[q.id]?.status === "solved",
    ).length

    return { solved: solvedCount, total: problemsByDifficulty.length }
  }

  // Interview functions
  const addInterview = (interview: InterviewProgress) => {
    console.log('📊 Progress Context - Adding interview:', interview);
    const updatedState = progressReducer(state, { type: "ADD_INTERVIEW", payload: interview })
    dispatch({ type: "ADD_INTERVIEW", payload: interview })
    saveProgress(updatedState)
    console.log('📊 Progress Context - Interview added successfully');
  }

  const updateInterview = (interview: InterviewProgress) => {
    const updatedState = progressReducer(state, { type: "UPDATE_INTERVIEW", payload: interview })
    dispatch({ type: "UPDATE_INTERVIEW", payload: interview })
    saveProgress(updatedState)
  }

  const getInterviewHistory = () => {
    return Object.values(state.interviewsProgress)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  }

  const getInterviewStats = () => {
    const totalInterviews = state.totalInterviews
    const averageScore = Math.round(state.averageInterviewScore * 10) / 10 // Round to 1 decimal place
    const lastDate = state.lastInterviewDate

    return { total: totalInterviews, average: averageScore, lastDate }
  }

  return (
    <ProgressContext.Provider
      value={{
        state,
        markProblemSolved,
        markProblemAttempted,
        resetProgress,
        getProblemStatus,
        getProgressByDifficulty,
        // Interview functions
        addInterview,
        updateInterview,
        getInterviewHistory,
        getInterviewStats,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider")
  }
  return context
}
 