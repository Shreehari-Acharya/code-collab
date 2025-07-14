import { useSession } from "@/lib/authClient";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CreateNewWorkspaceCard from "@/components/createNewWorkspaceCard";
import { useEffect, useState } from "react";
import {type WorkspaceTypes} from "@/types/workspace";
import axios from "@/lib/axios";
import { AxiosError } from "axios";
import WorkspaceCard from "@/components/workspaceInfoCard";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/authClient";

export default function Dashboard() {

    const [workspaces, setWorkspaces] = useState<WorkspaceTypes[]>([]);
    const { data: session , isPending,  } = useSession();
    const navigate = useNavigate();

    useEffect(() => {
    if (!isPending && !session) {
      toast.error("You must be logged in to access the dashboard.");
      navigate("/");
    }
  }, [isPending, session, navigate]);
  
    useEffect(() => {
    fetchUserWorkspaces();
  }, []);

  const fetchUserWorkspaces = async () => {
    try {
      const { data } = await axios.get("/api/workspaces/list");
      setWorkspaces(data);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || "Failed to fetch workspaces. Please try again.");
      } else {
        console.error("Unexpected error:", error);
        toast.error("Failed to fetch workspaces. Please try again.");
      }
    }
  };

  const handleCreateWorkspace = (workspaceData : WorkspaceTypes) => {
    setWorkspaces((prev) => [...prev, workspaceData]);
  } 

  const handleStatusChange = (id: string, newStatus: "ACTIVE" | "INACTIVE") => {
    setWorkspaces((prev) =>
      prev.map((workspace) => (workspace.id === id ? { ...workspace, status: newStatus } : workspace)),
    )
  }

  const handleDelete = (id: string) => {
    setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== id))
  }


  return (
    <div className="flex flex-col items-start justify-start min-h-screen">
      <div className="flex items-center justify-between w-full border p-4">
        <p className="text-4xl mt-4 font-semibold">Welcome, {session?.user?.name || "User"}!</p>
        <Button variant="default" className="mt-4"
          onClick={() => signOut()}
        >
        Sign Out</Button>
      </div>
      <div className="flex items-start grid-cols-4 gap-4 justify-start w-full h-full pl-10 pt-10">
        {workspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ))}
            <CreateNewWorkspaceCard onNewWorkspace={handleCreateWorkspace}/>
      </div>
    </div>
  );
}