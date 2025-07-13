"use client"

import type React from "react"

import { useState } from "react"
import axios from "@/lib/axios"
import { AxiosError } from "axios"
import { PlusCircleIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WorkspaceTypes } from "@/types/workspace"

interface CreateNewWorkspaceCardProps {
  onNewWorkspace: (workspaceData: WorkspaceTypes) => void
}
export default function CreateNewWorkspaceCard({onNewWorkspace}: CreateNewWorkspaceCardProps) {
  const [open, setOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleNewWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name")
      return
    }

    setIsCreating(true)

    try {
      const { data } = await axios.post("/api/workspaces/create", {
        workspaceName: workspaceName.trim(),
      })

      onNewWorkspace(data)
      console.log("Workspace created successfully:", data)
      toast.success("Workspace created successfully!")

      // Reset form and close dialog
      setWorkspaceName("")
      setOpen(false)
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("Error creating workspace:", error)
        toast.error(error.response?.data?.message || "Failed to create workspace. Please try again.")
      } else {
        console.error("Unexpected error:", error)
        toast.error("Failed to create workspace. Please try again.")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleNewWorkspace()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex flex-col gap-10 rounded-2xl py-4 max-w-sm items-center justify-center w-full h-full border-3 text-gray-500 hover:text-gray-400 cursor-pointer hover:border-amber-50/30">
          <PlusCircleIcon className="w-12 h-12" />
          <p className="mt-2 text-2xl">Create New Workspace</p>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>Enter a name for your new workspace. You can always change this later.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter workspace name"
              disabled={isCreating}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleNewWorkspace} disabled={isCreating || !workspaceName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
