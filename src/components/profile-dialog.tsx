import { useNavigate } from '@tanstack/react-router'
import {
  LockKeyhole,
  LogOut,
  LucideIcon,
  User2,
  UserRoundPen,
  Edit3,
  Save,
  X,
  Mail,
  Shield,
  Calendar,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTrigger } from '~/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '~/components/ui/sidebar'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { pb } from '~/lib/pb'
import { cn } from '~/lib/utils'

interface ProfileDialogTab {
  name: string
  icon: LucideIcon
}

const profileDialogTabs: ProfileDialogTab[] = [
  { name: 'Profile', icon: UserRoundPen },
  { name: 'Security', icon: LockKeyhole },
]

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email address'),
})

const passwordFormSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
})

function ProfileTab() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const currentUser = pb.authStore.record

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser?.name || '',
      email: currentUser?.email || '',
    },
  })

  // Update form when user data changes
  useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name || '',
        email: currentUser.email || '',
      })
    }
  }, [currentUser, form])

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      await pb.collection('users').update(currentUser.id, {
        name: values.name,
        email: values.email,
      })
      
      // Refresh auth store
      await pb.collection('users').authRefresh()
      
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!currentUser) {
    return <div className="p-6 text-center text-muted-foreground">No user data available</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and personal information
          </p>
        </div>
        <Button
          variant={isEditing ? "outline" : "default"}
          size="sm"
          onClick={() => {
            if (isEditing) {
              form.reset({
                name: currentUser?.name || '',
                email: currentUser?.email || '',
              })
            }
            setIsEditing(!isEditing)
          }}
          className="gap-2 self-start sm:self-auto"
        >
          {isEditing ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4" />
              Edit
            </>
          )}
        </Button>
      </div>

      {/* User Avatar & Basic Info */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
              {currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <h3 className="font-semibold text-lg break-words">{currentUser?.name || 'Unknown User'}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="break-all">{currentUser?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentUser?.verified ? "default" : "secondary"} className="gap-1">
                  <Shield className="h-3 w-3" />
                  {currentUser?.verified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        /* Display Mode */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="mt-1 font-medium">{currentUser?.name || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="mt-1 font-medium">{currentUser?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Account Created</Label>
                  <p className="mt-1 font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {currentUser?.created ? formatDate(currentUser.created) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p className="mt-1 font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {currentUser?.updated ? formatDate(currentUser.updated) : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SecurityTab() {
  const [isLoading, setIsLoading] = useState(false)
  const currentUser = pb.authStore.record

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      oldPassword: '',
      password: '',
      passwordConfirm: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      await pb.collection('users').update(currentUser.id, {
        oldPassword: values.oldPassword,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      })
      
      toast.success('Password updated successfully')
      form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your password and account security settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your current password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passwordConfirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-muted-foreground">
                  Your email address verification status
                </p>
              </div>
              <Badge variant={currentUser?.verified ? "default" : "destructive"}>
                {currentUser?.verified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            {!currentUser?.verified && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Please check your email and verify your account to access all features.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProfileDialog() {
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('Profile')

  return (
    <SidebarMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton
            tooltip={{
              children: 'Profile',
              hidden: false,
            }}
            isActive={open}
            className="px-2.5 md:px-2"
          >
            <User2 />
            Profile
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent
          className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] w-full"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Mobile tab navigation */}
          <div className="block md:hidden border-b">
            <div className="flex">
              {profileDialogTabs.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setTab(item.name)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                    item.name === tab
                      ? "border-b-2 border-primary bg-muted/50 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <SidebarProvider
            style={
              {
                '--sidebar-width': '12rem',
              } as React.CSSProperties
            }
            className="items-start"
          >
            <Sidebar
              collapsible="none"
              className="hidden md:flex max-h-[600px]"
            >
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {profileDialogTabs.map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            isActive={item.name === tab}
                            onClick={() => setTab(item.name)}
                          >
                            <item.icon />
                            {item.name}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        pb.authStore.clear()
                        navigate({ to: '/signin' })
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut />
                      Log Out
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>
            <SidebarInset>
              <div className="min-h-[400px] max-h-[600px] md:max-h-[550px] overflow-y-auto">
                {tab === 'Profile' && <ProfileTab />}
                {tab === 'Security' && <SecurityTab />}
              </div>
              
              {/* Mobile logout button */}
              <div className="block md:hidden border-t p-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    pb.authStore.clear()
                    navigate({ to: '/signin' })
                  }}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}
