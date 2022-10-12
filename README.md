# Continuous Profiler

It's a simple implementation of a continuous profiler that runs in a browser context. 
It facilitates the [JS Self-Profiling API](https://wicg.github.io/js-self-profiling).

The built-in JS profiler will run as long as it has space in the sample buffer.
In practice, this means that there is a limited duration that a single profiler can profile.
This package implement continuous profiler which manages multiple JS profiler instances to profile
user session without any duration limit.

## Prerequisites
At the time of writing this README, the JS Self-Profiling API is available in
[Chrome 94+, Edge 94+, and Opera 80+](https://caniuse.com/mdn-api_profiler) browsers.

It also requires `Document-Policy: js-profiling=true` HTTP header for the HTML document.

## Installation
This package is available on npm:
```shell
npm install continuous-profiler # for npm
yarn add continuous-profiler # for yarn
```

## Usage
Please, ensure that you set up the `Document-Policy` HTTP header.
To use the profiler, import it like a regular module and call the `.start()` method.

```typescript
import { ContinuousProfiler } from "continuous-profiler";

const profiler = new ContinuousProfiler(
    (trace) => {
        sendTrace(JSON.stringify(trace));
    },
    {
        sampleInterval: 10, // sample every 10ms
        collectInterval: 10000 // collect every 10s
    }
);
profiler.start();
window.addEventListener('unload', () => profiler.stop());
```

The first argument passed to the `ContinuousProfiler` constructor
is a callback that will be called every 10 seconds with a trace.

The second argument are options where you can specify sample and collect intervals.

## License
MIT