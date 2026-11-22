import { useState } from 'react'
import './today.css'
import { buildToday } from '../features/today/buildToday'
import { useTodayData } from '../features/today/useTodayData'
import { ComingUp, Footer, Header, Hero, HeroLoading, ReplaysCard, SectionError, SetupCard, SinceLastWeek, Skeleton, StoriesCard } from '../features/today/sections'
import type { TodayAction, TodayProps } from '../features/today/types'

/** Today. Renders the model buildToday() returns; it decides nothing about what comes next. */
export default function Today(props: TodayProps) {
  // Bumped after letting go of an interview or saving a date, so every section reads fresh data.
  const [version, setVersion] = useState(0)
  return <TodayBody key={version} {...props} refresh={() => setVersion(v => v + 1)} />
}

function TodayBody({ busy, refresh, ...cb }: TodayProps & { refresh: () => void }) {
  const [now] = useState(() => new Date())
  const { input, status } = useTodayData()
  const model = buildToday(input, now)

  /** Every button and link carries a TodayAction; this is the one place that maps it to an App callback. */
  const run = (a: TodayAction) => {
    switch (a.type) {
      case 'resumeInterview': return cb.onContinue(a.interviewId)
      case 'letGo': return void Promise.resolve(cb.onLetGo(a.interviewId)).then(refresh)
      case 'startQuestion': return cb.onStart(a.question, a.speak)
      case 'screening': return cb.onScreen(a.targetId)
      case 'openReplays': return cb.onOpenReplays(a.itemId)
      case 'openItem': return cb.onOpenItem(a.itemId)
      case 'firstInterview': return cb.onFirstInterview()
      case 'openTarget': return cb.onOpenTarget(a.targetId)
      case 'addTarget': return cb.onAddTarget()
      case 'addStory': return cb.onOpenStories(a.theme)
      case 'openSession': return cb.onReplay(a.interviewId)
      case 'sayItAgain': return cb.onSayItAgain(a.interviewId, a.questionIndex)
    }
  }

  const rowCount = (model.replays || status.replays !== 'ready' ? 1 : 0) + (model.stories || status.stories !== 'ready' ? 1 : 0)
  return (
    <div className="today">
      <div className="today-page">
        <Header model={model} now={now} loading={status.hero === 'loading'} />
        <div className="today-stack">
          {status.hero === 'loading' ? <HeroLoading /> : <Hero model={model} busy={busy} run={run} />}

          {status.comingUp === 'loading' ? <Skeleton id="today-up-h" title="Coming up" line="Checking your dates…" />
            : status.comingUp === 'error' ? <SectionError id="today-up-h" title="Coming up" what="your dates" />
            : model.comingUp && <ComingUp c={model.comingUp} busy={busy} run={run} onChanged={refresh} />}

          {status.since === 'loading' ? <Skeleton id="today-since-h" title="Since last week" line="Looking at your week…" />
            : status.since === 'error' ? <SectionError id="today-since-h" title="Since last week" what="your week" />
            : model.since && <SinceLastWeek s={model.since} run={run} />}

          {rowCount > 0 && (
            <section className={`today-row${rowCount === 1 ? ' is-one' : ''}`} aria-labelledby="today-row-h">
              <h2 id="today-row-h" className="today-sr">Replays and your stories</h2>
              {status.replays === 'loading' ? <Skeleton nested id="today-rep-h" title="Replays" line="Checking your replays…" />
                : status.replays === 'error' ? <SectionError nested id="today-rep-h" title="Replays" what="your replays" />
                : model.replays && <ReplaysCard r={model.replays} run={run} />}
              {status.stories === 'loading' ? <Skeleton nested id="today-stories-h" title="Your stories" line="Looking at your stories…" />
                : status.stories === 'error' ? <SectionError nested id="today-stories-h" title="Your stories" what="your stories" />
                : model.stories && <StoriesCard s={model.stories} run={run} />}
            </section>
          )}

          {model.setup && status.hero === 'ready' && <SetupCard s={model.setup} run={run} />}
        </div>
        <Footer />
      </div>
    </div>
  )
}
