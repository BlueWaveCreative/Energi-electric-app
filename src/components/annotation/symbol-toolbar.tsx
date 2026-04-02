'use client'

import { useState } from 'react'
import { SYMBOL_CATEGORIES, getSymbolsByCategory, WIRE_COLORS, type ElectricalSymbol } from './symbol-definitions'
import { cn } from '@/lib/utils'

interface SymbolToolbarProps {
  onSelectSymbol: (symbol: ElectricalSymbol) => void
  activeColor: string
  onColorChange: (color: string) => void
}

export function SymbolToolbar({ onSelectSymbol, activeColor, onColorChange }: SymbolToolbarProps) {
  const [activeCategory, setActiveCategory] = useState(SYMBOL_CATEGORIES[0].name)

  const symbols = getSymbolsByCategory(activeCategory)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Symbol categories">
        {SYMBOL_CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            role="tab"
            aria-selected={activeCategory === cat.name}
            className={cn(
              'px-2 py-1 text-xs rounded-md font-medium transition-colors',
              activeCategory === cat.name
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Symbols grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {symbols.map((symbol) => (
          <button
            key={symbol.name}
            onClick={() => onSelectSymbol(symbol)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            title={symbol.label}
            aria-label={symbol.label}
          >
            <svg
              viewBox={`0 0 ${symbol.width} ${symbol.height}`}
              className="w-8 h-8"
              fill="none"
              stroke={activeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={symbol.svgPath} />
            </svg>
            <span className="text-[10px] text-gray-500 truncate w-full text-center">
              {symbol.label}
            </span>
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Wire Color</p>
        <div className="flex gap-1">
          {WIRE_COLORS.map((wc) => (
            <button
              key={wc.color}
              onClick={() => onColorChange(wc.color)}
              title={wc.name}
              aria-label={`Wire color: ${wc.name}`}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-transform',
                activeColor === wc.color ? 'border-blue-500 scale-110' : 'border-gray-300'
              )}
              style={{ backgroundColor: wc.color }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
