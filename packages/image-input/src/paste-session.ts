import { createImagePreview, readImagePayload, type ImagePayload } from "./index";

export type ImagePasteState = { previewUrl: string | null; pending: boolean; error: string | null };
export type ImagePasteSave = (targetKey: string, payload: ImagePayload) => Promise<boolean>;
type Preview = { url: string; dispose: () => void };

/** UI lifetime is gated by target and request. Queued disk writes are never claimed cancelled. */
export class ImagePasteSession {
  private active = false;
  private targetKey: string | null = null;
  private generation = 0;
  private latestRequest = 0;
  private readonly queues = new Map<string, Promise<void>>();
  private preview: Preview | null = null;
  private state: ImagePasteState = { previewUrl: null, pending: false, error: null };

  constructor(
    private save: ImagePasteSave,
    private readonly publish: (state: ImagePasteState) => void,
    private readonly read: (image: Blob) => Promise<ImagePayload> = readImagePayload,
    private readonly makePreview: (image: Blob) => Preview = createImagePreview,
  ) {}

  setSave(save: ImagePasteSave) { this.save = save; }
  getState() { return this.state; }

  setTarget(active: boolean, targetKey: string | null) {
    if (this.active === active && this.targetKey === targetKey) return;
    this.active = active;
    this.targetKey = targetKey;
    this.clear();
  }

  clear() {
    this.generation++;
    this.preview?.dispose();
    this.preview = null;
    this.update({ previewUrl: null, pending: false, error: null });
  }

  /** Saves for one target run in order; a different target does not wait for an old save. */
  paste(image: Blob): Promise<void> {
    if (!this.active) return Promise.resolve();
    const target = this.targetKey;
    if (!target) {
      this.update({ ...this.state, pending: false, error: "이미지를 저장할 대상을 먼저 선택하세요." });
      return Promise.resolve();
    }
    const generation = this.generation;
    const request = ++this.latestRequest;
    const save = this.save;
    this.update({ ...this.state, pending: true, error: null });
    const current = () => this.active && this.generation === generation && this.latestRequest === request;
    const run = async () => {
      try {
        if (!current()) return;
        const payload = await this.read(image);
        // A queued/read-only request can be discarded; an already started save cannot.
        if (!current()) return;
        const saved = await save(target, payload);
        if (!saved) throw new Error("이미지를 저장하지 못했습니다.");
        if (!current()) return;
        const preview = this.makePreview(image);
        this.preview?.dispose();
        this.preview = preview;
        this.update({ previewUrl: preview.url, pending: false, error: null });
      } catch (error) {
        if (current()) this.update({ ...this.state, pending: false, error: error instanceof Error ? error.message : String(error) });
      }
    };
    const result = (this.queues.get(target) ?? Promise.resolve()).then(run, run);
    this.queues.set(target, result);
    const release = () => { if (this.queues.get(target) === result) this.queues.delete(target); };
    void result.then(release, release);
    return result;
  }

  private update(state: ImagePasteState) {
    this.state = state;
    this.publish(state);
  }
}
