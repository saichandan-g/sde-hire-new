import { RegistrationForm } from "./components/registration-form"
import { RegisterGuard } from "./components/register-guard"

export default function RegisterPage() {
  return (
    <RegisterGuard>
      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Help us personalize your learning experience
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="mx-auto w-full max-w-md space-y-6 px-4">
            <RegistrationForm />
          </div>
        </div>
      </div>
    </RegisterGuard>
  )
} 