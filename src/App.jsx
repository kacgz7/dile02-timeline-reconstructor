import React, { useState, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import { scoreAttempt } from './score.js'

// ---------- Draggable evidence card ----------
function Card({ card }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id,
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: '1px solid #444',
        borderRadius: 8,
        padding: 8,
        margin: 6,
        background: '#1e293b',
        cursor: 'grab',
      }}
      {...listeners}
      {...attributes}
    >
      <b>{card.title}</b>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{card.detail}</div>
    </div>
  )
}

// ---------- Droppable timeline ----------
function Timeline({ placed }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' })
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 300,
        border: `2px dashed ${isOver ? '#22d3ee' : '#555'}`,
        borderRadius: 8,
        padding: 12,
        background: '#0f172a',
      }}
    >
      <h3>Timeline (drag cards here)</h3>
      {placed.length === 0 && (
        <p style={{ opacity: 0.5 }}>Drop evidence cards to build the incident picture.</p>
      )}
      {placed.map((c) => (
        <div key={c.id} style={{ borderBottom: '1px solid #333', padding: 6 }}>
          <b>{c.title}</b> · <code>{c.tCode || 'no T-code'}</code>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [scenario, setScenario] = useState(null)
  const [placed, setPlaced] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch('/scenario.json')
      .then((r) => r.json())
      .then(setScenario)
  }, [])

  if (!scenario) return <p>Loading scenario…</p>

  function handleDragEnd(event) {
    const id = event.active.id
    const card = scenario.evidenceCards.find((c) => c.id === id)
    if (card && !placed.find((p) => p.id === id)) {
      setPlaced([...placed, { ...card, time: card.time, tCode: card.suggestedTCode, causedBy: [] }])
    }
  }

  function submit() {
    const score = scoreAttempt(placed, scenario.referenceKillChain)
    setResult(score)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <h1>PWNDORA IR Lab — {scenario.scenarioName}</h1>
      <p>{scenario.summary}</p>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 280 }}>
          <h3>Evidence Library</h3>
          {scenario.evidenceCards
            .filter((c) => !placed.find((p) => p.id === c.id))
            .map((c) => (
              <Card key={c.id} card={c} />
            ))}
        </div>
        <div style={{ flex: 1 }}>
          <Timeline placed={placed} />
          <button onClick={submit} style={{ marginTop: 12 }}>
            Score my reconstruction
          </button>
          {result && (
            <div style={{ marginTop: 12, background: '#1e293b', padding: 12, borderRadius: 8 }}>
              <b>Result:</b> temporal {result.temporal}% · T-code {result.tCode}% ·
              causal {result.causal}% · <b>overall {result.overall}%</b>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  )
}
