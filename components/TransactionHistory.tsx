'use client'

import { Zap, Droplet, Phone, Tv, ArrowUpRight, ArrowDownLeft, Download } from 'lucide-react'

interface Transaction {
  id: string
  type: 'yaka' | 'water' | 'airtime' | 'tv' | 'topup' | 'send'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  reference: string
  account: string
  timestamp: Date
}

const transactions: Transaction[] = [
  {
    id: '1',
    type: 'yaka',
    amount: 20000,
    status: 'completed',
    reference: 'CHI12345678',
    account: '04123456789',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    type: 'airtime',
    amount: 5000,
    status: 'completed',
    reference: 'CHI12345677',
    account: '0772123456',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    type: 'water',
    amount: 15000,
    status: 'completed',
    reference: 'CHI12345676',
    account: '123456789',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '4',
    type: 'tv',
    amount: 50000,
    status: 'completed',
    reference: 'CHI12345675',
    account: '987654321',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: '5',
    type: 'topup',
    amount: 100000,
    status: 'completed',
    reference: 'CHI12345674',
    account: 'Mobile Money',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
]

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'yaka':
      return { Icon: Zap, color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600', label: 'Yaka' }
    case 'water':
      return { Icon: Droplet, color: 'bg-blue-100 dark:bg-blue-900 text-blue-600', label: 'Water' }
    case 'airtime':
      return { Icon: Phone, color: 'bg-green-100 dark:bg-green-900 text-green-600', label: 'Airtime' }
    case 'tv':
      return { Icon: Tv, color: 'bg-purple-100 dark:bg-purple-900 text-purple-600', label: 'TV' }
    case 'topup':
      return { Icon: ArrowDownLeft, color: 'bg-green-100 dark:bg-green-900 text-green-600', label: 'Top Up' }
    case 'send':
      return { Icon: ArrowUpRight, color: 'bg-red-100 dark:bg-red-900 text-red-600', label: 'Sent' }
    default:
      return { Icon: Phone, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600', label: 'Payment' }
  }
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function TransactionHistory() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {transactions.map((transaction) => {
        const { Icon, color, label } = getTransactionIcon(transaction.type)
        const isCredit = transaction.type === 'topup'

        return (
          <div
            key={transaction.id}
            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {transaction.account} • {transaction.reference}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatTime(transaction.timestamp)}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`font-bold text-lg ${
                    isCredit ? 'text-green-600' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {isCredit ? '+' : '-'}UGX {transaction.amount.toLocaleString()}
                </p>
                <button className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1 mt-1">
                  <Download size={14} />
                  Receipt
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <div className="p-4 text-center">
        <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
          View All Transactions
        </button>
      </div>
    </div>
  )
}

