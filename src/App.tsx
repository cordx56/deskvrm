import { appWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { exit } from "@tauri-apps/api/process";
import VrmLibrary from "@/components/VrmLibrary";
import "@/App.css";

export default () => {
  const onVrmSelect = async (name: string) => {
    emit("modelView", { vrm: encodeURIComponent(name) });
    await appWindow.hide();
  };
  return (
    <div className="ui">
      <h3>VRMモデル一覧</h3>
      <VrmLibrary onSelect={onVrmSelect} />
      <p>
        <button
          type="button"
          onClick={() => {
            exit(0);
          }}
        >
          終了
        </button>
      </p>
    </div>
  );
};
