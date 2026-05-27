import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventStream, pushStream } from '../src/index';

describe('EventStream Core Lifecycle & Lazy Execution', () => {
  it('should be lazy and not activate until listen is called', () => {
    let activated = false;
    const stream = new EventStream<number>((listener) => {
      activated = true;
      return { cancel() {} };
    });

    expect(activated).toBe(false);

    const controller = stream.listen(() => {});
    expect(activated).toBe(true);
    controller.cancel();
  });

  it('should support addListener, start, and listen interchangeably', () => {
    const emitted: number[] = [];
    const stream = new EventStream<number>((listener) => {
      listener(1);
      return { cancel() {} };
    });

    const c1 = stream.listen((x) => emitted.push(x));
    const c2 = stream.addListener((x) => emitted.push(x));
    const c3 = stream.start((x) => emitted.push(x));

    expect(emitted).toEqual([1, 1, 1]);
    c1.cancel();
    c2.cancel();
    c3.cancel();
  });

  it('should cancel subscription correctly and stop emitting', () => {
    let cancelled = false;
    const [push, stream] = pushStream<number>();

    const emitted: number[] = [];
    const controller = stream.listen((x) => emitted.push(x));

    push(1);
    expect(emitted).toEqual([1]);

    controller.cancel();
    push(2);
    expect(emitted).toEqual([1]);
  });

  it('should be immutable and return new streams for operators', () => {
    const stream = new EventStream<number>((l) => ({ cancel() {} }));
    const mapped = stream.map((x) => x * 2);
    expect(mapped).toBeInstanceOf(EventStream);
    expect(mapped).not.toBe(stream);
  });
});

describe('EventStream Core Operators', () => {
  it('should map values correctly', () => {
    const [push, stream] = pushStream<number>();
    const mapped = stream.map((x) => x * 10);
    const emitted: number[] = [];
    const c = mapped.listen((x) => emitted.push(x));

    push(1);
    push(2);
    expect(emitted).toEqual([10, 20]);
    c.cancel();
  });

  it('should filter values correctly', () => {
    const [push, stream] = pushStream<number>();
    const filtered = stream.filter((x) => x % 2 === 0);
    const emitted: number[] = [];
    const c = filtered.listen((x) => emitted.push(x));

    push(1);
    push(2);
    push(3);
    push(4);
    expect(emitted).toEqual([2, 4]);
    c.cancel();
  });

  it('should flatMap values correctly', () => {
    const [push, stream] = pushStream<number>();
    const flatMapped = stream.flatMap((x) => [x, x * 10]);
    const emitted: number[] = [];
    const c = flatMapped.listen((x) => emitted.push(x));

    push(1);
    push(2);
    expect(emitted).toEqual([1, 10, 2, 20]);
    c.cancel();
  });

  it('should drop correct number of elements', () => {
    const [push, stream] = pushStream<number>();
    const dropped = stream.drop(2);
    const emitted: number[] = [];
    const c = dropped.listen((x) => emitted.push(x));

    push(1);
    push(2);
    push(3);
    push(4);
    expect(emitted).toEqual([3, 4]);
    c.cancel();
  });

  it('should take correct number of elements and cancel', () => {
    let cancelled = false;
    const stream = new EventStream<number>((listener) => {
      listener(1);
      listener(2);
      listener(3);
      listener(4);
      return {
        cancel() {
          cancelled = true;
        },
      };
    });

    const emitted: number[] = [];
    const c = stream.take(2).listen((x) => emitted.push(x));

    expect(emitted).toEqual([1, 2]);
    // The take operator should cancel the stream once limit is reached
    expect(cancelled).toBe(true);
    c.cancel();
  });

  it('should slice elements correctly', () => {
    const [push, stream] = pushStream<number>();
    const sliced = stream.slice(1, 4); // should take first 4, then drop first 1 -> elements 1, 2, 3 (0-indexed: index 1, 2, 3)
    const emitted: number[] = [];
    const c = sliced.listen((x) => emitted.push(x));

    push(10); // index 0 (dropped)
    push(20); // index 1 (kept)
    push(30); // index 2 (kept)
    push(40); // index 3 (kept)
    push(50); // index 4 (not taken)
    expect(emitted).toEqual([20, 30, 40]);
    c.cancel();
  });

  it('should takeWhile correct elements and cancel', () => {
    let cancelled = false;
    const stream = new EventStream<number>((listener) => {
      listener(1);
      listener(2);
      listener(3);
      listener(4);
      return {
        cancel() {
          cancelled = true;
        },
      };
    });

    const emitted: number[] = [];
    const c = stream.takeWhile((x) => x < 3).listen((x) => emitted.push(x));

    expect(emitted).toEqual([1, 2]);
    expect(cancelled).toBe(true);
    c.cancel();
  });

  it('should dropWhile correct elements', () => {
    const [push, stream] = pushStream<number>();
    const dropped = stream.dropWhile((x) => x < 3);
    const emitted: number[] = [];
    const c = dropped.listen((x) => emitted.push(x));

    push(1);
    push(2);
    push(3);
    push(1); // Should not be dropped since dropping has stopped
    push(4);
    expect(emitted).toEqual([3, 1, 4]);
    c.cancel();
  });

  it('should emit constant values correctly', () => {
    const [push, stream] = pushStream<number>();
    const constantStream = stream.constant('hello');
    const emitted: string[] = [];
    const c = constantStream.listen((x) => emitted.push(x));

    push(1);
    push(2);
    expect(emitted).toEqual(['hello', 'hello']);
    c.cancel();
  });
});

