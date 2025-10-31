"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCommunity } from "@/components/community/community-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge" // Added import for Badge
import { ArrowLeft, Plus } from "lucide-react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { useAuth } from "@/lib/context/auth-context"
import { CommunityPost } from "@/lib/store"

export default function NewCommunityPostPage() {
  const router = useRouter()
  const { addPost } = useCommunity()
  const { user } = useAuth()

  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [location, setLocation] = useState("")
  const [ctc, setCtc] = useState("")
  const [rounds, setRounds] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!title || !company || !role || !content) {
      toast.error("Please fill in all required fields (Title, Company, Role, Content).")
      setLoading(false)
      return
    }

    const newPost: CommunityPost = {
      id: uuidv4(),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-*|-*$/g, ""),
      title,
      company,
      role,
      location,
      ctc,
      rounds: Number.parseInt(rounds) || 0, // Changed to 0 to ensure it's always a number
      tags,
      content,
      likes: 0,
      bookmarks: 0,
      author: {
        id: user?.id || "anonymous",
        name: user?.user_metadata?.display_name || user?.email || "Anonymous",
        avatar: user?.user_metadata?.avatar_url || "/placeholder.svg",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addPost(newPost)
    toast.success("Your experience has been shared!")
    router.push("/dashboard/community")
    setLoading(false)
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/dashboard/community">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Share Your Interview Experience</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctc">CTC (Optional)</Label>
                <Input id="ctc" value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="e.g., ₹80-100 LPA or $150K" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rounds">Number of Rounds (Optional)</Label>
                <Input id="rounds" type="number" value={rounds} onChange={(e) => setRounds(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="tags"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add tags (e.g., Arrays, System Design)"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tag
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      X
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Experience Details (Markdown supported)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                required
                placeholder="Write your detailed interview experience here. Markdown is supported for formatting."
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sharing..." : "Share Experience"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
