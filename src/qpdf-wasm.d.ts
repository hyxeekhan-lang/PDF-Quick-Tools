/**
 * qpdf-wasm ships an Emscripten bundle with no types attached.
 *
 * Only the surface this project actually calls is declared here, rather than
 * accepting an implicit `any` across the module.
 */
declare module "qpdf-wasm/qpdf.js" {
  export interface QpdfFS {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  }

  export interface QpdfWasm {
    /** Runs the qpdf CLI with the given arguments. Throws with a `status` on a non-zero exit. */
    callMain(args: string[]): number;
    FS: QpdfFS;
  }

  export default function init(options: {
    locateFile: (path: string) => string;
  }): Promise<QpdfWasm>;
}