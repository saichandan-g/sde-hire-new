"use client"

import { useEffect, useState } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { ProblemHeader } from "./components/problem-header"
import { ProblemFilters } from "./components/problem-filters"
import { ProblemList } from "./components/problem-list"
import { Pagination } from "./components/pagination"
import { supabase } from "@/lib/supabase"

type Problem = {
  id: number
  title: string
  description: string
  difficulty: string
}

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [problems, setProblems] = useState<Problem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const problemsPerPage = 10

  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("id, title, description, difficulty")
        .order("id", { ascending: true })

      if (error) {
        console.error("Error fetching problems:", error)
      } else {
        setProblems(data)
      }
    }

    fetchProblems()
  }, [])

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty =
      difficultyFilter === "all" || problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
    return matchesSearch && matchesDifficulty
  })

  // Calculate pagination
  const totalProblems = filteredProblems.length
  const totalPagesCount = Math.ceil(totalProblems / problemsPerPage)
  
  // Update total pages when filtered problems change
  useEffect(() => {
    setTotalPages(totalPagesCount)
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [totalPagesCount])

  // Get current page problems
  const getCurrentPageProblems = () => {
    const startIndex = (currentPage - 1) * problemsPerPage
    const endIndex = startIndex + problemsPerPage
    return filteredProblems.slice(startIndex, endIndex)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AuthLayout>
      <div className="p-6">
        <ProblemHeader />

        <ProblemFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
        />

        <div className="space-y-4">
          <ProblemList filteredQuestions={getCurrentPageProblems()} />
          
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={totalProblems}
              itemsPerPage={problemsPerPage}
            />
          )}
        </div>
      </div>
    </AuthLayout>
  )
}


/*
"use client"

import { useState } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { ProblemHeader } from "./components/problem-header"
import { ProblemFilters } from "./components/problem-filters"
import { ProblemList } from "./components/problem-list"

// Import questions from the DSA tutor
import questionsData from "../dsa-tutor/questions.json"

export default function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")

  // Filter questions based on search query and difficulty
  const filteredQuestions = questionsData.filter((question) => {
    const matchesSearch = question.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty =
      difficultyFilter === "all" || question.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
    return matchesSearch && matchesDifficulty
  })

  return (
    <AuthLayout>
      <div className="p-6">
        <ProblemHeader />

        <ProblemFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
        />

        <ProblemList filteredQuestions={filteredQuestions} />
      </div>
    </AuthLayout>
  )
}
*/