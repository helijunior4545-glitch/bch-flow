# Unified catalog software creation and preview media

The existing catalog drawer now creates a software product, initial immutable ZIP
release and receiving offer in one submission. The visual shell, ordering,
archive/pin actions, existing publish/add-payment-method buttons and wallet product
modal remain in place. Only the catalog UI points to the new software endpoint;
the original product API remains compatible with wallet product references.

## Creation and editing

A new software requires a name, positive price, live receiving account from the
same organization, ZIP/version, requirements and license. Currency comes from
the validated receiving account; callers cannot override it. Existing ZIP safety,
README/LICENSE requirements, checksum and private archive storage are reused.
The writer rechecks and locks the account before publishing the records. No
network upload is performed while holding tenant/account database locks. Storage
failures produce no partial product/release/offer; uploaded files are cleaned up
on a best-effort basis if a later write fails. Storage cleanup failures are logged
without revealing file paths or purchase tokens.

The single media picker accepts an image OR an MP4 video, not both. Saving a
replacement clears the other field and deletes the prior stored asset only after
a successful database commit. Cancellation and upload/transaction failures retain
the old media. The same drawer exposes ZIP upload while editing: attach a ZIP,
enter a fresh version, requirements, license and receiving account to publish a
new immutable release and offer. Leaving ZIP empty edits only catalog metadata.
Existing purchased releases and payment offers are not overwritten. The separate
Publish software buttons remain available.

## Media

Images retain the existing 5 MB PNG/JPEG/WebP limit and uncropped card layout.
Promotional videos accept MP4 files up to 20 MB, checked by extension, size and
MP4 signature. Promotional videos are now normalized into a silent H.264 MP4 preview with
fast-start metadata. The browser gracefully falls back to the branded placeholder
if playback fails. Videos are public promotional assets, never paid download packages.

The video storage uses `STORAGES['catalog_video']` when configured. Otherwise,
Cloudinary deployments use `VideoMediaCloudinaryStorage`; local deployments use
the default storage. This stays separate from authenticated ZIP storage.

The public video route checks that a live public offer exists before serving the
asset. Local videos support byte ranges. Public Cloudinary images/videos redirect
to the provider CDN after the availability check, avoiding media downloads inside
Django workers. Local image signatures and extensionless storage support remain. Card media URLs
include the product update timestamp so replacements do not reuse stale redirects.

Card video sources are assigned only while visible (at least 50% of the video),
not in a background tab or an inactive carousel page. Playback is muted, inline
and looping, with a 44px pause/play control. Reduced motion and data-saving mode
suppress automatic loading/playback; explicit play remains available. Offscreen
videos pause. Image products load their images lazily; video products retain the branded
placeholder until decoding starts, without eagerly downloading every video. No-JavaScript visitors retain the image and links.
First-party promotional uploads do not require optional third-party-player consent.

## Performance findings and limits

- Catalog row rendering previously filtered the entire product list for every
  row. Group/index maps replace those quadratic lookups. A local Node benchmark
  with 5,000 synthetic rows measured 474.5 ms for the old group lookups versus
  1.6 ms for the maps; this excludes DOM rendering and is not a phone benchmark.
- Dynamic catalog icons now process only fresh placeholders, avoiding repeated
  replacement of every Lucide SVG across the page.
- Public image lookup selects the storage name rather than fetching entire
  offers/releases/licenses. Cloudinary public assets no longer pass through a
  server-side download before being delivered to the visitor.
- The storefront defers license, requirements and release-note text, which the
  collection does not render. Video loading adds no timers or polling.
- Async drawer submissions now release their busy state after completion.

A request to the production site was blocked by this environment's proxy (403),
so production CPU, request latency, database contention and provider delays could
not be attributed to a specific cause. Local empty-catalog profiling gave a median
17.2 ms total / 1.5 ms SQL / 2 queries over three runs. This is an empty development
database, not a production performance claim.

To measure catalog DB/template time on the actual Coolify application container:

```sh
python manage.py bchflow_catalog_profile --runs 3
```

This is read-only and prints timing/counts, not identities or credentials. It
excludes proxy/CDN/network, video decoding and authenticated wallet/provider calls.
Compare these timings with actual slow request/proxy logs before attributing
whole-app slowness to the catalog.

## Tests and deployment

