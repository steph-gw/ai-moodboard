/**
 * Bubble Data API client.
 *
 * Every field key below is checked against `GET /version-test/api/1.1/meta`, which returns
 * the real schema — id, display name and type for every exposed field. Bubble derives the
 * ids from display names in ways that are not guessable (a `?` leaves a double underscore;
 * "1 Project / Event" is internally `wedding`), so read them there rather than inferring.
 * See bubble/PHASE-1-DATA-MODEL.md, Appendix B.
 *
 * Two rules worth knowing when adding to this file:
 *  - Empty fields are omitted from responses entirely, never returned as null. Treat every
 *    key as possibly absent.
 *  - A `?` at the end of a field name leaves a double underscore: `archived__boolean`.
 */

export const K = {
  moodboard: {
    name: 'name_text',
    visionBrief: 'vision_brief_text',
    palette: 'palette_list_text',
    event: 'event_custom_wedding', // "1 Project / Event" is internally `wedding`
    /** A reusable board a planner saved. The Name field doubles as the template's name. */
    template: 'template__boolean',
    /** Authored by Gatherwise and offered to everyone. */
    systemTemplate: 'system_template__boolean',
    /**
     * The planner business a template belongs to.
     *
     * A real reference, not a text id: the Data API hands a reference back as the target's
     * unique id and accepts one on write whether or not that type is itself exposed, so
     * there is nothing to gain from denormalising it — and a reference is what Bubble's own
     * expressions and searches can follow.
     */
    business: 'business_custom_business', // Event Planner Business is internally `business`
  },
  section: {
    moodboard: 'moodboard_custom_moodboard',
    name: 'section_name_text',
    visionBrief: 'section_vision_brief_text',
    icon: 'icon_text',
    status: 'status_option_moodboard_status_os',
    approvedDate: 'approved_date_date',
    order: 'order_number',
    archived: 'archived__boolean',
    lockedSlides: 'locked_slides_list_custom_moodboard_slide',
  },
  slide: {
    section: 'moodboard_section_custom_moodboard_section',
    name: 'slide_name_text',
    order: 'order_number',
    elementsJson: 'elements_json_text',
  },
  image: {
    moodboard: 'moodboard_custom_moodboard',
    image: 'image_image',
    inUse: 'in_use__boolean',
  },
  vote: {
    image: 'moodboard_image_custom_moodboard_image',
    vote: 'moodboard_vote_option_moodboard_vote_os',
  },
  thread: {
    moodboard: 'moodboard_custom_moodboard',
    slide: 'moodboard_slide_custom_moodboard_slide',
    x: 'x_axis_number',
    y: 'y_axis_number',
    resolved: 'resolved__boolean',
    resolvedBy: 'resolved_by_user', // User refs use _user, not _custom_user
    resolvedDate: 'resolved_date_date',
  },
  comment: {
    thread: 'thread_custom_moodboard_thread',
    parent: 'parent_comment_custom_moodboard_comment',
    text: 'text_text',
    edited: 'edited__boolean',
    /**
     * Denormalised so the drawer can render a name without the User type being on the
     * Data API. `Created By` is still the record of who wrote it — this is a display
     * label, and the two are only ever set together, at create time.
     */
    authorName: 'author_name_text',
  },
} as const;

export const TYPE = {
  moodboard: 'moodboard',
  section: 'moodboardsection',
  slide: 'moodboardslide',
  image: 'moodboardimage',
  vote: 'moodboardimagevote',
  thread: 'moodboardthread',
  comment: 'moodboardcomment',
} as const;

/** A Bubble record: `_id` plus whichever fields aren't empty. */
export interface BubbleRow {
  _id: string;
  'Created By'?: string;
  'Created Date'?: string;
  'Modified Date'?: string;
  [key: string]: unknown;
}

export interface Constraint {
  key: string;
  constraint_type: 'equals' | 'not equal' | 'in' | 'is_empty' | 'is_not_empty';
  value?: unknown;
}

