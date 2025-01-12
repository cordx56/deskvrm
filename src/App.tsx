import { useRef, useState, ChangeEventHandler } from "react";
import { exit } from "@tauri-apps/api/process";
import "./App.css";
import { loadModel } from "./vrm";

function App() {
  const render = useRef<HTMLDivElement>(null);
  const fileSelect = useRef<HTMLDivElement>(null);
  const [doubleClick, setDoubleClick] = useState<number | null>(null);

  const onFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (e.target instanceof HTMLInputElement && render.current) {
      let files = e.target.files;
      if (files && files.length === 1) {
        const file = files[0];
        const data = await file.arrayBuffer();
        loadModel(render.current, data);
      }
      if (fileSelect.current) {
        fileSelect.current.style.display = "none";
      }
    }
  };

  const onClick = async () => {
    if (typeof doubleClick === "number") {
      await exit(0);
    }
    const timeout = setTimeout(() => {
      setDoubleClick(null);
    }, 300);
    setDoubleClick(timeout);
  };

  return (
    <div
      ref={render}
      onClick={onClick}
      className="render"
      data-tauri-drag-region={true}
    >
      <div ref={fileSelect} className="file">
        <div className="file-selector">
          ここをクリックしてファイル選択
          <input type="file" onChange={onFileChange} />
        </div>
        <button
          type="button"
          onClick={async () => {
            await exit(0);
          }}
        >
          終了
        </button>
      </div>
    </div>
  );
}

export default App;
