---
"@ionizeio/canvas": patch
---

`LoopView` on the web now lands on the right phase when its channel is played again
while already playing (`channel.play(phase)` on a running channel). A running CSS
animation keeps the start time it began with, so handing it a new negative delay
re-phased it relative to that start rather than to now: every view landed late by the
animation's age (the Lattice harness's "jump to moment" driver arrived 1.6 s into a
moment that should have started a second later). The view now remounts its node on
such a re-phase so the new animation starts now at the delay computed for now. Park
and resume are unchanged (a parked view keeps its node), and native was already right
(the native loop restarts from the phase through its head timing).
