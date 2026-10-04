import { useLayoutEffect, useRef, useState } from "react";
import { clipboardImage } from "./index";
import { ImagePasteSession, type ImagePasteSave, type ImagePasteState } from "./paste-session";

/** Caller owns the paste listener and any text-paste policy. */
export function useImagePaste(options: { active: boolean; targetKey: string | null; save: ImagePasteSave }) {
  const [state, setState] = useState<ImagePasteState>({ previewUrl: null, pending: false, error: null });
  const session = useRef<ImagePasteSession | null>(null);
  session.current ??= new ImagePasteSession(options.save, setState);
  session.current.setSave(options.save);
  useLayoutEffect(() => {
    session.current?.setTarget(options.active, options.targetKey);
    return () => session.current?.setTarget(false, null);
  }, [options.active, options.targetKey]);

  function handlePaste(event: Pick<ClipboardEvent, "clipboardData" | "preventDefault">): boolean {
    if (!options.active) return false;
    const image = clipboardImage(event.clipboardData);
    if (!image) return false;
    event.preventDefault();
    void session.current?.paste(image);
    return true;
  }
  return { ...state, handlePaste, clearPreview: () => session.current?.clear() };
}
