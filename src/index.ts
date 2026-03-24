export type Listener<T> = (payload: T) => void
export type CancelController = { cancel(): void} 
export type ExecutorFn<T> = (listener: (payload: T) => void) => CancelController

/**
 * **EventStream**
 * 
 * A referentially transparent and immutable object that can be used to start
 * listening for events (using `EventStream.listen()`).
 * 
 * An `EventStream` object essentially is a wrapper around
 * a function that takes a listener. Nothing actually happens
 * until you call `EventStream.listen()`. It is just a description
 * of what to do when a listener is given to it. The `EventStream`
 * object is never mutated as each method returns a new
 * `EventStream` object.
 * 
 * **Example**
 * 
 * ```typescript
 * // Create an EventStream that emits a random number every second
 * const stream = new EventStream<number>(listener => {
 *   const id = setInterval(() => listener(Math.random()), 1000)
 *   return { cancel() { clearInterval(id) } }
 * })
 * // Listen for events, logging each one to the console
 * const controller = stream.listen(console.log)
 * // After 5 seconds, stop listening for events
 * setTimeout(() => controller.cancel(), 5000)
 * ```
 */
export class EventStream<T> {
  private readonly _addListener: (listener: (payload: T) => void) => CancelController

  /**
   * **addListener**
   * 
   * (same as `listen()` and `start()`)
   * 
   * @param listener callback function to be connected the underlying event source
   * @returns a `CancelController` object that can be used to stop listening for events
   */
  addListener(listener: (payload: T) => void): CancelController {
    return this._addListener(listener)
  }
  /**
   * **start**
   * 
   * (same as `listen()` and `addListener()`)
   * 
   * @param listener callback function to be connected the underlying event source
   * @returns a `CancelController` object that can be used to stop listening for events
   */
  start(listener: (payload: T) => void): CancelController {
    return this._addListener(listener)
  }
  /**
   * **listen**
   * 
   * (same as `start()` and `addListener()`)
   * 
   * @param listener callback function to be connected the underlying event source
   * @returns a `CancelController` object that can be used to stop listening for events
   */
  listen(listener: (payload: T) => void): CancelController {
    return this._addListener(listener)
  }

