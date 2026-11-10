import { useMemo, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { THEMES, isThemeInSeason } from '../constants/themes'
import { DecorEmblem } from './ThemeDecor'
import { isDecorEnabled, setDecorEnabled } from '../utils/themeDecor'
import '../styles/themeSelector.css'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const seasonLabel = (season) => {
  if (!season) return ''
  const [a, b] = season.map((s) => MONTHS[Number(s.slice(0, 2)) - 1])
  return a === b ? a : `${a} – ${b}`
}
const normalize = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const Sparkle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 14l.9 2.6L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.4zM5 15l.7 1.8L8 17l-2.3.6L5 20l-.7-2.4L2 17l2.3-.2z" /></svg>
)
const Palette = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" /><circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" /><circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" /><circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.43-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C22 6 17.5 2 12 2z" /></svg>
)
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)

function FestiveCard({ id, theme, active, onPick, big = false }) {
  const c = theme.colors
  return (
    <button
      type="button"
      className={`ts-card ts-festive ${active ? 'is-active' : ''} ${big ? 'is-big' : ''}`}
      onClick={() => onPick(id)}
      style={{ '--tc': c.btnPrimary, '--tbg': c.bgPrimary, '--tbg2': c.bgSecondary }}
      aria-pressed={active}
    >
      <span className="ts-preview">
        <span className="ts-preview-side" />
        <span className="ts-preview-bar" />
        <DecorEmblem decor={theme.decor} />
        {active && <span className="ts-check"><Check /></span>}
      </span>
      <span className="ts-meta">
        <span className="ts-name">{theme.name}</span>
        <span className="ts-desc">{theme.description}</span>
        <span className="ts-season">{seasonLabel(theme.season)}</span>
      </span>
    </button>
  )
}

function BasicCard({ id, theme, active, onPick }) {
  const c = theme.colors
  return (
    <button
      type="button"
      className={`ts-card ts-basic ${active ? 'is-active' : ''}`}
      onClick={() => onPick(id)}
      style={{ '--tc': c.btnPrimary, '--tbg': c.bgPrimary, '--tbg2': c.bgSecondary }}
      title={theme.description}
      aria-pressed={active}
    >
      <span className="ts-mock">
        <span className="ts-mock-side"><i /><i /><i /></span>
        <span className="ts-mock-main">
          <span className="ts-mock-hero" />
          <span className="ts-mock-row"><i /><i /></span>
        </span>
        {active && <span className="ts-check"><Check /></span>}
      </span>
      <span className="ts-name">{theme.name}</span>
    </button>
  )
}

export default function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme()
  const current = THEMES[currentTheme]
  const [tab, setTab] = useState(current?.group === 'basic' && currentTheme !== 'default' ? 'basic' : 'festive')
  const [query, setQuery] = useState('')
  const [decorOn, setDecorOn] = useState(isDecorEnabled)

  const entries = Object.entries(THEMES)
  const festive = entries.filter(([, t]) => t.group === 'festive')
  const basic = entries.filter(([, t]) => t.group !== 'festive')
  const inSeason = festive.filter(([, t]) => isThemeInSeason(t))
  const otherFestive = festive.filter(([, t]) => !isThemeInSeason(t))

  const filteredBasic = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return basic
    return basic.filter(([, t]) => normalize(t.name).includes(q) || normalize(t.description).includes(q))
  }, [basic, query])

  const toggleDecor = () => {
    const next = !decorOn
    setDecorOn(next)
    setDecorEnabled(next)
  }

  return (
    <div className="ts">
      <header className="ts-head">
        <span className="ts-head-icon"><Palette /></span>
        <div className="ts-head-text">
          <h3>Aparência</h3>
          <p>Escolhe um tema — a mudança é instantânea e fica guardada.</p>
        </div>
        <span className="ts-current" style={{ '--tc': current?.colors.btnPrimary }}>
          <span className="ts-current-dot" />
          {current?.name}
        </span>
      </header>

      <div className="ts-toolbar">
        <div className="ts-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'festive'} className={tab === 'festive' ? 'is-on' : ''} onClick={() => setTab('festive')}>
            <Sparkle /> Celebrações <span>{festive.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'basic'} className={tab === 'basic' ? 'is-on' : ''} onClick={() => setTab('basic')}>
            Básicos <span>{basic.length}</span>
          </button>
        </div>
        {tab === 'basic' && (
          <label className="ts-search">
            <SearchIcon />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar tema..." aria-label="Procurar tema" />
          </label>
        )}
      </div>

      <div className="ts-body" key={tab}>
        {tab === 'festive' ? (
          <>
            {inSeason.length > 0 && (
              <section className="ts-section">
                <h4><span className="ts-live" /> Para esta época</h4>
                <div className="ts-grid ts-grid-big">
                  {inSeason.map(([key, t]) => <FestiveCard key={key} id={key} theme={t} active={currentTheme === key} onPick={changeTheme} big />)}
                </div>
              </section>
            )}
            <section className="ts-section">
              <h4>{inSeason.length > 0 ? 'Ao longo do ano' : 'Todas as celebrações'}</h4>
              <div className="ts-grid ts-grid-festive">
                {otherFestive.map(([key, t]) => <FestiveCard key={key} id={key} theme={t} active={currentTheme === key} onPick={changeTheme} />)}
              </div>
            </section>
          </>
        ) : (
          <section className="ts-section">
            {filteredBasic.length === 0 ? (
              <div className="ts-empty">Nenhum tema encontrado para “{query}”.</div>
            ) : (
              <div className="ts-grid ts-grid-basic">
                {filteredBasic.map(([key, t]) => <BasicCard key={key} id={key} theme={t} active={currentTheme === key} onPick={changeTheme} />)}
              </div>
            )}
          </section>
        )}
      </div>

      <footer className="ts-foot">
        <button type="button" className={`ts-switch ${decorOn ? 'is-on' : ''}`} onClick={toggleDecor} aria-pressed={decorOn}>
          <span className="ts-switch-track"><span /></span>
          <span className="ts-switch-text">
            <strong>Decorações animadas</strong>
            <em>{decorOn ? 'Neve, confettis e enfeites nos temas de celebração' : 'Só as cores do tema, sem animações'}</em>
          </span>
        </button>
        <span className="ts-foot-note">Guardado neste dispositivo</span>
      </footer>
    </div>
  )
}
