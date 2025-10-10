import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Code, BookOpen, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold"><span className="text-blue-600">Upady</span><span className="text-yellow-500">ai</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              How It Works
            </Link>
            <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Testimonials
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Master Data Structures & Algorithms with AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Prepare for technical interviews with personalized AI tutoring, real-time feedback, and a comprehensive
            library of DSA problems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                Try Demo
              </Button>
            </Link>
          </div>
          <div className="relative mx-auto max-w-5xl rounded-lg border bg-background shadow-lg overflow-hidden">
            <Image
              src="/abstract-geometric-shapes.png"
              alt="upadyAI Dashboard"
              width={1200}
              height={675}
              className="w-full h-auto"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-30"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose <span className="text-blue-600">Upady</span><span className="text-yellow-500">ai</span>?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Tutoring</h3>
              <p className="text-muted-foreground">
                Get personalized guidance and hints from our AI tutor that adapts to your learning style and pace.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Coding Environment</h3>
              <p className="text-muted-foreground">
                Write, test, and debug your code in our integrated development environment with real-time feedback.
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comprehensive Problem Library</h3>
              <p className="text-muted-foreground">
                Practice with hundreds of curated problems ranging from easy to hard, covering all common DSA topics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-12">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Sign Up and Create Your Profile</h3>
                <p className="text-muted-foreground mb-4">
                  Create an account and tell us about your experience level and learning goals.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-start gap-6 mb-12">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Choose a Problem to Solve</h3>
                <p className="text-muted-foreground mb-4">
                  Browse our extensive library of problems or let our AI recommend problems based on your skill level.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-start gap-6 mb-12">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get AI-Powered Assistance</h3>
                <p className="text-muted-foreground mb-4">
                  Receive hints, explanations, and guidance from our AI tutor as you work through problems.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Track Your Progress</h3>
                <p className="text-muted-foreground mb-4">
                  Monitor your improvement over time with detailed analytics and performance insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-lg border">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">JD</span>
                </div>
                <div>
                  <h4 className="font-semibold">John Doe</h4>
                  <p className="text-sm text-muted-foreground">Software Engineer at Google</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "Upadyai helped me prepare for my Google interview in just 3 weeks. The AI tutor was like having a
                personal coach available 24/7."
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg border">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">AS</span>
                </div>
                <div>
                  <h4 className="font-semibold">Alice Smith</h4>
                  <p className="text-sm text-muted-foreground">CS Student at MIT</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "The interactive coding environment and real-time feedback made learning DSA concepts so much easier
                than traditional methods."
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg border">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-semibold text-primary">RJ</span>
                </div>
                <div>
                  <h4 className="font-semibold">Robert Johnson</h4>
                  <p className="text-sm text-muted-foreground">Senior Developer at Amazon</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "I've tried many platforms, but Upadyai's AI tutor provides the most relevant hints without giving away
                the solution. Perfect balance!"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Ace Your Next Technical Interview?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of developers who have improved their DSA skills with Upadyai.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/roadmap" className="text-sm text-muted-foreground hover:text-foreground">
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/guides" className="text-sm text-muted-foreground hover:text-foreground">
                    Guides
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-sm text-muted-foreground hover:text-foreground">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-bold"><span className="text-blue-600">Upady</span><span className="text-yellow-500">ai</span></span>
            </div>
            <div className="text-sm text-muted-foreground">© 2025 Upadyai. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