describe('EventStream Splitting & Merging', () => {
  it('should split2 correctly', () => {
    const [push, stream] = pushStream<number>();
    const [s0, s1] = stream.split2((x) => (x % 2 === 0 ? 0 : 1));

    const emitted0: number[] = [];
    const emitted1: number[] = [];
    const c0 = s0.listen((x) => emitted0.push(x));
    const c1 = s1.listen((x) => emitted1.push(x));

    push(1);
    push(2);
    push(3);
    push(4);

    expect(emitted0).toEqual([2, 4]);
    expect(emitted1).toEqual([1, 3]);

    c0.cancel();
    c1.cancel();
  });

  it('should split3 correctly', () => {
    const [push, stream] = pushStream<number>();
    const [s0, s1, s2] = stream.split3((x) => (x % 3 === 0 ? 0 : x % 3 === 1 ? 1 : 2));

    const emitted0: number[] = [];
    const emitted1: number[] = [];
    const emitted2: number[] = [];
    const c0 = s0.listen((x) => emitted0.push(x));
    const c1 = s1.listen((x) => emitted1.push(x));
    const c2 = s2.listen((x) => emitted2.push(x));

    push(3);
    push(4);
    push(5);

    expect(emitted0).toEqual([3]);
    expect(emitted1).toEqual([4]);
    expect(emitted2).toEqual([5]);

    c0.cancel();
    c1.cancel();
    c2.cancel();
  });

  it('should splitN correctly', () => {
    const [push, stream] = pushStream<number>();
    const streams = stream.splitN(4, (x) => x % 4);

    const emitted: number[][] = [[], [], [], []];
    const controllers = streams.map((s, idx) => s.listen((x) => emitted[idx].push(x)));

    push(0);
    push(1);
    push(2);
    push(3);
    push(4);
    push(5);

    expect(emitted[0]).toEqual([0, 4]);
    expect(emitted[1]).toEqual([1, 5]);
    expect(emitted[2]).toEqual([2]);
    expect(emitted[3]).toEqual([3]);

    controllers.forEach((c) => c.cancel());
  });

  it('should mergeWith another stream correctly', () => {
    const [push1, stream1] = pushStream<number>();
    const [push2, stream2] = pushStream<string>();

    const merged = stream1.mergeWith(stream2);
    const emitted: (number | string)[] = [];
    const c = merged.listen((x) => emitted.push(x));

    push1(1);
    push2('two');
    push1(3);

    expect(emitted).toEqual([1, 'two', 3]);
    c.cancel();
  });

  it('should static merge multiple streams correctly', () => {
    const [push1, stream1] = pushStream<number>();
    const [push2, stream2] = pushStream<number>();
    const [push3, stream3] = pushStream<number>();

    const merged = EventStream.merge(stream1, stream2, stream3);
    const emitted: number[] = [];
    const c = merged.listen((x) => emitted.push(x));

    push1(1);
    push2(2);
    push3(3);

    expect(emitted).toEqual([1, 2, 3]);
    c.cancel();
  });

  it('should return EventStream.empty when merging zero streams', () => {
    const merged = EventStream.merge();
    expect(merged).toBe(EventStream.empty);
  });
});

