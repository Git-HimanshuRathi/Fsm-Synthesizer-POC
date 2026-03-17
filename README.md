# FSM Synthesizer PoC

A small proof of concept I built to validate the core idea behind my GSoC proposal, converting a finite state machine into minimized Boolean equations that can then be used to generate a digital circuit.

## Live Demo

https://git-himanshurathi.github.io/Fsm-Synthesizer-POC/

## What it does

You draw an FSM (states + transitions) on a canvas, hit Synthesize, and it walks through the full pipeline:

1. Encodes states into binary
2. Builds the transition table (with don't-cares for unused states)
3. Extracts minterms for each next-state bit and output signal
4. Minimizes them using Quine-McCluskey

The output is a set of simplified SOP expressions — these are what would feed into D flip-flops and logic gates in the actual CircuitVerse integration.

## What it doesn't do

This PoC stops at equations. It does not generate circuits, place components on a canvas, or integrate with CircuitVerse. That's the actual GSoC work.

