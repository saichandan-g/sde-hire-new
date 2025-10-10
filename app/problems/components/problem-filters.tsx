"use client"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

interface ProblemFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  difficultyFilter: string
  setDifficultyFilter: (difficulty: string) => void
}

export function ProblemFilters({
  searchQuery,
  setSearchQuery,
  difficultyFilter,
  setDifficultyFilter,
}: ProblemFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search problems..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
