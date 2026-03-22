import { useState } from 'react'
import { useDayEntries } from '../hooks/useDayEntries'
import { DayNavigator } from '../components/timeline/DayNavigator'
import { TimelineCanvas } from '../components/timeline/TimelineCanvas'

export function TimelinePage() {
  const [date, setDate] = useState(() => new Date())
  const { entries, tags, isLoading, reload } = useDayEntries(date)

  const totalMs = entries.reduce((sum, e) => {
    if (!e.stoppedAt) return sum
    return sum + (e.stoppedAt - e.startedAt)
  }, 0)

  return (
    <div className="flex flex-col h-full">
      <DayNavigator date={date} onDateChange={setDate} totalMs={totalMs} />

      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
            Loading…
          </div>
        ) : (
          <TimelineCanvas
            date={date}
            entries={entries}
            tags={tags}
            onMutate={reload}
          />
        )}
      </div>
    </div>
  )
}
