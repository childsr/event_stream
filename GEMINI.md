# GEMINI.md

## Project Overview

**@bananaseed/event_stream** is a lightweight, zero-dependency TypeScript library designed to transform event sources (such as DOM elements, Node.js EventEmitters, or intervals) into type-safe, observable streams. 

### Core Concepts
- **EventStream<T>**: The central class that wraps an asynchronous event source. It follows an "executor" pattern where nothing happens until `listen()` or `start()` is called.
- **Immutability**: `EventStream` objects are immutable; operators like `map`, `filter`, and `take` return new `EventStream` instances.
- **Lazy Execution**: Streams only begin emitting events when a listener is attached.
- **Type Safety**: Built with TypeScript to provide full type inference across transformation pipelines.

### Key Technologies
- **TypeScript**: Main development language.
- **Parcel**: Used for bundling and generating CJS, ESM, and type definitions.

---

## Building and Running

The project uses `npm` as its package manager and `parcel` for builds.

### Key Commands
- `npm run build`: Bundles the project into the `dist/` directory using Parcel. Generates `main.js` (CJS), `main.mjs` (ESM), and `main.d.ts`.
- `npm run watch`: Starts Parcel in watch mode for development.
- `npm run check`: Runs `tsc --noEmit` to perform type checking across the codebase.

> [!IMPORTANT]
> **Testing**: There is currently no `test` script defined in `package.json`. Verification of changes should be done via local integration or by adding a test suite.

---

## Development Conventions

- **Functional Operators**: Use functional-style operators (`map`, `filter`, `flatMap`, `take`, `drop`, `debounce`) to transform event data.
- **Surgical Updates**: When modifying `src/index.ts`, ensure that existing operators remain referentially transparent.
- **Strict Typing**: The project uses strict TypeScript settings. Ensure all new functions and operators are fully typed.
- **Zero Dependencies**: Maintain the "zero-dependency" goal by avoiding the addition of runtime dependencies.
- **Source Structure**:
    - `src/index.ts`: The primary entry point containing the `EventStream` class and helper functions.
    - `dist/`: Generated build artifacts (should not be edited directly).
