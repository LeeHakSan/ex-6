function minutesBetween(startISO, endISO) {
  return Math.round((new Date(endISO) - new Date(startISO)) / 60000);
}

function planSnapshot(p) {
  return {
    plan_id: p.id,
    user_id: p.user_id,
    title: p.title,
    period_start: p.period_start,
    period_end: p.period_end,
    priority: p.priority,
    success_criteria: p.success_criteria,
    estimated_minutes: p.estimated_minutes,
    carried_over_note: p.carried_over_note,
    retro_note: p.retro_note,
  };
}

module.exports = { minutesBetween, planSnapshot };
