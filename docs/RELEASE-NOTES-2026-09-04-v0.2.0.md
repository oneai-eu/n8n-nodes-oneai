# Release notes — v0.2.0 (2026-09-04)

Published as `@oneai-eu/n8n-nodes-oneai@0.2.0`. English first, German below.

**Basis for the numbers:** `0.1.9` was unpacked from npm and its operation surface diffed
mechanically against this release — 8 → 10 resources, 49 → 62 operations, 15 added, 2 removed.
Everything marked *measured* below was read from a tool or a live instance, not from memory.

---

# English

## 🔴 The node is findable again

In `0.1.9`, searching the n8n nodes panel for "oneAI" returned **nothing** — not the operations,
not the node itself.

n8n's node creator is action-first: it builds its entries from the **static option lists** of
**Resource** and **Operation**, and from each operation's action label. `0.1.9` had moved both to
dynamic loading, which is only evaluated once a node is already on the canvas, so the node offered
**zero actions** and was never listed. Measured against shipped nodes: this node 0 options and 0
actions, Slack 7 and 17 options with 7 actions, Perplexity 1 and 1 with 4.

A second, independent cause: `"AI"` in the main node's codex categories routes a node into the AI
branch of the creator, where the tool variants live, and out of the ordinary search. The tool
variant n8n generates from `usableAsTool: true` already carries that category by itself — which is
where an AI Agent looks for it.

The node now offers **62 actions**.

## Operations that could not succeed, and now do

Their URLs never changed, so nothing flagged them. They simply failed, for everyone.

- **Create Chat** sent a project where the API expects a space, and was rejected outright. A chat
  can only be created in a **project** — a space whose provider is `Project`. The field says so now.
- **Create Space** sent its provider options flat instead of nested, and offered provider values
  (`local`, `google`, `onedrive`, `sharepoint`) that the API has never accepted. All values are
  corrected, and values stored in existing workflows are translated automatically — a workflow that
  said `local` now works instead of failing.
- **List Chats** filtered by project, which that endpoint ignores. You silently received every chat.
  It filters by space now, with an "own only" option.
- **List Files in Space** never sent the required page size. It paginates now, with search and
  embedding-status filters.
- **Export Artifact as PDF** used an endpoint that no longer exists and read the result as JSON.
- **Download File from Space** read a binary response as JSON.

## Item linking was wrong everywhere

Every operation set `pairedItem` — n8n's record of which input row produced which output row — and
every one of them pointed at the wrong row. An input item that returned ten rows labelled them as
descending from ten *different* input items, most of which did not exist. That record drives
`$item()` expressions, the linked-items panel and the attribution of a failure to the row that
caused it.

Corrected across the node and pinned by a structural check that resolves scopes rather than
matching text. Observed live in both states: with the defect, 20 rows from 2 input items claimed
descent from `{item:0}`…`{item:9}`; with the fix, ten named item 0 and ten named item 1.

## New: oneData datasets

Any other n8n node's output can now land in an oneAI dataset.

- **Dataset** — List, List Spaces, Create, Update Schema, Import CSV, Export CSV
- **Dataset Row** — Append, Append Many, List, Update, Delete

### Append vs Append Many — read this before you build

| | Append | Append Many |
|---|---|---|
| requests | one per input item | one for the whole batch |
| returns | a `rowId` per row | a summary, no row ids |
| types | numbers and booleans survive | values arrive as text |

They are two operations rather than one with a toggle because the fast path cannot return row ids,
and a toggle that silently empties `$json.rowId` three nodes downstream is the kind of change that
is impossible to debug.

🔴 **Measured type difference:** a `BIGINT` column returns `36` through Append and `"41"` through
Append Many, because the bulk path goes through CSV and the API does not convert. Use Append when
you will update or delete those rows later; use Append Many when a batch only has to arrive.

**List Spaces** exists so a workflow can discover which spaces hold datasets instead of needing an
ID pasted in. Its output feeds straight into the other dataset operations, and n8n's own item loop
does the fan-out.

## Also new

- **Archive Project** and **Unarchive Project** — the replacement for the removed Delete Project.
  🔴 The endpoint authorises per project and **reports refusals with HTTP 200**, so the node asserts
  success only when the id comes back in the API's `succeeded` list and otherwise emits
  `success: false` with the API's own error. **Check that flag** — the execution is green either
  way. Note that archiving is **per user**, not organization-wide.
- **Create Project from Template** — the replacement for the removed Create Project.
- **Export Artifact as PPTX** — the sibling of Export PDF.

## ⚠️ Breaking changes

- **Delete Project and Create Project are removed.** oneAI no longer serves `POST /api/projects` or
  `DELETE /api/projects/{id}`; they could not work. A saved workflow using either now fails with
  `Unknown operation`. Use Archive Project, or Create Project from Template.
