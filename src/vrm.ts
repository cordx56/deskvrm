import * as Three from "three";
// @ts-ignore
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
// @ts-ignore
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { VRM, VRMLoaderPlugin, VRMHumanBoneName } from "@pixiv/three-vrm";
import { MutableRefObject } from "react";

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
  renderer.setPixelRatio(window.devicePixelRatio * 2);
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

  const update = () => {
    requestAnimationFrame(update);
    if (onUpdate.current) {
      onUpdate.current(vrm);
    }
    renderer.render(scene, camera);
  };
  update();
};
