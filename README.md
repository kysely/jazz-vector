# <img src="https://github.com/kysely/jazz-vector/raw/main/docs/jazz_vector.svg" width="220" alt="Jazz Vector" />

**Local-first vector similarity search for [Jazz](https://jazz.tools)**


Store and query high-dimensional vectors directly on-device: private, offline-first, and collaborative.

Built on Jazz, you get:

- Local-first sync across devices
- End-to-end encryption
- Real-time multiplayer

When paired with a local embeddings model:

- Works fully offline


#### 👉 [Live demo](https://jazz-vector-demo.playdeux.com) ([source](https://github.com/kysely/jazz-vector/tree/main/examples/demo))

```typescript
// -- schema.ts --
export const JournalEntry = co.map({
  text: z.string(),
  simpleEmbedding: coV.vector(384), // <--- Define CoVector
});

// -- app.tsx --
const { search, isSearching } = useCoVectorSearch(
  journalEntries,
  (entry) => entry.simpleEmbedding,
  queryEmbedding
);
```


## Use cases

- **Semantic search**: Find notes, docs, or messages by meaning
- **Personalization**: On-device recommendations and adaptive UIs
- **Knowledge management**: Organize personal wikis, journals, or research by concept rather than keyword
- **Information matching**: Connect datasets or peers through embeddings
- **Context-aware assistants**: Build local-first AI helpers that understand the user’s data while keeping it private
- **Cross-device continuity**: Carry embeddings seamlessly across phone, tablet, and desktop without a cloud backend
- **Creative apps**: Enable music, art, or writing tools that find related ideas, motifs, or inspirations

<details>
<summary>More cool use cases, as per AI</summary>

**Search & organization**

- _Semantic search_: Find notes, docs, emails, or messages by meaning
- _Smart tagging & clustering_: Auto-group related items and generate topic labels
- _Near-duplicate detection_: Merge similar notes, photos, or files
- _Cross-app search_: Index clipboard, screenshots, and files for one-place recall

**Personalization & recommendations**

- _On-device recommendations_: Rank feeds, reading lists, or media without sending data to the cloud
- _Context-aware shortcuts_: Suggest next actions based on what the user is doing
- _Session re-ranking_: Personalize command palettes, search results, or menus

**Retrieval for AI (local RAG)**

- _Context fetching for LLMs_: Retrieve relevant chunks from local docs to ground responses
- _Conversation memory_: Pull past chats or notes that match the current topic
- _Snippet linking_: Auto-link related passages across notebooks or PDFs

**Media & sensors**

- _Photo & screenshot search_: “Find images with whiteboard notes from last week”
- _Audio similarity_: Locate related voice notes, music snippets, or sound effects

**Collaboration & P2P**

- _Peer-to-peer matching_: Align embeddings between devices to find shared interests or files
- _Team knowledge linking_: Connect related docs across teammates without centralizing raw data
- _Federated discovery_: Share pointers/IDs instead of content; keep source data private

**Productivity & dev workflows**

- _Code search_: Semantic lookup of functions, symbols, and snippets in local repos
- _Issue triage_: Match new bugs to similar past reports or fixes
- _Research assistants_: Cluster and surface related papers, highlights, and annotations

**Safety & housekeeping**

- _Content filtering_: On-device NSFW/spam heuristics using similarity
- _Anomaly detection_: Spot outliers in logs or metrics locally
- _Storage hygiene_: Identify stale or redundant items to archive
</details>

## Installation

Requires [`jazz-tools`](https://www.npmjs.com/package/jazz-tools) to be already installed.

```bash
npm i jazz-vector
```

## Embeddings (Bring Your Own)

Jazz Vector only deals with storage and search. **You generate the vectors** with any model you like (OpenAI, Hugging Face, or custom), then feed the vectors in.

**On-device option (recommended)**: Use [Transformers.js](https://huggingface.co/docs/transformers.js) to run models locally for offline, private embedding:

- [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2) — 384-dim, ~23 MB
- [More models →](https://huggingface.co/models?pipeline_tag=feature-extraction&library=transformers.js)

Alternatively, you can call a [server-side model](#server-side-embedding-model) (your own or commercial one like OpenAI), but note this removes offline support and may affect user privacy.

## Usage

### Define your schema

Jazz Vector exposes new `CoVector` value type you should use to define vector embeddings.
It expects the number of dimensions of your embeddings.

```typescript
export const Embedding = coV.vector(384);
```

Currently, you can perform a vector search only across **a CoList of CoMaps containing embeddings property**. For other data structures, see [“Manual Index” pattern](#manual-index).

```typescript
// schema.ts
import { co, z } from "jazz-tools";
import { coV } from "jazz-vector";

// 1) Define an embedding vector schema with expected dimension count
export const Embedding = coV.vector(384);

export const JournalEntry = co.map({
  text: z.string(),

  // 2) Use an embedding schema inside an entity
  embedding: Embedding,
});

// 3) Define a searchable CoList of items containing embeddings property
export const JournalEntryList = co.list(JournalEntry);
```

Since `CoVector` is a simple wrapper around [Jazz's built-in `FileStream`](https://jazz.tools/docs/react/using-covalues/filestreams), all the `FileStream` patterns apply (permissions, loading, etc).

### Create & index the data

It is recommended to obtain the embeddings vector at the time of writing a CoValue. This makes the most sense, because:

- writer naturally owns the data
- new CoValue will be automatically indexed for all subsequent reader peers

Alternatively, if you wish to create embeddings in the server worker after creation, it will be automatically synced by the power of Jazz.

Instantiate a CoVector using `createFrom` method

```typescript
await Embedding.createFrom([0.018676748499274254, -0.06785402446985245,...])
```

The instance of a CoVector can be assigned as a value as expected by the schema.

```typescript
// create.ts
import { JournalEntry, Embedding } from "./schema.ts";
import { createEmbedding } from "./your-code";

// 1) Generate embeddings (bring your own embeddings model)
const vector: number[] = await createEmbedding("Text");

const journalEntry = JournalEntry.create({
  text: "Text",

  // 2) Instantiate and assign a `CoVector` from a specific vector (`number[]`)
  embedding: await Embedding.createFrom(vector),
});

journalEntries.push(journalEntry);
```

### Use semantic search

The vector search is performed locally in memory on top of Jazz's CoList.

As such, you need to first load the CoList you wish to search across manually.

```typescript
// app.tsx
import { useCoState } from "jazz-tools/react";
import { useCoVectorSearch } from "jazz-vector/react";

import { JournalEntryList } from "./schema.ts";

// 1) Load a searchable list (that has elements containing embeddings)
const journalEntries = useCoState(
  JournalEntryList,
  me.root.journalEntries.id,
  { resolve: { $each: true } }
);
```

Then, pass the searchable list along with:

- getter for embedding vector property on the list item
- embedding vector for the search query (or `null` that will pass your list through)

```typescript
// 2) Search the list
const { search, isSearching } = useCoVectorSearch(
  journalEntries,             // <- loaded list to search in
  (entry) => entry.embedding, // <- embedding property getter on each list item
  queryEmbedding              // <- embeddings of search query (number[]), or null to pass through
);
```

You can filter the data before passing it to CoVectorSearch to search on a subset of your list.

There are 2 search functions available:

- [`useCoVectorSearch` hook](#use-covector-search) for React apps
- [`searchCoVector` function](#search-covector) for server workers or vanilla JS

## Patterns

### Manual “index”

Currently, vector search works only across **a CoList of CoMaps containing embeddings property**.
To search data stored in a different data structures (or across multiple ones), you'll need to construct and maintain a searchable list manually.

For example, given you have a recursive `Block` schema.

```typescript
// -- schema.ts
import { co, z } from "jazz-tools";

// Recursive data structure
const Block = co.map({
  text: z.string(),
  get childBlock() {
    return Block.optional();
  }
  get parentBlock() {
    return Block.optional();
  }
});
```

You can construct a simplified list of searchable objects that hold
the embedding vector and a reference to the original `Block` instance.

```typescript
// -- schema.ts
import { co, z } from "jazz-tools";
import { coV } from "jazz-vector";

const Block = co.map({ ... });

// Simple embedding + reference
export const SearchableBlock = co.map({
  block: Block,
  embedding: coV.vector(1536),
});

// Flat searchable list of references with embeddings
export const BlocksIndex = co.list(SearchableBlock);

// -- query.tsx
const { search, isSearching } = useCoVectorSearch(
  searchableBlocksList,
  (block) => block.embedding,
  queryEmbedding
);

// `search.results` returns results over `SearchableBlock`
search.results.map(searchResult => {
  const searchableBlock = searchResult.value
  const block = searchableBlock.block // derefs and loads the `Block` instance
})
```

This pattern of manually constructing a single “index” is also useful
for searching across various data types inside your app (e.g. notes, photos, messages)

### Server-side embedding model

The lib expects you to bring own embeddings, so you're free to use either local or server-side model.

Using a server-side embedding model makes sense when (for example)

- you want to optimize client app package size
- you want to offload client CPU cycles when creating embeddings for huge amounts of data
- you want larger, specialized, or proprietary models
- you want easier centralized upgrades.

The trade-offs are:

- loss of offline capability
- higher latency and failure modes (network/timeouts)
- per-request cost/rate limits
- privacy implications because user text leaves the device.

### Dual embeddings

You can put embedding vectors of various dimensions on a single CoValue.

This allows you to use different embedding models for search tasks of varying difficulties, for example:

- use small simple embeddings models on the client to power the on-device search feature
- use powerful commercial embeddings models on the server for RAG

```typescript
// schema.ts
export const JournalEntry = co.map({
  text: z.string(),
  simpleEmbedding: coV.vector(384),
  largeEmbedding: coV.vector(3072),
});
```

The CoVectorSearch dereferences and loads the actual `CoVector` value (the embedding vector) only upon search.

```typescript
// query.tsx (on the client device)
const { queryEmbeddings } = useSimpleEmbeddings(...) // returns 384-dimensional vector

const { search, isSearching } = useCoVectorSearch(
  journalEntries,
  (entry) => entry.simpleEmbedding,
  queryEmbeddings
);

// search.ts (on the server)
const queryEmbeddings = await openai.embeddings.create(...) // returns 3072-dimensional vector

const searchResults = searchCoVector(
  journalEntries,
  (entry) => entry.largeEmbedding,
  queryEmbeddings
);
```

## API

<a name="covector-definer"></a>

### `coV.vector()`

Defines a `CoVector` schema in the Jazz storage schema.

#### Parameters:

| Parameter    | Type   | Description                                        |
| ------------ | ------ | -------------------------------------------------- |
| `dimensions` | Number | The number of embedding vector dimensions (length) |

#### Returns

- CoVector schema (extension of [Jazz's built-in FileStream](https://jazz.tools/docs/react/using-covalues/filestreams) schema with [`.createFrom` method](#ceovector-create-from))

<a name="ceovector-create-from"></a>

### `CoVector.createFrom()`

Creates an instance of `CoVector` from CoVector schema.

#### Parameters:

| Parameter | Type                                                                                              | Description                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `vector`  | Array of Number; or `Float32Array`                                                                | The raw vector data. Must have the exact dimension (length) as [defined in the schema](#covector-definer). |
| `options` | [Jazz Ownership Object (see)](https://jazz.tools/docs/react/using-covalues/filestreams#ownership) | Native Jazz's ownership options                                                                            |

#### Returns

- CoVector ([Jazz `FileStream`](https://jazz.tools/docs/react/using-covalues/filestreams))

<a name="use-covector-search"></a>

### `useCoVectorSearch()` (React only)

Performs a vector search on a CoList. React hook.

Automatically recalculates the results when the searched list or query changes.

#### Parameters:

| Parameter         | Type                                                                                      | Description                                                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`            | `CoList` or `undefined` or `null`                                                         | An instance of CoList to search in.                                                                                                                                                                                                                     |
| `embeddingGetter` | Function                                                                                  | Getter function for the embedding property on each list item.                                                                                                                                                                                           |
| `queryEmbeddings` | `number[]` or `Float32Array` or `null`                                                    | Embedding vector for the search query. When query is `null`, the entire list will be passed through.                                                                                                                                                    |
| `filterOptions`   | `{ limit: N }` or<br />`{ similarityThreshold: N }` or <br />`{ similarityTopPercent: N}` | Controls how many results are returned. `limit` sets the maximum exact number of results; `similarityThreshold` filters by minimum similarity score; `similarityTopPercent` filters N% top percents based on the highest score. Default `{ limit: 10 }` |

#### Returns

| Parameter     | Type                                                                 | Description                                       |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| `isSearching` | Boolean                                                              | Determines whether a search is currently pending. |
| `search`      | [`CoVectorSearchResult` (see details)](#covector-search-result-type) | Search results.                                   |
| `error`       | String (optional)                                                    | Eventual error from the search                    |

<a name="search-covector"></a>

### `searchCoVector()` (server or vanilla JS)

Performs a vector search on a CoList. Asynchronous function to be used in the server worker, or a vanilla JS code.

#### Parameters:

| Parameter                         | Type                                                                                     | Description                                                                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                            | `CoList` or `undefined` or `null`                                                        | An instance of CoList to search in.                                                                                                                                                                                                                     |
| `embeddingGetter`                 | Function                                                                                 | Getter function for the embedding property on each list item.                                                                                                                                                                                           |
| `queryEmbeddings`                 | `number[]` or `Float32Array` or `null`                                                   | Embedding vector for the search query. When query is `null`, the entire list will be passed through.                                                                                                                                                    |
| `options`                         | Object (optional)                                                                        |                                                                                                                                                                                                                                                         |
| &nbsp;&nbsp;&nbsp;`filterOptions` | `{ limit: N }` or<br />`{ similarityThreshold: N }` or<br />`{ similarityTopPercent: N}` | Controls how many results are returned. `limit` sets the maximum exact number of results; `similarityThreshold` filters by minimum similarity score; `similarityTopPercent` filters N% top percents based on the highest score. Default `{ limit: 10 }` |
| &nbsp;&nbsp;&nbsp;`abortSignal`   | `AbortSignal`                                                                            | Adds ability to abort the search                                                                                                                                                                                                                        |

#### Returns:

- [`CoVectorSearchResult` (see details)](#covector-search-result-type)

<a name="covector-search-result-type"></a>

### `CoVectorSearchResult` (type)

Result of the vector search call.

Has 3 variants based on input `list`:

- `undefined` when input `list` is `undefined`
- `null` when input `list` is `null`
- Object (see below) when input `list` has data

| Parameter                      | Type                                        | Description                                                                                                    |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `didSearch`                    | Boolean                                     | Determines whether the search was performed or not.                                                            |
| `durationMs`                   | Number (optional)                           | Duration of the vector search in milliseconds.                                                                 |
| `results`                      | Array                                       | Array of results, sorted by `similarity` from highest to lowest; or the original list data if query was `null` |
| &nbsp;&nbsp;&nbsp;`value`      | CoList item type                            | The original item from the CoList                                                                              |
| &nbsp;&nbsp;&nbsp;`similarity` | Number (optional)<br />between `-1` and `1` | Similarity score of this value to the query. Will be present if the search was performed (input query was set) |

**When the input query is `null` the search will pass through all of the original data wrapped in `CoVectorSearchResult` type (with `didSearch: false` and `results` array without a `similarity` score).**

## Status & Roadmap

The current version is the first, most basic (even _naive_), unoptimized
implementation of vector storage and search.

The search simply loads all vectors one by one, then calculates similarity
scores, and sorts the results. The performance is poor (search across
only **1500 (384-dim) vectors** takes **~115 ms** in Safari on M1 Pro.)

However, it _is_ a fully working semantic search.

**Next steps for this lib:**

- build a true vector index
  - first milestone is to reach 100k vectors search within 100ms
- performance optimizations for calculating similarity scores
- see TODOs in code
- build bindings for Svelte, etc (looking for contributors!)

## Development

```bash
npm install
```

```bash
npm run build
```

## License

MIT License