- **Create Chat** takes a **Space ID** where it took a Project ID; **List Chats** filters by space;
  **Update Chat** offers persona and agent instead of moving a chat between projects. None of these
  could succeed before, so no *working* workflow changes behaviour.
- **Export Artifact as PDF** and **Download File from Space** now write to a binary property instead
  of returning JSON. Downstream nodes reading `.json` from them need adjusting.

The node's `typeVersion` stays **1**, so existing nodes keep working.

## Under the hood

- Request path segments are percent-encoded throughout. On a node that is `usableAsTool`, an
  upstream expression — or a prompt injection reaching an AI Agent — could otherwise steer a request
  to a different endpoint under the instance credential.
- The published package no longer contains the build cache that shipped in `0.1.9`, and the build
  can no longer report success while emitting no JavaScript at all.
- Still **zero runtime dependencies**. Published with provenance.

## Verified before and after publishing

All gates green from a fresh clone of `main` on Node 24 and on Node 22, the version CI pins. The
published tarball was downloaded and checked rather than trusted: 62 actions, `typeVersion` 1, no
build cache, zero dependencies, and a checksum identical to the one in the publish log.

---

# Deutsch

## 🔴 Der Node ist wieder auffindbar

In `0.1.9` lieferte die Suche im n8n-Node-Panel nach „oneAI" **nichts** — weder die Operationen noch
den Node selbst.

Das Panel ist action-first: Es baut seine Einträge aus den **statischen Optionslisten** von
**Resource** und **Operation** sowie aus der Action-Bezeichnung jeder Operation. `0.1.9` hatte beide
auf dynamisches Nachladen umgestellt, was erst greift, wenn ein Node bereits auf der Arbeitsfläche
liegt. Der Node bot damit **null Actions** an und wurde nie gelistet. Gemessen gegen ausgelieferte
Nodes: dieser Node 0 Optionen und 0 Actions, Slack 7 und 17 Optionen mit 7 Actions, Perplexity 1 und
1 mit 4.

Eine zweite, unabhängige Ursache: `"AI"` in den Codex-Kategorien des Haupt-Nodes schiebt ihn in den
AI-Zweig des Panels, wo die Tool-Varianten liegen — und aus der normalen Suche heraus. Die
Tool-Variante, die n8n aus `usableAsTool: true` selbst erzeugt, trägt diese Kategorie ohnehin; dort
sucht ein AI-Agent.

Der Node bietet jetzt **62 Actions**.

## Operationen, die nicht funktionieren konnten, funktionieren jetzt

Ihre URLs blieben unverändert, deshalb fiel es nirgends auf. Sie schlugen einfach fehl, bei allen.

- **Chat erstellen** schickte ein Projekt, wo die API einen Space erwartet, und wurde rundweg
  abgelehnt. Ein Chat lässt sich nur in einem **Projekt** anlegen — einem Space mit Provider
  `Project`. Das Feld sagt das jetzt.
- **Space erstellen** schickte die Provider-Optionen flach statt verschachtelt und bot Provider-Werte
  an (`local`, `google`, `onedrive`, `sharepoint`), die die API nie akzeptiert hat. Alle Werte sind
  korrigiert, und in bestehenden Workflows gespeicherte Werte werden automatisch übersetzt — ein
  Workflow mit `local` funktioniert jetzt, statt zu scheitern.
- **Chats auflisten** filterte nach Projekt, was dieser Endpunkt ignoriert. Man bekam still alle
  Chats. Jetzt wird nach Space gefiltert, mit einer Option „nur eigene".
- **Dateien im Space auflisten** schickte die erforderliche Seitengröße nie. Jetzt mit Paginierung,
  Suche und Embedding-Status-Filter.
- **Artefakt als PDF exportieren** nutzte einen Endpunkt, den es nicht mehr gibt, und las das
  Ergebnis als JSON.
- **Datei aus Space herunterladen** las eine Binärantwort als JSON.

## Die Item-Zuordnung war überall falsch

Jede Operation setzte `pairedItem` — n8ns Nachweis, welche Eingabezeile welche Ausgabezeile erzeugt
hat — und jede zeigte auf die falsche Zeile. Ein Eingabe-Item, das zehn Zeilen zurückgab,
kennzeichnete sie als Abkömmlinge von zehn *verschiedenen* Eingabe-Items, von denen die meisten gar
nicht existierten. Davon hängen `$item()`-Ausdrücke, die Verknüpfungsanzeige und die Zuordnung eines
Fehlers zur verursachenden Zeile ab.

Im gesamten Node korrigiert und durch eine strukturelle Prüfung abgesichert, die Geltungsbereiche
auflöst statt Text zu vergleichen. Beide Zustände live beobachtet: mit dem Defekt behaupteten 20
Zeilen aus 2 Eingabe-Items eine Herkunft von `{item:0}`…`{item:9}`; mit dem Fix nannten zehn Item 0
und zehn Item 1.

