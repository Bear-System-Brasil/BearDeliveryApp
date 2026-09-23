#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Gerador da identidade sonora do BearDelivery
//
// Sintetiza todos os sons da marca do zero (sem samples, sem libs de DSP) e
// grava em public/sounds. Rodar de novo com o mesmo código produz bytes
// idênticos — o ruído usa PRNG com semente fixa.
//
//   node scripts/generate-brand-sounds.mjs
//
// Sai em MP3 se um encoder lamejs estiver disponível (`@breezystack/lamejs`,
// ou LAMEJS_PATH apontando para o módulo); senão cai para WAV e avisa.
//
// ─── O MOTIVO ────────────────────────────────────────────────────────────────
// Ré maior:  D5 → A5 → G5 → B5
//            sobe uma quinta, desce um tom, sobe uma terça.
//
// Termina na sexta do acorde (B) — quente e deliberadamente NÃO resolvido: o
// pedido está a caminho. A resolução (D6) só acontece quando a comida chega.
// Cada som do produto é um pedaço desse motivo; sons de falha ficam fora dele
// de propósito, porque não se assina um fracasso com a marca.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SR = 44100;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/sounds");

// ─── Notas ───────────────────────────────────────────────────────────────────

const N = {
  D4: 293.66,
  Eb4: 311.13,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  D5: 587.33,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  D6: 1174.66,
  G6: 1567.98,
  A6: 1760.0,
};

// ─── Timbres ─────────────────────────────────────────────────────────────────
// Cada parcial tem amplitude e taxa de decaimento próprias. Parciais agudos
// morrerem antes dos graves é o que separa "instrumento" de "bipe": é assim
// que soa qualquer coisa percutida no mundo real.
//
// `r` = razão de frequência sobre a fundamental. Razões não inteiras (3.01,
// 4.16, 9.18) são o que dá o caráter de madeira/vidro do marimba e do glocken.

const TIMBRES = {
  // Cliente: marimba + vidro. Quente, redondo, funciona baixinho.
  warm: {
    attack: 0.004,
    bend: 0.006,
    click: { amount: 0.16, freq: 2600, q: 1.1, dur: 0.012 },
    partials: [
      { r: 1, a: 1.0, d: 1.0 },
      { r: 2.0, a: 0.42, d: 0.62 },
      { r: 3.01, a: 0.22, d: 0.42 },
      { r: 4.16, a: 0.12, d: 0.3 },
      { r: 5.43, a: 0.07, d: 0.22 },
      { r: 6.79, a: 0.045, d: 0.17 },
      { r: 9.18, a: 0.025, d: 0.12 },
    ],
  },

  // Restaurante: precisa atravessar fritadeira, exaustor e conversa. Parciais
  // harmônicos cheios + ataque seco concentram energia em 1–5 kHz, que é onde
  // o ouvido humano é mais sensível.
  alert: {
    attack: 0.0015,
    bend: 0.012,
    click: { amount: 0.34, freq: 3400, q: 0.8, dur: 0.01 },
    partials: [
      { r: 1, a: 1.0, d: 1.0 },
      { r: 2, a: 0.62, d: 0.78 },
      { r: 3, a: 0.4, d: 0.6 },
      { r: 4, a: 0.26, d: 0.46 },
      { r: 5, a: 0.16, d: 0.36 },
      { r: 6, a: 0.1, d: 0.28 },
      { r: 7, a: 0.06, d: 0.22 },
    ],
  },

  // Entregador: capacete, vento, trânsito. Fundamental grave que o alto-falante
  // do celular nem reproduz — quem carrega o som são os harmônicos 2/3/4. O
  // ouvido reconstrói a fundamental ausente sozinho.
  deep: {
    attack: 0.003,
    bend: 0.01,
    click: { amount: 0.28, freq: 1900, q: 0.9, dur: 0.014 },
    partials: [
      { r: 1, a: 0.7, d: 1.0 },
      { r: 2, a: 1.0, d: 0.86 },
      { r: 3, a: 0.78, d: 0.7 },
      { r: 4, a: 0.44, d: 0.56 },
      { r: 5, a: 0.24, d: 0.44 },
      { r: 6, a: 0.14, d: 0.34 },
    ],
  },

  // Falha: abafado, sem brilho, sem clique. Soa "murcho" de propósito.
  dull: {
    attack: 0.022,
    bend: 0,
    click: null,
    partials: [
      { r: 1, a: 1.0, d: 1.0 },
      { r: 2, a: 0.2, d: 0.55 },
      { r: 3, a: 0.05, d: 0.35 },
    ],
  },
};

