"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { CloudUpload, FileText, CheckCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface HRResumeUploadProps {
  onFileUpload: (file: File) => void
}

export function HRResumeUpload({ onFileUpload }: HRResumeUploadProps) {
  const [hrFileName, setHRFileName] = useState<string | null>(null)
  const [isHRUploading, setIsHRUploading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const onHRDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setHRFileName(file.name)
        setIsHRUploading(true)
        onFileUpload(file)
      }
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onHRDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (hrFileName && isHRUploading) {
      const hrTimer = setTimeout(() => {
        setIsHRUploading(false)
      }, 2000)

      return () => clearTimeout(hrTimer)
    }
  }, [hrFileName, isHRUploading])

  return (
    <div className="relative flex items-center justify-center overflow-hidden">
      {/* Clean, simple design - no sparkle effects */}

      <Card
        className={`w-full max-w-lg p-6 text-center shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transition-all duration-1000 transform ${
          isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
        }`}
      >
        <CardHeader className="space-y-4">
          <div className="relative">
            <CardTitle
              className={`text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-blue-400 dark:via-blue-300 dark:to-blue-500 bg-clip-text text-transparent transition-all duration-1000 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              Start Your Interview Journey
            </CardTitle>
            <div className="absolute -top-2 -right-2">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-ping"></div>
            </div>
          </div>

          <p
            className={`text-base text-gray-600 dark:text-gray-300 transition-all duration-1000 delay-200 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Upload your resume to generate personalized interview questions
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] ${
              isDragActive
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 scale-[1.02] shadow-lg"
                : "border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-white dark:from-slate-700 dark:to-slate-800 hover:border-blue-400 dark:hover:border-blue-300 hover:shadow-md"
            } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
            style={{ transitionDelay: "400ms" }}
          >
            <input {...getInputProps()} />

            {/* Upload Icon with Animation */}
            <div className="relative mb-4">
              {hrFileName ? (
                <div className="flex flex-col items-center space-y-2">
                  {isHRUploading ? (
                    <div className="relative">
                      <CloudUpload className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-bounce" />
                      <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 dark:border-blue-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <CheckCircle className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-scale-in" />
                  )}
                </div>
              ) : (
                <CloudUpload
                  className={`mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 transition-all duration-300 ${
                    isDragActive ? "text-blue-500 dark:text-blue-400 scale-110 animate-bounce" : "hover:text-blue-500 dark:hover:text-blue-400 hover:scale-105"
                  }`}
                />
              )}
            </div>

            {/* Upload Text */}
            <div className="space-y-2">
              {hrFileName ? (
                <div className="space-y-2">
                  <p className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    {isHRUploading ? `Uploading ${hrFileName}...` : `File selected: ${hrFileName}`}
                  </p>
                  {isHRUploading && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-progress"></div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p
                    className={`text-lg font-medium text-gray-700 dark:text-gray-200 transition-all duration-300 ${
                      isDragActive ? "text-blue-600 dark:text-blue-400 scale-105" : ""
                    }`}
                  >
                    {isDragActive ? "Drop your resume here!" : "Drop your resume here"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse files</p>
                </>
              )}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Supports PDF, DOCX files up to 10MB</p>

            <Button
              type="button"
              className={`mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                hrFileName ? "opacity-50 cursor-not-allowed" : "animate-pulse-subtle"
              }`}
              disabled={hrFileName !== null}
            >
              {hrFileName ? "File Uploaded" : "Choose File"}
            </Button>

            {/* Floating particles effect on drag */}
            {isDragActive && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full animate-float-particle"></div>
                <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-float-particle-delayed"></div>
                <div className="absolute bottom-6 left-8 w-2 h-2 bg-blue-300 dark:bg-blue-500 rounded-full animate-float-particle-slow"></div>
                <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-blue-400 dark:bg-blue-300 rounded-full animate-float-particle"></div>
              </div>
            )}
          </div>

          {isHRUploading && (
            <div className={`text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 animate-fade-in`}>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span>Generating questions... This may take a moment.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-180deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(90deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes twinkle-delayed {
          0%, 100% { opacity: 0.2; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.8; transform: scale(1.3) rotate(180deg); }
        }
        
        @keyframes twinkle-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }
        
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        @keyframes float-particle {
          0% { transform: translateY(0px) translateX(0px) opacity(1); }
          100% { transform: translateY(-30px) translateX(10px) opacity(0); }
        }
        
        @keyframes float-particle-delayed {
          0% { transform: translateY(0px) translateX(0px) opacity(1); }
          100% { transform: translateY(-25px) translateX(-8px) opacity(0); }
        }
        
        @keyframes float-particle-slow {
          0% { transform: translateY(0px) translateX(0px) opacity(1); }
          100% { transform: translateY(-20px) translateX(5px) opacity(0); }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
        .animate-twinkle-delayed { animation: twinkle-delayed 4s ease-in-out infinite; }
        .animate-twinkle-slow { animation: twinkle-slow 5s ease-in-out infinite; }
        .animate-scale-in { animation: scale-in 0.6s ease-out; }
        .animate-progress { animation: progress 2s ease-out; }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
        .animate-float-particle { animation: float-particle 2s ease-out infinite; }
        .animate-float-particle-delayed { animation: float-particle-delayed 2.5s ease-out infinite; }
        .animate-float-particle-slow { animation: float-particle-slow 3s ease-out infinite; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  )
}
