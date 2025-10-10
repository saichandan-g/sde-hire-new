import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Info, MessageSquare, Video } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface HRPresenceSidebarProps {
  interviewMode: "pro" | "video"
  currentQuestionIndex: number
  totalQuestions: number
}

export function HRPresenceSidebar({
  interviewMode,
  currentQuestionIndex,
  totalQuestions,
}: HRPresenceSidebarProps) {
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const [hasStream, setHasStream] = useState(false)
  const VIDEO_ID = "hrPresenceVideo"

  useEffect(() => {
    const attach = () => {
      const el = document.getElementById(VIDEO_ID) as HTMLVideoElement | null
      videoElRef.current = el
      if (!el) return
      const stream = (window as any).__hrVideoStream as MediaStream | null | undefined
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream
        el.play?.().catch(() => {})
        setHasStream(true)
      } else if (!stream) {
        setHasStream(false)
      }
    }
    attach()
    window.addEventListener("hr-video-stream", attach)
    return () => {
      window.removeEventListener("hr-video-stream", attach)
      // IMPORTANT: don't clear el.srcObject here—panel controls lifecycle.
    }
  }, [])

  const getModeIcon = () =>
    interviewMode === "video" ? <Video className="h-5 w-5 text-blue-600" /> : <Video className="h-5 w-5 text-blue-600" />
  const getModeColor = () => (interviewMode === "video" ? "text-blue-600" : "text-blue-600")

  return (
    <div className="space-y-4">
      <Card className="shadow-lg dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100">Your Presence</CardTitle>
          <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          {(interviewMode === "video" || interviewMode === "pro") ? (
            <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <video
                id={VIDEO_ID}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!hasStream && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
                  <div className="text-center">
                    <Video className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto" />
                    <p className="mt-2 font-medium text-gray-700 dark:text-gray-200">{interviewMode === "video" ? "Video Mode" : "Pro Mode"}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Camera Feed</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-gray-500 dark:text-gray-400 text-center">
                {getModeIcon()}
                <p className="mt-2 font-medium text-gray-700 dark:text-gray-200">Pro Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Camera Feed</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
              <p className="font-medium text-gray-700 dark:text-gray-200">Mode</p>
              <p className={getModeColor()}>
                <span className="capitalize">{interviewMode}</span>
              </p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
              <p className="font-medium text-gray-700 dark:text-gray-200">Status</p>
              <p className="text-blue-600 dark:text-blue-400">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

            <Card className="shadow-lg dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 dark:text-gray-100">Interview Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
            <span>Questions Completed</span>
            <span>
              {currentQuestionIndex}/{totalQuestions}
            </span>
          </div>
          <Progress value={(currentQuestionIndex / totalQuestions) * 100} className="h-2" />
          <Separator />
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> Work under pressure
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span> Team collaboration
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-700"></span> Handling feedback
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
