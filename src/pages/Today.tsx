import { useState } from 'react'
import './today.css'
import { buildToday } from '../features/today/buildToday'
import { useTodayData } from '../features/today/useTodayData'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Today(props) {
  const [version, setVersion] = useState(0)
  return <TodayBody key={version} {...props} refresh={() => setVersion(v => v + 1)} />
}

function TodayBody({ refresh, ...cb }: { refresh: () => void; }) {
  const [now] = useState(() => new Date())
  const { input, status } = useTodayData()
  const model = buildToday(input, now)

  const run = (a: { type: string; interviewId?: string; question?: string; speak?: boolean; targetId?: string }) => {
    switch (a.type) {
      case 'resumeInterview': return cb.onContinue(a.interviewId as string | undefined)
      case 'letGo': return void Promise.resolve(cb.onLetGo(a.interviewId as string | undefined)).then(refresh)
      case 'startQuestion': return cb.onStart(a.question as string | undefined, a.speak as boolean | undefined)
      case 'screening': return cb.onScreen(a.targetId as string | undefined)
      case 'openReplays': return cb.onOpenReplays(a.itemId)
      case 'openItem': return cb.onOpenItem(a.itemId)
      case 'firstInterview': return cb.onFirstInterview()
      case 'openTarget': return cb.onOpenTarget(a.targetId as string | undefined)
      case 'addTarget': return cb.onAddTarget()
      case 'addStory': return cb.onOpenStories(a.theme)
      case 'openSession': return cb.onReplay(a.interviewId as string | undefined)
      case 'sayItAgain': return cb.onSayItAgain(a.interviewId as string | undefined, a.questionIndex as number | undefined)
    }
  }

  const rowCount = (model.replays || status.replays !== 'ready' ? 1 : 0) + (model.stories || status.stories !== 'ready' ? 1 : 0)

  function renderHero() {
    if (status.hero === 'loading') {
      return <Card className="today-card"><h3>Loading hero…</h3><p>Checking your dates…</p></Card>
    }
    if (status.hero === 'error') {
      return <Card className="today-card"><h3>Hero</h3><p>Error loading hero</p></Card>
    }
    if (model.hero) {
      return (
        <Card className="today-card">
          <div className="today-hero">
            <div className="today-kicker">Model build</div>
            <div className="today-why">{model.hero.description || 'Your model is ready'}</div>
            <div className="today-go">
              <Button asPrimary onClick={() => run({ type: 'resumeInterview', interviewId: model.hero.id })}>Resume</Button>
              <Button asQuiet onClick={() => run({ type: 'letGo', interviewId: model.hero.id })}>Let Go</Button>
            </div>
          </div>
        </Card>
      )
    }
    return null
  }

  function renderComingUp() {
    if (status.comingUp === 'loading') {
      return <Card className="today-card"><h3>Coming up</h3><p>Checking your dates…</p></Card>
    }
    if (status.comingUp === 'error') {
      return <Card className="today-card"><h3>Coming up</h3><p>Error loading your dates</p></Card>
    }
    if (model.comingUp) {
      return <Card className="today-card"><h3>Coming up</h3><p>{model.comingUp.description || 'No upcoming items'}</p></Card>
    }
    return null
  }

  function renderSince() {
    if (status.since === 'loading') {
      return <Card className="today-card"><h3>Since last week</h3><p>Looking at your week…</p></Card>
    }
    if (status.since === 'error') {
      return <Card className="today-card"><h3>Since last week</h3><p>Error loading your week</p></Card>
    }
    if (model.since) {
      return <Card className="today-card"><h3>Since last week</h3><p>{model.since.description || 'No recent activity'}</p></Card>
    }
    return null
  }

  function renderReplaysStories() {
    if (rowCount <= 0) return null
    return (
      <Card>
        <h2 className="today-sr">Replays and your stories</h2>
        <div className="today-row">
          {status.replays === 'loading' || status.stories === 'loading' ? (
            <p>Loading replays and stories…</p>
          ) : null}
          {status.replays !== 'error' && model.replays && <div>Replays: {model.replays.length}</div>}
          {status.stories !== 'error' && model.stories && <div>Stories: {model.stories.length}</div>}
        </div>
      </Card>
    )
  }

  function renderSetup() {
    if (model.setup && status.hero === 'ready') {
      return <Card><h3>Setup</h3><p>Setup is ready</p></Card>
    }
    return null
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