## Neu: oneData-Datasets

Die Ausgabe jedes anderen n8n-Nodes kann jetzt in einem oneAI-Dataset landen.

- **Dataset** — Auflisten, Spaces auflisten, Erstellen, Schema ändern, CSV importieren, CSV
  exportieren
- **Dataset Row** — Anhängen, Viele anhängen, Auflisten, Aktualisieren, Löschen

### Anhängen vs. Viele anhängen — das bitte vorher lesen

| | Anhängen | Viele anhängen |
|---|---|---|
| Requests | einer je Eingabe-Item | einer für den ganzen Stapel |
| Rückgabe | eine `rowId` je Zeile | eine Zusammenfassung, keine IDs |
| Typen | Zahlen und Booleans bleiben erhalten | Werte kommen als Text an |

Es sind zwei Operationen und kein Schalter, weil der schnelle Weg keine Zeilen-IDs zurückgeben kann
— und ein Schalter, der `$json.rowId` drei Nodes später still leert, erzeugt einen Fehler, den
niemand findet.

🔴 **Gemessener Typunterschied:** Eine `BIGINT`-Spalte liefert über *Anhängen* `36` und über *Viele
anhängen* `"41"`, weil der Massenweg über CSV läuft und die API nicht konvertiert. *Anhängen*
nehmen, wenn die Zeilen später aktualisiert oder gelöscht werden sollen; *Viele anhängen*, wenn ein
Stapel nur ankommen muss.

**Spaces auflisten** gibt es, damit ein Workflow selbst herausfindet, welche Spaces Datasets
enthalten, statt eine ID eingefügt zu bekommen. Die Ausgabe speist direkt die übrigen
Dataset-Operationen, und das Ausfächern übernimmt n8ns eigene Item-Schleife.

## Ebenfalls neu

- **Projekt archivieren** und **Projekt wiederherstellen** — der Ersatz für das entfernte Projekt
  löschen. 🔴 Der Endpunkt autorisiert pro Projekt und **meldet Ablehnungen mit HTTP 200**. Der Node
  bestätigt Erfolg deshalb nur, wenn die ID in der `succeeded`-Liste der API zurückkommt, und gibt
  sonst `success: false` samt Fehlertext der API aus. **Dieses Feld bitte prüfen** — die Ausführung
  ist in beiden Fällen grün. Archivieren wirkt **pro Benutzer**, nicht organisationsweit.
- **Projekt aus Vorlage erstellen** — der Ersatz für das entfernte Projekt erstellen.
- **Artefakt als PPTX exportieren** — das Gegenstück zum PDF-Export.

## ⚠️ Breaking Changes

- **Projekt löschen und Projekt erstellen sind entfernt.** oneAI bedient `POST /api/projects` und
  `DELETE /api/projects/{id}` nicht mehr; sie konnten nicht funktionieren. Ein gespeicherter
  Workflow, der eine davon nutzt, scheitert jetzt mit `Unknown operation`. Stattdessen: Projekt
  archivieren oder Projekt aus Vorlage erstellen.
- **Chat erstellen** erwartet eine **Space-ID** statt einer Projekt-ID; **Chats auflisten** filtert
  nach Space; **Chat aktualisieren** bietet Persona und Agent statt eines Projektwechsels. Nichts
  davon konnte vorher erfolgreich sein, es ändert sich also kein *funktionierender* Workflow.
- **Artefakt als PDF exportieren** und **Datei herunterladen** schreiben jetzt in eine Binärproperty
  statt JSON zurückzugeben. Nachgelagerte Nodes, die dort `.json` lesen, müssen angepasst werden.

Die `typeVersion` des Nodes bleibt **1**, bestehende Nodes funktionieren also weiter.

## Unter der Haube

- Pfadsegmente in Requests sind durchgängig perzent-kodiert. Bei einem Node mit `usableAsTool` könnte
  sonst ein vorgelagerter Ausdruck — oder eine Prompt-Injection über einen AI-Agenten — eine Anfrage
  unter der Instanz-Credential auf einen anderen Endpunkt lenken.
- Das veröffentlichte Paket enthält den Build-Cache nicht mehr, der in `0.1.9` mitgeliefert wurde,
  und der Build kann nicht länger Erfolg melden, ohne überhaupt JavaScript zu erzeugen.
- Weiterhin **null Laufzeitabhängigkeiten**. Mit Provenance veröffentlicht.

## Vor und nach der Veröffentlichung geprüft

Alle Gates grün aus einem frischen Klon von `main`, auf Node 24 und auf Node 22 — der Version, die
CI festlegt. Das veröffentlichte Tarball wurde heruntergeladen und geprüft, nicht geglaubt: 62
Actions, `typeVersion` 1, kein Build-Cache, null Abhängigkeiten, und eine Prüfsumme identisch mit
der im Publish-Protokoll.
