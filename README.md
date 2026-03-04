# @bananaseed/event_stream

![npm version](https://img.shields.io/npm/v/@bananaseed/event_stream)
![license](https://img.shields.io/npm/l/@bananaseed/event_stream)
![minzipped size](https://img.shields.io/bundlephobia/minzip/@bananaseed/event_stream)

**@bananaseed/event_stream** represents a lightweight, type-safe way to transform event sources (DOM elements, Node EventEmitters, etc.) into iterable stream objects.

It allows you to treat events as collections, applying functional operators like `map`, `filter`, and `reduce` asynchronously.

## Features

- Zero dependencies.
- Written in TS with full type definitions.
- Works with DOM EventTargets, Node.js EventEmitters, or anything else that emits events.
- Supports `map`, `filter`, `take`, `debounce`, and more.