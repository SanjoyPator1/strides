import { describe, expect, it } from 'vitest'
import { compile } from '@mdx-js/mdx'
import { remarkCellPlugin } from './remark-cell-plugin'

async function compileWithPlugin(source: string): Promise<string> {
  const file = await compile(source, { remarkPlugins: [remarkCellPlugin] })
  return String(file)
}

describe('remarkCellPlugin', () => {
  it('transforms a python cell fence into a PyCell element with index 0', async () => {
    const out = await compileWithPlugin(['```python cell', 'print(1)', '```'].join('\n'))
    expect(out).toContain('_jsx(PyCell')
    expect(out).toContain('code: "print(1)"')
    expect(out).toContain('index: "0"')
  })

  it('assigns sequential indices across multiple cells, counting only cell fences', async () => {
    const out = await compileWithPlugin(
      ['```python cell', 'a = 1', '```', '', '```python', '# static, not a cell', '```', '', '```python cell', 'b = 2', '```'].join(
        '\n',
      ),
    )
    expect(out).toContain('index: "0"')
    expect(out).toContain('index: "1"')
    expect(out).not.toContain('index: "2"')
  })

  it('leaves static fences (no "cell" meta) untouched', async () => {
    const out = await compileWithPlugin(['```python', 'print("static")', '```'].join('\n'))
    expect(out).not.toContain('PyCell')
  })

  it('leaves fences with unrelated meta untouched', async () => {
    const out = await compileWithPlugin(['```python title="example.py"', 'print("static")', '```'].join('\n'))
    expect(out).not.toContain('PyCell')
  })

  it('preserves code containing backtick fences nested inside a longer fence delimiter', async () => {
    const source = ['````python cell', 'print("```")', '````'].join('\n')
    const out = await compileWithPlugin(source)
    expect(out).toContain('PyCell')
    expect(out).toContain('print(\\"```\\")')
  })

  it('errors on non-python "cell" fences', async () => {
    await expect(compileWithPlugin(['```javascript cell', 'console.log(1)', '```'].join('\n'))).rejects.toThrow(
      /only ```python cell``` fences are supported/,
    )
  })
})
