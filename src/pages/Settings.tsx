import { useState } from 'react'
import { AudioLines, ChevronDown, Download, Pause, Trash2, Volume2 } from 'lucide-react'
import { deleteMyData, exportMyData } from '../features/privacy/dataTools'
import '../features/privacy/privacy.css'

export interface SettingsProps {
  voiceSpeed: string
  setVoiceSpeed: (v: string) => void
  language: string
  setLanguage: (v: string) => void
  calmMotion: boolean
  setCalmMotion: (v: boolean) => void
  notify: (message: string) => void
  /** The old "Reset demo data" action (it confirms by itself). */
  onResetDemo: () => void
  onOpenPrivacy: () => void
  /** Called after the server and this browser have both been cleared. */
  onDeleted: () => void
}

export default function Settings(p: SettingsProps) {
  const [status, setStatus] = useState('')
  const [asking, setAsking] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  const doExport = async () => {
    setBusy(true); setStatus('')
    try {
      await exportMyData()
      setStatus('Your data was saved as a JSON file.')
    } catch {
      setStatus('We could not export your data just now. Please try again.')
    } finally { setBusy(false) }
  }

  const doDelete = async () => {
    setBusy(true); setStatus('')
    try {
      await deleteMyData()
      setAsking(false); setTyped('')
      p.onDeleted()
    } catch {
      setStatus('We could not delete your data just now, so nothing was removed. Please try again.')
    } finally { setBusy(false) }
  }

  return <div className="workspace-content settings-content"><div className="page-title"><div><p className="eyebrow">Settings</p><h1>Settings</h1><p>Voice, comfort, and the data MIRROR keeps for you.</p></div></div>
    <section className="settings-section"><div><h3>Voice experience</h3><p>Preview the interface planned for Sarvam speech-to-text and text-to-speech.</p></div><div className="setting-row"><span><Volume2 size={18} /><b>Voice playback speed</b></span><div className="segmented">{['Slow', 'Natural', 'Fast'].map(item => <button key={item} className={p.voiceSpeed === item ? 'active' : ''} onClick={() => { p.setVoiceSpeed(item); p.notify(`Voice speed set to ${item.toLowerCase()} for this preview.`) }}>{item}</button>)}</div></div><div className="setting-row"><span><AudioLines size={18} /><b>Conversation language</b></span><div className="select-wrap small-select"><select value={p.language} onChange={e => p.setLanguage(e.target.value)}><option>English</option><option>हिन्दी</option><option>தமிழ்</option><option>తెలుగు</option></select><ChevronDown size={16} /></div></div></section>
    <section className="settings-section"><div><h3>Comfort</h3><p>Reduce visual movement while preserving the live orb’s current state.</p></div><div className="setting-row"><span><Pause size={18} /><b>Calm motion</b></span><button className={`switch ${p.calmMotion ? 'on' : ''}`} onClick={() => p.setCalmMotion(!p.calmMotion)} role="switch" aria-checked={p.calmMotion}><i /></button></div></section>
    <section className="settings-section"><div><h3>Technology plan</h3><p>The intended production integrations for the next build phase.</p></div><div className="tech-plan"><span>NVIDIA NIM<small>LLM orchestration</small></span><span>Sarvam<small>STT + TTS</small></span><span>Supabase<small>Backend</small></span></div></section>
    <section className="settings-section" aria-labelledby="your-data-title"><div><h3 id="your-data-title">Your data</h3><p>Take a copy of what MIRROR keeps for you, or remove it. <button type="button" className="pv-link" onClick={p.onOpenPrivacy}>Your privacy</button></p></div>
      <div className="pv-actions">
        <button type="button" className="button button--secondary" onClick={() => void doExport()} disabled={busy}><Download size={15} /> Export my data</button>
        <button type="button" className="button button--ghost" onClick={() => { setAsking(true); setStatus('') }} disabled={busy || asking}><Trash2 size={15} /> Delete all my data</button>
      </div>
      {asking && <div className="pv-confirm" role="group" aria-label="Confirm deleting your data">
        <p>This removes your profile, practice sessions, answers, notes, targets, stories, résumé points and review schedule from MIRROR, and the drafts saved in this browser. It cannot be undone. Your sign-in account stays, so you can start again.</p>
        <label>Type DELETE to confirm<input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" aria-label="Type DELETE to confirm" /></label>
        <div className="pv-actions">
          <button type="button" className="button button--ghost" onClick={() => void doDelete()} disabled={busy || typed !== 'DELETE'}>Delete everything</button>
          <button type="button" className="button button--secondary" onClick={() => { setAsking(false); setTyped('') }} disabled={busy}>Keep my data</button>
        </div>
      </div>}
      <p className="pv-note" role="status" aria-live="polite">{status}</p>
    </section>
    <section className="settings-section danger-section"><div><h3>Reset prototype</h3><p>Clear your profile, stories and replay answers. To remove everything, use Delete all my data above.</p></div><button type="button" className="button button--ghost" onClick={p.onResetDemo}><Trash2 size={15} /> Reset demo data</button></section></div>
}
