## Chair

Round 1 option scores (weights Graham 3, Musk 3, Blakely 2, Buffett 2; sum 10):
- A: (3×6 + 3×7 + 2×7 + 2×6) / 10 = 6.5
- B: (3×6 + 3×6 + 2×5 + 2×7) / 10 = 6.0
- C: (3×2 + 3×2 + 2×3 + 2×2) / 10 = 2.2
- D: (3×3 + 3×3 + 2×4 + 2×3) / 10 = 3.2

C and D are out for now: every seat scored them 4 or lower (a panel scares a nervous candidate and eats five times the quota; a speech-to-speech swap adds a vendor, about $1.20 per interview if the assumed $0.10 per minute is right, and breaks "audio is never stored by a third party"). The council is not unanimous: A and B are within half a point, and every seat is a conditional yes on a staged A. Confidence is 3 of 5 from three seats.

**Cruxes**
1. **Is A really different from B once the events are code?** All four seats say pause, ramble and "repeat that" handling lives in the Director as plain code, and that "the Interviewer holds the whole call in context" is mostly prompt design (a per-turn call that is given the full transcript each time is the same thing). So what exactly separates A from "B plus events plus an Observer"? If it is only the Observer, A is a gated later step and the council's answer is B-plus. Seats most able to answer: Musk, Buffett, Graham.
2. **Who detects the pause and the ramble?** Today the protocol is strictly turn-based: the client sends `finalize_turn` and the server never decides when an answer is over. Reacting to a pause or a ramble needs voice activity detection somewhere, and a change to the v1 voice protocol. Where does it live (browser or server), what are safe thresholds so a nervous candidate is never talked over (Blakely's risk), and what is the cheapest design? Seats: Musk, Blakely.
3. **What comes first with two weeks to invites: build, or learn?** Graham wants 5 testers and sitting in on sessions before anything beyond the Director; Musk and Buffett want the Director, repeat guard and one-call Interviewer shipped and timed first. What is the actual order of the first two weeks, and which gate lets the Observer start? Seats: Graham, Musk, Buffett.
4. **What is "listened to me" in a number?** Musk's question: which one number says a tester felt listened to, readable from logs without sitting in the call. The complete build needs a metric for each stage gate. Seats: all.
