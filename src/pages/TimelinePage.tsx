import { useState } from 'react'
import { useDayEntries } from '../hooks/useDayEntries'
import { DayNavigator } from '../components/timeline/DayNavigator'
import { TimelineView } from '../components/timeline/TimelineView'


export function TimelinePage() {
  const [date, setDate] = useState(() => new Date())
  const { entries, tags, isLoading, reload } = useDayEntries(date)

  const totalMs = entries.reduce((sum, e) => {
    if (!e.stoppedAt) return sum
    return sum + (e.stoppedAt - e.startedAt)
  }, 0)

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <DayNavigator date={date} onDateChange={setDate} totalMs={totalMs} />

      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm ot-faint">
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 ot-faint">
            <p className="text-sm">No entries for this day.</p>
            <p className="text-xs ot-faint opacity-60">Click anywhere on the grid to add one.</p>
            {/* Still render the grid so clicks work */}
            <div className="absolute inset-0">
              <TimelineView date={date} entries={[]} tags={tags} onMutate={reload} />
            </div>
          </div>
        ) : (
          <TimelineView date={date} entries={entries} tags={tags} onMutate={reload} />
        )}
      </div>
    </div>
  )
}
