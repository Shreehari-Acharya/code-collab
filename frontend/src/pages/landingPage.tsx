import { useState } from "react";
import SignupCard from "@/components/signUpCard";
import SigninCard from "@/components/signInCard";


export default function LandingPage() {
    const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center w-1/2">
        <h1 className="text-5xl font-bold mb-6">Welcome to Code Collab</h1>
      <p className="text-2xl mb-4">Just another cloud code payground</p>
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