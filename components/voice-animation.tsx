"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import Lottie from "lottie-react"
import voiceAssistantAnimation from "./Voice Assistant  Ai Chatbot.json"

interface VoiceAnimationProps {
  isActive: boolean
  size?: "sm" | "md" | "lg"
}

export function VoiceAnimation({ isActive, size = "sm" }: VoiceAnimationProps) {
  const animationRef = useRef<any>(null)

  useEffect(() => {
    if (animationRef.current) {
      if (isActive) {
        console.log("Playing animation")
        animationRef.current.play()
      } else {
        console.log("Pausing animation")
        animationRef.current.pause()
        animationRef.current.goToAndStop(0)
      }
    }
  }, [isActive])

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-40 h-40",
    lg: "w-48 h-48",
  }

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
      <div 
        className={cn(
          "transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-30"
        )}
      >
        <Lottie
          lottieRef={animationRef}
          animationData={voiceAssistantAnimation}
          loop={true}
          autoplay={true}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  )
}
