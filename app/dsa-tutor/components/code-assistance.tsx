import { Sparkles, BrainCircuit, HelpCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProblemAssistanceTab } from "./problem-assistance"
import { AIAssistanceTab } from "./ai-assistance"
import type { ProblemAssistance } from "../types"


interface CodeAssistanceProps {
  assistanceHeight: number
  problemAssistance: ProblemAssistance
  fetchProblemAssistance: (forceRefresh?: boolean) => Promise<void>
  refreshExplanation: () => void
  currentQuestionIndex: number
  selectedLanguage: any
  setCode: (code: string) => void
  code: string // Add this to receive the current code
  executionStatus: "idle" | "running" | "success" | "error" // Add this to receive execution status
}

export function CodeAssistance({
  assistanceHeight,
  problemAssistance,
  fetchProblemAssistance,
  refreshExplanation,
  currentQuestionIndex,
  selectedLanguage,
  setCode,
  code, // Add this parameter
  executionStatus, // Add this parameter
}: CodeAssistanceProps) {
  return (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Header */}
    <div className="border-b bg-muted/30 px-4 py-2 flex items-center h-10 dark:border-pink-500 dark:neon-border-pink">
      <Sparkles className="h-4 w-4 mr-2 dark:text-pink-400" />
      <span className="font-medium dark:neon-text-pink">Code Assistance</span>
    </div>

    {/* Content */}
    <div className="flex-1 p-2 md:p-4 flex flex-col overflow-hidden">
      <Tabs defaultValue="problem" className="w-full h-full flex flex-col overflow-hidden">
        <TabsList className="w-full">
          <TabsTrigger
            value="problem"
            className="flex-1 text-xs md:text-sm dark:data-[state=active]:neon-text-cyan dark:data-[state=active]:neon-border-cyan"
          >
            <HelpCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden xs:inline">Problem</span>Problem Assistance
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="flex-1 text-xs md:text-sm dark:data-[state=active]:neon-text-pink dark:data-[state=active]:neon-border-pink"
          >
            <BrainCircuit className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden xs:inline">AI</span>AI Assistance
          </TabsTrigger>
        </TabsList>

        {/* Ensure TabsContent fills remaining space and scrolls */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="problem" className="h-full overflow-auto">
            <ProblemAssistanceTab
              problemAssistance={problemAssistance}
              fetchProblemAssistance={fetchProblemAssistance}
              refreshExplanation={refreshExplanation}
            />
          </TabsContent>

          <TabsContent value="ai" className="h-full overflow-auto">
            <AIAssistanceTab
              currentQuestionIndex={currentQuestionIndex}
              selectedLanguage={selectedLanguage}
              setCode={setCode}
              code={code}
              executionStatus={executionStatus}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  </div>
)

}
