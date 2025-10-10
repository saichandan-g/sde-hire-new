"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Video, ShieldCheck } from "lucide-react"

interface HRModeSelectionProps {
  onModeSelected: (mode: "pro" | "video") => void
}

export function HRModeSelection({ onModeSelected }: HRModeSelectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleModeSelect = (mode: "pro" | "video") => {
    setIsOpen(false)
    onModeSelected(mode)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">Choose Your Interview Mode</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
            Select how you'd like to participate in the interview simulation
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300 dark:hover:border-blue-600 dark:bg-slate-800 dark:border-slate-700"
            onClick={() => handleModeSelect("pro")}
          >
            <CardContent className="flex items-center space-x-3 p-4">
              <MessageSquare className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Pro Mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Full video interview with camera and microphone. Choose your preferred AI model for enhanced analysis.
                </p>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ✓ Camera + Microphone + Voice Recording + AI Model Selection + Behavioral insights
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300 dark:hover:border-blue-600 dark:bg-slate-800 dark:border-slate-700"
            onClick={() => handleModeSelect("video")}
          >
            <CardContent className="flex items-center space-x-3 p-4">
              <Video className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Video Interview Mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Full video interview with camera and microphone. Includes voice recording and behavioral analysis.
                </p>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  ✓ Camera + Microphone + Voice Recording + Behavioral insights
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
