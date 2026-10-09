# Documentation standard

How every document in this repository is written. A document describes one
subject, for one reader, as it is now. This page is itself written that way.

## 1. One domain, one reader

Each document has a single domain and a single reader, and says both in its
first lines: what it covers and who it is for. Anything outside that domain
belongs in the document that owns it, and is reached by a link.

| Domain | Home | Reader |
| --- | --- | --- |
| The game: what the player does, the loop, its rules and numbers | [design/game.md](design/game.md) and the game's rule documents it links | Anyone building or playing the game |
| Playing the current build | [design/play-manual.md](design/play-manual.md) | A player |
| The world and expeditions | [design/world-and-exploration.md](design/world-and-exploration.md) | Anyone building the game |
| Genomics: how genes, species, inheritance and the genome code work | [design/creatures-and-genomics.md](design/creatures-and-genomics.md) | Anyone building the game, and readers who want the genetics |
| Operating the devices: buttons, screen rules, accessibility | [design/interaction.md](design/interaction.md) | Designers and builders of screens |
| The look of the game | [design/art-direction.md](design/art-direction.md) and [design/style-guide/](design/style-guide/) | Artists and builders placing art |
| The devices | [design/devices.md](design/devices.md) and [hardware/](hardware/) | Hardware builders |
| Software structure | [design/architecture.md](design/architecture.md) | Engineers |
| What is being built and when | [ROADMAP.md](ROADMAP.md) | Anyone following the project |
| A tool, prototype or asset folder | its own `README.md` | Whoever runs or changes that folder |

A document that serves two readers is two documents. Genomics explains how a
gene behaves; the game documents explain what a player does with it. Research,
creating and breeding are written once in each: the mechanism in genomics, the
play in the game documents, each linking to the other.

## 2. The current design, stated as fact

A design document says what is true now, in the present tense: "A child takes
one copy from each parent", not "We decided that a child takes one copy" and
not "A child should take one copy".

Never in a design document:

- status labels on a rule: *Decided*, *Working rule*, *Approved*, *Accepted*,
  *Amended*, *Parked*, *Retitled*;
- who chose something, when, or how (no dates of choices, no "as
  recommended", no "the owner", "the project lead", "the art director
  signed");
- the story of how the design got here: earlier versions, rounds, rejected
  options, "replaces", "no longer", "now". Git keeps history;
- the people, sessions or tools that wrote the document.

Where something is not designed yet, the document says so plainly in one
closing section, **Not designed yet**, as a short list of the questions. A rule
that is not settled is not written as a rule.

Where the current build differs from the design, the folder's README or the
[roadmap](ROADMAP.md) says so. A design document describes the design, and
links to the build that shows it.

A number in a design document is the current value. A number that only
illustrates is introduced with "for example".

## 3. Proposals

A proposal describes a change that is not part of the design yet. It lives in
[design/proposals/](design/proposals/), and only there. Its title names the
change and its first sentence says what it would change: "This proposes that
pods of one species share one renderer."

When a proposal is adopted, its content is written into the domain document
as fact and the proposal is removed; git keeps it. When it is set aside, it is
removed. A design document never quotes a proposal as the design; it may link
one under **Not designed yet**.

Build specifications (the technical architecture, a screen's layout spec, a
build plan) are current design. They live with their domain, in the present
tense, under the same rules.

## 4. Voice

- Plain English, short sentences, present tense.
- Purpose and an example first, then the rules.
- Every picture a document discusses is shown inline where it is discussed,
  with a one-line caption. Pixel art is shown at 1× or a whole multiple, with
  the 1× file linked.
- Player-facing language sounds like a game, not a lab report.

## 5. Words

The game's words are used exactly, and capitalised as here: **mibi** (plural
**mibis**), **Companion**, **Station**, **Caddy**, **Probe**, **partner**,
**pod**, **crate**, **bay**, **Shield**, **beacon**, **outpost**,
**expedition**.

| Never | Use |
| --- | --- |
| pocket (anywhere) | a word that does not echo another game's creatures |
| cairn | beacon |
| hull | Shield |
| rides (a mibi in the Companion) | with you; on an expedition, partner |
| outing | expedition |

The [design glossary](design/README.md#words-used-here) defines every word. A new word is added
there before it is used, and only after its name check.

## 6. One fact, one home

Every fact is written once, in the document that owns its domain. Other
documents link to it, to the section, instead of restating it. A summary of
another document's rule is one sentence and a link.

## 7. What never appears in this repository

- Costs, prices paid, balances and spending records. The kit's retail target
  is product information and may appear.
- Server names, hosts, tunnels, private addresses and absolute paths of any
  machine.
- Credentials of any kind. The names of the variables that hold them may
  appear.
- Names of sessions, agents or the models that write code or documents. The
  image model that made a picture is provenance and stays with the picture.
- Personal names, other than the author's in the licence and the credits.
- Internal process: approvals, sign-offs, reviews, who decided, when.

## 8. Checking a document

Before a document changes, check it against this page:

1. Its first lines name its domain and its reader.
2. Every rule is written as current fact; nothing in §2's list appears.
3. Anything outside its domain is a link, not a copy.
4. Every word in §5 is used as listed.
5. Nothing in §7 appears.
