// components/hr-interview-panel.tsx
"use client"

/// <reference lib="dom" />
import type React from "react"
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Send, SkipForward, Volume2, Mic, MicOff, Info, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import Lottie from "react-lottie-player"
import micEnabledAnim from "@/lib/lottie/enable-mic.json"
import voiceLineAnim from "@/lib/lottie/voice-line-wave.json"

import EmotionDetector, { EmotionDetectorHandle } from "@/components/EmotionDetector"
import FaceSetupAssistant from "@/components/FaceSetupAssistant"

declare global {
  interface Window {
    __hrVideoStream?: MediaStream | null
    __hrAudioStream?: MediaStream | null
    __hrStopMedia?: () => void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
  }

  type SpeechRecognitionErrorCode =
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported";
}

interface HRInterviewPanelProps {
  question: string
  onNextQuestion: () => void
  isLastQuestion: boolean
  interviewMode: "pro" | "video"
  selectedAIModel?: string
  // Phase 4: Response Tracking Props
  currentQuestionIndex: number
  onUpdateResponse: (questionIndex: number, response: string) => Promise<void>
  getCurrentResponse: (questionIndex: number) => any
  responseStatus: {
    isSaving: boolean
    lastSaved: string | null
    saveError: string | null
  }
  // Phase 5: Progress tracking
  hrInterviewQuestions?: Array<{
    question_text: string
    question_type: string
    topic: string
  }>
}

type VoiceGender = "male" | "female"

