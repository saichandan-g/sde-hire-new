import React from "react"
import { FileText, Clock, Target, Building2, Tag, BookOpen, Lightbulb, AlertTriangle, TrendingUp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Question } from "../types"

interface ChallengeDescriptionProps {
  currentQuestion: Question
  currentQuestionIndex: number
  challengeHeight: number
}

export const ChallengeDescription: React.FC<ChallengeDescriptionProps> = ({
  currentQuestion,
  currentQuestionIndex,
  challengeHeight,
}) => {
  const metadata = currentQuestion.metadata

  return (
    <div style={{ height: `${challengeHeight}px` }} className="border-b">
      {/* Header */}
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center h-10 dark:border-cyan-500 dark:neon-border-cyan">
        <FileText className="h-4 w-4 mr-2 dark:text-cyan-400" />
        <span className="font-medium dark:neon-text-cyan">Challenge</span>
      </div>

      <div
        className="pt-4 pr-4 pl-4 space-y-4 overflow-y-auto"
        style={{ maxHeight: `${challengeHeight - 40}px`, paddingBottom: '10%' }}
      >
        {/* Problem Title and Difficulty Badge */}
        <div>
          <h2 className="text-base md:text-lg font-bold mb-2 dark:neon-text-cyan">
            {currentQuestionIndex + 1}. {currentQuestion.title}
          </h2>
          {currentQuestion.difficulty && (
            <div className="flex items-center gap-2 mb-4">
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
            </div>
          )}
          <p className="whitespace-pre-line mb-4 text-xs md:text-sm">{currentQuestion.description}</p>
        </div>

        {/* Metadata Accordion */}
        {metadata && (
          <Accordion type="multiple" className="w-full">
            {/* Problem Details */}
            <AccordionItem value="problem-details" className="border-b">
              <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Problem Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium text-muted-foreground">Time Complexity:</span>
                    <span className="ml-1">{metadata.time_complexity || "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Space Complexity:</span>
                    <span className="ml-1">{metadata.space_complexity || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Expected Solve Time:</span>
                    <span className="ml-1">{metadata.expected_solve_time_minutes || "N/A"} minutes</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tags & Categories */}
            <AccordionItem value="tags-categories" className="border-b">
              <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  Tags & Categories
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {metadata.tags && metadata.tags.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {metadata.companies && metadata.companies.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Companies:</span>
                    <div className="flex flex-wrap gap-1">
                      {metadata.companies.map((company, index) => (
                        <Badge key={index} variant="outline" className="text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                          <Building2 className="h-2.5 w-2.5 mr-1" />
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {metadata.topic_category && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Topic Category:</span>
                      <span className="ml-1 text-xs">{metadata.topic_category}</span>
                    </div>
                  )}
                  
                  {metadata.subtopics && metadata.subtopics.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Subtopics:</span>
                      <div className="flex flex-wrap gap-1">
                        {metadata.subtopics.map((subtopic, index) => (
                          <Badge key={index} variant="outline" className="text-[10px] px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                            {subtopic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {metadata.prerequisites && metadata.prerequisites.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Prerequisites:</span>
                      <div className="flex flex-wrap gap-1">
                        {metadata.prerequisites.map((prereq, index) => (
                          <Badge key={index} variant="outline" className="text-[10px] px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800">
                            {prereq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Interview Insights */}
            <AccordionItem value="interview-insights" className="border-b">
              <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3" />
                  Interview Insights
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {metadata.interview_frequency && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Interview Frequency:</span>
                    <span className="ml-1 text-xs">{metadata.interview_frequency}</span>
                  </div>
                )}

                {metadata.common_approaches && metadata.common_approaches.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      Common Approaches:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {metadata.common_approaches.map((approach, index) => (
                        <li key={index} className="text-muted-foreground">{approach}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {metadata.common_mistakes && metadata.common_mistakes.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Common Mistakes:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {metadata.common_mistakes.map((mistake, index) => (
                        <li key={index} className="text-muted-foreground">{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Separator />

        {/* Input Format, Output Format, Constraints */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Input Format</h3>
            <p className="mt-1 whitespace-pre-line text-xs">{currentQuestion.input_format}</p>
          </div>

          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Output Format</h3>
            <p className="mt-1 whitespace-pre-line text-xs">{currentQuestion.output_format}</p>
          </div>

          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Constraints</h3>
            <p className="mt-1 whitespace-pre-line text-xs">{currentQuestion.constraints}</p>
          </div>
        </div>

        <Separator />

        {/* Sample Input/Output */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Example:</h3>
            <div className="mt-2 space-y-2">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Input:</div>
                <pre className="mt-1 bg-muted p-2 rounded-md overflow-x-auto text-[11px]">
                  <code>{currentQuestion.test_cases.sample_input}</code>
                </pre>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Output:</div>
                <pre className="mt-1 bg-muted p-2 rounded-md overflow-x-auto text-[11px]">
                  <code>{currentQuestion.test_cases.sample_output}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Hint */}
          <div>
            <h3 className="font-semibold text-xs md:text-sm dark:neon-text-yellow">Hint:</h3>
            <p className="mt-1 text-xs">{currentQuestion.hint}</p>
          </div>
        </div>
      </div>
    </div>
  )
}