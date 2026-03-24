# @bananaseed/event_stream

![npm version](https://img.shields.io/npm/v/@bananaseed/event_stream)
![license](https://img.shields.io/npm/l/@bananaseed/event_stream)
![minzipped size](https://img.shields.io/bundlephobia/minzip/@bananaseed/event_stream)

**@bananaseed/event_stream** is a lightweight, type-safe way to turn event sources (DOM elements, Node EventEmitters, etc.) into iterable stream objects.

It allows you to treat events as collections, applying functional operators like `map`, `filter`, and `reduce` asynchronously.

## Examples

**Basic Example**

```typescript
// Create an EventStream that emits a random number every second
const stream = new EventStream<number>(listener => {
  const id = setInterval(() => listener(Math.random()), 1000)
  return { cancel() { clearInterval(id) } }
})
// Listen for events, logging each one to the console
const controller = stream.listen(console.log)
// After 5 seconds, stop listening for events
setTimeout(() => controller.cancel(), 5000)
```

**From DOM Events**

```typescript
// Create an EventStream from click events on a button
const button = document.querySelector('button')!
const clickStream = EventStream.fromEventTarget(button, 'click')
// Convert stream of click events into stream of coordinates
const clickCoords: EventStream<{ x: number, y: number }> = clickStream.map(
  event => ({ x: event.clientX, y: event.clientY })
)
// Filter clicks to only those within a 10x10 box at (10,10) and log them
clickCoords
  .filter(({x,y}) => x > 10 && x < 20 && y > 10 && y < 20)
  .listen(coords => {
    console.log(`Clicked within the box: (${coords.x}, ${coords.y})`)
  })
```

**Merging Streams**

```typescript
const stream1 = EventStream.fromInterval(300).map(x => x+1).map(x => `Stream 1: ${x*3}`)
const stream2 = EventStream.fromInterval(500).map(x => x+1).map(x => `Stream 2: ${x*5}`)
const mergedStream = EventStream.merge(stream1, stream2)
mergedStream.listen(console.log)
// Output:
// "Stream 1: 3"
// "Stream 2: 5"
// "Stream 1: 6"
// "Stream 1: 9"
// "Stream 2: 10"
// "Stream 1: 12"
// ...etc.
```