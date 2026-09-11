// GW Moodboard — plugin element "initialize"
// Paste into the element's Code tab. Runs once, when the element first appears.

function (instance, context) {
  var el = instance.canvas.get(0);
  instance.data.el = el;

  // Bubble hands over an empty div with no height of its own. The app is height:100%, so
  // without this it resolves against nothing and the canvas collapses to a sliver.
  if (!el.style.height) el.style.height = '100%';

  // The bundle comes from a <script> in the element's Headers, which Bubble injects rather
  // than leaving in the parsed document — so it may still be downloading when this runs.
  // Waiting is the difference between a board that appears a moment late and one that never
  // appears at all: giving up here leaves instance.data.id unset, and update() then has
  // nothing to talk to for the life of the page.
  var WAIT_MS = 15000;
  var POLL_MS = 50;
  var waited = 0;

  function start() {
    instance.data.id = window.GWMoodboard.mount(el, {
      // Real values arrive in update(), which Bubble calls immediately after this.
      moodboardId: '',
      currentUserId: '',
      currentUserName: '',
      role: 'client',

      uploadFile: function (file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onerror = function () {
            reject(new Error('Could not read that file.'));
          };
          reader.onload = function () {
            // uploadContent wants base64 without the data: prefix.
            var base64 = String(reader.result).split(',')[1];
            context.uploadContent(file.name, base64, function (err, url) {
              if (err) {
                reject(new Error('Upload failed.'));
                return;
              }
              // Bubble returns a protocol-relative //s3... URL; make it absolute or it
              // breaks anywhere the page isn't https.
              resolve(url.indexOf('//') === 0 ? 'https:' + url : url);
            });
          };
          reader.readAsDataURL(file);
        });
      },

      onStateChange: function (state) {
        instance.publishState('active_section_id', state.activeSectionId);
        instance.publishState('active_slide_id', state.activeSlideId);
        instance.publishState('is_dirty', state.isDirty);
        instance.publishState('is_saving', state.isSaving);
        instance.publishState('is_loading', state.isLoading);
      },

      onLoaded: function () {
        instance.triggerEvent('board_loaded');
      },

      onError: function (message) {
        instance.publishState('last_error', message);
        instance.triggerEvent('error');
      },
    });

    // update() may have run while the bundle was still loading. Apply whatever it last saw,
    // or the board would sit on its placeholder values until the next property change.
    if (instance.data.pending) {
      window.GWMoodboard.update(instance.data.id, instance.data.pending);
      instance.data.pending = null;
    }
  }

  function attempt() {
    if (window.GWMoodboard) {
      start();
      return;
    }
    waited += POLL_MS;
    if (waited >= WAIT_MS) {
      el.innerHTML =
        '<div style="padding:16px;font:13px system-ui;color:#b04a3a">' +
        'Moodboard failed to load: gw-moodboard.js did not arrive. Check the element Headers.' +
        '</div>';
      return;
    }
    setTimeout(attempt, POLL_MS);
  }

  attempt();
}
