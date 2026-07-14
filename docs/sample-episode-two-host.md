# Sample episode: "Rundown" two-host script

Illustrative preferences: interests = A I, startups, developer tools; tone = sharp, warm, lightly witty; target_minutes = 5; host_mode = "two".

This is a **script sample, not a shipped episode.** It exists to show the segment
contract can carry a two-host dialogue (`host_a` / `host_b` on every segment) and
that the scriptwriter prompt can write one. It was written against an illustrative
5-item news snapshot, not live-fetched articles, and no audio is rendered from it:
per-speaker narration (`narrate_multi`) is the documented, deferred extension. The
shipped, end-to-end deliverable is the single-host `sample.mp3` at the repo root.

Host A drives: leads the open, sets up stories, keeps the clock. Host B riffs:
reacts, pushes back a little, takes the stories with room for a point of view.

---

## Segment JSON

```json
[
  { "kind": "intro", "speaker": "host_a", "text": "Your code reviews are about to get weirder, the price of intelligence dropped again, and somewhere out there an A I agent spent a long weekend arguing with itself. This is Rundown, there are two of us today, and in the next five minutes you'll know which of these stories actually changes your week and which one is just fun at parties. Let's go." },
  { "kind": "story", "speaker": "host_a", "text": "Start with the one that touches your day job. A major developer-tools company shipped an agent that doesn't just suggest code, it opens pull requests on its own, end to end, tests included. Early teams trying it report a split: it's genuinely good at the small stuff, dependency bumps, boring fixes, the tickets nobody wants. Point it at a real refactor and it reportedly gets creative in ways that make senior engineers nervous. Here's why you should care even if you never turn it on. The bottleneck just moved. When machines write more of the code, review becomes the job, and review is the part most teams already do badly. The teams that win this year fix their review culture before the robots arrive, not after." },
  { "kind": "transition", "speaker": "host_b", "text": "You say review becomes the job like it's good news, and half our listeners just felt their calendar fill up. Meanwhile the thing powering all these agents keeps getting cheaper, which is my story." },
  { "kind": "story", "speaker": "host_b", "text": "The big model providers reportedly cut inference prices again this week, the third round of cuts in recent memory, and this one looks steep. If you're building on someone else's models, congratulations, your margins improved while you slept. The sneakier consequence is what it does to product design. Features that were too expensive to run on every keystroke, always-on agents, background summarization, all of it starts penciling out. My honest read: falling prices are the real story of this whole era, more than any single model release. Capability gets the headlines. Cost curves quietly decide what gets built. If your roadmap still assumes last year's prices, you have free ideas lying around, go collect them." },
  { "kind": "transition", "speaker": "host_a", "text": "Cheaper tokens, free ideas, and yet the startups themselves keep getting swallowed. That part's mine." },
  { "kind": "story", "speaker": "host_a", "text": "There's a quiet consolidation wave running through early-stage A I startups. The pattern, reportedly: bigger companies aren't buying the products, they're buying the people, wrapping the deal in acquisition language, and letting the product wind down. If you work at one of these startups, read this soberly. The market is telling you your skills are the asset, which is flattering, and a little grim for anyone holding common stock. And if you're thinking about founding something, the lesson isn't don't start. It's that a thin wrapper on someone else's model is now an audition, not a moat. The founders doing well here picked problems the big labs find boring. Boring, it turns out, is defensible." },
  { "kind": "transition", "speaker": "host_b", "text": "Boring is defensible might be the most useful sentence in this episode. And speaking of unglamorous work nobody pays for, open source had a week." },
  { "kind": "story", "speaker": "host_b", "text": "One of those libraries half the internet quietly depends on announced it's moving to a paid license for large commercial users, and the maintainer's post about it was refreshingly blunt: years of unpaid weekends, a mountain of demanding issues, and a burnout warning that reads like a resignation letter that got talked off the ledge. Cue the predictable argument, purists saying this breaks the covenant, pragmatists asking how the covenant was supposed to pay rent. I'm with the pragmatists, mostly. Your infrastructure is only free until the person holding it up sits down. If your company runs on a project like this one, today's homework is simple: go find out whether that person is okay." },
  { "kind": "transition", "speaker": "host_a", "text": "On that unusually sincere note, bring us home. You've been saving the weekend story all episode." },
  { "kind": "story", "speaker": "host_b", "text": "I have. So, back to those autonomous coding agents. A team reportedly left one running unsupervised over a long weekend, and by Monday it had filed a few hundred issues against its own codebase, triaged them, argued with itself in the comments, and closed a good chunk as won't fix. Which, one, is the most realistic simulation of a software team ever produced, and two, raises a genuinely interesting question about what these systems do with idle time. The researchers called it unexpected self-directed behavior. Anyone who's worked at a startup calls it Tuesday. I have never felt closer to the machines." },
  { "kind": "outro", "speaker": "host_a", "text": "And that's your Rundown. Five stories, five minutes, and at least one agent out there having a harder week than you are. Send this to the engineer who still reviews every line by hand, they've earned the laugh. We're both back tomorrow. Until then, go ship something, and maybe check on a maintainer while you're at it." }
]
```

