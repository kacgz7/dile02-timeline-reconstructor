// score.js — DETERMINISTIC scoring (same answer = same score, always).
// Pure functions only. No React. Test in console.

// placement = array of { id, time, tCode, causedBy: [ids] } in timeline order
// reference = scenario.json.referenceKillChain
export function scoreAttempt(placement, reference) {
  const refById = Object.fromEntries(reference.map((r) => [r.id, r]))
  const n = reference.length

  let temporal = 0
  let tCode = 0
  let causal = 0

  for (const p of placement) {
    const ref = refById[p.id]
    if (!ref) continue

    // TEMPORAL: card must sit before every reference card that is LATER in time
    const refOrder = reference.findIndex((r) => r.id === p.id)
    const laterRefs = reference.slice(refOrder + 1)
    if (laterRefs.every((lr) => p.time <= lr.time)) temporal++

    // T-CODE: exact ATT&CK match
    if (p.tCode === ref.tCode) tCode++

    // CAUSAL: same set of causedBy ids (order-independent)
    const a = [...ref.causedBy].sort()
    const b = [...(p.causedBy || [])].sort()
    if (a.length === b.length && a.every((x) => b.includes(x))) causal++
  }

  return {
    temporal: Math.round((temporal / n) * 100),
    tCode: Math.round((tCode / n) * 100),
    causal: Math.round((causal / n) * 100),
    overall: Math.round(((temporal + tCode + causal) / (n * 3)) * 100),
  }
}
