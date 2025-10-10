"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Brain, Key } from "lucide-react"

interface AIModelSelectionProps {
  isOpen: boolean
  onModelSelected: (model: string, apiKey: string) => void
  onClose: () => void
  onBack: () => void
}

const AI_MODELS = [
  { id: "openai", name: "ChatGPT", icon: "/OpenAI-icon.svg" },
  { id: "mistral", name: "Mistral", icon: "/Mistral-Ai-Icon.svg" },
  { id: "gemini", name: "Gemini", icon: "/Gemini-icon.svg" },
  { id: "grok", name: "Grok", icon: "/grok-ai-icon.svg" }
]

export function AIModelSelection({ isOpen, onModelSelected, onClose, onBack }: AIModelSelectionProps) {
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [apiKey, setApiKey] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  // Commented validation for now
  // const validateApiKey = async (): Promise<boolean> => {
  //   try {
  //     setLoading(true)
  //     setError("")
  //     const res = await fetch("/api/validate-key", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ model: selectedModel, apiKey }),
  //     })
  //     if (!res.ok) throw new Error("Invalid")
  //     const data = await res.json()
  //     return data.valid === true
  //   } catch (err) {
  //     return false
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleContinue = async () => {
    if (!selectedModel || apiKey.trim() === "") {
      setError("Please select a model and enter your API key")
      return
    }

    // Skip validation for now
    // const isValid = await validateApiKey()
    // if (!isValid) {
    //   setError("API key is invalid or expired")
    //   return
    // }

    // ✅ Always proceed
    onModelSelected(selectedModel, apiKey.trim())
  }

  const selectedModelInfo = AI_MODELS.find(model => model.id === selectedModel)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Choose Your AI Model
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Select your preferred AI model and enter your API key to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Model Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Model
            </label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Select an AI model..." />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-3">
                      <Image 
                        src={model.icon} 
                        alt={model.name} 
                        width={24} 
                        height={24} 
                      />
                      <span className="font-medium">{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Model Preview */}
          {selectedModelInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3">
                <Image 
                  src={selectedModelInfo.icon} 
                  alt={selectedModelInfo.name} 
                  width={32} 
                  height={32} 
                />
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                    {selectedModelInfo.name} Selected
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Enter your API key to continue
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Key Input */}
          {selectedModel && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key
              </label>
              <Input 
                type="password"
                placeholder={`Enter your ${selectedModelInfo?.name} API key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-11"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full sm:w-auto order-2 sm:order-1"
            disabled={loading}
          >
            Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedModel || apiKey.trim() === ""}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
