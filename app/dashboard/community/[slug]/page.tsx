"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCommunity } from "@/components/community/community-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, ArrowLeft, Share2 } from "lucide-react"
import { toast } from "sonner"
import { MarkdownPreview } from "@/components/community/markdown-preview"

export default function CommunityPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const { posts, likePost, getPostBySlug } = useCommunity()

  const post = getPostBySlug(slug)

  if (!post) {
    return (
      <div className="space-y-6 p-6">
        <Link href="/dashboard/community">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </Button>
        </Link>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Post not found</p>
        </Card>
      </div>
    )
  }

  const handleLike = () => {
    likePost(slug)
    toast.success("Liked!")
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard!")
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Link href="/dashboard/community">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </Button>
      </Link>

      {/* Post Content */}
      <Card className="p-8">
        <div className="space-y-6">
          {/* Title and Meta */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{post.title}</h1>

            <div className="flex flex-wrap items-center gap-3">
              <Badge className="text-base">{post.company}</Badge>
              <Badge variant="secondary">{post.role}</Badge>
              {post.ctc && <Badge variant="outline">{post.ctc}</Badge>}
              {post.location && (
                <>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{post.location}</span>
                </>
              )}
              {post.rounds && (
                <>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{post.rounds} rounds</span>
                </>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Author Info and Actions */}
          <div className="flex items-center justify-between py-4 border-y border-border">
            <div className="flex items-center gap-3">
              {post.author?.avatar && (
                <img
                  src={post.author.avatar || "/placeholder.svg"}
                  alt={post.author.name}
                  className="h-10 w-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{post.author?.name || "Anonymous"}</p>
                {post.createdAt && (
                  <p className="text-sm text-muted-foreground">
                    Posted on {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleLike}>
                <Heart className="h-4 w-4" />
                {post.likes}
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <MarkdownPreview content={post.content} />
        </div>
      </Card>
    </div>
  )
}
