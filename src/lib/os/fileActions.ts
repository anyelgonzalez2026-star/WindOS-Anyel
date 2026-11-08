import type { OSContextValue } from "./store";

/** Opens a virtual file with the most appropriate installed app. */
export function openFileNode(os: OSContextValue, id: string, payload?: Record<string, unknown>) {
  const node = os.fs.byId(id);
  if (!node) return;
  if (node.type === "folder") {
    os.openApp("files", { folderId: id });
    return;
  }
  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = node.mime ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
    os.openApp("photos", { openId: id });
  } else if (mime.startsWith("audio/") || mime.startsWith("video/") || ["mp3", "wav", "ogg", "mp4", "webm", "m4a"].includes(ext)) {
    os.openApp("media", { openId: id });
  } else if (ext === "pdf") {
    os.openApp("pdf", { openId: id });
  } else if (["zip", "7z", "rar"].includes(ext)) {
    os.openApp("zip", { openId: id });
  } else if (["md", "txt", "csv", "log"].includes(ext)) {
    os.openApp("notes", { openId: id });
  } else if (["js", "ts", "tsx", "jsx", "html", "css", "json"].includes(ext)) {
    os.openApp("code", { openId: id });
  } else if (["exe", "msi", "appx"].includes(ext)) {
    os.openApp("compat", { openId: id });
  } else {
    os.openApp(os.settings.preferredEditor ?? "code", { openId: id, ...payload });
  }
}
