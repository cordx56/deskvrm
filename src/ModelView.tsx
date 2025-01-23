import { useRef, useState, useEffect, MouseEventHandler } from "react";
import { useParams } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import {
  appWindow,
  currentMonitor,
  getAll,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import "@/ModelView.css";
import { loadModel } from "./vrm";
import { readModel } from "@/util/fetch";

function App() {
  const render = useRef<HTMLDivElement>(null);
  const { vrm } = useParams<{ vrm: string }>();

  const [clickCount, setClickCount] = useState(0);

  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number } | null>(
    null,
  );

  const onUpdateRef = useRef((_vrm: VRM | null) => {});
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

    if (moveOffset) {
      appWindow.setPosition(
        new LogicalPosition(mouseX - moveOffset.x, mouseY - moveOffset.y),
      );
    }
  }, [mouseX, mouseY]);

  const onClick: MouseEventHandler = async (e) => {
    e.preventDefault();
    if (clickCount === 2) {
      const configWindow = getAll().find((v) => v.label === "config");
      if (configWindow) {
        await configWindow.show();
        await appWindow.close();
      }
    }
  };
  const onMouseDown: MouseEventHandler = async () => {
    setTimeout(() => {
      setClickCount(0);
    }, 600);
    setClickCount((prev) => prev + 1);
    const pos = (await appWindow.outerPosition()).toLogical(
      await appWindow.scaleFactor(),
    );
    if (clickCount == 0) {
      setMoveOffset({ x: mouseX - pos.x, y: mouseY - pos.y });
    }
  };

  useEffect(() => {
    (async () => {
      if (vrm) {
        const model = await readModel(vrm);
        if (model) {
          loadModel(render.current!, model.buffer, 2, onUpdateRef);
        }
      } else {
        appWindow.close();
      }
    })();
    listen("mouse_position", (event: any) => {
      setMouseX(event.payload.x);
      setMouseY(event.payload.y);
    });
  }, []);

  return (
    <>
      <div
        ref={render}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseUp={() => {
          setMoveOffset(null);
        }}
        className="render"
      ></div>
    </>
  );
}

export default App;