Validation includes tenant/role/CSRF boundaries, invalid upload rollback, file
cleanup, account/currency validation, legacy wallet product creation, range
requests, archived media hiding, reduced query columns, mobile unified creation,
real MP4 playback/manual pause/reduced motion/offscreen pause, metadata edits,
existing public collection behavior and paid guest/account downloads.

The host configuration run had two environment-dependent failures: an assertion
for English validation text under Portuguese settings, and a CSRF 403 assertion
against the host's redirecting failure view. All 77 checks passed with
English and Django's default CSRF failure view, without changing host settings.
A storefront test positioning step was moved before keyboard navigation so the
automation does not interrupt the browser's native smooth scroll. The application
carousel implementation was not changed.

**Migration required:** `0007_merchantproduct_video` adds an optional video field.
Apply it before starting code that reads this field, then collect static assets:

```sh
python manage.py migrate app_merchant_catalog
python manage.py collectstatic --noinput
```

Reload the application after deployment. Ensure the proxy accepts the combined
ZIP/image/video upload size (up to approximately 125 MB plus multipart overhead),
and that the chosen media/archive storage is persistent. No public tracking,
private payment logic, wallet modal or existing paid artifacts were changed.

## Shared media picker and HTTP 520 diagnostics

The standard Cloudinary adapter previously had unbounded provider calls, and the
metadata update endpoint did not convert video storage errors into JSON. Image,
video and authenticated ZIP upload calls now use a per-request provider budget
(default 20 seconds, `FLOW_CATALOG_UPLOAD_TIMEOUT_SECONDS`). Provider errors return
503 JSON and preserve existing assets; malformed media is rejected as 400. Budget
settings must stay below the configured worker/proxy timeout with enough margin
for parsing, ZIP validation and cleanup. This does not bound client-to-server
request-body transfer time or replace proxy upload limits. Old Cloudinary preview
deletion has a separate two-second timeout and commit callbacks log cleanup errors.

Each update/create attempt logs `catalog_upload_started` and
`catalog_upload_finished`, including a random trace, action, status and elapsed
milliseconds. Responses include `X-BCH-Upload-ID`. No file contents, credentials,
customer email or private purchase tokens are logged by these additions. A 520
from the proxy now has a specific client message and exposes the available
`cf-ray` reference. The actual production 520 cannot be attributed solely from
that HTTP status; correlate these logs with Coolify worker exits, memory limits,
proxy limits and Cloudinary errors. No production infrastructure settings were
changed or verified from this workspace.

The replacement tests cover both directions of media swaps and deletion, failure
rollback, conflicting media rejection, ZIP version publication from the same
edit endpoint, duplicate-version cleanup, private preview authorization and
provider timeout options. This follow-up adds no migration; the existing
`0007_merchantproduct_video` must already be applied. Deploy templates, collect
static files and restart the application.

## Automatic conversion (preview only)

The shared picker warns before processing: keep only the beginning, at most 20
seconds, remove audio and limit resolution. Browser-native Canvas/MediaRecorder
first compresses compatible local files (up to 100 MB) before upload, with a
900 kbps target and 4 MB output cap. No WASM downloads or external conversion
service are used. The UI keeps Save disabled while processing and reports the
conversion. If native conversion is unavailable, files up to 20 MB may be sent to
the server for conversion; larger incompatible files are rejected before upload.
Cancellation aborts local processing and does not delete existing stored media.

The server always validates/transcodes video submissions, including API calls:
MP4/MOV/WebM inputs up to 20 MB; first 20 seconds; no audio; maximum 960 × 540
without upscaling; 24 fps; H.264/yuv420p; stripped metadata and fast-start MP4.
Output is capped at 4 MB. Encoding uses one thread and a subprocess timeout of at
most 12 seconds within the upload budget. Input demuxers and protocols are
restricted; FFmpeg runs without a shell. Conversion errors preserve existing
assets. ZIP packages and original files on the user's device are not modified.

FFmpeg is already installed by the repository Dockerfile. It is now also listed
in nixpacks.toml. Nixpacks deployments require a rebuild to install it. Missing
FFmpeg returns a clear validation error, never an unprocessed video disguised as
a successful conversion. Tests use a 22-second video with audio to verify the
actual output duration, H.264 codec, resolution, size and absence of audio.
Conversion notices are translated into the app's supported languages. This
reduces common upload payloads but does not establish the root cause of the
reported production 520 without origin/proxy logs.
