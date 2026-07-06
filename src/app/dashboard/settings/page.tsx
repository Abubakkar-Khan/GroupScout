"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Save, Key } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    userId: "",
    scanInterval: "5",
    activeFrom: "08:00",
    activeTo: "20:00",
    monitoringMode: "default",
    groqApiKey: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings")
        if (res.ok) {
          const data = await res.json()
          setSettings({
            userId: data.userId || "",
            scanInterval: data.scanInterval?.toString() || "5",
            activeFrom: data.activeFrom || "08:00",
            activeTo: data.activeTo || "20:00",
            monitoringMode: data.monitoringMode || "default",
            groqApiKey: data.groqApiKey ? "********" : "" // Mask the actual key
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Only send the key if it was modified (not the mask)
    const payload = { ...settings }
    if (payload.groqApiKey === "********") {
      delete (payload as any).groqApiKey
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          scanInterval: parseInt(settings.scanInterval, 10),
          activeFrom: settings.activeFrom,
          activeTo: settings.activeTo,
          monitoringMode: settings.monitoringMode,
          groqApiKey: payload.groqApiKey
        })
      })
      if (res.ok) {
        toast.success("Settings saved successfully")
        if (payload.groqApiKey) {
          setSettings({ ...settings, groqApiKey: "********" })
        }
      } else {
        toast.error("Failed to save settings")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your extension and AI configuration.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Extension Connection</CardTitle>
            <CardDescription>Use this ID to connect your Chrome Extension to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-start">
              <Label>Your User ID</Label>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <div className="flex gap-2">
                  <Input 
                    type="text" 
                    value={settings.userId} 
                    readOnly 
                    className="bg-background/50 font-mono text-sm text-muted-foreground" 
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      navigator.clipboard.writeText(settings.userId);
                      toast.success("User ID copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Monitoring</CardTitle>
            <CardDescription>Configure how often the Chrome Extension checks for new posts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-start">
                <Label>Scan Interval</Label>
                {loading ? <Skeleton className="h-10 w-full" /> : (
                  <Select value={settings.scanInterval} onValueChange={(v) => v && setSettings({ ...settings, scanInterval: v })}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="2">2 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-start">
                <Label>Active From</Label>
                {loading ? <Skeleton className="h-10 w-full" /> : (
                  <Input 
                    type="time" 
                    value={settings.activeFrom} 
                    onChange={(e) => setSettings({ ...settings, activeFrom: e.target.value })}
                    className="bg-background/50" 
                  />
                )}
              </div>
              <div className="space-y-2 text-start">
                <Label>Active To</Label>
                {loading ? <Skeleton className="h-10 w-full" /> : (
                  <Input 
                    type="time" 
                    value={settings.activeTo} 
                    onChange={(e) => setSettings({ ...settings, activeTo: e.target.value })}
                    className="bg-background/50" 
                  />
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Outside these hours, the extension will pause automatically to conserve resources.</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Monitoring Mode</CardTitle>
            <CardDescription>Choose how the extension handles monitoring Facebook Groups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input 
                  type="radio" 
                  id="mode-default" 
                  name="monitoringMode" 
                  value="default" 
                  checked={settings.monitoringMode === "default"} 
                  onChange={(e) => setSettings({ ...settings, monitoringMode: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="mode-default" className="font-semibold text-base">Default Mode</Label>
                  <p className="text-sm text-muted-foreground">Monitor Facebook Groups that are already open. The extension will automatically attach to any group you visit.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input 
                  type="radio" 
                  id="mode-power" 
                  name="monitoringMode" 
                  value="power" 
                  checked={settings.monitoringMode === "power"} 
                  onChange={(e) => setSettings({ ...settings, monitoringMode: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="mode-power" className="font-semibold text-base text-primary">Power Mode</Label>
                  <p className="text-sm text-muted-foreground">Automatically open and manage monitored Facebook Group tabs during active monitoring hours. Opens tabs quietly in the background.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>Provide your Groq API key for binary classification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-start">
              <Label>Groq API Key</Label>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <div className="relative">
                  <Key className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="gsk_..." 
                    value={settings.groqApiKey}
                    onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                    className="bg-background/50 pl-10" 
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Your key is encrypted and stored securely.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || saving} className="px-8">
            <Save className="size-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
