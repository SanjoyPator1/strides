'use client'

export interface TabsProps {
  labels: string[]
  active: number
  /**
   * Optional so Tabs can render as a static, non-interactive indicator too (e.g. a
   * display-only demo authored directly in MDX, which — being server-rendered — can't pass
   * a working callback down to a client component like this one; only a stateful client
   * component wrapping Tabs can do that). Real interactive usage should always pass this.
   */
  onChange?: (index: number) => void
}

/** A small controlled tab strip — e.g. picking which batch index a TensorSlices view shows. */
export function Tabs({ labels, active, onChange }: TabsProps) {
  return (
    <div className="strides-tabs" role="tablist">
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={index === active}
          className={index === active ? 'strides-tab strides-tab--active' : 'strides-tab'}
          onClick={() => onChange?.(index)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
