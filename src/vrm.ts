import * as Three from "three";
// @ts-ignore
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
// @ts-ignore
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { VRM, VRMLoaderPlugin, VRMHumanBoneName } from "@pixiv/three-vrm";
import { MutableRefObject } from "react";

import { appWindow, currentMonitor, LogicalSize } from "@tauri-apps/api/window";

export const loadModel = <T extends Function>(
  render: HTMLDivElement,
  model: ArrayBuffer,
  lightP: number,
  onUpdate: MutableRefObject<T>,
) => {
  const scene = new Three.Scene();

  const renderer = new Three.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(render.clientWidth, render.clientHeight);
  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = true;
  const elem = renderer.domElement;
  elem.dataset.tauriDragRegion = "1";

  render.appendChild(elem);

  const camera = new Three.PerspectiveCamera(
    30.0,
    render.clientWidth / render.clientHeight,
    0.1,
    20.0,
  );
  camera.position.set(0.0, 0.6, -2.8);
  camera.rotation.set(0, Math.PI, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0.0, 0.6, 0.0);
  controls.update();

  let fixedCameraZ: number | undefined;

  let mouseWheel = 0;
  elem.addEventListener("wheel", (e) => {
    mouseWheel -= e.deltaY / 10;
    if (fixedCameraZ) {
      camera.position.z = fixedCameraZ;
    }
  });

  const light = new Three.DirectionalLight(0xffffff, lightP);
  light.position.set(0.0, 0.6, -1).normalize();
  light.castShadow = true;
  scene.add(light);
  const subLight = new Three.DirectionalLight(0xffffff, lightP);
  subLight.position.set(-2.0, 0.6, 1.0).normalize();
  subLight.castShadow = true;
  scene.add(subLight);

  let vrm: VRM | null = null;

  const loader = new GLTFLoader();
  loader.register((parser: any) => {
    return new VRMLoaderPlugin(parser);
  });
  loader.parse(
    model,
    "test.vrm",
    (gltf: any) => {
      vrm = gltf.userData.vrm;

      if (vrm) {
        vrm.humanoid
          .getRawBoneNode(VRMHumanBoneName.LeftUpperArm)
          ?.rotateZ(Math.PI / 2.6);
        vrm.humanoid
          .getRawBoneNode(VRMHumanBoneName.RightUpperArm)
          ?.rotateZ(Math.PI / -2.6);

        vrm.scene.traverse((object: any) => {
          object.castShadow = true;
        });
        scene.add(vrm.scene);
      }
    },
    (progress: any) => {
      console.log("loading: ", (100.0 * progress.loaded) / progress.total, "%");
    },
    (error: any) => {
      console.error(error);
    },
  );

  /*
  const back = new Three.Mesh(
    new Three.PlaneGeometry(16, 16, 1, 1),
    new Three.MeshStandardMaterial({
      color: 0xffffff,
    }),
  );
  back.position.set(-4, -4, -4);
  back.rotation.set(0, 0, 0);
  back.receiveShadow = true;
  scene.add(back);
  */

  const update = async () => {
    requestAnimationFrame(update);

    if (vrm) {
      const vrmBounding = new Three.Box3().setFromObject(vrm.scene);
      const vFOV = (camera.fov * Math.PI) / 180;
      const tan = Math.tan(vFOV / 2);
      fixedCameraZ = (vrmBounding.max.y - vrmBounding.min.y + 0.1) / -2 / tan;

      const aspect =
        (vrmBounding.max.x - vrmBounding.min.x) /
        (vrmBounding.max.y - vrmBounding.min.y);
      const width = (500 + mouseWheel) * aspect;
      const height = 500 + mouseWheel;
      appWindow.setSize(new LogicalSize(width, height));
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    //camera.position.z = Math.max((-1 * width) / 2 / tan, -2.8);
    if (onUpdate.current) {
      onUpdate.current(vrm);
    }

    renderer.render(scene, camera);
  };
  update();
};
