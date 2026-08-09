import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, FileText, X } from 'lucide-react'

const ACCEPTED_EXT = ['.csv', '.xls', '.xlsx', '.doc', '.docx']
const ACCEPTED_ATTR = ACCEPTED_EXT.join(',')

function iconFor(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  if (ext === '.csv' || ext === '.xls' || ext === '.xlsx') return FileSpreadsheet
  return FileText
}

function isAccepted(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  return ACCEPTED_EXT.includes(ext)
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileDropzone({ files, onFilesChange }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const addFiles = useCallback(
    (incoming) => {
      const list = Array.from(incoming)
      const accepted = list.filter(isAccepted)
      const rejected = list.length - accepted.length
      setError(rejected > 0 ? `${rejected} file${rejected > 1 ? 's' : ''} skipped — only CSV, Excel, and Word files are accepted.` : '')
      if (accepted.length) onFilesChange([...files, ...accepted])
    },
    [files, onFilesChange]
  )

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const removeFile = (index) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative overflow-hidden cursor-pointer rounded-sm border-2 border-dashed px-8 py-14 text-center transition-colors duration-200 ${
          isDragging ? 'border-signal bg-signal/5' : 'border-paper/25 hover:border-paper/45'
        }`}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
            <div className="h-px w-full bg-signal/70 animate-scanline" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTR}
          className="hidden"
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-paper/25">
          <UploadCloud size={24} strokeWidth={1.75} className="text-signal" />
        </div>
        <p className="font-display text-xl text-paper">Drop your datasets here</p>
        <p className="mt-1.5 font-body text-sm text-slatelight">or click to browse — you can add multiple files at once</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {ACCEPTED_EXT.map((ext) => (
            <span key={ext} className="eyebrow rounded-full border border-paper/20 px-2.5 py-1 text-paper/70">
              {ext}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 font-mono text-xs text-alert">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-5 space-y-2">
          {files.map((file, i) => {
            const Icon = iconFor(file.name)
            return (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-sm border border-paper/15 bg-paper/[0.04] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon size={16} className="shrink-0 text-signal" />
                  <span className="truncate font-mono text-sm text-paper">{file.name}</span>
                  <span className="shrink-0 font-mono text-xs text-slatelight">{formatSize(file.size)}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  className="shrink-0 text-slatelight hover:text-paper"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
