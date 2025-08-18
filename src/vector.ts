export type VectorInput = number[] | Float32Array;

export type Vector = Float32Array;

/**
 * Convert a VectorInput to a Vector.
 */
export const ensureVector = (input: VectorInput): Vector =>
  input instanceof Float32Array ? input : new Float32Array(input);

/**
 * -----------------------------------------------------------------------------
 * Math functions for vectors. Thanks to:
 * https://alexop.dev/posts/how-to-implement-a-cosine-similarity-function-in-typescript-for-vector-comparison/
 * -----------------------------------------------------------------------------
 */

/**
 * Calculates the cosine similarity between two vectors.
 * 
 * Returns a value between `-1` and `1`:
 * - `1` means the vectors are identical
 * - `0` means the vectors are orthogonal (i.e. no similarity)
 * - `-1` means the vectors are opposite direction (perfectly dissimilar)
 */
export const cosineSimilarity = (vecA: Vector, vecB: Vector): number => {
  const dotProductAB = dotProduct(vecA, vecB);
  const magnitudeA = magnitude(vecA);
  const magnitudeB = magnitude(vecB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProductAB / (magnitudeA * magnitudeB);
};

/**
 * Calculates the dot product of two vectors
 */
const dotProduct = (vecA: Vector, vecB: Vector): number => {
  if (vecA.length !== vecB.length) {
    throw new Error(
      `Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`
    );
  }

  return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
};

/**
 * Calculates the magnitude (length) of a vector
 */
const magnitude = (vec: Vector): number => {
  // Math.hypot would need arguments spread which wouldn't work for large vectors
  return Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
};

/**
 * Normalizes a vector (converts to unit vector)
 */
export const normalizeVector = (vec: Vector): Vector => {
  const mag = magnitude(vec);

  if (mag === 0) {
    return new Float32Array(vec.length).fill(0);
  }

  return vec.map((v) => v / mag);
};
