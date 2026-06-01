"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface LoginModalProps {
  onDismiss: () => void;
}

export default function LoginModal({ onDismiss }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Save your notes</h2>
        <p className="text-gray-500 text-sm mb-5">
          Enter your email to save your work and access it from any device. We'll send a
          magic link — no password needed.
        </p>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">Check your email!</p>
            <p className="text-gray-500 text-sm mt-1">We sent a magic link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm"
              >
                Later
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
