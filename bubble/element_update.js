// GW Moodboard — plugin element "update"
// Paste into the element's Code tab. Bubble calls this after initialize and again
// every time any bound property changes.

// Note the signature: `function(` with NO space before the bracket. Bubble silently
// refuses to run element code written as `function (` — no error, no console output,
// the element just renders an empty div forever. Verified 2026-09-11: the same code
// with and without that space is dead versus working.
function(instance, properties, context) {
  // Bubble does not hand a list property over as a JS array. It is a list object with
  // .length() and .get(from, count), and passing it straight through gives the bundle
  // something that looks iterable and isn't — the board died on `.join is not a function`
  // the first time a collaborator list was non-empty.
  function listOf(prop) {
    if (!prop) return [];
    if (Array.isArray(prop)) return prop;
    if (typeof prop.length === 'function' && typeof prop.get === 'function') {
      return prop.get(0, prop.length()) || [];
    }
    return [];
  }

  // Sent whole every tick rather than diffed — mount() shallow-merges and re-renders,
  // and React reconciles. Diffing here would only move the bookkeeping, not save work.
  var props = {
    moodboardId: properties.moodboard_id || '',
    templateMoodboardId: properties.template_moodboard_id || '',
    businessId: properties.business_id || '',
    eventName: properties.event_name || '',
    eventDate: properties.event_date
      ? new Date(properties.event_date).toISOString().slice(0, 10)
      : '',

    collaboratorIds: listOf(properties.collaborator_ids),
    collaboratorNames: listOf(properties.collaborator_names),
    collaboratorPhotos: listOf(properties.collaborator_photos),
    currentUserId: properties.current_user_id || '',
    currentUserName: properties.current_user_name || '',
    currentUserInitials: properties.current_user_initials || '',
    role: properties.is_planner ? 'planner' : 'client',
    isAdmin: !!properties.is_admin,
    readOnly: !!properties.read_only,

    logoUrl: properties.logo_url || '',
    height: properties.height_css || '100%',

    // Only sent when actually set. Left out, the bundle derives the base from the page's
    // own /version-test prefix; sent as an empty string, older bundles took it literally
    // and talked to the live app instead.
    ...(properties.api_base ? { apiBase: properties.api_base } : {}),
    ...(properties.auth_token ? { authToken: properties.auth_token } : {}),

    features: {
      pinterest: !!properties.show_pinterest,
      summarizeVision: !!properties.show_ai_summarize,
      suggestions: !!properties.show_suggestions,
      present: properties.enable_present !== false,
      exportPdf: properties.enable_export !== false,
      imageVoting: !!properties.enable_voting,
      comments: !!properties.enable_comments,
    },
  };

  // The bundle may still be downloading — initialize waits for it and applies this then.
  if (!instance.data.id) {
    instance.data.pending = props;
    return;
  }

  window.GWMoodboard.update(instance.data.id, props);
}
