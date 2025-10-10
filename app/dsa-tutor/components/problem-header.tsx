"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { List, ChevronLeft, ChevronRight, CheckCircle, Code } from "lucide-react"
import type { Question, Language } from "../types" 
import { useProgress } from "@/lib/context/progress-context"
import { languages } from "../languages"

interface ProblemHeaderProps {
  questions: Question[]
  currentQuestionIndex: number
  setCurrentQuestionIndex: (index: number) => void
  currentQuestion: Question | undefined
  isMobile?: boolean
  selectedLanguage: Language
  handleLanguageChange: (value: string) => void
  isProUser: boolean
  setIsProUser: (value: boolean) => void
}

export function ProblemHeader({
  questions,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  currentQuestion,
  isMobile = false,
  selectedLanguage,
  handleLanguageChange,
  isProUser,
  setIsProUser,
}: ProblemHeaderProps) {
  const { getProblemStatus } = useProgress()

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between w-full px-4 gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center border rounded-md mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground dark:text-blue-400 dark:neon-text-blue"
              >
                <List className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Problem List</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[280px] overflow-y-auto">
              {questions.map((question, index) => {
                const status = getProblemStatus(question.id)
                return (
                  <DropdownMenuItem
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center text-ellipsis overflow-hidden">
                      {status === "solved" && <CheckCircle className="h-3 w-3 mr-1 text-green-500 flex-shrink-0" />}
                      <span className="truncate">
                        {index + 1}. {question.title}
                      </span>
                    </span>
                    <Badge
                      variant={
                        question.difficulty === "Easy"
                          ? "outline"
                          : question.difficulty === "Medium"
                            ? "secondary"
                            : "destructive"
                      }
                      className="ml-2 flex-shrink-0"
                    >
                      {question.difficulty}
                    </Badge>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-w-0">
          {currentQuestion && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium truncate">
                {currentQuestionIndex + 1}. {currentQuestion.title}
              </span>
              <Badge
                variant={
                  currentQuestion.difficulty === "Easy"
                    ? "outline"
                    : currentQuestion.difficulty === "Medium"
                      ? "secondary"
                      : "destructive"
                }
              >
                {currentQuestion.difficulty}
              </Badge>
              {getProblemStatus(currentQuestion.id) === "solved" && <Badge variant="success">Solved</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Language Selection Dropdown and User Mode Toggle */}
      <div className="flex items-center gap-3">
        {/* User Mode Toggle */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="user-mode" className="text-sm font-medium">
            {isProUser ? "Pro" : "Free"}
          </Label>
          <Switch
            id="user-mode"
            checked={isProUser}
            onCheckedChange={setIsProUser}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-3 gap-2 min-w-[120px] justify-between">
              <Code className="h-4 w-4" />
              <span>{selectedLanguage.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[120px]">
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.value}
                onClick={() => handleLanguageChange(language.value)}
                className="flex items-center gap-2"
              >
                {language.label === selectedLanguage.label && <CheckCircle className="h-3 w-3 text-green-500" />}
                <span className={language.label === selectedLanguage.label ? "font-medium" : ""}>{language.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
