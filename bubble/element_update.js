// GW Moodboard — plugin element "update"
// Paste into the element's Code tab. Bubble calls this after initialize and again
// every time any bound property changes.

function (instance, properties, context) {
  if (!instance.data.id) return; // initialize bailed out; nothing to update

  // Sent whole every tick rather than diffed — mount() shallow-merges and re-renders,
  // and React reconciles. Diffing here would only move the bookkeeping, not save work.
  window.GWMoodboard.update(instance.data.id, {
    moodboardId: properties.moodboard_id || '',
    eventName: properties.event_name || '',
    eventDate: properties.event_date
      ? new Date(properties.event_date).toISOString().slice(0, 10)
      : '',

    currentUserId: properties.current_user_id || '',
    currentUserName: properties.current_user_name || '',
    currentUserInitials: properties.current_user_initials || '',
    role: properties.is_planner ? 'planner' : 'client',
    readOnly: !!properties.read_only,

    logoUrl: properties.logo_url || '',
    height: properties.height_css || '100%',

    // Left blank on purpose: same-origin cookies authenticate the Data API, and the
    // base URL is derived from the page's own /version-test prefix.
    apiBase: properties.api_base || '',
    authToken: properties.auth_token || '',

    features: {
      pinterest: !!properties.show_pinterest,
      summarizeVision: !!properties.show_ai_summarize,
      suggestions: !!properties.show_suggestions,
      present: properties.enable_present !== false,
      exportPdf: properties.enable_export !== false,
      imageVoting: !!properties.enable_voting,
      comments: !!properties.enable_comments,
    },
  });
}
