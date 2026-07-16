import type { CellOutput } from '../output-types'

const ANSI_ESCAPE_RE = /\x1b\[[0-9;]*m/g
const TRACEBACK_COLLAPSE_THRESHOLD = 20

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_RE, '')
}

export interface OutputViewProps {
  output: CellOutput
  /** Live outputs carry base64 image data; frozen (snapshot) outputs carry an asset path. */
  source: 'live' | 'frozen'
}

export function OutputView({ output, source }: OutputViewProps) {
  if (output.type === 'stream') {
    return <pre className="strides-cell-output strides-cell-output-stream">{stripAnsi(output.text)}</pre>
  }

  if (output.type === 'execute_result' || output.type === 'display_data') {
    const png = output.data['image/png']
    const text = output.data['text/plain']
    return (
      <div className="strides-cell-output strides-cell-output-data">
        {png ? <img className="strides-cell-output-image" alt="" src={imageSrc(png, source)} /> : null}
        {!png && text ? <pre>{text}</pre> : null}
      </div>
    )
  }

  const lines = stripAnsi(output.traceback.join('\n')).split('\n')
  const collapsed = lines.length > TRACEBACK_COLLAPSE_THRESHOLD

  return (
    <div className="strides-cell-output strides-cell-output-error">
      <p>
        <strong>
          {output.ename}: {output.evalue}
        </strong>
      </p>
      {collapsed ? (
        <details>
          <summary>Traceback ({lines.length} lines)</summary>
          <pre>{lines.join('\n')}</pre>
        </details>
      ) : (
        <pre>{lines.join('\n')}</pre>
      )}
    </div>
  )
}

function imageSrc(value: string, source: 'live' | 'frozen'): string {
  return source === 'live' ? `data:image/png;base64,${value}` : `/_strides/${value}`
}
