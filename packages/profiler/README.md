# @hyoretsu/profiler

Continuous CPU profiler for **Node.js and Bun** that pushes to **Grafana Pyroscope** (or writes pprof files),
and can **bind profiles to traces**: from a span in Tempo you open the flame graph of that exact span.

It samples through `node:inspector` (the Chrome DevTools `Profiler` domain), which both V8 (Node) and
JavaScriptCore (Bun) implement. There is no native addon and nothing Bun-only on the profiling path.

> Derived from [mewc/bun-profiler](https://github.com/mewc/bun-profiler) (MIT, see `LICENSE`). Heap
> profiling and heap snapshots are intentionally not ported: Bun does not implement the `HeapProfiler`
> domain, and a snapshot carries no allocation stacks.

## Quick start

```ts
import { startProfiling } from "@hyoretsu/profiler";

await using profiler = await startProfiling({ appName: "api" }); // flushes on scope exit
```

Or with no code at all (configuration comes from the environment):

```sh
PYROSCOPE_SERVER_ADDRESS=http://localhost:4040 bun --preload @hyoretsu/profiler/preload app.ts
PYROSCOPE_SERVER_ADDRESS=http://localhost:4040 node --import @hyoretsu/profiler/preload app.js
bunx @hyoretsu/profiler run --out ./profiles -- app.ts      # files only, no server
```

Without a destination (`pyroscopeUrl`, `PYROSCOPE_SERVER_ADDRESS` or an exporter), or with
`PROFILER_ENABLED=false`, `createProfiler()`/`startProfiling()` return a **disabled no-op handle** and never
throw, so the same code runs in every environment. Invalid configuration throws `ProfilerConfigError`.

## API

| Export                          | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `startProfiling(options?)`      | Create and start; resolves to a `ProfilerHandle`.                                                  |
| `createProfiler(options?)`      | Create without starting (`handle.start()` later).                                                  |
| `Profiler`                      | The class behind the handle, for manual control.                                                   |
| `handle.trackSpan(span)`        | Bind samples to a span until the returned function is called.                                      |
| `handle.tag(labels, fn)`        | Attach labels to samples taken during `fn`. Safe with concurrent calls; does not stop the sampler. |
| `handle.stats()`                | Counters and health (windows, samples, capture gap, exporters, tracing, memory).                   |
| `handle.stop()` / `await using` | Final flush, then stop.                                                                            |

Every option and result is a typed DTO (`ProfilerOptionsDTO`, `TraceSpanDTO`, `ProfileWindowDTO`,
`ProfilerStatsDTO`, ...), all exported from the root. Defaults: 10 ms sampling, 15 s upload, 2 retries,
2 pending windows per exporter, signal handlers on (flush on SIGTERM/SIGINT).

### Subpaths

- `@hyoretsu/profiler/preload`: side-effect entry (`--preload` / `--import`).
- `@hyoretsu/profiler/opentelemetry`: `createProfilerSpanProcessor`.
- `@hyoretsu/profiler/exporters`: Pyroscope, pprof file, callback and OTLP-profiles exporters.
- `@hyoretsu/profiler/pprof`: `encodePprof` / `decodePprof`.

## Environment variables

| Variable                                                                                                            | Meaning                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PYROSCOPE_SERVER_ADDRESS`                                                                                          | Pyroscope URL. Setting it turns profiling on.                                    |
| `PYROSCOPE_APPLICATION_NAME`                                                                                        | App name (falls back to `SERVICE_NAME`, `npm_package_name`, `app`).              |
| `PYROSCOPE_LABELS`                                                                                                  | `k=v,k2=v2` window-level labels (keep cardinality low).                          |
| `PYROSCOPE_PROFILING_INTERVAL` / `PYROSCOPE_UPLOAD_INTERVAL`                                                        | Sampling and upload intervals (`10ms`, `15s`).                                   |
| `PYROSCOPE_BASIC_AUTH_USER` / `PYROSCOPE_BASIC_AUTH_PASSWORD`                                                       | Basic auth (set both).                                                           |
| `PYROSCOPE_TENANT_ID`                                                                                               | `X-Scope-OrgID`.                                                                 |
| `PROFILER_ENABLED`                                                                                                  | `false` forces the no-op handle.                                                 |
| `PROFILER_AUTH_TOKEN`                                                                                               | Bearer token (mutually exclusive with basic auth).                               |
| `PROFILER_PYROSCOPE_FORMAT`                                                                                         | `pprof` (default) or `folded`.                                                   |
| `PROFILER_COMPRESS`                                                                                                 | Gzip folded bodies. Leave off: Pyroscope accepts them and may store nothing.     |
| `PROFILER_TRACING_ENABLED`, `PROFILER_MAX_TRACKED_SPANS`, `PROFILER_MAX_SPAN_AGE`, `PROFILER_MAX_SAMPLE_LABEL_SETS` | Trace attribution switches and bounds.                                           |
| `PROFILER_WALL_TIME_ENABLED`                                                                                        | Also export wall-time (folded) profiles.                                         |
| `PROFILER_SOURCE_MAPS_ENABLED`, `PROFILER_SOURCE_MAP_CACHE_SIZE`                                                    | Resolve frames through source maps (bundled JS only).                            |
| `PROFILER_ADAPTIVE_ENABLED`, `PROFILER_ADAPTIVE_BUSY_INTERVAL`, `PROFILER_ADAPTIVE_IDLE_INTERVAL`                   | Adaptive sampling.                                                               |
| `PROFILER_MAX_RETRIES`, `PROFILER_MAX_PENDING_WINDOWS`, `PROFILER_SHUTDOWN_TIMEOUT`, `PROFILER_EXPORT_TIMEOUT`      | Delivery bounds.                                                                 |
| `PROFILER_SIGNAL_HANDLERS`, `PROFILER_DEBUG`                                                                        | Signal flush, diagnostics.                                                       |
| `PROFILER_OUTPUT_DIR`, `PROFILER_OUTPUT_FORMAT`                                                                     | Write files (`pprof`, `cpuprofile`, `speedscope`) instead of or besides pushing. |

## Linking profiles to traces

```ts
import { startProfiling } from "@hyoretsu/profiler";
import { createProfilerSpanProcessor } from "@hyoretsu/profiler/opentelemetry";

const profiler = await startProfiling({ appName: "api" });
// Add to your tracer provider's span processors. Structural types: no OpenTelemetry import in this package.
const processor = createProfilerSpanProcessor(profiler);
```

The processor tracks root and `SERVER` spans by default, copies `http.route` into a `route` label and sets the
span attribute `pyroscope.profile.id` to the span id, which is what Grafana uses to jump from a Tempo span to
the Pyroscope span profile. Without OpenTelemetry, call `profiler.trackSpan({ traceId, spanId, labels })`.

**How attribution works.** Each CDP sample has a timestamp. A sample is matched with the tracked spans that
were active at that instant: exactly one active span adds `span_id`, `trace_id` and its labels; several active
spans add only the labels that are identical across all of them (for example the same `route`), never ids; none
adds nothing. A single-threaded CPU sampler cannot know which of several concurrent requests owns a sample, so
this is an **approximation**: exact when requests do not overlap, labels-only otherwise. Per-sample labels
exist only in pprof, which is therefore the default format (`folded` ignores them).

Bounds: `maxTrackedSpans` (10 000), `maxSpanAgeMs` (open spans force-closed after 5 min) and
`maxSampleLabelSets` (2 000 label sets per window).

## Exporters

```ts
import { callbackExporter, pprofFileExporter, pyroscopeExporter } from "@hyoretsu/profiler/exporters";

await startProfiling({
	exporters: [
		pyroscopeExporter({ url: "https://pyroscope.example.com", tenantId: "acme" }),
		pprofFileExporter({ directory: "./profiles", format: "speedscope" }),
		callbackExporter(async window => {
			/* your own sink */
		}),
	],
});
```

Each exporter has its own bounded queue with retries and jitter (4xx is not retried; `Retry-After` is honored)
and a shutdown deadline. `createPprofHandler()` serves a Go-style `/debug/pprof/profile` for pull setups, and
`otlpHttpProfilesExporter` is experimental. Writing your own: extend `ProfileExporter`.

## Verification

What has actually been run:

- **Unit and end-to-end tests:** 135 tests in 13 files under `bun test`. They cover config, conversion, the pprof
  encoder/decoder (including per-sample labels), the span tracker, exporters against a local fake server and a
  real `Profiler` under Bun.
- **Node:** `bun run build` then `bun run test:node` (a smoke script against the built package, ESM and CJS) on
  Node 24, including the OpenTelemetry processor, the CLI and the preload.
- **Real Pyroscope (v2, local container):** `pprof` profiles from Bun were ingested; `route` is queryable
  (`LabelNames`/`LabelValues`) and filters flame graphs with readable frames; `SelectMergeSpanProfile` with a
  span id returned that span's flame graph. `span_id` and `trace_id` are **not** listed by `LabelNames` on that
  version: they are only reachable through the span selector. `folded` ingests but carries no per-sample labels.

Not verified: the Grafana/Tempo link configuration, pull mode against a real Grafana Alloy, the OTLP profiles
exporter against a real collector, Windows and macOS.

### Overhead

**Not established.** `scripts/bench.mjs` compares profiler off, on without `trackSpan` and on with a
`trackSpan` per request, but the machine used was shared and noisy (load average 9 to 17; run ranges spanned
2x and some medians showed the profiler _faster_ than baseline), so no figure is published. Run it on a quiet
machine before enabling tracing in a latency-sensitive service:

```sh
bun run build && BENCH_MODES=off,profile,on bun scripts/bench.mjs 9
BENCH_MODES=off,profile,on node scripts/bench.mjs 9
```

## Limitations

- Bun allows one inspector CPU sampler per process: only one isolate (main thread or one worker) is profiled.
- CPU and (opt-in) wall-time only; there is no heap or allocation profiling.
- Each window rotation has a brief capture gap (`stats().lastCaptureGapMs`).
- Wall-time profiles show how long the process was parked, not which call was waiting.
- Source maps apply to bundled JavaScript only.
- JavaScriptCore reports no `(idle)` samples; idle time is reconstructed from sampling gaps.

## Differences from bun-profiler

- Trace and route attribution (`trackSpan`, `ProfilerSpanProcessor`, per-sample pprof labels).
- `tag()` is a labeled time range instead of a sampler restart, so it is safe with concurrent calls.
- Runtime-agnostic and verified on Node as well as Bun; Bun-only `bun:jsc` stays a guarded, optional metric.
- `PROFILER_*` environment names (the standard `PYROSCOPE_*` names are kept); disabled no-op handle when
  unconfigured; `Symbol.asyncDispose`.
- DTO/model/implementation layout, `pprof` as the default wire format, exact wall-clock mapping on Node.
- No heap profiling or snapshots.

## License

MIT. Contains code derived from mewc/bun-profiler (MIT); see `LICENSE`.
