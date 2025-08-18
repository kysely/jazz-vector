import { coVectorDefiner } from "./CoVector";

export {
  searchCoVector,
  CoVectorSearchResult,
  CoVectorSearchResultItem,
} from "./search-covector";

export { readCoVectorFromFileStream } from "./CoVector";
export const coV = {
  vector: coVectorDefiner,
};
