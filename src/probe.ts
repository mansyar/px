/**
 * Runtime contract probe.
 *
 * The byte-identical PNG guarantee rests on the zlib implementation shipped
 * with the pinned Node major, so the CLI reports the runtime it is executing on
 * and whether that major is the supported one.
 */

export const PINNED_NODE_MAJOR = 24;
export const RESPONSE_VERSION = 1;

export interface RuntimeProbe {
  node: string;
  pinned_major: number;
  supported: boolean;
}

export function probeRuntime(versions: { node: string } = process.versions): RuntimeProbe {
  const node = versions.node;
  const major = Number.parseInt(node.split('.')[0] ?? '', 10);
  return {
    node,
    pinned_major: PINNED_NODE_MAJOR,
    supported: major === PINNED_NODE_MAJOR,
  };
}
