import { useMemo } from 'react'
import { diffLines } from 'diff'
import { Plus, Minus } from 'lucide-react'

export default function DiffView({ originalCode, newCode }) {
  const { chunks, addedCount, removedCount } = useMemo(() => {
    const parts = diffLines(originalCode ?? '', newCode ?? '')
    let added = 0
    let removed = 0

    for (const part of parts) {
      const lineCount = part.count ?? part.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || part.value.endsWith('\n')).length
      if (part.added) added += lineCount
      if (part.removed) removed += lineCount
    }

    return { chunks: parts, addedCount: added, removedCount: removed }
  }, [originalCode, newCode])

  return (
    <div className="rounded-xl overflow-hidden border border-bg-border bg-bg-primary">
      {/* Summary header */}
      <div className="flex items-center gap-4 px-4 py-2 bg-bg-elevated border-b border-bg-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Diff</span>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1 text-xs font-mono font-semibold text-accent-green">
            <Plus className="w-3 h-3" />
            {addedCount} {addedCount === 1 ? 'line' : 'lines'}
          </span>
          <span className="flex items-center gap-1 text-xs font-mono font-semibold text-accent-red">
            <Minus className="w-3 h-3" />
            {removedCount} {removedCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
      </div>

      {/* Diff body */}
      <div className="overflow-auto max-h-[400px] scrollbar-thin">
        <pre className="text-xs font-mono leading-relaxed">
          {chunks.map((part, partIndex) => {
            // Split the value into lines, preserving empty trailing entries carefully
            const raw = part.value
            const lines = raw.split('\n')
            // diffLines appends a trailing \n to the last line of a chunk so we
            // get one spurious empty string – drop it only if the chunk itself
            // ended with \n (which it almost always does).
            const displayLines = raw.endsWith('\n') ? lines.slice(0, -1) : lines

            return displayLines.map((line, lineIndex) => {
              if (part.added) {
                return (
                  <div key={`${partIndex}-${lineIndex}`} className="diff-added flex">
                    <span className="select-none text-accent-green/60 w-4 shrink-0 mr-2">+</span>
                    <span className="text-accent-green whitespace-pre">{line}</span>
                  </div>
                )
              }

              if (part.removed) {
                return (
                  <div key={`${partIndex}-${lineIndex}`} className="diff-removed flex">
                    <span className="select-none text-accent-red/60 w-4 shrink-0 mr-2">−</span>
                    <span className="text-accent-red whitespace-pre">{line}</span>
                  </div>
                )
              }

              // Unchanged line
              return (
                <div key={`${partIndex}-${lineIndex}`} className="flex px-2">
                  <span className="select-none text-gray-700 w-4 shrink-0 mr-2"> </span>
                  <span className="text-gray-500 whitespace-pre">{line}</span>
                </div>
              )
            })
          })}
        </pre>
      </div>
    </div>
  )
}