// ─── PRNG determinístico ─────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Biquad (cookbook RBJ) ───────────────────────────────────────────────────

function biquad(type, freq, q) {
  const w0 = (2 * Math.PI * freq) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0, b1, b2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;

  if (type === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else if (type === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    // bandpass, ganho 0 dB no pico
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function applyBiquad(buf, coef) {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x0 = buf[i];
    const y0 =
      coef.b0 * x0 + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    buf[i] = y0;
  }
  return buf;
}

// ─── Síntese de uma nota ─────────────────────────────────────────────────────

/**
 * Escreve uma nota percutida dentro de `buf`, começando em `at` segundos.
 *
 * `dur` é o tempo até o decaimento cair ~43 dB, não um corte seco — a cauda
 * continua além disso e é justamente ela que faz as notas se sobreporem e
 * soarem como um instrumento, e não como bipes enfileirados.
 */
function note(buf, at, freq, dur, amp, timbreName, rand) {
  const t = TIMBRES[timbreName];
  const start = Math.floor(at * SR);
  const len = Math.min(Math.ceil(dur * 2.2 * SR), buf.length - start);
  if (len <= 0) return;

  const norm = t.partials.reduce((s, p) => s + p.a, 0);

  for (const p of t.partials) {
    const k = 5.0 / (dur * p.d);
    const w = (2 * Math.PI * (freq * p.r)) / SR;
    const pa = (p.a / norm) * amp;

    // Fase acumulada, para o pitch bend do ataque não gerar descontinuidade.
    let phase = rand() * Math.PI * 2;

    for (let i = 0; i < len; i++) {
      const time = i / SR;
      const bend = t.bend ? 1 + t.bend * Math.exp(-time / 0.02) : 1;
      phase += w * bend;

      const atk =
        time < t.attack ? 0.5 - 0.5 * Math.cos((Math.PI * time) / t.attack) : 1;
      const env = atk * Math.exp(-time * k);
      // O corte por silêncio só vale depois do ataque — durante a subida o
      // envelope passa por zero e encerraria a nota antes de ela existir.
      if (time > t.attack && env < 1e-5) break;

      buf[start + i] += Math.sin(phase) * env * pa;
    }
  }

  // Transiente de ataque: rajada curta de ruído filtrada na banda do "toque".
  // É o que dá corpo à batida — sem isso a nota entra do nada e soa sintética.
  if (t.click) {
    const c = t.click;
    const clen = Math.min(Math.ceil(c.dur * SR), buf.length - start);
    const burst = new Float32Array(clen);
    for (let i = 0; i < clen; i++) {
      const e = Math.exp((-i / SR / c.dur) * 4);
      burst[i] = (rand() * 2 - 1) * e;
    }
    applyBiquad(burst, biquad("bandpass", Math.min(c.freq, SR / 2 - 1000), c.q));
    for (let i = 0; i < clen; i++) buf[start + i] += burst[i] * c.amount * amp;
  }
}

// ─── Reverb (Freeverb reduzido) ──────────────────────────────────────────────
// Quatro combs em paralelo com amortecimento + dois allpass em série. É o que
// tira o som da "caixa" e o coloca num espaço — a diferença entre um som de
// marca e um bipe de micro-ondas.

const COMB = [1116, 1188, 1277, 1356];
const ALLPASS = [556, 441];

function reverb(input, { room = 0.82, damp = 0.34, mix = 0.22 }) {
  const out = new Float32Array(input.length);

  for (const size of COMB) {
    const buf = new Float32Array(size);
    let idx = 0;
    let filterStore = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buf[idx];
      out[i] += y;
      filterStore = y * (1 - damp) + filterStore * damp;
      buf[idx] = input[i] + filterStore * room;
      idx = (idx + 1) % size;
    }
  }

  for (const size of ALLPASS) {
    const buf = new Float32Array(size);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const bufout = buf[idx];
      const y = -out[i] + bufout;
      buf[idx] = out[i] + bufout * 0.5;
      idx = (idx + 1) % size;
      out[i] = y;
    }
  }

  const wet = mix / COMB.length;
  const result = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    result[i] = input[i] * (1 - mix) + out[i] * wet;
  }
  return result;
}

