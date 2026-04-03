'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/use-supabase'

export default function ForgotPasswordPage() {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#32373C] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/brand/logo-horizontal.svg" alt="Blue Shores Electric" className="h-12" />
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-2">Check your email</p>
            <p className="text-gray-400 text-sm mb-6">
              We sent a password reset link to <span className="text-white">{email}</span>
            </p>
            <Link href="/login" className="text-[#68BD45] text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-center mb-8">
              Enter your email and we&apos;ll send you a reset link
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-900/30 text-red-400 border border-red-800/50 text-sm p-3 rounded-lg" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent placeholder:text-gray-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-[#68BD45] text-white font-medium rounded-lg hover:bg-[#5aa83c] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="text-center mt-4">
              <Link href="/login" className="text-[#68BD45] text-sm hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
