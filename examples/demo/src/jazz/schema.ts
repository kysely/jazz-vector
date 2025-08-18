import { Group, co, z } from "jazz-tools";
import { coV } from "jazz-vector";

export const JazzProfile = co.profile();

export const Embedding = coV.vector(384); // <- 384-dim CoVector schema

export const JournalEntry = co.map({
  text: z.string(),
  feelings: z.array(z.string()),
  topics: z.array(z.string()),
  embedding: Embedding,
});
export type JournalEntry = co.loaded<typeof JournalEntry>;

export const JournalEntryList = co.list(JournalEntry);
export type JournalEntryList = co.loaded<typeof JournalEntryList>;

export const AccountRoot = co.map({
  journalEntries: JournalEntryList,
});
export type AccountRoot = co.loaded<typeof AccountRoot>;

export const JazzAccount = co
  .account({
    profile: JazzProfile,
    root: AccountRoot,
  })
  .withMigration(async (account) => {
    if (account.root === undefined) {
      const group = Group.create();

      account.root = AccountRoot.create(
        {
          journalEntries: JournalEntryList.create([]),
        },
        group
      );
    }

    if (account.profile === undefined) {
      const group = Group.create();
      group.addMember("everyone", "reader");

      account.profile = JazzProfile.create({ name: "Anonymous" }, group);
    }
  });
export type JazzAccount = co.loaded<typeof JazzAccount>;