describe('EventStream Advanced Stateful Operators', () => {
  it('should run forEach side effects', () => {
    const [push, stream] = pushStream<number>();
    const sideEffects: number[] = [];
    const forEachStream = stream.forEach((x) => sideEffects.push(x * 2));

    const emitted: number[] = [];
    const c = forEachStream.listen((x) => emitted.push(x));

    push(1);
    push(2);

    expect(sideEffects).toEqual([2, 4]);
    expect(emitted).toEqual([1, 2]);
    c.cancel();
  });

  it('should process values using state generators', () => {
    const [push, stream] = pushStream<number>();
    // yield value `state` times, then return `value` as next state
    const processed = stream.process(function*(state, value) {
      for (let i = 0; i < state; i++) {
        yield value;
      }
      return value;
    }, 1);

    const emitted: number[] = [];
    const c = processed.listen((x) => emitted.push(x));

    push(5); // state starts at 1, emits 5 once, next state is 5
    push(10); // state is 5, emits 10 five times, next state is 10
    expect(emitted).toEqual([5, 10, 10, 10, 10, 10]);
    c.cancel();
  });

  it('should process0 without state correctly', () => {
    const [push, stream] = pushStream<number>();
    const processed = stream.process0(function*(value) {
      yield value;
      yield value + 1;
    });

    const emitted: number[] = [];
    const c = processed.listen((x) => emitted.push(x));

    push(5);
    expect(emitted).toEqual([5, 6]);
    c.cancel();
  });

  it('should scan values correctly', () => {
    const [push, stream] = pushStream<number>();
    // running sum: accumulator = sum, value = next element, returns [newSum, newSum]
    const scanned = stream.scan<number, number>((acc, val) => {
      const next = acc + val;
      return [next, next];
    }, 0);

    const emitted: number[] = [];
    const c = scanned.listen((x) => emitted.push(x));

    push(1);
    push(2);
    push(3);
    expect(emitted).toEqual([1, 3, 6]);
    c.cancel();
  });

  it('should flatScan values correctly', () => {
    const [push, stream] = pushStream<number>();
    const flatScanned = stream.flatScan<number, number>((acc, val) => {
      const next = acc + val;
      return [next, [next, next * 2]];
    }, 0);

    const emitted: number[] = [];
    const c = flatScanned.listen((x) => emitted.push(x));

    push(1);
    push(2);
    expect(emitted).toEqual([1, 2, 3, 6]);
    c.cancel();
  });

  it('should enumerate values with index', () => {
    const [push, stream] = pushStream<string>();
    const enumerated = stream.enumerate();

    const emitted: [string, number][] = [];
    const c = enumerated.listen((x) => emitted.push(x));

    push('a');
    push('b');
    push('c');

    expect(emitted).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
    c.cancel();
  });
});

describe('EventStream Asynchronous Operators & Fake Timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce events correctly', () => {
    const [push, stream] = pushStream<number>();
    const debounced = stream.debounce(100);

    const emitted: number[] = [];
    const c = debounced.listen((x) => emitted.push(x));

    push(1);
    vi.advanceTimersByTime(50);
    push(2);
    vi.advanceTimersByTime(50);
    expect(emitted).toEqual([]); // not debounced yet since only 50ms elapsed since 2

    vi.advanceTimersByTime(50); // now 100ms since 2
    expect(emitted).toEqual([2]);

    push(3);
    vi.advanceTimersByTime(100);
    expect(emitted).toEqual([2, 3]);

    c.cancel();
  });

  it('should support fromInterval correctly', () => {
    const stream = EventStream.fromInterval(1000);
    const emitted: number[] = [];
    const c = stream.listen((x) => emitted.push(x));

    expect(emitted).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(emitted).toEqual([0]);
    vi.advanceTimersByTime(2000);
    expect(emitted).toEqual([0, 1, 2]);

    c.cancel();
  });

  it('should support fromFrequency correctly', () => {
    const stream = EventStream.fromFrequency(10); // 10Hz -> 100ms
    const emitted: number[] = [];
    const c = stream.listen((x) => emitted.push(x));

    vi.advanceTimersByTime(100);
    expect(emitted).toEqual([0]);
    vi.advanceTimersByTime(100);
    expect(emitted).toEqual([0, 1]);

    c.cancel();
  });

  it('should support fromRequestAnimationFrame if available', () => {
    const originalRAF = globalThis.requestAnimationFrame;
    const originalCAF = globalThis.cancelAnimationFrame;

    let rafCallback: ((time: number) => void) | null = null;
    let nextId = 1;
    const mockRAF = vi.fn().mockImplementation((cb: (time: number) => void) => {
      rafCallback = cb;
      return nextId++;
    });
    const mockCAF = vi.fn();

    globalThis.requestAnimationFrame = mockRAF;
    globalThis.cancelAnimationFrame = mockCAF;

    try {
      const stream = EventStream.fromRequestAnimationFrame();
      const emitted: number[] = [];
      const c = stream.listen((x) => emitted.push(x));

      expect(mockRAF).toHaveBeenCalled();
      if (rafCallback) {
        (rafCallback as (time: number) => void)(100);
      }

      expect(emitted).toEqual([100]);
      c.cancel();
      expect(mockCAF).toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCAF;
    }
  });

  it('should support animationFrame helper', () => {
    const originalRAF = globalThis.requestAnimationFrame;
    const originalCAF = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = vi.fn().mockReturnValue(123);
    globalThis.cancelAnimationFrame = vi.fn();

    try {
      const stream = EventStream.animationFrame();
      const c = stream.listen(() => {});
      c.cancel();
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(123);
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCAF;
    }
  });

  it('should throw error for requestAnimationFrame if undefined', () => {
    const originalRAF = globalThis.requestAnimationFrame;
    // @ts-expect-error - testing environment where RAF is not defined
    delete globalThis.requestAnimationFrame;

    try {
      expect(() => EventStream.fromRequestAnimationFrame()).toThrow();
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
    }
  });
});

describe('EventStream Event Target integration', () => {
  it('should attach and detach listeners from EventTarget correctly', () => {
    const mockElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as EventTarget;

    const stream = EventStream.fromEventTarget(mockElement, 'click');
    expect(mockElement.addEventListener).not.toHaveBeenCalled();

    const c = stream.listen(() => {});
    expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

    c.cancel();
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
});
