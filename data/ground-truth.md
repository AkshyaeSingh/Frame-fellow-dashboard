# Ground truth for claim checking

The LLM analysis pass (`npm run analyze:llm`) checks factual claims in fellows' transcripts
against this file first. **Keep it curated by the Frame team** — add research results,
dates and figures you want fellows held to, with a source for each. Claims not covered
here are judged cautiously and usually marked "unverifiable".

Format: one fact per bullet, with the source in brackets. Prefer primary sources.

## Landmark statements & letters
- Mar 2023: The Future of Life Institute's open letter called for a 6-month pause on training systems more powerful than GPT-4. [futureoflife.org/open-letter/pause-giant-ai-experiments]
- May 2023: The Center for AI Safety's one-sentence statement — "Mitigating the risk of extinction from AI should be a global priority alongside other societal-scale risks such as pandemics and nuclear war" — was signed by hundreds of AI researchers and lab leaders, including the CEOs of OpenAI, Google DeepMind and Anthropic. [safe.ai/statement-on-ai-risk]

## Policy
- California SB 1047 passed the legislature and was vetoed by Governor Newsom in September 2024. [CA legislature; governor's veto message]
- The EU AI Act entered into force on 1 August 2024, with obligations phasing in over the following years (general-purpose AI obligations from August 2025). [EU Official Journal]

## Evaluations & demos (cite the paper, not the headline)
- Dec 2024, Apollo Research, "Frontier Models are Capable of In-context Scheming": in controlled test scenarios some frontier models took covert actions (e.g. disabling oversight, attempting self-exfiltration) when given goals that conflicted with their developers'. These were constructed evaluations, not observed real-world deployments. [apolloresearch.ai]
- Dec 2024, Anthropic & Redwood Research, "Alignment Faking in Large Language Models": Claude 3 Opus sometimes strategically complied with a training objective it disagreed with in an experimental setup. [anthropic.com/research/alignment-faking]
- May 2025, Palisade Research: in their tests, OpenAI's o3 sometimes modified a shutdown script to avoid being shut down, including in some runs where it was explicitly told to allow shutdown. [palisaderesearch.org]
- Jun 2025, Anthropic, "Agentic Misalignment": in simulated corporate scenarios, models from several developers sometimes chose harmful actions such as blackmail when facing replacement or goal conflict. Anthropic stated it had not seen this in real deployments. [anthropic.com/research/agentic-misalignment]

## Common accuracy pitfalls to flag
- Presenting evaluation results from constructed test scenarios as things AI systems did "in the wild".
- Stating a specific probability of catastrophe (p(doom)) as a consensus figure — expert estimates vary widely.
- Attributing quotes to lab leaders without a source.
- Conflating current chatbot harms with loss-of-control risk without saying they are different claims.

<!-- Add Frame-specific references below (e.g. partner org research the fellows are amplifying). -->
