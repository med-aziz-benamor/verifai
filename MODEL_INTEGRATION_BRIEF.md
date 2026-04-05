# Verifai Email Analysis Model Brief

## Goal

Build the core model/service that helps Verifai answer a simple user question:

`Can I trust this email or should I be careful?`

The user-facing product should feel reassuring and clear, not overly technical. The model is not expected to declare absolute truth in every case. It should return a risk-based authenticity judgment with concise reasons.

## Product framing

Verifai should help detect whether an email or its claims are:

- likely authentic
- suspicious and needs manual verification
- possibly manipulated or misleading
- likely AI-generated or stylistically synthetic

The final UX should prioritize:

- clear verdict
- confidence score
- short explanation
- a few concrete reasons

## Current backend integration

The FastAPI backend already supports an external model via:

- env var: `VERIFAI_AUTH_MODEL_URL`

When set, the backend sends a `POST` request to that URL with this JSON body:

```json
{
  "content": "email body text or snippet",
  "subject": "optional email subject",
  "sender": "optional sender address",
  "links": ["https://example.com"],
  "source_type": "email"
}
```

This matches the current backend schema in:

- [backend/app/schemas/analysis.py](C:/Users/GIGABYTE/Desktop/verifai/backend/app/schemas/analysis.py)
- [backend/app/services/analysis_service.py](C:/Users/GIGABYTE/Desktop/verifai/backend/app/services/analysis_service.py)

## Required response format

Your model service should return JSON in this exact shape:

```json
{
  "verdict": "needs_review",
  "confidence": 78,
  "summary": "This email contains urgency tactics and weak source credibility, so it should be verified before being trusted or shared.",
  "risk_scores": {
    "ai_generated": 40,
    "manipulated_reality": 55,
    "misleading_context": 72,
    "source_credibility_risk": 68
  },
  "evidence": [
    {
      "label": "Urgency language",
      "detail": "The message pushes immediate action and discourages double-checking.",
      "score_impact": 24
    },
    {
      "label": "Weak source trust",
      "detail": "The sender and linked domains do not appear strongly credible for the claim being made.",
      "score_impact": 20
    }
  ]
}
```

## Allowed verdict values

Only return one of:

- `likely_authentic`
- `needs_review`
- `suspicious`

## Risk score definitions

All risk scores are integers from `0` to `100`.

### `ai_generated`

How likely the language, style, or structure suggests synthetic/AI-assisted generation.

This should look for signals like:

- generic polished persuasion
- over-optimized structure
- repetitive marketing-style phrasing
- unnatural fluency with low factual grounding
- broad claims with low specificity

### `manipulated_reality`

How likely the email contains content that distorts reality or presents altered evidence as real.

This should look for:

- claims of “proof” without trustworthy support
- references to edited or suspicious images/videos
- sensational claims tied to unverifiable media
- contradictory factual cues
- fabricated-seeming events

### `misleading_context`

How likely the email presents real-looking content in a false or misleading framing.

This should look for:

- real media or facts used with wrong time/location/context
- emotional framing that changes interpretation
- quote/image/video reuse with misleading claim text
- “share now before deleted” framing
- selective omission that changes meaning

### `source_credibility_risk`

How risky the sender/source is, based on credibility signals.

This should look for:

- weak or suspicious sender domain
- mismatch between claim gravity and source trust
- risky redirecting or low-trust links
- impersonation patterns
- no supporting source when one should exist

## Input signals the model should use

For the hackathon MVP, the model should use:

- email body content
- subject line
- sender address
- extracted links

If useful, derive secondary features from them:

- urgency / manipulation language
- source trust indicators
- claim structure
- contextual framing
- link/domain quality
- linguistic AI-generation cues

## What the model should optimize for

### 1. Good user judgment support

The output should help a normal user decide:

- trust it
- pause and verify
- do not trust it yet

### 2. Clear evidence

Evidence should be human-readable, short, and concrete.

Good evidence examples:

- `The message asks you to share immediately before checking the source.`
- `The sender domain looks weak for a high-stakes public claim.`
- `The email makes strong factual claims without linking to a credible source.`

