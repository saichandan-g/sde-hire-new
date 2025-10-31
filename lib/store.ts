import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Problem {
  id: string
  slug: string
  title: string
  difficulty: "Easy" | "Medium" | "Hard"
  description: string
  examples: Array<{ input: string; output: string; explanation?: string }>
  constraints: string[]
  tags: string[]
  acceptance: number
  attempts: number
  lastSeen?: string
}

export interface Attempt {
  id: string
  problemId: string
  code: string
  language: string
  verdict: "Accepted" | "Wrong Answer" | "Runtime Error" | "Time Limit Exceeded"
  runtime: number
  memory: number
  timestamp: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  bio: string
  avatar: string
  problemsSolved: number
  streak: number
  accuracy: number
}

export interface CommunityPost {
  id: string
  slug: string
  title: string
  company: string
  role: string
  location: string
  ctc?: string
  rounds: number
  tags: string[]
  content: string
  author: {
    id: string
    name: string
    avatar: string
  }
  likes: number
  bookmarks: number
  createdAt: string
  updatedAt: string
}

interface Store {
  user: UserProfile
  attempts: Attempt[]
  solvedProblems: Set<string>
  communityPosts: CommunityPost[]
  userLikedPosts: Set<string>
  userBookmarkedPosts: Set<string>
  updateUser: (user: Partial<UserProfile>) => void
  addAttempt: (attempt: Attempt) => void
  markProblemSolved: (problemId: string) => void
  getAttemptsByProblem: (problemId: string) => Attempt[]
  addCommunityPost: (post: CommunityPost) => void
  setCommunityPosts: (posts: CommunityPost[]) => void // Added new action
  getCommunityPosts: () => CommunityPost[]
  getCommunityPostBySlug: (slug: string) => CommunityPost | undefined
  toggleLikePost: (postId: string) => void
  toggleBookmarkPost: (postId: string) => void
  isPostLiked: (postId: string) => boolean
  isPostBookmarked: (postId: string) => boolean
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: {
        id: "user-1",
        name: "Alex Developer",
        email: "alex@upadyai.ai",
        bio: "Passionate about DSA and competitive programming",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        problemsSolved: 0,
        streak: 0,
        accuracy: 0,
      },
      attempts: [],
      solvedProblems: new Set(),
      communityPosts: [],
      userLikedPosts: new Set(),
      userBookmarkedPosts: new Set(),
      updateUser: (updates) =>
        set((state) => ({
          user: { ...state.user, ...updates },
        })),
      addAttempt: (attempt) =>
        set((state) => {
          const newAttempts = [...state.attempts, attempt]
          const isSolved = attempt.verdict === "Accepted"
          const newSolvedProblems = new Set(state.solvedProblems)
          if (isSolved) {
            newSolvedProblems.add(attempt.problemId)
          }
          return {
            attempts: newAttempts,
            solvedProblems: newSolvedProblems,
            user: {
              ...state.user,
              problemsSolved: newSolvedProblems.size,
            },
          }
        }),
      markProblemSolved: (problemId) =>
        set((state) => {
          const newSolvedProblems = new Set(state.solvedProblems)
          newSolvedProblems.add(problemId)
          return {
            solvedProblems: newSolvedProblems,
            user: {
              ...state.user,
              problemsSolved: newSolvedProblems.size,
            },
          }
        }),
      getAttemptsByProblem: (problemId) => {
        const attempts = get().attempts
        return attempts.filter((a) => a.problemId === problemId)
      },
      addCommunityPost: (post) =>
        set((state) => ({
          communityPosts: [post, ...state.communityPosts],
        })),
      setCommunityPosts: (posts) => set({ communityPosts: posts }), // Implementation of new action
      getCommunityPosts: () => get().communityPosts,
      getCommunityPostBySlug: (slug) => {
        const posts = get().communityPosts
        return posts.find((p) => p.slug === slug)
      },
      toggleLikePost: (postId) =>
        set((state) => {
          const newLiked = new Set(state.userLikedPosts)
          if (newLiked.has(postId)) {
            newLiked.delete(postId)
          } else {
            newLiked.add(postId)
          }
          return { userLikedPosts: newLiked }
        }),
      toggleBookmarkPost: (postId) =>
        set((state) => {
          const newBookmarked = new Set(state.userBookmarkedPosts)
          if (newBookmarked.has(postId)) {
            newBookmarked.delete(postId)
          } else {
            newBookmarked.add(postId)
          }
          return { userBookmarkedPosts: newBookmarked }
        }),
      isPostLiked: (postId) => get().userLikedPosts.has(postId),
      isPostBookmarked: (postId) => get().userBookmarkedPosts.has(postId),
    }),
    {
      name: "upadyai-store",
      storage: typeof window !== "undefined" ? (localStorage as Storage) : undefined,
    },
  ),
)
