'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'

function LoginForm() {
  const supabase = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'deactivated') {
      setError('Your account has been deactivated. Contact your admin.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single()

      if (profile?.status !== 'active') {
        await supabase.auth.signOut()
        setError('Your account has been deactivated. Contact your admin.')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
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

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 bg-white/10 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent"
        />
      </div>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-[#68BD45] hover:underline">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-[#68BD45] text-white font-medium rounded-lg hover:bg-[#5aa83c] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#32373C] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/brand/energi-logo-horizontal.png" alt="Energi Electric" className="h-12" />
        </div>
        <p className="text-gray-400 text-center mb-8">Sign in to your account</p>
        <Suspense fallback={<p className="text-gray-400 text-center">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