  /**
   * @param addListener Function that will be called every time this EventStream has
   * a listener given to it. It is responsible for connecting listener functions to
   * the underlying event source and returning a `CancelController` that can be used
   * to later disconnent the given listener.
   */
  constructor(addListener: (listener: (payload: T) => void) => CancelController) {
    this._addListener = addListener
  }
  /**
   * **map**
   * 
   * Returns a new `EventStream` that will emit the result of applying
   * the given function to each value emitted by the original `EventStream`.
   */
  map<U>(f: (x: T) => U): EventStream<U> {
    return new EventStream(
      listenerU => {
        const listenerT: Listener<T> = t => listenerU(f(t))
        return this._addListener(listenerT)
      }
    )
  }
  /**
   * **flatMap**
   * 
   * Returns a new `EventStream` that will emit the values from the iterables
   * returned by applying the given function to each value emitted by the original
   * `EventStream`.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000).slice(1,4) // emits "1", "2", and "3" every second
   *  const flatMapped = stream.flatMap(x => [x, x*10]) // emits "1", "10", "2", "20", "3", and "30" every second
   *  flatMapped.listen(console.log)
   * ```
   */
  flatMap<U>(f: (x: T) => Iterable<U>): EventStream<U> {
    return new EventStream(
      listenerU => {
        const listenerT: Listener<T> = t => {
          for (const u of f(t)) {
            listenerU(u)
          }
        }
        return this._addListener(listenerT)
      }
    )
  }
  filter(f: (x: T) => boolean): EventStream<T>
  filter<S extends T>(f: (x: T) => x is S): EventStream<S>
  filter(f: any) {
    return new EventStream(
      filteredListener => {
        const listener: Listener<T> = t => {
          const ok = f(t)
          if (ok) filteredListener(t)
        }
        return this._addListener(listener)
      }
    )
  }
  /**
   * **drop**
   * 
   * Returns a new `EventStream` that will ignore the first `n`
   * events emitted from the original `EventStream`, then start listening.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  const drop3 = stream.drop(3) // ignore the first 3 events
   *  drop3.listen(console.log) // logs "3", "4", "5", ... every second
   * ```
   */
  drop(n: number): EventStream<T> {
    return new EventStream(
      outerListener => {
        let i = n
        const innerListener: Listener<T> = x => {
          if (i > 0) {
            i--
          }
          else outerListener(x)
        }
        return this._addListener(innerListener)
      }
    )
  }
  /**
   * **take**
   * 
   * Returns a new `EventStream` that will will stop
   * listening after the first `n` events are emitted.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  const take3 = stream.take(3) // only take the first 3 events
   *  take3.listen(console.log) // logs "0", "1", "2" every second, then stops
   * ```
   */
  take(n: number): EventStream<T> {
    return new EventStream(
      outerListener => {
        let i = 0
        const innerListener: Listener<T> = x => {
          if (i < n) {
            i++
            outerListener(x)
          }
          else {
            ctlr.cancel()
          }
        }
        const ctlr = this._addListener(innerListener)
        return ctlr
      }
    )
  }
  /**
   * **slice**
   * 
   * Returns a new `EventStream` that will take events from the original
   * `EventStream` starting at `start` and ending at `end`.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  const slice1to4 = stream.slice(1,4) // only take events 1, 2, and 3
   *  slice1to4.listen(console.log) // logs "1", "2", "3" every second, then stops
   * ```
   */
  slice(start: number, end: number): EventStream<T> {
    return this.take(end).drop(start)
  }
  /**
   * **takeWhile**
   * 
   * Returns a new `EventStream` that will take events from the original
   * `EventStream` while the given predicate is true.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  const takeWhileLessThan5 = stream.takeWhile(x => x < 5)
   *  takeWhileLessThan5.listen(console.log) // logs "0", "1", "2", "3", "4" every second, then stops
   * ```
   */
  takeWhile(predicate: (x: T) => boolean): EventStream<T> {
    return new EventStream(
      listener => {
        const ctlr = this._addListener(
          x => {
            if (predicate(x)) {
              listener(x)
            }
            else {
              ctlr.cancel()
            }
          }
        )
        return ctlr
      }
    )
  }
  /**
   * **dropWhile**
   * 
   * Returns a new `EventStream` that will drop events from the original
   * `EventStream` while the given predicate is true.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  const dropWhileLessThan5 = stream.dropWhile(x => x < 5)
   *  dropWhileLessThan5.listen(console.log) // logs "5", "6", "7", ... every second, ignoring "0", "1", "2", "3", and "4"
   * ```
   */
  dropWhile(predicate: (x: T) => boolean): EventStream<T> {
    return new EventStream(
      listener => {
        let dropping = true
        return this._addListener(
          x => {
            if (dropping) {
              if (predicate(x)) {
                // still dropping
                return
              }
              else {
                // no longer dropping
                dropping = false
              }
            }
            // not dropping anymore, so we can emit the value
            listener(x)
          }
        )
      }
    )
  }
  /**
   * **constant**
   * 
   * Returns a new `EventStream` that will emit the same value
   * every time the original `EventStream` emits a value.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  const constantHello = stream.constant("Hello")
   *  constantHello.listen(console.log) // logs "Hello" every second
   * ```
   */
  constant<U>(value: U): EventStream<U> {
    return this.map(() => value)
  }
  split2(f: (x: T) => 0 | 1): [EventStream<T>, EventStream<T>] {
    return [
      this.filter(x => f(x) === 0),
      this.filter(x => f(x) === 1)
    ]
  }
  split3(f: (x: T) => 0 | 1 | 2): [EventStream<T>, EventStream<T>, EventStream<T>] {
    return [
      this.filter(x => f(x) === 0),
      this.filter(x => f(x) === 1),
      this.filter(x => f(x) === 2)
    ]
  }
  splitN(n: number, f: (x: T) => number): EventStream<T>[] {
    return Array.from({ length: n }, (_, i) => this.filter(x => f(x) === i))
  }

