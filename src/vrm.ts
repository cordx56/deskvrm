import * as Three from "three";
// @ts-ignore
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
//import { OrbitControls } from "three/addons/controls/OrbitControls";
import { VRM, VRMLoaderPlugin, VRMHumanBoneName } from "@pixiv/three-vrm";

export const loadModel = (render: HTMLDivElement, model: ArrayBuffer) => {
  const scene = new Three.Scene();

  const renderer = new Three.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio * 4);
  renderer.setSize(render.clientWidth, render.clientHeight);
  renderer.setClearAlpha(0);
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
  /*
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0.0, 0.6, 0.0);
  controls.update();
  */

  const light = new Three.DirectionalLight(0xffffff);
  light.position.set(-1, -1, -1).normalize();
  scene.add(light);

  const loader = new GLTFLoader();
  loader.register((parser: any) => {
    return new VRMLoaderPlugin(parser);
  });
  loader.parse(
    model,
    "test.vrm",
    (gltf: any) => {
      const vrm: VRM = gltf.userData.vrm;

      vrm.humanoid
        .getBoneNode(VRMHumanBoneName.LeftUpperArm)
        ?.rotateZ(Math.PI / 2.6);
      vrm.humanoid
        .getBoneNode(VRMHumanBoneName.RightUpperArm)
        ?.rotateZ(Math.PI / -2.6);
      scene.add(vrm.scene);
    },
    (progress: any) => {
      console.log("loading: ", (100.0 * progress.loaded) / progress.total, "%");
    },
    (error: any) => {
      console.error(error);
    },
  );

  const update = () => {
    requestAnimationFrame(update);
    renderer.render(scene, camera);
  };
  update();
};
