import { useState, useEffect, ChangeEventHandler } from "react";
import { readDir, createDir, exists } from "@tauri-apps/api/fs";
import { vrmDir } from "@/util/path";
import { writeModel } from "@/util/fetch";

type Props = {
  onSelect: (path: string) => any;
};

export default ({ onSelect }: Props) => {
  const [models, setModels] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const readModels = async () => {
    if (!(await exists(vrmDir))) {
      await createDir(vrmDir, { recursive: true });
    }
    const read = await readDir(vrmDir);
    const vrmFiles = read
      .filter((p) => p.path.endsWith(".vrm") && typeof p.name === "string")
      .map((p) => p.name!);
    setModels(vrmFiles);
  };
  useEffect(() => {
    readModels();
  }, []);

  const onFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (e.target instanceof HTMLInputElement) {
      let files = e.target.files;
      if (files && files.length === 1) {
        const file = files[0];
        if (file.name.endsWith(".vrm")) {
          setProcessing(true);
          (async () => {
            await writeModel(file.name, await file.arrayBuffer());
            e.target.files = null;
            await readModels();
            setProcessing(false);
          })();
          return;
        }
      }
    }
    alert("VRMモデルを選択してください");
  };
  return (
    <div>
      {processing ? (
        <p>処理中</p>
      ) : (
        <>
          <ul>
            {models.map((v) => (
              <li key={v}>
                <a
                  onClick={() => {
                    onSelect(v);
                  }}
                >
                  {v}
                </a>
              </li>
            ))}
          </ul>
          <p>
            VRMモデルをインポート：
            <input type="file" onChange={onFileChange} multiple={false} />
          </p>
        </>
      )}
    </div>
  );
};
