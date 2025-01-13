import {
  useRef,
  useState,
  useEffect,
  ChangeEventHandler,
  MouseEventHandler,
} from "react";
import { exit } from "@tauri-apps/api/process";
import { listen } from "@tauri-apps/api/event";
import { appWindow, currentMonitor } from "@tauri-apps/api/window";
import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import "./App.css";
import { loadModel } from "./vrm";

function App() {
  const render = useRef<HTMLDivElement>(null);
  const fileSelect = useRef<HTMLDivElement>(null);
  const [clickCount, setClickCount] = useState(0);
  const [light, setLight] = useState(2);

  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const onUpdateRef = useRef((_vrm: VRM | null) => { });
  useEffect(() => {
    onUpdateRef.current = async (vrm: VRM | null) => {
      if (vrm) {
        const monitor = await currentMonitor();
        if (monitor) {
          const windowPosition = await appWindow.outerPosition();
          const rotationY = Math.max(
            Math.min(
              ((Math.PI / 4) * (mouseX - windowPosition.x)) /
              (monitor.position.x + monitor.size.width),
              Math.PI / 4,
            ),
            Math.PI / -4,
          );
          const rotationX = Math.max(
            Math.min(
              ((Math.PI / 4) * (windowPosition.y - mouseY)) /
              (monitor.position.y + monitor.size.height),
              Math.PI / 4,
            ),
            Math.PI / -4,
          );
          let head = vrm.humanoid.getRawBoneNode(VRMHumanBoneName.Head);
          if (head) {
            head.rotation.x = rotationX;
            head.rotation.y = rotationY;
          }
        }
      }
    };
  }, [mouseX, mouseY]);

  const onFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (e.target instanceof HTMLInputElement && render.current) {
      let files = e.target.files;
      if (files && files.length === 1) {
        const file = files[0];
        const data = await file.arrayBuffer();
        loadModel(render.current, data, light, onUpdateRef);
      }
      if (fileSelect.current) {
        fileSelect.current.style.display = "none";
      }
    }
  };

  const onClick: MouseEventHandler = async () => {
    setTimeout(() => {
      setClickCount(0);
    }, 400);
    setClickCount((prev) => prev + 1);
    if (clickCount === 2) {
      await exit(0);
    }
  };

  useEffect(() => {
    listen("mouse_position", (event: any) => {
      setMouseX(event.payload.x);
      setMouseY(event.payload.y);
    });
  }, []);

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

        <p>
          ライトの強さ:
          <input
            type="number"
            value={light}
            onChange={(e) => {
              setLight(parseInt(e.target.value));
            }}
          />
        </p>

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
