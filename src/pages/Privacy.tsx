import '../features/privacy/privacy.css'

// Every sentence here is checked against the code in docs/PRIVACY-AUDIT.md. Change the wording, not the audit.
const PROMISES = [
  ['Audio is never stored by MIRROR', 'Your voice is turned into text while you speak. MIRROR keeps the text, never the recording.'],
  ['Answers never get a number', 'After a session you get an evaluation in plain levels, with the lines you said and one thing to try. Your interview answers, spoken or typed, never get a number or a pass or fail. Practice problems with one right answer, such as SQL, are simply marked correct or not.'],
  ['Nothing is shared with employers', 'MIRROR has no sharing feature. Nothing is sent to employers or recruiters, and nobody else signed in to MIRROR can open your practice.'],
  ['You can delete everything, anytime', 'In Settings, Delete all my data removes everything MIRROR stores for you. Export my data gives you a copy first.'],
] as const

const HANDLES = [
  ['Speech-to-text service', 'Live audio goes to the speech-to-text service while you speak, and the question text goes to it when MIRROR reads a question aloud. MIRROR does not keep the audio.'],
  ['Language-model service', 'Your answers, résumé text and the SQL you write go to the language-model service when the assistant writes notes or questions. When it is slow or off, plain notes are built from your own words, with no outside service.'],
  ['Your account', 'Your data is stored as text in your account and is visible only to you. A résumé file is read for its text, and the file itself is not kept.'],
  ['This browser', 'Drafts and some practice progress also live in this browser until you delete your data.'],
  ['Deleting', 'Deleting removes your stored practice data and the drafts in this browser. It does not remove your sign-in account. Backups made by the database provider are outside MIRROR’s control and can hold older copies until they expire.'],
] as const

export default function Privacy({ onBack, onOpenSettings }: { onBack: () => void; onOpenSettings: () => void }) {
  return <div className="workspace-content settings-content">
    <div className="page-title"><div><p className="eyebrow">PRIVATE BY DESIGN</p><h1>Your privacy</h1><p>Four promises, and who handles what.</p></div></div>
    <section className="settings-section" aria-labelledby="pv-promises"><div><h3 id="pv-promises">Our promises</h3></div>
      <ul className="pv-list">{PROMISES.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
    </section>
    <section className="settings-section" aria-labelledby="pv-who"><div><h3 id="pv-who">Who handles what</h3></div>
      <ul className="pv-list">{HANDLES.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
    </section>
    <div className="pv-actions">
      <button type="button" className="m-btn" onClick={onOpenSettings}>Export or delete my data</button>
      <button type="button" className="m-btn m-btn--quiet" onClick={onBack}>Back</button>
    </div>
  </div>
}
