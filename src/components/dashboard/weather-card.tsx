import { Card } from '@/components/ui/card'
import { Sun, Cloud, CloudRain, CloudSnow, Zap, CloudDrizzle } from 'lucide-react'
import type { DayForecast } from '@/lib/weather'

function getWeatherIcon(code: number) {
  if (code >= 95) return <Zap className="w-6 h-6 text-yellow-500" />
  if (code >= 71 && code <= 77) return <CloudSnow className="w-6 h-6 text-blue-400" />
  if (code >= 80 && code <= 86) return <CloudRain className="w-6 h-6 text-blue-500" />
  if (code >= 61 && code <= 67) return <CloudRain className="w-6 h-6 text-blue-500" />
  if (code >= 51 && code <= 57) return <CloudDrizzle className="w-6 h-6 text-blue-400" />
  if (code >= 45 && code <= 48) return <Cloud className="w-6 h-6 text-gray-500" />
  if (code >= 1 && code <= 3) return <Cloud className="w-6 h-6 text-gray-500" />
  return <Sun className="w-6 h-6 text-yellow-500" />
}

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

interface WeatherCardProps {
  forecast: DayForecast[]
}

export function WeatherCard({ forecast }: WeatherCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-4 h-4 text-[#68BD45]" />
        <h3 className="text-sm font-semibold text-gray-900">Wilmington Weather</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {forecast.map((day, i) => (
          <div
            key={day.date}
            className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
              day.weatherCode >= 95
                ? 'bg-orange-50 border border-orange-200'
                : day.isWarning
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-gray-50'
            }`}
          >
            <span className="text-xs font-medium text-gray-600">
              {getDayLabel(day.date, i)}
            </span>
            {getWeatherIcon(day.weatherCode)}
            <span className="text-xs text-gray-500">{day.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-gray-900">{day.tempHigh}°</span>
              <span className="text-xs text-gray-500">{day.tempLow}°</span>
            </div>
            {day.precipitation > 0 && (
              <span className="text-xs text-blue-600 font-medium">
                {day.precipitation.toFixed(1)}&quot; rain
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
