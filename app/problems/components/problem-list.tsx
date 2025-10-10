import { ProblemCard } from "./problem-card"

interface Problem {
  id: number
  title: string
  description: string
  difficulty: string
}

interface ProblemListProps {
  filteredQuestions: Problem[]
}

export function ProblemList({ filteredQuestions }: ProblemListProps) {
  if (filteredQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No problems found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredQuestions.map((problem, index) => (
        <ProblemCard
          key={problem.id}
          id={problem.id}
          index={index}
          title={problem.title}
          difficulty={problem.difficulty}
          question={problem.description}
        />
      ))}
    </div>
  )
}

/*
import { ProblemCard } from "./problem-card"
import type { Question } from "@/app/dsa-tutor/types"

interface ProblemListProps {
  filteredQuestions: Question[]
}

export function ProblemList({ filteredQuestions }: ProblemListProps) {
  if (filteredQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No problems found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredQuestions.map((question, index) => (
        <ProblemCard
          key={question.id}
          id={question.id}
          index={index}
          title={question.title}
          difficulty={question.difficulty}
          question={question.question}
        />
      ))}
    </div>
  )
}
*/