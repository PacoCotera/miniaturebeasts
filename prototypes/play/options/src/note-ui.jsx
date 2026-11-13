// The note dialog and the section dialog (Radix Dialog / AlertDialog; react-textarea-autosize; react-image-crop). The words are note-strings.json, as the copywriter wrote them.
import { useState, useRef, useSyncExternalStore } from "react";
import { AlertDialog, Dialog } from "radix-ui";
import TextareaAutosize from "react-textarea-autosize";
import ReactCrop from "react-image-crop";
import STR from "../../src/note-strings.json";
import { fmt, mss, clock, sentWithLine, LIMITS } from "../../src/notes.mjs";

export const T = (key, vars) => fmt(STR[key] ?? key, vars);
const useNote = (c) => useSyncExternalStore(c.subscribe, c.getState);

function Thumb({ it, c }) {
  const clip = it.kind === "last" || it.kind === "clip";
  return (
    <div className="op-thumb-box">
      <div className="op-thumbpic">
        {clip ? <video src={it.url + "#t=0.1"} controls preload="metadata" aria-label={T("note.thumb.play")} /> : <button type="button" className="op-thumbbtn" onClick={() => c.cutItem(it.id)} aria-label={T("note.thumb." + it.kind)}><img src={it.url} alt="" /></button>}
        <button type="button" className="op-x" aria-label={T("note.thumb.remove")} onClick={() => c.remove(it.id)}>×</button>
        {clip && it.ms != null ? <span className="op-dur">{mss(it.ms)}</span> : null}
      </div>
      <div className="op-cap">{T("note.thumb." + it.kind)}</div>
    </div>
  );
}

export function NoteDialog({ c }) {
  const s = useNote(c), [askDelete, setAskDelete] = useState(false);
  const empty = !s.items.length && !s.text.trim();
  const full = s.full ? T(s.full) : "";
  const recOk = c.canRecordAny();
  return (
    <Dialog.Root open={s.open} onOpenChange={(o) => { if (!o) c.keepPlaying(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="op-overlay" />
        <Dialog.Content className="op-panel op-note" data-options="" data-note="" aria-describedby={undefined}>
          <div className="op-notehead"><Dialog.Title className="op-title">{T("note.title")}</Dialog.Title><span className="op-from">{T("note.from", { source: s.from, time: clock(s.at || Date.now()) })}</span></div>
          {s.items.length ? <div className="op-thumbs">{s.items.map((it) => <Thumb key={it.id} it={it} c={c} />)}</div> : null}
          <div className="op-adds">
            <button type="button" className="op-btn" id="noteAddWhole" onClick={() => c.addWhole()}>{T("note.add.whole")}</button>
            <button type="button" className="op-btn" id="noteAddSection" onClick={() => c.addSection()}>{T("note.add.section")}</button>
            <button type="button" className="op-btn" id="noteAddLast" disabled={s.busy === "last"} onClick={() => c.addLast()}>{T("note.add.last")}</button>
            <button type="button" className="op-btn" id="noteRecord" disabled={!recOk} onClick={() => c.record()}><span className="op-dot" aria-hidden="true" />{T("note.record")}</button>
          </div>
          {full ? <div className="op-line op-warn" role="status">{full}</div> : null}
          <TextareaAutosize className="op-note-text" id="noteText" minRows={3} maxRows={6} maxLength={LIMITS.textChars} placeholder={T("note.text.placeholder")} value={s.text} onChange={(e) => c.setText(e.target.value)} />
          <div className="op-sent">
            <div className="op-sent-title">{T("note.sentWith.title")}</div>
            <div className="op-sent-line" id="noteSentWith">{sentWithLine(s.ctx)}</div>
            <div className="op-line">{T("note.privacy")}</div>
            <div className="op-line">{T("note.limits")}</div>
          </div>
          <div className="op-actions op-noteactions">
            <AlertDialog.Root open={askDelete} onOpenChange={setAskDelete}>
              <button type="button" className="op-btn op-quiet" id="noteDelete" disabled={empty} onClick={() => setAskDelete(true)}>{T("note.delete")}</button>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="op-overlay op-over2" />
                <AlertDialog.Content className="op-panel op-confirm" data-options="">
                  <AlertDialog.Title className="op-title">{T("note.delete.confirm.title")}</AlertDialog.Title>
                  <AlertDialog.Description className="op-line">{T("note.delete.confirm.line")}</AlertDialog.Description>
                  <div className="op-actions">
                    <AlertDialog.Cancel className="op-btn">{T("note.delete.confirm.cancel")}</AlertDialog.Cancel>
                    <AlertDialog.Action className="op-btn op-go" id="noteDeleteYes" onClick={() => c.discard()}>{T("note.delete.confirm.yes")}</AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
            <span className="op-grow" />
            <Dialog.Close className="op-btn" id="noteKeep">{T("note.keepPlaying")}</Dialog.Close>
            <button type="button" className="op-btn op-go" id="noteSend" disabled={empty || s.busy === "send"} onClick={() => c.send()}>{T("note.send")}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// the section: the shot full size, drag a rectangle; nothing dragged keeps the whole screen
export function SectionDialog({ c }) {
  const s = useNote(c), cut = s.cut, img = useRef(null), [crop, setCrop] = useState(), [done, setDone] = useState(null);
  const n = s.items.length + (cut && cut.add ? 1 : 0), i = cut ? (cut.add ? n : s.items.findIndex((x) => x.id === cut.it.id) + 1) : 0;
  const reset = () => { setCrop(undefined); setDone(null); };
  const use = () => {
    const el = img.current; if (!done || !el || !done.width || !done.height) { reset(); c.cancelCut(); return; }
    const kx = el.naturalWidth / el.width, ky = el.naturalHeight / el.height;
    const r = { x: done.x * kx, y: done.y * ky, width: done.width * kx, height: done.height * ky }; reset(); c.useSection(r);
  };
  return (
    <Dialog.Root open={!!cut} onOpenChange={(o) => { if (!o) { reset(); c.cancelCut(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="op-overlay op-over2" />
        <Dialog.Content className="op-panel op-section" data-options="" data-note="" aria-describedby={undefined}>
          <Dialog.Title className="op-title">{T("section.title")}</Dialog.Title>
          <div className="op-line">{T("section.line", { i, n })}</div>
          <div className="op-cropbox">{cut ? <ReactCrop crop={crop} onChange={(p) => setCrop(p)} onComplete={(p) => setDone(p)} keepSelection minWidth={8} minHeight={8}><img ref={img} src={cut.it.url} alt="" className="op-cropimg" /></ReactCrop> : null}</div>
          <div className="op-actions">
            <Dialog.Close className="op-btn" id="sectionWhole">{T("section.whole")}</Dialog.Close>
            <button type="button" className="op-btn op-go" id="sectionUse" disabled={!done || !done.width} onClick={use}>{T("section.use")}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
