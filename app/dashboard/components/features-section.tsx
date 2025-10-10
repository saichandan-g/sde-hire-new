import { Code, BookOpen } from "lucide-react"
import { FeatureCard } from "./feature-card"

export function FeaturesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FeatureCard
        title="DSA Tutor"
        description="Practice coding problems with our interactive DSA tutor"
        content="Our DSA tutor provides step-by-step guidance for solving data structure and algorithm problems. Get real-time feedback and hints as you code."
        icon={<Code className="h-4 w-4" />}
        linkHref="/dsa-tutor"
        linkText="Start Coding"
      />

      <FeatureCard
        title="Technical Interview Simulator"
        description="Practice for your technical interviews with our interactive interview simulator"
        content="Our technical interview simulator provides a realistic interview experience, including timed questions and feedback"
        icon={<Code className="h-4 w-4" />}
        linkHref="/technical-interview"
        linkText="Start Interview"
      />

      <FeatureCard
        title="HR interview Simulator"
        description="Prepare for HR interviews with our interactive simulator"
        content="Practice common HR interview questions and get feedback on your responses. Improve your communication skills and confidence for your next interview."
        icon={<BookOpen className="h-4 w-4" />}
        linkHref="/hr-interview"
        linkText="Start Interview"
      />
    </div>
  )
}
