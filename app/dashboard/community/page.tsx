"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useCommunity } from "@/components/community/community-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, Bookmark, MessageSquare, Plus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CommunityPost } from "@/lib/store"

export default function CommunityPage() {
  const { posts } = useCommunity()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "ctc">("newest")

  // Get unique companies and roles for filters
  const companies = useMemo(() => {
    const unique = new Set(posts.map((p) => p.company))
    return Array.from(unique).sort()
  }, [posts])

  const roles = useMemo(() => {
    const unique = new Set(posts.map((p) => p.role))
    return Array.from(unique).sort()
  }, [posts])

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCompany = selectedCompany === "all" || post.company === selectedCompany
      const matchesRole = selectedRole === "all" || post.role === selectedRole

      return matchesSearch && matchesCompany && matchesRole
    })

    // Sort
    if (sortBy === "likes") {
      filtered.sort((a, b) => b.likes - a.likes)
    } else if (sortBy === "ctc") {
      filtered.sort((a, b) => {
        const aCtc = Number.parseInt(a.ctc?.replace(/[^\d]/g, "") || "0")
        const bCtc = Number.parseInt(b.ctc?.replace(/[^\d]/g, "") || "0")
        return bCtc - aCtc
      })
    } else {
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    }

    return filtered
  }, [posts, searchQuery, selectedCompany, selectedRole, sortBy])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-1">Share and learn from interview experiences</p>
        </div>
        <Link href="/dashboard/community/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Share Experience
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Search posts, companies, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="md:col-span-2"
        />

        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger>
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="likes">Most Liked</SelectItem>
            <SelectItem value="ctc">Highest CTC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-4">
        {filteredPosts.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No posts found. Try adjusting your filters.</p>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Link key={post.id} href={`/dashboard/community/${post.slug}`}>
              <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold hover:text-primary transition-colors">{post.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{post.company}</span>
                        <span>•</span>
                        <span>{post.role}</span>
                        <span>•</span>
                        <span>{post.location}</span>
                      </div>
                    </div>
                    {post.ctc && (
                      <Badge variant="secondary" className="ml-4">
                        {post.ctc}
                      </Badge>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{post.rounds} rounds</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt || new Date()), { addSuffix: true })}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bookmark className="h-4 w-4" />
                        <span>0</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={post.author?.avatar || "/placeholder.svg"}
                        alt={post.author?.name || "Author"}
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="text-sm font-medium">{post.author?.name || "Anonymous"}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
