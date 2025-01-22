export const listModel = async (): Promise<string[]> => {
  const resp = await fetch(new URL(`http://localhost:8108/vrm`));
  if (resp.ok) {
    return (await resp.json()).models;
  } else {
    return [];
  }
};

export const readModel = async (name: string): Promise<Uint8Array | null> => {
  const resp = await fetch(new URL(`http://localhost:8108/vrm/${name}`));
  if (resp.ok) {
    return new Uint8Array(await resp.arrayBuffer());
  } else {
    return null;
  }
};

export const writeModel = async (name: string, body: ArrayBufferLike) => {
  await fetch(new URL(`http://localhost:8108/vrm/${name}`), {
    method: "POST",
    body,
  });
};
