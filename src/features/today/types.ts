// Shared types for the new Today page. buildToday() (pure, no React, no fetch) turns a TodayInput into a TodayModel;
// the UI only renders the model. Any TodayInput field may be null while it loads or after it failed: buildToday must not throw.
import type { CoachNote, InterviewSession, InterviewSummary, Profile, Skill, TargetSummary } from '../../lib/api'
import type { AnswerAttemptRow, StoryRow } from '../../lib/data'
import type { MatchResult } from '../../lib/matchApi'
import type { TrackLike } from '../../practice/stats'
import type { PracticeSummary } from '../../practice/types'

/** One saved target with what Today needs from it. `skills` and `match` are only fetched for the nearest target plus at most three others. */
export interface TodayTarget {
  summary: TargetSummary
  skills: Skill[] | null
  match: MatchResult | null
}

export interface TodayInput {
  /** null: not loaded yet, or no profile (the coach note then 404s). */
  profile: Profile | null
  coachNote: CoachNote | null
  /** Recent interviews, newest first. An `in_progress` one wins the hero. */
  interviews: InterviewSummary[] | null
  /** The last two completed sessions in full (turns), newest first, for "fewer fillers" comparisons. */
  completedSessions: InterviewSession[] | null
  summary: PracticeSummary | null
  targets: TodayTarget[] | null
  stories: StoryRow[] | null
  /** Answer attempts of kind 'retry' (Say it again). */
  retryAttempts: AnswerAttemptRow[] | null
  tracks: TrackLike[] | null
}

/** What a button or link does. Today.tsx maps each one to an App callback; nothing here carries a function. */
export type TodayAction =
  | { type: 'resumeInterview'; interviewId: string }
  | { type: 'letGo'; interviewId: string }
  | { type: 'startQuestion'; question: string; speak: boolean }
  | { type: 'screening'; targetId: string }
  | { type: 'openReplays'; itemId: string | null }
  | { type: 'openItem'; itemId: string }
  | { type: 'firstInterview' }
  | { type: 'openTarget'; targetId: string | null }
  | { type: 'addTarget' }
  | { type: 'addStory'; theme: string | null }
  | { type: 'openSession'; interviewId: string }
  | { type: 'sayItAgain'; interviewId: string; questionIndex: number }

export interface TodayLink { label: string; action: TodayAction }

export type HeroKind = 'resume' | 'warmup' | 'screening' | 'spoken' | 'replay' | 'sql' | 'first'

export interface Hero {
  kind: HeroKind
  /** "spoken question", "screening call", "replay", "SQL exercise", "warm-up", "your first interview", "where you left off". */
  kindLabel: string
  /** Honest estimate; the kicker reads "Your next step · {kindLabel} · about {minutes} minutes". */
  minutes: number
  /** The actual question or item title: the very text that is asked when the primary button is pressed. */
  title: string
  /** At most two sentences. Never contains résumé or answer quotes. */
  why: string
  primary: TodayLink
  secondary: TodayLink | null
}

export interface ComingUp {
  targetId: string
  company: string
  role: string
  /** ISO date the job description was read ("from the job description Scout read on {date}"), or null. */
  readOn: string | null
  /** YYYY-MM-DD, or null when no date is set ("No date yet" + "Add the date"). */
  interviewDate: string | null
  /** "today", "tomorrow", "in 10 days"; null when no date. */
  countdown: string | null
  /** false: show "Add your résumé to see which of these skills it backs." instead of the chips. null: still unknown. */
  hasResume: boolean | null
  /** Skill names only, core first then alphabetical. Never counts or fractions. */
  covered: string[]
  partial: string[]
  gap: string[]
  /** For "Practise the {topGap} question": the skill and the probe question it opens. */
  topGap: { skill: string; question: string } | null
}

export interface SinceItem {
  headline: string
  detail: string
  /** Only "worth another look" items carry one ("Say it again", "Try it again"). */
  link: TodayLink | null
}
export interface Since { stronger: SinceItem[]; another: SinceItem[] } // each up to three; an empty column is hidden

export interface ReplayRow { itemId: string; title: string; /** "SQL · due today", "SQL · next on Thursday". */ label: string }
export interface Replays {
  due: ReplayRow[]
  /** Up to two. */
  upcoming: ReplayRow[]
  /** "Gaps between replays get shorter as {company} gets closer." when the interview date compresses them. */
  compressedLine: string | null
  /** "Nothing is due today. Next: {title} on {weekday}." when nothing is due but something is coming. */
  nothingDueLine: string | null
}

export interface StoryThemeChip { id: string; label: string }
export interface StoriesCard {
  have: StoryThemeChip[]
  missing: StoryThemeChip[]
  /** One sentence on the most useful missing theme. */
  sentence: string
  suggest: StoryThemeChip | null
}

export type SetupRowId = 'target' | 'story' | 'sql'
export interface SetupRow { id: SetupRowId; title: string; body: string; button: TodayLink }
/** "When you're ready, these make Today more useful". Only the rows still to do; no counter, no checkmarks. */
export interface Setup { heading: string; rows: SetupRow[] }

export interface TodayModel {
  /** "Good morning." / "Good afternoon." / "Good evening.", or "Welcome. Start with one question." for a new user. */
  greeting: string
  /** One sentence, for example "Your Northwind Analytics interview is in 10 days. Here is one thing worth doing tonight." */
  status: string
  hero: Hero
  /** The next two applicable hero branches, as text links. At most two. */
  alternates: TodayLink[]
  comingUp: ComingUp | null
  since: Since | null
  replays: Replays | null
  stories: StoriesCard | null
  setup: Setup | null
  /** No completed interview, no practice attempts, no targets, no stories. */
  isNewUser: boolean
}

/** Per-section load state. `useTodayData()` (src/features/today/useTodayData.ts) returns it with the input; each section renders as soon as its own data arrives. */
export type SectionStatus = 'loading' | 'ready' | 'error'
export interface TodayStatus { hero: SectionStatus; comingUp: SectionStatus; since: SectionStatus; replays: SectionStatus; stories: SectionStatus }
export interface TodayData { input: TodayInput; status: TodayStatus }

/** Props of src/pages/Today.tsx (App wires them). Tests mock `useTodayData` and pass these. */
export interface TodayProps {
  busy: boolean
  onStart: (question: string, speak: boolean) => void
  onContinue: (interviewId: string) => void
  onLetGo: (interviewId: string) => void
  onScreen: (targetId: string) => void
  onOpenStories: (theme: string | null) => void
  onReplay: (interviewId: string) => void
  onOpenItem: (itemId: string) => void
  onOpenTarget: (targetId: string | null) => void
  onAddTarget: () => void
  onFirstInterview: () => void
  /** Opens the replays (Practice) at the first due item, or the Practice page when null. */
  onOpenReplays: (itemId: string | null) => void
  onSayItAgain: (interviewId: string, questionIndex: number) => void
}
