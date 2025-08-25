import { Account, co, FileStream, Group } from "jazz-tools";
import { ensureVector, type VectorInput } from "./vector.js";

/**
 * This is a virtual schema just to disable type hinting for FileStreamSchema's
 * native create/read methods when used as a CoValueSchema.
 */
type FileStreamSchemaMinimal = Omit<
  co.FileStream,
  "create" | "createFromArrayBuffer" | "createFromBlob" | "load" | "loadAsBlob"
>;

/**
 * Extends the FileStream schema with vector-specific methods.
 */
export interface CoVectorSchema extends FileStreamSchemaMinimal {
  dimensions: number;
  createFrom: (
    inputVector: VectorInput,
    options?:
      | {
          owner?: Group | Account;
          onProgress?: (progress: number) => void;
        }
      | Account
      | Group
  ) => Promise<FileStream>;
}

/**
 * Naive wrapper around the `FileStreamSchema` with create/read methods
 * that are specific to vector data.
 */
export const coVectorDefiner = (dimensions: number): CoVectorSchema => {
  const fileStreamSchema = co.fileStream() as unknown as CoVectorSchema;
  fileStreamSchema.dimensions = dimensions;

  fileStreamSchema.createFrom = (inputVector, options) => {
    const vector = ensureVector(inputVector);

    if (vector.byteLength !== dimensions * vector.BYTES_PER_ELEMENT) {
      throw new Error(
        `Vector dimension mismatch! Expected ${dimensions} dimensions, got ${
          vector.byteLength / vector.BYTES_PER_ELEMENT
        }`
      );
    }

    const arrayBuffer = vector.buffer as ArrayBuffer; 

    return FileStream.createFromArrayBuffer(
      arrayBuffer,
      "application/octet-stream",
      undefined,
      options
    );
  };

  return fileStreamSchema;
};

/**
 * Reads a vector from a FileStream (by ID or instance).
 */
export async function readCoVectorFromFileStream(
  vectorFileStream: FileStream
): Promise<Float32Array>;
export async function readCoVectorFromFileStream(
  fileStreamId: string | undefined
): Promise<Float32Array>;
export async function readCoVectorFromFileStream(
  fileStreamOrId: FileStream | string | undefined
): Promise<Float32Array> {
  let fileData: Blob | undefined;
  let vectorFileStreamId: string | undefined;

  if (fileStreamOrId instanceof FileStream) {
    fileData = fileStreamOrId.toBlob();
    vectorFileStreamId = fileStreamOrId.id;
  } else if (typeof fileStreamOrId === "string") {
    // TODO: Is this the best way to load a FileStream?
    fileData = await FileStream.loadAsBlob(fileStreamOrId);
    vectorFileStreamId = fileStreamOrId;
  } else {
    // input is `undefined`
    throw new Error("No vector file stream or ID provided");
  }

  const vector = await fileData?.arrayBuffer();

  if (!vector) {
    throw new Error(`Vector empty for ${vectorFileStreamId}`);
  }

  return new Float32Array(vector);
}
