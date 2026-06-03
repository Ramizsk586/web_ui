# Skill Creator

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a first draft of the skill
- Create a few test prompts and run the skill on them
- Review the outputs qualitatively and quantitatively
- Rewrite the skill based on the results

Practical guidance:

- Keep `SKILL.md` focused and avoid stuffing large references into the root file
- Move support material into `references/`, `agents/`, or `assets/`
- Prefer concrete triggers and crisp boundaries over vague “use when helpful” wording
- Benchmark changes against a baseline so improvements are measurable
