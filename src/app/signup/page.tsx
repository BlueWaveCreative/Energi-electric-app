import Link from 'next/link'

function SignupContent() {
  // Signup is invite-only — admin creates accounts
  return (
    <div className="text-center">
      <p className="text-gray-900 text-lg font-medium mb-2">Invite Required</p>
      <p className="text-gray-600 text-sm mb-6">
        Contact your admin to get an account set up.
      </p>
      <Link href="/login" className="text-energi-primary text-sm hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/brand/energi-logo-horizontal.png" alt="Energi Electric" className="h-12" />
        </div>
        <SignupContent />
      </div>
    </div>
  )
}
