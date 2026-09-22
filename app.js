const { useState, useEffect, useMemo, useRef } = React;

const APP_VERSION = "2.07";

// --- Licenza / sblocco funzioni premium ---
const LICENSE_SECRET = "Quinzanese-RosaSquadra-2026-K7v";

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function computeUnlockCode(deviceCode) {
  const h1 = fnv1a(deviceCode + LICENSE_SECRET);
  const h2 = fnv1a(LICENSE_SECRET + deviceCode + "x");
  const raw = (h1.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const code = raw.slice(0, 8).padEnd(8, "0");
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

function generaCodiceRichiesta() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}`;
}


const ICONS = {
  User: "\uD83D\uDC64", Phone: "\uD83D\uDCDE", Calendar: "\uD83D\uDCC5", ShieldAlert: "\uD83D\uDEE1",
  Hash: "#", Plus: "+", X: "\u2715", Pencil: "\u270F", Trash2: "\uD83D\uDDD1",
  Search: "\uD83D\uDD0D", Users: "\uD83D\uDC65", Dumbbell: "\uD83C\uDFCB",
  Trophy: "\uD83C\uDFC6", BarChart3: "\uD83D\uDCCA", Clock: "\u23F1",
  Check: "\u2713", Square: "\u25AB", ArrowRightLeft: "\u21C4",
  Settings: "\u2699", FileUp: "\uD83D\uDCE5", Save: "\uD83D\uDCBE", RotateCcw: "\u267B",
  Shuffle: "\uD83D\uDD00", Medal: "\uD83C\uDFC5", Shield: "\uD83D\uDEE1", ClipboardList: "\uD83D\uDCCB", Lock: "\uD83D\uDD12", Printer: "\uD83D\uDDA8", MessageCircle: "\uD83D\uDCAC",
  Play: "\u25B6", Pause: "\u23F8", StopCircle: "\u23F9", Whistle: "\uD83D\uDCE3", Yellow: "\uD83D\uDFE8", Red: "\uD83D\uDFE5", Football: "\u26BD", Gloves: "\uD83E\uDDE4", Cloud: "\u2601"
};

function Icon({ name, size = 16 }) {
  return React.createElement(
    "span",
    { style: { fontSize: size, lineHeight: 1, display: "inline-flex", alignItems: "center" } },
    ICONS[name] || ""
  );
}

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="WhatsApp">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M22.5 9.4a8.9 8.9 0 00-14.1 10.7L7 25l5.1-1.3a8.9 8.9 0 0010.4-14.3zM16 22.9a6.9 6.9 0 01-3.5-1l-.3-.1-2.9.8.8-2.8-.2-.3A6.9 6.9 0 1116 22.9zm3.8-5.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.9-.3-1.7-1.1-.6-.6-1-1.2-1.2-1.5-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.3.1-.1 0-.3 0-.4-.1-.1-.5-1.2-.7-1.6-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.4.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z"
      />
    </svg>
  );
}


const RUOLI = [
  "Portiere",
  "Difensore",
  "Difensore centrale",
  "Terzino DX",
  "Terzino SX",
  "Centrocampista",
  "Centrocampista centrale",
  "Ala DX",
  "Ala SX",
  "Attaccante",
];

const RENDIMENTO_OPZIONI = ["Scarso", "Sufficiente", "Buono", "Ottimo"];

const RENDIMENTO_COLOR = {
  Scarso: "#C1440E",
  Sufficiente: "#B5850A",
  Buono: "#40916C",
  Ottimo: "#1B4332",
};

const emptyTraining = {
  id: null,
  data: new Date().toISOString().slice(0, 10),
  chiuso: false,
  entries: {}, // playerId -> { presente, rendimento, minutaggio, votoImpegno }
  categoria: null,
};

const emptyMatch = {
  id: null,
  data: new Date().toISOString().slice(0, 10),
  avversario: "",
  casa: true,
  tipo: "campionato", // "campionato" | "amichevole"
  chiuso: false,
  golFatti: "",
  golSubiti: "",
  entries: {}, // playerId -> { stato: 'titolare'|'subentrato'|null, sostituito, cartelliniGialli, cartellinoRosso, minutaggio, votoImpegno }
  live: null,
  categoria: null,
};

function defaultLive(numPeriodi) {
  const n = numPeriodi > 0 ? numPeriodi : 2;
  return { periodo: 0, fase: "idle", elapsed: Array(n).fill(0), runningSince: null, eventi: [] };
}

function normalizzaLive(live, numPeriodi) {
  const n = numPeriodi > 0 ? numPeriodi : 2;
  const base = live && Array.isArray(live.elapsed) ? { ...live, elapsed: [...live.elapsed] } : defaultLive(n);
  while (base.elapsed.length < n) base.elapsed.push(0);
  if (base.elapsed.length > n) base.elapsed = base.elapsed.slice(0, n);
  if (!base.fase) base.fase = "idle";
  return base;
}

function liveElapsedSec(live) {
  const idx = Math.max(0, live.periodo - 1);
  const base = live.elapsed[idx] || 0;
  if (live.fase === "running" && live.runningSince) {
    return base + Math.floor((Date.now() - live.runningSince) / 1000);
  }
  return base;
}

function liveMinuto(live, categoria) {
  if (live.periodo === 0) return 0;
  const offset = (live.periodo - 1) * categoria.periodoMinuti;
  const sec = liveElapsedSec(live);
  return offset + Math.floor(sec / 60) + 1;
}

function fmtMMSS(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function periodoLabel(n, totale) {
  const nomi = ["1°", "2°", "3°", "4°", "5°"];
  const base = nomi[n - 1] || `${n}°`;
  return totale <= 2 ? `${base} Tempo` : `${base} Periodo`;
}

function emptyMatchEntry() {
  return {
    stato: null,
    sostituito: false,
    cartelliniGialli: 0,
    cartellinoRosso: false,
    minutaggio: "",
    votoImpegno: "",
    minutoSostituzione: "",
    minutoSubentro: "",
    minutoInfortunio: "",
    numeroMagliaPartita: "",
    golSegnati: "",
    golSubitiPortiere: "",
    motivoAssenza: "",
  };
}

const emptyFriendly = {
  id: null,
  trainingId: null,
  data: "",
  assegnazioni: {}, // playerId -> "A" | "B" | null
  risultato: null, // "A" | "B" | null (mai pareggio: si decide ai rigori)
  rigori: false,
};

const emptyConvocazione = {
  id: null,
  matchId: null,
  convocatiIds: [], // playerId[]
  dataRitrovo: "",
  oraRitrovo: "",
  indirizzo: "",
  note: "",
};

function calcolaClassifica(players, friendlies) {
  const punti = {};
  players.forEach((p) => (punti[p.id] = 0));
  friendlies.forEach((f) => {
    if (!f.risultato) return;
    const puntiVittoria = f.rigori ? 2 : 3;
    const puntiSconfitta = f.rigori ? 1 : 0;
    Object.entries(f.assegnazioni || {}).forEach(([id, team]) => {
      if (!team || !(id in punti)) return;
      punti[id] += f.risultato === team ? puntiVittoria : puntiSconfitta;
    });
  });
  return [...players]
    .map((p) => ({ id: p.id, nome: `${p.cognome} ${p.nome}`, ruolo: p.ruolo, punti: punti[p.id] || 0 }))
    .sort((a, b) => b.punti - a.punti || a.nome.localeCompare(b.nome));
}

function shuffleAssegna(players) {
  const gruppi = {};
  players.forEach((p) => {
    (gruppi[p.ruolo] = gruppi[p.ruolo] || []).push(p);
  });
  const assegnazioni = {};
  let toggle = 0;
  Object.values(gruppi).forEach((gruppo) => {
    for (let i = gruppo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gruppo[i], gruppo[j]] = [gruppo[j], gruppo[i]];
    }
    gruppo.forEach((p, i) => {
      assegnazioni[p.id] = (i + toggle) % 2 === 0 ? "A" : "B";
    });
    toggle = (toggle + gruppo.length) % 2;
  });
  return assegnazioni;
}

const RUOLO_COLOR = {
  Portiere: "#E9C46A",
  Difensore: "#2D6A4F",
  "Difensore centrale": "#1B4332",
  "Terzino DX": "#40916C",
  "Terzino SX": "#40916C",
  Centrocampista: "#40916C",
  "Centrocampista centrale": "#2D6A4F",
  "Ala DX": "#F4A261",
  "Ala SX": "#F4A261",
  Attaccante: "#E76F51",
};

const CATEGORIE = [
  { id: "pulcini10", nome: "Pulcini (Under 10)", durata: 45, numPeriodi: 3, periodoMinuti: 15 },
  { id: "pulcini11", nome: "Pulcini (Under 11)", durata: 45, numPeriodi: 3, periodoMinuti: 15 },
  { id: "esordienti12", nome: "Esordienti (Under 12)", durata: 60, numPeriodi: 3, periodoMinuti: 20 },
  { id: "esordienti13", nome: "Esordienti (Under 13)", durata: 60, numPeriodi: 3, periodoMinuti: 20 },
  { id: "giovanissimi14", nome: "Giovanissimi (Under 14)", durata: 70, numPeriodi: 2, periodoMinuti: 35 },
  { id: "giovanissimi15", nome: "Giovanissimi (Under 15)", durata: 70, numPeriodi: 2, periodoMinuti: 35 },
  { id: "allievi16", nome: "Allievi (Under 16)", durata: 90, numPeriodi: 2, periodoMinuti: 45 },
  { id: "allievi17", nome: "Allievi (Under 17)", durata: 90, numPeriodi: 2, periodoMinuti: 45 },
  { id: "juniores19", nome: "Juniores U19", durata: 90, numPeriodi: 2, periodoMinuti: 45 },
];

function getCategoria(id) {
  return CATEGORIE.find((c) => c.id === id) || CATEGORIE[5]; // default Giovanissimi U15
}

const emptyPlayer = {
  id: null,
  cognome: "",
  nome: "",
  dataNascita: "",
  cellulare: "",
  cellulareMamma: "",
  cellularePapa: "",
  tessera: "",
  scadenzaCertificato: "",
  ruolo: "Centrocampista",
  categoria: "giovanissimi15",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function certStatus(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return { label: "Non impostato", tone: "neutral" };
  if (d < 0) return { label: "Scaduto", tone: "danger" };
  if (d <= 30) return { label: `Scade tra ${d}g`, tone: "warning" };
  return { label: "In regola", tone: "ok" };
}

function age(dateStr) {
  if (!dateStr) return null;
  const b = new Date(dateStr);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

function isoToItalian(iso) {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function italianToISO(str) {
  if (!str) return "";
  const s = str.trim();
  const m = s.match(/^(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2,4})$/);
  if (!m) return null;
  let [, gg, mm, aaaa] = m;
  gg = gg.padStart(2, "0");
  mm = mm.padStart(2, "0");
  if (aaaa.length === 2) {
    const n = parseInt(aaaa, 10);
    aaaa = (n <= 30 ? 2000 + n : 1900 + n).toString();
  }
  const g = parseInt(gg, 10),
    me = parseInt(mm, 10);
  if (g < 1 || g > 31 || me < 1 || me > 12) return null;
  return `${aaaa}-${mm}-${gg}`;
}

function PlayerForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    // Migrazione dal vecchio campo unico "cellulareGenitore" (versioni precedenti)
    cellulareMamma: initial.cellulareMamma || initial.cellulareGenitore || "",
    cellularePapa: initial.cellularePapa || "",
  }));
  const [dataNascitaInput, setDataNascitaInput] = useState(isoToItalian(initial.dataNascita));
  const [dataNascitaErr, setDataNascitaErr] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.cognome.trim() || !form.nome.trim()) return;
    let dataNascita = "";
    if (dataNascitaInput.trim()) {
      const iso = italianToISO(dataNascitaInput);
      if (!iso) {
        setDataNascitaErr(true);
        return;
      }
      dataNascita = iso;
    }
    setDataNascitaErr(false);
    onSave({ ...form, dataNascita, id: form.id || `p_${Date.now()}` });
  };

  const field = (label, key, type = "text", icon = null, extra = {}) => (
    <label className="field">
      <span className="field-label">
        {icon}
        {label}
      </span>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        {...extra}
      />
    </label>
  );

  return (
    <form className="sheet" onSubmit={submit}>
      <div className="sheet-header">
        <h2>{initial.id ? "Modifica giocatore" : "Nuovo giocatore"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel}>
          <Icon name="X" size={18} />
        </button>
      </div>

      <div className="sheet-grid">
        {field("Cognome", "cognome", "text", null, { required: true, autoFocus: true })}
        {field("Nome", "nome", "text", null, { required: true })}
        <label className="field">
          <span className="field-label">Data di nascita</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="gg-mm-aaaa"
            value={dataNascitaInput}
            onChange={(e) => {
              setDataNascitaInput(e.target.value);
              setDataNascitaErr(false);
            }}
          />
          {dataNascitaErr && <span className="field-error">Formato non valido, usa gg-mm-aaaa</span>}
        </label>
        <label className="field">
          <span className="field-label">Ruolo</span>
          <select value={form.ruolo} onChange={set("ruolo")}>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Categoria</span>
          <select value={form.categoria || "giovanissimi15"} onChange={set("categoria")}>
            {CATEGORIE.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        {field("Nr. tessera federazione", "tessera")}
        {field("Cellulare", "cellulare", "tel")}
        {field("Cellulare mamma", "cellulareMamma", "tel")}
        {field("Cellulare papà", "cellularePapa", "tel")}
        {field("Scadenza certificato medico", "scadenzaCertificato", "date")}
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
        <button type="submit" className="btn primary">
          Salva
        </button>
      </div>
    </form>
  );
}

function entries0(e) {
    return {
      stato: null,
      rendimento: "Buono",
      minutaggio: "",
      votoImpegno: "",
      infortunato: false,
      minutoInfortunio: "",
      motivoAssenza: "",
      ...(e || {}),
    };
  }

function TrainingForm({ initial, players, onSave, onCancel }) {
  const chiuso = !!initial.chiuso;
  const [data, setData] = useState(initial.data);
  const [entries, setEntries] = useState(() => {
    const base = {};
    players.forEach((p) => {
      base[p.id] = entries0(initial.entries[p.id]);
    });
    return base;
  });

  const setStato = (id, stato) =>
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], stato: prev[id].stato === stato ? null : stato },
    }));

  const toggleInfortunato = (id) =>
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], infortunato: !prev[id].infortunato },
    }));

  const updateField = (id, key, value) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const submit = (e) => {
    e.preventDefault();
    onSave({ id: initial.id || `t_${Date.now()}`, data, chiuso, entries });
  };

  const chiudiAllenamento = () => {
    if (!window.confirm("Chiudere questo allenamento? Non sarà più modificabile (potrai solo eliminarlo e rifarlo).")) return;
    onSave({ id: initial.id || `t_${Date.now()}`, data, chiuso: true, entries });
  };

  const sorted = [...players].sort((a, b) => a.cognome.localeCompare(b.cognome));

  return (
    <form className="sheet" onSubmit={submit}>
      <div className="sheet-header">
        <h2>{initial.id ? "Modifica allenamento" : "Nuovo allenamento"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel}>
          <Icon name="X" size={18} />
        </button>
      </div>

      {chiuso && (
        <p className="chiuso-banner">
          <Icon name="Lock" size={13} /> Allenamento chiuso: sola lettura. Per correggere, eliminalo e rifallo.
        </p>
      )}

      <div className={chiuso ? "locked-content" : undefined}>
        <label className="field" style={{ marginBottom: 14 }}>
          <span className="field-label">
            <Icon name="Calendar" size={13} /> Data
          </span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </label>

        {sorted.length === 0 ? (
          <p className="muted">Aggiungi prima qualche giocatore in Anagrafica.</p>
        ) : (
          <>
            <div className="roster-legend">
              <span></span>
              <span>Rendimento</span>
              <span>Min.</span>
            <span>Voto (1-10)</span>
          </div>
          <div className="roster">
            {sorted.map((p) => {
              const e = entries[p.id];
              return (
                <div key={p.id} className={`roster-row match-row ${e.stato ? "on" : ""}`}>
                  <div className="match-row-top">
                    <div className="roster-name">
                      <div className="roster-name-main">
                        {p.cognome} {p.nome}
                      </div>
                      <div className="roster-name-sub">{p.ruolo}</div>
                    </div>
                    <div className="stato-toggle">
                      <button
                        type="button"
                        className={`stato-btn ${e.stato === "presente" ? "active" : ""}`}
                        onClick={() => setStato(p.id, "presente")}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        className={`stato-btn assente ${e.stato === "assente" ? "active" : ""}`}
                        onClick={() => setStato(p.id, "assente")}
                      >
                        Assente
                      </button>
                    </div>
                  </div>

                  {e.stato === "assente" && (
                    <div className="match-fields">
                      <input
                        type="text"
                        placeholder="Motivo assenza (es. malattia, svogliato, impegno...)"
                        value={e.motivoAssenza}
                        onChange={(ev) => updateField(p.id, "motivoAssenza", ev.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}

                  {e.stato === "presente" && (
                    <div className="match-fields">
                      <select
                        value={e.rendimento}
                        onChange={(ev) => updateField(p.id, "rendimento", ev.target.value)}
                        title="Rendimento in allenamento"
                      >
                        {RENDIMENTO_OPZIONI.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        placeholder="min"
                        title="Minuti svolti in allenamento"
                        value={e.minutaggio}
                        onChange={(ev) => updateField(p.id, "minutaggio", ev.target.value)}
                      />
                      <input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="voto"
                        title="Voto all'impegno da 1 a 10"
                        value={e.votoImpegno}
                        onChange={(ev) => updateField(p.id, "votoImpegno", ev.target.value)}
                      />
                    </div>
                  )}

                  {e.stato === "presente" && (
                    <label className="infortunato-check">
                      <input type="checkbox" checked={!!e.infortunato} onChange={() => toggleInfortunato(p.id)} />
                      Infortunato durante l'allenamento
                    </label>
                  )}

                  {e.stato === "presente" && e.infortunato && (
                    <div className="match-fields">
                      <span className="min-inline">
                        <Icon name="Clock" size={11} />
                        <input
                          type="number"
                          min="0"
                          max="120"
                          placeholder="min infortunio"
                          className="min-input"
                          title="Minuto in cui si è fatto male"
                          value={e.minutoInfortunio}
                          onChange={(ev) => updateField(p.id, "minutoInfortunio", ev.target.value)}
                        />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      <div className="sheet-actions">
        {chiuso ? (
          <button type="button" className="btn primary" onClick={onCancel}>
            Chiudi scheda
          </button>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={onCancel}>
              Annulla
            </button>
            <button type="button" className="btn ghost lock-btn" onClick={chiudiAllenamento}>
              <Icon name="Lock" size={14} /> Chiudi allenamento
            </button>
            <button type="submit" className="btn primary">
              Salva
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function TrainingCard({ t, players, nomeSquadra, onEdit, onDelete, onReport, readOnly }) {
  const presenti = Object.values(t.entries).filter((e) => e.stato === "presente");
  const infortunati = Object.values(t.entries).filter((e) => e.stato === "presente" && e.infortunato);
  const assentiCount = Math.max(0, players.length - presenti.length);
  const voti = presenti.map((e) => Number(e.votoImpegno)).filter((v) => !isNaN(v) && v > 0);
  const mediaVoto = voti.length ? (voti.reduce((a, b) => a + b, 0) / voti.length).toFixed(1) : null;

  const presentiIds = new Set(Object.entries(t.entries).filter(([, e]) => e.stato === "presente").map(([id]) => id));
  const presentiNomi = players.filter((p) => presentiIds.has(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome));
  const assentiNomi = players.filter((p) => !presentiIds.has(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome));

  const condividiWhatsapp = () => {
    const noi = nomeSquadra || "Rosa Squadra";
    const dataStr = new Date(t.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
    let testo = `🏋️ ALLENAMENTO\n${noi} — ${dataStr}\n`;
    testo += `\n✅ PRESENTI (${presentiNomi.length}):\n`;
    testo += presentiNomi.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n⬜ ASSENTI (${assentiNomi.length}):\n`;
    testo += assentiNomi.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testo)}`, "_blank");
  };

  return (
    <div className="card training-card">
      <div className="card-number training-date">
        <div className="training-day">{new Date(t.data).getDate()}</div>
        <div className="training-month">
          {new Date(t.data).toLocaleDateString("it-IT", { month: "short" })}
        </div>
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="card-name-row">
            {readOnly ? (
              <span className="icon-btn" style={{ cursor: "default" }}>
                <Icon name={t.chiuso ? "Lock" : "Dumbbell"} size={14} />
              </span>
            ) : (
              <button className="icon-btn edit-inline" onClick={() => onEdit(t)} aria-label="Apri">
                <Icon name={t.chiuso ? "Lock" : "Pencil"} size={14} />
              </button>
            )}
            <div>
              <div className="card-name">
                {presenti.length} presenti {t.chiuso && <span className="chiuso-badge">Chiuso</span>}
              </div>
              <div className="card-meta">{mediaVoto ? `Voto medio impegno: ${mediaVoto}` : "Nessun voto registrato"}</div>
            </div>
          </div>
          <div className="card-actions">
            {!readOnly && (
              <button className="icon-btn danger" onClick={() => onDelete(t.id)} aria-label="Elimina">
                <Icon name="Trash2" size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="training-summary">
          <span className="ts-chip ts-presenti">✅ {presenti.length} pres.</span>
          <span className="ts-chip ts-assenti">⬜ {assentiCount} ass.</span>
          {infortunati.length > 0 && <span className="ts-chip ts-infortunati">🩹 {infortunati.length} inf.</span>}
        </div>
        {t.chiuso && (
          <div className="training-actions">
            <button type="button" className="btn-mini report" onClick={() => onReport(t)}>
              <Icon name="ClipboardList" size={14} /> Report
            </button>
            <button type="button" className="btn-mini whatsapp" onClick={condividiWhatsapp}>
              <WhatsAppIcon size={14} /> Invia WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingReportModal({ t, players, nomeSquadra, onClose }) {
  const presentiIds = new Set(Object.entries(t.entries).filter(([, e]) => e.stato === "presente").map(([id]) => id));
  const presenti = players.filter((p) => presentiIds.has(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome));
  const assenti = players.filter((p) => !presentiIds.has(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome));
  const dataStr = new Date(t.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const noi = nomeSquadra || "Rosa Squadra";

  const condividiWhatsapp = () => {
    let testo = `🏋️ ALLENAMENTO\n${noi} — ${dataStr}\n`;
    testo += `\n✅ PRESENTI (${presenti.length}):\n`;
    testo += presenti.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n⬜ ASSENTI (${assenti.length}):\n`;
    testo += assenti.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testo)}`, "_blank");
  };

  return (
    <div className="sheet">
      <div className="sheet-header">
        <h2>Report presenze</h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <Icon name="X" size={18} />
        </button>
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        {noi} · {dataStr}
      </p>

      <div className="distinta-group">
        <div className="distinta-group-title titolari-title">✅ Presenti ({presenti.length})</div>
        {presenti.length === 0 ? (
          <p className="muted">Nessun presente.</p>
        ) : (
          presenti.map((p) => (
            <div key={p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="distinta-group">
        <div className="distinta-group-title riserve-title">⬜ Assenti ({assenti.length})</div>
        {assenti.length === 0 ? (
          <p className="muted">Nessun assente.</p>
        ) : (
          assenti.map((p) => (
            <div key={p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Chiudi
        </button>
        <button type="button" className="btn primary" onClick={condividiWhatsapp}>
          <WhatsAppIcon size={15} /> Invia WhatsApp
        </button>
      </div>
    </div>
  );
}

function MatchQuickReportModal({ m, players, nomeSquadra, onClose }) {
  const titolari = players
    .filter((p) => m.entries[p.id]?.stato === "titolare" && !m.entries[p.id]?.sostituito)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  const sostituiti = players
    .filter((p) => m.entries[p.id]?.stato === "titolare" && m.entries[p.id]?.sostituito)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  const subentrati = players
    .filter((p) => m.entries[p.id]?.stato === "subentrato")
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  const ammoniti = players
    .filter((p) => (Number(m.entries[p.id]?.cartelliniGialli) || 0) > 0)
    .map((p) => ({ p, n: Number(m.entries[p.id]?.cartelliniGialli) || 0 }))
    .sort((a, b) => a.p.cognome.localeCompare(b.p.cognome));
  const espulsi = players
    .filter((p) => m.entries[p.id]?.cartellinoRosso)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  const marcatori = players
    .filter((p) => (Number(m.entries[p.id]?.golSegnati) || 0) > 0)
    .map((p) => ({ p, n: Number(m.entries[p.id]?.golSegnati) || 0 }))
    .sort((a, b) => b.n - a.n || a.p.cognome.localeCompare(b.p.cognome));
  const portieriGolSubiti = players
    .filter((p) => (Number(m.entries[p.id]?.golSubitiPortiere) || 0) > 0)
    .map((p) => ({ p, n: Number(m.entries[p.id]?.golSubitiPortiere) || 0 }))
    .sort((a, b) => a.p.cognome.localeCompare(b.p.cognome));
  const dataStr = new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const noi = nomeSquadra || "Rosa Squadra";
  const avv = m.avversario || "Avversario";
  const haRisultato = m.golFatti !== "" && m.golFatti !== undefined && m.golSubiti !== "" && m.golSubiti !== undefined;

  const condividiWhatsapp = () => {
    let testo = `⚽ ${noi} vs ${avv} — ${dataStr}\n`;
    if (haRisultato) testo += `Risultato: ${m.golFatti}-${m.golSubiti}\n`;
    testo += `\n✅ TITOLARI (${titolari.length}):\n`;
    testo += titolari.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n🔻 SOSTITUITI (${sostituiti.length}):\n`;
    testo += sostituiti.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n🔼 SUBENTRATI (${subentrati.length}):\n`;
    testo += subentrati.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    if (marcatori.length > 0) {
      testo += `\n\n⚽ MARCATORI:\n`;
      testo += marcatori.map((r) => `${r.p.cognome} ${r.p.nome}${r.n > 1 ? ` (${r.n})` : ""}`).join("\n");
    }
    if (ammoniti.length > 0) {
      testo += `\n\n🟨 AMMONITI:\n`;
      testo += ammoniti.map((r) => `${r.p.cognome} ${r.p.nome}${r.n > 1 ? ` (${r.n})` : ""}`).join("\n");
    }
    if (espulsi.length > 0) {
      testo += `\n\n🟥 ESPULSI:\n`;
      testo += espulsi.map((p) => `${p.cognome} ${p.nome}`).join("\n");
    }
    if (portieriGolSubiti.length > 0) {
      testo += `\n\n🧤 GOL SUBITI (portiere):\n`;
      testo += portieriGolSubiti.map((r) => `${r.p.cognome} ${r.p.nome} — ${r.n} gol`).join("\n");
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testo)}`, "_blank");
  };

  return (
    <div className="sheet">
      <div className="sheet-header">
        <h2>Report partita</h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <Icon name="X" size={18} />
        </button>
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        {noi} vs {avv} · {dataStr}
        {haRisultato ? ` · ${m.golFatti}-${m.golSubiti}` : ""}
      </p>

      <div className="distinta-group">
        <div className="distinta-group-title titolari-title">✅ Titolari ({titolari.length})</div>
        {titolari.length === 0 ? (
          <p className="muted">Nessuno.</p>
        ) : (
          titolari.map((p) => (
            <div key={p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="distinta-group">
        <div className="distinta-group-title esito-s">🔻 Sostituiti ({sostituiti.length})</div>
        {sostituiti.length === 0 ? (
          <p className="muted">Nessuno.</p>
        ) : (
          sostituiti.map((p) => (
            <div key={p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="distinta-group">
        <div className="distinta-group-title riserve-title">🔼 Subentrati ({subentrati.length})</div>
        {subentrati.length === 0 ? (
          <p className="muted">Nessuno.</p>
        ) : (
          subentrati.map((p) => (
            <div key={p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {marcatori.length > 0 && (
        <div className="distinta-group">
          <div className="distinta-group-title titolari-title">⚽ Marcatori ({marcatori.length})</div>
          {marcatori.map((r) => (
            <div key={r.p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {r.p.cognome} {r.p.nome}
                  {r.n > 1 ? ` (${r.n} gol)` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {ammoniti.length > 0 && (
        <div className="distinta-group">
          <div className="distinta-group-title" style={{ color: "#B5850A" }}>🟨 Ammoniti ({ammoniti.length})</div>
          {ammoniti.map((r) => (
            <div key={r.p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {r.p.cognome} {r.p.nome}
                  {r.n > 1 ? ` (${r.n})` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {espulsi.length > 0 && (
        <div className="distinta-group">
          <div className="distinta-group-title esito-s">🟥 Espulsi ({espulsi.length})</div>
          {espulsi.map((p) => (
            <div key={p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {portieriGolSubiti.length > 0 && (
        <div className="distinta-group">
          <div className="distinta-group-title riserve-title">🧤 Gol subiti (portiere)</div>
          {portieriGolSubiti.map((r) => (
            <div key={r.p.id} className="distinta-row">
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {r.p.cognome} {r.p.nome} — {r.n} gol
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Chiudi
        </button>
        <button type="button" className="btn primary" onClick={condividiWhatsapp}>
          <WhatsAppIcon size={15} /> Invia WhatsApp
        </button>
      </div>
    </div>
  );
}

function MatchReport({ m, players, nomeSquadra, onClose }) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));

  const convocati = Object.entries(m.entries)
    .filter(([, e]) => ["titolare", "riserva", "subentrato", "infortunato"].includes(e.stato))
    .map(([id, e]) => ({ p: byId[id], e, n: e.numeroMagliaPartita !== "" ? Number(e.numeroMagliaPartita) : null }))
    .filter((r) => r.p);

  const nonConvocati = Object.entries(m.entries)
    .filter(([, e]) => e.stato === "non_convocato")
    .map(([id]) => byId[id])
    .filter(Boolean)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));

  const titolari = convocati
    .filter((r) => r.n !== null && r.n >= 1 && r.n <= 11)
    .sort((a, b) => a.n - b.n);
  const riserve = convocati
    .filter((r) => r.n !== null && r.n >= 12 && r.n <= 20)
    .sort((a, b) => a.n - b.n);
  const senzaNumero = convocati.filter((r) => r.n === null || r.n < 1 || r.n > 20);

  const inCasa = m.casa !== false;
  const noi = nomeSquadra || "Rosa Squadra";

  const condividiWhatsapp = () => {
    const dataStr = new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
    let testo = `📋 DISTINTA GARA\n${noi} ${inCasa ? "🏠" : "🚌"} vs ${m.avversario || "Avversario"} — ${dataStr}\n`;
    testo += `\nTITOLARI (${titolari.length}/11):\n`;
    testo += titolari.map((r) => `${r.n}. ${r.p.cognome} ${r.p.nome}`).join("\n") || "—";
    testo += `\n\nRISERVE (${riserve.length}):\n`;
    testo += riserve.map((r) => `${r.n}. ${r.p.cognome} ${r.p.nome}`).join("\n") || "—";
    if (senzaNumero.length > 0) {
      testo += `\n\nCONVOCATI SENZA NUMERO (${senzaNumero.length}):\n`;
      testo += senzaNumero.map((r) => `${r.p.cognome} ${r.p.nome}`).join("\n");
    }
    testo += `\n\nNON CONVOCATI (${nonConvocati.length}):\n`;
    testo += nonConvocati.map((p) => `${p.cognome} ${p.nome}`).join("\n") || "—";
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testo)}`, "_blank");
  };

  return (
    <div className="sheet">
      <div className="sheet-header">
        <h2>Distinta gara</h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <Icon name="X" size={18} />
        </button>
      </div>

      <p className="muted" style={{ marginBottom: 12 }}>
        {noi} {inCasa ? "🏠" : "🚌"} vs {m.avversario || "Avversario"} ·{" "}
        {new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
      </p>

      <div className="distinta-group">
        <div className="distinta-group-title titolari-title">Titolari ({titolari.length}/11)</div>
        {titolari.length === 0 ? (
          <p className="muted">Nessun titolare con maglia 1-11 assegnata.</p>
        ) : (
          titolari.map((r) => (
            <div key={r.p.id} className="distinta-row">
              <span className="distinta-num">{r.n}</span>
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {r.p.cognome} {r.p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="distinta-group">
        <div className="distinta-group-title riserve-title">Riserve ({riserve.length})</div>
        {riserve.length === 0 ? (
          <p className="muted">Nessuna riserva con maglia 12-20 assegnata.</p>
        ) : (
          riserve.map((r) => (
            <div key={r.p.id} className="distinta-row">
              <span className="distinta-num">{r.n}</span>
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {r.p.cognome} {r.p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {senzaNumero.length > 0 && (
        <div className="distinta-group">
          <div className="distinta-group-title">Convocati senza numero valido</div>
          {senzaNumero.map((r) => (
            <div key={r.p.id} className="distinta-row">
              <span className="distinta-num">—</span>
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {r.p.cognome} {r.p.nome}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="distinta-group">
        <div className="distinta-group-title non-conv-title">Non convocati ({nonConvocati.length})</div>
        {nonConvocati.length === 0 ? (
          <p className="muted">Nessuno.</p>
        ) : (
          nonConvocati.map((p) => (
            <div key={p.id} className="distinta-row">
              <span className="distinta-num">—</span>
              <div className="distinta-name-block">
                <div className="distinta-name">
                  {p.cognome} {p.nome}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Chiudi
        </button>
        <button type="button" className="btn primary" onClick={condividiWhatsapp} style={{ background: "#25D366" }}>
          <WhatsAppIcon size={15} /> Invia WhatsApp
        </button>
      </div>
    </div>
  );
}

function LiveMatchModal({ m, players, nomeSquadra, categoria, onUpdateMatch, onClose }) {
  const [, forceTick] = useState(0);
  const numPeriodi = categoria.numPeriodi;
  const live = normalizzaLive(m.live, numPeriodi);
  const noi = nomeSquadra || "Rosa Squadra";
  const durataPartita = categoria.durata;

  useEffect(() => {
    if (live.fase !== "running") return;
    const iv = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, [live.fase, live.runningSince, live.periodo]);

  const updateLive = (updater) => {
    onUpdateMatch(m.id, (x) => ({ ...x, live: updater(normalizzaLive(x.live, numPeriodi)) }));
  };

  const updateEntry = (playerId, patch) => {
    onUpdateMatch(m.id, (x) => {
      const prevEntry = x.entries[playerId] || emptyMatchEntry();
      return { ...x, entries: { ...x.entries, [playerId]: { ...prevEntry, ...(typeof patch === "function" ? patch(prevEntry) : patch) } } };
    });
  };

  const setScore = (campo, delta) => {
    onUpdateMatch(m.id, (x) => ({ ...x, [campo]: String(Math.max(0, (Number(x[campo]) || 0) + delta)) }));
  };

  const avviaPeriodo = () =>
    updateLive((l) => {
      if (l.fase === "idle") return { ...l, periodo: 1, fase: "running", runningSince: Date.now() };
      if (l.fase === "intervallo") return { ...l, periodo: l.periodo + 1, fase: "running", runningSince: Date.now() };
      return l;
    });
  const pausa = () =>
    updateLive((l) => {
      if (l.fase !== "running" || !l.runningSince) return { ...l, fase: "paused", runningSince: null };
      const add = Math.floor((Date.now() - l.runningSince) / 1000);
      const idx = l.periodo - 1;
      const elapsed = [...l.elapsed];
      elapsed[idx] = (elapsed[idx] || 0) + add;
      return { ...l, fase: "paused", runningSince: null, elapsed };
    });
  const riprendi = () => updateLive((l) => ({ ...l, fase: "running", runningSince: Date.now() }));
  const finePeriodo = () => {
    pausa();
    updateLive((l) => ({ ...l, fase: l.periodo >= numPeriodi ? "finita" : "intervallo", runningSince: null }));
  };

  const minutoCorrente = liveMinuto(live, categoria);
  const secCorrente = liveElapsedSec(live);
  const idxCorrente = Math.max(0, live.periodo - 1);
  const ultimoPeriodo = live.periodo >= numPeriodi;

  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const inCampo = players
    .filter((p) => {
      const e = m.entries[p.id];
      if (!e) return false;
      return (e.stato === "titolare" && !e.sostituito) || e.stato === "subentrato";
    })
    .sort((a, b) => {
      const ea = m.entries[a.id],
        eb = m.entries[b.id];
      if (ea.stato !== eb.stato) return ea.stato === "titolare" ? -1 : 1;
      if (ea.stato === "titolare") {
        const na = Number(ea.numeroMagliaPartita) || 999,
          nb = Number(eb.numeroMagliaPartita) || 999;
        return na !== nb ? na - nb : a.cognome.localeCompare(b.cognome);
      }
      const ma = Number(ea.minutoSubentro) || 0,
        mb = Number(eb.minutoSubentro) || 0;
      return ma !== mb ? ma - mb : a.cognome.localeCompare(b.cognome);
    });
  const inPanchina = players
    .filter((p) => m.entries[p.id]?.stato === "riserva")
    .sort((a, b) => {
      const na = Number(m.entries[a.id]?.numeroMagliaPartita) || 999,
        nb = Number(m.entries[b.id]?.numeroMagliaPartita) || 999;
      return na !== nb ? na - nb : a.cognome.localeCompare(b.cognome);
    });
  const portieriInCampo = inCampo.filter((p) => p.ruolo === "Portiere");

  const [eventoStep, setEventoStep] = useState(null); // null | 'tipo' | 'giocatore' | 'sostituzione'
  const [eventoTipo, setEventoTipo] = useState(null);
  const [subUscenteId, setSubUscenteId] = useState(null);

  const chiudiEvento = () => {
    setEventoStep(null);
    setEventoTipo(null);
    setSubUscenteId(null);
  };

  const registraEvento = (tipo, playerId, extra = {}) => {
    const minuto = minutoCorrente;
    const evId = `ev_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (tipo === "giallo") {
      updateEntry(playerId, (e) => ({ cartelliniGialli: (Number(e.cartelliniGialli) || 0) + 1 }));
    } else if (tipo === "rosso") {
      updateEntry(playerId, { cartellinoRosso: true });
    } else if (tipo === "gol") {
      updateEntry(playerId, (e) => ({ golSegnati: String((Number(e.golSegnati) || 0) + 1) }));
      setScore("golFatti", 1);
    } else if (tipo === "gol_subito") {
      updateEntry(playerId, (e) => ({ golSubitiPortiere: String((Number(e.golSubitiPortiere) || 0) + 1) }));
      setScore("golSubiti", 1);
    } else if (tipo === "sostituzione") {
      const { entranteId } = extra;
      updateEntry(playerId, { sostituito: true, minutoSostituzione: String(minuto), minutaggio: String(minuto) });
      updateEntry(entranteId, {
        stato: "subentrato",
        minutoSubentro: String(minuto),
        minutaggio: String(Math.max(0, durataPartita - minuto)),
      });
    }
    updateLive((l) => ({
      ...l,
      eventi: [...l.eventi, { id: evId, minuto, tipo, playerId, entranteId: extra.entranteId || null, ts: Date.now() }],
    }));
    chiudiEvento();
  };

  const annullaEvento = (ev) => {
    if (ev.tipo === "giallo") {
      updateEntry(ev.playerId, (e) => ({ cartelliniGialli: Math.max(0, (Number(e.cartelliniGialli) || 0) - 1) }));
    } else if (ev.tipo === "rosso") {
      updateEntry(ev.playerId, { cartellinoRosso: false });
    } else if (ev.tipo === "gol") {
      updateEntry(ev.playerId, (e) => ({ golSegnati: String(Math.max(0, (Number(e.golSegnati) || 0) - 1)) }));
      setScore("golFatti", -1);
    } else if (ev.tipo === "gol_subito") {
      updateEntry(ev.playerId, (e) => ({ golSubitiPortiere: String(Math.max(0, (Number(e.golSubitiPortiere) || 0) - 1)) }));
      setScore("golSubiti", -1);
    } else if (ev.tipo === "sostituzione") {
      updateEntry(ev.playerId, { sostituito: false, minutoSostituzione: "", minutaggio: "" });
      updateEntry(ev.entranteId, { stato: "riserva", minutoSubentro: "", minutaggio: "" });
    }
    updateLive((l) => ({ ...l, eventi: l.eventi.filter((x) => x.id !== ev.id) }));
  };

  const EVENTO_LABELS = {
    giallo: "🟨 Ammonizione",
    rosso: "🟥 Espulsione",
    gol: "⚽ Gol realizzato",
    gol_subito: "🧤 Gol subito",
    sostituzione: "🔄 Sostituzione",
  };

  return (
    <div className="sheet live-sheet">
      <div className="sheet-header">
        <h2>Partita live</h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          <Icon name="X" size={18} />
        </button>
      </div>

      <div className="live-scoreboard">
        <div className="live-team">{m.casa !== false ? noi : m.avversario || "Avversario"}</div>
        <div className="live-score">
          {m.casa !== false ? m.golFatti || 0 : m.golSubiti || 0} - {m.casa !== false ? m.golSubiti || 0 : m.golFatti || 0}
        </div>
        <div className="live-team">{m.casa !== false ? m.avversario || "Avversario" : noi}</div>
      </div>

      <div className="live-timer-block">
        <div className="live-timer-label">
          {live.fase === "idle" && "Da iniziare"}
          {live.fase === "running" && periodoLabel(live.periodo, numPeriodi)}
          {live.fase === "paused" && `${periodoLabel(live.periodo, numPeriodi)} — in pausa`}
          {live.fase === "intervallo" && "Intervallo"}
          {live.fase === "finita" && "Partita terminata"}
        </div>
        <div className="live-timer-display">
          {live.fase === "idle" ? "00:00" : `${live.fase === "intervallo" ? minutoCorrente : minutoCorrente}' — ${fmtMMSS(secCorrente)}`}
        </div>
        <div className="live-timer-controls">
          {live.fase === "idle" && (
            <button type="button" className="btn primary" onClick={avviaPeriodo}>
              <Icon name="Play" size={15} /> Avvia {periodoLabel(1, numPeriodi)}
            </button>
          )}
          {live.fase === "running" && (
            <>
              <button type="button" className="btn ghost" onClick={pausa}>
                <Icon name="Pause" size={15} /> Pausa
              </button>
              <button
                type="button"
                className={ultimoPeriodo ? "btn danger" : "btn primary"}
                onClick={finePeriodo}
              >
                <Icon name="StopCircle" size={15} /> {ultimoPeriodo ? "Fine partita" : `Fine ${periodoLabel(live.periodo, numPeriodi)}`}
              </button>
            </>
          )}
          {live.fase === "paused" && (
            <>
              <button type="button" className="btn ghost" onClick={riprendi}>
                <Icon name="Play" size={15} /> Riprendi
              </button>
              <button
                type="button"
                className={ultimoPeriodo ? "btn danger" : "btn primary"}
                onClick={finePeriodo}
              >
                <Icon name="StopCircle" size={15} /> {ultimoPeriodo ? "Fine partita" : `Fine ${periodoLabel(live.periodo, numPeriodi)}`}
              </button>
            </>
          )}
          {live.fase === "intervallo" && (
            <button type="button" className="btn primary" onClick={avviaPeriodo}>
              <Icon name="Play" size={15} /> Avvia {periodoLabel(live.periodo + 1, numPeriodi)}
            </button>
          )}
        </div>
      </div>

      {(live.fase === "running" || live.fase === "paused") && (
        <button type="button" className="live-add-event-btn" onClick={() => setEventoStep("tipo")}>
          <Icon name="Plus" size={18} /> Registra evento
        </button>
      )}

      {live.eventi.length > 0 && (
        <div className="live-log">
          <div className="live-log-title">Cronologia eventi</div>
          {[...live.eventi].reverse().map((ev) => (
            <div key={ev.id} className="live-log-row">
              <span className="live-log-min">{ev.minuto}'</span>
              <span className="live-log-desc">
                {EVENTO_LABELS[ev.tipo]} — {byId[ev.playerId]?.cognome} {byId[ev.playerId]?.nome}
                {ev.tipo === "sostituzione" && ev.entranteId && (
                  <> ⇄ {byId[ev.entranteId]?.cognome} {byId[ev.entranteId]?.nome}</>
                )}
              </span>
              <button type="button" className="icon-btn danger" onClick={() => annullaEvento(ev)} aria-label="Annulla">
                <Icon name="X" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Chiudi
        </button>
      </div>

      {eventoStep && (
        <div className="live-event-overlay" onClick={chiudiEvento}>
          <div className="live-event-sheet" onClick={(e) => e.stopPropagation()}>
            {eventoStep === "tipo" && (
              <>
                <div className="live-event-title">Che evento è successo?</div>
                <div className="live-event-grid">
                  {[
                    ["giallo", "🟨 Ammonizione"],
                    ["rosso", "🟥 Espulsione"],
                    ["gol", "⚽ Gol realizzato"],
                    ["gol_subito", "🧤 Gol subito"],
                    ["sostituzione", "🔄 Sostituzione"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="live-event-opt"
                      onClick={() => {
                        setEventoTipo(key);
                        setEventoStep(key === "sostituzione" ? "sostituzione" : "giocatore");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {eventoStep === "giocatore" && (
              <>
                <div className="live-event-title">{EVENTO_LABELS[eventoTipo]} — chi?</div>
                <div className="live-event-list">
                  {(eventoTipo === "gol_subito" ? (portieriInCampo.length ? portieriInCampo : inCampo) : inCampo).map((p) => (
                    <button key={p.id} type="button" className="live-event-player" onClick={() => registraEvento(eventoTipo, p.id)}>
                      {p.cognome} {p.nome}
                    </button>
                  ))}
                  {inCampo.length === 0 && <p className="muted">Nessun giocatore in campo.</p>}
                </div>
              </>
            )}

            {eventoStep === "sostituzione" && !subUscenteId && (
              <>
                <div className="live-event-title">Chi esce dal campo?</div>
                <div className="live-event-list">
                  {inCampo.map((p) => (
                    <button key={p.id} type="button" className="live-event-player" onClick={() => setSubUscenteId(p.id)}>
                      {p.cognome} {p.nome}
                    </button>
                  ))}
                  {inCampo.length === 0 && <p className="muted">Nessun giocatore in campo.</p>}
                </div>
              </>
            )}

            {eventoStep === "sostituzione" && subUscenteId && (
              <>
                <div className="live-event-title">Chi entra al posto di {byId[subUscenteId]?.cognome}?</div>
                <div className="live-event-list">
                  {inPanchina.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="live-event-player"
                      onClick={() => registraEvento("sostituzione", subUscenteId, { entranteId: p.id })}
                    >
                      {p.cognome} {p.nome}
                    </button>
                  ))}
                  {inPanchina.length === 0 && <p className="muted">Nessuna riserva disponibile in panchina.</p>}
                </div>
              </>
            )}

            <button type="button" className="btn ghost" style={{ marginTop: 10 }} onClick={chiudiEvento}>
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchForm({ initial, players, durataPartita, onSave, onCancel }) {
  const DURATA_PARTITA = durataPartita > 0 ? durataPartita : 70; // minuti, configurabile da Impostazioni
  const chiuso = !!initial.chiuso;
  const [data, setData] = useState(initial.data);
  const [avversario, setAvversario] = useState(initial.avversario || "");
  const [casa, setCasa] = useState(initial.casa !== false);
  const [tipo, setTipo] = useState(initial.tipo || "campionato");
  const [golFatti, setGolFatti] = useState(initial.golFatti ?? "");
  const [golSubiti, setGolSubiti] = useState(initial.golSubiti ?? "");
  const [entries, setEntries] = useState(() => {
    const base = {};
    players.forEach((p) => {
      base[p.id] = { ...emptyMatchEntry(), ...(initial.entries[p.id] || {}) };
    });
    return base;
  });

  const setStato = (id, stato) =>
    setEntries((prev) => {
      const nuovoStato = prev[id].stato === stato ? null : stato;
      let minutaggio = prev[id].minutaggio;
      if (nuovoStato === "titolare" && !prev[id].sostituito && minutaggio === "") {
        minutaggio = String(DURATA_PARTITA);
      }
      return { ...prev, [id]: { ...prev[id], stato: nuovoStato, minutaggio } };
    });

  const updateField = (id, key, value) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const updateMinutoSostituzione = (id, value) =>
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], minutoSostituzione: value, minutaggio: value !== "" ? value : prev[id].minutaggio },
    }));

  const updateMinutoSubentro = (id, value) =>
    setEntries((prev) => {
      const n = Number(value);
      const minutiGiocati = value !== "" && Number.isInteger(n) ? String(Math.max(0, DURATA_PARTITA - n)) : prev[id].minutaggio;
      return { ...prev, [id]: { ...prev[id], minutoSubentro: value, minutaggio: minutiGiocati } };
    });

  const updateMaglia = (id, value) => {
    setEntries((prev) => {
      const n = Number(value);
      let stato = prev[id].stato;
      if (value !== "" && Number.isInteger(n)) {
        if (n >= 1 && n <= 11) stato = "titolare";
        else if (n >= 12 && n <= 20) stato = "riserva";
      }
      return { ...prev, [id]: { ...prev[id], numeroMagliaPartita: value, stato } };
    });
  };

  const checkMagliaDuplicata = (id) => {
    const value = entries[id].numeroMagliaPartita;
    if (value === "") return;
    const dupId = Object.keys(entries).find(
      (pid) => pid !== id && entries[pid].numeroMagliaPartita !== "" && entries[pid].numeroMagliaPartita === value
    );
    if (dupId) {
      const dupPlayer = players.find((p) => p.id === dupId);
      alert(`Il numero ${value} è già assegnato a ${dupPlayer ? `${dupPlayer.cognome} ${dupPlayer.nome}` : "un altro giocatore"}. Numero e stato rimossi, riassegna.`);
      setEntries((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          numeroMagliaPartita: "",
          stato: prev[id].stato === "titolare" || prev[id].stato === "riserva" ? null : prev[id].stato,
        },
      }));
    }
  };

  const cycleGialli = (id) =>
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], cartelliniGialli: (prev[id].cartelliniGialli + 1) % 3 },
    }));

  const toggleRosso = (id) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], cartellinoRosso: !prev[id].cartellinoRosso } }));

  const toggleSostituito = (id) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], sostituito: !prev[id].sostituito } }));

  const submit = (e) => {
    e.preventDefault();
    onSave({ id: initial.id || `m_${Date.now()}`, data, avversario, casa, tipo, chiuso, golFatti, golSubiti, entries });
  };

  const finalizzaEntries = () => {
    const finali = {};
    Object.entries(entries).forEach(([id, e]) => {
      let minutaggio = e.minutaggio;
      if (e.stato === "titolare" && !e.sostituito && minutaggio === "") {
        minutaggio = String(DURATA_PARTITA);
      }
      finali[id] = { ...e, minutaggio };
    });
    return finali;
  };

  const chiudiPartita = () => {
    if (!window.confirm("Chiudere questa partita? Non sarà più modificabile (potrai solo eliminarla e rifarla).")) return;
    onSave({
      id: initial.id || `m_${Date.now()}`,
      data,
      avversario,
      casa,
      tipo,
      chiuso: true,
      golFatti,
      golSubiti,
      entries: finalizzaEntries(),
    });
  };

  const sorted = [...players].sort((a, b) => {
    const r = RUOLI.indexOf(a.ruolo) - RUOLI.indexOf(b.ruolo);
    return r !== 0 ? r : a.cognome.localeCompare(b.cognome);
  });

  return (
    <form className="sheet" onSubmit={submit}>
      <div className="sheet-header">
        <h2>{initial.id ? "Modifica partita" : "Nuova partita"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel}>
          <Icon name="X" size={18} />
        </button>
      </div>

      {chiuso && (
        <p className="chiuso-banner">
          <Icon name="Lock" size={13} /> Partita chiusa: sola lettura. Per correggere, eliminala e rifalla.
        </p>
      )}

      <div className={chiuso ? "locked-content" : undefined}>
      <div className="sheet-grid" style={{ marginBottom: 14 }}>
        <label className="field">
          <span className="field-label">
            <Icon name="Calendar" size={13} /> Data
          </span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Avversario</span>
          <input type="text" value={avversario} onChange={(e) => setAvversario(e.target.value)} placeholder="Nome squadra" />
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="Shield" size={13} /> Sede
          </span>
          <div className="risultato-toggle">
            <button type="button" className={`stato-btn ${casa ? "active" : ""}`} onClick={() => setCasa(true)}>
              🏠 Casa
            </button>
            <button type="button" className={`stato-btn ${!casa ? "active" : ""}`} onClick={() => setCasa(false)}>
              🚌 Trasferta
            </button>
          </div>
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="Trophy" size={13} /> Tipo gara
          </span>
          <div className="risultato-toggle tipo-gara-toggle">
            <button
              type="button"
              className={`stato-btn ${tipo === "campionato" ? "active" : ""}`}
              onClick={() => setTipo("campionato")}
            >
              🏆 Campionato
            </button>
            <button
              type="button"
              className={`stato-btn ${tipo === "coppa" ? "active" : ""}`}
              onClick={() => setTipo("coppa")}
            >
              🥇 Coppa
            </button>
            <button
              type="button"
              className={`stato-btn ${tipo === "amichevole" ? "active" : ""}`}
              onClick={() => setTipo("amichevole")}
            >
              🤝 Amichevole
            </button>
          </div>
        </label>
        <label className="field">
          <span className="field-label">
            <Icon name="Medal" size={13} /> Risultato finale
          </span>
          <div className="risultato-inputs">
            <input
              type="number"
              min="0"
              value={golFatti}
              onChange={(e) => setGolFatti(e.target.value)}
              placeholder="noi"
            />
            <span>-</span>
            <input
              type="number"
              min="0"
              value={golSubiti}
              onChange={(e) => setGolSubiti(e.target.value)}
              placeholder="loro"
            />
          </div>
        </label>
      </div>

      {(() => {
        const nTitolari = Object.values(entries).filter((e) => e.stato === "titolare").length;
        const nRiserve = Object.values(entries).filter((e) => e.stato === "riserva").length;

        const golAssegnati = Object.values(entries).reduce((s, e) => s + (Number(e.golSegnati) || 0), 0);
        const golFattiNum = golFatti === "" ? null : Number(golFatti);
        const golMismatch = golFattiNum !== null && golAssegnati !== golFattiNum;

        const golSubitiAssegnati = Object.values(entries).reduce((s, e) => s + (Number(e.golSubitiPortiere) || 0), 0);
        const golSubitiNum = golSubiti === "" ? null : Number(golSubiti);
        const golSubitiMismatch = golSubitiNum !== null && golSubitiAssegnati !== golSubitiNum;

        const byId = Object.fromEntries(players.map((p) => [p.id, p]));
        const portieriSostituiti = Object.entries(entries).filter(
          ([id, e]) => e.stato === "titolare" && e.sostituito && byId[id]?.ruolo === "Portiere"
        ).length;
        const portieriSubentrati = Object.entries(entries).filter(
          ([id, e]) => e.stato === "subentrato" && byId[id]?.ruolo === "Portiere"
        ).length;
        const cambioPortiereMismatch = portieriSostituiti > 0 && portieriSubentrati < portieriSostituiti;

        return (
          <>
            <p className={`muted formazione-counter ${nTitolari > 11 ? "warn" : ""}`} style={{ marginBottom: 4 }}>
              Titolari: {nTitolari}/11{nTitolari > 11 ? " ⚠️ troppi, controlla i numeri" : ""} · Riserve: {nRiserve}
            </p>
            {golFattiNum !== null && (
              <p className={`muted formazione-counter ${golMismatch ? "warn" : ""}`} style={{ marginBottom: 4 }}>
                Gol assegnati ai giocatori: {golAssegnati}/{golFattiNum}
                {golMismatch ? " ⚠️ non corrispondono al risultato" : ""}
              </p>
            )}
            {golSubitiNum !== null && (
              <p className={`muted formazione-counter ${golSubitiMismatch ? "warn" : ""}`} style={{ marginBottom: 4 }}>
                Gol subiti assegnati ai portieri: {golSubitiAssegnati}/{golSubitiNum}
                {golSubitiMismatch ? " ⚠️ non corrispondono al risultato" : ""}
              </p>
            )}
            {cambioPortiereMismatch && (
              <p className="muted formazione-counter warn" style={{ marginBottom: 4 }}>
                ⚠️ Hai sostituito un portiere ma tra i subentrati non risulta un portiere
              </p>
            )}
            <div style={{ marginBottom: 4 }} />
          </>
        );
      })()}

      {sorted.length === 0 ? (
        <p className="muted">Aggiungi prima qualche giocatore in Anagrafica.</p>
      ) : (
        <div className="roster">
          {sorted.map((p, i) => {
            const e = entries[p.id];
            const mostraIntestazione = i === 0 || sorted[i - 1].ruolo !== p.ruolo;
            return (
              <React.Fragment key={p.id}>
                {mostraIntestazione && <div className="ruolo-heading">{p.ruolo}</div>}
                <div className={`roster-row match-row ${e.stato ? "on" : ""}`}>
                <div className="match-row-top">
                  <div className="roster-name">
                    <div className="roster-name-main">
                      {p.cognome} {p.nome}
                    </div>
                    <div className="roster-name-sub">{p.ruolo}</div>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="maglia-input"
                    placeholder="n."
                    title="Numero di maglia in questa partita"
                    value={e.numeroMagliaPartita}
                    onChange={(ev) => updateMaglia(p.id, ev.target.value)}
                    onBlur={() => checkMagliaDuplicata(p.id)}
                  />
                  <div className="stato-toggle">
                    <button
                      type="button"
                      className={`stato-btn ${e.stato === "titolare" ? "active" : ""}`}
                      onClick={() => setStato(p.id, "titolare")}
                    >
                      Titolare
                    </button>
                    <button
                      type="button"
                      className={`stato-btn riserva ${e.stato === "riserva" ? "active" : ""}`}
                      onClick={() => setStato(p.id, "riserva")}
                    >
                      Riserva
                    </button>
                    <button
                      type="button"
                      className={`stato-btn ${e.stato === "subentrato" ? "active" : ""}`}
                      onClick={() => setStato(p.id, "subentrato")}
                    >
                      Subentro
                    </button>
                    <button
                      type="button"
                      className={`stato-btn infortunato ${e.stato === "infortunato" ? "active" : ""}`}
                      onClick={() => setStato(p.id, "infortunato")}
                    >
                      Infortunato
                    </button>
                    <button
                      type="button"
                      className={`stato-btn assente ${e.stato === "assente" ? "active" : ""}`}
                      onClick={() => setStato(p.id, "assente")}
                    >
                      Assente
                    </button>
                    <button
                      type="button"
                      className={`stato-btn non-convocato ${e.stato === "non_convocato" ? "active" : ""}`}
                      onClick={() => setStato(p.id, "non_convocato")}
                    >
                      Non convocato
                    </button>
                  </div>
                </div>

                {e.stato === "assente" && (
                  <div className="match-fields">
                    <input
                      type="text"
                      placeholder="Motivo assenza (es. malattia, svogliato, impegno...)"
                      value={e.motivoAssenza}
                      onChange={(ev) => updateField(p.id, "motivoAssenza", ev.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                )}

                {(e.stato === "titolare" || e.stato === "subentrato") && (
                  <div className="match-fields">
                    <input
                      type="number"
                      min="0"
                      max={DURATA_PARTITA}
                      placeholder="min"
                      value={e.minutaggio}
                      onChange={(ev) => updateField(p.id, "minutaggio", ev.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="voto"
                      value={e.votoImpegno}
                      onChange={(ev) => updateField(p.id, "votoImpegno", ev.target.value)}
                    />
                    {p.ruolo === "Portiere" ? (
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="gol subiti"
                        title="Gol subiti mentre era in porta in questa partita"
                        className="gol-input gol-subiti-input"
                        value={e.golSubitiPortiere}
                        onChange={(ev) => updateField(p.id, "golSubitiPortiere", ev.target.value)}
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="gol"
                        title="Gol fatti in questa partita"
                        className="gol-input"
                        value={e.golSegnati}
                        onChange={(ev) => updateField(p.id, "golSegnati", ev.target.value)}
                      />
                    )}
                    <button
                      type="button"
                      className={`pill-toggle giallo ${e.cartelliniGialli > 0 ? "active" : ""}`}
                      onClick={() => cycleGialli(p.id)}
                      title="Cartellini gialli"
                    >
                      <Icon name="Square" size={11} /> {e.cartelliniGialli}
                    </button>
                    <button
                      type="button"
                      className={`pill-toggle rosso ${e.cartellinoRosso ? "active" : ""}`}
                      onClick={() => toggleRosso(p.id)}
                      title="Cartellino rosso"
                    >
                      <Icon name="Square" size={11} />
                    </button>
                    {e.stato === "subentrato" && (
                      <span className="min-inline">
                        <Icon name="Clock" size={11} />
                        <input
                          type="number"
                          min="0"
                          max={DURATA_PARTITA}
                          placeholder="min entrata"
                          className="min-input"
                          value={e.minutoSubentro}
                          onChange={(ev) => updateMinutoSubentro(p.id, ev.target.value)}
                        />
                      </span>
                    )}
                    {e.stato === "titolare" && (
                      <button
                        type="button"
                        className={`pill-toggle sost ${e.sostituito ? "active" : ""}`}
                        onClick={() => toggleSostituito(p.id)}
                        title="Sostituito"
                      >
                        <Icon name="ArrowRightLeft" size={11} /> Sost.
                      </button>
                    )}
                    {e.stato === "titolare" && e.sostituito && (
                      <span className="min-inline">
                        <Icon name="Clock" size={11} />
                        <input
                          type="number"
                          min="0"
                          max={DURATA_PARTITA}
                          placeholder="min uscita"
                          className="min-input"
                          value={e.minutoSostituzione}
                          onChange={(ev) => updateMinutoSostituzione(p.id, ev.target.value)}
                        />
                      </span>
                    )}
                  </div>
                )}

                {e.stato === "infortunato" && (
                  <div className="match-fields">
                    <span className="min-inline">
                      <Icon name="Clock" size={11} />
                      <input
                        type="number"
                        min="0"
                        max={DURATA_PARTITA}
                        placeholder="min infortunio"
                        className="min-input"
                        value={e.minutoInfortunio}
                        onChange={(ev) => updateField(p.id, "minutoInfortunio", ev.target.value)}
                      />
                    </span>
                  </div>
                )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      </div>

      <div className="sheet-actions">
        {chiuso ? (
          <button type="button" className="btn primary" onClick={onCancel}>
            Chiudi scheda
          </button>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={onCancel}>
              Annulla
            </button>
            <button type="button" className="btn ghost lock-btn" onClick={chiudiPartita}>
              <Icon name="Lock" size={14} /> Chiudi partita
            </button>
            <button type="submit" className="btn primary">
              Salva
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function MatchCard({ m, players, nomeSquadra, onEdit, onDelete, onReport, onQuickReport, onLive, readOnly }) {
  const titolariCount = Object.values(m.entries).filter((e) => e.stato === "titolare").length;
  const nomeById = Object.fromEntries(players.map((p) => [p.id, `${p.cognome} ${p.nome}`]));
  const used = Object.entries(m.entries).filter(([, e]) => e.stato === "titolare" || e.stato === "subentrato");
  const infortunati = Object.entries(m.entries).filter(([, e]) => e.stato === "infortunato");
  const titolari = used.filter(([, e]) => e.stato === "titolare").length;
  const subentrati = used.filter(([, e]) => e.stato === "subentrato").length;
  const gialli = used.reduce((sum, [, e]) => sum + (e.cartelliniGialli || 0), 0);
  const rossi = used.filter(([, e]) => e.cartellinoRosso).length;

  const haRisultato = m.golFatti !== "" && m.golFatti !== undefined && m.golSubiti !== "" && m.golSubiti !== undefined;
  const gf = Number(m.golFatti),
    gs = Number(m.golSubiti);
  const esitoLettera = !haRisultato ? null : gf > gs ? "V" : gf < gs ? "S" : "P";
  const esitoClasse = esitoLettera === "V" ? "esito-v" : esitoLettera === "S" ? "esito-s" : "esito-p";
  const inCasa = m.casa !== false;
  const noi = nomeSquadra || "Rosa Squadra";
  const avv = m.avversario || "Avversario";
  const squadraSx = inCasa ? noi : avv;
  const squadraDx = inCasa ? avv : noi;
  const golSx = inCasa ? m.golFatti : m.golSubiti;
  const golDx = inCasa ? m.golSubiti : m.golFatti;

  const titolariNomi = players
    .filter((p) => m.entries[p.id]?.stato === "titolare" && !m.entries[p.id]?.sostituito)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  const sostituitiNomi = players
    .filter((p) => m.entries[p.id]?.stato === "titolare" && m.entries[p.id]?.sostituito)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  const subentratiNomi = players
    .filter((p) => m.entries[p.id]?.stato === "subentrato")
    .sort((a, b) => a.cognome.localeCompare(b.cognome));

  const condividiWhatsapp = () => {
    const dataStr = new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
    let testo = `⚽ ${noi} vs ${avv} — ${dataStr}\n`;
    if (haRisultato) testo += `Risultato: ${golSx}-${golDx}\n`;
    testo += `\n✅ TITOLARI (${titolariNomi.length}):\n`;
    testo += titolariNomi.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n🔻 SOSTITUITI (${sostituitiNomi.length}):\n`;
    testo += sostituitiNomi.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n🔼 SUBENTRATI (${subentratiNomi.length}):\n`;
    testo += subentratiNomi.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testo)}`, "_blank");
  };

  return (
    <div className="card training-card">
      <div className="card-number training-date">
        <div className="training-day">{new Date(m.data).getDate()}</div>
        <div className="training-month">
          {new Date(m.data).toLocaleDateString("it-IT", { month: "short" })}
        </div>
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="card-name-row">
            {readOnly ? (
              <span className="icon-btn" style={{ cursor: "default" }}>
                <Icon name={m.chiuso ? "Lock" : "Trophy"} size={14} />
              </span>
            ) : (
              <button className="icon-btn edit-inline" onClick={() => onEdit(m)} aria-label="Apri">
                <Icon name={m.chiuso ? "Lock" : "Pencil"} size={14} />
              </button>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="match-teams">
                <div className="match-team-row">
                  <span className="match-team-name">
                    {squadraSx} {m.chiuso && <span className="chiuso-badge">Chiusa</span>}
                  </span>
                  {haRisultato && <span className="match-team-score">{golSx}</span>}
                </div>
                <div className="match-team-row">
                  <span className="match-team-name">{squadraDx}</span>
                  {haRisultato && <span className="match-team-score">{golDx}</span>}
                </div>
              </div>
              <div className="card-meta">
                {inCasa ? "🏠 Casa" : "🚌 Trasferta"} · {m.tipo === "amichevole" ? "🤝 Amichevole" : m.tipo === "coppa" ? "🥇 Coppa" : "🏆 Campionato"} · {titolari} titolari · {subentrati} subentrati
                {gialli > 0 ? ` · ${gialli} gialli` : ""}
                {rossi > 0 ? ` · ${rossi} rossi` : ""}
                {infortunati.length > 0 ? ` · ${infortunati.length} infortunati` : ""}
              </div>
            </div>
          </div>
          <div className="card-actions">
            <button className="icon-btn" onClick={() => onReport(m)} aria-label="Distinta">
              <Icon name="ClipboardList" size={15} />
            </button>
            {!readOnly && (
              <button className="icon-btn danger" onClick={() => onDelete(m.id)} aria-label="Elimina">
                <Icon name="Trash2" size={15} />
              </button>
            )}
          </div>
        </div>
        {m.chiuso && (
          <div className="training-actions">
            <button type="button" className="btn-mini report" onClick={() => onQuickReport(m)}>
              <Icon name="ClipboardList" size={14} /> Report
            </button>
            <button type="button" className="btn-mini whatsapp" onClick={condividiWhatsapp}>
              <WhatsAppIcon size={14} /> Invia WhatsApp
            </button>
          </div>
        )}
        {!readOnly && !m.chiuso && titolariCount > 0 && (
          <div className="training-actions">
            <button type="button" className="btn-mini live" onClick={() => onLive(m)}>
              <Icon name="Play" size={14} /> {m.live && m.live.fase && m.live.fase !== "idle" ? "Riprendi live" : "Avvia live"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calcolaEsito(matches) {
  const conRisultato = matches.filter(
    (m) => m.golFatti !== "" && m.golFatti !== undefined && m.golSubiti !== "" && m.golSubiti !== undefined
  );
  const v = conRisultato.filter((m) => Number(m.golFatti) > Number(m.golSubiti)).length;
  const p = conRisultato.filter((m) => Number(m.golFatti) < Number(m.golSubiti)).length;
  const n = conRisultato.filter((m) => Number(m.golFatti) === Number(m.golSubiti)).length;
  const gf = conRisultato.reduce((s, m) => s + (Number(m.golFatti) || 0), 0);
  const gs = conRisultato.reduce((s, m) => s + (Number(m.golSubiti) || 0), 0);
  return { pg: conRisultato.length, v, n, p, gf, gs, dr: gf - gs };
}

function RigaEsito({ etichetta, e, evidenzia }) {
  return (
    <div className={`esito-row${evidenzia ? " esito-row-tot" : ""}`}>
      <span className="esito-label">{etichetta}</span>
      <span className="esito-val">{e.pg}</span>
      <span className="esito-val esito-v">{e.v}</span>
      <span className="esito-val esito-n">{e.n}</span>
      <span className="esito-val esito-p">{e.p}</span>
      <span className="esito-val">{e.gf}</span>
      <span className="esito-val">{e.gs}</span>
      <span className="esito-val" style={{ fontWeight: 700 }}>{e.dr > 0 ? `+${e.dr}` : e.dr}</span>
    </div>
  );
}

function TeamReportTab({ matches, players, nomeSquadra, vistaTutteCategorie }) {
  const campionatoMatches = matches.filter((m) => (m.tipo || "campionato") === "campionato");
  const coppaMatches = matches.filter((m) => m.tipo === "coppa");
  const amichevoleMatches = matches.filter((m) => m.tipo === "amichevole");

  const totale = calcolaEsito(matches);
  const campionato = calcolaEsito(campionatoMatches);
  const coppa = calcolaEsito(coppaMatches);
  const amichevole = calcolaEsito(amichevoleMatches);
  const punteggio = campionato.v * 3 + campionato.n * 1;

  const perCategoria = useMemo(() => {
    if (!vistaTutteCategorie) return [];
    const gruppi = {};
    matches.forEach((m) => {
      const cat = m.categoria || "giovanissimi15";
      (gruppi[cat] = gruppi[cat] || []).push(m);
    });
    return Object.entries(gruppi)
      .map(([cat, ms]) => ({ cat, nome: getCategoria(cat).nome, esito: calcolaEsito(ms) }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [matches, vistaTutteCategorie]);

  const disciplina = useMemo(() => {
    const byId = {};
    (players || []).forEach((p) => {
      byId[p.id] = { id: p.id, nome: `${p.cognome} ${p.nome}`, gol: 0, gialli: 0, rossi: 0 };
    });
    matches.forEach((m) => {
      Object.entries(m.entries || {}).forEach(([pid, e]) => {
        if (!byId[pid]) return;
        byId[pid].gol += Number(e.golSegnati) || 0;
        byId[pid].gialli += Number(e.cartelliniGialli) || 0;
        if (e.cartellinoRosso) byId[pid].rossi += 1;
      });
    });
    const tutti = Object.values(byId);
    const marcatori = tutti.filter((r) => r.gol > 0).sort((a, b) => b.gol - a.gol);
    const cartellini = tutti
      .filter((r) => r.gialli > 0 || r.rossi > 0)
      .sort((a, b) => b.rossi - a.rossi || b.gialli - a.gialli);
    return { marcatori, cartellini };
  }, [matches, players]);

  if (matches.length === 0) {
    return (
      <div className="empty">
        <Icon name="Medal" size={28} />
        <p>Registra qualche partita per vedere il report squadra.</p>
      </div>
    );
  }

  return (
    <div className="report">
      <div className="stat-chips">
        <div className="stat-chip static">
          <span className="stat-chip-num">{punteggio}</span>
          <span className="stat-chip-label">🏆 Punteggio campionato</span>
        </div>
        <div className="stat-chip static">
          <span className="stat-chip-num">{totale.v}</span>
          <span className="stat-chip-label">✅ Partite vinte (totale)</span>
        </div>
        <div className="stat-chip static">
          <span className="stat-chip-num">{totale.p}</span>
          <span className="stat-chip-label">❌ Partite perse (totale)</span>
        </div>
        <div className="stat-chip static">
          <span className="stat-chip-num">{totale.n}</span>
          <span className="stat-chip-label">➖ Partite pareggiate (totale)</span>
        </div>
      </div>

      <div className="esito-title">Risultati per competizione</div>
      <div className="esito-table">
        <div className="esito-row esito-head">
          <span className="esito-label"></span>
          <span className="esito-val">PG</span>
          <span className="esito-val">V</span>
          <span className="esito-val">N</span>
          <span className="esito-val">P</span>
          <span className="esito-val">GF</span>
          <span className="esito-val">GS</span>
          <span className="esito-val">DR</span>
        </div>
        <RigaEsito etichetta="🏆 Campionato" e={campionato} />
        <RigaEsito etichetta="🥇 Coppa" e={coppa} />
        <RigaEsito etichetta="🤝 Amichevole" e={amichevole} />
        <RigaEsito etichetta="Totale" e={totale} evidenzia />
      </div>

      {vistaTutteCategorie && perCategoria.length > 0 && (
        <>
          <div className="esito-title" style={{ marginTop: 18 }}>Confronto tra categorie</div>
          <div className="esito-table">
            <div className="esito-row esito-head">
              <span className="esito-label"></span>
              <span className="esito-val">PG</span>
              <span className="esito-val">V</span>
              <span className="esito-val">N</span>
              <span className="esito-val">P</span>
              <span className="esito-val">GF</span>
              <span className="esito-val">GS</span>
              <span className="esito-val">DR</span>
            </div>
            {perCategoria.map((r) => (
              <RigaEsito key={r.cat} etichetta={r.nome} e={r.esito} />
            ))}
          </div>
        </>
      )}

      <div className="esito-title" style={{ marginTop: 18 }}>⚽ Marcatori</div>
      {disciplina.marcatori.length === 0 ? (
        <p className="muted">Nessun gol registrato.</p>
      ) : (
        <div className="cartellini-table">
          {disciplina.marcatori.map((r) => (
            <div className="cartellini-row" key={r.id}>
              <span className="cartellini-nome">{r.nome}</span>
              <span className="cartellini-num">{r.gol} ⚽</span>
            </div>
          ))}
        </div>
      )}

      <div className="esito-title" style={{ marginTop: 18 }}>🟨🟥 Cartellini</div>
      {disciplina.cartellini.length === 0 ? (
        <p className="muted">Nessun cartellino registrato.</p>
      ) : (
        <div className="cartellini-table">
          {disciplina.cartellini.map((r) => (
            <div className="cartellini-row" key={r.id}>
              <span className="cartellini-nome">{r.nome}</span>
              <span className="cartellini-num">
                {r.gialli > 0 && `🟨 ${r.gialli}`} {r.rossi > 0 && `🟥 ${r.rossi}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function ReportTab({ players, trainings, matches, nomeSquadra, logoSquadra }) {
  const [openStat, setOpenStat] = useState(null); // 'gol' | 'gialli' | 'rossi' | null
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [printMode, setPrintMode] = useState(null); // 'player' | 'general' | null

  useEffect(() => {
    const reset = () => setPrintMode(null);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const oggi = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  const noi = nomeSquadra || "Rosa Squadra";

  const rows = useMemo(() => {
    return [...players]
      .sort((a, b) => a.cognome.localeCompare(b.cognome))
      .map((p) => {
        const presenzeAllenamenti = trainings.filter((t) => t.entries[p.id]?.stato === "presente").length;
        const assenzeAllenamenti = Math.max(0, trainings.length - presenzeAllenamenti);
        const infortuniAllenamenti = trainings.filter((t) => t.entries[p.id]?.stato === "presente" && t.entries[p.id]?.infortunato).length;
        const infortuniPartite = matches.filter((m) => m.entries[p.id]?.stato === "infortunato").length;
        const gialli = matches.reduce((sum, m) => sum + (m.entries[p.id]?.cartelliniGialli || 0), 0);
        const rossi = matches.filter((m) => m.entries[p.id]?.cartellinoRosso).length;
        const gol = matches.reduce((sum, m) => sum + (Number(m.entries[p.id]?.golSegnati) || 0), 0);
        const golSubiti =
          p.ruolo === "Portiere"
            ? matches.reduce((sum, m) => sum + (Number(m.entries[p.id]?.golSubitiPortiere) || 0), 0)
            : null;
        const minutiGiocati = matches.reduce((s, m) => s + (Number(m.entries[p.id]?.minutaggio) || 0), 0);
        const partiteGiocate = matches.filter(
          (m) => ["titolare", "subentrato"].includes(m.entries[p.id]?.stato) && Number(m.entries[p.id]?.minutaggio) > 0
        ).length;
        const sostituito = matches.filter((m) => m.entries[p.id]?.stato === "titolare" && m.entries[p.id]?.sostituito).length;
        const convocato = matches.filter((m) => ["titolare", "riserva", "subentrato", "infortunato", "assente"].includes(m.entries[p.id]?.stato)).length;
        const nonConvocato = matches.filter((m) => m.entries[p.id]?.stato === "non_convocato").length;
        return {
          id: p.id,
          nome: `${p.cognome} ${p.nome}`,
          ruolo: p.ruolo,
          presenzeAllenamenti,
          assenzeAllenamenti,
          partiteGiocate,
          minutiGiocati,
          sostituito,
          convocato,
          nonConvocato,
          gialli,
          rossi,
          gol,
          golSubiti,
          infortuni: infortuniAllenamenti + infortuniPartite,
        };
      });
  }, [players, trainings, matches]);

  const totaleGol = rows.reduce((s, r) => s + r.gol, 0);
  const totaleGialli = rows.reduce((s, r) => s + r.gialli, 0);
  const totaleRossi = rows.reduce((s, r) => s + r.rossi, 0);
  const totaleGolSubiti = rows.reduce((s, r) => s + (r.golSubiti || 0), 0);

  const breakdownGol = [...rows].filter((r) => r.gol > 0).sort((a, b) => b.gol - a.gol);
  const breakdownGialli = [...rows].filter((r) => r.gialli > 0).sort((a, b) => b.gialli - a.gialli);
  const breakdownRossi = [...rows].filter((r) => r.rossi > 0).sort((a, b) => b.rossi - a.rossi);
  const breakdownGolSubiti = [...rows].filter((r) => r.golSubiti > 0).sort((a, b) => b.golSubiti - a.golSubiti);

  const toggleStat = (key) => setOpenStat((prev) => (prev === key ? null : key));
  const togglePlayer = (id) => setSelectedPlayerId((prev) => (prev === id ? "" : id));

  const statMap = {
    gol: { total: totaleGol, breakdown: breakdownGol, label: "⚽ Gol fatti totali", val: (r) => r.gol },
    gialli: { total: totaleGialli, breakdown: breakdownGialli, label: "🟨 Gialli totali", val: (r) => r.gialli },
    rossi: { total: totaleRossi, breakdown: breakdownRossi, label: "🟥 Rossi totali", val: (r) => r.rossi },
    golSubiti: {
      total: totaleGolSubiti,
      breakdown: breakdownGolSubiti,
      label: "🧤 Gol subiti (portieri)",
      val: (r) => r.golSubiti,
    },
  };

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null;

  const dettaglio = useMemo(() => {
    if (!selectedPlayer) return null;
    const pid = selectedPlayer.id;
    const presenze = trainings.filter((t) => t.entries[pid]?.stato === "presente").length;
    const assenze = Math.max(0, trainings.length - presenze);
    const convocato = matches.filter((m) => ["titolare", "riserva", "subentrato", "infortunato", "assente"].includes(m.entries[pid]?.stato)).length;
    const nonConvocato = matches.filter((m) => m.entries[pid]?.stato === "non_convocato").length;
    const titolare = matches.filter((m) => m.entries[pid]?.stato === "titolare").length;
    const sostituito = matches.filter((m) => m.entries[pid]?.stato === "titolare" && m.entries[pid]?.sostituito).length;
    const entratoSostituto = matches.filter((m) => m.entries[pid]?.stato === "subentrato").length;
    const nonEntrato = matches.filter((m) => m.entries[pid]?.stato === "riserva").length;
    const minutiGiocati = matches.reduce((s, m) => s + (Number(m.entries[pid]?.minutaggio) || 0), 0);
    const minutiCampionato = matches
      .filter((m) => m.tipo === "campionato")
      .reduce((s, m) => s + (Number(m.entries[pid]?.minutaggio) || 0), 0);
    const minutiCoppa = matches
      .filter((m) => m.tipo === "coppa")
      .reduce((s, m) => s + (Number(m.entries[pid]?.minutaggio) || 0), 0);
    const minutiAmichevole = matches
      .filter((m) => m.tipo === "amichevole")
      .reduce((s, m) => s + (Number(m.entries[pid]?.minutaggio) || 0), 0);
    const partiteGiocate = matches.filter(
      (m) => ["titolare", "subentrato"].includes(m.entries[pid]?.stato) && Number(m.entries[pid]?.minutaggio) > 0
    ).length;
    const golFatti = matches.reduce((s, m) => s + (Number(m.entries[pid]?.golSegnati) || 0), 0);
    const golSubiti =
      selectedPlayer.ruolo === "Portiere"
        ? matches.reduce((s, m) => s + (Number(m.entries[pid]?.golSubitiPortiere) || 0), 0)
        : null;
    const gialli = matches.reduce((s, m) => s + (m.entries[pid]?.cartelliniGialli || 0), 0);
    const rossi = matches.filter((m) => m.entries[pid]?.cartellinoRosso).length;
    const infortuniAll = trainings.filter((t) => t.entries[pid]?.stato === "presente" && t.entries[pid]?.infortunato).length;
    const infortuniPartite = matches.filter((m) => m.entries[pid]?.stato === "infortunato").length;
    const assenzePartita = matches.filter((m) => m.entries[pid]?.stato === "assente").length;
    const noteAssenze = [
      ...trainings
        .filter((t) => t.entries[pid]?.stato === "assente" && t.entries[pid]?.motivoAssenza)
        .map((t) => ({ data: t.data, contesto: "Allenamento", motivo: t.entries[pid].motivoAssenza })),
      ...matches
        .filter((m) => m.entries[pid]?.stato === "assente" && m.entries[pid]?.motivoAssenza)
        .map((m) => ({ data: m.data, contesto: `Partita vs ${m.avversario || "Avversario"}`, motivo: m.entries[pid].motivoAssenza })),
    ].sort((a, b) => b.data.localeCompare(a.data));
    return {
      presenze,
      assenze,
      convocato,
      nonConvocato,
      titolare,
      sostituito,
      entratoSostituto,
      nonEntrato,
      minutiGiocati,
      minutiCampionato,
      minutiCoppa,
      minutiAmichevole,
      partiteGiocate,
      golFatti,
      golSubiti,
      gialli,
      rossi,
      infortuni: infortuniAll + infortuniPartite,
      assenzePartita,
      noteAssenze,
    };
  }, [selectedPlayer, trainings, matches]);

  if (players.length === 0) {
    return (
      <div className="empty">
        <Icon name="BarChart3" size={28} />
        <p>Aggiungi giocatori e registra allenamenti/partite per vedere il report.</p>
      </div>
    );
  }

  return (
    <div className="report">
      <button
        type="button"
        className="btn ghost print-general-btn"
        onClick={() => {
          ReactDOM.flushSync(() => setPrintMode("general"));
          window.print();
        }}
      >
        <Icon name="Printer" size={15} /> Stampa report generale (PDF orizzontale)
      </button>

      <div className="stat-chips">
        {Object.entries(statMap).map(([key, s]) => (
          <button
            key={key}
            type="button"
            className={`stat-chip ${openStat === key ? "open" : ""}`}
            onClick={() => toggleStat(key)}
          >
            <span className="stat-chip-num">{s.total}</span>
            <span className="stat-chip-label">{s.label}</span>
          </button>
        ))}
      </div>

      {openStat && (
        <div className="stat-breakdown">
          {statMap[openStat].breakdown.length === 0 ? (
            <p className="muted">Nessun dato ancora registrato.</p>
          ) : (
            statMap[openStat].breakdown.map((r) => (
              <div key={r.id} className="stat-breakdown-row">
                <span>{r.nome}</span>
                <span className="stat-breakdown-val">{statMap[openStat].val(r)}</span>
              </div>
            ))
          )}
        </div>
      )}

      <p className="muted" style={{ marginBottom: 8 }}>
        Tocca il nome di un giocatore per il report individuale.
      </p>

      <div className="report-table-scroll">
      <div className="report-table report-table-wide">
        <div className="report-row report-head">
          <span className="report-name">Giocatore</span>
          <span title="Presenza allenamento">Pres.<br />All.</span>
          <span title="Assenza allenamento">Ass.<br />All.</span>
          <span title="Partite giocate">Partite</span>
          <span title="Minuti totali giocati">Minuti</span>
          <span title="Sostituito">Sostit.</span>
          <span title="Convocato">Convoc.</span>
          <span title="Non convocato">Non<br />conv.</span>
          <span title="Cartellini gialli">🟨</span>
          <span title="Cartellini rossi">🟥</span>
        </div>
        {rows.map((r) => (
          <React.Fragment key={r.id}>
            <div className={`report-row ${selectedPlayerId === r.id ? "selected" : ""}`} onClick={() => togglePlayer(r.id)}>
              <span className="report-name">
                {r.nome}
                <span className="report-ruolo">{r.ruolo}</span>
              </span>
              <span className="report-val">{r.presenzeAllenamenti}</span>
              <span className="report-val">{r.assenzeAllenamenti}</span>
              <span className="report-val">{r.partiteGiocate}</span>
              <span className="report-val">{r.minutiGiocati}'</span>
              <span className="report-val">{r.sostituito}</span>
              <span className="report-val">{r.convocato}</span>
              <span className="report-val">{r.nonConvocato}</span>
              <span className="report-val">{r.gialli}</span>
              <span className="report-val">{r.rossi}</span>
            </div>

            {selectedPlayerId === r.id && dettaglio && (
              <div className="player-report-grid">
                <div className="player-report-item">
                  <span className="pr-label">Presenze allenamenti</span>
                  <span className="pr-val">{dettaglio.presenze}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Assenze allenamenti</span>
                  <span className="pr-val">{dettaglio.assenze}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Convocato</span>
                  <span className="pr-val">{dettaglio.convocato}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Non convocato</span>
                  <span className="pr-val">{dettaglio.nonConvocato}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Assente da convocato</span>
                  <span className="pr-val">{dettaglio.assenzePartita}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Titolare</span>
                  <span className="pr-val">{dettaglio.titolare}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Sostituito</span>
                  <span className="pr-val">{dettaglio.sostituito}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Entrato come sostituto</span>
                  <span className="pr-val">{dettaglio.entratoSostituto}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Non entrato (riserva)</span>
                  <span className="pr-val">{dettaglio.nonEntrato}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Minuti giocati totali</span>
                  <span className="pr-val">{dettaglio.minutiGiocati}'</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Minuti campionato</span>
                  <span className="pr-val">{dettaglio.minutiCampionato}'</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Minuti coppa</span>
                  <span className="pr-val">{dettaglio.minutiCoppa}'</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Minuti amichevole</span>
                  <span className="pr-val">{dettaglio.minutiAmichevole}'</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Partite giocate</span>
                  <span className="pr-val">{dettaglio.partiteGiocate}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Gol fatti</span>
                  <span className="pr-val">{dettaglio.golFatti}</span>
                </div>
                {dettaglio.golSubiti !== null && (
                  <div className="player-report-item">
                    <span className="pr-label">Gol subiti (portiere)</span>
                    <span className="pr-val">{dettaglio.golSubiti}</span>
                  </div>
                )}
                <div className="player-report-item">
                  <span className="pr-label">Cartellini gialli</span>
                  <span className="pr-val">{dettaglio.gialli}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Cartellini rossi</span>
                  <span className="pr-val">{dettaglio.rossi}</span>
                </div>
                <div className="player-report-item">
                  <span className="pr-label">Infortuni</span>
                  <span className="pr-val">{dettaglio.infortuni}</span>
                </div>
                {dettaglio.noteAssenze.length > 0 && (
                  <div className="note-assenze-block">
                    <div className="note-assenze-title">📋 Note assenze</div>
                    {dettaglio.noteAssenze.map((n, i) => (
                      <div key={i} className="note-assenze-row">
                        <span className="note-assenze-data">
                          {new Date(n.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                        </span>
                        <span className="note-assenze-contesto">{n.contesto}</span>
                        <span className="note-assenze-motivo">{n.motivo}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn primary print-btn"
                  onClick={() => {
                    ReactDOM.flushSync(() => setPrintMode("player"));
                    window.print();
                  }}
                >
                  <Icon name="Printer" size={15} /> Stampa report
                </button>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      </div>

      {printMode === "player" && selectedPlayer && dettaglio && (
        <PrintPortal>
          <div className="print-page">
            <h1>{selectedPlayer.cognome} {selectedPlayer.nome}</h1>
            <p className="print-subtitle">{selectedPlayer.ruolo}</p>
            <table className="print-table">
              <tbody>
                <tr><td>Presenze allenamenti</td><td>{dettaglio.presenze}</td></tr>
                <tr><td>Assenze allenamenti</td><td>{dettaglio.assenze}</td></tr>
                <tr><td>Convocato</td><td>{dettaglio.convocato}</td></tr>
                <tr><td>Non convocato</td><td>{dettaglio.nonConvocato}</td></tr>
                <tr><td>Assente da convocato</td><td>{dettaglio.assenzePartita}</td></tr>
                <tr><td>Titolare</td><td>{dettaglio.titolare}</td></tr>
                <tr><td>Sostituito</td><td>{dettaglio.sostituito}</td></tr>
                <tr><td>Entrato come sostituto</td><td>{dettaglio.entratoSostituto}</td></tr>
                <tr><td>Non entrato (riserva)</td><td>{dettaglio.nonEntrato}</td></tr>
                <tr><td>Minuti giocati totali</td><td>{dettaglio.minutiGiocati}'</td></tr>
                <tr><td>Minuti campionato</td><td>{dettaglio.minutiCampionato}'</td></tr>
                <tr><td>Minuti coppa</td><td>{dettaglio.minutiCoppa}'</td></tr>
                <tr><td>Minuti amichevole</td><td>{dettaglio.minutiAmichevole}'</td></tr>
                <tr><td>Partite giocate</td><td>{dettaglio.partiteGiocate}</td></tr>
                <tr><td>Gol fatti</td><td>{dettaglio.golFatti}</td></tr>
                {dettaglio.golSubiti !== null && (
                  <tr><td>Gol subiti (portiere)</td><td>{dettaglio.golSubiti}</td></tr>
                )}
                <tr><td>Cartellini gialli</td><td>{dettaglio.gialli}</td></tr>
                <tr><td>Cartellini rossi</td><td>{dettaglio.rossi}</td></tr>
                <tr><td>Infortuni</td><td>{dettaglio.infortuni}</td></tr>
              </tbody>
            </table>
            {dettaglio.noteAssenze.length > 0 && (
              <>
                <p className="print-subtitle" style={{ marginTop: 14 }}>Note assenze</p>
                <table className="print-table">
                  <tbody>
                    {dettaglio.noteAssenze.map((n, i) => (
                      <tr key={i}>
                        <td>
                          {new Date(n.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} · {n.contesto}
                        </td>
                        <td>{n.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div className="print-footer">
              {logoSquadra && <img src={logoSquadra} alt="" />}
              <span>{noi}</span>
              <span>{oggi}</span>
            </div>
          </div>
        </PrintPortal>
      )}

      {printMode === "general" && (
        <PrintPortal>
          <div className="print-page print-page-wide">
            <h1>Report Atleta — {noi}</h1>
            <table className="print-table print-table-full">
              <thead>
                <tr>
                  <th>Giocatore</th>
                  <th>Ruolo</th>
                  <th>Pres. All.</th>
                  <th>Ass. All.</th>
                  <th>Partite</th>
                  <th>Minuti</th>
                  <th>Sostit.</th>
                  <th>Convoc.</th>
                  <th>Non conv.</th>
                  <th>Gialli</th>
                  <th>Rossi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nome}</td>
                    <td>{r.ruolo}</td>
                    <td>{r.presenzeAllenamenti}</td>
                    <td>{r.assenzeAllenamenti}</td>
                    <td>{r.partiteGiocate}</td>
                    <td>{r.minutiGiocati}'</td>
                    <td>{r.sostituito}</td>
                    <td>{r.convocato}</td>
                    <td>{r.nonConvocato}</td>
                    <td>{r.gialli}</td>
                    <td>{r.rossi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="print-footer">
              {logoSquadra && <img src={logoSquadra} alt="" />}
              <span>{noi}</span>
              <span>{oggi}</span>
            </div>
          </div>
        </PrintPortal>
      )}
    </div>
  );
}

function PremiumGate({ deviceCode, onGoSettings }) {
  return (
    <div className="empty premium-lock">
      <Icon name="Lock" size={30} />
      <p style={{ fontWeight: 700, marginBottom: 2 }}>Sezione premium</p>
      <p className="muted" style={{ marginBottom: 10 }}>
        Questa funzione richiede un codice di sblocco. Il tuo codice richiesta è:
      </p>
      <div className="device-code-chip">{deviceCode}</div>
      <p className="muted" style={{ marginTop: 10, marginBottom: 14 }}>
        Invialo a chi ti ha condiviso l'app per ricevere il codice di sblocco, poi inseriscilo dalle Impostazioni.
      </p>
      <button type="button" className="btn primary" onClick={onGoSettings}>
        <Icon name="Settings" size={15} /> Vai alle Impostazioni
      </button>
    </div>
  );
}

function PrintPortal({ children }) {
  const target = typeof document !== "undefined" ? document.getElementById("print-root") : null;
  if (!target) return null;
  return ReactDOM.createPortal(children, target);
}

function ConvocazioneForm({ initial, players, matches, onSave, onCancel }) {
  const [matchId, setMatchId] = useState(initial.matchId || "");
  const [convocatiIds, setConvocatiIds] = useState(new Set(initial.convocatiIds || []));
  const [dataRitrovo, setDataRitrovo] = useState(initial.dataRitrovo || "");
  const [oraRitrovo, setOraRitrovo] = useState(initial.oraRitrovo || "");
  const [indirizzo, setIndirizzo] = useState(initial.indirizzo || "");
  const [note, setNote] = useState(initial.note || "");

  const sortedMatches = [...matches].sort((a, b) => b.data.localeCompare(a.data));
  const sortedPlayers = [...players].sort((a, b) => {
    const r = RUOLI.indexOf(a.ruolo) - RUOLI.indexOf(b.ruolo);
    return r !== 0 ? r : a.cognome.localeCompare(b.cognome);
  });

  const toggle = (id) =>
    setConvocatiIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (e) => {
    e.preventDefault();
    if (!matchId) return;
    onSave({
      id: initial.id || `c_${Date.now()}`,
      matchId,
      convocatiIds: [...convocatiIds],
      dataRitrovo,
      oraRitrovo,
      indirizzo,
      note,
    });
  };

  return (
    <form className="sheet" onSubmit={submit}>
      <div className="sheet-header">
        <h2>{initial.id ? "Modifica convocazione" : "Nuova convocazione"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel}>
          <Icon name="X" size={18} />
        </button>
      </div>

      {sortedMatches.length === 0 ? (
        <p className="muted">Crea prima una partita nella sezione Partite.</p>
      ) : (
        <label className="field" style={{ marginBottom: 12 }}>
          <span className="field-label">
            <Icon name="Trophy" size={13} /> Partita
          </span>
          <select value={matchId} onChange={(e) => setMatchId(e.target.value)} required>
            <option value="">Scegli la partita…</option>
            {sortedMatches.map((m) => (
              <option key={m.id} value={m.id}>
                {new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
                {m.avversario || "Avversario"}
              </option>
            ))}
          </select>
        </label>
      )}

      {matchId && (
        <>
          <div className="sheet-grid" style={{ marginBottom: 12 }}>
            <label className="field">
              <span className="field-label">
                <Icon name="Calendar" size={13} /> Data ritrovo
              </span>
              <input type="date" value={dataRitrovo} onChange={(e) => setDataRitrovo(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">
                <Icon name="Clock" size={13} /> Ora ritrovo
              </span>
              <input type="time" value={oraRitrovo} onChange={(e) => setOraRitrovo(e.target.value)} />
            </label>
          </div>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="field-label">📍 Indirizzo</span>
            <input
              type="text"
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              placeholder="es. Campo sportivo comunale, via Roma 1"
            />
          </label>
          <label className="field" style={{ marginBottom: 12 }}>
            <span className="field-label">📝 Note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="es. portare la maglia da gara, arrivare 15 minuti prima…"
              rows={2}
            />
          </label>

          <p className="muted" style={{ marginBottom: 8 }}>
            Convocati: {convocatiIds.size} / {players.length}
          </p>
          <div className="roster">
            {sortedPlayers.map((p) => {
              const on = convocatiIds.has(p.id);
              return (
                <div key={p.id} className={`roster-row match-row ${on ? "on" : ""}`}>
                  <div className="match-row-top">
                    <div className="roster-name">
                      <div className="roster-name-main">
                        {p.cognome} {p.nome}
                      </div>
                      <div className="roster-name-sub">{p.ruolo}</div>
                    </div>
                    <div className="stato-toggle">
                      <button
                        type="button"
                        className={`stato-btn ${on ? "active" : ""}`}
                        onClick={() => toggle(p.id)}
                      >
                        {on ? "Convocato ✓" : "Convoca"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
        <button type="submit" className="btn primary" disabled={!matchId}>
          Salva
        </button>
      </div>
    </form>
  );
}

function ConvocazioneCard({ c, players, matches, nomeSquadra, onEdit, onDelete, readOnly }) {
  const match = matches.find((m) => m.id === c.matchId) || null;
  const convocati = players.filter((p) => c.convocatiIds.includes(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome));
  const nonConvocati = players.filter((p) => !c.convocatiIds.includes(p.id)).sort((a, b) => a.cognome.localeCompare(b.cognome));

  const condividiWhatsapp = () => {
    const noi = nomeSquadra || "Rosa Squadra";
    const dataStr = match ? new Date(match.data).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) : "";
    const titolo = match ? `${noi} vs ${match.avversario || "Avversario"} — ${dataStr}` : noi;
    let testo = `📋 CONVOCAZIONI\n${titolo}\n`;
    if (c.dataRitrovo || c.oraRitrovo) {
      const dataRitrovoStr = c.dataRitrovo
        ? new Date(c.dataRitrovo).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })
        : "";
      testo += `\n🗓️ Ritrovo: ${dataRitrovoStr}${c.oraRitrovo ? ` ⏰ ${c.oraRitrovo}` : ""}`;
    }
    if (c.indirizzo) testo += `\n📍 ${c.indirizzo}`;
    if (c.note) testo += `\n📝 ${c.note}`;
    testo += `\n\n✅ CONVOCATI (${convocati.length}):\n`;
    testo += convocati.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    testo += `\n\n❌ NON CONVOCATI (${nonConvocati.length}):\n`;
    testo += nonConvocati.map((p, i) => `${i + 1}. ${p.cognome} ${p.nome}`).join("\n") || "—";
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testo)}`, "_blank");
  };

  return (
    <div className="card training-card">
      <div className="card-number training-date">
        <div className="training-day">{match ? new Date(match.data).getDate() : "?"}</div>
        <div className="training-month">
          {match ? new Date(match.data).toLocaleDateString("it-IT", { month: "short" }) : ""}
        </div>
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="card-name-row">
            {readOnly ? (
              <span className="icon-btn" style={{ cursor: "default" }}>
                <Icon name="ClipboardList" size={14} />
              </span>
            ) : (
              <button className="icon-btn edit-inline" onClick={() => onEdit(c)} aria-label="Modifica">
                <Icon name="Pencil" size={14} />
              </button>
            )}
            <div>
              <div className="card-name">{match ? `vs ${match.avversario || "Avversario"}` : "Partita eliminata"}</div>
              {(c.dataRitrovo || c.oraRitrovo) && (
                <div className="card-meta">
                  🗓️ {c.dataRitrovo ? new Date(c.dataRitrovo).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : ""}
                  {c.oraRitrovo ? ` ⏰ ${c.oraRitrovo}` : ""}
                </div>
              )}
              {c.indirizzo && <div className="card-meta">📍 {c.indirizzo}</div>}
              <div className="card-meta">✅ {c.convocatiIds.length} convocati</div>
              <div className="card-meta">❌ {Math.max(0, players.length - c.convocatiIds.length)} non convocati</div>
            </div>
          </div>
          <div className="card-actions">
            <button className="icon-btn" onClick={condividiWhatsapp} aria-label="Condividi su WhatsApp">
              <WhatsAppIcon size={19} />
            </button>
            {!readOnly && (
              <button className="icon-btn danger" onClick={() => onDelete(c.id)} aria-label="Elimina">
                <Icon name="Trash2" size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendlyForm({ initial, players, trainings, onSave, onCancel }) {
  const [trainingId, setTrainingId] = useState(initial.trainingId || "");
  const [assegnazioni, setAssegnazioni] = useState({ ...initial.assegnazioni });
  const [risultato, setRisultato] = useState(initial.risultato);
  const [rigori, setRigori] = useState(initial.rigori || false);

  const sortedTrainings = [...trainings].sort((a, b) => b.data.localeCompare(a.data));
  const selectedTraining = trainings.find((t) => t.id === trainingId) || null;

  const presenti = selectedTraining
    ? players.filter((p) => selectedTraining.entries[p.id]?.stato === "presente")
    : [];
  const sorted = [...presenti].sort((a, b) => a.cognome.localeCompare(b.cognome));

  const setTeam = (id, team) =>
    setAssegnazioni((prev) => ({ ...prev, [id]: prev[id] === team ? null : team }));

  const dividiACaso = () => setAssegnazioni(shuffleAssegna(presenti));
  const svuota = () => setAssegnazioni({});

  const cambiaAllenamento = (id) => {
    setTrainingId(id);
    setAssegnazioni({});
  };

  const countA = Object.values(assegnazioni).filter((t) => t === "A").length;
  const countB = Object.values(assegnazioni).filter((t) => t === "B").length;

  const submit = (e) => {
    e.preventDefault();
    if (!selectedTraining) return;
    onSave({
      id: initial.id || `f_${Date.now()}`,
      trainingId,
      data: selectedTraining.data,
      assegnazioni,
      risultato,
      rigori: risultato ? rigori : false,
    });
  };

  return (
    <form className="sheet" onSubmit={submit}>
      <div className="sheet-header">
        <h2>{initial.id ? "Modifica partitella" : "Nuova partitella"}</h2>
        <button type="button" className="icon-btn" onClick={onCancel}>
          <Icon name="X" size={18} />
        </button>
      </div>

      {sortedTrainings.length === 0 ? (
        <p className="muted">Registra prima un allenamento nella sezione Allenamenti: la partitella si gioca a fine seduta, con i presenti a quell'allenamento.</p>
      ) : (
        <label className="field" style={{ marginBottom: 12 }}>
          <span className="field-label">
            <Icon name="Dumbbell" size={13} /> Allenamento di riferimento
          </span>
          <select value={trainingId} onChange={(e) => cambiaAllenamento(e.target.value)} required>
            <option value="">Scegli l'allenamento…</option>
            {sortedTrainings.map((t) => {
              const nPresenti = Object.values(t.entries).filter((e) => e.stato === "presente").length;
              return (
                <option key={t.id} value={t.id}>
                  {new Date(t.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })} · {nPresenti} presenti
                </option>
              );
            })}
          </select>
        </label>
      )}

      {selectedTraining && presenti.length < 2 ? (
        <p className="muted">In questo allenamento risultano meno di due presenti: segna prima le presenze in Allenamenti.</p>
      ) : selectedTraining ? (
        <>
          <div className="friendly-actions">
            <button type="button" className="btn ghost" onClick={dividiACaso}>
              <Icon name="Shuffle" size={15} /> Dividi a caso
            </button>
            <button type="button" className="btn ghost" onClick={svuota}>
              Svuota
            </button>
          </div>

          <div className="team-counts">
            <span className="team-count team-a">Squadra A · {countA}</span>
            <span className="team-count team-b">Squadra B · {countB}</span>
          </div>

          <div className="roster">
            {sorted.map((p) => {
              const team = assegnazioni[p.id] || null;
              return (
                <div key={p.id} className={`roster-row match-row ${team ? "on" : ""}`}>
                  <div className="match-row-top">
                    <div className="roster-name">
                      <div className="roster-name-main">
                        {p.cognome} {p.nome}
                      </div>
                      <div className="roster-name-sub">{p.ruolo}</div>
                    </div>
                    <div className="stato-toggle">
                      <button
                        type="button"
                        className={`stato-btn team-a-btn ${team === "A" ? "active" : ""}`}
                        onClick={() => setTeam(p.id, "A")}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        className={`stato-btn team-b-btn ${team === "B" ? "active" : ""}`}
                        onClick={() => setTeam(p.id, "B")}
                      >
                        B
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <span className="field-label">
              <Icon name="Medal" size={13} /> Risultato
            </span>
            <div className="risultato-toggle">
              <button
                type="button"
                className={`stato-btn team-a-btn ${risultato === "A" ? "active" : ""}`}
                onClick={() => setRisultato(risultato === "A" ? null : "A")}
              >
                Vince A
              </button>
              <button
                type="button"
                className={`stato-btn team-b-btn ${risultato === "B" ? "active" : ""}`}
                onClick={() => setRisultato(risultato === "B" ? null : "B")}
              >
                Vince B
              </button>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Non è previsto il pareggio: in caso di parità si decide ai rigori.
            </p>
            {risultato && (
              <label className="rigori-check">
                <input type="checkbox" checked={rigori} onChange={(e) => setRigori(e.target.checked)} />
                Decisa ai rigori
              </label>
            )}
          </div>
        </>
      ) : null}

      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
        <button type="submit" className="btn primary" disabled={!selectedTraining}>
          Salva
        </button>
      </div>
    </form>
  );
}

function FriendlyCard({ f, players, onEdit, onDelete, readOnly }) {
  const teamA = Object.entries(f.assegnazioni || {}).filter(([, t]) => t === "A").map(([id]) => id);
  const teamB = Object.entries(f.assegnazioni || {}).filter(([, t]) => t === "B").map(([id]) => id);

  const titolo = f.risultato
    ? `Vince Squadra ${f.risultato}${f.rigori ? " (rigori)" : ""}`
    : `Squadra A (${teamA.length}) vs Squadra B (${teamB.length})`;
  const esito = f.risultato
    ? `${f.rigori ? "Rigori: +2/+1" : "+3/+0"} · Squadra A ${teamA.length} · Squadra B ${teamB.length}`
    : "Da giocare";

  return (
    <div className="card training-card">
      <div className="card-number training-date">
        <div className="training-day">{new Date(f.data).getDate()}</div>
        <div className="training-month">
          {new Date(f.data).toLocaleDateString("it-IT", { month: "short" })}
        </div>
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="card-name-row">
            {readOnly ? (
              <span className="icon-btn" style={{ cursor: "default" }}>
                <Icon name="Shuffle" size={14} />
              </span>
            ) : (
              <button className="icon-btn edit-inline" onClick={() => onEdit(f)} aria-label="Modifica">
                <Icon name="Pencil" size={14} />
              </button>
            )}
            <div>
              <div className="card-name">{titolo}</div>
              <div className="card-meta">{esito}</div>
            </div>
          </div>
          <div className="card-actions">
            {!readOnly && (
              <button className="icon-btn danger" onClick={() => onDelete(f.id)} aria-label="Elimina">
                <Icon name="Trash2" size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ p, onEdit, onDelete, readOnly }) {
  const cert = certStatus(p.scadenzaCertificato);
  const a = age(p.dataNascita);
  return (
    <div className="card">
      <div className="card-number" style={{ background: RUOLO_COLOR[p.ruolo] }}>
        {p.ruolo ? p.ruolo[0] : "—"}
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="card-name-row">
            {readOnly ? (
              <span className="icon-btn" style={{ cursor: "default" }}>
                <Icon name="User" size={14} />
              </span>
            ) : (
              <button className="icon-btn edit-inline" onClick={() => onEdit(p)} aria-label="Modifica">
                <Icon name="Pencil" size={14} />
              </button>
            )}
            <div>
              <div className="card-name">
                {p.cognome} {p.nome}
              </div>
              <div className="card-meta">
                {p.ruolo}
                {a !== null ? ` · ${a} anni` : ""}
              </div>
            </div>
          </div>
          <div className="card-actions">
            {!readOnly && (
              <button className="icon-btn danger" onClick={() => onDelete(p.id)} aria-label="Elimina">
                <Icon name="Trash2" size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="card-details">
          {p.cellulare && (
            <span className="chip">
              <Icon name="Phone" size={12} /> {p.cellulare}
            </span>
          )}
          {p.cellulareMamma && (
            <span className="chip">
              <Icon name="Phone" size={12} /> 👩 {p.cellulareMamma}
            </span>
          )}
          {p.cellularePapa && (
            <span className="chip">
              <Icon name="Phone" size={12} /> 👨 {p.cellularePapa}
            </span>
          )}
          {p.tessera && (
            <span className="chip">
              <Icon name="Hash" size={12} /> {p.tessera}
            </span>
          )}
          <span className={`chip cert cert-${cert.tone}`}>
            <Icon name="ShieldAlert" size={12} /> {cert.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [players, setPlayers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [friendlies, setFriendlies] = useState([]);
  const [convocazioni, setConvocazioni] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [reportTraining, setReportTraining] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [reportMatch, setReportMatch] = useState(null);
  const [reportMatchQuick, setReportMatchQuick] = useState(null);
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [swUpdateReg, setSwUpdateReg] = useState(null);
  const [swNewVersion, setSwNewVersion] = useState(null);
  const [swCountdown, setSwCountdown] = useState(3);

  useEffect(() => {
    const onUpdate = (e) => {
      setSwUpdateReg(e.detail.registration);
      setSwNewVersion(e.detail.newVersion);
      setSwCountdown(3);
    };
    window.addEventListener("sw-update-available", onUpdate);
    return () => window.removeEventListener("sw-update-available", onUpdate);
  }, []);

  useEffect(() => {
    if (!swUpdateReg) return;
    if (swCountdown <= 0) {
      if (swUpdateReg.waiting) {
        swUpdateReg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      // Rete di sicurezza: se per qualche motivo il service worker non prende il controllo
      // (e quindi l'evento "controllerchange" non scatta), forziamo comunque il ricaricamento
      // dopo pochi secondi, invece di lasciare l'app bloccata sulla versione vecchia.
      const forzatura = setTimeout(() => window.location.reload(), 4000);
      return () => clearTimeout(forzatura);
    }
    const t = setTimeout(() => setSwCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [swUpdateReg, swCountdown]);
  const [editingFriendly, setEditingFriendly] = useState(null);
  const [editingConvocazione, setEditingConvocazione] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("anagrafica");
  const touchRef = useRef({ x: 0, y: 0, ignora: false });

  const cambiaTabSwipe = (direzione) => {
    const ids = isDirettore
      ? ["anagrafica", "report", "report-squadra"]
      : ["anagrafica", "allenamenti", "partite", "partitella", "convocazioni", "report", "report-squadra"];
    const i = ids.indexOf(tab);
    if (i === -1) return;
    const next = direzione === "left" ? i + 1 : i - 1;
    if (next >= 0 && next < ids.length) setTab(ids[next]);
  };

  const onContentTouchStart = (e) => {
    const t = e.touches[0];
    // Se il tocco parte dentro una tabella/elemento che scorre già in orizzontale
    // (es. il report largo), non cambiamo sezione: lasciamo scorrere quello.
    let el = e.target;
    let ignora = false;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 4) {
        const overflowX = window.getComputedStyle(el).overflowX;
        if (overflowX === "auto" || overflowX === "scroll") {
          ignora = true;
          break;
        }
      }
      el = el.parentElement;
    }
    touchRef.current = { x: t.clientX, y: t.clientY, ignora };
  };

  const onContentTouchEnd = (e) => {
    if (touchRef.current.ignora) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      cambiaTabSwipe(dx < 0 ? "left" : "right");
    }
  };
  const [showSettings, setShowSettings] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const [accessoOk, setAccessoOk] = useState(null); // null = verifica in corso, true/false = esito
  const [pinInput, setPinInput] = useState("");
  const [pinErrore, setPinErrore] = useState(false);
  const [pinVerifica, setPinVerifica] = useState(false);

  useEffect(() => {
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    const prova = () => {
      if (annullato) return;
      if (typeof window.fsOnAuthChange === "function") {
        unsubscribe = window.fsOnAuthChange((loggato) => setAccessoOk(loggato));
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        setAccessoOk(false);
      }
    };
    prova();
    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const provaPin = async (e) => {
    e.preventDefault();
    if (typeof window.fsSignIn !== "function") {
      setPinErrore(true);
      return;
    }
    setPinVerifica(true);
    setPinErrore(false);
    try {
      await window.fsSignIn(pinInput.trim());
      // accessoOk passa a true da solo tramite fsOnAuthChange qui sopra.
    } catch (err) {
      setPinErrore(true);
    }
    setPinVerifica(false);
  };

  const [nomeSquadra, setNomeSquadra] = useState(() => {
    try {
      return localStorage.getItem("gs_nome_squadra") || "Rosa Squadra";
    } catch (e) {
      return "Rosa Squadra";
    }
  });
  const [fbNomeSquadraSync, setFbNomeSquadraSync] = useState("connessione");

  useEffect(() => {
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    if (!accessoOk) return;
    const prova = () => {
      if (annullato) return;
      if (typeof window.fsSubscribeDoc === "function") {
        unsubscribe = window.fsSubscribeDoc(
          "impostazioni",
          "club",
          (dati) => {
            setFbNomeSquadraSync("ok");
            if (dati && dati.nomeSquadra) {
              setNomeSquadra(dati.nomeSquadra);
              try {
                localStorage.setItem("gs_nome_squadra", dati.nomeSquadra);
              } catch (e) {}
            } else if (!dati && typeof window.fsSaveDoc === "function") {
              // Nessuno ha ancora salvato un nome condiviso: lo creiamo noi con quello che
              // abbiamo già su questo telefono, così diventa la base per tutti gli allenatori.
              let nomeLocale = "Rosa Squadra";
              try {
                nomeLocale = localStorage.getItem("gs_nome_squadra") || "Rosa Squadra";
              } catch (e) {}
              window.fsSaveDoc("impostazioni", "club", { nomeSquadra: nomeLocale }).catch(() => {});
            }
          },
          () => setFbNomeSquadraSync("offline")
        );
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        setFbNomeSquadraSync("offline");
      }
    };
    prova();
    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, [accessoOk]);

  const salvaNomeSquadra = (nome) => {
    setNomeSquadra(nome);
    try {
      localStorage.setItem("gs_nome_squadra", nome);
    } catch (e) {}
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("impostazioni", "club", { nomeSquadra: nome }).catch((err) => {
        console.error("Errore salvataggio nome squadra su Firestore:", err);
      });
    }
  };

  const [logoSquadra, setLogoSquadra] = useState(() => {
    try {
      return localStorage.getItem("gs_logo_squadra") || "";
    } catch (e) {
      return "";
    }
  });

  const [categoriaAttiva, setCategoriaAttiva] = useState(() => {
    try {
      const v = localStorage.getItem("gs_categoria_attiva");
      return CATEGORIE.some((c) => c.id === v) || v === "tutte" ? v : "giovanissimi15";
    } catch (e) {
      return "giovanissimi15";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("gs_categoria_attiva", categoriaAttiva);
    } catch (e) {}
  }, [categoriaAttiva]);
  const [isDirettore, setIsDirettore] = useState(() => {
    try {
      return localStorage.getItem("gs_is_direttore") === "true";
    } catch (e) {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("gs_is_direttore", isDirettore ? "true" : "false");
    } catch (e) {}
  }, [isDirettore]);
  const modalitaDirettore = isDirettore;
  const vistaTutteCategorie = categoriaAttiva === "tutte";
  const categoriaObj = vistaTutteCategorie ? { nome: "Tutte le categorie", durata: 70, numPeriodi: 2, periodoMinuti: 35 } : getCategoria(categoriaAttiva);
  const durataPartita = categoriaObj.durata;

  const [fbTestStato, setFbTestStato] = useState("idle"); // 'idle' | 'verifica' | 'ok' | 'errore'
  const [fbTestErrore, setFbTestErrore] = useState("");
  const testFirebase = async () => {
    setFbTestStato("verifica");
    setFbTestErrore("");
    if (typeof window.firebaseTestConnessione !== "function") {
      setFbTestStato("errore");
      setFbTestErrore("Modulo Firebase non ancora caricato, riprova tra qualche secondo.");
      return;
    }
    const esito = await window.firebaseTestConnessione();
    if (esito && esito.ok) {
      setFbTestStato("ok");
    } else {
      setFbTestStato("errore");
      setFbTestErrore((esito && esito.errore) || "Errore sconosciuto.");
    }
  };

  const [deviceCode] = useState(() => {
    try {
      let dc = localStorage.getItem("gs_device_code");
      if (!dc) {
        dc = generaCodiceRichiesta();
        localStorage.setItem("gs_device_code", dc);
      }
      return dc;
    } catch (e) {
      return generaCodiceRichiesta();
    }
  });
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem("gs_unlocked") === "true";
    } catch (e) {
      return false;
    }
  });
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockMsg, setUnlockMsg] = useState("");

  const provaSblocco = () => {
    const atteso = computeUnlockCode(deviceCode);
    const pulito = unlockInput.trim().toUpperCase();
    if (pulito === atteso) {
      try {
        localStorage.setItem("gs_unlocked", "true");
      } catch (e) {}
      setUnlocked(true);
      setUnlockMsg("✅ Sblocco riuscito! Le sezioni premium sono ora disponibili.");
    } else {
      setUnlockMsg("❌ Codice non valido. Controlla di averlo copiato correttamente.");
    }
  };

  useEffect(() => {
    try {
      if (logoSquadra) localStorage.setItem("gs_logo_squadra", logoSquadra);
      else localStorage.removeItem("gs_logo_squadra");
    } catch (e) {}
  }, [logoSquadra]);

  const [fbPlayersSync, setFbPlayersSync] = useState("connessione"); // 'connessione' | 'ok' | 'offline'

  useEffect(() => {
    // Giocatori: ora vivono su Firestore, condivisi in tempo reale tra tutti gli allenatori.
    // Il modulo Firebase (index.html) è caricato come <script type="module">, quindi potrebbe non
    // essere ancora pronto nell'istante in cui React parte: ritentiamo per qualche secondo.
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    if (!accessoOk) return;

    const prova = () => {
      if (annullato) return;
      if (typeof window.fsSubscribeCollection === "function") {
        unsubscribe = window.fsSubscribeCollection(
          "giocatori",
          (arr) => {
            setPlayers(arr);
            setFbPlayersSync("ok");
            try {
              localStorage.setItem("gs_players", JSON.stringify(arr));
            } catch (e) {}
          },
          () => setFbPlayersSync("offline")
        );
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        // Firebase non disponibile (es. offline al primo avvio): usa l'ultima copia salvata localmente.
        setFbPlayersSync("offline");
        try {
          const p = localStorage.getItem("gs_players");
          if (p) setPlayers(JSON.parse(p));
        } catch (e) {}
      }
    };
    prova();

    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, [accessoOk]);

  const [fbTrainingsSync, setFbTrainingsSync] = useState("connessione");

  useEffect(() => {
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    if (!accessoOk) return;

    const prova = () => {
      if (annullato) return;
      if (typeof window.fsSubscribeCollection === "function") {
        unsubscribe = window.fsSubscribeCollection(
          "allenamenti",
          (arr) => {
            setTrainings(arr);
            setFbTrainingsSync("ok");
            try {
              localStorage.setItem("gs_trainings", JSON.stringify(arr));
            } catch (e) {}
          },
          () => setFbTrainingsSync("offline")
        );
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        setFbTrainingsSync("offline");
        try {
          const t = localStorage.getItem("gs_trainings");
          if (t) setTrainings(JSON.parse(t));
        } catch (e) {}
      }
    };
    prova();

    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, [accessoOk]);

  const [fbMatchesSync, setFbMatchesSync] = useState("connessione");

  useEffect(() => {
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    if (!accessoOk) return;

    const prova = () => {
      if (annullato) return;
      if (typeof window.fsSubscribeCollection === "function") {
        unsubscribe = window.fsSubscribeCollection(
          "partite",
          (arr) => {
            setMatches(arr);
            setFbMatchesSync("ok");
            try {
              localStorage.setItem("gs_matches", JSON.stringify(arr));
            } catch (e) {}
          },
          () => setFbMatchesSync("offline")
        );
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        setFbMatchesSync("offline");
        try {
          const m = localStorage.getItem("gs_matches");
          if (m) setMatches(JSON.parse(m));
        } catch (e) {}
      }
    };
    prova();

    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, [accessoOk]);

  const updateMatchRemote = (id, updater) => {
    const current = matches.find((x) => x.id === id);
    if (!current) return;
    const updated = typeof updater === "function" ? updater(current) : { ...current, ...updater };
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("partite", id, updated).catch((err) => {
        console.error("Errore salvataggio partita su Firestore:", err);
      });
    } else {
      setMatches((prev) => prev.map((x) => (x.id === id ? updated : x)));
    }
  };

  const [fbFriendliesSync, setFbFriendliesSync] = useState("connessione");
  const [fbConvocazioniSync, setFbConvocazioniSync] = useState("connessione");

  useEffect(() => {
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    if (!accessoOk) return;
    const prova = () => {
      if (annullato) return;
      if (typeof window.fsSubscribeCollection === "function") {
        unsubscribe = window.fsSubscribeCollection(
          "partitelle",
          (arr) => {
            setFriendlies(arr);
            setFbFriendliesSync("ok");
            try {
              localStorage.setItem("gs_friendlies", JSON.stringify(arr));
            } catch (e) {}
          },
          () => setFbFriendliesSync("offline")
        );
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        setFbFriendliesSync("offline");
        try {
          const f = localStorage.getItem("gs_friendlies");
          if (f) setFriendlies(JSON.parse(f));
        } catch (e) {}
      }
    };
    prova();
    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, [accessoOk]);

  useEffect(() => {
    let unsubscribe = null;
    let tentativi = 0;
    let annullato = false;
    if (!accessoOk) return;
    const prova = () => {
      if (annullato) return;
      if (typeof window.fsSubscribeCollection === "function") {
        unsubscribe = window.fsSubscribeCollection(
          "convocazioni",
          (arr) => {
            setConvocazioni(arr);
            setFbConvocazioniSync("ok");
            try {
              localStorage.setItem("gs_convocazioni", JSON.stringify(arr));
            } catch (e) {}
          },
          () => setFbConvocazioniSync("offline")
        );
      } else if (tentativi < 25) {
        tentativi++;
        setTimeout(prova, 200);
      } else {
        setFbConvocazioniSync("offline");
        try {
          const c = localStorage.getItem("gs_convocazioni");
          if (c) setConvocazioni(JSON.parse(c));
        } catch (e) {}
      }
    };
    prova();
    return () => {
      annullato = true;
      if (unsubscribe) unsubscribe();
    };
  }, [accessoOk]);

  const [ordinamento, setOrdinamento] = useState("alfabetico");

  const giocatoriCategoria = useMemo(
    () => (categoriaAttiva === "tutte" ? players : players.filter((p) => (p.categoria || "giovanissimi15") === categoriaAttiva)),
    [players, categoriaAttiva, modalitaDirettore]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let sorted;
    if (ordinamento === "ruolo") {
      sorted = [...giocatoriCategoria].sort((a, b) => {
        const r = RUOLI.indexOf(a.ruolo) - RUOLI.indexOf(b.ruolo);
        return r !== 0 ? r : a.cognome.localeCompare(b.cognome);
      });
    } else {
      sorted = [...giocatoriCategoria].sort((a, b) => a.cognome.localeCompare(b.cognome));
    }
    if (!q) return sorted;
    return sorted.filter((p) =>
      `${p.cognome} ${p.nome} ${p.ruolo}`.toLowerCase().includes(q)
    );
  }, [giocatoriCategoria, query, ordinamento]);

  const scadutiCount = giocatoriCategoria.filter((p) => certStatus(p.scadenzaCertificato).tone !== "ok").length;

  const savePlayer = (p) => {
    setEditing(null);
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("giocatori", p.id, p).catch((err) => {
        console.error("Errore salvataggio giocatore su Firestore:", err);
        setImportMsg("Errore salvataggio: " + (err && err.message ? err.message : "riprova"));
      });
    } else {
      // Fallback offline: aggiorna solo localmente finché Firestore non è raggiungibile.
      setPlayers((prev) => {
        const exists = prev.some((x) => x.id === p.id);
        return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
      });
    }
  };

  const deletePlayer = (id) => {
    if (typeof window.fsDeleteDoc === "function") {
      window.fsDeleteDoc("giocatori", id).catch((err) => {
        console.error("Errore eliminazione giocatore su Firestore:", err);
      });
    } else {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const sortedTrainings = useMemo(
    () =>
      trainings
        .filter((t) => categoriaAttiva === "tutte" || (t.categoria || "giovanissimi15") === categoriaAttiva)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [trainings, categoriaAttiva, modalitaDirettore]
  );

  const saveTraining = (t) => {
    setEditingTraining(null);
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("allenamenti", t.id, t).catch((err) => {
        console.error("Errore salvataggio allenamento su Firestore:", err);
        setImportMsg("Errore salvataggio: " + (err && err.message ? err.message : "riprova"));
      });
    } else {
      setTrainings((prev) => {
        const exists = prev.some((x) => x.id === t.id);
        return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
      });
    }
  };

  const deleteTraining = (id) => {
    if (typeof window.fsDeleteDoc === "function") {
      window.fsDeleteDoc("allenamenti", id).catch((err) => {
        console.error("Errore eliminazione allenamento su Firestore:", err);
      });
    } else {
      setTrainings((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const sortedMatches = useMemo(
    () =>
      matches
        .filter((m) => categoriaAttiva === "tutte" || (m.categoria || "giovanissimi15") === categoriaAttiva)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [matches, categoriaAttiva, modalitaDirettore]
  );

  const saveMatch = (m) => {
    setEditingMatch(null);
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("partite", m.id, m).catch((err) => {
        console.error("Errore salvataggio partita su Firestore:", err);
        setImportMsg("Errore salvataggio: " + (err && err.message ? err.message : "riprova"));
      });
    } else {
      setMatches((prev) => {
        const exists = prev.some((x) => x.id === m.id);
        return exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
      });
    }
  };

  const deleteMatch = (id) => {
    if (typeof window.fsDeleteDoc === "function") {
      window.fsDeleteDoc("partite", id).catch((err) => {
        console.error("Errore eliminazione partita su Firestore:", err);
      });
    } else {
      setMatches((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const [riapriPartitaId, setRiapriPartitaId] = useState("");
  const handleRiapriPartita = () => {
    if (!riapriPartitaId) return;
    const m = matches.find((x) => x.id === riapriPartitaId);
    if (!m) return;
    const dataStr = new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
    const ok = window.confirm(`Riaprire la partita vs ${m.avversario || "Avversario"} del ${dataStr}? Potrai modificarla di nuovo.`);
    if (!ok) return;
    updateMatchRemote(riapriPartitaId, (x) => ({ ...x, chiuso: false }));
    setRiapriPartitaId("");
    setImportMsg(`Partita vs ${m.avversario || "Avversario"} del ${dataStr} riaperta: ora puoi modificarla dalla tab Partite.`);
  };

  const sortedFriendlies = useMemo(() => {
    const trainingCatById = Object.fromEntries(trainings.map((t) => [t.id, t.categoria || "giovanissimi15"]));
    return friendlies
      .filter((f) => categoriaAttiva === "tutte" || (trainingCatById[f.trainingId] || "giovanissimi15") === categoriaAttiva)
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [friendlies, trainings, categoriaAttiva, modalitaDirettore]);

  const saveFriendly = (f) => {
    setEditingFriendly(null);
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("partitelle", f.id, f).catch((err) => {
        console.error("Errore salvataggio partitella su Firestore:", err);
      });
    } else {
      setFriendlies((prev) => {
        const exists = prev.some((x) => x.id === f.id);
        return exists ? prev.map((x) => (x.id === f.id ? f : x)) : [...prev, f];
      });
    }
  };

  const deleteFriendly = (id) => {
    if (typeof window.fsDeleteDoc === "function") {
      window.fsDeleteDoc("partitelle", id).catch((err) => console.error(err));
    } else {
      setFriendlies((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const saveConvocazione = (c) => {
    setEditingConvocazione(null);
    if (typeof window.fsSaveDoc === "function") {
      window.fsSaveDoc("convocazioni", c.id, c).catch((err) => {
        console.error("Errore salvataggio convocazione su Firestore:", err);
      });
    } else {
      setConvocazioni((prev) => {
        const exists = prev.some((x) => x.id === c.id);
        return exists ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c];
      });
    }
  };

  const deleteConvocazione = (id) => {
    if (typeof window.fsDeleteDoc === "function") {
      window.fsDeleteDoc("convocazioni", id).catch((err) => console.error(err));
    } else {
      setConvocazioni((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const classifica = useMemo(() => calcolaClassifica(giocatoriCategoria, sortedFriendlies), [giocatoriCategoria, sortedFriendlies]);

  const COLONNE_EXCEL = {
    cognome: ["cognome"],
    nome: ["nome"],
    dataNascita: ["datanascita", "data di nascita", "nascita"],
    cellulare: ["cellulare", "telefono"],
    cellulareMamma: ["cellularemamma", "cellulare mamma", "telefono mamma", "cellularegenitore", "cellulare genitore", "telefono genitore"],
    cellularePapa: ["cellularepapa", "cellulare papà", "cellulare papa", "telefono papà", "telefono papa"],
    tessera: ["nrtesserafederazione", "tessera", "nr tessera federazione", "numero tessera"],
    scadenzaCertificato: ["datascadenzacertificatomedico", "scadenza certificato medico", "scadenza certificato"],
    ruolo: ["ruolo"],
  };

  const normalizza = (s) => (s || "").toString().trim().toLowerCase().replace(/[\s_]+/g, " ").replace(/\s/g, "");

  function excelDataToISO(v) {
    if (!v) return "";
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return "";
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = v.toString().trim();
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      let [, gg, mm, aaaa] = m;
      if (aaaa.length === 2) aaaa = "20" + aaaa;
      return `${aaaa}-${gg.padStart(2, "0")}-${mm.padStart(2, "0")}`;
    }
    return s;
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 300;
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        setLogoSquadra(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rows.length === 0) {
        setImportMsg("Il file non contiene righe da importare.");
        return;
      }
      const keysOfFirstRow = Object.keys(rows[0]).map((k) => [k, normalizza(k)]);
      const findCol = (aliases) => {
        for (const [orig, norm] of keysOfFirstRow) {
          if (aliases.some((a) => normalizza(a) === norm)) return orig;
        }
        return null;
      };
      const colMap = {};
      Object.entries(COLONNE_EXCEL).forEach(([campo, aliases]) => {
        colMap[campo] = findCol(aliases);
      });

      const nuovi = rows
        .map((row, i) => {
          const cognome = colMap.cognome ? row[colMap.cognome] : "";
          const nome = colMap.nome ? row[colMap.nome] : "";
          if (!cognome && !nome) return null;
          return {
            id: `p_${Date.now()}_${i}`,
            cognome: (cognome || "").toString().trim(),
            nome: (nome || "").toString().trim(),
            dataNascita: colMap.dataNascita ? excelDataToISO(row[colMap.dataNascita]) : "",
            cellulare: colMap.cellulare ? (row[colMap.cellulare] || "").toString().trim() : "",
            cellulareMamma: colMap.cellulareMamma ? (row[colMap.cellulareMamma] || "").toString().trim() : "",
            cellularePapa: colMap.cellularePapa ? (row[colMap.cellularePapa] || "").toString().trim() : "",
            tessera: colMap.tessera ? (row[colMap.tessera] || "").toString().trim() : "",
            scadenzaCertificato: colMap.scadenzaCertificato ? excelDataToISO(row[colMap.scadenzaCertificato]) : "",
            ruolo: colMap.ruolo && RUOLI.includes(row[colMap.ruolo]) ? row[colMap.ruolo] : "Centrocampista",
            categoria: categoriaAttiva,
          };
        })
        .filter(Boolean);

      if (nuovi.length === 0) {
        setImportMsg("Nessuna riga valida trovata (serve almeno Cognome o Nome).");
        return;
      }
      if (typeof window.fsSaveDoc === "function") {
        setImportMsg(`Caricamento di ${nuovi.length} giocatori su Firestore...`);
        await Promise.all(nuovi.map((p) => window.fsSaveDoc("giocatori", p.id, p)));
        setImportMsg(`Importati ${nuovi.length} giocatori.`);
      } else {
        setPlayers((prev) => [...prev, ...nuovi]);
        setImportMsg(`Importati ${nuovi.length} giocatori (solo localmente, Firestore non raggiungibile).`);
      }
    } catch (err) {
      setImportMsg("Errore nella lettura del file. Controlla che sia un .xlsx valido.");
    }
  };

  const handleBackup = async () => {
    const oggi = new Date().toISOString().slice(0, 10);
    const suggerito = `backup-rosa-squadra-${oggi}`;
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), players, trainings, matches, friendlies, convocazioni, nomeSquadra, logoSquadra, categoriaAttiva, unlocked },
      null,
      2
    );

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${suggerito}.json`,
          types: [{ description: "Backup JSON", accept: { "application/json": [".json"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(payload);
        await writable.close();
        setImportMsg("Backup salvato.");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
        // fallback sotto se l'API non va a buon fine
      }
    }

    const nome = window.prompt("Nome del file di backup:", suggerito);
    if (!nome) return;
    const finale = nome.toLowerCase().endsWith(".json") ? nome : `${nome}.json`;
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finale;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setImportMsg("Backup scaricato.");
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.players)) {
        setImportMsg("File di backup non valido.");
        return;
      }
      const ok = window.confirm(
        `Ripristinare questo backup? I giocatori, allenamenti, partite, partitelle e convocazioni del backup verranno AGGIUNTI ` +
          `a quelli già condivisi su Firestore (non sostituiscono nulla, essendo ora un database comune a tutti gli allenatori).`
      );
      if (!ok) return;
      if (typeof window.fsSaveDoc === "function") {
        await Promise.all((data.players || []).map((p) => window.fsSaveDoc("giocatori", p.id, p)));
        await Promise.all((data.trainings || []).map((t) => window.fsSaveDoc("allenamenti", t.id, t)));
        await Promise.all((data.matches || []).map((m) => window.fsSaveDoc("partite", m.id, m)));
        await Promise.all((data.friendlies || []).map((f) => window.fsSaveDoc("partitelle", f.id, f)));
        await Promise.all((data.convocazioni || []).map((c) => window.fsSaveDoc("convocazioni", c.id, c)));
      } else {
        setPlayers(data.players || []);
        setTrainings(data.trainings || []);
        setMatches(data.matches || []);
        setFriendlies(data.friendlies || []);
        setConvocazioni(data.convocazioni || []);
      }
      if (data.nomeSquadra) salvaNomeSquadra(data.nomeSquadra);
      if (data.logoSquadra !== undefined) setLogoSquadra(data.logoSquadra || "");
      if (data.categoriaAttiva && CATEGORIE.some((c) => c.id === data.categoriaAttiva)) setCategoriaAttiva(data.categoriaAttiva);
      if (data.unlocked === true) {
        try {
          localStorage.setItem("gs_unlocked", "true");
        } catch (err) {}
        setUnlocked(true);
      }
      setImportMsg("Backup ripristinato.");
    } catch (err) {
      setImportMsg("Errore nella lettura del backup.");
    }
  };

  const handleImportMerge = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.players)) {
        setImportMsg("File non valido.");
        return;
      }
      const fallbackCategoria = CATEGORIE.some((c) => c.id === data.categoriaAttiva) ? data.categoriaAttiva : "giovanissimi15";
      const nomeOrigine = data.nomeSquadra || "un altro allenatore";

      const ok = window.confirm(
        `Importare i dati di "${nomeOrigine}" (${data.players.length} giocatori, ${(data.trainings || []).length} allenamenti, ${(data.matches || []).length} partite)? ` +
          `Verranno AGGIUNTI a quelli che hai già, senza cancellare nulla. I record senza categoria verranno taggati come "${getCategoria(fallbackCategoria).nome}".`
      );
      if (!ok) return;

      // Rimappa gli id in caso di collisione con record già presenti (stesso millisecondo di creazione)
      const remap = (list, prefix, existingIds) => {
        const map = {};
        (list || []).forEach((item) => {
          map[item.id] = existingIds.has(item.id) ? `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}` : item.id;
        });
        return map;
      };
      const playerIdMap = remap(data.players, "p", new Set(players.map((p) => p.id)));
      const trainingIdMap = remap(data.trainings, "t", new Set(trainings.map((t) => t.id)));
      const matchIdMap = remap(data.matches, "m", new Set(matches.map((m) => m.id)));

      const remapEntries = (entries) =>
        Object.fromEntries(Object.entries(entries || {}).map(([pid, v]) => [playerIdMap[pid] || pid, v]));

      const newPlayers = data.players.map((p) => ({
        ...p,
        id: playerIdMap[p.id],
        categoria: p.categoria || fallbackCategoria,
      }));

      const newTrainings = (data.trainings || []).map((t) => ({
        ...t,
        id: trainingIdMap[t.id],
        categoria: t.categoria || fallbackCategoria,
        entries: remapEntries(t.entries),
      }));

      const newMatches = (data.matches || []).map((m) => ({
        ...m,
        id: matchIdMap[m.id],
        categoria: m.categoria || fallbackCategoria,
        entries: remapEntries(m.entries),
        live: m.live
          ? {
              ...m.live,
              eventi: (m.live.eventi || []).map((ev) => ({
                ...ev,
                playerId: playerIdMap[ev.playerId] || ev.playerId,
                entranteId: ev.entranteId ? playerIdMap[ev.entranteId] || ev.entranteId : ev.entranteId,
              })),
            }
          : m.live,
      }));

      const newFriendlies = (data.friendlies || []).map((f) => ({
        ...f,
        id: `f_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        trainingId: trainingIdMap[f.trainingId] || f.trainingId,
        assegnazioni: remapEntries(f.assegnazioni),
      }));

      const newConvocazioni = (data.convocazioni || []).map((c) => ({
        ...c,
        id: `c_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        matchId: matchIdMap[c.matchId] || c.matchId,
        convocatiIds: (c.convocatiIds || []).map((pid) => playerIdMap[pid] || pid),
      }));

      if (typeof window.fsSaveDoc === "function") {
        await Promise.all(newPlayers.map((p) => window.fsSaveDoc("giocatori", p.id, p)));
        await Promise.all(newTrainings.map((t) => window.fsSaveDoc("allenamenti", t.id, t)));
        await Promise.all(newMatches.map((m) => window.fsSaveDoc("partite", m.id, m)));
        await Promise.all(newFriendlies.map((f) => window.fsSaveDoc("partitelle", f.id, f)));
        await Promise.all(newConvocazioni.map((c) => window.fsSaveDoc("convocazioni", c.id, c)));
      } else {
        setPlayers((prev) => [...prev, ...newPlayers]);
        setTrainings((prev) => [...prev, ...newTrainings]);
        setMatches((prev) => [...prev, ...newMatches]);
        setFriendlies((prev) => [...prev, ...newFriendlies]);
        setConvocazioni((prev) => [...prev, ...newConvocazioni]);
      }

      setImportMsg(
        `Importati: ${newPlayers.length} giocatori, ${newTrainings.length} allenamenti, ${newMatches.length} partite. I tuoi dati esistenti sono rimasti intatti.`
      );
    } catch (err) {
      setImportMsg("Errore nell'importazione del file.");
    }
  };

  const handleResetDati = async () => {
    const ok1 = window.confirm(
      "Questo azzera TUTTI i risultati: presenze/voti/minutaggi negli allenamenti, formazioni/gol/cartellini nelle partite e negli esiti delle partitelle. " +
      "Le date di allenamenti e partite (e gli avversari) restano invariate, così come l'anagrafica giocatori. " +
      "L'operazione non è reversibile (salvo backup). Continuare?"
    );
    if (!ok1) return;
    const conferma = window.prompt('Per confermare, scrivi "RESET" (maiuscolo):');
    if (conferma !== "RESET") {
      setImportMsg("Reset annullato.");
      return;
    }
    if (typeof window.fsSaveDoc === "function") {
      await Promise.all(trainings.map((t) => window.fsSaveDoc("allenamenti", t.id, { ...t, entries: {}, chiuso: false })));
      await Promise.all(matches.map((m) => window.fsSaveDoc("partite", m.id, { ...m, entries: {}, golFatti: "", golSubiti: "", chiuso: false, live: null })));
      await Promise.all(friendlies.map((f) => window.fsSaveDoc("partitelle", f.id, { ...f, assegnazioni: {}, risultato: null, rigori: false })));
    } else {
      setTrainings((prev) => prev.map((t) => ({ ...t, entries: {}, chiuso: false })));
      setMatches((prev) => prev.map((m) => ({ ...m, entries: {}, golFatti: "", golSubiti: "", chiuso: false })));
      setFriendlies((prev) => prev.map((f) => ({ ...f, assegnazioni: {}, risultato: null, rigori: false })));
    }
    setImportMsg("Reset completato: risultati azzerati, calendario e anagrafica mantenuti.");
  };

  const TABS_ALLENATORE = [
    { id: "anagrafica", label: "Anagrafica", icon: <Icon name="Users" size={16} /> },
    { id: "allenamenti", label: "Allenamenti", icon: <Icon name="Dumbbell" size={16} /> },
    { id: "partite", label: "Partite", icon: <Icon name="Trophy" size={16} /> },
    { id: "partitella", label: "Partitella", icon: <Icon name="Shuffle" size={16} /> },
    { id: "convocazioni", label: "Convocazioni", icon: <Icon name="ClipboardList" size={16} /> },
    { id: "report", label: "Report Atleta", icon: <Icon name="BarChart3" size={16} /> },
    { id: "report-squadra", label: "Report Squadra", icon: <Icon name="Medal" size={16} /> },
  ];
  const TABS_DIRETTORE = [
    { id: "anagrafica", label: "Rosa", icon: <Icon name="Users" size={16} /> },
    { id: "report", label: "Report Atleta", icon: <Icon name="BarChart3" size={16} /> },
    { id: "report-squadra", label: "Report Squadra", icon: <Icon name="Medal" size={16} /> },
  ];
  const TABS = isDirettore ? TABS_DIRETTORE : TABS_ALLENATORE;

  useEffect(() => {
    const idsDirettore = ["anagrafica", "report", "report-squadra"];
    if (isDirettore && !idsDirettore.includes(tab)) setTab("anagrafica");
  }, [isDirettore]);


  if (accessoOk !== true) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="accesso-gate">
          <div className="accesso-box">
            <span className="brand-mark">⚽</span>
            <h1>Rosa Squadra</h1>
            {accessoOk === null ? (
              <p className="muted">Verifica accesso in corso...</p>
            ) : (
              <>
                <p className="muted">Inserisci il codice di accesso condiviso con lo staff.</p>
                <form onSubmit={provaPin}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinErrore(false);
                    }}
                    placeholder="Codice di accesso"
                    className="accesso-input"
                  />
                  {pinErrore && <p className="accesso-errore">Codice errato, riprova.</p>}
                  <button type="submit" className="btn primary" disabled={pinVerifica} style={{ width: "100%", marginTop: 12 }}>
                    {pinVerifica ? "Verifica..." : "Entra"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <style>{css}</style>

      {swUpdateReg && (
        <div className="update-banner">
          <span>
            <Icon name="RotateCcw" size={14} /> Aggiornamento v{APP_VERSION} → v{swNewVersion || "?"}
          </span>
          <span className="update-banner-countdown">
            Riavvio in {swCountdown}s{swCountdown === 0 ? "..." : ""}
          </span>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          {logoSquadra ? (
            <img src={logoSquadra} alt="Logo squadra" className="brand-logo" />
          ) : (
            <span className="brand-mark">⚽</span>
          )}
          <div>
            <div className="brand-title">{nomeSquadra || "Rosa Squadra"}</div>
            <div className="brand-sub">
              {categoriaObj.nome} · {giocatoriCategoria.length} giocatori{scadutiCount > 0 ? ` · ${scadutiCount} certificati da controllare` : ""}
            </div>
            <div className="brand-credit">Creato da Claude AI for Alessio · v{APP_VERSION}</div>
          </div>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Impostazioni">
          <Icon name="Settings" size={20} />
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content" onTouchStart={onContentTouchStart} onTouchEnd={onContentTouchEnd}>
        {tab === "anagrafica" && (
          <>
            {isDirettore && (
              <div className="direttore-filtro-cat">
                <Icon name="Clock" size={14} />
                <select value={categoriaAttiva} onChange={(e) => setCategoriaAttiva(e.target.value)}>
                  <option value="tutte">🎯 Tutte le categorie</option>
                  {CATEGORIE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="toolbar">
              <div className="search">
                <Icon name="Search" size={16} />
                <input
                  placeholder="Cerca giocatore, ruolo o numero…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {!modalitaDirettore && (
              <button className="btn primary" onClick={() => setEditing({ ...emptyPlayer })}>
                <Icon name="Plus" size={16} /> Aggiungi
              </button>
              )}
            </div>

            <div className="ordinamento-toggle">
              <button
                type="button"
                className={`ord-btn ${ordinamento === "alfabetico" ? "active" : ""}`}
                onClick={() => setOrdinamento("alfabetico")}
              >
                A-Z
              </button>
              <button
                type="button"
                className={`ord-btn ${ordinamento === "ruolo" ? "active" : ""}`}
                onClick={() => setOrdinamento("ruolo")}
              >
                Per ruolo
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="empty">
                <Icon name="User" size={28} />
                <p>{players.length === 0 ? "Nessun giocatore in rosa. Aggiungi il primo." : "Nessun risultato."}</p>
              </div>
            ) : (
              <div className="grid">
                {filtered.map((p, i) => {
                  const mostraIntestazione =
                    ordinamento === "ruolo" && (i === 0 || filtered[i - 1].ruolo !== p.ruolo);
                  return (
                    <React.Fragment key={p.id}>
                      {mostraIntestazione && <div className="ruolo-heading">{p.ruolo}</div>}
                      <PlayerCard p={p} onEdit={setEditing} onDelete={deletePlayer} readOnly={modalitaDirettore} />
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "allenamenti" && (
          <>
            <div className="toolbar">
              <div className="toolbar-title">
                <Icon name="Dumbbell" size={16} /> Sedute di allenamento
              </div>
              {!modalitaDirettore && (
              <button
                className="btn primary"
                onClick={() => setEditingTraining({ ...emptyTraining, data: new Date().toISOString().slice(0, 10), categoria: categoriaAttiva })}
                disabled={players.length === 0}
              >
                <Icon name="Plus" size={16} /> Nuovo
              </button>
              )}
            </div>

            {players.length === 0 ? (
              <div className="empty">
                <Icon name="Dumbbell" size={28} />
                <p>Aggiungi prima i giocatori in Anagrafica.</p>
              </div>
            ) : sortedTrainings.length === 0 ? (
              <div className="empty">
                <Icon name="Clock" size={28} />
                <p>Nessun allenamento registrato.</p>
              </div>
            ) : (
              <div className="grid">
                {sortedTrainings.map((t) => (
                  <TrainingCard
                    key={t.id}
                    t={t}
                    players={giocatoriCategoria}
                    nomeSquadra={nomeSquadra}
                    onEdit={setEditingTraining}
                    onDelete={deleteTraining}
                    onReport={setReportTraining}
                    readOnly={modalitaDirettore}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "partite" && (
          <>
            <div className="toolbar">
              <div className="toolbar-title">
                <Icon name="Trophy" size={16} /> Partite
              </div>
              {!modalitaDirettore && (
              <button
                className="btn primary"
                onClick={() => setEditingMatch({ ...emptyMatch, data: new Date().toISOString().slice(0, 10), categoria: categoriaAttiva })}
                disabled={players.length === 0}
              >
                <Icon name="Plus" size={16} /> Nuova
              </button>
              )}
            </div>

            {players.length === 0 ? (
              <div className="empty">
                <Icon name="Trophy" size={28} />
                <p>Aggiungi prima i giocatori in Anagrafica.</p>
              </div>
            ) : sortedMatches.length === 0 ? (
              <div className="empty">
                <Icon name="Clock" size={28} />
                <p>Nessuna partita registrata.</p>
              </div>
            ) : (
              <div className="grid">
                {sortedMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    m={m}
                    players={giocatoriCategoria}
                    nomeSquadra={nomeSquadra}
                    onEdit={setEditingMatch}
                    onDelete={deleteMatch}
                    onReport={setReportMatch}
                    onQuickReport={setReportMatchQuick}
                    onLive={(match) => setLiveMatchId(match.id)}
                    readOnly={modalitaDirettore}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "partitella" && (
          <>
            <div className="toolbar">
              <div className="toolbar-title">
                <Icon name="Shuffle" size={16} /> Partitelle
              </div>
              {!modalitaDirettore && (
              <button
                className="btn primary"
                onClick={() => setEditingFriendly({ ...emptyFriendly })}
                disabled={trainings.length === 0}
              >
                <Icon name="Plus" size={16} /> Nuova
              </button>
              )}
            </div>

            {trainings.length === 0 ? (
              <div className="empty">
                <Icon name="Shuffle" size={28} />
                <p>Registra prima un allenamento nella sezione Allenamenti.</p>
              </div>
            ) : (
              <>
                <div className="classifica-box">
                  <div className="classifica-title">
                    <Icon name="Medal" size={15} /> Classifica stagionale
                  </div>
                  <div className="report-table">
                    {classifica.map((r, i) => (
                      <div className="report-row classifica-row" key={r.id}>
                        <span className="classifica-pos">{i + 1}</span>
                        <span className="report-name">
                          {r.nome}
                          <span className="report-ruolo">{r.ruolo}</span>
                        </span>
                        <span className="classifica-punti">{r.punti} pt</span>
                      </div>
                    ))}
                  </div>
                </div>

                {sortedFriendlies.length === 0 ? (
                  <div className="empty">
                    <Icon name="Clock" size={28} />
                    <p>Nessuna partitella registrata.</p>
                  </div>
                ) : (
                  <div className="grid">
                    {sortedFriendlies.map((f) => (
                      <FriendlyCard
                        key={f.id}
                        f={f}
                        players={giocatoriCategoria}
                        onEdit={setEditingFriendly}
                        onDelete={deleteFriendly}
                        readOnly={modalitaDirettore}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "convocazioni" && (
          <>
            <div className="toolbar">
              <div className="toolbar-title">
                <Icon name="ClipboardList" size={16} /> Convocazioni
              </div>
              {unlocked && !modalitaDirettore && (
                <button
                  className="btn primary"
                  onClick={() => setEditingConvocazione({ ...emptyConvocazione })}
                  disabled={matches.length === 0}
                >
                  <Icon name="Plus" size={16} /> Nuova
                </button>
              )}
            </div>

            {!unlocked ? (
              <PremiumGate deviceCode={deviceCode} onGoSettings={() => setShowSettings(true)} />
            ) : sortedMatches.length === 0 ? (
              <div className="empty">
                <Icon name="ClipboardList" size={28} />
                <p>Crea prima una partita nella sezione Partite.</p>
              </div>
            ) : convocazioni.filter((c) => sortedMatches.some((m) => m.id === c.matchId)).length === 0 ? (
              <div className="empty">
                <Icon name="ClipboardList" size={28} />
                <p>Nessuna convocazione ancora creata.</p>
              </div>
            ) : (
              <div className="grid">
                {convocazioni
                  .filter((c) => sortedMatches.some((m) => m.id === c.matchId))
                  .sort((a, b) => {
                    const ma = matches.find((m) => m.id === a.matchId);
                    const mb = matches.find((m) => m.id === b.matchId);
                    return (mb?.data || "").localeCompare(ma?.data || "");
                  })
                  .map((c) => (
                    <ConvocazioneCard
                      key={c.id}
                      c={c}
                      players={giocatoriCategoria}
                      matches={matches}
                      nomeSquadra={nomeSquadra}
                      onEdit={setEditingConvocazione}
                      onDelete={deleteConvocazione}
                      readOnly={modalitaDirettore}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {tab === "report" && (
          <>
            <div className="toolbar">
              <div className="toolbar-title">
                <Icon name="BarChart3" size={16} /> Report Atleta
              </div>
            </div>
            {unlocked ? (
              <ReportTab players={giocatoriCategoria} trainings={sortedTrainings} matches={sortedMatches} nomeSquadra={nomeSquadra} logoSquadra={logoSquadra} />
            ) : (
              <PremiumGate deviceCode={deviceCode} onGoSettings={() => setShowSettings(true)} />
            )}
          </>
        )}

        {tab === "report-squadra" && (
          <>
            <div className="toolbar">
              <div className="toolbar-title">
                <Icon name="Medal" size={16} /> Report Squadra
              </div>
            </div>
            {unlocked ? (
              <TeamReportTab matches={sortedMatches} players={giocatoriCategoria} nomeSquadra={nomeSquadra} vistaTutteCategorie={vistaTutteCategorie} />
            ) : (
              <PremiumGate deviceCode={deviceCode} onGoSettings={() => setShowSettings(true)} />
            )}
          </>
        )}
      </main>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <PlayerForm initial={editing} onSave={savePlayer} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}

      {editingTraining && (
        <div className="modal-backdrop" onClick={() => setEditingTraining(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <TrainingForm
              initial={editingTraining}
              players={giocatoriCategoria}
              onSave={saveTraining}
              onCancel={() => setEditingTraining(null)}
            />
          </div>
        </div>
      )}

      {reportTraining && (
        <div className="modal-backdrop" onClick={() => setReportTraining(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <TrainingReportModal
              t={reportTraining}
              players={giocatoriCategoria}
              nomeSquadra={nomeSquadra}
              onClose={() => setReportTraining(null)}
            />
          </div>
        </div>
      )}

      {editingMatch && (
        <div className="modal-backdrop" onClick={() => setEditingMatch(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MatchForm
              initial={editingMatch}
              players={giocatoriCategoria}
              durataPartita={durataPartita}
              onSave={saveMatch}
              onCancel={() => setEditingMatch(null)}
            />
          </div>
        </div>
      )}

      {reportMatch && (
        <div className="modal-backdrop" onClick={() => setReportMatch(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MatchReport m={reportMatch} players={giocatoriCategoria} nomeSquadra={nomeSquadra} onClose={() => setReportMatch(null)} />
          </div>
        </div>
      )}

      {reportMatchQuick && (
        <div className="modal-backdrop" onClick={() => setReportMatchQuick(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <MatchQuickReportModal
              m={reportMatchQuick}
              players={giocatoriCategoria}
              nomeSquadra={nomeSquadra}
              onClose={() => setReportMatchQuick(null)}
            />
          </div>
        </div>
      )}

      {liveMatchId && matches.find((x) => x.id === liveMatchId) && (
        <div className="modal-backdrop">
          <div onClick={(e) => e.stopPropagation()}>
            <LiveMatchModal
              m={matches.find((x) => x.id === liveMatchId)}
              players={giocatoriCategoria}
              nomeSquadra={nomeSquadra}
              categoria={getCategoria(matches.find((x) => x.id === liveMatchId).categoria || categoriaAttiva)}
              onUpdateMatch={updateMatchRemote}
              onClose={() => setLiveMatchId(null)}
            />
          </div>
        </div>
      )}

      {editingFriendly && (
        <div className="modal-backdrop" onClick={() => setEditingFriendly(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <FriendlyForm
              initial={editingFriendly}
              players={giocatoriCategoria}
              trainings={sortedTrainings}
              onSave={saveFriendly}
              onCancel={() => setEditingFriendly(null)}
            />
          </div>
        </div>
      )}

      {editingConvocazione && (
        <div className="modal-backdrop" onClick={() => setEditingConvocazione(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ConvocazioneForm
              initial={editingConvocazione}
              players={giocatoriCategoria}
              matches={sortedMatches}
              onSave={saveConvocazione}
              onCancel={() => setEditingConvocazione(null)}
            />
          </div>
        </div>
      )}

      {showSettings && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowSettings(false);
            setImportMsg("");
          }}
        >
          <div onClick={(e) => e.stopPropagation()} className="sheet">
            <div className="sheet-header">
              <h2>Impostazioni</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setShowSettings(false);
                  setImportMsg("");
                }}
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="Cloud" size={16} /> Database condiviso (Firebase)
              </div>
              <p className="muted">
                <strong>Anagrafica giocatori</strong>: {fbPlayersSync === "ok" && "🟢 sincronizzata in tempo reale con tutti gli allenatori."}
                {fbPlayersSync === "connessione" && "🟡 connessione in corso..."}
                {fbPlayersSync === "offline" && "🔴 non raggiungibile, sto usando l'ultima copia salvata su questo telefono."}
              </p>
              <p className="muted">
                <strong>Allenamenti</strong>: {fbTrainingsSync === "ok" && "🟢 sincronizzati in tempo reale con tutti gli allenatori."}
                {fbTrainingsSync === "connessione" && "🟡 connessione in corso..."}
                {fbTrainingsSync === "offline" && "🔴 non raggiungibili, sto usando l'ultima copia salvata su questo telefono."}
              </p>
              <p className="muted">
                <strong>Partite</strong>: {fbMatchesSync === "ok" && "🟢 sincronizzate in tempo reale con tutti gli allenatori (Partita Live inclusa)."}
                {fbMatchesSync === "connessione" && "🟡 connessione in corso..."}
                {fbMatchesSync === "offline" && "🔴 non raggiungibili, sto usando l'ultima copia salvata su questo telefono."}
              </p>
              <p className="muted">
                <strong>Partitelle</strong>: {fbFriendliesSync === "ok" && "🟢 sincronizzate in tempo reale."}
                {fbFriendliesSync === "connessione" && "🟡 connessione in corso..."}
                {fbFriendliesSync === "offline" && "🔴 non raggiungibili, sto usando l'ultima copia salvata su questo telefono."}
              </p>
              <p className="muted">
                <strong>Convocazioni</strong>: {fbConvocazioniSync === "ok" && "🟢 sincronizzate in tempo reale."}
                {fbConvocazioniSync === "connessione" && "🟡 connessione in corso..."}
                {fbConvocazioniSync === "offline" && "🔴 non raggiungibili, sto usando l'ultima copia salvata su questo telefono."}
              </p>
              <p className="muted" style={{ fontWeight: 700, color: "#2D6A4F" }}>
                🎉 Migrazione completa: tutti i dati sono ora condivisi in tempo reale tra tutti gli allenatori.
              </p>
              <button type="button" className="btn ghost" onClick={testFirebase} disabled={fbTestStato === "verifica"}>
                <Icon name="Cloud" size={15} /> {fbTestStato === "verifica" ? "Verifica in corso..." : "Verifica connessione"}
              </button>
              {fbTestStato === "ok" && (
                <p className="muted" style={{ color: "#2D6A4F", fontWeight: 700, marginTop: 8 }}>
                  ✅ Connesso correttamente al database condiviso.
                </p>
              )}
              {fbTestStato === "errore" && (
                <p className="muted" style={{ color: "#C1440E", fontWeight: 700, marginTop: 8 }}>
                  ❌ Connessione fallita: {fbTestErrore}
                </p>
              )}
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="Lock" size={16} /> Sblocco funzioni premium
              </div>
              {unlocked ? (
                <p className="unlock-ok">✅ Funzioni premium sbloccate su questo telefono.</p>
              ) : (
                <>
                  <p className="muted">
                    Convocazioni e Report sono sezioni premium. Manda il codice qui sotto a chi ti ha
                    condiviso l'app per ricevere il codice di sblocco.
                  </p>
                  <p className="settings-label">Il tuo codice richiesta</p>
                  <div className="device-code-chip">{deviceCode}</div>
                  <label className="field" style={{ marginTop: 12 }}>
                    <span className="field-label">Codice di sblocco ricevuto</span>
                    <input
                      type="text"
                      value={unlockInput}
                      onChange={(e) => setUnlockInput(e.target.value)}
                      placeholder="XXXX-XXXX"
                      style={{ textTransform: "uppercase" }}
                    />
                  </label>
                  <button type="button" className="btn primary" style={{ marginTop: 8 }} onClick={provaSblocco}>
                    Sblocca
                  </button>
                  {unlockMsg && <p className="settings-msg">{unlockMsg}</p>}
                </>
              )}
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="Shield" size={16} /> Personalizza squadra
              </div>
              <label className="field" style={{ marginBottom: 4 }}>
                <span className="field-label">Nome della rosa</span>
                <input
                  type="text"
                  value={nomeSquadra}
                  onChange={(e) => setNomeSquadra(e.target.value)}
                  onBlur={(e) => salvaNomeSquadra(e.target.value)}
                  placeholder="Rosa Squadra"
                />
              </label>
              <p className="muted" style={{ marginBottom: 10 }}>
                {fbNomeSquadraSync === "ok" && "🟢 condiviso con tutti gli allenatori — cambialo qui e lo vedranno tutti."}
                {fbNomeSquadraSync === "connessione" && "🟡 connessione in corso..."}
                {fbNomeSquadraSync === "offline" && "🔴 non raggiungibile, salvato solo su questo telefono per ora."}
              </p>
              <p className="muted">Logo squadra (mostrato al posto del pallone in alto)</p>
              <div className="logo-row">
                {logoSquadra ? (
                  <img src={logoSquadra} alt="Logo squadra" className="logo-preview" />
                ) : (
                  <span className="brand-mark">⚽</span>
                )}
                <label className="btn ghost file-btn">
                  <Icon name="FileUp" size={15} /> Carica foto
                  <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                </label>
                {logoSquadra && (
                  <button type="button" className="btn ghost" onClick={() => setLogoSquadra("")}>
                    Ripristina pallone
                  </button>
                )}
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span className="field-label">
                  <Icon name="Clock" size={13} /> Categoria
                </span>
                <select value={categoriaAttiva} onChange={(e) => setCategoriaAttiva(e.target.value)}>
                  {CATEGORIE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {c.durata}' ({c.numPeriodi}x{c.periodoMinuti}')
                    </option>
                  ))}
                  <option value="tutte">🎯 Tutte le categorie</option>
                </select>
              </label>
              <p className="muted">
                Determina durata partita e numero di tempi, e filtra anagrafica/report mostrando solo quelli di
                questa categoria ("Tutte" le mostra insieme).
              </p>

              <label className="direttore-toggle">
                <input type="checkbox" checked={isDirettore} onChange={(e) => setIsDirettore(e.target.checked)} />
                <span>
                  <strong>Sono il Direttore Sportivo</strong>
                  <br />
                  <span className="muted">
                    Interfaccia semplificata (solo Rosa e Report, sola lettura) — indipendente dalla categoria scelta
                    sopra, che qui puoi comunque cambiare per filtrare i report.
                  </span>
                </span>
              </label>
            </div>

            {!modalitaDirettore && (
            <>
            <div className="settings-section">
              <div className="settings-title">
                <Icon name="FileUp" size={16} /> Importa giocatori da Excel
              </div>
              <p className="muted">
                File .xlsx con colonne: Cognome, Nome, Data nascita, Cellulare, Cellulare genitore, Nr tessera
                federazione, Data scadenza certificato medico, Ruolo. I giocatori importati si aggiungono a
                quelli già presenti.
              </p>
              <label className="btn ghost file-btn">
                <Icon name="FileUp" size={15} /> Scegli file Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} hidden />
              </label>
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="Save" size={16} /> Backup
              </div>
              <p className="muted">Salva un file con tutti i dati (giocatori, allenamenti, partite). Puoi scegliere il nome del file.</p>
              <button type="button" className="btn primary" onClick={handleBackup}>
                <Icon name="Save" size={15} /> Esegui backup
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="RotateCcw" size={16} /> Ripristino
              </div>
              <p className="muted">Carica un file di backup per ripristinare i dati (sostituisce quelli attuali).</p>
              <label className="btn ghost file-btn">
                <Icon name="RotateCcw" size={15} /> Scegli file di backup
                <input type="file" accept=".json" onChange={handleRestore} hidden />
              </label>
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="FileUp" size={16} /> Importa da un altro allenatore
              </div>
              <p className="muted">
                Temporaneo, in attesa del database condiviso. Carica il backup di un collega: i suoi giocatori,
                allenamenti e partite vengono <strong>aggiunti</strong> ai tuoi (categoria compresa), senza cancellare
                nulla di ciò che hai già.
              </p>
              <label className="btn ghost file-btn">
                <Icon name="FileUp" size={15} /> Scegli file da importare
                <input type="file" accept=".json" onChange={handleImportMerge} hidden />
              </label>
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="Lock" size={16} /> Riapri partita
              </div>
              <p className="muted">
                Seleziona una partita già chiusa per poterla modificare di nuovo (formazione, gol, cartellini, risultato).
              </p>
              {matches.filter((m) => m.chiuso && (m.categoria || "giovanissimi15") === categoriaAttiva).length === 0 ? (
                <p className="muted">Nessuna partita chiusa al momento (categoria {categoriaObj.nome}).</p>
              ) : (
                <>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <select
                      value={riapriPartitaId}
                      onChange={(e) => setRiapriPartitaId(e.target.value)}
                    >
                      <option value="">Seleziona una partita chiusa...</option>
                      {[...matches]
                        .filter((m) => m.chiuso && (m.categoria || "giovanissimi15") === categoriaAttiva)
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {new Date(m.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })} · vs {m.avversario || "Avversario"} ({m.tipo === "amichevole" ? "Amichevole" : m.tipo === "coppa" ? "Coppa" : "Campionato"})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button type="button" className="btn ghost" onClick={handleRiapriPartita} disabled={!riapriPartitaId}>
                    <Icon name="RotateCcw" size={15} /> Riapri partita selezionata
                  </button>
                </>
              )}
            </div>

            <div className="settings-section">
              <div className="settings-title">
                <Icon name="Trash2" size={16} /> Reset risultati (mantieni calendario)
              </div>
              <p className="muted">
                Azzera presenze, voti, minutaggi, gol e cartellini di allenamenti, partite e partitelle. Mantiene
                invariate le date, gli avversari e l'anagrafica giocatori. Fai prima un backup se vuoi conservare i dati attuali.
              </p>
              <button type="button" className="btn danger" onClick={handleResetDati}>
                <Icon name="Trash2" size={15} /> Azzera risultati
              </button>
            </div>
            </>
            )}

            {importMsg && <div className="settings-msg">{importMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
  :root {
    --pitch-dark: #1B4332;
    --pitch: #2D6A4F;
    --pitch-light: #40916C;
    --chalk: #F7F8F3;
    --card: #FFFFFF;
    --ink: #16241D;
    --ink-soft: #5B6B62;
    --line: #E1E6DF;
    --danger: #C1440E;
    --warning: #B5850A;
    --ok: #2D6A4F;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    overflow-x: hidden;
  }
  .app {
    width: 100%;
    overflow-x: hidden;
    font-family: 'Inter', system-ui, sans-serif;
    background: #FFFFFF;
    min-height: 100vh;
    color: var(--ink);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .update-banner {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: #E9C46A;
    color: #1B1B1B;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.12);
  }
  .update-banner-countdown {
    background: #1B4332;
    color: white;
    border-radius: 8px;
    padding: 5px 11px;
    font-size: 12.5px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .accesso-gate {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--pitch-dark);
  }
  .accesso-box {
    background: var(--card);
    border-radius: 16px;
    padding: 32px 28px;
    max-width: 340px;
    width: 100%;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  }
  .accesso-box .brand-mark { font-size: 40px; display: block; margin-bottom: 6px; }
  .accesso-box h1 {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 22px;
    text-transform: uppercase;
    margin: 0 0 6px;
    color: var(--pitch-dark);
  }
  .accesso-input {
    width: 100%;
    text-align: center;
    font-size: 18px;
    letter-spacing: 4px;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    margin-top: 14px;
  }
  .accesso-errore { color: var(--danger); font-size: 13px; font-weight: 700; margin-top: 8px; }
  .topbar {
    background: var(--pitch-dark);
    color: white;
    padding: calc(20px + env(safe-area-inset-top)) 20px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .settings-btn {
    flex-shrink: 0;
    width: 38px; height: 38px;
    border-radius: 10px;
    border: none;
    background: rgba(255,255,255,0.12);
    color: white;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .settings-btn:hover { background: rgba(255,255,255,0.2); }
  .brand-mark {
    font-size: 26px;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--pitch);
    border-radius: 11px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
  .brand-logo {
    width: 42px;
    height: 42px;
    object-fit: cover;
    border-radius: 11px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    background: white;
    flex-shrink: 0;
  }
  .brand-title {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 22px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .brand-sub { font-size: 12.5px; color: #B7D8C7; margin-top: 2px; }
  .brand-credit { font-size: 10.5px; color: #8FBBA4; margin-top: 1px; font-style: italic; }

  .tabs {
    display: flex;
    background: var(--pitch);
    padding: 0 8px;
    overflow-x: auto;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 14px;
    background: none;
    border: none;
    color: #CFE8DB;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
  }
  .tab.active {
    color: white;
    border-bottom-color: #E9C46A;
  }

  .content { padding: 16px; max-width: 720px; margin: 0 auto; width: 100%; }

  .toolbar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; }
  .toolbar-title {
    flex: 1;
    display: flex; align-items: center; gap: 8px;
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .muted { color: var(--ink-soft); font-size: 13.5px; }
  .formazione-counter { font-weight: 600; }
  .formazione-counter.warn { color: var(--danger); }
  .locked-content { pointer-events: none; opacity: 0.65; }
  .chiuso-banner {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #FBE9DC;
    color: #8A5A1E;
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 10px;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .chiuso-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    background: #8A5A1E;
    color: white;
    padding: 2px 6px;
    border-radius: 5px;
    vertical-align: middle;
    margin-left: 4px;
  }
  .lock-btn { color: #8A5A1E; border-color: #E0C4A0; }
  .match-vs { }
  .vs-sep { color: var(--ink-soft); font-weight: 500; font-size: 12px; text-transform: uppercase; }
  .match-teams { display: flex; flex-direction: column; gap: 1px; }
  .match-team-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .match-team-name {
    font-weight: 700;
    font-size: 14.5px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .match-team-score { font-weight: 800; font-size: 15px; flex-shrink: 0; }
  .distinta-group { margin-bottom: 16px; }
  .distinta-group-title {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 13px;
    font-weight: 700;
    color: var(--pitch);
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 2px solid var(--line);
  }
  .riserve-title { color: #B5850A; }
  .non-conv-title { color: #6c757d; }
  .distinta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 2px;
    border-bottom: 1px solid var(--line);
    font-size: 13.5px;
  }
  .distinta-num {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--chalk);
    border-radius: 6px;
    font-weight: 700;
    font-size: 12px;
  }
  .distinta-name-block { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .distinta-name { font-weight: 600; }
  .distinta-role { color: var(--ink-soft); font-size: 11px; }
  .ordinamento-toggle { display: flex; gap: 6px; margin-bottom: 12px; }
  .ord-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: white;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .ord-btn.active { background: var(--pitch-dark); border-color: var(--pitch-dark); color: white; }
  .ruolo-heading {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--pitch);
    margin: 10px 2px 2px;
  }
  .maglia-input {
    width: 42px;
    flex: 0 0 42px;
    text-align: center;
    font-weight: 700;
    padding: 6px 2px;
    margin-right: 6px;
  }
  .gol-input {
    width: 46px;
    flex: 0 0 46px;
    text-align: center;
  }
  .gol-subiti-input { border-color: #C0524A; color: #C0524A; font-weight: 700; }

  .training-card .training-date {
    flex-direction: column;
    background: var(--pitch-dark);
    line-height: 1;
    gap: 2px;
  }
  .training-day { font-size: 20px; font-weight: 700; }
  .training-month { font-size: 10px; text-transform: uppercase; color: #B7D8C7; }

  .rendimento-chip { background: white; border-width: 1.5px; }

  .roster {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 4px;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px;
  }
  .roster-legend {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 0 8px 6px;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .roster-legend span:nth-child(2) { min-width: 78px; text-align: center; }
  .roster-legend span:nth-child(3) { min-width: 42px; text-align: center; }
  .roster-legend span:nth-child(4) { min-width: 42px; text-align: center; }
  .roster-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
    border-radius: 8px;
  }
  .roster-row.on { background: #F1F7F3; }
  .presente-toggle {
    width: 22px; height: 22px;
    flex-shrink: 0;
    border-radius: 6px;
    border: 1.5px solid var(--line);
    background: white;
    display: flex; align-items: center; justify-content: center;
    color: white;
    cursor: pointer;
  }
  .roster-row.on .presente-toggle { background: var(--pitch); border-color: var(--pitch); }
  .roster-name { flex: 1; min-width: 0; }
  .roster-name-main { font-size: 13.5px; font-weight: 600; }
  .roster-name-sub { font-size: 11px; color: var(--ink-soft); }
  .roster-fields { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
  .roster-fields select { font-size: 11.5px; padding: 5px 4px; border-radius: 6px; border: 1px solid var(--line); }
  .roster-fields input {
    width: 46px;
    font-size: 12px;
    padding: 5px 4px;
    border-radius: 6px;
    border: 1px solid var(--line);
    text-align: center;
  }

  .match-row { flex-direction: column; align-items: stretch; gap: 8px; }
  .match-row-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .match-row-top .roster-name { flex: 1 1 130px; min-width: 0; }
  .stato-toggle { display: flex; flex-wrap: wrap; gap: 6px; flex: 1 1 100%; }
  .stato-btn {
    flex: 1 1 auto;
    min-width: 64px;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    padding: 6px 8px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: white;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .stato-btn.active { background: var(--pitch); border-color: var(--pitch); color: white; }
  .match-fields { display: flex; flex-wrap: wrap; gap: 6px; padding-left: 4px; }
  .match-fields input {
    width: 46px;
    font-size: 12px;
    padding: 5px 4px;
    border-radius: 6px;
    border: 1px solid var(--line);
    text-align: center;
  }
  .pill-toggle {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600;
    padding: 5px 8px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: white;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .pill-toggle.giallo.active { background: #FBF2DD; border-color: #E9C46A; color: #8a6a10; }
  .pill-toggle.giallo.active svg { fill: #E9C46A; }
  .pill-toggle.rosso.active { background: #FBEAE2; border-color: var(--danger); color: var(--danger); }
  .pill-toggle.rosso.active svg { fill: var(--danger); }
  .pill-toggle.sost.active { background: #E8F0EA; border-color: var(--pitch); color: var(--pitch-dark); }
  .min-inline {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--ink-soft);
  }
  .min-input {
    width: 68px;
    font-size: 11px;
    padding: 5px 4px;
    border-radius: 6px;
    border: 1px solid var(--line);
    text-align: center;
  }

  .stato-btn.infortunato.active { background: #B5850A; border-color: #B5850A; }
  .stato-btn.riserva.active { background: #4A7C9B; border-color: #4A7C9B; }
  .stato-btn.non-convocato.active { background: #6c757d; border-color: #6c757d; }
  .stato-btn.assente.active { background: #C1440E; border-color: #C1440E; }
  .infortunato-chip { background: #FBF2DD; border-color: #E9C46A; color: #8a6a10; }

  .report-table {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
  }
  .report-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -16px; padding: 0 16px; }
  .report-table-scroll .report-table { min-width: max-content; }
  .report-table.report-table-wide { overflow: visible; }
  .report-table-wide .report-row {
    grid-template-columns: 148px repeat(10, 62px);
    min-width: 768px;
    position: relative;
  }
  .report-table-wide .report-head span:not(.report-name) {
    font-size: 10.5px;
    line-height: 1.2;
    text-align: center;
  }
  .report-table-wide .report-name {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--card);
    padding: 10px 8px;
    margin: -10px -8px;
    box-shadow: 2px 0 4px rgba(0,0,0,0.06);
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 14px;
  }
  .report-table-wide .report-head .report-name {
    background: var(--chalk);
    z-index: 3;
  }
  .report-table-wide .report-row.selected .report-name { background: #EAF3EC; }
  .report-row {
    display: grid;
    grid-template-columns: 1fr repeat(6, 32px);
    align-items: center;
    padding: 10px 8px;
    border-bottom: 1px solid var(--line);
    font-size: 13px;
  }
  .report-row:last-child { border-bottom: none; }
  .report-row.selected { background: #EAF3EC; }
  .report-table .report-row:not(.report-head) { cursor: pointer; }
  .report-table .report-row:not(.report-head):active { background: var(--chalk); }
  .report-head {
    background: var(--chalk);
    color: var(--ink-soft);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  }
  .report-head .report-name { text-align: left; }
  .report-name { display: flex; flex-direction: column; font-weight: 600; }
  .report-ruolo { font-size: 11px; font-weight: 400; color: var(--ink-soft); }
  .report-val { text-align: center; font-variant-numeric: tabular-nums; }
  .stat-chips { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .esito-title { font-size: 13px; font-weight: 700; color: var(--pitch-dark); margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.02em; }
  .cartellini-table { background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .cartellini-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 12px;
    border-top: 1px solid var(--line);
    font-size: 13.5px;
  }
  .cartellini-row:first-child { border-top: none; }
  .cartellini-nome { font-weight: 600; }
  .cartellini-num { font-weight: 700; color: var(--pitch-dark); }
  .esito-table { background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .esito-row {
    display: grid;
    grid-template-columns: 1fr repeat(7, 34px);
    align-items: center;
    gap: 2px;
    padding: 8px 10px;
    border-top: 1px solid var(--line);
    font-size: 12.5px;
  }
  .esito-row:first-child { border-top: none; }
  .esito-head { background: var(--chalk); font-weight: 700; color: var(--ink-soft); font-size: 11px; }
  .esito-row-tot { font-weight: 700; background: var(--chalk); }
  .esito-label { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .esito-val { text-align: center; }
  .esito-v { color: var(--pitch-dark); font-weight: 700; }
  .esito-n { color: #B5850A; font-weight: 700; }
  .esito-p { color: var(--danger); font-weight: 700; }
  .stat-chip {
    flex: 1 1 100px;
    background: var(--card);
    border: 1.5px solid var(--line);
    border-radius: 12px;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
  }
  .stat-chip.open { border-color: var(--pitch); background: #EAF3EC; }
  .stat-chip.static { cursor: default; flex: 1 1 130px; }
  .stat-chip-num {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--pitch-dark);
  }
  .stat-chip-label { font-size: 11px; color: var(--ink-soft); text-align: center; }
  .stat-breakdown {
    background: var(--chalk);
    border-radius: 10px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }
  .stat-breakdown-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid var(--line);
    font-size: 13px;
  }
  .stat-breakdown-row:last-child { border-bottom: none; }
  .stat-breakdown-val { font-weight: 700; color: var(--pitch-dark); }
  .player-report-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 10px 8px 14px;
    background: var(--chalk);
    border-bottom: 1px solid var(--line);
  }
  .player-report-item {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pr-label { font-size: 11px; color: var(--ink-soft); }
  .pr-val { font-size: 17px; font-weight: 700; color: var(--pitch-dark); font-family: 'Oswald', 'Barlow Condensed', sans-serif; }
  .note-assenze-block {
    grid-column: 1 / -1;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 12px;
  }
  .note-assenze-title { font-size: 12.5px; font-weight: 700; color: var(--pitch-dark); margin-bottom: 6px; }
  .note-assenze-row {
    display: flex;
    gap: 8px;
    font-size: 12.5px;
    padding: 4px 0;
    border-top: 1px solid var(--line);
  }
  .note-assenze-row:first-of-type { border-top: none; }
  .note-assenze-data { font-weight: 700; color: var(--ink-soft); flex-shrink: 0; }
  .note-assenze-contesto { color: var(--ink-soft); flex-shrink: 0; }
  .note-assenze-motivo { color: var(--ink); }
  .search {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 9px 12px;
    color: var(--ink-soft);
  }
  .search input {
    border: none;
    outline: none;
    flex: 1;
    min-width: 0;
    width: 100%;
    font-size: 14px;
    background: transparent;
    color: var(--ink);
  }

  .btn {
    display: inline-flex;
    flex-shrink: 0;
    white-space: nowrap;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 10px;
    padding: 9px 14px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn.primary { background: var(--pitch-dark); color: white; }
  .btn.primary:hover { background: var(--pitch); }
  .btn.ghost { background: transparent; color: var(--ink-soft); }
  .btn.danger { background: var(--danger); color: white; }
  .btn.danger:hover { filter: brightness(0.9); }

  .grid { display: flex; flex-direction: column; gap: 10px; }

  .card {
    display: flex;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
  }
  .card-number {
    width: 56px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: white;
  }
  .card-body { flex: 1; padding: 10px 12px; min-width: 0; }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .card-name { font-weight: 700; font-size: 15px; }
  .card-meta { font-size: 12.5px; color: var(--ink-soft); margin-top: 1px; }
  .card-actions { display: flex; gap: 14px; flex-shrink: 0; }
  .card-name-row { display: flex; align-items: flex-start; gap: 4px; }
  .edit-inline { padding: 3px; margin-top: 1px; flex-shrink: 0; }

  .icon-btn {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 8px;
    color: var(--ink-soft);
    cursor: pointer;
    display: flex;
  }
  .icon-btn:hover { background: var(--chalk); }
  .icon-btn.danger:hover { color: var(--danger); }

  .card-details { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .training-summary { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .training-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
    border-top: 1px solid var(--line);
    padding-top: 10px;
  }
  .btn-mini {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 600;
    padding: 7px 12px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
  }
  .btn-mini.report { background: #E9EEF2; color: var(--pitch-dark); }
  .btn-mini.whatsapp { background: #25D366; color: white; }
  .btn-mini.live { background: #C1440E; color: white; }
  .ts-chip {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--chalk);
    color: var(--ink-soft);
  }
  .ts-chip.ts-presenti { background: #E3F1E7; color: var(--pitch-dark); }
  .ts-chip.ts-infortunati { background: #FBE9DC; color: #B5850A; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--chalk);
    color: var(--ink-soft);
    border: 1px solid var(--line);
  }
  .chip.cert-ok { color: var(--ok); border-color: #cfe3d6; }
  .chip.cert-warning { color: var(--warning); background: #FBF2DD; border-color: #f0e0ae; }
  .chip.cert-danger { color: var(--danger); background: #FBEAE2; border-color: #f0c3ac; }

  .empty, .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 60px 20px;
    color: var(--ink-soft);
    text-align: center;
  }
  .placeholder-icon {
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    color: var(--pitch);
  }

  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(22, 36, 29, 0.45);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 10;
  }
  .sheet {
    background: var(--card);
    width: 100%;
    max-width: 480px;
    border-radius: 16px 16px 0 0;
    padding: 18px;
    max-height: 90vh;
    overflow-y: auto;
  }
  @media (min-width: 560px) {
    .modal-backdrop { align-items: center; }
    .sheet { border-radius: 16px; }
  }
  .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .sheet-header h2 {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 18px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .live-scoreboard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: var(--pitch-dark);
    color: white;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
  }
  .live-team { font-size: 13px; font-weight: 600; flex: 1; min-width: 0; }
  .live-team:last-child { text-align: right; }
  .live-score {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 24px;
    font-weight: 700;
    padding: 0 10px;
    flex-shrink: 0;
  }
  .live-timer-block {
    text-align: center;
    background: var(--chalk);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 14px;
  }
  .live-timer-label { font-size: 12.5px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.03em; }
  .live-timer-display {
    font-family: 'Oswald', 'Barlow Condensed', sans-serif;
    font-size: 34px;
    font-weight: 700;
    color: var(--pitch-dark);
    margin: 4px 0 10px;
  }
  .live-timer-controls { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .live-add-event-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--pitch-dark);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 14px;
  }
  .live-log { margin-bottom: 8px; }
  .live-log-title { font-size: 12.5px; font-weight: 700; color: var(--ink-soft); margin-bottom: 6px; }
  .live-log-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 6px 0;
    border-top: 1px solid var(--line);
  }
  .live-log-row:first-of-type { border-top: none; }
  .live-log-min { font-weight: 700; color: var(--pitch-dark); flex-shrink: 0; width: 32px; }
  .live-log-desc { flex: 1; min-width: 0; }

  .live-event-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 60;
  }
  .live-event-sheet {
    background: var(--card);
    width: 100%;
    max-width: 480px;
    border-radius: 16px 16px 0 0;
    padding: 18px;
    max-height: 80vh;
    overflow-y: auto;
  }
  @media (min-width: 560px) {
    .live-event-overlay { align-items: center; }
    .live-event-sheet { border-radius: 16px; }
  }
  .live-event-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
  .live-event-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .live-event-opt {
    background: var(--chalk);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 8px;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .live-event-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
  .live-event-player {
    background: var(--chalk);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 10px 12px;
    text-align: left;
    font-size: 14px;
    cursor: pointer;
  }

  .sheet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { display: flex; flex-direction: column; gap: 5px; grid-column: span 1; min-width: 0; }
  .field-label { font-size: 12px; font-weight: 600; color: var(--ink-soft); display: flex; align-items: center; gap: 4px; }
  .field input, .field select, .field textarea {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 14px;
    font-family: inherit;
    color: var(--ink);
  }
  .field textarea { resize: vertical; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: 2px solid var(--pitch-light); border-color: var(--pitch-light); }
  .field-error { font-size: 11px; color: var(--danger); }
  @media (max-width: 420px) {
    .sheet-grid { grid-template-columns: 1fr; }
  }

  .sheet-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }

  .settings-section {
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
  }
  .settings-section:last-of-type { border-bottom: none; }
  .settings-title {
    display: flex; align-items: center; gap: 8px;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 6px;
  }
  .settings-section .muted { font-size: 12.5px; margin: 0 0 10px; line-height: 1.4; }
  .direttore-filtro-cat {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--chalk);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px 10px;
    margin-bottom: 10px;
  }
  .direttore-filtro-cat select { flex: 1; border: none; background: transparent; font-size: 13.5px; font-weight: 600; }
  .direttore-toggle {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 14px;
    padding: 12px;
    background: var(--chalk);
    border: 1px solid var(--line);
    border-radius: 10px;
    cursor: pointer;
  }
  .direttore-toggle input { margin-top: 3px; width: 18px; height: 18px; flex-shrink: 0; }
  .direttore-toggle .muted { margin: 4px 0 0; }
  .file-btn {
    display: inline-flex;
    cursor: pointer;
  }
  .logo-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
  .logo-preview {
    width: 42px;
    height: 42px;
    object-fit: cover;
    border-radius: 11px;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }
  .settings-msg {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #E8F0EA;
    color: var(--pitch-dark);
    font-size: 13px;
    font-weight: 600;
  }
  .device-code-chip {
    display: inline-block;
    font-family: 'Oswald', 'Barlow Condensed', monospace;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.08em;
    background: var(--chalk);
    border: 1.5px dashed var(--pitch);
    color: var(--pitch-dark);
    padding: 8px 16px;
    border-radius: 10px;
  }
  .settings-label { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin: 10px 0 6px; }
  .unlock-ok { color: var(--pitch-dark); font-weight: 700; font-size: 14px; }
  .premium-lock { padding: 30px 20px; }

  .friendly-actions { display: flex; gap: 8px; margin-bottom: 10px; }
  .team-counts { display: flex; gap: 8px; margin-bottom: 10px; }
  .team-count {
    flex: 1;
    text-align: center;
    font-size: 12.5px;
    font-weight: 700;
    padding: 6px;
    border-radius: 8px;
  }
  .team-count.team-a { background: #E4EEF7; color: #1B4A72; }
  .team-count.team-b { background: #FBEDE2; color: #8a4a10; }
  .team-a-btn.active { background: #2F6FA8; border-color: #2F6FA8; }
  .team-b-btn.active { background: #C1740E; border-color: #C1740E; }
  .chip.team-a-chip { background: #E4EEF7; border-color: #b7d0e8; color: #1B4A72; }
  .chip.team-b-chip { background: #FBEDE2; border-color: #edc9a0; color: #8a4a10; }

  .classifica-box { margin-bottom: 18px; }
  .classifica-title {
    display: flex; align-items: center; gap: 6px;
    font-weight: 700;
    font-size: 13.5px;
    margin-bottom: 8px;
    color: var(--pitch-dark);
  }
  .classifica-row { grid-template-columns: 26px 1fr 50px; }
  .classifica-pos { text-align: center; font-weight: 700; color: var(--ink-soft); font-size: 12px; }
  .classifica-punti { text-align: right; font-weight: 700; color: var(--pitch-dark); font-size: 13px; }
  .risultato-toggle { display: flex; gap: 8px; }
  .risultato-toggle .stato-btn { flex: 1; padding: 9px; font-size: 13px; }
  .tipo-gara-toggle .stato-btn { font-size: 11.5px; padding: 9px 4px; }
  .risultato-inputs { display: flex; align-items: center; gap: 8px; }
  .risultato-inputs input { width: 100%; text-align: center; }
  .risultato-inputs span { color: var(--ink-soft); font-weight: 700; }
  .esito-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 800;
    color: white;
    vertical-align: middle;
  }
  .esito-badge.esito-v { background: var(--pitch); }
  .esito-badge.esito-p { background: var(--warning); }
  .esito-badge.esito-s { background: var(--danger); }
  .rigori-check {
    display: flex; align-items: center; gap: 6px;
    font-size: 13px;
    margin-top: 10px;
    color: var(--ink);
  }
  .infortunato-check {
    display: flex; align-items: center; gap: 6px;
    font-size: 12.5px;
    margin-top: 6px;
    color: var(--danger);
    font-weight: 600;
  }
  .print-btn { width: 100%; grid-column: 1 / -1; margin-top: 4px; }
  .print-general-btn { width: 100%; margin-bottom: 12px; }
  #print-root { display: none; }
  .print-page { padding: 10mm; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .print-page h1 { font-size: 20px; margin: 0 0 2px; }
  .print-subtitle { font-size: 13px; color: #555; margin: 0 0 14px; }
  .print-page-wide h1 { margin-bottom: 14px; }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .print-table th, .print-table td {
    border: 1px solid #999;
    padding: 5px 9px;
    text-align: left;
  }
  .print-table th { background: #eee; }
  .print-table:not(.print-table-full) td:first-child { width: 70%; }
  .print-table:not(.print-table-full) td:last-child { text-align: right; font-weight: 700; }
  .print-table-full th, .print-table-full td { text-align: center; font-size: 9px; padding: 3px 4px; }
  .print-table-full th:first-child, .print-table-full td:first-child { text-align: left; }
  .print-footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #999;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 11px;
    color: #444;
  }
  .print-footer img { height: 26px; width: 26px; object-fit: cover; border-radius: 6px; }
  @media print {
    @page { size: A4 landscape; margin: 12mm; }
    #root { display: none !important; }
    #print-root { display: block !important; }
  }
`;


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
