"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { mockCommunityPosts } from "@/lib/community-posts"
import { useStore, CommunityPost } from "@/lib/store"

interface CommunityContextType {
  posts: CommunityPost[]
  addPost: (post: CommunityPost) => void
  likePost: (slug: string) => void
  getPostBySlug: (slug: string) => CommunityPost | undefined
  toggleLikePost: (postId: string) => void
  toggleBookmarkPost: (postId: string) => void
  isPostLiked: (postId: string) => boolean
  isPostBookmarked: (postId: string) => boolean
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const {
    communityPosts,
    addCommunityPost,
    setCommunityPosts, // Added setCommunityPosts here
    getCommunityPostBySlug,
    toggleLikePost,
    toggleBookmarkPost,
    isPostLiked,
    isPostBookmarked,
  } = useStore()

  // Initialize posts if empty (first load)
  useEffect(() => {
    if (communityPosts.length === 0) {
      setCommunityPosts(mockCommunityPosts)
    }
  }, [communityPosts, setCommunityPosts])

  const likePost = useCallback(
    (slug: string) => {
      const post = getCommunityPostBySlug(slug)
      if (post) {
        toggleLikePost(post.id)
      }
    },
    [getCommunityPostBySlug, toggleLikePost],
  )

  const getPostBySlug = useCallback(
    (slug: string) => {
      return getCommunityPostBySlug(slug)
    },
    [getCommunityPostBySlug],
  )

  return (
    <CommunityContext.Provider
      value={{
        posts: communityPosts,
        addPost: addCommunityPost,
        likePost,
        getPostBySlug,
        toggleLikePost,
        toggleBookmarkPost,
        isPostLiked,
        isPostBookmarked,
      }}
    >
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) {
    throw new Error("useCommunity must be used within CommunityProvider")
  }
  return context
}