// ─── Masterização ────────────────────────────────────────────────────────────

function master(buf, { peak = 0.89, hp = 110 } = {}) {
  // Fora o que o alto-falante de celular não toca. Sobra headroom pro resto.
  applyBiquad(buf, biquad("highpass", hp, 0.7));

  // Saturação suave: arredonda picos e engrossa sem soar distorcido.
  const drive = 1.25;
  const k = Math.tanh(drive);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / k;

  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max > 0) {
    const g = peak / max;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
  }

  // Corta o silêncio da cauda e deixa 40 ms de respiro.
  let end = buf.length - 1;
  while (end > 0 && Math.abs(buf[end]) < 0.001) end--;
  end = Math.min(buf.length, end + Math.floor(0.04 * SR));
  const trimmed = buf.subarray(0, end);

  // Fades curtos nas pontas: sem isso o arquivo estala ao começar/terminar.
  const fi = Math.floor(0.002 * SR);
  const fo = Math.floor(0.015 * SR);
  for (let i = 0; i < fi && i < trimmed.length; i++) trimmed[i] *= i / fi;
  for (let i = 0; i < fo && i < trimmed.length; i++) {
    trimmed[trimmed.length - 1 - i] *= i / fo;
  }

  return trimmed;
}

// ─── Encoders ────────────────────────────────────────────────────────────────

function toInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeWav(f32) {
  const pcm = toInt16(f32);
  const header = Buffer.alloc(44);
  const bytes = pcm.length * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + bytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(bytes, 40);
  return Buffer.concat([header, Buffer.from(pcm.buffer, 0, bytes)]);
}

