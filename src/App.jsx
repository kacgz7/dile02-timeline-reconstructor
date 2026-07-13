import React, { useState, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { scoreAttempt } from './score.js'
import './styles.css'

function Card({ card, placed, onTag, onRemove, revealMap }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: 'lib-' + card.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const reveal = revealMap ? revealMap[card.id] : null
  const cls = 'card' + (isDragging ? ' dragging' : '') + (reveal ? (reveal.ok ? ' ok' : ' bad') : '')
  return (
    <div ref={setNodeRef} className={cls} style={style} {...listeners} {...attributes}>
      <div className="title">{card.title}</div>
      <div className="detail">{card.detail}</div>
      {placed && (
        <div style={{ marginTop: 6 }}>
          <select value={card.tCode || ''} onChange={(e) => onTag(card.id, e.target.value)}>
            <option value="">— ATT&CK tag —</option>
            {card.attackOptions.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
          </select>
          <button className="ghost" onClick={() => onRemove(card.id)} style={{ marginTop: 4, fontSize: 11, padding: '4px 8px' }}>remove</button>
        </div>
      )}
      {reveal && <div style={{ fontSize: 11, color: reveal.ok ? 'var(--good)' : 'var(--bad)', marginTop: 4 }}>{reveal.msg}</div>}
    </div>
  )
}

function Timeline({ placed, cardsById, onTag, onRemove, links, onLink, revealMap }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' })
  return (
    <div ref={setNodeRef} className={'timeline' + (isOver ? ' over' : '')}>
      {placed.length === 0 && <div className="tl-empty">Drop evidence cards here to build the incident picture →</div>}
      {placed.map((id, idx) => {
        const card = cardsById[id]
        const reveal = revealMap ? revealMap[id] : null
        return (
          <div key={id} className={'tl-item' + (reveal ? (reveal.ok ? ' ok' : ' bad') : '')} style={reveal ? { borderLeft: `4px solid ${reveal.ok ? 'var(--good)' : 'var(--bad)'}` } : {}}>
            <div className="row">
              <span className="idx">#{idx + 1} · {card.title}</span>
              <button className="ghost" onClick={() => onRemove(id)} style={{ fontSize: 11, padding: '2px 8px' }}>✕</button>
            </div>
            <select value={card.tCode || ''} onChange={(e) => onTag(id, e.target.value)}>
              <option value="">— ATT&CK tag —</option>
              {card.attackOptions.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
            </select>
            <div className="causal">
              Caused by:{' '}
              {placed.filter((x) => x !== id).map((src) => (
                <label key={src}><input type="checkbox" checked={links[id]?.includes(src) || false} onChange={(e) => onLink(id, src, e.target.checked)} /> {cardsById[src].title.slice(0, 14)}</label>
              ))}
            </div>
            {reveal && <div style={{ fontSize: 11, color: reveal.ok ? 'var(--good)' : 'var(--bad)', marginTop: 4 }}>{reveal.msg}</div>}
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const [scenario, setScenario] = useState(null)
  const [attack, setAttack] = useState([])
  const [placed, setPlaced] = useState([])
  const [tags, setTags] = useState({})
  const [links, setLinks] = useState({})
  const [result, setResult] = useState(null)
  const [revealMap, setRevealMap] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    Promise.all([fetch('/scenario.json').then((r) => r.json()), fetch('/attack-data.json').then((r) => r.json())])
      .then(([s, a]) => { setScenario(s); setAttack(a) })
    const saved = localStorage.getItem('dile02-state')
    if (saved) { const st = JSON.parse(saved); setPlaced(st.placed || []); setTags(st.tags || {}); setLinks(st.links || {}) }
  }, [])

  if (!scenario) return <p style={{ padding: 40 }}>Loading scenario…</p>

  const cardsById = Object.fromEntries(scenario.evidenceCards.map((c) => [c.id, { ...c, attackOptions: attack, tCode: tags[c.id] }]))

  function persist(np, nt, nl) { localStorage.setItem('dile02-state', JSON.stringify({ placed: np, tags: nt, links: nl })) }

  function handleDragEnd(event) {
    const id = String(event.active.id).replace('lib-', '')
    if (!placed.includes(id)) { const np = [...placed, id]; setPlaced(np); persist(np, tags, links) }
  }
  function onTag(id, val) { const nt = { ...tags, [id]: val }; setTags(nt); persist(placed, nt, links) }
  function onRemove(id) { const np = placed.filter((x) => x !== id); const nl = { ...links }; delete nl[id]; setPlaced(np); setLinks(nl); persist(np, tags, nl) }
  function onLink(id, src, checked) {
    const cur = links[id] || []
    const nl = { ...links, [id]: checked ? [...new Set([...cur, src])] : cur.filter((x) => x !== src) }
    setLinks(nl); persist(placed, tags, nl)
  }

  function submit() {
    const placement = placed.map((id) => ({ id, time: cardsById[id].time, tCode: tags[id] || '', causedBy: links[id] || [] }))
    const sc = scoreAttempt(placement, scenario.referenceKillChain)
    setResult(sc)
    const refById = Object.fromEntries(scenario.referenceKillChain.map((r) => [r.id, r]))
    const rm = {}
    placed.forEach((id) => {
      const ref = refById[id]
      if (!ref) { rm[id] = { ok: false, msg: 'Not in reference' }; return }
      const tOk = (tags[id] || '') === ref.tCode
      const cOk = JSON.stringify([...(links[id] || [])].sort()) === JSON.stringify([...ref.causedBy].sort())
      rm[id] = { ok: tOk && cOk, msg: `T-code ${tOk ? '✓' : '✗ (' + ref.tCode + ')'}, causal ${cOk ? '✓' : '✗'}` }
    })
    setRevealMap(rm)
  }

  function reset() { setPlaced([]); setTags({}); setLinks({}); setResult(null); setRevealMap(null); localStorage.removeItem('dile02-state') }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <header className="app-header">
        <div>
          <h1>🛡️ PWNDORA IR Lab — {scenario.scenarioName}</h1>
          <div className="sub">{scenario.summary}</div>
        </div>
        <span className="badge">DILE-02 · DFIR</span>
      </header>
      <div className="layout">
        <div className="lib-col">
          <h3>Evidence Library ({scenario.evidenceCards.length})</h3>
          {scenario.evidenceCards.filter((c) => !placed.includes(c.id)).map((c) => (
            <Card key={c.id} card={{ ...c, attackOptions: attack }} />
          ))}
        </div>
        <div className="timeline-col">
          <h3>Incident Timeline</h3>
          <Timeline placed={placed} cardsById={cardsById} onTag={onTag} onRemove={onRemove} links={links} onLink={onLink} revealMap={revealMap} />
          <div className="actions">
            <button className="primary" onClick={submit}>Score reconstruction</button>
            <button className="ghost" onClick={reset}>Reset</button>
          </div>
          {result && (
            <div className="score-panel">
              <span className="big">{result.overall}%</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>overall reconstruction accuracy</span>
              <div className="bars">
                <div className="bar"><div className="lab">Temporal</div><div className="track"><div className="fill" style={{ width: result.temporal + '%' }} /></div></div>
                <div className="bar"><div className="lab">ATT&CK T-code</div><div className="track"><div className="fill" style={{ width: result.tCode + '%' }} /></div></div>
                <div className="bar"><div className="lab">Causal links</div><div className="track"><div className="fill" style={{ width: result.causal + '%' }} /></div></div>
              </div>
              <div className="legend">
                <span className="chip" style={{ color: 'var(--good)', borderColor: 'var(--good)' }}>green = correct</span>
                <span className="chip" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>red = review</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  )
}
