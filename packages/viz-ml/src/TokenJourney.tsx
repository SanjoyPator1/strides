'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Matrix } from '@strides/viz'
import { tokenColor, tokenColorSoft } from './token-colors'

export interface JourneyToken {
  /** Exact token text, including any leading space GPT-2's BPE keeps (e.g. " journey"). */
  text: string
  id: number
  embedding: number[]
}

export interface JourneySequence {
  /** Defaults to "batch {index}". */
  label?: string
  /** The raw sentence, shown before tokenization. */
  text: string
  tokens: JourneyToken[]
}

export interface TokenJourneyProps {
  sequences: JourneySequence[]
  precision?: number
}

/** Leading space made visible — BPE tokens like " journey" carry their space, and readers should see it. */
function visibleTokenText(text: string): string {
  return text.replace(/^ /, '␣')
}

interface Trail {
  seq: number
  token?: number
  stage?: 'id' | 'embedding'
}

/**
 * Drills through *stages of representation* rather than tensor dimensions: batch →
 * sentence → token chips → token id → embedding row. Parents stay visible as each
 * stage unfolds beneath them, and every token keeps one deterministic color for the
 * whole page (see token-colors.ts). The first sequence and its first token start
 * fully open so a complete text→embedding path is visible without any clicks.
 */
export function TokenJourney({ sequences, precision = 2 }: TokenJourneyProps) {
  const [expandedSeqs, setExpandedSeqs] = useState<Set<number>>(() => new Set([0]))
  const [openTokens, setOpenTokens] = useState<Set<string>>(() => new Set(['0:0']))
  const [openEmbeddings, setOpenEmbeddings] = useState<Set<string>>(() => new Set(['0:0']))
  const [trail, setTrail] = useState<Trail>({ seq: 0, token: 0, stage: 'embedding' })

  const toggleSeq = (seqIndex: number) => {
    setExpandedSeqs((current) => {
      const next = new Set(current)
      if (next.has(seqIndex)) next.delete(seqIndex)
      else next.add(seqIndex)
      return next
    })
    setTrail({ seq: seqIndex })
  }

  const toggleToken = (seqIndex: number, tokenIndex: number) => {
    const key = `${seqIndex}:${tokenIndex}`
    setOpenTokens((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setTrail({ seq: seqIndex, token: tokenIndex, stage: 'id' })
  }

  const toggleEmbedding = (seqIndex: number, tokenIndex: number) => {
    const key = `${seqIndex}:${tokenIndex}`
    setOpenEmbeddings((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setTrail({ seq: seqIndex, token: tokenIndex, stage: 'embedding' })
  }

  return (
    <div className="strides-token-journey">
      <Breadcrumb trail={trail} sequences={sequences} />
      {sequences.map((sequence, seqIndex) => {
        const label = sequence.label ?? `batch ${seqIndex}`
        const isExpanded = expandedSeqs.has(seqIndex)
        return (
          <div key={seqIndex} className="strides-token-journey-sequence">
            <button
              type="button"
              className="strides-token-journey-sequence-toggle"
              aria-expanded={isExpanded}
              onClick={() => toggleSeq(seqIndex)}
            >
              <span className="strides-token-journey-caret">{isExpanded ? '▾' : '▸'}</span>
              <span className="strides-token-journey-sequence-label">{label}</span>
              <span className="strides-token-journey-sequence-text">“{sequence.text}”</span>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  className="strides-token-journey-tokens"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="strides-token-journey-stage-label">
                    tokens ({sequence.tokens.length})
                  </div>
                  <div className="strides-token-journey-chips">
                    {sequence.tokens.map((token, tokenIndex) => {
                      const key = `${seqIndex}:${tokenIndex}`
                      const isOpen = openTokens.has(key)
                      return (
                        <button
                          key={tokenIndex}
                          type="button"
                          className="strides-token-journey-chip"
                          aria-expanded={isOpen}
                          style={{
                            background: tokenColorSoft(token.id),
                            borderBottomColor: tokenColor(token.id),
                          }}
                          onClick={() => toggleToken(seqIndex, tokenIndex)}
                        >
                          {visibleTokenText(token.text)}
                        </button>
                      )
                    })}
                  </div>
                  {sequence.tokens.map((token, tokenIndex) => {
                    const key = `${seqIndex}:${tokenIndex}`
                    if (!openTokens.has(key)) return null
                    return (
                      <TokenDetail
                        key={tokenIndex}
                        token={token}
                        precision={precision}
                        showEmbedding={openEmbeddings.has(key)}
                        onToggleEmbedding={() => toggleEmbedding(seqIndex, tokenIndex)}
                      />
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

function Breadcrumb({ trail, sequences }: { trail: Trail; sequences: JourneySequence[] }) {
  const sequence = sequences[trail.seq]
  if (!sequence) return null
  const label = sequence.label ?? `batch ${trail.seq}`
  const token = trail.token !== undefined ? sequence.tokens[trail.token] : undefined
  return (
    <div className="strides-token-journey-breadcrumb" aria-label="Current path">
      <span>{label}</span>
      {token && (
        <>
          <span className="strides-token-journey-breadcrumb-sep">›</span>
          <span style={{ color: tokenColor(token.id), fontWeight: 600 }}>
            “{visibleTokenText(token.text)}”
          </span>
          <span className="strides-token-journey-breadcrumb-sep">›</span>
          <span>id {token.id}</span>
          {trail.stage === 'embedding' && (
            <>
              <span className="strides-token-journey-breadcrumb-sep">›</span>
              <span>embedding</span>
            </>
          )}
        </>
      )}
    </div>
  )
}

interface TokenDetailProps {
  token: JourneyToken
  precision: number
  showEmbedding: boolean
  onToggleEmbedding: () => void
}

function TokenDetail({ token, precision, showEmbedding, onToggleEmbedding }: TokenDetailProps) {
  const color = tokenColor(token.id)
  return (
    <motion.div
      className="strides-token-journey-detail"
      style={{ borderLeftColor: color }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="strides-token-journey-detail-row">
        <span className="strides-token-journey-detail-token" style={{ color }}>
          “{visibleTokenText(token.text)}”
        </span>
        <span className="strides-token-journey-arrow">→</span>
        <span className="strides-token-journey-id" style={{ borderColor: color }}>
          id {token.id}
        </span>
        <span className="strides-token-journey-arrow">→</span>
        <button
          type="button"
          className="strides-token-journey-embedding-toggle"
          aria-expanded={showEmbedding}
          onClick={onToggleEmbedding}
        >
          {showEmbedding ? 'hide embedding' : 'embedding'}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {showEmbedding && (
          <motion.div
            className="strides-token-journey-embedding"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <div className="strides-token-journey-stage-label">
              embedding (d = {token.embedding.length})
            </div>
            <Matrix values={[token.embedding]} colorScale="diverging" precision={precision} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