  /**
   * Use this to call some side-effecting function on each value emitted.
   * 
   * Does not modify the values emitted.
   */
  forEach(f: (x: T) => void): EventStream<T> {
    return new EventStream<T>(listener => {
      const ammendedListener: Listener<T> = x => {
        f(x)
        listener(x)
      }
      return this._addListener(ammendedListener)
    })
  }
  /**
   * **process**
   * 
   * Processes the values emitted by this `EventStream` using a generator function.
   * The generator function receives the current state and the value emitted by the `EventStream`,
   * and can yield new values to be emitted by the resulting `EventStream`.
   * 
   * example:
   * ```typescript
   *  const stream = EventStream.fromInterval(1000).slice(1,4)
   *  const processedStream = stream.process(function*(count, value) {
   *    // yield `value` `count` times
   *    for (let i = 0; i < count; i++) {
   *      yield value
   *    }
   *    return value // the next value of `count` will be `value`
   *  }, 1) // initial state is 1
   *  processedStream.listen(console.log) // "1" "2" "3" "3" 
   * ```
   */
  process<State,U>(f: (state: State, value: T) => Generator<U,State>, initialState: State): EventStream<U> {
    return new EventStream<U>(listener => {
      let state = initialState
      return this._addListener(payload => {
        const generator = f(state,payload)
        while (true) {
          const next = generator.next()
          if (next.done) {
            state = next.value
            break
          }
          else {
            listener(next.value)
          }
        }
      })
    })
  }
  process0<U>(f: (value: T) => Generator<U>): EventStream<U> {
    return this.process<void,U>((_,value) => f(value), undefined)
  }
  scan<Acc,U>(f: (accumulator: Acc, value: T) => [accumulator: Acc, U], initialAcc: Acc): EventStream<U> {
    return this.process(function*(acc,val) {
      const result = f(acc,val)
      yield result[1]
      return result[0]
    }, initialAcc)
  }
  flatScan<Acc,U>(f: (accumulator: Acc, value: T) => [accumulator: Acc, yields: Iterable<U>], initialAcc: Acc): EventStream<U> {
    return this.process(function*(acc,val) {
      const [next,yields] = f(acc,val)
      for (const x of yields) {
        yield x
      }
      return next
    }, initialAcc)
  }