Bad evidence examples:

- `Classifier score exceeded threshold.`
- `Embedding mismatch.`
- `Transformer attention instability.`

### 3. Conservative behavior on uncertainty

If the signal is mixed or incomplete, prefer:

- `needs_review`

instead of overconfidently calling it authentic or suspicious.

## Suggested decision logic

This does not need to be exact, but the model should roughly behave like this:

- `likely_authentic`
  - low overall risk
  - no major red flags
  - source and framing look reasonably credible

- `needs_review`
  - mixed signals
  - some suspicion, but not enough for a strong negative conclusion
  - uncertain context or weak sourcing

- `suspicious`
  - strong manipulation signals
  - high misleading-context risk
  - high-risk source pattern
  - strong synthetic/spam/scam style cues

## Important limitations

The model should avoid pretending it has proved truth when it has only detected risk patterns.

This system is best framed as:

- authenticity risk scoring
- manipulation detection support
- contextual credibility assessment

not:

- perfect lie detector
- guaranteed truth engine

## MVP scope for this hackathon

Please focus on text-first email analysis.

### In scope now

- subject + body text analysis
- sender credibility signals
- link/domain credibility signals
- AI-generated style cues
- misleading framing/context cues
- manipulation-risk cues from textual claims

### Nice to have if time allows

- attachment metadata signals
- OCR text from images/PDFs
- header anomaly signals
- cross-source factual retrieval
- calibrated confidence

## Recommended output style

### Summary

The summary should be 1 or 2 sentences, plain English, user-facing.

Examples:

- `This email has several warning signs and should be verified before you trust or share it.`
- `This looks relatively safe, but the claim is still worth confirming if the stakes are high.`

### Evidence

Return `2` to `6` evidence items.

Each item should have:

- `label`
- `detail`
- `score_impact`

`score_impact` should roughly represent how much that signal contributed to risk, from `0` to `100`.

## Example request

```json
{
  "content": "Breaking. This leaked footage proves the election was staged. Share immediately before it gets deleted.",
  "subject": "URGENT: leaked footage proves the election was fake",
  "sender": "truth.central.alerts@protonmail.com",
  "links": ["http://breaking-proof-news.biz/leak"],
  "source_type": "email"
}
```

## Example response

```json
{
  "verdict": "suspicious",
  "confidence": 88,
  "summary": "This email shows several high-risk signals, including pressure language, weak sourcing, and claims presented as proof without credible support.",
  "risk_scores": {
    "ai_generated": 28,
    "manipulated_reality": 84,
    "misleading_context": 81,
    "source_credibility_risk": 86
  },
  "evidence": [
    {
      "label": "Pressure language",
      "detail": "The email pushes immediate sharing before verification.",
      "score_impact": 20
    },
    {
      "label": "Untrusted source pattern",
      "detail": "The sender and link domain look weak for a serious public claim.",
      "score_impact": 28
    },
    {
      "label": "Unsupported proof claim",
      "detail": "The message presents dramatic proof without linking to a credible institution or source document.",
      "score_impact": 30
    }
  ]
}
```

## Practical integration notes

- The backend will wrap your response into its own `AnalysisResult`.
- You do not need to return `id`, `source_id`, `model_mode`, `content_preview`, or `created_at`.
- If your model service fails, the backend falls back to a heuristic analyzer.
- Plain JSON over HTTP is enough for the hackathon.

## Ideal implementation options

Any of these are fine:

- a lightweight classification + scoring service
- an LLM-based structured evaluator returning strict JSON
- a hybrid pipeline combining heuristics, classifier scores, and prompt-based explanation

The most important thing is:

- stable JSON output
- meaningful scores
- concise human-readable evidence

## Handoff summary

The model should answer:

- Is this email likely authentic, suspicious, or in need of review?
- Does it look AI-generated?
- Does it appear to manipulate reality?
- Is it misleading because of framing or context?
- Is the sender/source trustworthy enough for the claim?

And it should return that in a clean JSON format the backend can consume immediately.