export class BubbleApiError extends Error {
  constructor(readonly status: number, readonly body: string, message: string) {
    super(message);
    this.name = 'BubbleApiError';
  }
}

/**
 * Resolves the API root from the page URL. Bubble serves each version under its own path
 * prefix, and calling the bare `/api/...` from a `/version-test/` page silently hits *live*
 * — which 404s with "This application does not expose a Data API", a message that has
 * nothing to do with the actual problem.
 */
export function resolveApiBase(pathname = window.location.pathname): string {
  // Anything up to the next slash, not just [a-z0-9-]: a branch named `Feature_QA` is a
  // perfectly ordinary Bubble version, and the narrower pattern quietly failed to match it
  // and sent the board to live — the same silent wrong-app failure this function exists to
  // prevent, hiding inside the fix for it.
  const version = pathname.match(/^\/(version-[^/]+)\//)?.[1];
  return `${version ? `/${version}` : ''}/api/1.1/obj`;
}

export interface BubbleApiOptions {
  /** Overrides the derived base. Only needed if the plugin isn't same-origin with the app. */
  base?: string;
  /** Bearer token. Not normally needed — the session cookie authenticates same-origin calls. */
  authToken?: string;
}

export class BubbleApi {
  private readonly base: string;
  private readonly authToken?: string;

  constructor(options: BubbleApiOptions = {}) {
    // `||`, not `??`: the host sends an empty string when it has nothing to override with,
    // and `??` treats '' as a real value — which points every request at the live app
    // instead of /version-test, where the records it is asking for do not exist.
    this.base = options.base || resolveApiBase();
    this.authToken = options.authToken;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (this.authToken) headers.set('Authorization', `Bearer ${this.authToken}`);

    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BubbleApiError(res.status, body, describeFailure(res.status, body));
    }
    return res;
  }

  /**
   * Reads every matching row, following Bubble's cursor. The API caps a page at 100, and a
   * board with a lot of images will exceed that.
   */
  async list(type: string, constraints: Constraint[] = [], sortField?: string): Promise<BubbleRow[]> {
    const rows: BubbleRow[] = [];
    let cursor = 0;

    for (;;) {
      const params = new URLSearchParams({ cursor: String(cursor), limit: '100' });
      if (constraints.length) params.set('constraints', JSON.stringify(constraints));
      if (sortField) params.set('sort_field', sortField);

      const { response } = await (await this.request(`/${type}?${params}`)).json();
      rows.push(...response.results);
      if (!response.remaining) return rows;
      cursor += response.results.length;
      // A page that returns nothing but still claims remaining would spin forever.
      if (!response.results.length) return rows;
    }
  }

  async get(type: string, id: string): Promise<BubbleRow> {
    const { response } = await (await this.request(`/${type}/${id}`)).json();
    return response;
  }

  async create(type: string, fields: Record<string, unknown>): Promise<string> {
    const res = await this.request(`/${type}`, { method: 'POST', body: JSON.stringify(fields) });
    const { id } = await res.json();
    return id;
  }

  /** Merges the given fields; omitted fields are left alone. Resolves on 204. */
  async patch(type: string, id: string, fields: Record<string, unknown>): Promise<void> {
    await this.request(`/${type}/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
  }

  async remove(type: string, id: string): Promise<void> {
    await this.request(`/${type}/${id}`, { method: 'DELETE' });
  }
}

/** Turns Bubble's error bodies into something worth showing a user. */
function describeFailure(status: number, body: string): string {
  if (/Unrecognized field/.test(body)) {
    const field = /Unrecognized field: (\w+)/.exec(body)?.[1];
    return `Bubble rejected the field "${field ?? '?'}" — the schema and this client disagree.`;
  }
  if (status === 401 || status === 403) {
    return 'Bubble denied the request. Check the privacy rules grant this user Create/Modify via API.';
  }
  if (status === 404 && /does not expose a Data API/.test(body)) {
    return 'Wrong API version path — this hit the live version, which has no Data API enabled.';
  }
  if (status === 404) return 'That record no longer exists.';
  return `Bubble returned ${status}.`;
}
