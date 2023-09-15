import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
}

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log('Convert started.')

    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))
    // writeFile() serve para colocar um arquivo dentro do contexto do ffmpeg
    // Ao usar o WebAssembly, é como se o ffmpeg não tivesse rodando na máquina do usuário, mas sim num ambiente totalmente isolado, não tendo acesso aos arquivos da aplicação
    // Criar um arquivo dentro da máquina que o ffmpeg consegue enxergar
    // fetchFile() recebe um arquivo e converte numa representação binária do arquivo
  
    // ffmpeg.on('log', log => {
    //   console.log(log)
    // })
    
    ffmpeg.on('progress', progress => {
      console.log('Convert progress: ' + Math.round(progress.progress * 100))
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    console.log('Convert finished.')

    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value
    // A Ref serve para acessar a versão do elemento na DOM
    // A Ref demora um pouco para ser criada, por isso o ?

    if (!videoFile) {
      return
    }

    // Converter o vídeo em áudio
    // A API da OpenAI só suporta até 25mb
    // Possibilidade de diminuir consideravelmente a qualidade do áudio para caber mais áudio dentro de 25mb
    // Ao diminuir a quantidade de mb, o upload para a API da OpenAI e para o back-end será mais rápido
  
    // Converter o vídeo em áudio no navegador do usuário
    // O WebAssembly permite executar binários, linguagens que não são feitas para executar no navegador, dentro do navegador
    // O ffmpeg é a biblioteca mais famosa para edição de vídeo e áudio dentro do node
  
    setStatus('converting')
    
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generating')

    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    })

    setStatus('success')

    props.onVideoUploaded(videoId)
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile) // createObjectURL cria uma url de pré-visualização de um arquivo
  }, [videoFile])

  // No React, ao fazer a atualização de um estado, o conteúdo do componente é recalculado do zero
  // A previewURL permite fazer uma pré-visualização do vídeo que o usuário fez upload
  // A previewURL não deve ser gerada do zero toda vez que o componente for renderizado novamente
  // O useMemo permite que a variável previewURL seja recarregada somente se o videoFile mudar

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewURL ? (
          <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== 'waiting'}
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
        />
      </div>

      <Button 
        // data atributes do HTML geralmente são usados para representar um estado do elemento em tela
        data-success={status === 'success'} // true quando o status for success
        disabled={status !== 'waiting'} 
        type="submit" 
        className="w-full data-[success=true]:bg-emerald-400"
      >
        {status === 'waiting'? (
          <>
            Carregar video
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : statusMessages[status]}
      </Button>
    </form>
  )
}