export function HRInterviewPanel({
  question,
  onNextQuestion,
  isLastQuestion,
  interviewMode,
  selectedAIModel,
  // Phase 4: Response Tracking Props
  currentQuestionIndex,
  onUpdateResponse,
  getCurrentResponse,
  responseStatus,
  // Phase 5: Progress tracking
  hrInterviewQuestions,
}: HRInterviewPanelProps) {
  const [hrAnswerText, setHRAnswerText] = useState("")
  const [hrThinkTime, setHRThinkTime] = useState(30) // Increased thinking time to 30 seconds
  const [hrAnswerTime, setHRAnswerTime] = useState(60)
  const [isHRThinking, setIsHRThinking] = useState(true)
  const [hasStartedAnswering, setHasStartedAnswering] = useState(false)

  // Speech Recognition
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechListening, setIsSpeechListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any | null>(null); // Use any for now to bypass type issues
  const shouldAutoRestartRef = useRef(false);
  const finalTranscriptRef = useRef("");

  // New refs for mic/TTS sync and transcript
  const userMicPrefRef = useRef(false); // true = unmuted, false = muted (user's explicit preference), default to muted
  const autoMutedForTTSRef = useRef(false); // true if mic was auto-muted for TTS
  const prevMicEnabledRef = useRef(false); // stores micTrack.enabled state before auto-mute, default to false
  const transcriptsRef = useRef<Array<{ qId: string; q: string; tId: string; t: string }>>([]);
  const currentQuestionIdRef = useRef<string>("");
  const currentTranscriptionIdRef = useRef<string>("");

  // Initialize transcripts from localStorage and set initial question ID
  useEffect(() => {
    try {
      const storedTranscripts = localStorage.getItem("hr_stt_transcripts");
      if (storedTranscripts) {
        const parsed = JSON.parse(storedTranscripts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          transcriptsRef.current = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load transcripts from localStorage", e);
    }
    
    // Set initial question ID
    if (question) {
      currentQuestionIdRef.current = question;
      currentTranscriptionIdRef.current = question;
    }
  }, [question]);

  // Interview session state
  const [hasHRInterviewStarted, setHasHRInterviewStarted] = useState(interviewMode === "video" || interviewMode === "pro")
  // Setup gate: shown immediately in video mode and pro mode
  const [needsSetup, setNeedsSetup] = useState(interviewMode === "video" || interviewMode === "pro")

  // media
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [isMicMuted, setIsMicMuted] = useState(true); // Default to muted
  const micTrackRef = useRef<MediaStreamTrack | null>(null);

  // TTS
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("male");
  const [chosenVoice, setChosenVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsUtterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [pendingUtterance, setPendingUtterance] = useState<string | null>(null);

  // TTS warmup & policy pause tracking
  const ttsWarmedRef = useRef(false);
  const policyPausedRef = useRef(false);
  const firstSpeakDoneRef = useRef(false);

  // Lotties
  const lottieRef = useRef<any>(null); // mic animation
  const voiceWaveRef = useRef<any>(null); // wave animation
  const lottieReadyRef = useRef(false);

  const questionRef = useRef<string>("");

  // ❄️ Freeze state (penalty on multi-person)
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(3);
  const [isProcessingAction, setIsProcessingAction] = useState(false); // New state for action processing
  
  // Dialog state for finish interview confirmation
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  // detector ref (for manual save)
  const detectorRef = useRef<EmotionDetectorHandle | null>(null);

  // 🛡 ensure only one save happens at the end of interview
  const saveOnceRef = useRef(false);
  const saveInterviewOnce = useCallback(async () => {
    if (saveOnceRef.current) return;
    saveOnceRef.current = true;
    let saveSuccessful = false; // Track if save was successful
    try {
      // Save emotion detection data
      await detectorRef.current?.finalizeAndSave();

      // Save final interview report with Q&A numbering
      if (transcriptsRef.current.length > 0) {
        try {
          const report = {
            interviewDate: new Date().toISOString(),
            totalQuestions: transcriptsRef.current.length,
            transcripts: transcriptsRef.current.map(t => ({
              qId: t.qId,
              question: t.q,
              tId: t.tId,
              transcription: t.t
            }))
          };

          // Send to API route
          const response = await fetch('/api/save-qa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log("[Interview] Final report saved via API.");
          saveSuccessful = true; // Mark as successful

        } catch (e) {
          console.error("Failed to save final interview report via API:", e);
        }
      } else {
        console.log("[Interview] No transcripts to save. transcriptsRef.current is empty.");
        saveSuccessful = true; // Consider it successful if nothing to save
      }
    } finally {
      stopMedia(); // Always stop media
      // Only navigate if save was successful or if there were no transcripts to save
      if (saveSuccessful) {
        onNextQuestion();
      } else {
        console.warn("[Interview] Not navigating to next question because save failed.");
      }
    }
  }, [onNextQuestion]); // stopMedia captured below

  const formatHRTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Save interview data to localStorage for backup (disabled to prevent quota issues)
  const saveInterviewToLocalStorage = useCallback(async (data: any, filename: string) => {
    // Disabled to prevent localStorage quota issues
    console.log(`[Backup] Skipping localStorage backup for ${filename} to prevent quota issues`);
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setHRAnswerText(value);
    if ((interviewMode === "pro" || interviewMode === "video") && !hasStartedAnswering && value.trim().length > 0) {
      setHasStartedAnswering(true);
    }
    
    // Phase 4: Auto-save response as user types (both modes now)
    if (interviewMode === "pro" || interviewMode === "video") {
      // Combine typed text with speech transcript for both modes
      const combinedResponse = (value + " " + finalTranscriptRef.current).trim();
      console.log(`[Text Auto-save] ${interviewMode} mode Q${currentQuestionIndex + 1} (index: ${currentQuestionIndex}):`, combinedResponse.length, 'chars')
      onUpdateResponse(currentQuestionIndex, combinedResponse);
    }
  };

  // Broadcast video stream to sidebar if needed
  const broadcastStream = useCallback((stream: MediaStream | null) => {
    window.__hrVideoStream = stream;
    window.dispatchEvent(new CustomEvent("hr-video-stream"));
  }, []);

  // ===== HD camera with graceful fallback & logging =====
  const startCamera = useCallback(async () => {
    // reuse existing
    if (window.__hrVideoStream) {
      // IMPORTANT: do not broadcast yet during setup — keep left card blank
      setVideoStream(window.__hrVideoStream);
      return;
    }

    const tryGet = async (w: number, h: number) => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: w, min: 640 },
            height: { ideal: h, min: 480 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user",
          },
          audio: false,
        });
      } catch {
        return null;
      }
    };

    const order: Array<[number, number]> = [
      [1280, 720],
      [960, 540],
      [640, 480],
    ];

    let stream: MediaStream | null = null;
    for (const [w, h] of order) {
      stream = await tryGet(w, h);
      if (stream) break;
    }

    if (!stream) {
      console.error("[Camera] Failed to acquire video stream at any resolution");
      return;
    }

    // Keep it local for setup; no broadcast until user confirms
    setVideoStream(stream);

    // Log negotiated resolution
    const vtrack = stream.getVideoTracks?.()[0];
    const s = vtrack?.getSettings?.();
    if (s?.width && s?.height) {
      console.log(`[Camera] Using ${s.width}×${s.height} @ ${s.frameRate ?? "?"}fps`);
      if ((s.height as number) < 600) {
        console.warn("[Camera] Height < 600px — iris landmarks may be unreliable; HD recommended.");
      }
    }
  }, []);

  const startMic = useCallback(async () => {
    if (window.__hrAudioStream) {
      setAudioStream(window.__hrAudioStream);
      const t = window.__hrAudioStream.getAudioTracks()[0];
      micTrackRef.current = t || null;
      if (t) t.enabled = false; // Keep muted by default
      setIsMicMuted(true); // Keep muted by default
      userMicPrefRef.current = false; // Default to muted preference
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setAudioStream(stream);
      const t = stream.getAudioTracks()[0];
      micTrackRef.current = t || null;
      if (t) t.enabled = false; // Keep muted by default
      setIsMicMuted(true); // Keep muted by default
      userMicPrefRef.current = false; // Default to muted preference
    } catch (err) {
      console.error("Microphone start failed:", err);
    }
  }, []);

  // Explicit stop at end of session
  const stopMedia = useCallback(() => {
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
      window.__hrVideoStream = null;
      window.dispatchEvent(new CustomEvent("hr-video-stream"));
    }
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
      micTrackRef.current = null;
      window.__hrAudioStream = null;
    }
  }, [videoStream, audioStream]);

  useEffect(() => {
    window.__hrStopMedia = stopMedia;
  }, [stopMedia]);



  // Centralized STT start/stop helpers
  const startSTT = useCallback(() => {
    console.log("[STT] Attempting to start STT.");
    if (!speechSupported) {
      console.log("[STT] Not starting: speech not supported.");
      return;
    }

    // Robust re-initialization if recognitionRef.current is null
    if (!recognitionRef.current) {
      console.warn("[STT] recognitionRef.current is null. Attempting to re-initialize SpeechRecognition.");
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        console.error("[STT] SpeechRecognition API not found during re-initialization.");
        setSpeechError("Speech recognition not supported by this browser.");
        return;
      }
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-IN";
      r.onstart = () => {
        setIsSpeechListening(true);
        setSpeechError(null);
        console.log("[SR Event] onstart (re-init): STT is now listening.");
      };
      r.onerror = (e: SpeechRecognitionErrorEvent) => {
        const errorMessages: Record<string, string> = {
          "audio-capture": "Microphone access issue. Please check permissions.",
          "network": "Network error. Please check your connection.",
          "not-allowed": "Microphone permission denied. Please allow access.",
          "service-not-allowed": "Speech recognition service unavailable.",
          "bad-grammar": "Language configuration issue.",
          "language-not-supported": "Language not supported. Using English."
        };
        const userMessage = errorMessages[e.error] || `Recognition error: ${e.error}`;
        setSpeechError(userMessage);
        console.error("[SR Event] onerror (re-init):", e.error, e.message);
      };
      r.onend = () => {
        setIsSpeechListening(false);
        console.log("[SR Event] onend (re-init): STT stopped.");
      };
      r.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalTranscriptRef.current += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        setFinalTranscript(finalTranscriptRef.current);
        setInterimTranscript(interim);
        if (interviewMode === "video") {
          const fullResponse = (finalTranscriptRef.current + " " + interim).trim();
          onUpdateResponse(currentQuestionIndex, fullResponse);
        } else if (interviewMode === "pro") {
          const combinedResponse = (hrAnswerText + " " + finalTranscriptRef.current + " " + interim).trim();
          onUpdateResponse(currentQuestionIndex, combinedResponse);
        }
      };
      recognitionRef.current = r;
      console.log("[STT] recognitionRef.current re-initialized:", recognitionRef.current);
    }

    if (isSpeechListening) {
      console.log("[STT] Not starting: already listening.");
      return; // Already listening
    }
    
    // Additional safety check - ensure recognition is not in an active state
    try {
      if (recognitionRef.current.state === 'recording' || recognitionRef.current.state === 'starting') {
        console.log("[STT] Not starting: recognition already in active state:", recognitionRef.current.state);
        return;
      }
    } catch (e) {
      // State property might not exist in all browsers, continue
    }
    
    // Additional check - ensure we're not already listening
    if (isSpeechListening) {
      console.log("[STT] Not starting: already listening according to state");
      return;
    }
    
    // Force reset any existing recognition state
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log("[STT] Force stopped existing recognition before starting");
      }
    } catch (e) {
      console.log("[STT] Force stop before start failed (may already be stopped):", e);
    }
    
    // Wait a bit for the stop to take effect
    setTimeout(() => {
      try {
        setSpeechError(null);
        shouldAutoRestartRef.current = true;
        recognitionRef.current.start();
        setIsSpeechListening(true);
        setInterimTranscript(""); // Clear interim on start
        console.log("[STT] STT start() called successfully.");
      } catch (err) {
        setSpeechError("Could not start recognition. Try clicking Stop, then Start again.");
        console.error("[STT] Error calling start():", err);
      }
    }, 300); // Increased delay to allow stop to fully take effect
  }, [speechSupported, isSpeechListening, interviewMode, hrAnswerText, currentQuestionIndex, onUpdateResponse]);

  const stopSTT = useCallback(() => {
    console.log("[STT] Attempting to stop STT.");
    if (!recognitionRef.current) {
      console.log("[STT] Not stopping: recognitionRef missing.");
      return;
    }
    shouldAutoRestartRef.current = false;
    try {
      recognitionRef.current.stop();
      setIsSpeechListening(false);
      setInterimTranscript(""); // Clear interim on stop
      console.log("[STT] STT stop() called.");
    } catch (err) {
      console.error("[STT] Error calling stop():", err);
    }
  }, []);

  // Force reset STT state - useful for question changes
  const forceResetSTT = useCallback(() => {
    console.log("[STT] Force resetting STT state");
    shouldAutoRestartRef.current = false;
    setIsSpeechListening(false);
    setInterimTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("[STT] Force stop called");
      } catch (err) {
        console.log("[STT] Force stop failed (may already be stopped):", err);
      }
    }
  }, []);

  // Commit current transcript to local storage
  const commitCurrentTranscript = useCallback(() => {
    if (questionRef.current) {
      // Phase 4: Enhanced response combination for both modes
      let final;
      if (interviewMode === "pro") {
        // Pro mode: Combine typed text with speech transcript
        final = [
          hrAnswerText,                 // typed text
          finalTranscriptRef.current,   // finalized STT
          interimTranscript             // last interim (if any)
        ].join(" ").replace(/\s+/g, " ").trim();
      } else {
        // Video mode: Speech transcript only
        final = [
          finalTranscriptRef.current,   // finalized STT
          interimTranscript             // last interim (if any)
        ].join(" ").replace(/\s+/g, " ").trim();
      }

      // Always save entry, even if empty (null for transcription)
      const entry = { 
        qId: currentQuestionIdRef.current, 
        q: questionRef.current, 
        tId: currentQuestionIdRef.current, 
        t: final || null  // null if no transcription
      };
      
      try {
        const key = "hr_stt_transcripts";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const next = Array.isArray(existing) ? [...existing, entry] : [entry];
        localStorage.setItem(key, JSON.stringify(next));
        transcriptsRef.current = next;
        
        console.log(`[Transcript] Saved Q: "${questionRef.current}" T: ${final || "null"}`);
        
        // Auto-save current progress to localStorage after each question
        if (next.length > 0) {
          const progressData = {
            interviewDate: new Date().toISOString(),
            currentQuestion: currentQuestionIdRef.current,
            totalQuestions: next.length,
            transcripts: next,
            summary: next.map(t => ({
              qId: t.qId,
              question: t.q,
              tId: t.tId,
              transcription: t.t
            }))
          };
          
          // Save progress after each question to localStorage
          saveInterviewToLocalStorage(progressData, "hr_interview_progress");
        }
      } catch (e) {
        console.error("Failed to save transcript:", e);
      }
    }
    
    // Clear all buffers for fresh start
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setFinalTranscript("");
    setHRAnswerText("");
  }, [hrAnswerText, interimTranscript, saveInterviewToLocalStorage]);

  // Detect speech recognition support on client
  useEffect(() => {
    if (typeof window === "undefined") {
      console.log("[STT Support] Window is undefined. Cannot detect speech support.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSupported = !!SR;
    console.log(`[STT Support] Detecting speech recognition. Initial support: ${isSupported}.`);
    setSpeechSupported(isSupported);
    // Add a listener for when voices change, as this can sometimes indicate speech API readiness
    const handleVoicesChanged = () => {
      const currentSupport = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      if (currentSupport && !speechSupported) { // Only update if it wasn't supported before
        console.log("[STT Support] Speech API became available (via voiceschanged event). Updating speechSupported to true.");
        setSpeechSupported(true);
      }
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [speechSupported]); // Add speechSupported as a dependency to re-evaluate if it changes

  // Init speech recognition once on client - keep instance alive across question changes
  useEffect(() => {
    console.log("[STT Init] useEffect triggered. speechSupported:", speechSupported, "window defined:", typeof window !== "undefined");
    if (!speechSupported || typeof window === "undefined") {
      console.log("[STT Init] Speech not supported or window undefined. Skipping STT initialization.");
      return;
    }

    // Only initialize if not already initialized
    if (recognitionRef.current) {
      console.log("[STT Init] Recognition instance already exists, skipping initialization.");
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.error("[STT Init] SpeechRecognition API not found. This should not happen if speechSupported is true.");
      setSpeechError("Speech recognition not supported by this browser.");
      return;
    }

    console.log("[STT Init] Initializing SpeechRecognition instance.");
    const r = new SR();

    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-IN";

    r.onstart = () => {
      setIsSpeechListening(true);
      setSpeechError(null);
      console.log("[SR Event] onstart: STT is now listening.");
      
      // Track recognition state for debugging
      try {
        if (recognitionRef.current?.state) {
          console.log("[SR Event] Recognition state:", recognitionRef.current.state);
        }
      } catch (e) {
        // State property might not exist in all browsers
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      // Handle specific error types gracefully
      if (e.error === "no-speech") {
        console.log("[SR Event] No speech detected - this is normal");
        // Don't show error for no-speech, just log it
        return;
      }
      
      if (e.error === "aborted") {
        console.log("[SR Event] Speech recognition aborted - this is normal");
        return;
      }
      
      // For other errors, show user-friendly message
      const errorMessages: Record<string, string> = {
        "audio-capture": "Microphone access issue. Please check permissions.",
        "network": "Network error. Please check your connection.",
        "not-allowed": "Microphone permission denied. Please allow access.",
        "service-not-allowed": "Speech recognition service unavailable.",
        "bad-grammar": "Language configuration issue.",
        "language-not-supported": "Language not supported. Using English."
      };
      
      const userMessage = errorMessages[e.error] || `Recognition error: ${e.error}`;
      setSpeechError(userMessage);
      console.error("[SR Event] onerror:", e.error, e.message);
    };

    r.onend = () => {
      setIsSpeechListening(false);
      console.log("[SR Event] onend: STT stopped.");
      // STT will be restarted explicitly by TTS onend or user action, not automatically here.
    };

    r.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          finalTranscriptRef.current += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setFinalTranscript(finalTranscriptRef.current);
      setInterimTranscript(interim);
      
      // Phase 4: Auto-save response for both video and pro modes
      if (interviewMode === "video") {
        const fullResponse = (finalTranscriptRef.current + " " + interim).trim();
        console.log(`[STT Auto-save] Video mode Q${currentQuestionIndex + 1} (index: ${currentQuestionIndex}):`, fullResponse.length, 'chars')
        onUpdateResponse(currentQuestionIndex, fullResponse);
      } else if (interviewMode === "pro") {
        // For pro mode, combine speech with typed text
        const combinedResponse = (hrAnswerText + " " + finalTranscriptRef.current + " " + interim).trim();
        console.log(`[STT Auto-save] Pro mode Q${currentQuestionIndex + 1} (index: ${currentQuestionIndex}):`, combinedResponse.length, 'chars')
        onUpdateResponse(currentQuestionIndex, combinedResponse);
      }
    };

    recognitionRef.current = r;
    console.log("[STT Init] recognitionRef.current set:", recognitionRef.current);

    // Only cleanup on actual component unmount, NOT on re-renders
    return () => {
      console.log("[STT Cleanup] Component unmounting. Cleaning up SpeechRecognition instance.");
      if (recognitionRef.current) {
        try {
          shouldAutoRestartRef.current = false;
          recognitionRef.current.onstart = recognitionRef.current.onend = recognitionRef.current.onerror = recognitionRef.current.onresult = null;
          recognitionRef.current.stop();
          console.log("[STT Cleanup] SpeechRecognition instance stopped and event handlers cleared on unmount.");
        } catch (e) {
          console.warn("[STT Cleanup] Error stopping recognition during cleanup:", e);
        } finally {
          recognitionRef.current = null;
          console.log("[STT Cleanup] recognitionRef.current set to null on unmount.");
        }
      }
    };
  }, [speechSupported]); // This will only run once when speechSupported becomes true, and cleanup only on unmount

  // ---------- Save-on-submit ----------
  const handleSubmitHRAnswer = useCallback(async () => {
    if (isProcessingAction) return; // Prevent multiple clicks
    setIsProcessingAction(true);
    try {
      stopSTT(); // Stop STT immediately
      
      // Always save the current response before proceeding
      let currentResponse = "";
      if (interviewMode === "pro") {
        currentResponse = (hrAnswerText + " " + finalTranscriptRef.current).trim();
      } else {
        currentResponse = (finalTranscriptRef.current + " " + interimTranscript).trim();
      }
      
      if (currentResponse.trim()) {
        console.log(`[Submit] Saving final response for Q${currentQuestionIndex + 1}:`, currentResponse.length, 'chars');
        await onUpdateResponse(currentQuestionIndex, currentResponse);
      }
      
      // Now commit transcript after saving response
      commitCurrentTranscript();
      
      if (isLastQuestion) {
        console.log('[Submit] Last question - finishing interview');
        await saveInterviewOnce();
      } else {
        console.log('[Submit] Moving to next question');
        onNextQuestion();
      }
    } finally {
      setIsProcessingAction(false);
    }
  }, [onNextQuestion, isLastQuestion, saveInterviewOnce, stopSTT, commitCurrentTranscript, isProcessingAction, interviewMode, hrAnswerText, currentQuestionIndex, onUpdateResponse]);

  // ---------- Beep utility ----------
  const beep = useCallback((ms = 300, freq = 880) => {
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.stop(ctx.currentTime + ms / 1000 + 0.02);
    } catch {}
  }, []);

  // ---------- TTS Warmup ----------
  const warmupTTS = useCallback(() => {
    if (ttsWarmedRef.current) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      u.rate = 1;
      u.onend = () => {
        ttsWarmedRef.current = true;
      };
      window.speechSynthesis.speak(u);
    } catch {}
  }, []);

  // ========== New flow for VIDEO and PRO modes ==========
  // Immediately enter "interview started" state in video mode and pro mode and show setup assistant
  useEffect(() => {
    if (interviewMode !== "video" && interviewMode !== "pro") return;
    
    // Check if we already completed setup for this interview session
    const setupCompleted = localStorage.getItem('hr_interview_setup_completed');
    
    if (setupCompleted === 'true') {
      // Setup already completed, skip to interview
      setHasHRInterviewStarted(true);
      setNeedsSetup(false);
      console.log('[Setup] Skipping setup - already completed in this session');
      
      // Still prepare hardware for ongoing interview
      startCamera();
      startMic();
      warmupTTS();
      // If setup is already completed, queue the first question to be spoken
      setPendingUtterance(question);
    } else {
      // First time setup
      setHasHRInterviewStarted(true);
      setNeedsSetup(true);
      console.log('[Setup] Starting first-time setup');
      
      // prepare hardware, but do not broadcast yet
      startCamera();
      startMic();
      warmupTTS();
    }
    // For first-time setup, pendingUtterance is set in handleConfirmSetup after user interaction.
  }, [interviewMode, startCamera, startMic, warmupTTS, question]);

  // Called when user presses "Start Interview" inside the assistant
  const handleConfirmSetup = useCallback(() => {
    if (!videoStream) return;
    setNeedsSetup(false);

    // Mark setup as completed for this interview session
    localStorage.setItem('hr_interview_setup_completed', 'true');
    console.log('[Setup] Marked setup as completed for this session');

    // Set question ID for video mode
    currentQuestionIdRef.current = question;
    currentTranscriptionIdRef.current = question;
    
    // Ensure user preference is set to unmuted for video mode (so STT auto-starts after TTS)
    userMicPrefRef.current = true;

    // Now broadcast to the left "Presence" card
    window.__hrVideoStream = videoStream;
    window.dispatchEvent(new CustomEvent("hr-video-stream"));

    // Queue TTS to read the current question. The useEffect for pendingUtterance will handle conditions.
    console.log("[TTS Queue Activation] Setting pending utterance after setup confirmation:", question);
    setPendingUtterance(question);
  }, [videoStream, question]);

  // ---------------- TTS (voices) ----------------
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const selectPreferredVoice = useCallback(
    (all: SpeechSynthesisVoice[], gender: VoiceGender): SpeechSynthesisVoice | null => {
      const exactName = gender === "male" ? "Google UK English Male" : "Google UK English Female";
      const byExact = all.find(v => v.name === exactName && v.lang === "en-GB");
      if (byExact) return byExact;

      const googleGB = all.find(v => v.name.toLowerCase().includes("google") && v.lang === "en-GB");
      if (googleGB) return googleGB;

      const anyGB = all.find(v => v.lang === "en-GB");
      if (anyGB) return anyGB;

      const anyEN = all.find(v => v.lang?.toLowerCase().startsWith("en"));
      if (anyEN) return anyEN;

      return all[0] || null;
    },
    []
  );

  useEffect(() => {
    if (!voices.length) return;
    let v = selectPreferredVoice(voices, voiceGender);

    if (voiceGender === "male" && v && /female/i.test(v.name)) {
      const maleFallback =
        voices.find(vv => /male/i.test(vv.name) && vv.lang === "en-GB") ||
        voices.find(vv => /male/i.test(vv.name)) ||
        v;
      v = maleFallback;
    }
    if (voiceGender === "female" && v && /male/i.test(v.name)) {
      const femaleFallback =
        voices.find(vv => /female/i.test(vv.name) && vv.lang === "en-GB") ||
        voices.find(vv => /female/i.test(vv.name)) ||
        v;
      v = femaleFallback;
    }

    setChosenVoice(v || null);
    console.log("[TTS Voice Selection] Chosen voice updated:", v ? `${v.name} (${v.lang})` : "None");
  }, [voices, voiceGender, selectPreferredVoice]);

  useEffect(() => {
    if (voices.length) warmupTTS();
  }, [voices, warmupTTS]);

  const cancelTTS = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      policyPausedRef.current = false;
    } catch {}
  }, []);

  // Helper: start wave only when lottie is ready
  const startWaveIfReady = useCallback(() => {
    const wave = voiceWaveRef.current;
    if (!wave || !lottieReadyRef.current) return false;
    wave.goToAndPlay?.(0, true);
    return true;
  }, []);

  // Helper to restart STT after TTS events
  const restartSTTAfterTTS = useCallback((delay = 500) => {
    if (!userMicPrefRef.current) {
      console.log("[STT Restart Helper] User prefers muted, keeping STT stopped.");
      const t = micTrackRef.current ?? audioStream?.getAudioTracks?.()[0] ?? null;
      if (t) t.enabled = false;
      setIsMicMuted(true);
      return;
    }

    console.log(`[STT Restart Helper] Attempting to auto-start STT after delay (${delay}ms). User mic preference: ${userMicPrefRef.current}`);
    setTimeout(() => {
      // Ensure mic is enabled before starting STT
      const t = micTrackRef.current ?? audioStream?.getAudioTracks?.()[0] ?? null;
      if (t) {
        t.enabled = true;
        console.log("[STT Restart Helper] Mic track enabled.");
      }
      setIsMicMuted(false);

      // Force reset STT state first to ensure clean start
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log("[STT Restart Helper] Force stopped existing recognition.");
        } catch (e) {
          console.log("[STT Restart Helper] Force stop failed (may already be stopped):", e);
        }
      }
      
      // Reset state
      setIsSpeechListening(false);
      setInterimTranscript("");
      setFinalTranscript("");
      finalTranscriptRef.current = "";

      // Start fresh, only if user prefers mic on and STT is not already listening
      if (userMicPrefRef.current && !isSpeechListening) {
        console.log("[STT Restart Helper] Starting fresh STT after reset and mic enabled.");
        startSTT();
      } else {
        console.log("[STT Restart Helper] Not starting STT. User mic preference:", userMicPrefRef.current, "isSpeechListening:", isSpeechListening);
      }
    }, delay);
  }, [audioStream, isSpeechListening, startSTT]);

  const speakQuestion = useCallback((text: string) => {
    if (!text) {
      console.warn("[TTS] speakQuestion: No text provided.");
      return;
    }
    if (!chosenVoice) {
      console.warn("[TTS] speakQuestion: No chosen voice available. Cannot speak. Current voices:", voices);
      return;
    }
    try {
      console.log("[TTS] speakQuestion called with text:", text, "and voice:", chosenVoice.name);
      try { (window.speechSynthesis as any)?.resume?.() } catch (e) {
        console.warn("[TTS] Failed to resume speech synthesis (might be paused by policy):", e);
      }

      const u = new SpeechSynthesisUtterance(text);
      u.voice = chosenVoice;
      u.lang = chosenVoice.lang || "en-GB";
      u.rate = 0.92;
      u.pitch = voiceGender === "male" ? 0.85 : 1.05;
      u.volume = 1.0;

      u.onstart = () => {
        console.log("[TTS] onstart: TTS speaking started. Text length:", text.length);
        setIsSpeaking(true);
        if (isSpeechListening) {
          console.log("[TTS] onstart: STT was listening, stopping it now.");
          stopSTT();
          prevMicEnabledRef.current = micTrackRef.current?.enabled ?? true;
          if (micTrackRef.current) micTrackRef.current.enabled = false;
          setIsMicMuted(true);
          autoMutedForTTSRef.current = true;
        }
        if (!startWaveIfReady()) {
          const t0 = performance.now();
          const tick = () => {
            if (startWaveIfReady()) return;
            if (performance.now() - t0 < 300) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      };

      u.onend = () => {
        console.log("[TTS] onend: TTS speaking finished successfully. Speaking state:", window.speechSynthesis.speaking, "Pending state:", window.speechSynthesis.pending);
        setIsSpeaking(false);
        autoMutedForTTSRef.current = false;
        restartSTTAfterTTS(500);
      };

      u.onerror = (event) => {
        const errorType = event?.error || 'unknown';
        console.error(`[TTS] onerror: TTS speaking failed. Error type: ${errorType}. Event:`, event, "Speaking state:", window.speechSynthesis.speaking, "Pending state:", window.speechSynthesis.pending);
        // Attempt to log more details about the error if available
        if (event && 'message' in event) {
          console.error(`[TTS] onerror message: ${event.message}`);
        }
        setIsSpeaking(false);
        autoMutedForTTSRef.current = false;
        
        // More aggressive interruption handling: re-queue if interrupted
        if (errorType === 'interrupted' && text) {
          console.warn("[TTS] Interruption detected. Re-queueing utterance after a short delay.");
          setPendingUtterance(text); // Re-queue the same text
        }
        // Always attempt to restart STT after an error, regardless of re-queueing
        restartSTTAfterTTS(300);
      };

      ttsUtterRef.current = u;

      console.log("[TTS] Before cancel - Speaking:", window.speechSynthesis.speaking, "Pending:", window.speechSynthesis.pending);
      window.speechSynthesis.cancel(); // Ensure any ongoing speech is cancelled
      console.log("[TTS] After cancel - Speaking:", window.speechSynthesis.speaking, "Pending:", window.speechSynthesis.pending);
      // Add a small setTimeout to mitigate potential browser-specific timing issues
      setTimeout(() => {
        window.speechSynthesis.speak(u); // Directly speak the utterance
        console.log("[TTS] After speak (with setTimeout) - Speaking:", window.speechSynthesis.speaking, "Pending:", window.speechSynthesis.pending);
      }, 50); // 50ms delay
    } catch (e) {
      console.warn("TTS speak failed:", e);
    }
  }, [chosenVoice, voiceGender, startWaveIfReady, isSpeechListening, stopSTT, restartSTTAfterTTS]);

  // speak only when queued AND voice ready (and not frozen)
  useEffect(() => {
    if (!hasHRInterviewStarted || needsSetup) {
      console.log("[TTS Queue] Not speaking: Interview not started or setup needed.");
      return; // wait until setup confirmed
    }
    if (pendingUtterance && chosenVoice && !isFrozen && hasHRInterviewStarted && !needsSetup) {
      console.log("[TTS Queue] Speaking pending utterance:", pendingUtterance);
      // Ensure firstSpeakDoneRef.current is set to true after the first successful speak
      // Removed requestAnimationFrame for subsequent speaks to prevent potential race conditions/interruptions
      speakQuestion(pendingUtterance);
      firstSpeakDoneRef.current = true; // Always set to true after attempting to speak
      setPendingUtterance(null);
    } else {
      console.log("[TTS Queue] Not speaking. Conditions: Pending:", pendingUtterance, "Voice:", chosenVoice?.name, "Frozen:", isFrozen, "hasHRInterviewStarted:", hasHRInterviewStarted, "needsSetup:", needsSetup);
    }
  }, [pendingUtterance, chosenVoice, speakQuestion, hasHRInterviewStarted, isFrozen, needsSetup]);

  // -------------- Mic Lottie follows STT listening state --------------
  useEffect(() => {
    const api = lottieRef.current;
    if (!api) return;
    if (isSpeechListening && !isMicMuted) { // Only play if STT is listening and mic is not manually muted
      api.play?.();
    } else {
      api.pause?.();
      api.goToAndStop?.(0, true); // Ensure it's stopped and at the beginning
    }
  }, [isSpeechListening, isMicMuted]);

  // ---------- Lock wave speed before first paint ----------
  useLayoutEffect(() => {
    const wave = voiceWaveRef.current;
    lottieReadyRef.current = false;
    if (!wave) return;
    wave.setSpeed?.(0.15);
    wave.goToAndStop?.(0, true);
    wave.pause?.();
    requestAnimationFrame(() => { lottieReadyRef.current = true; });
  }, []);

  // Control play/pause WITHOUT touching speed each time
  useEffect(() => {
    const wave = voiceWaveRef.current;
    if (!wave) return;
    if (isSpeaking && !isFrozen) {
      wave.goToAndPlay?.(0, true);
    } else {
      wave.pause?.();
      wave.goToAndStop?.(0, true);
    }
  }, [isSpeaking, isFrozen]);

  // Mic toggle (no permission loss)
  const toggleMic = useCallback(() => {
    const track = micTrackRef.current ?? audioStream?.getAudioTracks()?.[0] ?? null;
    if (!track) return;

    if (isSpeaking) {
      // TTS is speaking - toggle between user's preference
      userMicPrefRef.current = !userMicPrefRef.current;
      console.log("[Mic Toggle] TTS speaking - preference toggled to:", userMicPrefRef.current ? "unmuted" : "muted");
      return;
    }

    // Normal case - toggle STT on/off
    if (isSpeechListening) {
      // Currently listening - stop STT
      console.log("[Mic Toggle] Stopping STT");
      stopSTT();
      if (track) track.enabled = false;
      setIsMicMuted(true);
      userMicPrefRef.current = false; // Update preference to match action
    } else {
      // Currently idle - start STT
      console.log("[Mic Toggle] Starting STT");
      if (track) track.enabled = true;
      setIsMicMuted(false);
      userMicPrefRef.current = true; // Update preference to match action
      startSTT();
    }
  }, [audioStream, isSpeaking, isSpeechListening, startSTT, stopSTT]);

  // ---------- Timers — gated by isFrozen ----------
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (isHRThinking && hasHRInterviewStarted && !hasStartedAnswering && !isFrozen && !needsSetup) {
      t = setInterval(() => {
        setHRThinkTime((prev) => {
          if (prev <= 1) {
            clearInterval(t);
            setIsHRThinking(false);
            setHasStartedAnswering(true);
            console.log("[Timer] Think time expired - starting answer phase");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [isHRThinking, hasHRInterviewStarted, hasStartedAnswering, isFrozen, needsSetup]);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (hasStartedAnswering && hrAnswerTime > 0 && hasHRInterviewStarted && !isFrozen && !needsSetup) {
      t = setInterval(() => setHRAnswerTime((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
    } else if (hasStartedAnswering && hrAnswerTime === 0 && hasHRInterviewStarted && !isFrozen && !needsSetup) {
      // Timer expired - user was silent, save with null transcription
      console.log("[Timer] Answer time expired - saving with null transcription");
      handleSubmitHRAnswer();
    }
    return () => clearInterval(t);
  }, [hasStartedAnswering, hrAnswerTime, hasHRInterviewStarted, handleSubmitHRAnswer, isFrozen, needsSetup]);

  // ---------- Question change resets timers/text ----------
  useEffect(() => {
    const prevQuestion = questionRef.current;
    questionRef.current = question;
    if (hasHRInterviewStarted && prevQuestion !== question) { // Check if question actually changed
      console.log("[Question Change] New question detected, resetting state");
      console.log("[Question Change] Current question index:", currentQuestionIndex);
      
      // Immediately cancel any ongoing TTS and force reset STT for a clean slate
      console.log("[Question Change] Force resetting STT for new question");
      cancelTTS(); // Ensure any ongoing TTS is stopped
      forceResetSTT();
      
      // Reset UI for fresh box - completely isolate from previous question
      finalTranscriptRef.current = "";
      setInterimTranscript("");
      setFinalTranscript("");
      setHRAnswerText("");
      setIsHRThinking(true);
      setHasStartedAnswering(false);
      setHRThinkTime(30); // Ensure thinking time is reset to 30 seconds for new questions
      setHRAnswerTime(60);
      firstSpeakDoneRef.current = false; // Reset this flag for new question

      // Set question ID for new question (use question text as ID)
      currentQuestionIdRef.current = question;
      currentTranscriptionIdRef.current = question;

      // Read the question: mutes mic + pauses STT in onstart; onend restores per preference
      if (!isFrozen && !needsSetup) {
        console.log("[Question Change] Setting pending utterance for new question:", question);
        setPendingUtterance(question);
      }
      
      // Don't reset responses here - let the main page handle that
    }
  }, [question, hasHRInterviewStarted, isFrozen, needsSetup, forceResetSTT, cancelTTS, currentQuestionIndex]);

  // Monitor currentQuestionIndex changes
  useEffect(() => {
    console.log("[Question Index Change] currentQuestionIndex changed to:", currentQuestionIndex);
  }, [currentQuestionIndex]);

  // ---------- Policy events from detector (multi-person) ----------
  // Phase 4: Remove face detection interruption - just log and continue
  const handlePolicyEvent = useCallback((e: { type: "multi-person-detected" }) => {
    if (e.type !== "multi-person-detected") return;

    // Phase 4: Don't freeze interview, just log the event
    console.log("[Face Detection] Multiple faces detected - logging for report");
    
    // Phase 4: Don't pause TTS, just log the event.
    // Removed all TTS pause/resume logic from here to prevent interruptions.
    
    // No more freezing - interview continues smoothly
    // setFreezeSecondsLeft(3);
    // setIsFrozen(true);
  }, []);

  const renderAnswerInterface = () => (
    <div className="h-[20vh] flex flex-col">
      {/* Enhanced interfaces for both modes - now both support typing and STT */}
      <>
        {speechSupported && (
          <div className="flex items-center gap-2 text-sm mb-2">
            <StatusBadge isListening={isSpeechListening} />
            <div className="ml-auto text-xs opacity-70">
              lang: <code>en-IN</code> • continuous • interim
            </div>
          </div>
        )}
        <Textarea
          value={hrAnswerText + (finalTranscriptRef.current ? " " + finalTranscriptRef.current : "") + (interimTranscript ? " " + interimTranscript : "")}
          onChange={handleTextChange}
          placeholder={interviewMode === "pro" 
            ? "Type your answer here OR speak into the microphone..." 
            : "Type your answer here OR speak into the microphone..."
          }
          className="flex-1 min-h-0 resize-none"
        />
        {speechError && <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-md">{speechError}</div>}
      </>
      
      {/* Phase 4: Response Status Indicators */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {responseStatus.isSaving && (
            <div className="flex items-center gap-1 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              Saving...
            </div>
          )}
          {responseStatus.saveError && (
            <div className="flex items-center gap-1 text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              {responseStatus.saveError}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Show current response status */}
          <div className="text-gray-600">
            Q{currentQuestionIndex + 1}: {getCurrentResponse(currentQuestionIndex)?.hasResponse ? '✓ Answered' : '⏳ Pending'}
          </div>
          {responseStatus.lastSaved && (
            <div className="text-green-600">
              ✓ Saved at {responseStatus.lastSaved}
            </div>
          )}
        </div>
      </div>
    </div>
  );

    const showSetup = hasHRInterviewStarted && (interviewMode === "video" || interviewMode === "pro") && videoStream && needsSetup;
 
  // track alignment status from assistant
  const [isSetupAligned, setIsSetupAligned] = useState(false);

  return (
    <Card className="h-full max-h-full grid grid-rows-[auto,1fr,auto] overflow-hidden shadow-lg">
      <CardHeader className="pt-3 pb-0 min-h-0">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-xl font-bold text-gray-800">Interview Question</CardTitle>
          
          {/* Simple progress indicator */}
          <div className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {hrInterviewQuestions?.length || 4}
          </div>

          {/* Voice gender selection only before session (pro mode) */}
          {!hasHRInterviewStarted && interviewMode === "pro" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="mr-1 text-gray-600 flex items-center gap-1">
                HR Voice
                <Info className="h-4 w-4 text-gray-400" />
              </span>
              <Button
                size="sm"
                variant={voiceGender === "male" ? "default" : "outline"}
                className={cn("h-8 px-3", voiceGender === "male" ? "bg-blue-600 hover:bg-blue-700" : "")}
                onClick={() => setVoiceGender("male")}
                title='Use "Google UK English Male" (en-GB)'
              >
                Male
              </Button>
              <Button
                size="sm"
                variant={voiceGender === "female" ? "default" : "outline"}
                className={cn("h-8 px-3", voiceGender === "female" ? "bg-blue-600 hover:bg-blue-700" : "")}
                onClick={() => setVoiceGender("female")}
                title='Use "Google UK English Female" (en-GB)'
              >
                Female
              </Button>
            </div>
          )}

          {hasHRInterviewStarted && !needsSetup && (
            <div className="text-sm text-gray-600">

              {!hasStartedAnswering ? (
                <>
                  Think time:{" "}
                  <span className={cn("font-semibold", hrThinkTime <= 5 ? "text-red-500" : "text-gray-800")}>
                    {formatHRTime(hrThinkTime)}
                  </span>
                </>
              ) : (
                <>
                  Answer time:{" "}
                  <span className={cn("font-semibold", hrAnswerTime <= 10 ? "text-red-500" : "text-gray-800")}>
                    {formatHRTime(hrAnswerTime)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Setup CTA placed in white space below video when setup is active */}
        {showSetup && (
          <div className="mt-2 mb-1 flex justify-center">
            <Button
              onClick={handleConfirmSetup}
              disabled={!isSetupAligned}
              className={cn("px-4", !isSetupAligned ? "opacity-60 cursor-not-allowed" : "")}
              title={isSetupAligned ? "Start the interview" : "Align face and lighting first"}
            >
              Start Interview
            </Button>
          </div>
        )}

        {/* Intro block only for PRO mode */}
        {!hasHRInterviewStarted && interviewMode === "pro" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-lg text-gray-600 mb-2 text-center">Ready to begin your interview simulation?</p>
            <p className="text-xs text-gray-500 mb-2">
              Preferred: {voiceGender === "male" ? "Google UK English Male" : "Google UK English Female"} (en-GB)
            </p>
            <p className="text-xs text-gray-500 mb-5">
              Actual voice selected:{" "}
              <span className="font-medium">
                {chosenVoice ? `${chosenVoice.name} (${chosenVoice.lang})` : "Loading voices…"}
              </span>
            </p>
            <Button
              onClick={() => {
                setHasHRInterviewStarted(true);
                // Set question ID for pro mode
                currentQuestionIdRef.current = question;
                currentTranscriptionIdRef.current = question;
                // Ensure user preference is set to unmuted for pro mode (so STT auto-starts after TTS)
                userMicPrefRef.current = true;
                setPendingUtterance(question);
              }}
              className="py-3 px-6 text-lg"
              title="Start interview"
            >
              Start Interview
            </Button>
          </div>
        ) : (
          <>
            {/* Question + controls (hidden while setup is active) */}
            {!needsSetup && (
              <>
                <p className="text-lg text-gray-700">{question}</p>
                <div className="flex items-center justify-end mt-2 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-blue-600"
                    onClick={() => (!chosenVoice ? setPendingUtterance(question) : speakQuestion(question))}
                    disabled={isSpeaking}
                    title={isSpeaking ? "Speaking…" : "Re-read Question"}
                  >
                    <Volume2 className="h-4 w-4 mr-1" /> {isSpeaking ? "Speaking…" : "Re-read Question"}
                  </Button>
                  {isSpeaking && (
                    <Button variant="ghost" size="sm" onClick={cancelTTS} title="Stop speaking">
                      Stop
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Main area */}
            <div className="mt-3 rounded-xl bg-gray-50 border">
              {/* Keep height in a wrapper so the button can sit outside within white space */}
              <div className="relative h-[48vh] min-h-0">
                {/* Phase 4: Face detection events are logged but don't freeze interview */}
                {/* Removed freezing overlay - interview continues smoothly */}

                {/* Setup assistant: full focus UI; no left preview broadcast yet */}
                {showSetup ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <FaceSetupAssistant
                      stream={videoStream}
                      onConfirm={handleConfirmSetup}
                      onStatus={(ok) => setIsSetupAligned(!!ok)}
                      showConfirmButton={false}
                      tuning={{ faceMinRatio: 0.14, faceMaxRatio: 0.36, centerTolX: 0.06, centerTolY: 0.08 }}
                    />
                  </div>
                ) : (
                  <>
                    {/* wave shifted up 20px and no autoplay */}
                    <div className="absolute inset-0 -translate-y-[20px]">
                      <Lottie
                        ref={voiceWaveRef}
                        animationData={voiceLineAnim}
                        loop
                        play={false}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>

                    {/* Mic overlay smaller, centered bottom with padding above */}
                    <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-3 flex flex-col items-center pb-3">
                      <Button
                        onClick={toggleMic}
                        variant={isSpeechListening ? "default" : "outline"}
                        className={cn(
                          "h-6 px-2 py-2 text-[11px] mb-1",
                          isSpeechListening ? "bg-blue-600 hover:bg-blue-700" : "border-gray-300 text-gray-700"
                        )}
                        title={isSpeechListening ? "Mute mic" : "Turn mic on"}
                      >
                        {isSpeechListening ? <><Mic className="h-3 w-3 mr-1" /> Mute</> : <><MicOff className="h-3 w-3 mr-1" /> Unmute</>}
                      </Button>

                      <div className="relative w-24 aspect-square rounded-lg overflow-hidden bg-white border shadow-sm">
                        <Lottie
                          ref={lottieRef}
                          animationData={micEnabledAnim}
                          loop
                          play={isSpeechListening && !isMicMuted} // Control play based on STT listening and mic mute state
                          style={{ width: "100%", height: "100%" }}
                        />
                        {!isSpeechListening && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                            <MicOff className="h-7 w-7 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-600">
                        {isSpeechListening ? "Listening…" : "Idle"}
                      </div>
                    </div>

                    {/* 🔒 Invisible detector hookup */}
                    {hasHRInterviewStarted && videoStream && !needsSetup && (
                      <div
                        className="absolute"
                        style={{ width: 1, height: 1, opacity: 0, pointerEvents: "none", left: 0, top: 0 }}
                      >
                        <EmotionDetector
                          ref={detectorRef}
                          externalStream={videoStream}
                          showVideo={false}
                          saveMode="manual"      // only save at successful end
                          paused={false}         // Phase 4: Never pause - interview continues smoothly
                          onPolicyEvent={handlePolicyEvent}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

             </div>
          </>
        )}
      </CardHeader>

      {/* While setup is active, hide the answer box & footer to keep the UI focused */}
      {!needsSetup && hasHRInterviewStarted && (
        <>
          <CardContent className="flex-1 min-h-0 p-3 pt-2">
            {renderAnswerInterface()}
          </CardContent>

          <CardFooter className="flex justify-between items-center pt-3 border-t">
            <div className="text-sm text-gray-600 truncate">
              Mode: <span className="font-semibold capitalize">{interviewMode}</span>
              {" • TTS voice: "}
              <span className="font-medium">{chosenVoice ? chosenVoice.name : "Loading…"}</span>
              {/* Phase 4: Face detection events are logged but don't pause interview */}
            </div>
            <div className="flex gap-2">
              {/* Save Answer Button - Always visible */}
              <Button 
                variant="outline"
                onClick={async () => {
                  if (isProcessingAction) return;
                  setIsProcessingAction(true);
                  try {
                    console.log("[UI Action] Save Answer clicked for Q", currentQuestionIndex + 1);
                    
                    // Get current response text - combine all sources
                    let currentResponse = "";
                    if (interviewMode === "pro") {
                      // Pro mode: typed text + speech transcript
                      currentResponse = [
                        hrAnswerText,
                        finalTranscriptRef.current,
                        interimTranscript
                      ].filter(Boolean).join(" ").trim();
                    } else {
                      // Video mode: speech transcript only
                      currentResponse = [
                        finalTranscriptRef.current,
                        interimTranscript
                      ].filter(Boolean).join(" ").trim();
                    }
                    
                    console.log("[UI Action] Current response to save:", currentResponse);
                    
                    if (currentResponse.trim()) {
                      // Update response
                      await onUpdateResponse(currentQuestionIndex, currentResponse);
                      console.log("[UI Action] Answer saved successfully for Q", currentQuestionIndex + 1);
                    } else {
                      console.log("[UI Action] No content to save");
                    }
                  } catch (error) {
                    console.error("[UI Action] Failed to save answer:", error);
                  } finally {
                    setIsProcessingAction(false);
                  }
                }}
                disabled={isProcessingAction || isSpeaking}
                title="Save your current answer for this question"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 text-xs px-2.5 py-1 h-[30px]"
              >
                💾 Save Answer
              </Button>

              {/* Only show "Skip Question" if not the last question */}
              {!isLastQuestion && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (isProcessingAction) return; // Prevent multiple clicks
                    setIsProcessingAction(true);
                    console.log("[UI Action] Skip Question clicked.");
                    try {
                      stopSTT(); // Stop STT immediately
                      commitCurrentTranscript(); // Commit current answer
                      onNextQuestion(); // Move to next question
                    } finally {
                      setIsProcessingAction(false);
                    }
                  }}
                  title="Skip to the next question"
                  disabled={isProcessingAction || isSpeaking}
                  className="text-xs px-2.5 py-1 h-[30px]"
                >
                  <SkipForward className="h-3 w-3 mr-1.5" />
                  Skip Question
                </Button>
              )}

              {/* "Submit Answer" or "Finish Interview" button */}
              <Button 
                onClick={async () => {
                  if (isLastQuestion) {
                    // Show dialog instead of browser popup
                    setShowFinishDialog(true);
                    return;
                  }
                  handleSubmitHRAnswer();
                }} 
                title={isLastQuestion ? "Finish the interview" : "Submit your answer"} 
                disabled={isProcessingAction || isSpeaking}
                className={`text-xs px-2.5 py-1 h-[30px] ${isLastQuestion ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                {isProcessingAction ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isLastQuestion ? "Finishing..." : "Submitting..."}
                  </span>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1.5" />
                    {isLastQuestion ? "Finish Interview" : "Submit Answer"}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </>
      )}
      
      {/* Finish Interview Confirmation Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Finish Interview
            </DialogTitle>
            <DialogDescription>
              Are you ready to complete your interview and generate the final report?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {(() => {
              const totalQuestions = hrInterviewQuestions?.length || 0;
              const answeredQuestions = hrInterviewQuestions ? 
                hrInterviewQuestions.filter((_, i) => getCurrentResponse(i)?.hasResponse).length : 0;
              const completionRate = Math.round((answeredQuestions / totalQuestions) * 100);
              
              return (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">📊 Interview Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 dark:text-blue-200">Total Questions:</span>
                        <span className="ml-2 font-medium text-blue-800 dark:text-blue-100">{totalQuestions}</span>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-200">Answered:</span>
                        <span className="ml-2 font-medium text-blue-800 dark:text-blue-100">{answeredQuestions}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-blue-700 dark:text-blue-200">Completion Rate:</span>
                        <span className="ml-2 font-medium text-blue-800 dark:text-blue-100">{completionRate}%</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning if not all questions answered */}
                  {answeredQuestions < totalQuestions && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                        <div>
                          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Incomplete Interview</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-200">
                            You have only answered {answeredQuestions} out of {totalQuestions} questions. 
                            You can still finish now, but consider completing all questions for a more comprehensive report.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                      <div>
                        <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">What happens next?</h4>
                        <p className="text-sm text-green-700 dark:text-green-200">
                          Your responses will be saved and a comprehensive behavioral analysis report will be generated, 
                          including body language analytics and interview insights.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFinishDialog(false)}
              className="w-full sm:w-auto"
            >
              Continue Interview
            </Button>
            <Button 
              onClick={() => {
                setShowFinishDialog(false);
                handleSubmitHRAnswer();
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Finish Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function StatusBadge({ isListening }: { isListening: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm bg-gray-100 text-gray-900 rounded-full px-2 py-1">
      <span
        className={cn(
          "w-2.5 h-2.5 rounded-full inline-block",
          isListening ? "bg-blue-500 shadow-blue-500/30 shadow-lg" : "bg-gray-400"
        )}
      />
      <span className="font-semibold">
        {isListening ? "Listening…" : "Idle"}
      </span>
    </div>
  );
}
