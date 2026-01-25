'use client'

import { useEffect, useState } from 'react'
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Moon,
  Sun,
  ChevronRight,
  LogOut,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { loadSavedAccounts, saveSavedAccounts, type SavedAccount } from '@/lib/savedAccounts'

interface ProfileProps {
  user: any
  onLogout: () => void
}

export default function Profile({ user, onLogout }: ProfileProps) {
  const { theme, toggleTheme } = useTheme()
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ type: 'Yaka', label: '', number: '' })

  const userId = user?.id as string | undefined

  useEffect(() => {
    // Load saved accounts for this user from local storage
    setSavedAccounts(loadSavedAccounts(userId))
  }, [userId])

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    const account: SavedAccount = {
      id: Date.now().toString(),
      ...newAccount,
    }
    const next = [...savedAccounts, account]
    setSavedAccounts(next)
    saveSavedAccounts(next, userId)
    setNewAccount({ type: 'Yaka', label: '', number: '' })
    setShowAddAccount(false)
  }

  const handleDeleteAccount = (id: string) => {
    const next = savedAccounts.filter((acc) => acc.id !== id)
    setSavedAccounts(next)
    saveSavedAccounts(next, userId)
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
              {user.phone && (
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <Phone size={16} />
                  {user.phone}
                </p>
              )}
              {user.email && (
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <Mail size={16} />
                  {user.email}
                </p>
              )}
            </div>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Edit2 size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">28</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Transactions</p>
            </div>
            <div className="text-center border-x border-gray-200 dark:border-gray-600">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{savedAccounts.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saved Accounts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">100%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Saved Accounts */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Saved Accounts</h3>
            <button
              onClick={() => setShowAddAccount(true)}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {savedAccounts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">No saved accounts yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add your meter/account numbers to speed up payments.
                </p>
              </div>
            ) : (
              savedAccounts.map((account) => (
              <div key={account.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{account.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {account.type} • {account.number}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <button
              onClick={toggleTheme}
              className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {theme === 'dark' ? <Moon size={20} className="text-gray-600" /> : <Sun size={20} className="text-gray-600" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            <button className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Bell size={20} className="text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your alerts</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            <button className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Shield size={20} className="text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">Security</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Password & PIN</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            <button className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <CreditCard size={20} className="text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-white">Payment Methods</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage cards & accounts</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 pb-4">
          Version 1.0.0 • Made with ❤️ in Uganda
        </p>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Saved Account</h2>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Type
                </label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="Yaka">Yaka</option>
                  <option value="Water">Water</option>
                  <option value="Airtime">Airtime</option>
                  <option value="TV">TV</option>
                  <option value="School">School</option>
                  <option value="URA">URA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={newAccount.label}
                  onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
                  placeholder="e.g., Home, Office, Mom"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={newAccount.number}
                  onChange={(e) => setNewAccount({ ...newAccount, number: e.target.value })}
                  placeholder="Enter account number"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAccount(false)}
                  className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

