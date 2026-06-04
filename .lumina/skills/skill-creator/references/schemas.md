# Lumina Skill System Schema Specifications

This documentation serves as the official specification for JSON data structures, grading logs, and analytical tracking files inside Lumina's testing environment. All scripts, subagents, and tools must output structured data that conforms to these strict JSON formats to ensure compatibility with Lumina's visualization dashboards.

---

## 📋 1. Evaluation Configuration: `.lumina/evals/evals.json`

The central ledger containing evaluation prompts, file references, and expectation assertions used to challenge configuration quality.

### Schema Blueprint
```json
{
  "skill_name": "example-skill-id",
  "evals": [
    {
      "id": "scenario-01",
      "prompt": "Evaluate current financial models and extract accurate monthly aggregates.",
      "expected_output": "A markdown report with a structured ledger and summary table.",
      "files": [".lumina/evals/resources/monthly_ledger.csv"],
      "expectations": [
        "The output contains rows for January through December",
        "The computed calculations match the ledger sums and avoid hover float errors"
      ]
    }
  ]
}
```

### Fields Guide
* `id` *(string)*: Unique alphanumeric identifier for each test vector.
* `prompt` *(string)*: The high-fidelity query given to the agent.
* `expected_output` *(string)*: A high-level description of what success looks like.
* `files` *(array of strings)*: Relatives paths in the workspace containing pre-loaded data or reference files.
* `expectations` *(array of strings)*: Clear, binary, objectively verifiable assertions.

---

## 🕒 2. Telemetry Tracker: `timing.json`

Captures key latency, duration, and token consumption metrics during trial runs. Placed in the run iteration directories.

### Schema Blueprint
```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3,
  "execution_metrics": {
    "tool_calls": 14,
    "unhandled_errors": 0
  }
}
```

---

## 🎯 3. Grader Summary: `grading.json`

Compiled by Grader Agents during audits, verifying assertion lists.

### Schema Blueprint
```json
{
  "expectations": [
    {
      "text": "The output contains rows for January through December",
      "passed": true,
      "evidence": "Parsed January-December rows in `/outputs/summary.md` table."
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 0,
    "total": 1,
    "pass_rate": 1.00
  },
  "execution_metrics": {
    "tool_calls": {
      "ReadFile": 4,
      "WriteFile": 1
    },
    "total_tool_calls": 5,
    "errors_encountered": 0,
    "output_chars": 5832,
    "transcript_chars": 2100
  },
  "timing": {
    "executor_duration_seconds": 12.4,
    "grader_duration_seconds": 3.1,
    "total_duration_seconds": 15.5
  }
}
```

---

## 📈 4. Milestones Ledger: `history.json`

Tracks evolution performance metrics across successive iteration loops. Placed in the skill root folder.

### Schema Blueprint
```json
{
  "started_at": "2026-06-03T14:40:00Z",
  "skill_name": "sales-calculator",
  "current_best": "v3",
  "iterations": [
    {
      "version": "v1",
      "parent": null,
      "expectation_pass_rate": 0.50,
      "grading_result": "baseline",
      "is_current_best": false
    },
    {
      "version": "v2",
      "parent": "v1",
      "expectation_pass_rate": 0.75,
      "grading_result": "won",
      "is_current_best": false
    },
    {
      "version": "v3",
      "parent": "v2",
      "expectation_pass_rate": 0.95,
      "grading_result": "won",
      "is_current_best": true
    }
  ]
}
```
