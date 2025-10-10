"use client"

import { useState } from "react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  Camera,
  Save,
  Edit
} from "lucide-react"
import { useAuth } from "@/lib/context/auth-context"

export default function SettingsPage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.first_name || "",
    lastName: user?.user_metadata?.last_name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Settings states
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    dataSharing: true,
    analyticsTracking: true,
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSettingToggle = (setting: string) => {
    setSettings(prev => ({ ...prev, [setting]: !prev[setting as keyof typeof prev] }))
  }

  const handleSave = () => {
    // Here you would typically save to backend
    console.log("Saving settings:", { formData, settings })
    setIsEditing(false)
  }

  const getInitials = () => {
    const firstName = user?.user_metadata?.first_name || ""
    const lastName = user?.user_metadata?.last_name || ""
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <AuthLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Profile Settings */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  User Profile
                </CardTitle>
                <CardDescription>Update your personal information and profile picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  Account Security
                </CardTitle>
                <CardDescription>Manage your password and account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Update Password
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Notifications
                </CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={() => handleSettingToggle("emailNotifications")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={() => handleSettingToggle("pushNotifications")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive promotional content
                    </p>
                  </div>
                  <Switch
                    checked={settings.marketingEmails}
                    onCheckedChange={() => handleSettingToggle("marketingEmails")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Privacy
                </CardTitle>
                <CardDescription>Control your data and privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow data sharing for improvements
                    </p>
                  </div>
                  <Switch
                    checked={settings.dataSharing}
                    onCheckedChange={() => handleSettingToggle("dataSharing")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Help improve our service
                    </p>
                  </div>
                  <Switch
                    checked={settings.analyticsTracking}
                    onCheckedChange={() => handleSettingToggle("analyticsTracking")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
