import { appLocalDataDir, join } from "@tauri-apps/api/path";

export const dataDir = await appLocalDataDir();
export const vrmDir = await join(dataDir, "vrm");
