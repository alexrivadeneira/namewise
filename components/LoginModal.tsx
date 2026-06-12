"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface LoginModalProps {
  mode: "save" | "login";
  onDismiss: () => void;
}

export default function LoginModal({ mode, onDismiss }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState(mode);

  function switchMode(m: "save" | "login") {
    setCurrentMode(m);
    setSent(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    if (currentMode === "save") {
      // Convert anon account in-place — same user ID, data preserved
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/auth/callback` }
      );
      if (error) {
        if (error.message.toLowerCase().includes("already been registered") ||
            error.message.toLowerCase().includes("already registered")) {
          // Email taken — offer to log in instead
          setError("That email already has an account. Log in below to access it — your current notes will be waiting.");
          switchMode("login");
          setLoading(false);
          return;
        }
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // don't silently create accounts on login
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("signups not allowed") ||
            error.message.toLowerCase().includes("user not found")) {
          setError("No account found for that email. Save your notes to create one.");
          switchMode("save");
          setLoading(false);
          return;
        }
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    setSent(true);
    setLoading(false);
  }

  const isSave = currentMode === "save";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-black mb-1">
          {isSave ? "Save your notes" : "Log in"}
        </h2>
        <p className="text-[#b9b9b9] text-sm mb-5">
          {isSave
            ? "Enter your email to save your contacts and access them from any device. We'll send a magic link — no password needed."
            : "Enter your email and we'll send you a magic link to sign in."}
        </p>

        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        {sent ? (
          <div className="py-4 space-y-1">
            <p className="font-medium text-black">Check your email!</p>
            <p className="text-[#b9b9b9] text-sm">We sent a magic link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-[#b9b9b9] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2.5 text-[#b9b9b9] hover:text-black text-sm transition-colors"
              >
                Later
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-4 border-t border-[#e5e5e5] text-center text-sm text-[#b9b9b9]">
          {isSave ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setCurrentMode("login"); setSent(false); }}
                className="text-black hover:underline"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                onClick={() => { setCurrentMode("save"); setSent(false); }}
                className="text-black hover:underline"
              >
                Create an account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
