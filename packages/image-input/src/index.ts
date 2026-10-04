/** Extracted from the movie-folder and bookmark paste handlers. Storage stays in the app. */
export const IMAGE_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type ImageExtension = (typeof IMAGE_EXTENSIONS)[keyof typeof IMAGE_EXTENSIONS];
export type ImagePayload = { extension: ImageExtension; bytes: number[] };

export async function readImagePayload(image: Blob): Promise<ImagePayload> {
  const extension = IMAGE_EXTENSIONS[image.type as keyof typeof IMAGE_EXTENSIONS];
  if (!extension) throw new Error("PNG, JPG, WEBP, GIF 형식의 이미지만 사용할 수 있습니다.");
  return { extension, bytes: Array.from(new Uint8Array(await image.arrayBuffer())) };
}

/** Does not install global listeners or call preventDefault; the active dialog owns those. */
export function clipboardImage(data: Pick<DataTransfer, "items"> | null): File | null {
  const item = data && Array.from(data.items)
    .find((candidate) => candidate.kind === "file" && candidate.type.startsWith("image/"));
  return item?.getAsFile() ?? null;
}

/** The caller must dispose the preview when it changes or its component unmounts. */
export function createImagePreview(image: Blob) {
  const url = URL.createObjectURL(image);
  return { url, dispose: () => URL.revokeObjectURL(url) };
}
