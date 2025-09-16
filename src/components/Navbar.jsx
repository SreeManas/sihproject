import React from 'react'

export default function Navbar({ activeTab, onChange }) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200" style={{ height: 'var(--header-height)' }}>
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary-600"></div>
          <h1 className="font-semibold text-gray-800">INCOIS Hazard Watch</h1>
        </div>
        <nav className="flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded-md ${activeTab === 'dashboard' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => onChange('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`px-3 py-2 rounded-md ${activeTab === 'report' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => onChange('report')}
          >
            Report Hazard
          </button>
        </nav>
      </div>
    </header>
  )
}
