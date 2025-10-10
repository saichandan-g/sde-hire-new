"use client"

import type React from "react"
import dynamic from "next/dynamic"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading editor...</div>,
})

interface CodeEditorSectionProps {
  editorHeight: number
  customInputHeight: number
  showCustomInput: boolean
  selectedLanguage: any
  code: string
  editorHasFocus: boolean
  setEditorHasFocus: (focus: boolean) => void
  setCode: (code: string) => void
  editorRef: React.RefObject<any>
  customInput: string
  setCustomInput: (input: string) => void
  resetCustomInput: () => void
}

export function CodeEditorSection({
  editorHeight,
  customInputHeight,
  showCustomInput,
  selectedLanguage,
  code,
  editorHasFocus,
  setEditorHasFocus,
  setCode,
  editorRef,
  customInput,
  setCustomInput,
  resetCustomInput,
}: CodeEditorSectionProps) {
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor

    // Add focus event listener to clear placeholder
    editor.onDidFocusEditorWidget(() => {
      setEditorHasFocus(true)
      if (code === getPlaceholderComment()) {
        setCode("")
      }
    })

    // Add blur event listener
    editor.onDidBlurEditorWidget(() => {
      if (!editor.getValue()) {
        setEditorHasFocus(false)
        setCode(getPlaceholderComment())
      }
    })

    // Set editor options for better mobile experience and language-specific settings
    try {
      editor.updateOptions(getLanguageEditorOptions(selectedLanguage.name))
    } catch (error) {
      console.error("Error setting editor options:", error)
    }
  }

  // Get language-specific editor options
  const getLanguageEditorOptions = (languageName: string) => {
    const baseOptions = {
      minimap: { enabled: window.innerWidth >= 1024 },
      scrollBeyondLastLine: false,
      fontSize: window.innerWidth < 768 ? 12 : 14,
      lineNumbers: window.innerWidth < 768 ? "off" : "on",
      wordWrap: "on",
      automaticLayout: true,
      renderLineHighlight: "all",
    }

    switch (languageName) {
      case "python":
        return {
          ...baseOptions,
          tabSize: 4,
          insertSpaces: true,
        }
      case "java":
        return {
          ...baseOptions,
          tabSize: 4,
          insertSpaces: true,
        }
      case "cpp":
        return {
          ...baseOptions,
          tabSize: 2,
          insertSpaces: true,
        }
      case "c":
        return {
          ...baseOptions,
          tabSize: 4,
          insertSpaces: true,
        }
      case "javascript":
        return {
          ...baseOptions,
          tabSize: 2,
          insertSpaces: true,
        }
      default:
        return baseOptions
    }
  }

  // Get placeholder comment based on selected language
  const getPlaceholderComment = () => {
    if (editorHasFocus) return ""

    switch (selectedLanguage.name) {
      case "python":
        return "# Write your function here"
      case "javascript":
        return "// Write your function here"
      case "java":
        return "// Write your function here"
      case "cpp":
        return "// Write your function here"
      case "c":
        return "// Write your function here"
      default:
        return "// Write your function here"
    }
  }

  return (
    <>
      {/* Code Editor */}
      <div style={{ height: `${editorHeight}px` }} className="relative">
        <MonacoEditor
          height={`${editorHeight}px`}
          language={selectedLanguage.name}
          value={code}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize:
              selectedLanguage.name === "python" || selectedLanguage.name === "java" || selectedLanguage.name === "c"
                ? 4
                : 2,
            automaticLayout: true,
            lineNumbers: "on",
            renderLineHighlight: "all",
            wordWrap: "on",
          }}
          onMount={handleEditorDidMount}
          onChange={(value) => {
            if (value && !editorHasFocus) {
              setEditorHasFocus(true)
            }
            setCode(value || "")
          }}
        />
      </div>

      {/* Custom Input Area */}
      {showCustomInput && (
        <div className="border-t" style={{ height: `${customInputHeight}px` }}>
          <div className="flex items-center justify-between px-4 py-2 border-b h-10 dark:border-cyan-500 dark:neon-border-cyan">
            <div className="font-medium dark:neon-text-cyan">Custom Input</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetCustomInput}
                className="h-7 px-2 gap-1 dark:border-cyan-500 dark:neon-border-cyan"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
          <div className="p-2" style={{ height: `${customInputHeight - 40}px` }}>
            <Textarea
              placeholder="Enter your custom input here..."
              className="h-full resize-none font-mono text-sm"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  )
}
