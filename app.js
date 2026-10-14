/* Drone Visibility: independent, offline-first observer event log.
   No trackers, network requests, accounts, or external dependencies. */
(() => {
  'use strict';

  const DRONES = [
    'M3E', 'M300', 'M3TD', 'M400', 'FPV', 'AVATA',
    'Mini 4 Pro', 'Mavic 2 Pro', 'Flip', 'Neo', 'Tello', 'T30', 'FlyCart 30'
  ];
  const STORAGE_KEY = 'dv_observer_data_v1';
  const VERSION = 1;
  const els = {};
  const id = (name) => document.getElementById(name);
  const elementIds = [
    'observerId', 'droneSelect', 'flightNumber', 'startRun', 'setupCard',
    'recordingCard', 'recordingHeading', 'recordingObserver', 'runTimer',
    'visibleButton', 'lostButton', 'undoButton', 'endRun', 'currentState',
    'observationCount', 'flightCount', 'saveStatus', 'recentList',
    'lastRecordedTime', 'shareCsv', 'downloadCsv', 'clearAll',
    'connectionStatus', 'toast'
  ];

  const freshData = () => ({
    version: VERSION,
    observerId: '',
    selectedDrone: DRONES[0],
    activeRunId: null,
    runs: [],
    events: []
  });

  let data = freshData();
  let storageProblem = false;
  let toastTimer = null;

  const uuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
  };
  const iso = (ms) => new Date(ms).toISOString();
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  const elapsedLabel = (durationMs) => {
    const total = Math.max(0, Math.floor(durationMs / 1000));
    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  };
  const offsetLabel = (ms) => {
    const secs = Math.round(ms / 1000);
    return `${secs >= 0 ? '+' : '−'}${Math.abs(secs)}s`;
  };
  const localStamp = (ms) => {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  };

  function showToast(message) {
    const toast = els.toast;
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function readData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshData();
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION || !Array.isArray(parsed.runs) || !Array.isArray(parsed.events)) {
        throw new Error('Stored data has an unexpected format');
      }
      return parsed;
    } catch (error) {
      storageProblem = true;
      console.error('Cannot open existing local observations:', error);
      return freshData();
    }
  }

  // A mutation is adopted only after the browser confirms local persistence.
  function commit(mutate) {
    if (storageProblem) {
      showToast('Storage is unavailable. Do not record data in private browsing.');
      return false;
    }
    const next = JSON.parse(JSON.stringify(data));
    try {
      mutate(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      data = next;
      render();
      return true;
    } catch (error) {
      storageProblem = true;
      console.error('Failed to save observations:', error);
      render();
      showToast('NOT SAVED. Check phone storage or browser settings.');
      return false;
    }
  }

  const currentRun = () => data.runs.find((run) => run.id === data.activeRunId) || null;
  const validVisibilityEvents = (runId) => data.events.filter((e) =>
    e.runId === runId && !e.voidedAtMs && (e.type === 'VISIBLE' || e.type === 'NOT_VISIBLE')
  );
  const activeVisibility = (runId) => {
    const entries = validVisibilityEvents(runId);
    return entries.length ? entries[entries.length - 1].type : null;
  };
  const nextFlightNumber = (drone) => Math.max(0, ...data.runs
    .filter((run) => run.drone === drone)
    .map((run) => Number(run.flightNumber) || 0)) + 1;

  function makeEvent(run, type, when) {
    return {
      eventId: uuid(), runId: run.id, type,
      atMs: when, elapsedMs: when - run.startMs,
      offsetMin: new Date(when).getTimezoneOffset(),
      voidedAtMs: null
    };
  }

  function startRun() {
    if (data.activeRunId) return;
    const observerId = els.observerId.value.trim();
    const drone = els.droneSelect.value;
    const flightNumber = Number(els.flightNumber.value);
    if (!observerId) {
      els.observerId.focus();
      showToast('Enter an observer ID before starting.');
      return;
    }
    if (!DRONES.includes(drone)) { showToast('Select a drone.'); return; }
    if (!Number.isInteger(flightNumber) || flightNumber < 1 || flightNumber > 999) {
      els.flightNumber.focus();
      showToast('Flight / pass # must be between 1 and 999.');
      return;
    }
    const duplicate = data.runs.some((run) =>
      run.drone === drone && run.flightNumber === flightNumber && run.observerId === observerId
    );
    if (duplicate && !window.confirm(`You already logged ${drone}, flight ${flightNumber}. Create another log with the same label?`)) return;

    const when = Date.now();
    const run = {
      id: uuid(), observerId, drone, flightNumber,
      startMs: when, endMs: null,
      deviceTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
    };
    const saved = commit((next) => {
      next.observerId = observerId;
      next.selectedDrone = drone;
      next.activeRunId = run.id;
      next.runs.push(run);
      next.events.push(makeEvent(run, 'RUN_START', when));
    });
    if (saved) showToast(`${drone} · Flight ${flightNumber} started. Watch the drone, not the screen.`);
  }

  function recordVisibility(type) {
    const run = currentRun();
    if (!run) { showToast('Start a flight log first.'); return; }
    if (activeVisibility(run.id) === type) return;
    const when = Date.now();
    const saved = commit((next) => {
      next.events.push(makeEvent(run, type, when));
    });
    if (saved) showToast(type === 'VISIBLE' ? `IN VIEW · ${localStamp(when)} · ${offsetLabel(when - run.startMs)}` : `NOT IN VIEW · ${localStamp(when)} · ${offsetLabel(when - run.startMs)}`);
  }

  function undoLast() {
    const run = currentRun();
    if (!run) return;
    const observations = validVisibilityEvents(run.id);
    if (!observations.length) return;
    const last = observations[observations.length - 1];
    if (!window.confirm(`Void the last ${last.type === 'VISIBLE' ? 'IN VIEW' : 'NOT IN VIEW'} tap (${localStamp(last.atMs)})? The row will remain in the CSV marked as voided.`)) return;
    if (commit((next) => {
      const target = next.events.find((e) => e.eventId === last.eventId);
      target.voidedAtMs = Date.now();
    })) showToast('Last tap voided. Original is preserved in the CSV.');
  }

  function endRun() {
    const run = currentRun();
    if (!run) return;
    if (!window.confirm(`End the log for ${run.drone} · Flight ${run.flightNumber}? Your observations will remain saved.`)) return;
    const when = Date.now();
    if (commit((next) => {
      const targetRun = next.runs.find((entry) => entry.id === run.id);
      targetRun.endMs = when;
      next.events.push(makeEvent(run, 'RUN_END', when));
      next.activeRunId = null;
    })) {
      els.flightNumber.value = String(nextFlightNumber(run.drone));
      showToast('Flight ended and saved. Export your CSV before leaving the field.');
    }
  }

  function updateTimer() {
    const run = currentRun();
    if (run) els.runTimer.textContent = elapsedLabel(Date.now() - run.startMs);
  }

  function render() {
    const run = currentRun();
    els.setupCard.hidden = !!run;
    els.recordingCard.hidden = !run;
    if (run) {
      els.recordingHeading.textContent = `${run.drone} · Flight ${run.flightNumber}`;
      els.recordingObserver.textContent = `Observer: ${run.observerId}`;
      updateTimer();
      const current = activeVisibility(run.id);
      els.visibleButton.disabled = current === 'VISIBLE' || storageProblem;
      els.lostButton.disabled = current === 'NOT_VISIBLE' || storageProblem;
      els.undoButton.disabled = validVisibilityEvents(run.id).length === 0 || storageProblem;
      els.endRun.disabled = storageProblem;
      els.currentState.className = 'current-state';
      if (current === 'VISIBLE') {
        els.currentState.textContent = 'CURRENT STATUS: DRONE IN VIEW';
        els.currentState.classList.add('visible-state');
      } else if (current === 'NOT_VISIBLE') {
        els.currentState.textContent = 'CURRENT STATUS: NOT IN VIEW';
        els.currentState.classList.add('lost-state');
      } else {
        els.currentState.textContent = 'No visibility observation yet — tap a button';
      }
    } else {
      // Do not overwrite draft form values while the observer is typing.
      // The persisted observer ID and aircraft are loaded once in init().
    }
    const observations = data.events.filter((e) =>
      !e.voidedAtMs && (e.type === 'VISIBLE' || e.type === 'NOT_VISIBLE')
    );
    els.observationCount.textContent = String(observations.length);
    els.flightCount.textContent = String(data.runs.length);
    els.saveStatus.textContent = storageProblem ? 'Storage error' : 'Stored locally';
    els.saveStatus.classList.toggle('error', storageProblem);
    els.startRun.disabled = storageProblem;
    els.clearAll.disabled = storageProblem;
    renderRecent(observations);
  }

  function renderRecent(observations) {
    els.recentList.replaceChildren();
    els.lastRecordedTime.textContent = observations.length ? `Last: ${localStamp(observations[observations.length - 1].atMs)}` : '';
    if (!observations.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-list';
      empty.textContent = 'No observations yet.';
      els.recentList.appendChild(empty);
      return;
    }
    for (const event of observations.slice(-5).reverse()) {
      const run = data.runs.find((r) => r.id === event.runId);
      if (!run) continue;
      const li = document.createElement('li');
      const left = document.createElement('div');
      const tag = document.createElement('div');
      tag.className = `event-tag ${event.type === 'VISIBLE' ? 'visible-tag' : 'lost-tag'}`;
      tag.textContent = event.type === 'VISIBLE' ? '● IN VIEW' : '× NOT IN VIEW';
      const description = document.createElement('div');
      description.className = 'recent-details';
      description.textContent = `${run.drone} · Flight ${run.flightNumber} · ${offsetLabel(event.elapsedMs)}`;
      left.append(tag, description);
      const time = document.createElement('span');
      time.className = 'recent-time';
      time.textContent = localStamp(event.atMs);
      li.append(left, time);
      els.recentList.appendChild(li);
    }
  }

  const CSV_FIELDS = [
    'observer_id', 'drone_id', 'flight_number', 'run_id', 'event_id',
    'event_type', 'visibility_state', 'event_utc_iso', 'event_unix_ms',
    'elapsed_ms_since_run_start', 'run_start_utc_iso', 'run_start_unix_ms',
    'run_end_utc_iso', 'device_time_zone', 'device_utc_offset_minutes',
    'voided', 'voided_at_utc_iso'
  ];
  const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  function createCsv() {
    const runs = new Map(data.runs.map((run) => [run.id, run]));
    const rows = [CSV_FIELDS];
    for (const event of data.events) {
      const run = runs.get(event.runId);
      if (!run) continue;
      const observation = event.type === 'VISIBLE' ? 'in_view' : (event.type === 'NOT_VISIBLE' ? 'not_in_view' : '');
      rows.push([
        run.observerId, run.drone, run.flightNumber, run.id, event.eventId,
        event.type, observation, iso(event.atMs), event.atMs,
        event.elapsedMs, iso(run.startMs), run.startMs,
        run.endMs === null ? '' : iso(run.endMs), run.deviceTimeZone,
        event.offsetMin, event.voidedAtMs !== null ? 'TRUE' : 'FALSE',
        event.voidedAtMs !== null ? iso(event.voidedAtMs) : ''
      ]);
    }
    return '\uFEFF' + rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
  }

  function csvFile() {
    const safeId = (data.observerId || 'observer').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 35);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `drone_visibility_${safeId}_${date}.csv`;
    return new File([createCsv()], filename, { type: 'text/csv;charset=utf-8' });
  }

  function downloadCsv() {
    if (!data.events.length) { showToast('There is no data to export yet.'); return; }
    const file = csvFile();
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showToast('CSV download started. Check that the file was actually saved.');
  }

  async function shareCsv() {
    if (!data.events.length) { showToast('There is no data to export yet.'); return; }
    const file = csvFile();
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Drone visibility observations' });
        showToast('Share sheet closed. Confirm the CSV exists in Files or your chosen destination.');
      } catch (error) {
        if (error.name === 'AbortError') {
          showToast('Share canceled; original observations are still on this phone.');
        } else {
          console.error('Share failed:', error);
          showToast('Sharing failed. Please use Download CSV instead.');
        }
      }
    } else {
      downloadCsv();
    }
  }

  function eraseEverything() {
    if (!data.runs.length && !data.events.length) { showToast('There are no flight logs to erase.'); return; }
    if (data.activeRunId) { showToast('End the active flight before erasing data.'); return; }
    const entered = window.prompt('Export your CSV first. To permanently erase ALL flight logs on THIS phone, type DELETE:');
    if (entered !== 'DELETE') { if (entered !== null) showToast('Nothing erased.'); return; }
    const oldObserver = data.observerId;
    if (commit((next) => {
      next.runs = [];
      next.events = [];
      next.activeRunId = null;
      next.observerId = oldObserver;
    })) {
      els.flightNumber.value = '1';
      showToast('Local flight logs erased.');
    }
  }

  function changeDrone() {
    const drone = els.droneSelect.value;
    els.flightNumber.value = String(nextFlightNumber(drone));
    commit((next) => { next.selectedDrone = drone; });
  }

  function registerOffline() {
    const indicator = els.connectionStatus;
    if (location.protocol === 'file:') {
      indicator.textContent = 'Needs HTTPS for offline install';
      indicator.classList.add('warning');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      indicator.textContent = 'Offline install unsupported';
      indicator.classList.add('warning');
      return;
    }
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        indicator.textContent = navigator.onLine ? 'Offline ready ✓' : 'Offline mode ✓';
        indicator.classList.add('ready');
        indicator.classList.remove('warning');
      })
      .catch((error) => {
        console.warn('Offline installation unavailable:', error);
        indicator.textContent = 'Offline not ready — check setup';
        indicator.classList.add('warning');
      });
    window.addEventListener('online', () => {
      if (indicator.classList.contains('ready')) indicator.textContent = 'Offline ready ✓';
    });
    window.addEventListener('offline', () => {
      if (indicator.classList.contains('ready')) indicator.textContent = 'Offline mode ✓';
    });
  }

  function init() {
    for (const name of elementIds) els[name] = id(name);
    for (const name of DRONES) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      els.droneSelect.appendChild(option);
    }
    data = readData();
    els.observerId.value = data.observerId || '';
    els.droneSelect.value = DRONES.includes(data.selectedDrone) ? data.selectedDrone : DRONES[0];
    els.flightNumber.value = String(nextFlightNumber(els.droneSelect.value));
    render();

    els.startRun.addEventListener('click', startRun);
    els.visibleButton.addEventListener('click', () => recordVisibility('VISIBLE'));
    els.lostButton.addEventListener('click', () => recordVisibility('NOT_VISIBLE'));
    els.undoButton.addEventListener('click', undoLast);
    els.endRun.addEventListener('click', endRun);
    els.downloadCsv.addEventListener('click', downloadCsv);
    els.shareCsv.addEventListener('click', shareCsv);
    els.clearAll.addEventListener('click', eraseEverything);
    els.droneSelect.addEventListener('change', changeDrone);
    els.observerId.addEventListener('change', () => {
      if (data.activeRunId) return;
      commit((next) => { next.observerId = els.observerId.value.trim(); });
    });
    registerOffline();
    setInterval(updateTimer, 300);
  }

  init();
})();
