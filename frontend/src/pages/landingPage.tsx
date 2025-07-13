import { useState } from "react";
import SignupCard from "@/components/signUpCard";
import SigninCard from "@/components/signInCard";
import { useSession } from "@/lib/authClient";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function LandingPage() {
  const [isSignup, setIsSignup] = useState(false);
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && session) {
      navigate("/dashboard");
    }
  }, [isPending, session, navigate]);

  if (isPending) {
    return <div className="flex items-center justify-center min-h-screen w-full"></div>;
  }
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center w-1/2">
        <h1 className="text-5xl font-bold mb-6">Welcome to Code Collab</h1>
      <p className="text-2xl mb-4">Just a simple cloud code payground</p>
      </div>
      <div className="flex space-x-4 w-1/2">
           {isSignup ? (
            <SignupCard onSwitchToSignin={() => setIsSignup(false)} />
            ) : (
            <SigninCard onSwitchToSignup={() => setIsSignup(true)} />
            )
            }
      </div>
    </div>
  )
}