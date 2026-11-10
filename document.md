# VoxProof: QA for Gnani voice agents

**Test the conversation before your customers do.**

Voice agents can perform well in a scripted test and still fail when a caller interrupts, switches between Hindi and English, gives an unclear answer, or is the wrong person. Reviewing calls by hand is slow, inconsistent, and hard to repeat after an agent changes.

VoxProof turns those conversations into a repeatable QA process. Teams register an agent created in the Gnani console using its bot ID, choose scenarios and caller personas, and generate up to **1,000 test cases per run**. They test the agent in Gnani and import real conversation turns, timestamps, and dispositions into VoxProof. **No Gnani Agent Builder API key is required** for this workflow.

VoxProof checks each conversation against explicit expectations: required or prohibited phrases, the reported disposition, and reply time. An optional LLM judge assesses accuracy, language understanding, interruption recovery, and policy adherence, with evidence tied to transcript turns. The dashboard brings together pass rate, completion, latency, and failure patterns. Each finding shows what happened, why it matters, and a suggested change to review in Gnani.

The result is a clear loop: **design a test, collect a real call, inspect the evidence, improve the agent, and run the test again**. Teams can turn failures into regression scenarios and track whether a change fixed the issue. VoxProof never edits or deploys the Gnani agent; the team stays in control.

*Current integration: calls and conversation exports are handled in Gnani, then imported into VoxProof. Automated dialing or private log retrieval would require separate Gnani authorization.*
