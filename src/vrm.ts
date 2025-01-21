import * as Three from "three";
// @ts-ignore
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
// @ts-ignore
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { VRM, VRMLoaderPlugin, VRMHumanBoneName } from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";
import { MutableRefObject } from "react";

import { appWindow, LogicalSize } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";

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
  camera.position.set(0.0, 0.0, -2.8);
  camera.rotation.set(0, Math.PI, 0);

  const light = new Three.DirectionalLight(0xffffff, lightP);
  light.position.set(0.0, 0.0, -1).normalize();
  scene.add(light);
  const shadowLight = new Three.DirectionalLight(0xffffff, 1);
  shadowLight.position.set(-0.5, -3.0, -10.0).normalize();
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.width = 2048;
  shadowLight.shadow.mapSize.height = 2048;
  //shadowLight.shadow.radius = 5;
  scene.add(shadowLight);

  let vrm: VRM | null = null;
  let mixer: Three.AnimationMixer | null = null;

  const loader = new GLTFLoader();
  loader.register((parser: any) => {
    return new VRMLoaderPlugin(parser);
  });
  loader.register((parser: any) => {
    return new VRMAnimationLoaderPlugin(parser);
  });
  loader.parse(
    model,
    "test.vrm",
    (gltf: any) => {
      vrm = gltf.userData.vrm;

      if (vrm) {
        scene.add(vrm.scene);

        vrm.humanoid
          .getRawBoneNode(VRMHumanBoneName.LeftUpperArm)
          ?.rotateZ(Math.PI / 2.6);
        vrm.humanoid
          .getRawBoneNode(VRMHumanBoneName.RightUpperArm)
          ?.rotateZ(Math.PI / -2.6);
        vrm.scene.traverse((object) => {
          object.castShadow = true;
        });

        /*
        loader.load("/ashi_batabata.vrma", (gltf: any) => {
          if (vrm) {
            const vrmAnimations = gltf.userData.vrmAnimations;
            if (vrmAnimations == null) {
              return;
            }
            animation = vrmAnimations[0] ?? null;
            // animation
            //mixer = new Three.AnimationMixer(vrm.scene);
            //const clip = createVRMAnimationClip(animation, vrm);
            //mixer.clipAction(clip).play();
          }
        });
        */
      }
    },
    (progress: any) => {
      console.log("loading: ", (100.0 * progress.loaded) / progress.total, "%");
    },
    (error: any) => {
      console.error(error);
    },
  );

  const back = new Three.Mesh(
    new Three.BoxGeometry(100, 100, 1),
    new Three.ShadowMaterial({ opacity: 0.5 }),
  );
  back.position.set(0, 0, 2);
  back.receiveShadow = true;
  scene.add(back);

  const clock = new Three.Clock();
  clock.start();

  // mouse events
  let mouseWheel = 0;
  elem.addEventListener("wheel", (e) => {
    mouseWheel -= e.deltaY / 10;
  });
  let mouseDownTime = 0;
  let mouseDownCount = 0;
  elem.addEventListener("mousedown", () => {
    mouseDownTime = new Date().getTime();
    mouseDownCount += 1;
  });
  elem.addEventListener("mouseleave", () => {
    emit("cursor_grab", { grab: false });
  });
  elem.addEventListener("mouseup", () => {
    emit("cursor_grab", { grab: false });
    if (new Date().getTime() - mouseDownTime < 500) {
      if (mouseDownCount === 2) {
        // show menu
      }
    } else {
      mouseDownCount = 0;
    }
  });
  elem.addEventListener("mousemove", (e) => {
    if (mouseDownCount === 2) {
      if (vrm) {
        emit("cursor_grab", { grab: true });
        vrm.scene.rotation.x -= e.movementY / 100 / Math.PI / 2;
        vrm.scene.rotation.y += e.movementX / 100 / Math.PI / 2;
      }
    }
  });

  const update = async () => {
    requestAnimationFrame(update);

    const delta = clock.getDelta();
    if (mixer) {
      // animation
      //mixer.update(delta);
    }
    if (vrm) {
      //vrm.update(delta);
    }

    if (vrm) {
      vrm.scene.position.x = 0;
      vrm.scene.position.y = 0;
      vrm.scene.position.z = 0;
      const currentBounding = new Three.Box3().setFromObject(vrm.scene);
      vrm.scene.position.x =
        (currentBounding.max.x + currentBounding.min.x) / -2;
      vrm.scene.position.y =
        (currentBounding.max.y + currentBounding.min.y) / -2;
      vrm.scene.position.z =
        (currentBounding.max.z + currentBounding.min.z) / -2;
      const vrmBounding = new Three.Box3().setFromObject(vrm.scene);

      back.position.z = vrmBounding.max.z + 1;

      const vFOV = (camera.fov * Math.PI) / 180;
      const tan = Math.tan(vFOV / 2);
      camera.position.z =
        (vrmBounding.max.y - vrmBounding.min.y + 0.1) / -2 / tan;

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

    if (onUpdate.current) {
      onUpdate.current(vrm);
    }

    renderer.render(scene, camera);
  };
  update();
};