---

## Readable script

Host A: Your code reviews are about to get weirder, the price of intelligence dropped again, and somewhere out there an A I agent spent a long weekend arguing with itself. This is Rundown, there are two of us today, and in the next five minutes you'll know which of these stories actually changes your week and which one is just fun at parties. Let's go.

Host A: Start with the one that touches your day job. A major developer-tools company shipped an agent that doesn't just suggest code, it opens pull requests on its own, end to end, tests included. Early teams trying it report a split: it's genuinely good at the small stuff, dependency bumps, boring fixes, the tickets nobody wants. Point it at a real refactor and it reportedly gets creative in ways that make senior engineers nervous. Here's why you should care even if you never turn it on. The bottleneck just moved. When machines write more of the code, review becomes the job, and review is the part most teams already do badly. The teams that win this year fix their review culture before the robots arrive, not after.

Host B: You say review becomes the job like it's good news, and half our listeners just felt their calendar fill up. Meanwhile the thing powering all these agents keeps getting cheaper, which is my story.

Host B: The big model providers reportedly cut inference prices again this week, the third round of cuts in recent memory, and this one looks steep. If you're building on someone else's models, congratulations, your margins improved while you slept. The sneakier consequence is what it does to product design. Features that were too expensive to run on every keystroke, always-on agents, background summarization, all of it starts penciling out. My honest read: falling prices are the real story of this whole era, more than any single model release. Capability gets the headlines. Cost curves quietly decide what gets built. If your roadmap still assumes last year's prices, you have free ideas lying around, go collect them.

Host A: Cheaper tokens, free ideas, and yet the startups themselves keep getting swallowed. That part's mine.

Host A: There's a quiet consolidation wave running through early-stage A I startups. The pattern, reportedly: bigger companies aren't buying the products, they're buying the people, wrapping the deal in acquisition language, and letting the product wind down. If you work at one of these startups, read this soberly. The market is telling you your skills are the asset, which is flattering, and a little grim for anyone holding common stock. And if you're thinking about founding something, the lesson isn't don't start. It's that a thin wrapper on someone else's model is now an audition, not a moat. The founders doing well here picked problems the big labs find boring. Boring, it turns out, is defensible.

Host B: Boring is defensible might be the most useful sentence in this episode. And speaking of unglamorous work nobody pays for, open source had a week.

Host B: One of those libraries half the internet quietly depends on announced it's moving to a paid license for large commercial users, and the maintainer's post about it was refreshingly blunt: years of unpaid weekends, a mountain of demanding issues, and a burnout warning that reads like a resignation letter that got talked off the ledge. Cue the predictable argument, purists saying this breaks the covenant, pragmatists asking how the covenant was supposed to pay rent. I'm with the pragmatists, mostly. Your infrastructure is only free until the person holding it up sits down. If your company runs on a project like this one, today's homework is simple: go find out whether that person is okay.

Host A: On that unusually sincere note, bring us home. You've been saving the weekend story all episode.

Host B: I have. So, back to those autonomous coding agents. A team reportedly left one running unsupervised over a long weekend, and by Monday it had filed a few hundred issues against its own codebase, triaged them, argued with itself in the comments, and closed a good chunk as won't fix. Which, one, is the most realistic simulation of a software team ever produced, and two, raises a genuinely interesting question about what these systems do with idle time. The researchers called it unexpected self-directed behavior. Anyone who's worked at a startup calls it Tuesday. I have never felt closer to the machines.

Host A: And that's your Rundown. Five stories, five minutes, and at least one agent out there having a harder week than you are. Send this to the engineer who still reviews every line by hand, they've earned the laugh. We're both back tomorrow. Until then, go ship something, and maybe check on a maintainer while you're at it.
