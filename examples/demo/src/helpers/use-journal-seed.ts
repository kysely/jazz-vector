import { useCallback, useState } from "react";
import { Embedding, type JazzAccount, JournalEntry } from "../jazz";

const fetchJournalEntries = async () => {
  const response = await fetch("/datasets/journal/data.json");
  const data = await response.json();

  return data as Array<{
    answer: string;
    feelings: string[];
    topics: string[];
  }>;
};

/**
 * Creates journal entries from the dataset.
 */
export const useJournalSeed = ({
  createEmbedding,
  owner,
}: {
  createEmbedding: (text: string) => Promise<number[]>;
  owner: JazzAccount;
}) => {
  const [isSeeding, setIsSeeding] = useState(false);

  const seedJournal = useCallback(async () => {
    setIsSeeding(true);
    try {
      const journalEntries = await fetchJournalEntries();

      for (const entry of journalEntries.slice(0, 10000)) {
        const embedding = await createEmbedding(entry.answer);

        const journalEntry = JournalEntry.create({
          text: entry.answer,
          feelings: entry.feelings,
          topics: entry.topics,
          embedding: await Embedding.createFrom(embedding),
        });

        if (owner?.root?.journalEntries) {
          owner.root.journalEntries.push(journalEntry);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSeeding(false);
    }
  }, [createEmbedding, owner]);

  return { isSeeding, seedJournal };
};
