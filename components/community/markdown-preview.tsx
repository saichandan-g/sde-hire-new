"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MarkdownPreviewProps {
  content: string
  title?: string
}

export function MarkdownPreview({ content, title = "Preview" }: MarkdownPreviewProps) {
  const renderMarkdown = (text: string) => {
    if (!text) {
      return <p className="text-muted-foreground italic">Your preview will appear here...</p>
    }

    const lines = text.split("\n")
    const elements: React.ReactNode[] = []

    lines.forEach((line, index) => {
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={index} className="text-2xl font-bold mt-4 mb-2">
            {line.replace("# ", "")}
          </h1>,
        )
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={index} className="text-xl font-bold mt-3 mb-2">
            {line.replace("## ", "")}
          </h2>,
        )
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={index} className="text-lg font-semibold mt-2 mb-1">
            {line.replace("### ", "")}
          </h3>,
        )
      } else if (line.startsWith("- ")) {
        elements.push(
          <li key={index} className="ml-4 list-disc">
            {line.replace("- ", "")}
          </li>,
        )
      } else if (line.trim() === "") {
        elements.push(<div key={index} className="h-2" />)
      } else {
        elements.push(
          <p key={index} className="text-sm leading-relaxed">
            {line}
          </p>,
        )
      }
    })

    return <div className="space-y-2">{elements}</div>
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Live preview of your content</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm dark:prose-invert max-w-none">{renderMarkdown(content)}</CardContent>
    </Card>
  )
}
