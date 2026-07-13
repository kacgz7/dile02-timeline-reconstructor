import React, { useState, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { scoreAttempt } from './score.js'

// ---------- Draggable evidence card ----------
function Card({ card, placed, onTag, onRemove, revealMap }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: 'lib-' + card.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined
  const reveal = revealMap ? revealMap[card.id] : null
  const border = reveal ? (reveal.ok ? '#22c55e' : '#ef4444') : '#444'
  return (
    <div ref={setNodeRef} style={{ ...style, border: `2px solid ${border}`, borderRadius: 8, padding: 8, margin: 6, background: '#1e293b', cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.6 : 1 }} {...listeners} {...attributes}>
      <b>{card.title}</b>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{card.detail}</div>
      {placed && (
        <div style={{ marginTop: 6 }}>
          <select value={card.tCode || ''} onChange={(e) => onTag(card.id, e.target.value)} style={{ width: '100%', fontSize: 12 }}>
            <option value="">— ATT&CK tag —</option>
            {card.attackOptions.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
          </select>
          <button onClick={() => onRemove(card.id)} style={{ marginTop: 4, fontSize: 11 }}>remove</button>
        </div>
      )}
      {reveal && <div style={{ fontSize: 11, color: reveal.ok ? '#22c55e' : '#ef4444', marginTop: 4 }}>{reveal.msg}</div>}
    </div>
  )
}

// ---------- Timeline drop zone ----------
function Timeline({ placed, cardsById, onDropCard, onTag, onRemove, links, onLink, revealMap }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' })
  return (
    <div ref={setNodeRef} style={{ minHeight: 320, border: `2px dashed ${isOver ? '#22d3ee' : '#555'}`, borderRadius: 8, padding: 12, background: '#0f172a', position: 'relative' }}>
      <h3>Timeline (drag cards here, in order)</h3>
      {placed.length === 0 && <p style={{ opacity: 0.5 }}>Drop evidence cards to build the incident picture.</p>}
      {placed.map((id, idx) => {
        const card = cardsById[id]
        const reveal = revealMap ? revealMap[id] : null
        const border = reveal ? (reveal.ok ? '#22c55e' : '#ef4444') : '#334155'
        return (
          <div key={id} style={{ border: `2px solid ${border}`, borderRadius: 6, padding: 8, margin: '6px 0', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>#{idx + 1} {card.title}</b>
              <button onClick={() => onRemove(id)} style={{ fontSize: 11 }}>x</button>
            </div>
            <select value={card.tCode || ''} onChange={(e) => onTag(id, e.target.value)} style={{ width: '100%', fontSize: 12, marginTop: 4 }}>
              <option value="">— ATT&CK tag —</option>
              {card.attackOptions.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}
            </select>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Caused by:{' '}
              {placed.filter((x) => x !== id).map((src) => (
                <label key={src} style={{ marginRight: 8 }}>
                  <input type="checkbox" checked={links[id]?.includes(src) || false} onChange={(e) => onLink(id, src, e.target.checked)} /> {cardsById[src].title.slice(0, 12)}
                </label>
              ))}
            </div>
            {reveal && <div style={{ fontSize: 11, color: reveal.ok ? '#22c55e' : '#ef4444', marginTop: 4 }}>{reveal.msg}</div>}
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const [scenario, setScenario] = useState(null)
  const [attack, setAttack] = useState([])
  const [placed, setPlaced] = useState([]) // ordered array of card ids
  const [tags, setTags] = useState({}) // id -> tCode
  const [links, setLinks] = useState({}) // id -> [causedBy ids]
  const [result, setResult] = useState(null)
  const [revealMap, setRevealMap] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    Promise.all([fetch('/scenario.json').then((r) => r.json()), fetch('/attack-data.json').then((r) => r.json())])
      .then(([s, a]) => { setScenario(s); setAttack(a) })
    // restore from localStorage
    const saved = localStorage.getItem('dile02-state')
    if (saved) { const st = JSON.parse(saved); setPlaced(st.placed || []); setTags(st.tags || {}); setLinks(st.links || {}) }
  }, [])

  if (!scenario) return <p>Loading scenario…</p>

  const cardsById = Object.fromEntries(scenario.evidenceCards.map((c) => [c.id, { ...c, attackOptions: attack, tCode: tags[c.id] }]))

  function persist(np, nt, nl) {
    localStorage.setItem('dile02-state', JSON.stringify({ placed: np, tags: nt, links: nl }))
  }

  function handleDragEnd(event) {
    const id = String(event.active.id).replace('lib-', '')
    if (!placed.includes(id)) {
      const np = [...placed, id]
      setPlaced(np); persist(np, tags, links)
    }
  }

  function onTag(id, val) {
    const nt = { ...tags, [id]: val }; setTags(nt); persist(placed, nt, links)
  }

  function onRemove(id) {
    const np = placed.filter((x) => x !== id)
    const nl = { ...links }; delete nl[id]
    setPlaced(np); setLinks(nl); persist(np, tags, nl)
  }

  function onLink(id, src, checked) {
    const cur = links[id] || []
    const nl = { ...links, [id]: checked ? [...new Set([...cur, src])] : cur.filter((x) => x !== src) }
    setLinks(nl); persist(placed, tags, nl)
  }

  function submit() {
    const placement = placed.map((id) => ({ id, time: cardsById[id].time, tCode: tags[id] || '', causedBy: links[id] || [] }))
    const sc = scoreAttempt(placement, scenario.referenceKillChain)
    setResult(sc)
    // build reveal map: per-card ok/msg
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

  function reset() {
    setPlaced([]); setTags({}); setLinks({}); setResult(null); setRevealMap(null)
    localStorage.removeItem('dile02-state')
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <h1>PWNDORA IR Lab — {scenario.scenarioName}</h1>
      <p>{scenario.summary}</p>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 300, maxHeight: '70vh', overflowY: 'auto' }}>
          <h3>Evidence Library ({scenario.evidenceCards.length})</h3>
          {scenario.evidenceCards.filter((c) => !placed.includes(c.id)).map((c) => (
            <Card key={c.id} card={{ ...c, attackOptions: attack }} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <Timeline placed={placed} cardsById={cardsById} onDropCard={handleDragEnd} onTag={onTag} onRemove={onRemove} links={links} onLink={onLink} revealMap={revealMap} />
          <div style={{ marginTop: 12 }}>
            <button onClick={submit}>Score reconstruction</button>
            <button onClick={reset} style={{ marginLeft: 8 }}>Reset</button>
          </div>
          {result && (
            <div style={{ marginTop: 12, background: '#1e293b', padding: 12, borderRadius: 8 }}>
              <b>Score:</b> temporal {result.temporal}% · T-code {result.tCode}% · causal {result.causal}% · <b>overall {result.overall}%</b>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  )
}
