DRONE VISIBILITY — OFFLINE FIELD OBSERVER LOGGER
Release: 2026-10-13 (version 1.0)

Included drones (13):
M3E, M300, M3TD, M400, FPV, AVATA, Mini 4 Pro, Mavic 2 Pro,
Flip, Neo, Tello, T30, FlyCart 30.

WHAT IT DOES
- Each observer uses their own iPhone or Android phone.
- Enter observer ID, select drone, and choose flight/pass number.
- Tap "Start flight log" at the common pilot's start cue.
- Tap green "DRONE IN VIEW" or red "NOT IN VIEW" every time visibility changes,
  including on the inbound leg. Multiple reacquisitions are supported.
- Every tap is saved immediately on THAT PHONE, not on the web server.
- Export records from all flights as a CSV with UTC ISO timestamps, Unix
  milliseconds, elapsed time from that flight's start, observer/drone/flight
  labels, and run and event IDs.
- Undo does not silently delete a record: the event remains in the CSV with
  the "voided" column set TRUE for an auditable record.
- No internet is needed after the app is correctly installed/cached.


IMPORTANT PHONE SETUP (DO THIS BEFORE THE FIELD DAY)
1. Connect to good internet, open the HTTPS app URL.
2. iPhone: open in SAFARI, Share > Add to Home Screen > Add.
   Android: open in CHROME, menu > Install app or Add to Home Screen.
3. LAUNCH IT FROM ITS NEW HOME-SCREEN ICON while still connected.
   Wait until the top badge says "Offline ready".
4. Turn on Airplane Mode and test the installed icon. Enter a TEST observer,
   start a flight, tap green and red, end, and try Save/Share or Download CSV.
   Confirm the saved file actually exists. Turn Airplane Mode back off.
5. Erase test data via Instructions & data management > Erase locally
   saved data. The erasure requires typing DELETE. Ensure real data has
   been exported before clearing anything.
6. Keep the installed app on the phone. Do not clear site storage; do not
   use Safari Private or Chrome Incognito for collecting real data.
7. Check "Set Automatically" under the phone's date/time settings.

ON EXPERIMENT DAY
- Agree on a pilot start cue; press Start flight log at that cue.
- The observer should NOT announce visibility changes.
- Tap IN VIEW as soon as visual contact is gained, and NOT IN VIEW when
  it is lost. Repeat for loss and reacquisition on the outbound/return leg.
- The buttons remain available when offline. Phone screen lock/relaunch
  does not erase prior taps, but test this on each device beforehand.
- End the log between drones/flights. For repeated flights, the app
  suggests the next flight number; verify it before starting.
- Export CSV at lunch/end of day, and verify the actual file saved before
  deleting anything. Email/shared delivery can happen later with internet.

CSV FIELD NOTES
- event_type = RUN_START / VISIBLE / NOT_VISIBLE / RUN_END.
- visibility_state = in_view / not_in_view for observed transitions.
- event_utc_iso uses the PHONE'S CLOCK in UTC with millisecond precision.
- event_unix_ms is numerical and often easiest for matching telemetry.
- elapsed_ms_since_run_start is elapsed wall-clock milliseconds since
  that observer hit "Start flight log". Start cue reaction time differs.
- There is NO AUTOMATIC CLOCK SYNCHRONIZATION between separate phones
  or drone telemetry! Keep all devices on automatic network time and
  document any offsets; use the shared start cue as another reference.
- Rows marked voided TRUE are kept for audit but should be excluded
  from scientific visibility threshold analysis.
- RUN_START and RUN_END rows should not be treated as visibility events.

SAFETY AND METHODS
- Agree on the operational definition of "visible" in advance (e.g.,
  visually maintaining aircraft position/orientation sufficient for the
  purpose of the study; distinguish from merely detecting a tiny dot).
- Follow required pilot and observer operational rules and authorizations.
  This app does not establish a legal VLOS/BVLOS operating privilege.
- We recommend a short test on BOTH an iPhone and Android and a flight
  log-to-telemetry alignment check before collecting primary data.

PRIVACY
This app contains no analytics and transmits no observations to the host.
Only the static code downloads from the website. Records remain solely
in local browser/app storage on each participant's device until exported.
