# Annotation Guidelines

Use these rules to keep sentiment labels consistent across the dataset.

## Positive

Choose `Positive` when the sentence expresses satisfaction, praise, delight, trust, recommendation, relief, or a clearly favorable opinion.

Examples:

- I love how easy this product is to use.
- The support team solved my issue quickly.
- The new dashboard is fast and reliable.

## Negative

Choose `Negative` when the sentence expresses dissatisfaction, complaint, frustration, disappointment, failure, warning, or a clearly unfavorable opinion.

Examples:

- The app crashed before I could finish.
- The delivery was late and the box was damaged.
- Support never responded to my complaint.

## Neutral

Choose `Neutral` when the sentence is factual, descriptive, procedural, mixed, unclear, or does not contain a clear emotional judgment.

Examples:

- The order was delivered yesterday afternoon.
- The report contains three columns.
- The account was created using an email address.

## Tie-Breaking Rules

- If the sentence includes both praise and criticism, label the stronger sentiment.
- If sentiment is unclear, choose `Neutral`.
- Do not infer sentiment from outside knowledge.
- Label the sentence as written, not what the author may have intended.
- Keep sarcasm or irony as `Neutral` unless the emotional direction is obvious.

## Quality Checklist

- Every row should have one label only.
- Labels must be one of `Positive`, `Negative`, or `Neutral`.
- Similar sentences should receive similar labels.
- Review outliers after export before submitting the dataset.
