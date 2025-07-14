import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreVertical, Play, Pause, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { type WorkspaceTypes } from "@/types/workspace"
import axios from "@/lib/axios"
import { useNavigate } from "react-router-dom"

interface WorkspaceCardProps {
  workspace: WorkspaceTypes 
  onStatusChange?: (id: string, newStatus: "ACTIVE" | "INACTIVE") => void
  onDelete?: (id: string) => void
}

export default function WorkspaceCard({ workspace, onStatusChange, onDelete }: WorkspaceCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleStatusToggle = async () => {
    setIsLoading(true)
    const newStatus = workspace.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"

    try {
      await axios.patch(`/api/workspaces/update/${workspace.id}`, {
        status: newStatus,
      })
      onStatusChange?.(workspace.id, newStatus)
      toast.success(`Workspace ${newStatus === "ACTIVE" ? "started" : "paused"} successfully`)
    } catch (error) {
      toast.error("Failed to update workspace status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)

    try {
        await axios.patch(`/api/workspaces/update/${workspace.id}`, {
        status: "DELETED",
      })
      onDelete?.(workspace.id)
      toast.success("Workspace deleted successfully")
    } catch (error) {
      toast.error("Failed to delete workspace")
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCardClick = () => {
    if (workspace.status === "ACTIVE") {
      navigate(`/workspace/${workspace.id}`)
    } else {
      toast.error("Workspace is not active. Please start it first.")
    }
  }

  return (
    <>
      <Card className="w-full max-w-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleCardClick}
        >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{workspace.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Created {formatDate(workspace.createdAt)}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleStatusToggle()
                }
                } disabled={isLoading}>
                  {workspace.status === "ACTIVE" ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true)
                  }}
                  className="text-red-600 focus:text-red-600"
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <Badge
              variant={workspace.status === "ACTIVE" ? "default" : "secondary"}
              className={`flex items-center gap-1.5 ${
                workspace.status === "ACTIVE"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${workspace.status === "ACTIVE" ? "bg-green-500" : "bg-yellow-500"}`}
              />
              {workspace.status === "ACTIVE" ? "Running" : "Paused"}
            </Badge>
            {isLoading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Updating...</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">ID: {workspace.id.slice(0, 8)}...</div>
          </div>

        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workspace.name}"? This action cannot be undone and all data associated
              with this workspace will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Workspace"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}