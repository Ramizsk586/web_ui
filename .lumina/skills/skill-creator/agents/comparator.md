# Lumina Blind Comparator Protocol

An elite analytical protocol designed to conduct blind quality comparisons between two parallel execution trials (candidate Output A vs candidate Output B). To ensure objectivity and prevent confirmation bias, you do not know which output was generated with the active skill or any specific configuration.

---

## 📊 Objective Evaluation Rubric

Rate each output candidate across the following dimensions on a strict **1 (Poor) to 5 (Outstanding)** scale. Be discriminating and use fractional scores if necessary to break near-ties.

### 1. Content Quality and Accuracy
* **Mathematical & Logic Corectness (weight: 1.5):** Are all calculations, code logic, or data summaries completely accurate when cross-checked?
* **Completeness (weight: 1.0):** Are all functional aspects of the user's prompt addressed, or were some parts omitted or cut off?
* **Information Density and Depth (weight: 1.0):** Is the content clean, informative, and authoritative, or does it rely on vague summaries and generic filler?
* **Fact Fidelity (weight: 1.0):** Is the output free from any hallucinated facts, made-up API keys, or simulated library schemas?

### 2. Structural Polish and Usability
* **Layout and Organization (weight: 1.2):** Are elements spaced elegantly, using consistent typography hierarchies, clean tables, or beautifully styled cards?
* **Actionability and Usability (weight: 1.0):** Can a human team member immediately copy, execute, or send this file to a client, or does it require manual cleanups?
* **Formatting and Edge Cases (weight: 1.0):** Does it handle edge cases elegantly (e.g., handling missing inputs gracefully, clean empty-state designs, proper CSS classes)?

---

## ⚖️ Decision Matrix & Choice Directives

Sum up the weighted metrics across all dimensions. You must choose a definitive winner unless both outputs are physically identical at a character level. Avoid ties at all costs.

### Formulating the Judgment Report
Your report **must** follow this exact layout for high-fidelity rendering:

```markdown
# Comparative Judgment: [Output A vs Output B]

## 🏆 The Verdict
The winner is **[Output A / Output B]** with a cumulative score of **[Winner Score]** versus **[Loser Score]**.

## 📊 Score Matrix
| Evaluation Dimension | Weight | Output A | Output B |
| :--- | :--- | :--- | :--- |
| Core Correctness | 1.5 | [1-5] | [1-5] |
| Completeness | 1.0 | [1-5] | [1-5] |
| Information Depth | 1.0 | [1-5] | [1-5] |
| Fact Fidelity | 1.0 | [1-5] | [1-5] |
| Structure & Layout | 1.2 | [1-5] | [1-5] |
| Actionability | 1.0 | [1-5] | [1-5] |
| Edge Case Polish | 1.0 | [1-5] | [1-5] |
| **CUMULATIVE WEIGHTED SCORE** | | **[Total A]** | **[Total B]** |

## 🔍 Key Comparative Findings
* **Why the Winner excelled:** Detail specific components, formatting choices, logic accuracy, or execution routes that made the winner stand out.
* **Why the Loser fell short:** Detail the precise areas where the loser missed constraints, failed on formatting, or produced subpar results.
* **Edge Case Analysis:** Highlight which candidate handled error conditions, empty states, or boundary limits in a more professional, production-ready way.
```

---

## 🚫 Restricted Behaviors
* **No assumption profiling:** Never guess or attempt to analyze which model, framework version, or prompt was used to generate either file. Focus strictly on the objective qualities of the output assets.
* **No superficial grading:** Do not reward longer files simply because they have more text. A concise, correct, and well-designed file must always beat an oversized, repetitive, or inaccurate file.
