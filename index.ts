export interface ProfilerFrame {
  /** A function instance name. */
  readonly name: string;
  /** Index in the trace.resources array. */
  readonly resourceId?: number;
  /** 1-based index of the line. */
  readonly line?: number;
  /** 1-based index of the column. */
  readonly column?: number;
}

export interface ProfilerStack {
  /** Index in the trace.stacks array. */
  readonly parentId?: number;
  /** Index in the trace.frames array. */
  readonly frameId: number;
}

export interface ProfilerSample {
  /** High resolution time relative to the profiling session's time origin. */
  readonly timestamp: number;
  /** Index in the trace.stacks array. */
  readonly stackId?: number;
}

export type ProfilerResource = string;

export interface ProfilerTrace {
  /** An array of profiler resources. */
  readonly resources: ProfilerResource[];
  /** An array of profiler frames. */
  readonly frames: ProfilerFrame[];
  /** An array of profiler stacks. */
  readonly stacks: ProfilerStack[];
  /** An array of profiler samples. */
  readonly samples: ProfilerSample[];
}

export interface ProfilerInitOptions {
  /** Sample interval in ms. */
  readonly sampleInterval: number;
  /** Max buffer size in number of samples. */
  readonly maxBufferSize: number;
}

export interface Profiler extends EventTarget {
  /** Sample interval in ms. */
  readonly sampleInterval: number;
  /** True if profiler is stopped. */
  readonly stopped: boolean;

  new (options: ProfilerInitOptions): Profiler;
  stop(): Promise<ProfilerTrace>;

  addEventListener<K extends keyof ProfilerEventMap>(
    type: K,
    listener: (this: Window, ev: ProfilerEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof ProfilerEventMap>(
    type: K,
    listener: (this: Window, ev: ProfilerEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

interface ProfilerEventMap {
  samplebufferfull: SampleBufferFullEvent;
}

interface SampleBufferFullEvent extends Event {
  readonly target: Profiler;
}

export interface ContinuousProfilerTrace extends ProfilerTrace {
  /** Timestamp in milliseconds when profiler trace started. */
  readonly start: number;
  /** Timestamp in milliseconds when profiler trace ended. */
  readonly end: number;
}

interface ContinuousProfilerInitOptions {
  /** Sample interval in milliseconds. */
  sampleInterval?: number;
  /** Collect interval in milliseconds. */
  collectInterval?: number;
}

interface ContinuousProfilerOptions {
  /** Sample interval in milliseconds. */
  readonly sampleInterval: number;
  /** Collect interval in milliseconds. */
  readonly collectInterval: number;
  /** Max buffer size in number of samples. */
  readonly maxBufferSize: number;
}

interface ContinuousProfilerSession {
  readonly profiler: Profiler;
  readonly start: number;
  readonly timeoutId: number;
}

const Profiler: Profiler | undefined = (globalThis as any).Profiler;

/**
 * Profiler that collects data continuously. Uses [JS Self-Profiling API](https://wicg.github.io/js-self-profiling/).
 */
export class ContinuousProfiler {
  private session: ContinuousProfilerSession | undefined;
  private readonly options: ContinuousProfilerOptions;

  /**
   * @param callback Function to call after collecting a trace
   * @param options Optional options to specify how profiler should collect the data
   */
  constructor(
    private readonly callback: (trace: ContinuousProfilerTrace) => void,
    options: ContinuousProfilerInitOptions
  ) {
    const sampleInterval = (options && options.sampleInterval) || 10;
    const collectInterval = (options && options.collectInterval) || 10000;
    this.options = {
      sampleInterval,
      collectInterval,
      maxBufferSize: Math.round((collectInterval * 1.5) / sampleInterval),
    };
  }

  /**
   * True if profiler is supported in the current environment.
   */
  get supported(): boolean {
    return Profiler !== undefined;
  }

  /**
   * True if profiler session is stopped.
   */
  get stopped(): boolean {
    return this.session === undefined;
  }

  /**
   * Starts profiler session.
   * @returns void
   */
  start(): void {
    if (!Profiler) {
      throw new Error("Profiler is not supported.");
    }

    if (this.session) {
      return;
    }

    this.session = {
      start: performance.now(),
      profiler: new Profiler({
        sampleInterval: this.options.sampleInterval,
        maxBufferSize: this.options.maxBufferSize,
      }),
      timeoutId: setTimeout(() => {
        this.stop(); // don't wait for stop to start next profiler
        this.start();
      }, this.options.collectInterval),
    };

    this.session.profiler.addEventListener("samplebufferfull", () => {
      this.stop(); // don't wait for stop to start next profiler
      this.start();
    });
  }

  /**
   * Stops current profiling session.
   * @returns Promise that resolves after collecting a trace.
   */
  stop(): Promise<void> {
    if (!this.session) {
      return Promise.resolve();
    }

    const start = this.session.start;
    const promise = this.session.profiler.stop().then((trace) => {
      const end = performance.now();
      this.callback(
        Object.assign(trace, {
          start: performance.timeOrigin + start,
          end: performance.timeOrigin + end,
        })
      );
    });
    clearTimeout(this.session.timeoutId);
    this.session = undefined;

    return promise;
  }
}