async function loadEncoder() {
  const candidates = ["@breezystack/lamejs", "lamejs"];
  if (process.env.LAMEJS_PATH) {
    candidates.unshift(pathToFileURL(resolve(process.env.LAMEJS_PATH)).href);
  }
  for (const c of candidates) {
    try {
      const mod = await import(c);
      const Mp3Encoder = mod.Mp3Encoder ?? mod.default?.Mp3Encoder;
      if (Mp3Encoder) {
        // Alguns builds do lamejs quebram só na instanciação.
        new Mp3Encoder(1, SR, 96);
        return Mp3Encoder;
      }
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

function encodeMp3(Mp3Encoder, f32, kbps = 96) {
  const enc = new Mp3Encoder(1, SR, kbps);
  const pcm = toInt16(f32);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = enc.encodeBuffer(pcm.subarray(i, Math.min(i + 1152, pcm.length)));
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

// ─── Os sons ─────────────────────────────────────────────────────────────────

function canvas(seconds) {
  return new Float32Array(Math.ceil(seconds * SR));
}

const SOUNDS = {
  // ── Cliente ──────────────────────────────────────────────────────────────

  /** Pedido confirmado. O motivo inteiro, terminando aberto na sexta. */
  "order-confirmed": () => {
    const rand = mulberry32(1001);
    const b = canvas(2.0);
    note(b, 0.0, N.D5, 0.5, 0.85, "warm", rand);
    note(b, 0.155, N.A5, 0.5, 0.8, "warm", rand);
    note(b, 0.31, N.G5, 0.5, 0.75, "warm", rand);
    note(b, 0.465, N.B5, 1.15, 0.95, "warm", rand);
    // Oitava abaixo na última nota: dá fundo sem embolar a melodia.
    note(b, 0.465, N.D5 / 2, 1.2, 0.28, "warm", rand);
    return master(reverb(b, { room: 0.84, damp: 0.3, mix: 0.24 }));
  },

  /**
   * Chegou. O motivo completo mais a resolução em D6.
   * É o fim da jornada — pela regra do pico-fim, o momento que fica na memória.
   */
  "order-arrived": () => {
    const rand = mulberry32(2002);
    const b = canvas(2.6);
    note(b, 0.0, N.D5, 0.45, 0.8, "warm", rand);
    note(b, 0.14, N.A5, 0.45, 0.78, "warm", rand);
    note(b, 0.28, N.G5, 0.45, 0.74, "warm", rand);
    note(b, 0.42, N.B5, 0.6, 0.8, "warm", rand);
    // A resolução, em três oitavas ao mesmo tempo: soa "aberto", como chegada.
    note(b, 0.6, N.D6, 1.5, 1.0, "warm", rand);
    note(b, 0.6, N.D5, 1.5, 0.5, "warm", rand);
    note(b, 0.6, N.D5 / 2, 1.6, 0.3, "warm", rand);
    // Brilho por cima, bem discreto — o "sorriso" do som.
    note(b, 0.63, N.D6 * 2, 0.7, 0.14, "warm", rand);
    note(b, 0.72, N.A5 * 2, 0.6, 0.09, "warm", rand);
    return master(reverb(b, { room: 0.87, damp: 0.26, mix: 0.3 }));
  },

  // ── Etapas do acompanhamento ─────────────────────────────────────────────
  // Cada transição entrega um pedaço do motivo. O cliente só ouve a frase
  // inteira quando o pedido chega: o ouvido fica esperando o fecho.

  /** Em preparo — a abertura do motivo (o salto de quinta). */
  "step-preparing": () => {
    const rand = mulberry32(3003);
    const b = canvas(1.2);
    note(b, 0.0, N.D5, 0.4, 0.6, "warm", rand);
    note(b, 0.15, N.A5, 0.62, 0.6, "warm", rand);
    return master(reverb(b, { room: 0.8, damp: 0.34, mix: 0.2 }), { peak: 0.72 });
  },

  /** Pronto — o par de fecho do motivo. */
  "step-ready": () => {
    const rand = mulberry32(4004);
    const b = canvas(1.2);
    note(b, 0.0, N.G5, 0.4, 0.6, "warm", rand);
    note(b, 0.15, N.B5, 0.65, 0.62, "warm", rand);
    return master(reverb(b, { room: 0.8, damp: 0.34, mix: 0.2 }), { peak: 0.74 });
  },

  /** Saiu para entrega — salto pra oitava, preparando a resolução. */
  "step-on-the-way": () => {
    const rand = mulberry32(5005);
    const b = canvas(1.3);
    note(b, 0.0, N.A5, 0.4, 0.58, "warm", rand);
    note(b, 0.15, N.D6, 0.7, 0.64, "warm", rand);
    return master(reverb(b, { room: 0.82, damp: 0.32, mix: 0.22 }), { peak: 0.76 });
  },

  // ── Restaurante ──────────────────────────────────────────────────────────

  /**
   * Novo pedido. O som mais tocado do produto inteiro — dezenas de vezes por
   * dia, sempre junto de dinheiro entrando. É o mesmo motivo, uma oitava acima
   * e com ataque duro, para atravessar barulho de cozinha. A frase toca duas
   * vezes; quem repete em intervalo é o SoundManager.
   */
  "new-order": () => {
    const rand = mulberry32(6006);
    const b = canvas(1.5);
    const phrase = (t0) => {
      note(b, t0 + 0.0, N.D6, 0.2, 0.9, "alert", rand);
      note(b, t0 + 0.125, N.A6, 0.2, 0.9, "alert", rand);
      note(b, t0 + 0.25, N.G6, 0.32, 0.95, "alert", rand);
      // Camada uma oitava abaixo: dá corpo e evita o som ficar estridente.
      note(b, t0 + 0.0, N.D5, 0.22, 0.4, "alert", rand);
      note(b, t0 + 0.125, N.A5, 0.22, 0.4, "alert", rand);
      note(b, t0 + 0.25, N.G5, 0.34, 0.44, "alert", rand);
    };
    phrase(0.0);
    phrase(0.52);
    // Reverb curto de propósito: som seco corta ruído melhor que som molhado.
    return master(reverb(b, { room: 0.6, damp: 0.5, mix: 0.08 }));
  },

  /** Ação concluída no painel (avançou status). O fecho do motivo, discreto. */
  success: () => {
    const rand = mulberry32(7007);
    const b = canvas(0.9);
    note(b, 0.0, N.G5, 0.22, 0.55, "warm", rand);
    note(b, 0.09, N.B5, 0.4, 0.6, "warm", rand);
    return master(reverb(b, { room: 0.75, damp: 0.4, mix: 0.16 }), { peak: 0.7 });
  },

  // ── Entregador ───────────────────────────────────────────────────────────

  /**
   * Nova corrida disponível. Capacete, vento e trânsito comem agudo, então o
   * motivo desce duas oitavas e ganha harmônicos fortes — a fundamental grave
   * o alto-falante nem reproduz, quem carrega a nota são os harmônicos.
   */
  "new-job": () => {
    const rand = mulberry32(8008);
    const b = canvas(1.6);
    note(b, 0.0, N.D4, 0.3, 0.85, "deep", rand);
    note(b, 0.16, N.A4, 0.3, 0.85, "deep", rand);
    note(b, 0.32, N.G4, 0.3, 0.85, "deep", rand);
    note(b, 0.48, N.B4, 0.6, 0.95, "deep", rand);
    return master(reverb(b, { room: 0.65, damp: 0.45, mix: 0.1 }), { hp: 90 });
  },

  // ── Micro-interação ──────────────────────────────────────────────────────

  /** Item no carrinho. Uma nota só — a primeira do motivo. Curta e baixa. */
  "cart-add": () => {
    const rand = mulberry32(9009);
    const b = canvas(0.5);
    note(b, 0, N.D5, 0.13, 0.5, "warm", rand);
    return master(reverb(b, { room: 0.6, damp: 0.5, mix: 0.1 }), { peak: 0.42 });
  },

  // ── Falha ────────────────────────────────────────────────────────────────

  /**
   * Erro / cancelamento. Fora do motivo e fora do tom (Eb não existe em Ré
   * maior) — soa errado de propósito. Marca não assina fracasso.
   */
  error: () => {
    const rand = mulberry32(1010);
    const b = canvas(1.2);
    note(b, 0.0, N.G4, 0.3, 0.75, "dull", rand);
    note(b, 0.17, N.Eb4, 0.55, 0.8, "dull", rand);
    const out = master(b, { peak: 0.6, hp: 90 });
    applyBiquad(out, biquad("lowpass", 1400, 0.7));
    return out;
  },
};

// Exportado para o script de conferência (scripts/verify-brand-sounds.mjs),
// que analisa os buffers antes da codificação.
export { N, SOUNDS, SR };

// ─── Execução ────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const Mp3Encoder = await loadEncoder();
  const ext = Mp3Encoder ? "mp3" : "wav";

  if (!Mp3Encoder) {
    console.warn(
      "! Nenhum encoder lamejs encontrado — gravando WAV (arquivos ~8x maiores).\n" +
      "  Para MP3: npm i -D @breezystack/lamejs\n",
    );
  }

  let total = 0;
  for (const [name, build] of Object.entries(SOUNDS)) {
    const samples = build();
    const data = Mp3Encoder
      ? encodeMp3(Mp3Encoder, samples)
      : encodeWav(samples);
    await writeFile(resolve(OUT_DIR, `${name}.${ext}`), data);
    total += data.length;
    const secs = (samples.length / SR).toFixed(2);
    const kb = (data.length / 1024).toFixed(1);
    console.log(`  ${name}.${ext}`.padEnd(30) + `${secs}s`.padStart(7) + `${kb} KB`.padStart(11));
  }

  console.log(`\n${Object.keys(SOUNDS).length} sons · ${(total / 1024).toFixed(1)} KB · ${OUT_DIR}`);
}

// Só grava arquivos quando executado direto — importar o módulo (para
// conferência) não deve ter efeito colateral.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
