import { CoList } from "jazz-tools";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type EmbeddingSelector,
  type CoVectorSearchFilter,
  type CoVectorSearchResult,
  searchCoVector,
} from "../search-covector.js";
import { type VectorInput } from "../vector.js";

/**
 * React hook that performs a vector search on a CoList.
 * Automatically recalculates the results when the searched list or query changes.
 */
export const useCoVectorSearch = <L extends CoList>(
  list: L | undefined | null,
  embeddingSelector: EmbeddingSelector<L>,
  query: VectorInput | null,
  filterOptions?: CoVectorSearchFilter
): {
  isSearching: boolean;
  search: CoVectorSearchResult<L>;
  error: string | null;
} => {
  const [search, setSearch] = useState<CoVectorSearchResult<L>>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Memoize the embedding selector to prevent unnecessary re-renders
  const embeddingSelectorRef = useRef(embeddingSelector);
  embeddingSelectorRef.current = embeddingSelector;

  const searchId = useMemo(() => makeSearchId(list, query), [list, query]);
  const currentSearchIdRef = useRef(searchId);
  currentSearchIdRef.current = searchId;

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      setIsSearching(true);
      try {
        const results = await searchCoVector(
          list,
          embeddingSelectorRef.current,
          query,
          {
            abortSignal: abortController.signal,
            filterOptions,
          }
        );

        if (searchId === currentSearchIdRef.current) {
          setSearch(results);
        }
      } catch (error) {
        if (searchId === currentSearchIdRef.current) {
          setError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (searchId === currentSearchIdRef.current) {
          setIsSearching(false);
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [list, query, searchId]);

  return { isSearching, search, error };
};

const makeSearchId = <L extends CoList>(
  list: L | null | undefined,
  query: VectorInput | null | undefined
) => {
  return `${list?.length ?? 0}-${query?.[0] ?? 0}`;
};
