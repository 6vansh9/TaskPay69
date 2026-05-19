import Link from 'next/link'
import { Briefcase } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-900">TaskPay</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              The freelance marketplace that gets work done — securely and on time.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">For Clients</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/jobs/post" className="hover:text-indigo-600 transition-colors">Post a Job</Link></li>
              <li><Link href="/freelancers" className="hover:text-indigo-600 transition-colors">Find Freelancers</Link></li>
              <li><Link href="#" className="hover:text-indigo-600 transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">For Freelancers</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/jobs" className="hover:text-indigo-600 transition-colors">Find Work</Link></li>
              <li><Link href="/auth/register?role=freelancer" className="hover:text-indigo-600 transition-colors">Create Profile</Link></li>
              <li><Link href="#" className="hover:text-indigo-600 transition-colors">Success Stories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="#" className="hover:text-indigo-600 transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-400">
          <p>© 2026 TaskPay. All rights reserved.</p>
          <p>Built with ❤️ as a B.Tech CSE project</p>
        </div>
      </div>
    </footer>
  )
}
