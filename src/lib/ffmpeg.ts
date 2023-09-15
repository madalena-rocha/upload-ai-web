import { FFmpeg } from '@ffmpeg/ffmpeg'

import coreURL from '../ffmpeg/ffmpeg-core.js?url'
import wasmURL from '../ffmpeg/ffmpeg-core.wasm?url'
import workerURL from '../ffmpeg/ffmpeg-worker.js?url'
// ?url para não fazer a importação direta do arquivo quando o arquivo for carregar
// Vai importar o arquivo via url, carregando o arquivo assincronamente

let ffmpeg: FFmpeg | null // a FFmpeg só será carregada quando for utilizá-la

export async function getFFmpeg() {
  if (ffmpeg) {
    return ffmpeg
  }

  ffmpeg = new FFmpeg()

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    })
  }

  return ffmpeg
}