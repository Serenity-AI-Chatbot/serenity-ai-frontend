import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Product</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Features</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Pricing</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Company</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">About Us</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Careers</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Blog</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Support</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Connect</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Twitter</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Facebook</Link></li>
              <li><Link href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">LinkedIn</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">&copy; 2025 MindfulAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
