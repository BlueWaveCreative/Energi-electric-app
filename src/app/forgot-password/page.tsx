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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/brand/energi-logo-horizontal.png" alt="Energi Electric" className="h-12" />
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-gray-900 text-lg font-medium mb-2">Check your email</p>
            <p className="text-gray-600 text-sm mb-6">
              We sent a password reset link to <span className="text-gray-900 font-medium">{email}</span>
            </p>
            <Link href="/login" className="text-energi-primary text-sm hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-center mb-8">
              Enter your email and we&apos;ll send you a reset link
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-lg" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-energi-primary focus:border-energi-primary placeholder:text-gray-400"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-energi-primary text-white font-medium rounded-lg hover:bg-energi-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="text-center mt-4">
              <Link href="/login" className="text-energi-primary text-sm hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