  /**
   * **debounce**
   * 
   * Returns a new `EventStream` that will only emit an event
   * if no new events have been emitted for the given delay (in milliseconds).
   */
  debounce(delay_ms: number): EventStream<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    return new EventStream(
      listener => {
        const ctlr = this._addListener(
          x => {
            if (timeoutId !== null) {
              clearTimeout(timeoutId)
            }
            timeoutId = setTimeout(() => {
              listener(x)
              timeoutId = null
            }, delay_ms)
          }
        )
        return {
          cancel() {
            if (timeoutId !== null) {
              clearTimeout(timeoutId)
            }
            ctlr.cancel()
          }
        }
      }
    )
  }
  enumerate(): EventStream<[T,number]> {
    return new EventStream(
      listener => {
        let i = 0
        return this._addListener(
          x => listener([x,i++])
        )
      }
    )
  }

  /**
   * **mergeWith**
   * 
   * Merges this `EventStream` and the given `EventStream` into one.
   */ 
  mergeWith<U>(other: EventStream<U>): EventStream<T|U> {
    return new EventStream(listener => {
      const ctlr1 = this.listen(listener)
      const ctlr2 = other.listen(listener)
      return {
        cancel() {
          ctlr1.cancel()
          ctlr2.cancel()
        }
      }
    })
  }
  /**
   * **merge**
   * 
   * Merges multiple `EventStream`s into one.
   * 
   * example:
   * ```typescript
   *  const stream1 = EventStream.fromInterval(300).map(x => x+1).map(x => `Stream 1: ${x*3}`)
   *  const stream2 = EventStream.fromInterval(500).map(x => x+1).map(x => `Stream 2: ${x*5}`)
   *  const mergedStream = EventStream.merge(stream1, stream2)
   *  mergedStream.listen(console.log)
   *  // Output:
   *  // "Stream 1: 3"
   *  // "Stream 2: 5"
   *  // "Stream 1: 6"
   *  // "Stream 1: 9"
   *  // "Stream 2: 10"
   *  // "Stream 1: 12"
   *  // ...etc.
   * ```
   * 
   * @param streams the `EventStream`s to merge
   * @returns a new `EventStream` that emits values from all the given `EventStream`s
   */
  static merge<T>(...streams: EventStream<T>[]): EventStream<T> {
    if (streams.length === 0) return EventStream.empty
    else return new EventStream(listener => {
      const ctlrs = streams.map(stream => stream.listen(listener))
      return {
        cancel() {
          for (const ctlr of ctlrs) {
            ctlr.cancel()
          }
        }
      }
    })
  }

  /**
   * **fromEventTarget**
   * 
   * A helper method to create an `EventStream` from
   * any `EventTarget` (such as DOM elements, `window`, etc).
   */
  static fromEventTarget<E extends Event = Event>(target: EventTarget, type: string): EventStream<E> {
    return new EventStream(
      listener => {
        target.addEventListener(type,listener as Listener<Event>)
        return {
          cancel() {
            target.removeEventListener(type,listener as Listener<Event>)
          }
        }
      }
    )
  }
  /**
   * **fromInterval**
   * 
   * A helper method to create an `EventStream` that emits
   * events at a regular interval (given in milliseconds).
   * 
   * The payload is an integer that increases by one each time an event is fired.
   * @param interval_ms time in milliseconds between each event
   * 
   * @example
   * ```typescript
   *  const stream = EventStream.fromInterval(1000) // emits every second
   *  stream.listen(tick => console.log(`Tick: ${tick}`))
   * ```
   */
  static fromInterval(interval_ms: number): EventStream<number> {
    return new EventStream(
      listener => {
        let tick = 0
        const id = setInterval(() => listener(tick++), interval_ms)
        return {
          cancel() {
            clearInterval(id)
          }
        }
      }
    )
  }
  /**
   * The payload is an integer that increases by one each time an event is fired.
   * @param frequency_Hz How many times per second an event should be fired
   * @returns
   */
  static fromFrequency(frequency_Hz: number): EventStream<number> {
    return EventStream.fromInterval(1000 / frequency_Hz)
  }
  static fromRequestAnimationFrame(): EventStream<number> {
    if (typeof requestAnimationFrame === "undefined") throw new Error("'requestAnimationFrame()' not available")
    return new EventStream<number>(
      function(listener) {
        let requestId: number
        let done = false
        const cb = (t_ms: number) => {
          if (done) return
          requestId = requestAnimationFrame(cb)
          listener(t_ms)
        }
        requestId = requestAnimationFrame(cb)
        return {
          cancel() {
            done = true
            cancelAnimationFrame(requestId)
          }
        }
      }
    )
  }
  static animationFrame() {
    return EventStream.fromRequestAnimationFrame()
  }

  static empty: EventStream<any> = new EventStream(_ => ({ cancel() {} }))
}

// export type PushStream<T> = [push: (x: T) => void, stream: EventStream<T>]
/**
 * **pushStream**
 * 
 * A helper function to create an `EventStream` that can be imperatively pushed
 * to.
 * 
 * It returns a tuple of `[push, stream]` where `push` is a function that can
 * be called to push new values to the stream, and `stream` is the
 * `EventStream` that emits those values.
 */
export const pushStream = <T>(): [push: (x: T) => void, stream: EventStream<T>] => {
  const listeners: Map<number,Listener<T>> = new Map()
  let id = 0

  const push = (x: T) => {
    for (const listener of listeners.values()) {
      listener(x)
    }
  }
  const stream = new EventStream<T>(
    listener => {
      const listenerId = id++
      listeners.set(listenerId,listener)
      return {
        cancel() {
          listeners.delete(listenerId)
        }
      }
    }
  )
  return [push, stream]
}