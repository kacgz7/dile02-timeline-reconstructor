// score.js — DETERMINISTIC scoring (same answer = same score, always).
// Pure functions only. No React here. Test this in the console.

// Compare learner placements vs reference kill chain.
// placement = { id, time, tCode, causedBy: [] }
// reference = scenario.json.referenceKillChain
export function scoreAttempt(placement, reference) {
  const refById = Object.fromEntries(reference.map((r) => [r.id, r]))

  let temporalCorrect = 0
  let tCodeCorrect = 0
  let causalCorrect = 0

  for (const p of placement) {
    const ref = refById[p.id]
    if (!ref) continue

    // Temporal: correct iff this card is ordered before later-time cards
    const refOrder = reference.findIndex((r) => r.id === p.id)
    const laterRefs = reference.slice(refOrder + 1)
    const placedAfterAllLater = laterRefs.every(
      (lr) => new Date(p.time) <= new Date(lr.time)
    )
    if (placedAfterAllLater) temporalCorrect++

    // T-code exact match
    if (p.tCode === ref.tCode) tCodeCorrect++

    // Causal: same set of causedBy ids
    const same =
      ref.causedBy.length === p.causedBy.length &&
      ref.causedBy.every((c) => p.causedBy.includes(c))
    if (same) causalCorrect++
  }

  const n = reference.length
  return {
    temporal: Math.round((temporalCorrect / n) * 100),
    tCode: Math.round((tCodeCorrect / n) * 100),
    causal: Math.round((causalCorrect / n) * 100),
    overall: Math.round(
      ((temporalCorrect + tCodeCorrect + causalCorrect) / (n * 3)) * 100
    ),
  }
}
