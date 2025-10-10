"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Smile, Mic, HardDrive } from "lucide-react"

interface HRConsentModalProps {
  onConsentAccepted: (camera: boolean, mic: boolean, textOnly: boolean) => void
}

export function HRConsentModal({ onConsentAccepted }: HRConsentModalProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [cameraChecked, setCameraChecked] = useState(true)
  const [micChecked, setMicChecked] = useState(true)

  const handleHRConsentAccept = () => {
    setIsOpen(false)
    onConsentAccepted(cameraChecked, micChecked, false)
  }

  const handleHRTextOnlyMode = () => {
    setIsOpen(false)
    onConsentAccepted(false, false, true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px] p-6 dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">Camera & Microphone Access</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
            We analyze facial expressions and voice patterns to provide behavioral insights. Your privacy is our
            priority.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Smile className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Facial Expression Analysis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Detects confidence, engagement, and emotional responses</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Mic className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Voice Pattern Recognition</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Analyzes speech pace, tone, and clarity</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Local Processing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">All analysis happens on your device - no data sent to servers</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button variant="outline" className="flex-1 py-2 bg-transparent dark:border-slate-600 dark:text-slate-200" onClick={handleHRTextOnlyMode}>
            Text Only Mode
          </Button>
          <Button className="flex-1 py-2" onClick={handleHRConsentAccept}>
            I Understand & Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
