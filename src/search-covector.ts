import { CoList, FileStream, Ref } from "jazz-tools";
import { readCoVectorFromFileStream } from "./CoVector.js";
import { cosineSimilarity, ensureVector, type VectorInput } from "./vector.js";

/**
 * Function that selects the embedding for a given item in the list.
 *
 * It expects a reference instead of actual embedding value (FileStream)
 * to avoid Jazz's internal autoloading.
 * Convo on Discord:
 * https://discord.com/channels/1139617727565271160/1139621689882321009/1405924901763678230
 */
export type EmbeddingSelector<L extends CoList> = (
  item: L[number]["_refs"]
) => Ref<FileStream> | undefined;

export type CoVectorSearchResultItem<Value> = {
  value: Value;
  similarity?: number;
};

/**
 * The result of a CoVector search. Either:
 * - An array of items with their similarity score (sorted descending); or
 * - `undefined`/`null` (which extends Jazz's default behavior)
 */
export type CoVectorSearchResult<L extends CoList> =
  | {
      didSearch: boolean;
      results: Array<CoVectorSearchResultItem<L[number]>>;
      durationMs?: number;
    }
  | undefined
  | null;

export type CoVectorSearchFilter =
  | { similarityTopPercent: number }
  | { similarityThreshold: number }
  | { limit: number };

const DEFAULT_FILTER_OPTION: CoVectorSearchFilter = { limit: 10 };

/**
 * Search a list of items for the most similar items to a given query.
 */
export const searchCoVector = async <L extends CoList>(
  list: L | undefined | null,
  listEmbeddingSelector: EmbeddingSelector<L>,
  query: VectorInput | null,
  options: {
    abortSignal?: AbortSignal;
    filterOptions?: CoVectorSearchFilter;
  } = {}
): Promise<CoVectorSearchResult<L>> => {
  if (list === null) return null;
  if (list === undefined) return undefined;

  const wrappedList: CoVectorSearchResultItem<L[number]>[] = list.map(
    (listItem) => ({
      value: listItem,
    })
  );
  if (query === undefined || query === null)
    return { didSearch: false, results: wrappedList };

  const start = Date.now();
  const queryVector = ensureVector(query);

  const similarityResults = await Promise.all(
    wrappedList.map(async (listItem) => {
      if (options.abortSignal?.aborted) return listItem;

      const embeddingRef = listEmbeddingSelector(listItem.value._refs);
      if (!embeddingRef) return listItem;

      const vector = await readCoVectorFromFileStream(embeddingRef.id);

      return {
        value: listItem.value,
        similarity: cosineSimilarity(queryVector, vector),
      };
    })
  );

  if (options.abortSignal?.aborted)
    // don't bother sorting if the search was aborted
    return {
      didSearch: false,
      results: similarityResults,
    };

  const results = similarityResults
    .filter((value) => typeof value.similarity === "number")
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  const end = Date.now();
  const duration = Math.ceil(end - start);

  const filteredResults = filterResults(results, options.filterOptions);

  return {
    didSearch: true,
    results: filteredResults,
    durationMs: duration,
  };

  // TODO: *Create a mutable atom to store the `list` of vectors*
  //       When `list` updates and `query` stays the same, the current
  //       search recalculates _all_ similarity scores again.
  //       We should be able to store the vectors in a mutable atom and
  //       only recalculate the similarity scores for the items that changed.
  //
  //       This will also help reactivity performance (in React hook or via Jazz's .subscribe)

  // TODO: Optimize the .map/.filter/.sort to be more efficient (not a bottleneck though)
  // TODO: Add a real index (will probably introduce new CoValue type, CoVectorIndex)
};

const filterResults = <L extends CoList>(
  results: CoVectorSearchResultItem<L[number]>[],
  filterOptions: CoVectorSearchFilter = DEFAULT_FILTER_OPTION
) => {
  if ("limit" in filterOptions) {
    return results.slice(0, filterOptions.limit);
  }

  if ("similarityThreshold" in filterOptions) {
    const clampedThreshold = Math.max(
      -1,
      Math.min(1, filterOptions.similarityThreshold)
    );

    const lastIndex = results.findIndex(
      (r) => typeof r.similarity === "number" && r.similarity < clampedThreshold
    );
    return results.slice(0, lastIndex);
  }

  if ("similarityTopPercent" in filterOptions) {
    const clampedTopPercent = Math.max(
      0,
      Math.min(1, filterOptions.similarityTopPercent)
    );

    const topPercentThreshold = 1 - clampedTopPercent;
    const topSimilarityScore = results[0].similarity ?? 0;

    const similarityThreshold = topSimilarityScore * topPercentThreshold;

    return filterResults(results, { similarityThreshold });
  }

  return results;
};
