import { useState } from 'react'
import './today.css'
import { buildToday } from '../features/today/buildToday'
import { useTodayData } from '../features/today/useTodayData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Today() {
  const [version, setVersion] = useState(0)
  return <TodayBody key={version} refresh={() => setVersion(v => v + 1)} />
}

function TodayBody({ refresh }: { refresh: () => void; }) {
  const [now] = useState(() => new Date())
  const { input, status } = useTodayData()
  const model = buildToday(input, now)

  function run(action: string) {
    // Map actions to console logs for now
    console.log('Action:', action)
  }

  const rowCount = (model.replays?.due?.length ? 1 : 0) + (model.stories?.have?.length ? 1 : 0)

  function renderHero() {
    if (!model.hero) {
      return <Card className="today-card"><h3>No hero</h3><p>Model is loading…</p></Card>
    }
    const hero = model.hero
    return (
      <Card className="today-card">
        <div className="today-hero">
          <div className="today-kicker">Model build</div>
          <div className="today-why">{hero.why}</div>
          <div className="today-go">
            <Button onClick={() => run('resumeInterview')}>Resume</Button>
            <Button onClick={() => run('letGo')}>Let Go</Button>
          </div>
        </div>
      </Card>
    )
  }

  function renderComingUp() {
    if (!model.comingUp) {
      return <Card className="today-card"><h3>Coming up</h3><p>No coming up data</p></Card>
    }
    const c = model.comingUp
    return (
      <Card className="today-card">
        <h3>Coming up</h3>
        <p>{c.countdown || 'No upcoming items'}</p>
      </Card>
    )
  }

  function renderSince() {
    if (!model.since) {
      return <Card className="today-card"><h3>Since last week</h3><p>No since data</p></Card>
    }
    const s = model.since
    return (
      <Card className="today-card">
        <h3>Since last week</h3>
        <p>{s.stronger?.[0]?.headline || 'No activity'}</p>
      </Card>
    )
  }

  function renderReplaysStories() {
    if (rowCount <= 0) return null
    return (
      <Card>
        <h2 className="today-sr">Replays and your stories</h2>
        <div className="today-row">
          {model.replays?.due && model.replays.due.length > 0 ? (
            <p>Replays due: {model.replays.due.length}</p>
          ) : null}
          {model.replays?.upcoming && model.replays.upcoming.length > 0 ? (
            <p>Upcoming: {model.replays.upcoming.length}</p>
          ) : null}
          {model.stories && model.stories.have && model.stories.have.length > 0 ? (
            <p>Stories: {model.stories.have.length}</p>
          ) : null}
        </div>
      </Card>
    )
  }

  function renderSetup() {
    if (!model.setup) {
      return null
    }
    return (
      <Card>
        <h3>Setup</h3>
        <p>{model.setup.heading}</p>
      </Card>
    )
  }

  return (
    <div className="today">
      <h1>Today</h1>
      <div className="today-page">
        <div className="today-stack">
          {renderHero()}
          {renderComingUp()}
          {renderSince()}
          {renderReplaysStories()}
          {renderSetup()}
        </div>
      </div>
    </div>
  )
}
