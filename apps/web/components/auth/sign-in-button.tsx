"use client";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await signIn.social({ provider: "google", callbackURL: "/" });
    setLoading(false);
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      {loading ? "Redirecting..." : "Continue with Google"}
    </Button>
  );
}
