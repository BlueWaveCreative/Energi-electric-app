import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          {
            'bg-[#68BD45] text-white hover:bg-[#5aa83c] focus:ring-[#68BD45] shadow-sm hover:shadow-md': variant === 'primary',
            'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-[#68BD45]': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
            'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500': variant === 'ghost',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
