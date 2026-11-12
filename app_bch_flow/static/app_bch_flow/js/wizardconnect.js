/*! WizardConnect core 0.2.5 / dapp 0.2.2 · Copyright (C) 2026 Whiterun LLC · LGPL-3.0-or-later. Source/build recipe: app_bch_flow/docs/WIZARDCONNECT.md. Third-party notices: ../vendor/WIZARD-THIRD-PARTY-NOTICES.txt */
const pI = (A, g) => {
  if (!A)
    throw Error(`Internal application error: ${g}`);
};
function ao(A) {
  if (typeof A == "string")
    throw new Error(`unwrap: ${A}`);
  if (A instanceof Error)
    throw A;
  return A;
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ot(A) {
  return A instanceof Uint8Array || ArrayBuffer.isView(A) && A.constructor.name === "Uint8Array";
}
function hg(A, g = "") {
  if (!Number.isSafeInteger(A) || A < 0) {
    const I = g && `"${g}" `;
    throw new Error(`${I}expected integer >= 0, got ${A}`);
  }
}
function oA(A, g, I = "") {
  const e = Ot(A), t = A?.length, i = g !== void 0;
  if (!e || i && t !== g) {
    const n = I && `"${I}" `, o = i ? ` of length ${g}` : "", B = e ? `length=${t}` : `type=${typeof A}`;
    throw new Error(n + "expected Uint8Array" + o + ", got " + B);
  }
  return A;
}
function te(A) {
  if (typeof A != "function" || typeof A.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  hg(A.outputLen), hg(A.blockLen);
}
function TI(A, g = !0) {
  if (A.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (g && A.finished)
    throw new Error("Hash#digest() has already been called");
}
function ir(A, g) {
  oA(A, void 0, "digestInto() output");
  const I = g.outputLen;
  if (A.length < I)
    throw new Error('"digestInto() output" expected to be of length >=' + I);
}
function BI(...A) {
  for (let g = 0; g < A.length; g++)
    A[g].fill(0);
}
function we(A) {
  return new DataView(A.buffer, A.byteOffset, A.byteLength);
}
function ZA(A, g) {
  return A << 32 - g | A >>> g;
}
const so = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", nr = /* @__PURE__ */ Array.from({ length: 256 }, (A, g) => g.toString(16).padStart(2, "0"));
function NA(A) {
  if (oA(A), so)
    return A.toHex();
  let g = "";
  for (let I = 0; I < A.length; I++)
    g += nr[A[I]];
  return g;
}
const Ag = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Gi(A) {
  if (A >= Ag._0 && A <= Ag._9)
    return A - Ag._0;
  if (A >= Ag.A && A <= Ag.F)
    return A - (Ag.A - 10);
  if (A >= Ag.a && A <= Ag.f)
    return A - (Ag.a - 10);
}
function dA(A) {
  if (typeof A != "string")
    throw new Error("hex string expected, got " + typeof A);
  if (so)
    return Uint8Array.fromHex(A);
  const g = A.length, I = g / 2;
  if (g % 2)
    throw new Error("hex string expected, got unpadded hex of length " + g);
  const e = new Uint8Array(I);
  for (let t = 0, i = 0; t < I; t++, i += 2) {
    const n = Gi(A.charCodeAt(i)), o = Gi(A.charCodeAt(i + 1));
    if (n === void 0 || o === void 0) {
      const B = A[i] + A[i + 1];
      throw new Error('hex string expected, got non-hex character "' + B + '" at index ' + i);
    }
    e[t] = n * 16 + o;
  }
  return e;
}
function kA(...A) {
  let g = 0;
  for (let e = 0; e < A.length; e++) {
    const t = A[e];
    oA(t), g += t.length;
  }
  const I = new Uint8Array(g);
  for (let e = 0, t = 0; e < A.length; e++) {
    const i = A[e];
    I.set(i, t), t += i.length;
  }
  return I;
}
function or(A, g = {}) {
  const I = (t, i) => A(i).update(t).digest(), e = A(void 0);
  return I.outputLen = e.outputLen, I.blockLen = e.blockLen, I.create = (t) => A(t), Object.assign(I, g), Object.freeze(I);
}
function hI(A = 32) {
  const g = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof g?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return g.getRandomValues(new Uint8Array(A));
}
const Br = (A) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, A])
});
function Cr(A, g, I) {
  return A & g ^ ~A & I;
}
function rr(A, g, I) {
  return A & g ^ A & I ^ g & I;
}
class Er {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = !1;
  length = 0;
  pos = 0;
  destroyed = !1;
  constructor(g, I, e, t) {
    this.blockLen = g, this.outputLen = I, this.padOffset = e, this.isLE = t, this.buffer = new Uint8Array(g), this.view = we(this.buffer);
  }
  update(g) {
    TI(this), oA(g);
    const { view: I, buffer: e, blockLen: t } = this, i = g.length;
    for (let n = 0; n < i; ) {
      const o = Math.min(t - this.pos, i - n);
      if (o === t) {
        const B = we(g);
        for (; t <= i - n; n += t)
          this.process(B, n);
        continue;
      }
      e.set(g.subarray(n, n + o), this.pos), this.pos += o, n += o, this.pos === t && (this.process(I, 0), this.pos = 0);
    }
    return this.length += g.length, this.roundClean(), this;
  }
  digestInto(g) {
    TI(this), ir(g, this), this.finished = !0;
    const { buffer: I, view: e, blockLen: t, isLE: i } = this;
    let { pos: n } = this;
    I[n++] = 128, BI(this.buffer.subarray(n)), this.padOffset > t - n && (this.process(e, 0), n = 0);
    for (let E = n; E < t; E++)
      I[E] = 0;
    e.setBigUint64(t - 8, BigInt(this.length * 8), i), this.process(e, 0);
    const o = we(g), B = this.outputLen;
    if (B % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const C = B / 4, r = this.get();
    if (C > r.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let E = 0; E < C; E++)
      o.setUint32(4 * E, r[E], i);
  }
  digest() {
    const { buffer: g, outputLen: I } = this;
    this.digestInto(g);
    const e = g.slice(0, I);
    return this.destroy(), e;
  }
  _cloneInto(g) {
    g ||= new this.constructor(), g.set(...this.get());
    const { blockLen: I, buffer: e, length: t, finished: i, destroyed: n, pos: o } = this;
    return g.destroyed = n, g.finished = i, g.length = t, g.pos = o, t % I && g.buffer.set(e), g;
  }
  clone() {
    return this._cloneInto();
  }
}
const rg = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), ar = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), Eg = /* @__PURE__ */ new Uint32Array(64);
class sr extends Er {
  constructor(g) {
    super(64, g, 8, !1);
  }
  get() {
    const { A: g, B: I, C: e, D: t, E: i, F: n, G: o, H: B } = this;
    return [g, I, e, t, i, n, o, B];
  }
  // prettier-ignore
  set(g, I, e, t, i, n, o, B) {
    this.A = g | 0, this.B = I | 0, this.C = e | 0, this.D = t | 0, this.E = i | 0, this.F = n | 0, this.G = o | 0, this.H = B | 0;
  }
  process(g, I) {
    for (let E = 0; E < 16; E++, I += 4)
      Eg[E] = g.getUint32(I, !1);
    for (let E = 16; E < 64; E++) {
      const Q = Eg[E - 15], a = Eg[E - 2], s = ZA(Q, 7) ^ ZA(Q, 18) ^ Q >>> 3, d = ZA(a, 17) ^ ZA(a, 19) ^ a >>> 10;
      Eg[E] = d + Eg[E - 7] + s + Eg[E - 16] | 0;
    }
    let { A: e, B: t, C: i, D: n, E: o, F: B, G: C, H: r } = this;
    for (let E = 0; E < 64; E++) {
      const Q = ZA(o, 6) ^ ZA(o, 11) ^ ZA(o, 25), a = r + Q + Cr(o, B, C) + ar[E] + Eg[E] | 0, d = (ZA(e, 2) ^ ZA(e, 13) ^ ZA(e, 22)) + rr(e, t, i) | 0;
      r = C, C = B, B = o, o = n + a | 0, n = i, i = t, t = e, e = a + d | 0;
    }
    e = e + this.A | 0, t = t + this.B | 0, i = i + this.C | 0, n = n + this.D | 0, o = o + this.E | 0, B = B + this.F | 0, C = C + this.G | 0, r = r + this.H | 0, this.set(e, t, i, n, o, B, C, r);
  }
  roundClean() {
    BI(Eg);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), BI(this.buffer);
  }
}
class Qr extends sr {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = rg[0] | 0;
  B = rg[1] | 0;
  C = rg[2] | 0;
  D = rg[3] | 0;
  E = rg[4] | 0;
  F = rg[5] | 0;
  G = rg[6] | 0;
  H = rg[7] | 0;
  constructor() {
    super(32);
  }
}
const LA = /* @__PURE__ */ or(
  () => new Qr(),
  /* @__PURE__ */ Br(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vt = /* @__PURE__ */ BigInt(0), rt = /* @__PURE__ */ BigInt(1);
function LI(A, g = "") {
  if (typeof A != "boolean") {
    const I = g && `"${g}" `;
    throw new Error(I + "expected boolean, got type=" + typeof A);
  }
  return A;
}
function Qo(A) {
  if (typeof A == "bigint") {
    if (!bI(A))
      throw new Error("positive bigint expected, got " + A);
  } else
    hg(A);
  return A;
}
function wI(A) {
  const g = Qo(A).toString(16);
  return g.length & 1 ? "0" + g : g;
}
function co(A) {
  if (typeof A != "string")
    throw new Error("hex string expected, got " + typeof A);
  return A === "" ? vt : BigInt("0x" + A);
}
function dI(A) {
  return co(NA(A));
}
function uo(A) {
  return co(NA(cr(oA(A)).reverse()));
}
function Vt(A, g) {
  hg(g), A = Qo(A);
  const I = dA(A.toString(16).padStart(g * 2, "0"));
  if (I.length !== g)
    throw new Error("number too large");
  return I;
}
function ho(A, g) {
  return Vt(A, g).reverse();
}
function cr(A) {
  return Uint8Array.from(A);
}
function ur(A) {
  return Uint8Array.from(A, (g, I) => {
    const e = g.charCodeAt(0);
    if (g.length !== 1 || e > 127)
      throw new Error(`string contains non-ASCII character "${A[I]}" with code ${e} at position ${I}`);
    return e;
  });
}
const bI = (A) => typeof A == "bigint" && vt <= A;
function hr(A, g, I) {
  return bI(A) && bI(g) && bI(I) && g <= A && A < I;
}
function dr(A, g, I, e) {
  if (!hr(g, I, e))
    throw new Error("expected valid " + A + ": " + I + " <= n < " + e + ", got " + g);
}
function lr(A) {
  let g;
  for (g = 0; A > vt; A >>= rt, g += 1)
    ;
  return g;
}
const Zt = (A) => (rt << BigInt(A)) - rt;
function yr(A, g, I) {
  if (hg(A, "hashLen"), hg(g, "qByteLen"), typeof I != "function")
    throw new Error("hmacFn must be a function");
  const e = (h) => new Uint8Array(h), t = Uint8Array.of(), i = Uint8Array.of(0), n = Uint8Array.of(1), o = 1e3;
  let B = e(A), C = e(A), r = 0;
  const E = () => {
    B.fill(1), C.fill(0), r = 0;
  }, Q = (...h) => I(C, kA(B, ...h)), a = (h = t) => {
    C = Q(i, h), B = Q(), h.length !== 0 && (C = Q(n, h), B = Q());
  }, s = () => {
    if (r++ >= o)
      throw new Error("drbg: tried max amount of iterations");
    let h = 0;
    const u = [];
    for (; h < g; ) {
      B = Q();
      const y = B.slice();
      u.push(y), h += B.length;
    }
    return kA(...u);
  };
  return (h, u) => {
    E(), a(h);
    let y;
    for (; !(y = u(s())); )
      a();
    return E(), y;
  };
}
function zt(A, g = {}, I = {}) {
  if (!A || typeof A != "object")
    throw new Error("expected valid options object");
  function e(i, n, o) {
    const B = A[i];
    if (o && B === void 0)
      return;
    const C = typeof B;
    if (C !== n || B === null)
      throw new Error(`param "${i}" is invalid: expected ${n}, got ${C}`);
  }
  const t = (i, n) => Object.entries(i).forEach(([o, B]) => e(o, B, n));
  t(g, !1), t(I, !0);
}
function Yi(A) {
  const g = /* @__PURE__ */ new WeakMap();
  return (I, ...e) => {
    const t = g.get(I);
    if (t !== void 0)
      return t;
    const i = A(I, ...e);
    return g.set(I, i), i;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const UA = /* @__PURE__ */ BigInt(0), mA = /* @__PURE__ */ BigInt(1), lg = /* @__PURE__ */ BigInt(2), lo = /* @__PURE__ */ BigInt(3), yo = /* @__PURE__ */ BigInt(4), fo = /* @__PURE__ */ BigInt(5), fr = /* @__PURE__ */ BigInt(7), Do = /* @__PURE__ */ BigInt(8), Dr = /* @__PURE__ */ BigInt(9), No = /* @__PURE__ */ BigInt(16);
function OA(A, g) {
  const I = A % g;
  return I >= UA ? I : g + I;
}
function JA(A, g, I) {
  let e = A;
  for (; g-- > UA; )
    e *= e, e %= I;
  return e;
}
function Pi(A, g) {
  if (A === UA)
    throw new Error("invert: expected non-zero number");
  if (g <= UA)
    throw new Error("invert: expected positive modulus, got " + g);
  let I = OA(A, g), e = g, t = UA, i = mA;
  for (; I !== UA; ) {
    const o = e / I, B = e % I, C = t - i * o;
    e = I, I = B, t = i, i = C;
  }
  if (e !== mA)
    throw new Error("invert: does not exist");
  return OA(t, g);
}
function Xt(A, g, I) {
  if (!A.eql(A.sqr(g), I))
    throw new Error("Cannot find square root");
}
function So(A, g) {
  const I = (A.ORDER + mA) / yo, e = A.pow(g, I);
  return Xt(A, e, g), e;
}
function Nr(A, g) {
  const I = (A.ORDER - fo) / Do, e = A.mul(g, lg), t = A.pow(e, I), i = A.mul(g, t), n = A.mul(A.mul(i, lg), t), o = A.mul(i, A.sub(n, A.ONE));
  return Xt(A, o, g), o;
}
function Sr(A) {
  const g = ie(A), I = po(A), e = I(g, g.neg(g.ONE)), t = I(g, e), i = I(g, g.neg(e)), n = (A + fr) / No;
  return (o, B) => {
    let C = o.pow(B, n), r = o.mul(C, e);
    const E = o.mul(C, t), Q = o.mul(C, i), a = o.eql(o.sqr(r), B), s = o.eql(o.sqr(E), B);
    C = o.cmov(C, r, a), r = o.cmov(Q, E, s);
    const d = o.eql(o.sqr(r), B), h = o.cmov(C, r, d);
    return Xt(o, h, B), h;
  };
}
function po(A) {
  if (A < lo)
    throw new Error("sqrt is not defined for small field");
  let g = A - mA, I = 0;
  for (; g % lg === UA; )
    g /= lg, I++;
  let e = lg;
  const t = ie(A);
  for (; Mi(t, e) === 1; )
    if (e++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (I === 1)
    return So;
  let i = t.pow(e, g);
  const n = (g + mA) / lg;
  return function(B, C) {
    if (B.is0(C))
      return C;
    if (Mi(B, C) !== 1)
      throw new Error("Cannot find square root");
    let r = I, E = B.mul(B.ONE, i), Q = B.pow(C, g), a = B.pow(C, n);
    for (; !B.eql(Q, B.ONE); ) {
      if (B.is0(Q))
        return B.ZERO;
      let s = 1, d = B.sqr(Q);
      for (; !B.eql(d, B.ONE); )
        if (s++, d = B.sqr(d), s === r)
          throw new Error("Cannot find square root");
      const h = mA << BigInt(r - s - 1), u = B.pow(E, h);
      r = s, E = B.sqr(u), Q = B.mul(Q, E), a = B.mul(a, u);
    }
    return a;
  };
}
function pr(A) {
  return A % yo === lo ? So : A % Do === fo ? Nr : A % No === Dr ? Sr(A) : po(A);
}
const wr = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function kr(A) {
  const g = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, I = wr.reduce((e, t) => (e[t] = "function", e), g);
  return zt(A, I), A;
}
function mr(A, g, I) {
  if (I < UA)
    throw new Error("invalid exponent, negatives unsupported");
  if (I === UA)
    return A.ONE;
  if (I === mA)
    return g;
  let e = A.ONE, t = g;
  for (; I > UA; )
    I & mA && (e = A.mul(e, t)), t = A.sqr(t), I >>= mA;
  return e;
}
function wo(A, g, I = !1) {
  const e = new Array(g.length).fill(I ? A.ZERO : void 0), t = g.reduce((n, o, B) => A.is0(o) ? n : (e[B] = n, A.mul(n, o)), A.ONE), i = A.inv(t);
  return g.reduceRight((n, o, B) => A.is0(o) ? n : (e[B] = A.mul(n, e[B]), A.mul(n, o)), i), e;
}
function Mi(A, g) {
  const I = (A.ORDER - mA) / lg, e = A.pow(g, I), t = A.eql(e, A.ONE), i = A.eql(e, A.ZERO), n = A.eql(e, A.neg(A.ONE));
  if (!t && !i && !n)
    throw new Error("invalid Legendre symbol result");
  return t ? 1 : i ? 0 : -1;
}
function Hr(A, g) {
  g !== void 0 && hg(g);
  const I = g !== void 0 ? g : A.toString(2).length, e = Math.ceil(I / 8);
  return { nBitLength: I, nByteLength: e };
}
class Rr {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = UA;
  ONE = mA;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(g, I = {}) {
    if (g <= UA)
      throw new Error("invalid field: expected ORDER > 0, got " + g);
    let e;
    this.isLE = !1, I != null && typeof I == "object" && (typeof I.BITS == "number" && (e = I.BITS), typeof I.sqrt == "function" && (this.sqrt = I.sqrt), typeof I.isLE == "boolean" && (this.isLE = I.isLE), I.allowedLengths && (this._lengths = I.allowedLengths?.slice()), typeof I.modFromBytes == "boolean" && (this._mod = I.modFromBytes));
    const { nBitLength: t, nByteLength: i } = Hr(g, e);
    if (i > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = g, this.BITS = t, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(g) {
    return OA(g, this.ORDER);
  }
  isValid(g) {
    if (typeof g != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof g);
    return UA <= g && g < this.ORDER;
  }
  is0(g) {
    return g === UA;
  }
  // is valid and invertible
  isValidNot0(g) {
    return !this.is0(g) && this.isValid(g);
  }
  isOdd(g) {
    return (g & mA) === mA;
  }
  neg(g) {
    return OA(-g, this.ORDER);
  }
  eql(g, I) {
    return g === I;
  }
  sqr(g) {
    return OA(g * g, this.ORDER);
  }
  add(g, I) {
    return OA(g + I, this.ORDER);
  }
  sub(g, I) {
    return OA(g - I, this.ORDER);
  }
  mul(g, I) {
    return OA(g * I, this.ORDER);
  }
  pow(g, I) {
    return mr(this, g, I);
  }
  div(g, I) {
    return OA(g * Pi(I, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(g) {
    return g * g;
  }
  addN(g, I) {
    return g + I;
  }
  subN(g, I) {
    return g - I;
  }
  mulN(g, I) {
    return g * I;
  }
  inv(g) {
    return Pi(g, this.ORDER);
  }
  sqrt(g) {
    return this._sqrt || (this._sqrt = pr(this.ORDER)), this._sqrt(this, g);
  }
  toBytes(g) {
    return this.isLE ? ho(g, this.BYTES) : Vt(g, this.BYTES);
  }
  fromBytes(g, I = !1) {
    oA(g);
    const { _lengths: e, BYTES: t, isLE: i, ORDER: n, _mod: o } = this;
    if (e) {
      if (!e.includes(g.length) || g.length > t)
        throw new Error("Field.fromBytes: expected " + e + " bytes, got " + g.length);
      const C = new Uint8Array(t);
      C.set(g, i ? 0 : C.length - g.length), g = C;
    }
    if (g.length !== t)
      throw new Error("Field.fromBytes: expected " + t + " bytes, got " + g.length);
    let B = i ? uo(g) : dI(g);
    if (o && (B = OA(B, n)), !I && !this.isValid(B))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return B;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(g) {
    return wo(this, g);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(g, I, e) {
    return e ? I : g;
  }
}
function ie(A, g = {}) {
  return new Rr(A, g);
}
function ko(A) {
  if (typeof A != "bigint")
    throw new Error("field order must be bigint");
  const g = A.toString(2).length;
  return Math.ceil(g / 8);
}
function mo(A) {
  const g = ko(A);
  return g + Math.ceil(g / 2);
}
function Ho(A, g, I = !1) {
  oA(A);
  const e = A.length, t = ko(g), i = mo(g);
  if (e < 16 || e < i || e > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + e);
  const n = I ? uo(A) : dI(A), o = OA(n, g - mA) + mA;
  return I ? ho(o, t) : Vt(o, t);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Jg = /* @__PURE__ */ BigInt(0), yg = /* @__PURE__ */ BigInt(1);
function OI(A, g) {
  const I = g.negate();
  return A ? I : g;
}
function Ki(A, g) {
  const I = wo(A.Fp, g.map((e) => e.Z));
  return g.map((e, t) => A.fromAffine(e.toAffine(I[t])));
}
function Ro(A, g) {
  if (!Number.isSafeInteger(A) || A <= 0 || A > g)
    throw new Error("invalid window size, expected [1.." + g + "], got W=" + A);
}
function ke(A, g) {
  Ro(A, g);
  const I = Math.ceil(g / A) + 1, e = 2 ** (A - 1), t = 2 ** A, i = Zt(A), n = BigInt(A);
  return { windows: I, windowSize: e, mask: i, maxNumber: t, shiftBy: n };
}
function bi(A, g, I) {
  const { windowSize: e, mask: t, maxNumber: i, shiftBy: n } = I;
  let o = Number(A & t), B = A >> n;
  o > e && (o -= i, B += yg);
  const C = g * e, r = C + Math.abs(o) - 1, E = o === 0, Q = o < 0, a = g % 2 !== 0;
  return { nextN: B, offset: r, isZero: E, isNeg: Q, isNegF: a, offsetF: C };
}
const me = /* @__PURE__ */ new WeakMap(), Uo = /* @__PURE__ */ new WeakMap();
function He(A) {
  return Uo.get(A) || 1;
}
function qi(A) {
  if (A !== Jg)
    throw new Error("invalid wNAF");
}
class Ur {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(g, I) {
    this.BASE = g.BASE, this.ZERO = g.ZERO, this.Fn = g.Fn, this.bits = I;
  }
  // non-const time multiplication ladder
  _unsafeLadder(g, I, e = this.ZERO) {
    let t = g;
    for (; I > Jg; )
      I & yg && (e = e.add(t)), t = t.double(), I >>= yg;
    return e;
  }
  /**
   * Creates a wNAF precomputation window. Used for caching.
   * Default window size is set by `utils.precompute()` and is equal to 8.
   * Number of precomputed points depends on the curve size:
   * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
   * - 𝑊 is the window size
   * - 𝑛 is the bitlength of the curve order.
   * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
   * @param point Point instance
   * @param W window size
   * @returns precomputed point tables flattened to a single array
   */
  precomputeWindow(g, I) {
    const { windows: e, windowSize: t } = ke(I, this.bits), i = [];
    let n = g, o = n;
    for (let B = 0; B < e; B++) {
      o = n, i.push(o);
      for (let C = 1; C < t; C++)
        o = o.add(n), i.push(o);
      n = o.double();
    }
    return i;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(g, I, e) {
    if (!this.Fn.isValid(e))
      throw new Error("invalid scalar");
    let t = this.ZERO, i = this.BASE;
    const n = ke(g, this.bits);
    for (let o = 0; o < n.windows; o++) {
      const { nextN: B, offset: C, isZero: r, isNeg: E, isNegF: Q, offsetF: a } = bi(e, o, n);
      e = B, r ? i = i.add(OI(Q, I[a])) : t = t.add(OI(E, I[C]));
    }
    return qi(e), { p: t, f: i };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(g, I, e, t = this.ZERO) {
    const i = ke(g, this.bits);
    for (let n = 0; n < i.windows && e !== Jg; n++) {
      const { nextN: o, offset: B, isZero: C, isNeg: r } = bi(e, n, i);
      if (e = o, !C) {
        const E = I[B];
        t = t.add(r ? E.negate() : E);
      }
    }
    return qi(e), t;
  }
  getPrecomputes(g, I, e) {
    let t = me.get(I);
    return t || (t = this.precomputeWindow(I, g), g !== 1 && (typeof e == "function" && (t = e(t)), me.set(I, t))), t;
  }
  cached(g, I, e) {
    const t = He(g);
    return this.wNAF(t, this.getPrecomputes(t, g, e), I);
  }
  unsafe(g, I, e, t) {
    const i = He(g);
    return i === 1 ? this._unsafeLadder(g, I, t) : this.wNAFUnsafe(i, this.getPrecomputes(i, g, e), I, t);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(g, I) {
    Ro(I, this.bits), Uo.set(g, I), me.delete(g);
  }
  hasCache(g) {
    return He(g) !== 1;
  }
}
function Fr(A, g, I, e) {
  let t = g, i = A.ZERO, n = A.ZERO;
  for (; I > Jg || e > Jg; )
    I & yg && (i = i.add(t)), e & yg && (n = n.add(t)), t = t.double(), I >>= yg, e >>= yg;
  return { p1: i, p2: n };
}
function Ji(A, g, I) {
  if (g) {
    if (g.ORDER !== A)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return kr(g), g;
  } else
    return ie(A, { isLE: I });
}
function Gr(A, g, I = {}, e) {
  if (e === void 0 && (e = A === "edwards"), !g || typeof g != "object")
    throw new Error(`expected valid ${A} CURVE object`);
  for (const B of ["p", "n", "h"]) {
    const C = g[B];
    if (!(typeof C == "bigint" && C > Jg))
      throw new Error(`CURVE.${B} must be positive bigint`);
  }
  const t = Ji(g.p, I.Fp, e), i = Ji(g.n, I.Fn, e), o = ["Gx", "Gy", "a", "b"];
  for (const B of o)
    if (!t.isValid(g[B]))
      throw new Error(`CURVE.${B} must be valid field element of CURVE.Fp`);
  return g = Object.freeze(Object.assign({}, g)), { CURVE: g, Fp: t, Fn: i };
}
function Fo(A, g) {
  return function(e) {
    const t = A(e);
    return { secretKey: t, publicKey: g(t) };
  };
}
class Go {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(g, I) {
    if (te(g), oA(I, void 0, "key"), this.iHash = g.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const e = this.blockLen, t = new Uint8Array(e);
    t.set(I.length > e ? g.create().update(I).digest() : I);
    for (let i = 0; i < t.length; i++)
      t[i] ^= 54;
    this.iHash.update(t), this.oHash = g.create();
    for (let i = 0; i < t.length; i++)
      t[i] ^= 106;
    this.oHash.update(t), BI(t);
  }
  update(g) {
    return TI(this), this.iHash.update(g), this;
  }
  digestInto(g) {
    TI(this), oA(g, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(g), this.oHash.update(g), this.oHash.digestInto(g), this.destroy();
  }
  digest() {
    const g = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(g), g;
  }
  _cloneInto(g) {
    g ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: I, iHash: e, finished: t, destroyed: i, blockLen: n, outputLen: o } = this;
    return g = g, g.finished = t, g.destroyed = i, g.blockLen = n, g.outputLen = o, g.oHash = I._cloneInto(g.oHash), g.iHash = e._cloneInto(g.iHash), g;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const vg = (A, g, I) => new Go(A, g).update(I).digest();
vg.create = (A, g) => new Go(A, g);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const xi = (A, g) => (A + (A >= 0 ? g : -g) / Yo) / g;
function Yr(A, g, I) {
  const [[e, t], [i, n]] = g, o = xi(n * A, I), B = xi(-t * A, I);
  let C = A - o * e - B * i, r = -o * t - B * n;
  const E = C < eg, Q = r < eg;
  E && (C = -C), Q && (r = -r);
  const a = Zt(Math.ceil(lr(I) / 2)) + qg;
  if (C < eg || C >= a || r < eg || r >= a)
    throw new Error("splitScalar (endomorphism): failed, k=" + A);
  return { k1neg: E, k1: C, k2neg: Q, k2: r };
}
function Et(A) {
  if (!["compact", "recovered", "der"].includes(A))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return A;
}
function Re(A, g) {
  const I = {};
  for (let e of Object.keys(g))
    I[e] = A[e] === void 0 ? g[e] : A[e];
  return LI(I.lowS, "lowS"), LI(I.prehash, "prehash"), I.format !== void 0 && Et(I.format), I;
}
class Pr extends Error {
  constructor(g = "") {
    super(g);
  }
}
const Qg = {
  // asn.1 DER encoding utils
  Err: Pr,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (A, g) => {
      const { Err: I } = Qg;
      if (A < 0 || A > 256)
        throw new I("tlv.encode: wrong tag");
      if (g.length & 1)
        throw new I("tlv.encode: unpadded data");
      const e = g.length / 2, t = wI(e);
      if (t.length / 2 & 128)
        throw new I("tlv.encode: long form length too big");
      const i = e > 127 ? wI(t.length / 2 | 128) : "";
      return wI(A) + i + t + g;
    },
    // v - value, l - left bytes (unparsed)
    decode(A, g) {
      const { Err: I } = Qg;
      let e = 0;
      if (A < 0 || A > 256)
        throw new I("tlv.encode: wrong tag");
      if (g.length < 2 || g[e++] !== A)
        throw new I("tlv.decode: wrong tlv");
      const t = g[e++], i = !!(t & 128);
      let n = 0;
      if (!i)
        n = t;
      else {
        const B = t & 127;
        if (!B)
          throw new I("tlv.decode(long): indefinite length not supported");
        if (B > 4)
          throw new I("tlv.decode(long): byte length is too big");
        const C = g.subarray(e, e + B);
        if (C.length !== B)
          throw new I("tlv.decode: length bytes not complete");
        if (C[0] === 0)
          throw new I("tlv.decode(long): zero leftmost byte");
        for (const r of C)
          n = n << 8 | r;
        if (e += B, n < 128)
          throw new I("tlv.decode(long): not minimal encoding");
      }
      const o = g.subarray(e, e + n);
      if (o.length !== n)
        throw new I("tlv.decode: wrong value length");
      return { v: o, l: g.subarray(e + n) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(A) {
      const { Err: g } = Qg;
      if (A < eg)
        throw new g("integer: negative integers are not allowed");
      let I = wI(A);
      if (Number.parseInt(I[0], 16) & 8 && (I = "00" + I), I.length & 1)
        throw new g("unexpected DER parsing assertion: unpadded hex");
      return I;
    },
    decode(A) {
      const { Err: g } = Qg;
      if (A[0] & 128)
        throw new g("invalid signature integer: negative");
      if (A[0] === 0 && !(A[1] & 128))
        throw new g("invalid signature integer: unnecessary leading zero");
      return dI(A);
    }
  },
  toSig(A) {
    const { Err: g, _int: I, _tlv: e } = Qg, t = oA(A, void 0, "signature"), { v: i, l: n } = e.decode(48, t);
    if (n.length)
      throw new g("invalid signature: left bytes after parsing");
    const { v: o, l: B } = e.decode(2, i), { v: C, l: r } = e.decode(2, B);
    if (r.length)
      throw new g("invalid signature: left bytes after parsing");
    return { r: I.decode(o), s: I.decode(C) };
  },
  hexFromSig(A) {
    const { _tlv: g, _int: I } = Qg, e = g.encode(2, I.encode(A.r)), t = g.encode(2, I.encode(A.s)), i = e + t;
    return g.encode(48, i);
  }
}, eg = BigInt(0), qg = BigInt(1), Yo = BigInt(2), kI = BigInt(3), Mr = BigInt(4);
function Kr(A, g = {}) {
  const I = Gr("weierstrass", A, g), { Fp: e, Fn: t } = I;
  let i = I.CURVE;
  const { h: n, n: o } = i;
  zt(g, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: B } = g;
  if (B && (!e.is0(i.a) || typeof B.beta != "bigint" || !Array.isArray(B.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const C = Mo(e, t);
  function r() {
    if (!e.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function E(U, N, S) {
    const { x: m, y: p } = N.toAffine(), Y = e.toBytes(m);
    if (LI(S, "isCompressed"), S) {
      r();
      const b = !e.isOdd(p);
      return kA(Po(b), Y);
    } else
      return kA(Uint8Array.of(4), Y, e.toBytes(p));
  }
  function Q(U) {
    oA(U, void 0, "Point");
    const { publicKey: N, publicKeyUncompressed: S } = C, m = U.length, p = U[0], Y = U.subarray(1);
    if (m === N && (p === 2 || p === 3)) {
      const b = e.fromBytes(Y);
      if (!e.isValid(b))
        throw new Error("bad point: is not on curve, wrong x");
      const x = d(b);
      let J;
      try {
        J = e.sqrt(x);
      } catch ($) {
        const tA = $ instanceof Error ? ": " + $.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + tA);
      }
      r();
      const T = e.isOdd(J);
      return (p & 1) === 1 !== T && (J = e.neg(J)), { x: b, y: J };
    } else if (m === S && p === 4) {
      const b = e.BYTES, x = e.fromBytes(Y.subarray(0, b)), J = e.fromBytes(Y.subarray(b, b * 2));
      if (!h(x, J))
        throw new Error("bad point: is not on curve");
      return { x, y: J };
    } else
      throw new Error(`bad point: got length ${m}, expected compressed=${N} or uncompressed=${S}`);
  }
  const a = g.toBytes || E, s = g.fromBytes || Q;
  function d(U) {
    const N = e.sqr(U), S = e.mul(N, U);
    return e.add(e.add(S, e.mul(U, i.a)), i.b);
  }
  function h(U, N) {
    const S = e.sqr(N), m = d(U);
    return e.eql(S, m);
  }
  if (!h(i.Gx, i.Gy))
    throw new Error("bad curve params: generator point");
  const u = e.mul(e.pow(i.a, kI), Mr), y = e.mul(e.sqr(i.b), BigInt(27));
  if (e.is0(e.add(u, y)))
    throw new Error("bad curve params: a or b");
  function l(U, N, S = !1) {
    if (!e.isValid(N) || S && e.is0(N))
      throw new Error(`bad point coordinate ${U}`);
    return N;
  }
  function D(U) {
    if (!(U instanceof w))
      throw new Error("Weierstrass Point expected");
  }
  function G(U) {
    if (!B || !B.basises)
      throw new Error("no endo");
    return Yr(U, B.basises, t.ORDER);
  }
  const f = Yi((U, N) => {
    const { X: S, Y: m, Z: p } = U;
    if (e.eql(p, e.ONE))
      return { x: S, y: m };
    const Y = U.is0();
    N == null && (N = Y ? e.ONE : e.inv(p));
    const b = e.mul(S, N), x = e.mul(m, N), J = e.mul(p, N);
    if (Y)
      return { x: e.ZERO, y: e.ZERO };
    if (!e.eql(J, e.ONE))
      throw new Error("invZ was invalid");
    return { x: b, y: x };
  }), R = Yi((U) => {
    if (U.is0()) {
      if (g.allowInfinityPoint && !e.is0(U.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: N, y: S } = U.toAffine();
    if (!e.isValid(N) || !e.isValid(S))
      throw new Error("bad point: x or y not field elements");
    if (!h(N, S))
      throw new Error("bad point: equation left != right");
    if (!U.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function H(U, N, S, m, p) {
    return S = new w(e.mul(S.X, U), S.Y, S.Z), N = OI(m, N), S = OI(p, S), N.add(S);
  }
  class w {
    // base / generator point
    static BASE = new w(i.Gx, i.Gy, e.ONE);
    // zero / infinity / identity point
    static ZERO = new w(e.ZERO, e.ONE, e.ZERO);
    // 0, 1, 0
    // math field
    static Fp = e;
    // scalar field
    static Fn = t;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(N, S, m) {
      this.X = l("x", N), this.Y = l("y", S, !0), this.Z = l("z", m), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(N) {
      const { x: S, y: m } = N || {};
      if (!N || !e.isValid(S) || !e.isValid(m))
        throw new Error("invalid affine point");
      if (N instanceof w)
        throw new Error("projective point not allowed");
      return e.is0(S) && e.is0(m) ? w.ZERO : new w(S, m, e.ONE);
    }
    static fromBytes(N) {
      const S = w.fromAffine(s(oA(N, void 0, "point")));
      return S.assertValidity(), S;
    }
    static fromHex(N) {
      return w.fromBytes(dA(N));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(N = 8, S = !0) {
      return M.createCache(this, N), S || this.multiply(kI), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      R(this);
    }
    hasEvenY() {
      const { y: N } = this.toAffine();
      if (!e.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !e.isOdd(N);
    }
    /** Compare one point to another. */
    equals(N) {
      D(N);
      const { X: S, Y: m, Z: p } = this, { X: Y, Y: b, Z: x } = N, J = e.eql(e.mul(S, x), e.mul(Y, p)), T = e.eql(e.mul(m, x), e.mul(b, p));
      return J && T;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new w(this.X, e.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: N, b: S } = i, m = e.mul(S, kI), { X: p, Y, Z: b } = this;
      let x = e.ZERO, J = e.ZERO, T = e.ZERO, O = e.mul(p, p), $ = e.mul(Y, Y), tA = e.mul(b, b), j = e.mul(p, Y);
      return j = e.add(j, j), T = e.mul(p, b), T = e.add(T, T), x = e.mul(N, T), J = e.mul(m, tA), J = e.add(x, J), x = e.sub($, J), J = e.add($, J), J = e.mul(x, J), x = e.mul(j, x), T = e.mul(m, T), tA = e.mul(N, tA), j = e.sub(O, tA), j = e.mul(N, j), j = e.add(j, T), T = e.add(O, O), O = e.add(T, O), O = e.add(O, tA), O = e.mul(O, j), J = e.add(J, O), tA = e.mul(Y, b), tA = e.add(tA, tA), O = e.mul(tA, j), x = e.sub(x, O), T = e.mul(tA, $), T = e.add(T, T), T = e.add(T, T), new w(x, J, T);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(N) {
      D(N);
      const { X: S, Y: m, Z: p } = this, { X: Y, Y: b, Z: x } = N;
      let J = e.ZERO, T = e.ZERO, O = e.ZERO;
      const $ = i.a, tA = e.mul(i.b, kI);
      let j = e.mul(S, Y), nA = e.mul(m, b), IA = e.mul(p, x), rA = e.add(S, m), AA = e.add(Y, b);
      rA = e.mul(rA, AA), AA = e.add(j, nA), rA = e.sub(rA, AA), AA = e.add(S, p);
      let CA = e.add(Y, x);
      return AA = e.mul(AA, CA), CA = e.add(j, IA), AA = e.sub(AA, CA), CA = e.add(m, p), J = e.add(b, x), CA = e.mul(CA, J), J = e.add(nA, IA), CA = e.sub(CA, J), O = e.mul($, AA), J = e.mul(tA, IA), O = e.add(J, O), J = e.sub(nA, O), O = e.add(nA, O), T = e.mul(J, O), nA = e.add(j, j), nA = e.add(nA, j), IA = e.mul($, IA), AA = e.mul(tA, AA), nA = e.add(nA, IA), IA = e.sub(j, IA), IA = e.mul($, IA), AA = e.add(AA, IA), j = e.mul(nA, AA), T = e.add(T, j), j = e.mul(CA, AA), J = e.mul(rA, J), J = e.sub(J, j), j = e.mul(rA, nA), O = e.mul(CA, O), O = e.add(O, j), new w(J, T, O);
    }
    subtract(N) {
      return this.add(N.negate());
    }
    is0() {
      return this.equals(w.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(N) {
      const { endo: S } = g;
      if (!t.isValidNot0(N))
        throw new Error("invalid scalar: out of range");
      let m, p;
      const Y = (b) => M.cached(this, b, (x) => Ki(w, x));
      if (S) {
        const { k1neg: b, k1: x, k2neg: J, k2: T } = G(N), { p: O, f: $ } = Y(x), { p: tA, f: j } = Y(T);
        p = $.add(j), m = H(S.beta, O, tA, b, J);
      } else {
        const { p: b, f: x } = Y(N);
        m = b, p = x;
      }
      return Ki(w, [m, p])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(N) {
      const { endo: S } = g, m = this;
      if (!t.isValid(N))
        throw new Error("invalid scalar: out of range");
      if (N === eg || m.is0())
        return w.ZERO;
      if (N === qg)
        return m;
      if (M.hasCache(this))
        return this.multiply(N);
      if (S) {
        const { k1neg: p, k1: Y, k2neg: b, k2: x } = G(N), { p1: J, p2: T } = Fr(w, m, Y, x);
        return H(S.beta, J, T, p, b);
      } else
        return M.unsafe(m, N);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(N) {
      return f(this, N);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: N } = g;
      return n === qg ? !0 : N ? N(w, this) : M.unsafe(this, o).is0();
    }
    clearCofactor() {
      const { clearCofactor: N } = g;
      return n === qg ? this : N ? N(w, this) : this.multiplyUnsafe(n);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(n).is0();
    }
    toBytes(N = !0) {
      return LI(N, "isCompressed"), this.assertValidity(), a(w, this, N);
    }
    toHex(N = !0) {
      return NA(this.toBytes(N));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const K = t.BITS, M = new Ur(w, g.endo ? Math.ceil(K / 2) : K);
  return w.BASE.precompute(8), w;
}
function Po(A) {
  return Uint8Array.of(A ? 2 : 3);
}
function Mo(A, g) {
  return {
    secretKey: g.BYTES,
    publicKey: 1 + A.BYTES,
    publicKeyUncompressed: 1 + 2 * A.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * g.BYTES
  };
}
function br(A, g = {}) {
  const { Fn: I } = A, e = g.randomBytes || hI, t = Object.assign(Mo(A.Fp, I), { seed: mo(I.ORDER) });
  function i(a) {
    try {
      const s = I.fromBytes(a);
      return I.isValidNot0(s);
    } catch {
      return !1;
    }
  }
  function n(a, s) {
    const { publicKey: d, publicKeyUncompressed: h } = t;
    try {
      const u = a.length;
      return s === !0 && u !== d || s === !1 && u !== h ? !1 : !!A.fromBytes(a);
    } catch {
      return !1;
    }
  }
  function o(a = e(t.seed)) {
    return Ho(oA(a, t.seed, "seed"), I.ORDER);
  }
  function B(a, s = !0) {
    return A.BASE.multiply(I.fromBytes(a)).toBytes(s);
  }
  function C(a) {
    const { secretKey: s, publicKey: d, publicKeyUncompressed: h } = t;
    if (!Ot(a) || "_lengths" in I && I._lengths || s === d)
      return;
    const u = oA(a, void 0, "key").length;
    return u === d || u === h;
  }
  function r(a, s, d = !0) {
    if (C(a) === !0)
      throw new Error("first arg must be private key");
    if (C(s) === !1)
      throw new Error("second arg must be public key");
    const h = I.fromBytes(a);
    return A.fromBytes(s).multiply(h).toBytes(d);
  }
  const E = {
    isValidSecretKey: i,
    isValidPublicKey: n,
    randomSecretKey: o
  }, Q = Fo(o, B);
  return Object.freeze({ getPublicKey: B, getSharedSecret: r, keygen: Q, Point: A, utils: E, lengths: t });
}
function qr(A, g, I = {}) {
  te(g), zt(I, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), I = Object.assign({}, I);
  const e = I.randomBytes || hI, t = I.hmac || ((S, m) => vg(g, S, m)), { Fp: i, Fn: n } = A, { ORDER: o, BITS: B } = n, { keygen: C, getPublicKey: r, getSharedSecret: E, utils: Q, lengths: a } = br(A, I), s = {
    prehash: !0,
    lowS: typeof I.lowS == "boolean" ? I.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = o * Yo < i.ORDER;
  function h(S) {
    const m = o >> qg;
    return S > m;
  }
  function u(S, m) {
    if (!n.isValidNot0(m))
      throw new Error(`invalid signature ${S}: out of range 1..Point.Fn.ORDER`);
    return m;
  }
  function y() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function l(S, m) {
    Et(m);
    const p = a.signature, Y = m === "compact" ? p : m === "recovered" ? p + 1 : void 0;
    return oA(S, Y);
  }
  class D {
    r;
    s;
    recovery;
    constructor(m, p, Y) {
      if (this.r = u("r", m), this.s = u("s", p), Y != null) {
        if (y(), ![0, 1, 2, 3].includes(Y))
          throw new Error("invalid recovery id");
        this.recovery = Y;
      }
      Object.freeze(this);
    }
    static fromBytes(m, p = s.format) {
      l(m, p);
      let Y;
      if (p === "der") {
        const { r: T, s: O } = Qg.toSig(oA(m));
        return new D(T, O);
      }
      p === "recovered" && (Y = m[0], p = "compact", m = m.subarray(1));
      const b = a.signature / 2, x = m.subarray(0, b), J = m.subarray(b, b * 2);
      return new D(n.fromBytes(x), n.fromBytes(J), Y);
    }
    static fromHex(m, p) {
      return this.fromBytes(dA(m), p);
    }
    assertRecovery() {
      const { recovery: m } = this;
      if (m == null)
        throw new Error("invalid recovery id: must be present");
      return m;
    }
    addRecoveryBit(m) {
      return new D(this.r, this.s, m);
    }
    recoverPublicKey(m) {
      const { r: p, s: Y } = this, b = this.assertRecovery(), x = b === 2 || b === 3 ? p + o : p;
      if (!i.isValid(x))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const J = i.toBytes(x), T = A.fromBytes(kA(Po((b & 1) === 0), J)), O = n.inv(x), $ = f(oA(m, void 0, "msgHash")), tA = n.create(-$ * O), j = n.create(Y * O), nA = A.BASE.multiplyUnsafe(tA).add(T.multiplyUnsafe(j));
      if (nA.is0())
        throw new Error("invalid recovery: point at infinify");
      return nA.assertValidity(), nA;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return h(this.s);
    }
    toBytes(m = s.format) {
      if (Et(m), m === "der")
        return dA(Qg.hexFromSig(this));
      const { r: p, s: Y } = this, b = n.toBytes(p), x = n.toBytes(Y);
      return m === "recovered" ? (y(), kA(Uint8Array.of(this.assertRecovery()), b, x)) : kA(b, x);
    }
    toHex(m) {
      return NA(this.toBytes(m));
    }
  }
  const G = I.bits2int || function(m) {
    if (m.length > 8192)
      throw new Error("input is too large");
    const p = dI(m), Y = m.length * 8 - B;
    return Y > 0 ? p >> BigInt(Y) : p;
  }, f = I.bits2int_modN || function(m) {
    return n.create(G(m));
  }, R = Zt(B);
  function H(S) {
    return dr("num < 2^" + B, S, eg, R), n.toBytes(S);
  }
  function w(S, m) {
    return oA(S, void 0, "message"), m ? oA(g(S), void 0, "prehashed message") : S;
  }
  function K(S, m, p) {
    const { lowS: Y, prehash: b, extraEntropy: x } = Re(p, s);
    S = w(S, b);
    const J = f(S), T = n.fromBytes(m);
    if (!n.isValidNot0(T))
      throw new Error("invalid private key");
    const O = [H(T), H(J)];
    if (x != null && x !== !1) {
      const nA = x === !0 ? e(a.secretKey) : x;
      O.push(oA(nA, void 0, "extraEntropy"));
    }
    const $ = kA(...O), tA = J;
    function j(nA) {
      const IA = G(nA);
      if (!n.isValidNot0(IA))
        return;
      const rA = n.inv(IA), AA = A.BASE.multiply(IA).toAffine(), CA = n.create(AA.x);
      if (CA === eg)
        return;
      const dg = n.create(rA * n.create(tA + CA * T));
      if (dg === eg)
        return;
      let L = (AA.x === CA ? 0 : 2) | Number(AA.y & qg), v = dg;
      return Y && h(dg) && (v = n.neg(dg), L ^= 1), new D(CA, v, d ? void 0 : L);
    }
    return { seed: $, k2sig: j };
  }
  function M(S, m, p = {}) {
    const { seed: Y, k2sig: b } = K(S, m, p);
    return yr(g.outputLen, n.BYTES, t)(Y, b).toBytes(p.format);
  }
  function U(S, m, p, Y = {}) {
    const { lowS: b, prehash: x, format: J } = Re(Y, s);
    if (p = oA(p, void 0, "publicKey"), m = w(m, x), !Ot(S)) {
      const T = S instanceof D ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + T);
    }
    l(S, J);
    try {
      const T = D.fromBytes(S, J), O = A.fromBytes(p);
      if (b && T.hasHighS())
        return !1;
      const { r: $, s: tA } = T, j = f(m), nA = n.inv(tA), IA = n.create(j * nA), rA = n.create($ * nA), AA = A.BASE.multiplyUnsafe(IA).add(O.multiplyUnsafe(rA));
      return AA.is0() ? !1 : n.create(AA.x) === $;
    } catch {
      return !1;
    }
  }
  function N(S, m, p = {}) {
    const { prehash: Y } = Re(p, s);
    return m = w(m, Y), D.fromBytes(S, "recovered").recoverPublicKey(m).toBytes();
  }
  return Object.freeze({
    keygen: C,
    getPublicKey: r,
    getSharedSecret: E,
    utils: Q,
    lengths: a,
    Point: A,
    sign: M,
    verify: U,
    recoverPublicKey: N,
    Signature: D,
    hash: g
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ne = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Jr = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, xr = /* @__PURE__ */ BigInt(0), at = /* @__PURE__ */ BigInt(2);
function Tr(A) {
  const g = ne.p, I = BigInt(3), e = BigInt(6), t = BigInt(11), i = BigInt(22), n = BigInt(23), o = BigInt(44), B = BigInt(88), C = A * A * A % g, r = C * C * A % g, E = JA(r, I, g) * r % g, Q = JA(E, I, g) * r % g, a = JA(Q, at, g) * C % g, s = JA(a, t, g) * a % g, d = JA(s, i, g) * s % g, h = JA(d, o, g) * d % g, u = JA(h, B, g) * h % g, y = JA(u, o, g) * d % g, l = JA(y, I, g) * r % g, D = JA(l, n, g) * s % g, G = JA(D, e, g) * C % g, f = JA(G, at, g);
  if (!vI.eql(vI.sqr(f), A))
    throw new Error("Cannot find square root");
  return f;
}
const vI = ie(ne.p, { sqrt: Tr }), Ng = /* @__PURE__ */ Kr(ne, {
  Fp: vI,
  endo: Jr
}), Ko = /* @__PURE__ */ qr(Ng, LA), Ti = {};
function VI(A, ...g) {
  let I = Ti[A];
  if (I === void 0) {
    const e = LA(ur(A));
    I = kA(e, e), Ti[A] = I;
  }
  return LA(kA(I, ...g));
}
const jt = (A) => A.toBytes(!0).slice(1), Wt = (A) => A % at === xr;
function st(A) {
  const { Fn: g, BASE: I } = Ng, e = g.fromBytes(A), t = I.multiply(e);
  return { scalar: Wt(t.y) ? e : g.neg(e), bytes: jt(t) };
}
function bo(A) {
  const g = vI;
  if (!g.isValidNot0(A))
    throw new Error("invalid x: Fail if x ≥ p");
  const I = g.create(A * A), e = g.create(I * A + BigInt(7));
  let t = g.sqrt(e);
  Wt(t) || (t = g.neg(t));
  const i = Ng.fromAffine({ x: A, y: t });
  return i.assertValidity(), i;
}
const gI = dI;
function qo(...A) {
  return Ng.Fn.create(gI(VI("BIP0340/challenge", ...A)));
}
function Li(A) {
  return st(A).bytes;
}
function Lr(A, g, I = hI(32)) {
  const { Fn: e } = Ng, t = oA(A, void 0, "message"), { bytes: i, scalar: n } = st(g), o = oA(I, 32, "auxRand"), B = e.toBytes(n ^ gI(VI("BIP0340/aux", o))), C = VI("BIP0340/nonce", B, i, t), { bytes: r, scalar: E } = st(C), Q = qo(r, i, t), a = new Uint8Array(64);
  if (a.set(r, 0), a.set(e.toBytes(e.create(E + Q * n)), 32), !Jo(a, t, i))
    throw new Error("sign: Invalid signature produced");
  return a;
}
function Jo(A, g, I) {
  const { Fp: e, Fn: t, BASE: i } = Ng, n = oA(A, 64, "signature"), o = oA(g, void 0, "message"), B = oA(I, 32, "publicKey");
  try {
    const C = bo(gI(B)), r = gI(n.subarray(0, 32));
    if (!e.isValidNot0(r))
      return !1;
    const E = gI(n.subarray(32, 64));
    if (!t.isValidNot0(E))
      return !1;
    const Q = qo(t.toBytes(r), jt(C), o), a = i.multiplyUnsafe(E).add(C.multiplyUnsafe(t.neg(Q))), { x: s, y: d } = a.toAffine();
    return !(a.is0() || !Wt(d) || s !== r);
  } catch {
    return !1;
  }
}
const wA = /* @__PURE__ */ (() => {
  const I = (e = hI(48)) => Ho(e, ne.n);
  return {
    keygen: Fo(I, Li),
    getPublicKey: Li,
    sign: Lr,
    verify: Jo,
    Point: Ng,
    utils: {
      randomSecretKey: I,
      taggedHash: VI,
      lift_x: bo,
      pointToBytes: jt
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})();
new TextDecoder("utf-8");
var Or = new TextEncoder();
function Gg(A) {
  try {
    A.indexOf("://") === -1 && (A = "wss://" + A);
    let g = new URL(A);
    return g.protocol === "http:" ? g.protocol = "ws:" : g.protocol === "https:" && (g.protocol = "wss:"), g.pathname = g.pathname.replace(/\/+/g, "/"), g.pathname.endsWith("/") && (g.pathname = g.pathname.slice(0, -1)), (g.port === "80" && g.protocol === "ws:" || g.port === "443" && g.protocol === "wss:") && (g.port = ""), g.searchParams.sort(), g.hash = "", g.toString();
  } catch {
    throw new Error(`Invalid URL: ${A}`);
  }
}
function vr(A) {
  if (A.length !== 64)
    return !1;
  for (let g = 0; g < 64; g++) {
    let I = A.charCodeAt(g);
    if (isNaN(I) || I < 48 || I > 102 || I > 57 && I < 97)
      return !1;
  }
  return !0;
}
var mg = Symbol("verified"), Vr = (A) => A instanceof Object;
function Zr(A) {
  if (!Vr(A) || typeof A.kind != "number" || typeof A.content != "string" || typeof A.created_at != "number" || typeof A.pubkey != "string" || !vr(A.pubkey) || !Array.isArray(A.tags))
    return !1;
  for (let g = 0; g < A.tags.length; g++) {
    let I = A.tags[g];
    if (!Array.isArray(I))
      return !1;
    for (let e = 0; e < I.length; e++)
      if (typeof I[e] != "string")
        return !1;
  }
  return !0;
}
var zr = class {
  generateSecretKey() {
    return wA.utils.randomSecretKey();
  }
  getPublicKey(g) {
    return NA(wA.getPublicKey(g));
  }
  finalizeEvent(g, I) {
    const e = g;
    return e.pubkey = NA(wA.getPublicKey(I)), e.id = Ue(e), e.sig = NA(wA.sign(dA(Ue(e)), I)), e[mg] = !0, e;
  }
  verifyEvent(g) {
    if (typeof g[mg] == "boolean")
      return g[mg];
    try {
      const I = Ue(g);
      if (I !== g.id)
        return g[mg] = !1, !1;
      const e = wA.verify(dA(g.sig), dA(I), dA(g.pubkey));
      return g[mg] = e, e;
    } catch {
      return g[mg] = !1, !1;
    }
  }
};
function Xr(A) {
  if (!Zr(A))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([0, A.pubkey, A.created_at, A.kind, A.tags, A.content]);
}
function Ue(A) {
  let g = LA(Or.encode(Xr(A)));
  return NA(g);
}
var oe = new zr();
oe.generateSecretKey;
oe.getPublicKey;
oe.finalizeEvent;
var jr = oe.verifyEvent, Wr = 22242;
function _r(A, g) {
  if (A.ids && A.ids.indexOf(g.id) === -1 || A.kinds && A.kinds.indexOf(g.kind) === -1 || A.authors && A.authors.indexOf(g.pubkey) === -1)
    return !1;
  for (let I in A)
    if (I[0] === "#") {
      let e = I.slice(1), t = A[`#${e}`];
      if (t && !g.tags.find(([i, n]) => i === I.slice(1) && t.indexOf(n) !== -1))
        return !1;
    }
  return !(A.since && g.created_at < A.since || A.until && g.created_at > A.until);
}
function $r(A, g) {
  for (let I = 0; I < A.length; I++)
    if (_r(A[I], g))
      return !0;
  return !1;
}
function AE(A, g) {
  let I = g.length + 3, e = A.indexOf(`"${g}":`) + I, t = A.slice(e).indexOf('"') + e + 1;
  return A.slice(t, t + 64);
}
function gE(A) {
  let g = A.slice(0, 22).indexOf('"EVENT"');
  if (g === -1)
    return null;
  let I = A.slice(g + 7 + 1).indexOf('"');
  if (I === -1)
    return null;
  let e = g + 7 + 1 + I, t = A.slice(e + 1, 80).indexOf('"');
  if (t === -1)
    return null;
  let i = e + 1 + t;
  return A.slice(e + 1, i);
}
function IE(A, g) {
  return {
    kind: Wr,
    created_at: Math.floor(Date.now() / 1e3),
    tags: [
      ["relay", A],
      ["challenge", g]
    ],
    content: ""
  };
}
var Qt = class extends Error {
  constructor(A, g) {
    super(`Tried to send message '${A} on a closed connection to ${g}.`), this.name = "SendingOnClosedConnection";
  }
}, xo = class {
  url;
  _connected = !1;
  onclose = null;
  onnotice = (A) => console.debug(`NOTICE from ${this.url}: ${A}`);
  onauth;
  baseEoseTimeout = 4400;
  publishTimeout = 4400;
  pingFrequency = 29e3;
  pingTimeout = 2e4;
  resubscribeBackoff = [1e4, 1e4, 1e4, 2e4, 2e4, 3e4, 6e4];
  openSubs = /* @__PURE__ */ new Map();
  enablePing;
  enableReconnect;
  idleTimeout = 0;
  idleSince = Date.now();
  ongoingOperations = 0;
  reconnectTimeoutHandle;
  pingIntervalHandle;
  reconnectAttempts = 0;
  skipReconnection = !1;
  idleTimeoutHandle;
  connectionPromise;
  openCountRequests = /* @__PURE__ */ new Map();
  openEventPublishes = /* @__PURE__ */ new Map();
  ws;
  challenge;
  authPromise;
  serial = 0;
  verifyEvent;
  _WebSocket;
  constructor(A, g) {
    this.url = Gg(A), this.verifyEvent = g.verifyEvent, this._WebSocket = g.websocketImplementation || WebSocket, this.enablePing = g.enablePing, this.enableReconnect = g.enableReconnect || !1, g.idleTimeout && (this.idleTimeout = g.idleTimeout);
  }
  static async connect(A, g) {
    const I = new xo(A, g);
    return await I.connect(g), I;
  }
  closeAllSubscriptions(A) {
    for (let [g, I] of this.openSubs)
      I.close(A);
    this.openSubs.clear();
    for (let [g, I] of this.openEventPublishes)
      I.reject(new Error(A));
    this.openEventPublishes.clear();
    for (let [g, I] of this.openCountRequests)
      I.reject(new Error(A));
    this.openCountRequests.clear();
  }
  get connected() {
    return this._connected;
  }
  clearIdleTimeout() {
    this.idleTimeoutHandle && (clearTimeout(this.idleTimeoutHandle), this.idleTimeoutHandle = void 0);
  }
  scheduleIdleClose() {
    this.clearIdleTimeout(), this.idleTimeout > 0 && (this.idleTimeoutHandle = setTimeout(() => {
      this.ongoingOperations === 0 && this.idleSince && this.close();
    }, this.idleTimeout));
  }
  async reconnect() {
    const A = this.resubscribeBackoff[Math.min(this.reconnectAttempts, this.resubscribeBackoff.length - 1)];
    this.reconnectAttempts++, this.reconnectTimeoutHandle = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
      }
    }, A);
  }
  handleHardClose(A) {
    this.ws && (this.ws.onopen = null, this.ws.onerror = null, this.ws.onclose = null), this.pingIntervalHandle && (clearInterval(this.pingIntervalHandle), this.pingIntervalHandle = void 0), this._connected = !1, this.connectionPromise = void 0, this.idleSince = void 0, this.clearIdleTimeout(), this.enableReconnect && !this.skipReconnection ? this.reconnect() : (this.onclose?.(), this.closeAllSubscriptions(A));
  }
  async connect(A) {
    let g;
    return this.connectionPromise ? this.connectionPromise : (this.challenge = void 0, this.authPromise = void 0, this.skipReconnection = !1, this.connectionPromise = new Promise((I, e) => {
      A?.timeout && (g = setTimeout(() => {
        e("connection timed out"), this.connectionPromise = void 0, this.reconnectAttempts === 0 && (this.skipReconnection = !0), this.ws?.close?.(), this.handleHardClose("relay connection timed out");
      }, A.timeout)), A?.abort && (A.abort.onabort = e);
      try {
        this.ws = new this._WebSocket(this.url);
      } catch (t) {
        clearTimeout(g), e(t);
        return;
      }
      this.ws.onopen = () => {
        this.reconnectTimeoutHandle && (clearTimeout(this.reconnectTimeoutHandle), this.reconnectTimeoutHandle = void 0), clearTimeout(g), this._connected = !0;
        const t = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        for (const i of this.openSubs.values()) {
          i.eosed = !1;
          const n = t ? i.lastEmitted : void 0;
          let o;
          if (n !== void 0) {
            o = i.filters.map((C) => C.since), i.filters = i.filters.map((C) => ({ ...C }));
            const B = Math.min(Math.floor(Date.now() / 1e3), n);
            for (const C of i.filters)
              C.since = B;
          }
          if (i.fire(), o)
            for (let B = 0; B < i.filters.length; B++) {
              const C = o[B];
              C === void 0 ? delete i.filters[B].since : i.filters[B].since = C;
            }
        }
        this.enablePing && (this.pingIntervalHandle = setInterval(() => this.pingpong(), this.pingFrequency)), I();
      }, this.ws.onerror = () => {
        clearTimeout(g), e("connection failed"), this.connectionPromise = void 0, this.reconnectAttempts === 0 && (this.skipReconnection = !0), this.ws?.close?.(), this.handleHardClose("relay connection failed");
      }, this.ws.onclose = (t) => {
        clearTimeout(g), e(t.message || "websocket closed"), this.handleHardClose("relay connection closed");
      }, this.ws.onmessage = this._onmessage.bind(this);
    }), this.connectionPromise);
  }
  waitForPingPong() {
    return new Promise((A) => {
      this.ws.once("pong", () => A(!0)), this.ws.ping();
    });
  }
  waitForDummyReq() {
    return new Promise((A, g) => {
      if (!this.connectionPromise)
        return g(new Error(`no connection to ${this.url}, can't ping`));
      try {
        const I = this.subscribe(
          [{ ids: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"], limit: 1 }],
          {
            label: "<forced-ping>",
            oneose: () => {
              A(!0), I.close();
            },
            onclose() {
              A(!0);
            },
            eoseTimeout: this.pingTimeout + 1e3
          }
        );
      } catch (I) {
        g(I);
      }
    });
  }
  async pingpong() {
    this.ws?.readyState === 1 && (await Promise.any([
      this.ws && this.ws.ping && this.ws.once ? this.waitForPingPong() : this.waitForDummyReq(),
      new Promise((g) => setTimeout(() => g(!1), this.pingTimeout))
    ]) || this.ws?.readyState === this._WebSocket.OPEN && this.ws?.close());
  }
  async send(A) {
    if (!this.connectionPromise)
      throw new Qt(A, this.url);
    this.connectionPromise.then(() => {
      this.ws?.send(A);
    });
  }
  async auth(A) {
    const g = this.challenge;
    if (!g)
      throw new Error("can't perform auth, no challenge was received");
    if (this.authPromise)
      return this.authPromise;
    const I = new Promise(async (e, t) => {
      try {
        let i = await A(IE(this.url, g)), n = setTimeout(() => {
          let o = this.openEventPublishes.get(i.id);
          o && (o.reject(new Error("auth timed out")), this.openEventPublishes.delete(i.id));
        }, this.publishTimeout);
        this.openEventPublishes.set(i.id, { resolve: e, reject: t, timeout: n }), this.send('["AUTH",' + JSON.stringify(i) + "]");
      } catch (i) {
        t(i);
      }
    });
    return I.catch(() => {
      this.authPromise === I && (this.authPromise = void 0);
    }), this.authPromise = I, I;
  }
  async publish(A) {
    this.idleSince = void 0, this.clearIdleTimeout(), this.ongoingOperations++;
    const g = new Promise((I, e) => {
      const t = setTimeout(() => {
        const i = this.openEventPublishes.get(A.id);
        i && (i.reject(new Error("publish timed out")), this.openEventPublishes.delete(A.id));
      }, this.publishTimeout);
      this.openEventPublishes.set(A.id, { resolve: I, reject: e, timeout: t });
    });
    try {
      await this.send('["EVENT",' + JSON.stringify(A) + "]");
    } catch (I) {
      const e = this.openEventPublishes.get(A.id);
      e && (e.reject(I), this.openEventPublishes.delete(A.id));
    }
    return this.ongoingOperations--, this.ongoingOperations === 0 && (this.idleSince = Date.now(), this.scheduleIdleClose()), g;
  }
  async count(A, g) {
    return (await this.countWithHLL(A, g)).count;
  }
  async countWithHLL(A, g) {
    this.serial++;
    const I = g?.id || "count:" + this.serial, e = new Promise((t, i) => {
      this.openCountRequests.set(I, { resolve: t, reject: i });
    });
    try {
      await this.send('["COUNT","' + I + '",' + JSON.stringify(A).substring(1));
    } catch (t) {
      const i = this.openCountRequests.get(I);
      i && (i.reject(t), this.openCountRequests.delete(I));
    }
    return e;
  }
  subscribe(A, g) {
    g.label !== "<forced-ping>" && (this.idleSince = void 0, this.clearIdleTimeout(), this.ongoingOperations++);
    const I = this.prepareSubscription(A, g);
    return I.fire(), g.abort && (g.abort.onabort = () => I.close(String(g.abort.reason || "<aborted>"))), I;
  }
  prepareSubscription(A, g) {
    this.serial++;
    const I = g.id || (g.label ? g.label + ":" : "sub:") + this.serial, e = new eE(this, I, A, g);
    return this.openSubs.set(I, e), e;
  }
  close() {
    this.skipReconnection = !0, this.reconnectTimeoutHandle && (clearTimeout(this.reconnectTimeoutHandle), this.reconnectTimeoutHandle = void 0), this.pingIntervalHandle && (clearInterval(this.pingIntervalHandle), this.pingIntervalHandle = void 0), this.closeAllSubscriptions("relay connection closed by us"), this._connected = !1, this.connectionPromise = void 0, this.idleSince = void 0, this.clearIdleTimeout(), this.onclose?.(), this.ws && (this.ws.onopen = null, this.ws.onerror = null, this.ws.onclose = null, this.ws.readyState !== this._WebSocket.CLOSING && this.ws.readyState !== this._WebSocket.CLOSED && this.ws.close());
  }
  _onmessage(A) {
    const g = A.data;
    if (!g)
      return;
    const I = gE(g);
    if (I) {
      const e = this.openSubs.get(I);
      if (!e)
        return;
      const t = AE(g, "id"), i = e.alreadyHaveEvent?.(t);
      if (e.receivedEvent?.(this, t), i)
        return;
    }
    try {
      let e = JSON.parse(g);
      switch (e[0]) {
        case "EVENT": {
          const t = this.openSubs.get(e[1]), i = e[2];
          $r(t.filters, i) && this.verifyEvent(i, this.url) ? ((!t.lastEmitted || t.lastEmitted < i.created_at) && (t.lastEmitted = i.created_at), t.onevent(i)) : t.oninvalidevent?.(i);
          return;
        }
        case "COUNT": {
          const t = e[1], i = e[2], n = this.openCountRequests.get(t);
          n && (n.resolve(i), this.openCountRequests.delete(t));
          return;
        }
        case "EOSE": {
          const t = this.openSubs.get(e[1]);
          if (!t)
            return;
          t.receivedEose();
          return;
        }
        case "OK": {
          const t = e[1], i = e[2], n = e[3], o = this.openEventPublishes.get(t);
          o && (clearTimeout(o.timeout), i ? o.resolve(n) : o.reject(new Error(n)), this.openEventPublishes.delete(t));
          return;
        }
        case "CLOSED": {
          const t = e[1], i = this.openSubs.get(t);
          if (!i) {
            const n = this.openCountRequests.get(t);
            n && (n.reject(new Error(e[2])), this.openCountRequests.delete(t));
            return;
          }
          i.closed = !0, i.close(e[2]);
          return;
        }
        case "NOTICE": {
          this.onnotice(e[1]);
          return;
        }
        case "AUTH": {
          this.challenge = e[1], this.onauth && this.auth(this.onauth).catch((t) => {
            t instanceof Qt || console.warn("automatic auth failed:", t);
          });
          return;
        }
        default: {
          this.openSubs.get(e[1])?.oncustom?.(e);
          return;
        }
      }
    } catch (e) {
      try {
        const [t, i, n] = JSON.parse(g);
        console.warn(`[nostr] relay ${this.url} error processing message:`, e, n);
      } catch {
        console.warn(`[nostr] relay ${this.url} error processing message:`, e);
      }
      return;
    }
  }
}, eE = class {
  relay;
  id;
  lastEmitted;
  closed = !1;
  eosed = !1;
  filters;
  alreadyHaveEvent;
  receivedEvent;
  onevent;
  oninvalidevent;
  oneose;
  onclose;
  oncustom;
  eoseTimeout;
  eoseTimeoutHandle;
  constructor(A, g, I, e) {
    if (I.length === 0)
      throw new Error("subscription can't be created with zero filters");
    this.relay = A, this.filters = I, this.id = g, this.alreadyHaveEvent = e.alreadyHaveEvent, this.receivedEvent = e.receivedEvent, this.eoseTimeout = e.eoseTimeout || A.baseEoseTimeout, this.oneose = e.oneose, this.onclose = e.onclose, this.oninvalidevent = e.oninvalidevent, this.onevent = e.onevent || ((t) => {
      console.warn(
        `onevent() callback not defined for subscription '${this.id}' in relay ${this.relay.url}. event received:`,
        t
      );
    });
  }
  fire() {
    this.relay.send('["REQ","' + this.id + '",' + JSON.stringify(this.filters).substring(1)), this.eoseTimeoutHandle = setTimeout(this.receivedEose.bind(this), this.eoseTimeout);
  }
  receivedEose() {
    this.eosed || (clearTimeout(this.eoseTimeoutHandle), this.eosed = !0, this.oneose?.());
  }
  close(A = "closed by caller") {
    if (!this.closed && this.relay.connected) {
      try {
        this.relay.send('["CLOSE",' + JSON.stringify(this.id) + "]");
      } catch (g) {
        if (!(g instanceof Qt)) throw g;
      }
      this.closed = !0;
    }
    this.relay.openSubs.delete(this.id), this.id.startsWith("<forced-ping>") || (this.relay.ongoingOperations--, this.relay.ongoingOperations === 0 && (this.relay.idleSince = Date.now(), this.relay.scheduleIdleClose())), this.onclose?.(A);
  }
}, tg = 256, tE = tg * 2;
new TextEncoder();
function iE(A, g) {
  switch (g) {
    case "reactions":
      return { "#e": [A], kinds: [7] };
    case "reposts":
      return { "#e": [A], kinds: [6] };
    case "quotes":
      return { "#q": [A], kinds: [1, 1111] };
    case "replies":
      return { "#e": [A], kinds: [1] };
    case "comments":
      return { "#E": [A], kinds: [1111] };
    case "followers":
      return { "#p": [A], kinds: [3] };
  }
}
function nE() {
  return new Uint8Array(tg);
}
function oE(A) {
  if (A.length !== tE || !/^[0-9a-f]+$/.test(A))
    return;
  const g = new Uint8Array(tg);
  for (let I = 0; I < tg; I++)
    g[I] = parseInt(A.slice(I * 2, I * 2 + 2), 16);
  return g;
}
function BE(A) {
  if (A.length !== tg)
    throw new Error(`invalid number of registers ${A.length}`);
  let g = "";
  for (let I = 0; I < tg; I++)
    g += A[I].toString(16).padStart(2, "0");
  return g;
}
function CE(A, g) {
  if (A.length === 0 && (A = nE()), A.length !== tg)
    throw new Error(`invalid number of registers ${A.length}`);
  if (g.length !== tg)
    throw new Error(`invalid number of registers ${g.length}`);
  for (let I = 0; I < tg; I++)
    g[I] > A[I] && (A[I] = g[I]);
  return A;
}
var rE = class {
  relays = /* @__PURE__ */ new Map();
  seenOn = /* @__PURE__ */ new Map();
  trackRelays = !1;
  verifyEvent;
  enablePing;
  enableReconnect;
  idleTimeout = 2e4;
  automaticallyAuth;
  onRelayConnectionFailure;
  onRelayConnectionSuccess;
  allowConnectingToRelay;
  maxWaitForConnection;
  _WebSocket;
  constructor(A) {
    this.verifyEvent = A.verifyEvent, this._WebSocket = A.websocketImplementation, this.enablePing = A.enablePing, this.enableReconnect = A.enableReconnect || !1, A.idleTimeout && (this.idleTimeout = A.idleTimeout), this.automaticallyAuth = A.automaticallyAuth, this.onRelayConnectionFailure = A.onRelayConnectionFailure, this.onRelayConnectionSuccess = A.onRelayConnectionSuccess, this.allowConnectingToRelay = A.allowConnectingToRelay, this.maxWaitForConnection = A.maxWaitForConnection || 3e3;
  }
  async ensureRelay(A, g) {
    A = Gg(A);
    let I = this.relays.get(A);
    if (I || (I = new xo(A, {
      verifyEvent: this.verifyEvent,
      websocketImplementation: this._WebSocket,
      enablePing: this.enablePing,
      enableReconnect: this.enableReconnect,
      idleTimeout: this.idleTimeout
    }), I.onclose = () => {
      this.relays.delete(A);
    }, this.relays.set(A, I)), this.automaticallyAuth) {
      const e = this.automaticallyAuth(A);
      e && (I.onauth = e);
    }
    try {
      await I.connect({
        timeout: g?.connectionTimeout,
        abort: g?.abort
      });
    } catch (e) {
      throw this.relays.delete(A), e;
    }
    return I;
  }
  close(A) {
    A.map(Gg).forEach((g) => {
      this.relays.get(g)?.close(), this.relays.delete(g);
    });
  }
  subscribe(A, g, I) {
    const e = [], t = [];
    for (let i = 0; i < A.length; i++) {
      const n = Gg(A[i]);
      e.find((o) => o.url === n) || t.indexOf(n) === -1 && (t.push(n), e.push({ url: n, filter: g }));
    }
    return this.subscribeMap(e, I);
  }
  subscribeMany(A, g, I) {
    return this.subscribe(A, g, I);
  }
  subscribeMap(A, g) {
    const I = /* @__PURE__ */ new Map();
    for (const a of A) {
      const { url: s, filter: d } = a;
      I.has(s) || I.set(s, []), I.get(s).push(d);
    }
    const e = Array.from(I.entries()).map(([a, s]) => ({ url: a, filters: s }));
    this.trackRelays && (g.receivedEvent = (a, s) => {
      let d = this.seenOn.get(s);
      d || (d = /* @__PURE__ */ new Set(), this.seenOn.set(s, d)), d.add(a);
    });
    const t = /* @__PURE__ */ new Set(), i = [], n = [];
    let o = (a) => {
      n[a] || (n[a] = !0, n.filter((s) => s).length === e.length && (g.oneose?.(), o = () => {
      }));
    };
    const B = [];
    let C = (a, s, d) => {
      B[a] || (o(a), B[a] = { url: s, reason: d }, B.filter((h) => h).length === e.length && (g.onclose?.(B), C = () => {
      }));
    };
    const r = (a) => g.alreadyHaveEvent?.(a) ? !0 : t.has(a), E = function(a) {
      t.add(a.id), g.onevent?.call(this, a);
    }, Q = Promise.all(
      e.map(async ({ url: a, filters: s }, d) => {
        if (this.allowConnectingToRelay?.(a, ["read", s]) === !1) {
          C(d, a, "connection skipped by allowConnectingToRelay");
          return;
        }
        let h;
        try {
          h = await this.ensureRelay(a, {
            connectionTimeout: this.maxWaitForConnection < (g.maxWait || 0) ? Math.max(g.maxWait * 0.8, g.maxWait - 1e3) : this.maxWaitForConnection,
            abort: g.abort
          });
        } catch (y) {
          this.onRelayConnectionFailure?.(a), C(d, a, y?.message || String(y));
          return;
        }
        this.onRelayConnectionSuccess?.(a);
        let u = h.subscribe(s, {
          ...g,
          oneose: () => o(d),
          onclose: (y) => {
            y.startsWith("auth-required: ") && g.onauth ? h.auth(g.onauth).then(() => {
              h.subscribe(s, {
                ...g,
                oneose: () => o(d),
                onclose: (l) => {
                  C(d, a, l);
                },
                onevent: g.onevent && E,
                alreadyHaveEvent: r,
                eoseTimeout: g.maxWait,
                abort: g.abort
              });
            }).catch((l) => {
              C(d, a, `auth was required and attempted, but failed with: ${l}`);
            }) : C(d, a, y);
          },
          onevent: g.onevent && E,
          alreadyHaveEvent: r,
          eoseTimeout: g.maxWait,
          abort: g.abort
        });
        i.push(u);
      })
    );
    return {
      async close(a) {
        await Q, i.forEach((s) => {
          s.close(a);
        });
      }
    };
  }
  subscribeEose(A, g, I) {
    let e;
    return e = this.subscribe(A, g, {
      ...I,
      oneose() {
        const t = "closed automatically on eose";
        e ? e.close(t) : I.onclose?.(A.map((i) => ({ url: i, reason: t })));
      }
    }), e;
  }
  subscribeManyEose(A, g, I) {
    return this.subscribeEose(A, g, I);
  }
  async querySync(A, g, I) {
    return new Promise(async (e) => {
      const t = [];
      this.subscribeEose(A, g, {
        ...I,
        onevent(i) {
          t.push(i);
        },
        onclose(i) {
          e(t);
        }
      });
    });
  }
  async get(A, g, I) {
    g.limit = 1;
    const e = await this.querySync(A, g, I);
    return e.sort((t, i) => i.created_at - t.created_at), e[0] || null;
  }
  async countMany(A, g, I, e) {
    const t = iE(g, I), i = [];
    for (let C = 0; C < A.length; C++) {
      const r = Gg(A[C]);
      i.indexOf(r) === -1 && i.push(r);
    }
    const n = await Promise.all(
      i.map(async (C) => {
        if (this.allowConnectingToRelay?.(C, ["read", [t]]) === !1)
          return null;
        let r;
        try {
          r = await this.ensureRelay(C, {
            connectionTimeout: this.maxWaitForConnection < (e?.maxWait || 0) ? Math.max(e.maxWait * 0.8, e.maxWait - 1e3) : this.maxWaitForConnection,
            abort: e?.abort
          });
        } catch {
          return this.onRelayConnectionFailure?.(C), null;
        }
        return this.onRelayConnectionSuccess?.(C), r.countWithHLL([t], { id: e?.id }).catch(() => null);
      })
    );
    let o = 0, B;
    for (const C of n) {
      if (!C || (C.count > o && (o = C.count), !C.hll || C.hll.length !== 512))
        continue;
      const r = oE(C.hll);
      r && (B = CE(B || new Uint8Array(0), r));
    }
    return B ? { count: o, hll: BE(B) } : { count: o };
  }
  publish(A, g, I) {
    return A.map(Gg).map(async (e, t, i) => {
      if (i.indexOf(e) !== t)
        return Promise.reject("duplicate url");
      if (this.allowConnectingToRelay?.(e, ["write", g]) === !1)
        return Promise.reject("connection skipped by allowConnectingToRelay");
      let n;
      try {
        n = await this.ensureRelay(e, {
          connectionTimeout: this.maxWaitForConnection < (I?.maxWait || 0) ? Math.max(I.maxWait * 0.8, I.maxWait - 1e3) : this.maxWaitForConnection,
          abort: I?.abort
        });
      } catch (o) {
        return this.onRelayConnectionFailure?.(e), Promise.reject("connection failure: " + String(o));
      }
      return n.publish(g).catch(async (o) => {
        if (o instanceof Error && o.message.startsWith("auth-required: ") && I?.onauth)
          return await n.auth(I.onauth), n.publish(g);
        throw o;
      }).then((o) => {
        if (this.trackRelays) {
          let B = this.seenOn.get(g.id);
          B || (B = /* @__PURE__ */ new Set(), this.seenOn.set(g.id, B)), B.add(n);
        }
        return o;
      });
    });
  }
  listConnectionStatus() {
    const A = /* @__PURE__ */ new Map();
    return this.relays.forEach((g, I) => A.set(I, g.connected)), A;
  }
  destroy() {
    this.relays.forEach((A) => A.close()), this.relays = /* @__PURE__ */ new Map();
  }
  pruneIdleRelays(A = 1e4) {
    const g = [];
    for (const [I, e] of this.relays)
      e.idleSince && Date.now() - e.idleSince >= A && (this.relays.delete(I), g.push(I), e.close());
    return g;
  }
}, _t;
try {
  _t = WebSocket;
} catch {
}
function EE(A) {
  _t = A;
}
var aE = class extends rE {
  constructor(A) {
    super({ verifyEvent: jr, websocketImplementation: _t, maxWaitForConnection: 3e3, ...A });
  }
};
/*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
function sE(A) {
  return A instanceof Uint8Array || ArrayBuffer.isView(A) && A.constructor.name === "Uint8Array";
}
function Oi(A) {
  if (typeof A != "boolean")
    throw new Error(`boolean expected, not ${A}`);
}
function Fe(A) {
  if (!Number.isSafeInteger(A) || A < 0)
    throw new Error("positive integer expected, got " + A);
}
function _g(A, g, I = "") {
  const e = sE(A), t = A?.length, i = g !== void 0;
  if (!e || i && t !== g) {
    const n = I && `"${I}" `, o = i ? ` of length ${g}` : "", B = e ? `length=${t}` : `type=${typeof A}`;
    throw new Error(n + "expected Uint8Array" + o + ", got " + B);
  }
  return A;
}
function cg(A) {
  return new Uint32Array(A.buffer, A.byteOffset, Math.floor(A.byteLength / 4));
}
function QE(...A) {
  for (let g = 0; g < A.length; g++)
    A[g].fill(0);
}
function cE(A, g) {
  if (g == null || typeof g != "object")
    throw new Error("options must be defined");
  return Object.assign(A, g);
}
function uE(A, g) {
  if (A.length !== g.length)
    return !1;
  let I = 0;
  for (let e = 0; e < A.length; e++)
    I |= A[e] ^ g[e];
  return I === 0;
}
function vi(A) {
  return Uint8Array.from(A);
}
const To = (A) => Uint8Array.from(A.split(""), (g) => g.charCodeAt(0)), hE = To("expand 16-byte k"), dE = To("expand 32-byte k"), lE = cg(hE), yE = cg(dE);
function _(A, g) {
  return A << g | A >>> 32 - g;
}
function ct(A) {
  return A.byteOffset % 4 === 0;
}
const mI = 64, fE = 16, Lo = 2 ** 32 - 1, Vi = Uint32Array.of();
function DE(A, g, I, e, t, i, n, o) {
  const B = t.length, C = new Uint8Array(mI), r = cg(C), E = ct(t) && ct(i), Q = E ? cg(t) : Vi, a = E ? cg(i) : Vi;
  for (let s = 0; s < B; n++) {
    if (A(g, I, e, r, n, o), n >= Lo)
      throw new Error("arx: counter overflow");
    const d = Math.min(mI, B - s);
    if (E && d === mI) {
      const h = s / 4;
      if (s % 4 !== 0)
        throw new Error("arx: invalid block position");
      for (let u = 0, y; u < fE; u++)
        y = h + u, a[y] = Q[y] ^ r[u];
      s += mI;
      continue;
    }
    for (let h = 0, u; h < d; h++)
      u = s + h, i[u] = t[u] ^ C[h];
    s += d;
  }
}
function NE(A, g) {
  const { allowShortKeys: I, extendNonceFn: e, counterLength: t, counterRight: i, rounds: n } = cE({ allowShortKeys: !1, counterLength: 8, counterRight: !1, rounds: 20 }, g);
  if (typeof A != "function")
    throw new Error("core must be a function");
  return Fe(t), Fe(n), Oi(i), Oi(I), (o, B, C, r, E = 0) => {
    _g(o, void 0, "key"), _g(B, void 0, "nonce"), _g(C, void 0, "data");
    const Q = C.length;
    if (r === void 0 && (r = new Uint8Array(Q)), _g(r, void 0, "output"), Fe(E), E < 0 || E >= Lo)
      throw new Error("arx: counter overflow");
    if (r.length < Q)
      throw new Error(`arx: output (${r.length}) is shorter than data (${Q})`);
    const a = [];
    let s = o.length, d, h;
    if (s === 32)
      a.push(d = vi(o)), h = yE;
    else if (s === 16 && I)
      d = new Uint8Array(32), d.set(o), d.set(o, 16), h = lE, a.push(d);
    else
      throw _g(o, 32, "arx key"), new Error("invalid key size");
    ct(B) || a.push(B = vi(B));
    const u = cg(d);
    if (e) {
      if (B.length !== 24)
        throw new Error("arx: extended nonce must be 24 bytes");
      e(h, u, cg(B.subarray(0, 16)), u), B = B.subarray(16);
    }
    const y = 16 - t;
    if (y !== B.length)
      throw new Error(`arx: nonce must be ${y} or 16 bytes`);
    if (y !== 12) {
      const D = new Uint8Array(12);
      D.set(B, i ? 0 : 12 - B.length), B = D, a.push(B);
    }
    const l = cg(B);
    return DE(A, h, u, l, C, r, E, n), QE(...a), r;
  };
}
function SE(A, g, I, e, t, i = 20) {
  let n = A[0], o = A[1], B = A[2], C = A[3], r = g[0], E = g[1], Q = g[2], a = g[3], s = g[4], d = g[5], h = g[6], u = g[7], y = t, l = I[0], D = I[1], G = I[2], f = n, R = o, H = B, w = C, K = r, M = E, U = Q, N = a, S = s, m = d, p = h, Y = u, b = y, x = l, J = D, T = G;
  for (let $ = 0; $ < i; $ += 2)
    f = f + K | 0, b = _(b ^ f, 16), S = S + b | 0, K = _(K ^ S, 12), f = f + K | 0, b = _(b ^ f, 8), S = S + b | 0, K = _(K ^ S, 7), R = R + M | 0, x = _(x ^ R, 16), m = m + x | 0, M = _(M ^ m, 12), R = R + M | 0, x = _(x ^ R, 8), m = m + x | 0, M = _(M ^ m, 7), H = H + U | 0, J = _(J ^ H, 16), p = p + J | 0, U = _(U ^ p, 12), H = H + U | 0, J = _(J ^ H, 8), p = p + J | 0, U = _(U ^ p, 7), w = w + N | 0, T = _(T ^ w, 16), Y = Y + T | 0, N = _(N ^ Y, 12), w = w + N | 0, T = _(T ^ w, 8), Y = Y + T | 0, N = _(N ^ Y, 7), f = f + M | 0, T = _(T ^ f, 16), p = p + T | 0, M = _(M ^ p, 12), f = f + M | 0, T = _(T ^ f, 8), p = p + T | 0, M = _(M ^ p, 7), R = R + U | 0, b = _(b ^ R, 16), Y = Y + b | 0, U = _(U ^ Y, 12), R = R + U | 0, b = _(b ^ R, 8), Y = Y + b | 0, U = _(U ^ Y, 7), H = H + N | 0, x = _(x ^ H, 16), S = S + x | 0, N = _(N ^ S, 12), H = H + N | 0, x = _(x ^ H, 8), S = S + x | 0, N = _(N ^ S, 7), w = w + K | 0, J = _(J ^ w, 16), m = m + J | 0, K = _(K ^ m, 12), w = w + K | 0, J = _(J ^ w, 8), m = m + J | 0, K = _(K ^ m, 7);
  let O = 0;
  e[O++] = n + f | 0, e[O++] = o + R | 0, e[O++] = B + H | 0, e[O++] = C + w | 0, e[O++] = r + K | 0, e[O++] = E + M | 0, e[O++] = Q + U | 0, e[O++] = a + N | 0, e[O++] = s + S | 0, e[O++] = d + m | 0, e[O++] = h + p | 0, e[O++] = u + Y | 0, e[O++] = y + b | 0, e[O++] = l + x | 0, e[O++] = D + J | 0, e[O++] = G + T | 0;
}
const Oo = /* @__PURE__ */ NE(SE, {
  counterRight: !1,
  counterLength: 4,
  allowShortKeys: !1
});
function vo(A, g, I) {
  return te(A), I === void 0 && (I = new Uint8Array(A.outputLen)), vg(A, I, g);
}
const Ge = /* @__PURE__ */ Uint8Array.of(0), Zi = /* @__PURE__ */ Uint8Array.of();
function Vo(A, g, I, e = 32) {
  te(A), hg(e, "length");
  const t = A.outputLen;
  if (e > 255 * t)
    throw new Error("Length must be <= 255*HashLen");
  const i = Math.ceil(e / t);
  I === void 0 ? I = Zi : oA(I, void 0, "info");
  const n = new Uint8Array(i * t), o = vg.create(A, g), B = o._cloneInto(), C = new Uint8Array(o.outputLen);
  for (let r = 0; r < i; r++)
    Ge[0] = r + 1, B.update(r === 0 ? Zi : C).update(I).update(Ge).digestInto(C), n.set(C, t * r), o._cloneInto(B);
  return o.destroy(), B.destroy(), BI(C, Ge), n.slice(0, e);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Zo(A) {
  return A instanceof Uint8Array || ArrayBuffer.isView(A) && A.constructor.name === "Uint8Array";
}
function pE(A) {
  if (!Zo(A))
    throw new Error("Uint8Array expected");
}
function zo(A, g) {
  return Array.isArray(g) ? g.length === 0 ? !0 : A ? g.every((I) => typeof I == "string") : g.every((I) => Number.isSafeInteger(I)) : !1;
}
function CI(A, g) {
  if (typeof g != "string")
    throw new Error(`${A}: string expected`);
  return !0;
}
function $t(A) {
  if (!Number.isSafeInteger(A))
    throw new Error(`invalid integer: ${A}`);
}
function ut(A) {
  if (!Array.isArray(A))
    throw new Error("array expected");
}
function ZI(A, g) {
  if (!zo(!0, g))
    throw new Error(`${A}: array of strings expected`);
}
function wE(A, g) {
  if (!zo(!1, g))
    throw new Error(`${A}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function kE(...A) {
  const g = (i) => i, I = (i, n) => (o) => i(n(o)), e = A.map((i) => i.encode).reduceRight(I, g), t = A.map((i) => i.decode).reduce(I, g);
  return { encode: e, decode: t };
}
// @__NO_SIDE_EFFECTS__
function mE(A) {
  const g = typeof A == "string" ? A.split("") : A, I = g.length;
  ZI("alphabet", g);
  const e = new Map(g.map((t, i) => [t, i]));
  return {
    encode: (t) => (ut(t), t.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= I)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${A}`);
      return g[i];
    })),
    decode: (t) => (ut(t), t.map((i) => {
      CI("alphabet.decode", i);
      const n = e.get(i);
      if (n === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${A}`);
      return n;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function HE(A = "") {
  return CI("join", A), {
    encode: (g) => (ZI("join.decode", g), g.join(A)),
    decode: (g) => (CI("join.decode", g), g.split(A))
  };
}
// @__NO_SIDE_EFFECTS__
function RE(A, g = "=") {
  return $t(A), CI("padding", g), {
    encode(I) {
      for (ZI("padding.encode", I); I.length * A % 8; )
        I.push(g);
      return I;
    },
    decode(I) {
      ZI("padding.decode", I);
      let e = I.length;
      if (e * A % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; e > 0 && I[e - 1] === g; e--)
        if ((e - 1) * A % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return I.slice(0, e);
    }
  };
}
const Xo = (A, g) => g === 0 ? A : Xo(g, A % g), zI = /* @__NO_SIDE_EFFECTS__ */ (A, g) => A + (g - Xo(A, g)), Ye = /* @__PURE__ */ (() => {
  let A = [];
  for (let g = 0; g < 40; g++)
    A.push(2 ** g);
  return A;
})();
function zi(A, g, I, e) {
  if (ut(A), g <= 0 || g > 32)
    throw new Error(`convertRadix2: wrong from=${g}`);
  if (I <= 0 || I > 32)
    throw new Error(`convertRadix2: wrong to=${I}`);
  if (/* @__PURE__ */ zI(g, I) > 32)
    throw new Error(`convertRadix2: carry overflow from=${g} to=${I} carryBits=${/* @__PURE__ */ zI(g, I)}`);
  let t = 0, i = 0;
  const n = Ye[g], o = Ye[I] - 1, B = [];
  for (const C of A) {
    if ($t(C), C >= n)
      throw new Error(`convertRadix2: invalid data word=${C} from=${g}`);
    if (t = t << g | C, i + g > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${g}`);
    for (i += g; i >= I; i -= I)
      B.push((t >> i - I & o) >>> 0);
    const r = Ye[i];
    if (r === void 0)
      throw new Error("invalid carry");
    t &= r - 1;
  }
  if (t = t << I - i & o, !e && i >= g)
    throw new Error("Excess padding");
  if (!e && t > 0)
    throw new Error(`Non-zero padding: ${t}`);
  return e && i > 0 && B.push(t >>> 0), B;
}
// @__NO_SIDE_EFFECTS__
function UE(A, g = !1) {
  if ($t(A), A <= 0 || A > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ zI(8, A) > 32 || /* @__PURE__ */ zI(A, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (I) => {
      if (!Zo(I))
        throw new Error("radix2.encode input should be Uint8Array");
      return zi(Array.from(I), 8, A, !g);
    },
    decode: (I) => (wE("radix2.decode", I), Uint8Array.from(zi(I, A, 8, g)))
  };
}
const FE = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", GE = (A, g) => {
  CI("base64", A);
  const I = /^[A-Za-z0-9=+/]+$/, e = "base64";
  if (A.length > 0 && !I.test(A))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(A, { alphabet: e, lastChunkHandling: "strict" });
}, jo = FE ? {
  encode(A) {
    return pE(A), A.toBase64();
  },
  decode(A) {
    return GE(A);
  }
} : /* @__PURE__ */ kE(/* @__PURE__ */ UE(6), /* @__PURE__ */ mE("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ RE(6), /* @__PURE__ */ HE(""));
new TextDecoder("utf-8");
var Ai = new TextEncoder();
function YE(A) {
  if (A.length !== 64)
    return !1;
  for (let g = 0; g < 64; g++) {
    let I = A.charCodeAt(g);
    if (isNaN(I) || I < 48 || I > 102 || I > 57 && I < 97)
      return !1;
  }
  return !0;
}
var Wo = 1, _o = 4294967295, $o = 65536;
function PE(A, g) {
  const I = Ko.getSharedSecret(A, dA("02" + g)).subarray(1, 33);
  return vo(LA, I, Ai.encode("nip44-v2"));
}
function ME(A, g) {
  const I = Vo(LA, A, g, 76);
  return {
    chacha_key: I.subarray(0, 32),
    chacha_nonce: I.subarray(32, 44),
    hmac_key: I.subarray(44, 76)
  };
}
function KE(A) {
  if (!Number.isSafeInteger(A) || A < 1)
    throw new Error("expected positive integer");
  if (A <= 32)
    return 32;
  const g = 2 ** (Math.floor(Math.log2(A - 1)) + 1), I = g <= 256 ? 32 : g / 8;
  return I * (Math.floor((A - 1) / I) + 1);
}
function bE(A) {
  if (!Number.isSafeInteger(A) || A < Wo || A > 65535)
    throw new Error("invalid plaintext size: must be between 1 and 65535 bytes");
  const g = new Uint8Array(2);
  return new DataView(g.buffer).setUint16(0, A, !1), g;
}
function qE(A) {
  if (!Number.isSafeInteger(A) || A < $o || A > _o)
    throw new Error("invalid plaintext size: must be between 65536 and 4294967295 bytes");
  const g = new Uint8Array(4);
  return new DataView(g.buffer).setUint32(0, A, !1), g;
}
function JE(A) {
  const g = Ai.encode(A), I = g.length;
  if (I < Wo || I > _o)
    throw new Error("invalid plaintext size: must be between 1 and 4294967295 bytes");
  const e = I >= $o ? kA(new Uint8Array([0, 0]), qE(I)) : bE(I), t = new Uint8Array(KE(I) - I);
  return kA(e, g, t);
}
function xE(A, g, I) {
  if (I.length !== 32)
    throw new Error("AAD associated data must be 32 bytes");
  const e = kA(I, g);
  return vg(LA, A, e);
}
function TE(A, g, I = hI(32)) {
  const { chacha_key: e, chacha_nonce: t, hmac_key: i } = ME(g, I), n = JE(A), o = Oo(e, t, n), B = xE(i, o, I);
  return jo.encode(kA(new Uint8Array([2]), I, o, B));
}
var Hg = Symbol("verified"), LE = (A) => A instanceof Object;
function OE(A) {
  if (!LE(A) || typeof A.kind != "number" || typeof A.content != "string" || typeof A.created_at != "number" || typeof A.pubkey != "string" || !YE(A.pubkey) || !Array.isArray(A.tags))
    return !1;
  for (let g = 0; g < A.tags.length; g++) {
    let I = A.tags[g];
    if (!Array.isArray(I))
      return !1;
    for (let e = 0; e < I.length; e++)
      if (typeof I[e] != "string")
        return !1;
  }
  return !0;
}
var vE = class {
  generateSecretKey() {
    return wA.utils.randomSecretKey();
  }
  getPublicKey(g) {
    return NA(wA.getPublicKey(g));
  }
  finalizeEvent(g, I) {
    const e = g;
    return e.pubkey = NA(wA.getPublicKey(I)), e.id = qI(e), e.sig = NA(wA.sign(dA(qI(e)), I)), e[Hg] = !0, e;
  }
  verifyEvent(g) {
    if (typeof g[Hg] == "boolean")
      return g[Hg];
    try {
      const I = qI(g);
      if (I !== g.id)
        return g[Hg] = !1, !1;
      const e = wA.verify(dA(g.sig), dA(I), dA(g.pubkey));
      return g[Hg] = e, e;
    } catch {
      return g[Hg] = !1, !1;
    }
  }
};
function VE(A) {
  if (!OE(A))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([0, A.pubkey, A.created_at, A.kind, A.tags, A.content]);
}
function qI(A) {
  let g = LA(Ai.encode(VE(A)));
  return NA(g);
}
var Be = new vE(), ZE = Be.generateSecretKey, zE = Be.getPublicKey, AB = Be.finalizeEvent;
Be.verifyEvent;
var XE = 13, jE = 1059, WE = 2880 * 60, gB = () => Math.round(Date.now() / 1e3), IB = () => Math.round(gB() - Math.random() * WE), _E = (A, g) => PE(A, g), eB = (A, g, I) => TE(JSON.stringify(A), _E(g, I));
function $E(A, g) {
  const I = {
    created_at: gB(),
    content: "",
    tags: [],
    ...A,
    pubkey: zE(g)
  };
  return I.id = qI(I), I;
}
function Aa(A, g, I) {
  return AB(
    {
      kind: XE,
      content: eB(A, g, I),
      created_at: IB(),
      tags: []
    },
    g
  );
}
function ga(A, g) {
  const I = ZE();
  return AB(
    {
      kind: jE,
      content: eB(A, I, g),
      created_at: IB(),
      tags: [["p", g]]
    },
    I
  );
}
function Ia(A, g, I) {
  const e = $E(A, g), t = Aa(e, g, I);
  return ga(t, I);
}
var ea = new TextDecoder("utf-8"), ta = new TextEncoder(), ia = 1, na = 4294967295, oa = 65536;
function Xi(A, g) {
  const I = Ko.getSharedSecret(A, dA("02" + g)).subarray(1, 33);
  return vo(LA, I, ta.encode("nip44-v2"));
}
function Ba(A, g) {
  const I = Vo(LA, A, g, 76);
  return {
    chacha_key: I.subarray(0, 32),
    chacha_nonce: I.subarray(32, 44),
    hmac_key: I.subarray(44, 76)
  };
}
function Ca(A) {
  if (!Number.isSafeInteger(A) || A < 1)
    throw new Error("expected positive integer");
  if (A <= 32)
    return 32;
  const g = 2 ** (Math.floor(Math.log2(A - 1)) + 1), I = g <= 256 ? 32 : g / 8;
  return I * (Math.floor((A - 1) / I) + 1);
}
function ra(A) {
  const g = new DataView(A.buffer, A.byteOffset, A.byteLength), I = g.getUint16(0);
  let e, t;
  if (I === 0) {
    if (e = g.getUint32(2), e < oa)
      throw new Error("invalid padding");
    t = 6;
  } else
    e = I, t = 2;
  const i = A.subarray(t, t + e);
  if (e < ia || e > na || i.length !== e || A.length !== t + Ca(e))
    throw new Error("invalid padding");
  return ea.decode(i);
}
function Ea(A, g, I) {
  if (I.length !== 32)
    throw new Error("AAD associated data must be 32 bytes");
  const e = kA(I, g);
  return vg(LA, A, e);
}
function aa(A) {
  if (typeof A != "string")
    throw new Error("payload must be a valid string");
  const g = A.length;
  if (g < 132)
    throw new Error("invalid payload length: " + g);
  if (A[0] === "#")
    throw new Error("unknown encryption version");
  let I;
  try {
    I = jo.decode(A);
  } catch (i) {
    throw new Error("invalid base64: " + i.message);
  }
  const e = I.length;
  if (e < 99)
    throw new Error("invalid data length: " + e);
  const t = I[0];
  if (t !== 2)
    throw new Error("unknown encryption version " + t);
  return {
    nonce: I.subarray(1, 33),
    ciphertext: I.subarray(33, -32),
    mac: I.subarray(-32)
  };
}
function ji(A, g) {
  const { nonce: I, ciphertext: e, mac: t } = aa(A), { chacha_key: i, chacha_nonce: n, hmac_key: o } = Ba(g, I), B = Ea(o, e, I);
  if (!uE(B, t))
    throw new Error("invalid MAC");
  const C = Oo(i, n, e);
  return ra(C);
}
new TextDecoder("utf-8");
var sa = new TextEncoder();
function Qa(A) {
  if (A.length !== 64)
    return !1;
  for (let g = 0; g < 64; g++) {
    let I = A.charCodeAt(g);
    if (isNaN(I) || I < 48 || I > 102 || I > 57 && I < 97)
      return !1;
  }
  return !0;
}
var Rg = Symbol("verified"), ca = (A) => A instanceof Object;
function JI(A) {
  if (!ca(A) || typeof A.kind != "number" || typeof A.content != "string" || typeof A.created_at != "number" || typeof A.pubkey != "string" || !Qa(A.pubkey) || !Array.isArray(A.tags))
    return !1;
  for (let g = 0; g < A.tags.length; g++) {
    let I = A.tags[g];
    if (!Array.isArray(I))
      return !1;
    for (let e = 0; e < I.length; e++)
      if (typeof I[e] != "string")
        return !1;
  }
  return !0;
}
var ua = class {
  generateSecretKey() {
    return wA.utils.randomSecretKey();
  }
  getPublicKey(A) {
    return NA(wA.getPublicKey(A));
  }
  finalizeEvent(A, g) {
    const I = A;
    return I.pubkey = NA(wA.getPublicKey(g)), I.id = Pe(I), I.sig = NA(wA.sign(dA(Pe(I)), g)), I[Rg] = !0, I;
  }
  verifyEvent(A) {
    if (typeof A[Rg] == "boolean")
      return A[Rg];
    try {
      const g = Pe(A);
      if (g !== A.id)
        return A[Rg] = !1, !1;
      const I = wA.verify(dA(A.sig), dA(g), dA(A.pubkey));
      return A[Rg] = I, I;
    } catch {
      return A[Rg] = !1, !1;
    }
  }
};
function ha(A) {
  if (!JI(A))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([0, A.pubkey, A.created_at, A.kind, A.tags, A.content]);
}
function Pe(A) {
  let g = LA(sa.encode(ha(A)));
  return NA(g);
}
var Ce = new ua();
Ce.generateSecretKey;
Ce.getPublicKey;
Ce.finalizeEvent;
var Wi = Ce.verifyEvent, Yg = null;
typeof WebSocket < "u" ? Yg = WebSocket : typeof MozWebSocket < "u" ? Yg = MozWebSocket : typeof global < "u" ? Yg = global.WebSocket || global.MozWebSocket : typeof window < "u" ? Yg = window.WebSocket || window.MozWebSocket : typeof self < "u" && (Yg = self.WebSocket || self.MozWebSocket);
const da = Yg, P = (A, g, I = !1) => {
  const e = `${A}${g === void 0 ? "" : ` ${g}`}`;
  if (I)
    throw new Error(e);
  return e;
}, tB = (A, g = "Expected a successful result, but encountered an error: ") => {
  if (typeof A == "string")
    throw new Error(`${g}${A}`);
  return A;
};
var XI;
(function(A) {
  A.tooLong = "Base converter creation error: an alphabet may be no longer than 254 characters.", A.ambiguousCharacter = "Base converter creation error: a character code may only appear once in a single alphabet.";
})(XI || (XI = {}));
var ht;
(function(A) {
  A.unknownCharacter = "Base conversion error: encountered an unknown character for this alphabet.";
})(ht || (ht = {}));
const la = (A) => {
  if (A.length >= 255)
    return P(XI.tooLong, `Alphabet length: ${A.length}`);
  const e = new Uint8Array(256).fill(255);
  for (let B = 0; B < A.length; B++) {
    const C = A.charCodeAt(B);
    if (e[C] !== 255)
      return P(XI.ambiguousCharacter, `Ambiguous character: ${e[C]}`);
    e[C] = B;
  }
  const t = A.length, i = A.charAt(0), n = Math.log(t) / Math.log(256), o = Math.log(256) / Math.log(t);
  return {
    // eslint-disable-next-line complexity
    decode: (B) => {
      if (B.length === 0)
        return Uint8Array.of();
      const C = B.split("").findIndex((h) => h !== i);
      if (C === -1)
        return new Uint8Array(B.length);
      const r = Math.floor((B.length - C) * n + 1), E = new Uint8Array(r);
      let Q = C, a = 0;
      for (; B[Q] !== void 0; ) {
        let h = e[B.charCodeAt(Q)];
        if (h === 255)
          return P(ht.unknownCharacter, `Unknown character: "${B[Q]}".`);
        let u = 0;
        for (
          let y = r - 1;
          (h !== 0 || u < a) && y !== -1;
          // eslint-disable-next-line no-plusplus
          y--, u++
        )
          h += Math.floor(t * E[y]), E[y] = Math.floor(h % 256), h = Math.floor(h / 256);
        a = u, Q++;
      }
      const s = E.findIndex((h) => h !== 0), d = new Uint8Array(C + (r - s));
      return d.set(E.slice(s), C), d;
    },
    // eslint-disable-next-line complexity
    encode: (B) => {
      if (B.length === 0)
        return "";
      const C = B.findIndex((h) => h !== 0);
      if (C === -1)
        return i.repeat(B.length);
      const r = Math.floor((B.length - C) * o + 1), E = new Uint8Array(r);
      let Q = C, a = 0;
      for (; Q !== B.length; ) {
        let h = B[Q], u = 0;
        for (
          let y = r - 1;
          (h !== 0 || u < a) && y !== -1;
          // eslint-disable-next-line no-plusplus
          y--, u++
        )
          h += Math.floor(256 * E[y]), E[y] = Math.floor(h % t), h = Math.floor(h / t);
        a = u, Q++;
      }
      const s = E.findIndex((h) => h !== 0), d = i.repeat(C);
      return E.slice(s).reduce((h, u) => h + A.charAt(u), d);
    }
  };
}, ya = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", iB = la(ya), fa = iB.decode, Da = iB.encode, _i = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", lI = (A) => {
  const g = new Uint8Array(123);
  for (let B = 0; B < _i.length; B++)
    g[_i.charCodeAt(B)] = B;
  const I = A.length * 0.75, e = A.length, t = A[A.length - 1] === "=" ? A[A.length - 2] === "=" ? I - 2 : I - 1 : I, i = new ArrayBuffer(t), n = new Uint8Array(i);
  let o = 0;
  for (let B = 0; B < e; B += 4) {
    const C = g[A.charCodeAt(B)], r = g[A.charCodeAt(B + 1)], E = g[A.charCodeAt(B + 2)], Q = g[A.charCodeAt(B + 3)];
    n[o++] = C << 2 | r >> 4, n[o++] = (r & 15) << 4 | E >> 2, n[o++] = (E & 3) << 6 | Q & 63;
  }
  return n;
}, nB = (A, g = 0) => Array.from({ length: A }, (I, e) => g + e), oB = (A, g) => nB(Math.ceil(A.length / g)).map((I) => I * g).map((I) => A.slice(I, I + g)), BB = 2, CB = 16, lA = (A) => Uint8Array.from(oB(A, BB).map((g) => parseInt(g, CB))), Z = (A) => A.reduce((g, I) => g + I.toString(CB).padStart(BB, "0"), ""), EA = (A) => {
  const g = A.reduce((e, t) => e + t.length, 0), I = new Uint8Array(g);
  return A.reduce((e, t) => (I.set(t, e), e + t.length), 0), I;
}, re = (A, g) => {
  if (A.length !== g.length)
    return !1;
  for (let I = 0; I < A.length; I++)
    if (A[I] !== g[I])
      return !1;
  return !0;
}, Na = 8, Sa = 2, pa = (A) => Uint8Array.from(oB(A, Na).map((g) => parseInt(g, Sa))), rB = (A, g) => {
  const I = new Uint8Array(g);
  return A.length > g ? I.fill(255) : I.set(A), I;
}, gi = (A) => {
  const I = new Uint8Array(2);
  return new DataView(I.buffer, I.byteOffset, I.byteLength).setUint16(0, A, !0), I;
}, yA = (A) => {
  const I = new Uint8Array(4);
  return new DataView(I.buffer, I.byteOffset, I.byteLength).setUint32(0, A, !0), I;
}, Ee = (A) => {
  const I = new Uint8Array(4);
  return new DataView(I.buffer, I.byteOffset, I.byteLength).setUint32(0, A, !1), I;
}, EB = (A) => {
  const I = BigInt(256), e = [];
  let t = A;
  for (; t >= I; )
    e.push(Number(t % I)), t /= I;
  return t > 0n && e.push(Number(t)), Uint8Array.from(e.length > 0 ? e : [0]);
}, wa = (A) => rB(EB(A), 8), aB = (A) => {
  const I = BigInt.asUintN(64, A);
  return wa(I);
}, ka = (A) => new DataView(A.buffer, A.byteOffset, A.byteLength).getUint32(0, !0), ma = (A) => rB(EB(A), 32).reverse(), sB = (A, g = A.length) => {
  if (A.length !== g)
    throw new TypeError(`Bin length must be ${g}.`);
  return new Uint8Array(A.buffer, A.byteOffset, A.length).reduceRight(
    // eslint-disable-next-line no-bitwise
    (e, t) => e << BigInt(8) | BigInt(t),
    0n
  );
}, QB = (A) => {
  const I = A.length > 8 ? A.slice(0, 8) : A;
  return sB(I, 8);
}, Ha = QB, Ii = aB, Ra = (A) => {
  switch (A) {
    case 253:
      return 3;
    case 254:
      return 5;
    case 255:
      return 9;
    default:
      return 1;
  }
};
var rI;
(function(A) {
  A.noPrefix = "Error reading CompactUint: requires at least one byte.", A.insufficientBytes = "Error reading CompactUint: insufficient bytes.", A.nonMinimal = "Error reading CompactUint: CompactUint is not minimally encoded.", A.excessiveBytes = "Error decoding CompactUint: unexpected bytes after CompactUint.";
})(rI || (rI = {}));
const Ua = (A) => {
  const { bin: g, index: I } = A, e = g[I];
  if (e === void 0)
    return P(rI.noPrefix);
  const t = Ra(e);
  if (g.length - I < t)
    return P(rI.insufficientBytes, `CompactUint prefix ${e} requires at least ${t} bytes. Remaining bytes: ${g.length - I}`);
  const n = t !== 1 ? g.subarray(I + 1, I + t) : g.subarray(I, I + t);
  return {
    position: { bin: g, index: I + t },
    result: sB(n)
  };
}, ng = (A) => A <= BigInt(
  252
  /* CompactUint.uint8MaxValue */
) ? Uint8Array.of(Number(A)) : A <= BigInt(
  65535
  /* CompactUint.uint16MaxValue */
) ? Uint8Array.from([
  253,
  ...gi(Number(A))
]) : A <= BigInt(
  4294967295
  /* CompactUint.uint32MaxValue */
) ? Uint8Array.from([
  254,
  ...yA(Number(A))
]) : Uint8Array.from([
  255,
  ...aB(A)
]), ei = (A) => {
  const g = Ua(A);
  if (typeof g == "string")
    return g;
  const I = g.position.index - A.index, e = ng(g.result);
  return I !== e.length ? P(rI.nonMinimal, `Value: ${g.result.toString()}, encoded length: ${I}, canonical length: ${e.length}`) : g;
}, Fa = (A) => (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  Int32Array.from(Uint32Array.of(A))[0]
), ae = (A, g) => {
  let I = A;
  const e = [];
  for (const t of g) {
    const i = t(I);
    if (typeof i == "string")
      return i;
    e.push(i.result), I = i.position;
  }
  return {
    position: I,
    result: e
  };
};
var jI;
(function(A) {
  A.itemCount = "Error reading item count.", A.item = "Error reading item.";
})(jI || (jI = {}));
const cB = (A, g) => {
  const I = ei(A);
  if (typeof I == "string")
    return P(jI.itemCount, I);
  let e = I.position;
  const t = [];
  for (let i = Number(I.result); i > 0; i--) {
    const n = g(e);
    if (typeof n == "string")
      return P(jI.item, n);
    t.push(n.result), e = n.position;
  }
  return { position: e, result: t };
}, Ga = new TextEncoder(), uB = (A) => Ga.encode(A);
new TextDecoder();
const Ya = (A) => A.normalize("NFKC"), se = async (A, g, I, e, t, i) => {
  const n = (await WebAssembly.instantiate(A, {
    [g]: {
      /**
       * This would only be called in cases where a `__wbindgen_malloc` failed.
       * Since `__wbindgen_malloc` isn't exposed to consumers, this error
       * can only be encountered if the code below is broken.
       */
      /* c8 ignore next 10 */
      // eslint-disable-next-line camelcase, @typescript-eslint/naming-convention
      __wbindgen_throw: (l, D) => {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          Array.from(E().subarray(l, l + D)).map((G) => String.fromCharCode(G)).join("")
        );
      }
    }
  })).instance.exports;
  let o, B, C;
  const r = () => (C === void 0 && (C = n.__wbindgen_global_argument_ptr()), C);
  function E() {
    return (o === void 0 || o.buffer !== n.memory.buffer) && (o = new Uint8Array(n.memory.buffer)), o;
  }
  const Q = () => ((B === void 0 || B.buffer !== n.memory.buffer) && (B = new Uint32Array(n.memory.buffer)), B), a = (l) => {
    const D = n.__wbindgen_malloc(l.length);
    return E().set(l, D), [D, l.length];
  }, s = (l, D) => E().subarray(l, l + D);
  return {
    final: (l) => {
      const [D, G] = a(l), f = r();
      try {
        n[i](f, D, G);
        const R = Q(), H = R[f / 4], w = R[f / 4 + 1], K = s(H, w).slice();
        return n.__wbindgen_free(H, w), K;
      } finally {
        l.set(E().subarray(D / 1, D / 1 + G)), n.__wbindgen_free(D, G);
      }
    },
    hash: (l) => {
      const [D, G] = a(l), f = r();
      try {
        n[I](f, D, G);
        const R = Q(), H = R[f / 4], w = R[f / 4 + 1], K = s(H, w).slice();
        return n.__wbindgen_free(H, w), K;
      } finally {
        n.__wbindgen_free(D, G);
      }
    },
    init: () => {
      const l = r();
      n[e](l);
      const D = Q(), G = D[l / 4], f = D[l / 4 + 1], R = s(G, f).slice();
      return n.__wbindgen_free(G, f), R;
    },
    update: (l, D) => {
      const [G, f] = a(l), [R, H] = a(D), w = r();
      try {
        n[t](w, G, f, R, H);
        const K = Q(), M = K[w / 4], U = K[w / 4 + 1], N = s(M, U).slice();
        return n.__wbindgen_free(M, U), N;
      } finally {
        l.set(E().subarray(G / 1, G / 1 + f)), n.__wbindgen_free(G, f), n.__wbindgen_free(R, H);
      }
    }
  };
}, Pa = "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AgQMBQsgAEH8EigCACACaiICQQFyNgIEQYQTIAA2AgBB/BIgAjYCACAAIAJqIAI2AgAMBAsgAxAgDAELQewPQewPKAIAQX4gAUEDdndxNgIACyAEIAJqIQIgAyAEaiEDCyADIAMoAgRBfnE2AgQgACACQQFyNgIEIAAgAmogAjYCAAJ/AkAgAkH/AU0EQCACQQN2IgFBA3RB9A9qIQJB7A8oAgAiA0EBIAFBH3F0IgFxRQ0BIAJBCGohAyACKAIIDAILIAAgAhAhDAILQewPIAMgAXI2AgAgAkEIaiEDIAILIQEgAyAANgIAIAEgADYCDCAAIAI2AgwgACABNgIICyAFQQhqDwtBgBMgACACayIBNgIAQYgTQYgTKAIAIgAgAmoiAzYCACADIAFBAXI2AgQgACACQQNyNgIEIABBCGoLpQEBAn9BAiEFAkACQAJAAkACQCAAKAIEIgYgAWsgAk8NACABIAJqIgIgAUkhAQJAIAQEQEEAIQUgAQ0CIAZBAXQiASACIAIgAUkbIQIMAQtBACEFIAENAQsgAkEASA0AIAZFDQEgACgCACACEBMiAUUNAgwDCyAFDwsgAhAEIgENAQsgAw0BCyABBEAgACABNgIAIABBBGogAjYCAEECDwtBAQ8LAAsIAEGMFBAHAAtmAgF/A34jAEEwayIBJAAgACkCECECIAApAgghAyAAKQIAIQQgAUEUakEANgIAIAEgBDcDGCABQgE3AgQgAUH0DDYCECABIAFBGGo2AgAgASADNwMgIAEgAjcDKCABIAFBIGoQJQALuAEBAX8jAEHgAWsiAyQAIANBOGpBzAgoAgA2AgAgA0EwakHECCkCADcDACADQgA3AyAgA0G8CCkCADcDKCADQTxqQQBBxAAQKhogA0EgaiABIAIQCSADQYABaiADQSBqQeAAECgaIANBCGogA0GAAWoQCiADQSBqIANBCGpBFBADIANBiAFqIANBKGooAgA2AgAgAyADKQMgNwOAASADIANBgAFqEAsgACADKQMANwIAIANB4AFqJAALlwMBBH8jAEFAaiIDJAAgACAAKQMAIAKtfDcDACADIABBCGo2AiggAyADQShqNgIsAkACQAJAAkACQAJAIAAoAhwiBQRAQcAAIAVrIgQgAk0NASADQRhqIAUgBSACaiIEIABBIGoQFiADKAIcIAJHDQUgAygCGCABIAIQKBoMAwsgAiEEDAELIANBMGogASACIAQQFyADQTxqKAIAIQQgAygCOCEBIAMoAjAhBSADKAI0IQIgA0EgaiAAQSBqIgYgACgCHBAYIAIgAygCJEcNBCADKAIgIAUgAhAoGiAAQRxqQQA2AgAgA0EsaiAGEBkLIANBPGohAiADQThqIQUCQANAIARBP00NASADQTBqIAEgBEHAABAXIAIoAgAhBCAFKAIAIQEgA0EIakEAQcAAIAMoAjAgAygCNBAaIANBLGogAygCCBAZDAALAAsgA0EQaiAAQSBqIAQQGyADKAIUIARHDQEgAygCECABIAQQKBoLIABBHGogBDYCACADQUBrJAAPC0H0ExAHAAtB9BMQBwALQfQTEAcAC+MCAgR/AX4jAEFAaiICJAAgAiABQQhqIgU2AiQgASkDACEGIAEoAhwhAyACIAJBJGo2AigCQCADQT9NBEAgAUEgaiIEIANqQYABOgAAIAEgASgCHEEBaiIDNgIcIAJBGGogBCADEBggAigCGEEAIAIoAhwQKhpBwAAgASgCHGtBB00EQCACQShqIAQQGSACQRBqIAQgAUEcaigCABAbIAIoAhBBACACKAIUECoaCyACQQhqIARBOBAYIAIoAgxBCEcNASACKAIIIAZCA4Y3AAAgAkEoaiAEEBkgAUEcakEANgIAIAJBADYCKEEEIQECQANAIAFBGEYNASACQShqIAFqQQA6AAAgAiACKAIoQQFqNgIoIAFBAWohAQwACwALIAAgBSkAADcAACAAQRBqIAVBEGooAAA2AAAgAEEIaiAFQQhqKQAANwAAIAJBQGskAA8LQcwTIANBwAAQHQALQdwTEAcAC2MBAn8gASgCACECAkACQCABKAIEIgMgASgCCCIBRgRAIAMhAQwBCyADIAFJDQEgAQRAIAIgARATIgINAQALIAIgAxARQQEhAkEAIQELIAAgATYCBCAAIAI2AgAPC0G0ExAHAAuQAQEBfyMAQYABayIBJAAgAUEwakHECCkCADcDACABQThqQcwIKAIANgIAIAFCADcDICABQbwIKQIANwMoIAFBPGpBAEHEABAqGiABQRBqIAFBIGpB4AAQAyABQShqIAFBGGooAgA2AgAgASABKQMQNwMgIAFBCGogAUEgahALIAAgASkDCDcCACABQYABaiQAC4YB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", ti = 1, hB = 2, Ma = 256, Ka = 512, ba = 256, $i = ti | Ma, An = ti | Ka, qa = ti, Ja = hB | ba, xa = hB;
var dt;
(function(A) {
  A[A.NONE = qa] = "NONE", A[A.VERIFY = $i] = "VERIFY", A[A.SIGN = An] = "SIGN", A[A.BOTH = An | $i] = "BOTH";
})(dt || (dt = {}));
var WI;
(function(A) {
  A[A.COMPRESSED = Ja] = "COMPRESSED", A[A.UNCOMPRESSED = xa] = "UNCOMPRESSED";
})(WI || (WI = {}));
const Ta = "AGFzbQEAAAABXg5gAn9/AGAGf39/f39/AX9gAX8AYAABf2AAAGADf39/AX9gAX8Bf2ACf38Bf2AEf39/fwF/YAV/f39/fwF/YAN/f38AYAd/f39/f39/AX9gBH9/f38AYAV/f39/fwAC5wEMA2VudgZtZW1vcnkCAYACgAIDZW52BXRhYmxlAXABBgYDZW52CXRhYmxlQmFzZQN/AANlbnYORFlOQU1JQ1RPUF9QVFIDfwADZW52CFNUQUNLVE9QA38AA2VudgVhYm9ydAACA2Vudg1lbmxhcmdlTWVtb3J5AAMDZW52DmdldFRvdGFsTWVtb3J5AAMDZW52F2Fib3J0T25DYW5ub3RHcm93TWVtb3J5AAMDZW52C19fX3NldEVyck5vAAIDZW52Bl9hYm9ydAAEA2VudhZfZW1zY3JpcHRlbl9tZW1jcHlfYmlnAAUDSUgAAAYKBQAKCgIMAAYABwACBgUNCgAKAAoAAAcHAAAAAgYMCgoFAAUFAAULAQYFAwcBCAgBCAgKBwUFBQUHAQEIBQUFCAUICQgGCwJ/ASMBC38BIwILB/QGGxFfX19lcnJub19sb2NhdGlvbgA1BV9mcmVlACYHX21hbGxvYwAnGV9zZWNwMjU2azFfY29udGV4dF9jcmVhdGUAMxxfc2VjcDI1NmsxX2NvbnRleHRfcmFuZG9taXplAD4fX3NlY3AyNTZrMV9lY19wcml2a2V5X3R3ZWFrX2FkZABCH19zZWNwMjU2azFfZWNfcHJpdmtleV90d2Vha19tdWwAQBtfc2VjcDI1NmsxX2VjX3B1YmtleV9jcmVhdGUAMBpfc2VjcDI1NmsxX2VjX3B1YmtleV9wYXJzZQBOHl9zZWNwMjU2azFfZWNfcHVia2V5X3NlcmlhbGl6ZQBNHl9zZWNwMjU2azFfZWNfcHVia2V5X3R3ZWFrX2FkZABBHl9zZWNwMjU2azFfZWNfcHVia2V5X3R3ZWFrX211bAA/G19zZWNwMjU2azFfZWNfc2Vja2V5X3ZlcmlmeQBDGF9zZWNwMjU2azFfZWNkc2FfcmVjb3ZlcgA5NF9zZWNwMjU2azFfZWNkc2FfcmVjb3ZlcmFibGVfc2lnbmF0dXJlX3BhcnNlX2NvbXBhY3QAPDhfc2VjcDI1NmsxX2VjZHNhX3JlY292ZXJhYmxlX3NpZ25h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iCEuIAogLadJIAkgLKdJaiALICinSWogISAbRXFqIBkgE0VxaiAaIBRFcWogDiAbSWogByATSWogBSAUSWogECAISWogESAGSSAqQgGGpyIJciAiaiITaiIOIBIgBEkgK0IBhqciCnIgF2oiFGoiByAMIANJICVCAYanIgtyIBVqIhBqIgUgDSACSSAkQgGGpyIIciAWaiIRaiIGICOnIgRBAXQiEmoiASASSSEZIB8oAgCtICd+IiNCIIghLCABICOnIgNBAXQiDGoiASAMSSEaIBgoAgCtICZ+IiNCIIghKCABICOnIgJBAXQiDWoiASANSSEbIAogK6dJIAkgKqdJaiALICWnSWogCCAkp0lqICIgE0VxaiAOIBNJaiAXIBRFcWogByAUSWogFSAQRXFqIAUgEElqIBYgEUVxaiAGIBFJaiASIARJIC5CAYanIg5yIBlqIhVqIgogDCADSSAsQgGGpyIHciAaaiIWaiILIA0gAkkgKEIBhqciBXIgG2oiEGoiCCABIB4oAgCtIiQgJH4iI6ciAmoiASACSSAjQiCIp2oiBmohESAPIAE2AiAgICgCAK0iKSAcKAIArX4iI0IgiCEtIBEgI6ciBEEBdCIMaiIBIAxJIRMgHygCAK0iJyAdKAIArSImfiIjQiCIISogASAjpyIDQQF0Ig1qIgEgDUkhFCAYKAIArSIlICR+IiNCIIghJCABICOnIgJBAXQiCWoiASAJSSESIA8gATYCJCApICZ+IiNCIIghKyAHICynSSAOIC6nSWogBSAop0lqIBkgFUVxaiAaIBZFcWogGyAQRXFqIAogFUlqIAsgFklqIAggEElqIBEgBklqIAwgBEkgLUIBhqciB3IgE2oiDGoiCyANIANJICpCAYanIgVyIBRqIg1qIgggCSACSSAkQgGGpyIGciASaiIJaiIEICOnIgNBAXQiDmoiASAOSSEQICcgHigCAK0iJn4iI0IgiCEoIAEgI6ciAkEBdCIKaiIBIApJIREgBSAqp0kgByAtp0lqIAYgJKdJaiATIAxFcWogCyAMSWogFCANRXFqIAggDUlqIBIgCUVxaiAEIAlJaiAOIANJICtCAYanIgtyIBBqIhJqIgUgCiACSSAoQgGGpyIIciARaiIMaiIGIAEgJSAlfiIjpyICaiIBIAJJICNCIIinaiIEaiENIA8gATYCKCAgKAIArSInICZ+IiNCIIghJSANICOnIgNBAXQiB2oiASAHSSEJIB8oAgCtIiogGCgCAK0iJn4iI0IgiCEkIAEgI6ciAkEBdCIKaiIBIApJIQ4gDyABNgIsICcgJn4iI0IgiCEpIAggKKdJIAsgK6dJaiAQIBJFcWogESAMRXFqIAUgEklqIAYgDElqIA0gBElqIAcgA0kgJUIBhqciCHIgCWoiB2oiBiAKIAJJICRCAYanIgRyIA5qIgtqIgMgI6ciAkEBdCIFaiIBIAVJIQogBCAkp0kgCCAlp0lqIAkgB0VxaiAGIAdJaiAOIAtFcWogAyALSWogBSACSSApQgGGpyIGciAKaiIHaiIEIAEgKiAqfiIjpyICaiIBIAJJICNCIIinaiIDaiELIA8gATYCMCAgKAIArSInICp+IiNCIIghJiALICOnIgJBAXQiBWoiASAFSSEIIA8gATYCNCAPIAogB0VxIAYgKadJaiAEIAdJaiALIANJaiAFIAJJICZCAYanIgRyIAhqIgZqIgMgJyAnfiIjpyICaiIBNgI4IA8gBCAmp0kgI0IgiKdqIAggBkVxaiADIAZJaiABIAJJajYCPCAAIA8QLCAPJAQLKwAgAEH/AXFBGHQgAEEIdUH/AXFBEHRyIABBEHVB/wFxQQh0ciAAQRh2cgvPCQEbfiACKAIgrSIDIAEoAgStIgR+IAIoAiStIgYgASgCAK0iCH58IAIoAhytIgkgASgCCK0iCn58IAIoAhitIgsgASgCDK0iDH58IAIoAhStIg0gASgCEK0iDn58IAIoAhCtIg8gASgCFK0iEH58IAIoAgytIhEgASgCGK0iEn58IAIoAgitIhMgASgCHK0iFH58IAIoAgStIhUgASgCIK0iFn58IAIoAgCtIhcgASgCJK0iGH58IRwgCiADfiAEIAZ+fCAMIAl+fCAOIAt+fCAQIA1+fCASIA9+fCAUIBF+fCAWIBN+fCAYIBV+fCAcQhqIfCIbQv///x+DIhpCkPoAfiAXIAh+fCEdIBcgBH4gFSAIfnwgGkIKhnwgHUIaiHwgDCADfiAKIAZ+fCAOIAl+fCAQIAt+fCASIA1+fCAUIA9+fCAWIBF+fCAYIBN+fCAbQhqIfCIaQv///x+DIgVCkPoAfnwhGyAVIAR+IBMgCH58IBcgCn58IAVCCoZ8IA4gA34gDCAGfnwgECAJfnwgEiALfnwgFCANfnwgFiAPfnwgGCARfnwgGkIaiHwiBUL///8fgyIHQpD6AH58IBtCGoh8IRogACATIAR+IBEgCH58IBUgCn58IBcgDH58IAdCCoZ8IBAgA34gDiAGfnwgEiAJfnwgFCALfnwgFiANfnwgGCAPfnwgBUIaiHwiBUL///8fgyIHQpD6AH58IBpCGoh8IhmnQf///x9xNgIMIAAgESAEfiAPIAh+fCATIAp+fCAVIAx+fCAXIA5+fCAHQgqGfCASIAN+IBAgBn58IBQgCX58IBYgC358IBggDX58IAVCGoh8IgVC////H4MiB0KQ+gB+fCAZQhqIfCIZp0H///8fcTYCECAAIA8gBH4gDSAIfnwgESAKfnwgEyAMfnwgFSAOfnwgFyAQfnwgB0IKhnwgFCADfiASIAZ+fCAWIAl+fCAYIAt+fCAFQhqIfCIFQv///x+DIgdCkPoAfnwgGUIaiHwiGadB////H3E2AhQgACANIAR+IAsgCH58IA8gCn58IBEgDH58IBMgDn58IBUgEH58IBcgEn58IAdCCoZ8IBYgA34gFCAGfnwgGCAJfnwgBUIaiHwiBUL///8fgyIHQpD6AH58IBlCGoh8IhmnQf///x9xNgIYIAAgCyAEfiAJIAh+fCANIAp+fCAPIAx+fCARIA5+fCATIBB+fCAVIBJ+fCAXIBR+fCAHQgqGfCAYIAN+IBYgBn58IAVCGoh8IgVC////H4MiB0KQ+gB+fCAZQhqIfCIZp0H///8fcTYCHCAAIAkgBH4gAyAIfnwgCyAKfnwgDSAMfnwgDyAOfnwgESAQfnwgEyASfnwgFSAUfnwgFyAWfnwgB0IKhnwgBUIaiCAYIAZ+fCIDQv///x+DIgRCkPoAfnwgGUIaiHwiBqdB////H3E2AiAgACADQhqIIgNCkPoAfiAcQv///x+DfCAEQgqGfCAGQhqIfCIEp0H///8BcTYCJCAAIARCFoggA0IOhnwiA0LRB34gHUL///8fg3wiBKdB////H3E2AgAgACADQgaGIBtC////H4N8IARCGoh8IgOnQf///x9xNgIEIAAgA0IaiCAaQv///x+DfD4CCAvDAwEDfyACQYDAAE4EQCAAIAEgAhAGDwsgACEEIAAgAmohAyAAQQNxIAFBA3FGBEADQCAAQQNxBEAgAkUEQCAEDwsgACABLAAAOgAAIABBAWohACABQQFqIQEgAkEBayECDAELCyADQXxxIgJBQGohBQNAIAAgBUwEQCAAIAEoAgA2AgAgACABKAIENgIEIAAgASgCCDYCCCAAIAEoAgw2AgwgACABKAIQNgIQIAAgASgCFDYCFCAAIAEoAhg2AhggACABKAIcNgIcIAAgASgCIDYCICAAIAEoAiQ2AiQgACABKAIoNgIoIAAgASgCLDYCLCAAIAEoAjA2AjAgACABKAI0NgI0IAAgASgCODYCOCAAIAEoAjw2AjwgAEFAayEAIAFBQGshAQwBCwsDQCAAIAJIBEAgACABKAIANgIAIABBBGohACABQQRqIQEMAQsLBSADQQRrIQIDQCAAIAJIBEAgACABLAAAOgAAIAAgASwAAToAASAAIAEsAAI6AAIgACABLAADOgADIABBBGohACABQQRqIQEMAQsLCwNAIAAgA0gEQCAAIAEsAAA6AAAgAEEBaiEAIAFBAWohAQwBCwsgBAu/VgEkfyAAKAIAIR0gAEEEaiIeKAIAIQkgAEEIaiIfKAIAIQUgAEEMaiIgKAIAIQ8gAEEcaiIhKAIAQZjfqJQEaiAAQRBqIiIoAgAiAkEGdiACQRp0ciACQQt2IAJBFXRycyACQRl2IAJBB3Ryc2ogAEEYaiIjKAIAIgYgAEEUaiIkKAIAIgpzIAJxIAZzaiABKAIAEAkiF2oiByAPaiEPIAZBkYndiQdqIAEoAgQQCSIVaiAPIAogAnNxIApzaiAPQQZ2IA9BGnRyIA9BC3YgD0EVdHJzIA9BGXYgD0EHdHJzaiISIAVqIQYgCkHP94Oue2ogASgCCBAJIhhqIAYgDyACc3EgAnNqIAZBBnYgBkEadHIgBkELdiAGQRV0cnMgBkEZdiAGQQd0cnNqIhQgCWohCiACQaW3181+aiABKAIMEAkiFmogCiAGIA9zcSAPc2ogCkEGdiAKQRp0ciAKQQt2IApBFXRycyAKQRl2IApBB3Ryc2oiAiAdaiEDIB1BAnYgHUEedHIgHUENdiAdQRN0cnMgHUEWdiAdQQp0cnMgBSAJIB1ycSAJIB1xcmogB2oiBUECdiAFQR50ciAFQQ12IAVBE3RycyAFQRZ2IAVBCnRycyAFIB1yIAlxIAUgHXFyaiASaiIJQQJ2IAlBHnRyIAlBDXYgCUETdHJzIAlBFnYgCUEKdHJzIAkgBXIgHXEgCSAFcXJqIBRqIgdBAnYgB0EedHIgB0ENdiAHQRN0cnMgB0EWdiAHQQp0cnMgByAJciAFcSAHIAlxcmogAmohAiAPQduE28oDaiABKAIQEAkiGWogAyAKIAZzcSAGc2ogA0EGdiADQRp0ciADQQt2IANBFXRycyADQRl2IANBB3Ryc2oiEiAFaiEPIAEoAhQQCSIQQfGjxM8FaiAGaiAPIAMgCnNxIApzaiAPQQZ2IA9BGnRyIA9BC3YgD0EVdHJzIA9BGXYgD0EHdHJzaiIUIAlqIQYgASgCGBAJIghBpIX+kXlqIApqIAYgDyADc3EgA3NqIAZBBnYgBkEadHIgBkELdiAGQRV0cnMgBkEZdiAGQQd0cnNqIhMgB2ohCiABKAIcEAkiC0HVvfHYemogA2ogCiAGIA9zcSAPc2ogCkEGdiAKQRp0ciAKQQt2IApBFXRycyAKQRl2IApBB3Ryc2oiBCACaiEDIAJBAnYgAkEedHIgAkENdiACQRN0cnMgAkEWdiACQQp0cnMgAiAHciAJcSACIAdxcmogEmoiBUECdiAFQR50ciAFQQ12IAVBE3RycyAFQRZ2IAVBCnRycyAFIAJyIAdxIAUgAnFyaiAUaiIJQQJ2IAlBHnRyIAlBDXYgCUETdHJzIAlBFnYgCUEKdHJzIAkgBXIgAnEgCSAFcXJqIBNqIgdBAnYgB0EedHIgB0ENdiAHQRN0cnMgB0EWdiAHQQp0cnMgByAJciAFcSAHIAlxcmogBGohAiABKAIgEAkiDkGY1Z7AfWogD2ogAyAKIAZzcSAGc2ogA0EGdiADQRp0ciADQQt2IANBFXRycyADQRl2IANBB3Ryc2oiEiAFaiEPIAEoAiQQCSIMQYG2jZQBaiAGaiAPIAMgCnNxIApzaiAPQQZ2IA9BGnRyIA9BC3YgD0EVdHJzIA9BGXYgD0EHdHJzaiIUIAlqIQYgASgCKBAJIg1BvovGoQJqIApqIAYgDyADc3EgA3NqIAZBBnYgBkEadHIgBkELdiAGQRV0cnMgBkEZdiAGQQd0cnNqIhMgB2ohCiABKAIsEAkiEUHD+7GoBWogA2ogCiAGIA9zcSAPc2ogCkEGdiAKQRp0ciAKQQt2IApBFXRycyAKQRl2IApBB3Ryc2oiBCACaiEDIAJBAnYgAkEedHIgAkENdiACQRN0cnMgAkEWdiACQQp0cnMgAiAHciAJcSACIAdxcmogEmoiBUECdiAFQR50ciAFQQ12IAVBE3RycyAFQRZ2IAVBCnRycyAFIAJyIAdxIAUgAnFyaiAUaiIJQQJ2IAlBHnRyIAlBDXYgCUETdHJzIAlBFnYgCUEKdHJzIAkgBXIgAnEgCSAFcXJqIBNqIgdBAnYgB0EedHIgB0ENdiAHQRN0cnMgB0EWdiAHQQp0cnMgByAJciAFcSAHIAlxcmogBGohAiABKAIwEAkiGkH0uvmVB2ogD2ogAyAKIAZzcSAGc2ogA0EGdiADQRp0ciADQQt2IANBFXRycyADQRl2IANBB3Ryc2oiBCAFaiEFIAEoAjQQCSIbQf7j+oZ4aiAGaiAFIAMgCnNxIApzaiAFQQZ2IAVBGnRyIAVBC3YgBUEVdHJzIAVBGXYgBUEHdHJzaiIGIAlqIRIgASgCOBAJIg9Bp43w3nlqIApqIBIgBSADc3EgA3NqIBJBBnYgEkEadHIgEkELdiASQRV0cnMgEkEZdiASQQd0cnNqIgogB2ohFCABKAI8EAkiAUH04u+MfGogA2ogFCASIAVzcSAFc2ogFEEGdiAUQRp0ciAUQQt2IBRBFXRycyAUQRl2IBRBB3Ryc2oiHCACaiETIAJBAnYgAkEedHIgAkENdiACQRN0cnMgAkEWdiACQQp0cnMgAiAHciAJcSACIAdxcmogBGoiA0ECdiADQR50ciADQQ12IANBE3RycyADQRZ2IANBCnRycyADIAJyIAdxIAMgAnFyaiAGaiIJQQJ2IAlBHnRyIAlBDXYgCUETdHJzIAlBFnYgCUEKdHJzIAkgA3IgAnEgCSADcXJqIApqIgdBAnYgB0EedHIgB0ENdiAHQRN0cnMgB0EWdiAHQQp0cnMgByAJciADcSAHIAlxcmogHGohAiAYQRJ2IBhBDnRyIBhBA3ZzIBhBB3YgGEEZdHJzIBVqIA1qIAFBE3YgAUENdHIgAUEKdnMgAUERdiABQQ90cnNqIgZBho/5/X5qIBJqIBVBEnYgFUEOdHIgFUEDdnMgFUEHdiAVQRl0cnMgF2ogDGogD0ETdiAPQQ10ciAPQQp2cyAPQRF2IA9BD3Ryc2oiCkHB0+2kfmogBWogEyAUIBJzcSASc2ogE0EGdiATQRp0ciATQQt2IBNBFXRycyATQRl2IBNBB3Ryc2oiFSADaiIXIBMgFHNxIBRzaiAXQQZ2IBdBGnRyIBdBC3YgF0EVdHJzIBdBGXYgF0EHdHJzaiIEIAlqIRIgGUESdiAZQQ50ciAZQQN2cyAZQQd2IBlBGXRycyAWaiAaaiAGQRN2IAZBDXRyIAZBCnZzIAZBEXYgBkEPdHJzaiIDQczDsqACaiATaiAWQRJ2IBZBDnRyIBZBA3ZzIBZBB3YgFkEZdHJzIBhqIBFqIApBE3YgCkENdHIgCkEKdnMgCkERdiAKQQ90cnNqIgVBxruG/gBqIBRqIBIgFyATc3EgE3NqIBJBBnYgEkEadHIgEkELdiASQRV0cnMgEkEZdiASQQd0cnNqIhggB2oiFiASIBdzcSAXc2ogFkEGdiAWQRp0ciAWQQt2IBZBFXRycyAWQRl2IBZBB3Ryc2oiHCACaiETIAJBAnYgAkEedHIgAkENdiACQRN0cnMgAkEWdiACQQp0cnMgAiAHciAJcSACIAdxcmogFWoiFEECdiAUQR50ciAUQQ12IBRBE3RycyAUQRZ2IBRBCnRycyAUIAJyIAdxIBQgAnFyaiAEaiIVQQJ2IBVBHnRyIBVBDXYgFUETdHJzIBVBFnYgFUEKdHJzIBUgFHIgAnEgFSAUcXJqIBhqIhhBAnYgGEEedHIgGEENdiAYQRN0cnMgGEEWdiAYQQp0cnMgGCAVciAUcSAYIBVxcmogHGohAiAIQRJ2IAhBDnRyIAhBA3ZzIAhBB3YgCEEZdHJzIBBqIA9qIANBE3YgA0ENdHIgA0EKdnMgA0ERdiADQQ90cnNqIglBqonS0wRqIBJqIBBBEnYgEEEOdHIgEEEDdnMgEEEHdiAQQRl0cnMgGWogG2ogBUETdiAFQQ10ciAFQQp2cyAFQRF2IAVBD3Ryc2oiB0Hv2KTvAmogF2ogEyAWIBJzcSASc2ogE0EGdiATQRp0ciATQQt2IBNBFXRycyATQRl2IBNBB3Ryc2oiGSAUaiIEIBMgFnNxIBZzaiAEQQZ2IARBGnRyIARBC3YgBEEVdHJzIARBGXYgBEEHdHJzaiIQIBVqIRcgDkESdiAOQQ50ciAOQQN2cyAOQQd2IA5BGXRycyALaiAKaiAJQRN2IAlBDXRyIAlBCnZzIAlBEXYgCUEPdHJzaiISQdqR5rcHaiATaiALQRJ2IAtBDnRyIAtBA3ZzIAtBB3YgC0EZdHJzIAhqIAFqIAdBE3YgB0ENdHIgB0EKdnMgB0ERdiAHQQ90cnNqIhRB3NPC5QVqIBZqIBcgBCATc3EgE3NqIBdBBnYgF0EadHIgF0ELdiAXQRV0cnMgF0EZdiAXQQd0cnNqIhMgGGoiCyAXIARzcSAEc2ogC0EGdiALQRp0ciALQQt2IAtBFXRycyALQRl2IAtBB3Ryc2oiHCACaiEWIAJBAnYgAkEedHIgAkENdiACQRN0cnMgAkEWdiACQQp0cnMgAiAYciAVcSACIBhxcmogGWoiGUECdiAZQR50ciAZQQ12IBlBE3RycyAZQRZ2IBlBCnRycyAZIAJyIBhxIBkgAnFyaiAQaiIQQQJ2IBBBHnRyIBBBDXYgEEETdHJzIBBBFnYgEEEKdHJzIBAgGXIgAnEgECAZcXJqIBNqIghBAnYgCEEedHIgCEENdiAIQRN0cnMgCEEWdiAIQQp0cnMgCCAQciAZcSAIIBBxcmogHGohAiANQRJ2IA1BDnRyIA1BA3ZzIA1BB3YgDUEZdHJzIAxqIAVqIBJBE3YgEkENdHIgEkEKdnMgEkERdiASQQ90cnNqIhNB7YzHwXpqIBdqIAxBEnYgDEEOdHIgDEEDdnMgDEEHdiAMQRl0cnMgDmogBmogFEETdiAUQQ10ciAUQQp2cyAUQRF2IBRBD3Ryc2oiFUHSovnBeWogBGogFiALIBdzcSAXc2ogFkEGdiAWQRp0ciAWQQt2IBZBFXRycyAWQRl2IBZBB3Ryc2oiDCAZaiIOIBYgC3NxIAtzaiAOQQZ2IA5BGnRyIA5BC3YgDkEVdHJzIA5BGXYgDkEHdHJzaiIZIBBqIQQgGkESdiAaQQ50ciAaQQN2cyAaQQd2IBpBGXRycyARaiAHaiATQRN2IBNBDXRyIBNBCnZzIBNBEXYgE0EPdHJzaiIYQcf/5fp7aiAWaiARQRJ2IBFBDnRyIBFBA3ZzIBFBB3YgEUEZdHJzIA1qIANqIBVBE3YgFUENdHIgFUEKdnMgFUERdiAVQQ90cnNqIhdByM+MgHtqIAtqIAQgDiAWc3EgFnNqIARBBnYgBEEadHIgBEELdiAEQRV0cnMgBEEZdiAEQQd0cnNqIhYgCGoiDSAEIA5zcSAOc2ogDUEGdiANQRp0ciANQQt2IA1BFXRycyANQRl2IA1BB3Ryc2oiESACaiELIAJBAnYgAkEedHIgAkENdiACQRN0cnMgAkEWdiACQQp0cnMgAiAIciAQcSACIAhxcmogDGoiEEECdiAQQR50ciAQQQ12IBBBE3RycyAQQRZ2IBBBCnRycyAQIAJyIAhxIBAgAnFyaiAZaiIIQQJ2IAhBHnRyIAhBDXYgCEETdHJzIAhBFnYgCEEKdHJzIAggEHIgAnEgCCAQcXJqIBZqIgxBAnYgDEEedHIgDEENdiAMQRN0cnMgDEEWdiAMQQp0cnMgDCAIciAQcSAMIAhxcmogEWohAiAPQRJ2IA9BDnRyIA9BA3ZzIA9BB3YgD0EZdHJzIBtqIBRqIBhBE3YgGEENdHIgGEEKdnMgGEERdiAYQQ90cnNqIhZBx6KerX1qIARqIBtBEnYgG0EOdHIgG0EDdnMgG0EHdiAbQRl0cnMgGmogCWogF0ETdiAXQQ10ciAXQQp2cyAXQRF2IBdBD3Ryc2oiGUHzl4C3fGogDmogCyANIARzcSAEc2ogC0EGdiALQRp0ciALQQt2IAtBFXRycyALQRl2IAtBB3Ryc2oiDiAQaiIRIAsgDXNxIA1zaiARQQZ2IBFBGnRyIBFBC3YgEUEVdHJzIBFBGXYgEUEHdHJzaiIaIAhqIQQgCkESdiAKQQ50ciAKQQN2cyAKQQd2IApBGXRycyABaiAVaiAWQRN2IBZBDXRyIBZBCnZzIBZBEXYgFkEPdHJzaiIQQefSpKEBaiALaiABQRJ2IAFBDnRyIAFBA3ZzIAFBB3YgAUEZdHJzIA9qIBJqIBlBE3YgGUENdHIgGUEKdnMgGUERdiAZQQ90cnNqIgFB0capNmogDWogBCARIAtzcSALc2ogBEEGdiAEQRp0ciAEQQt2IARBFXRycyAEQRl2IARBB3Ryc2oiDyAMaiINIAQgEXNxIBFzaiANQQZ2IA1BGnRyIA1BC3YgDUEVdHJzIA1BGXYgDUEHdHJzaiIbIAJqIQsgAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIAxyIAhxIAIgDHFyaiAOaiIIQQJ2IAhBHnRyIAhBDXYgCEETdHJzIAhBFnYgCEEKdHJzIAggAnIgDHEgCCACcXJqIBpqIgxBAnYgDEEedHIgDEENdiAMQRN0cnMgDEEWdiAMQQp0cnMgDCAIciACcSAMIAhxcmogD2oiDkECdiAOQR50ciAOQQ12IA5BE3RycyAOQRZ2IA5BCnRycyAOIAxyIAhxIA4gDHFyaiAbaiECIAVBEnYgBUEOdHIgBUEDdnMgBUEHdiAFQRl0cnMgBmogF2ogEEETdiAQQQ10ciAQQQp2cyAQQRF2IBBBD3Ryc2oiD0G4wuzwAmogBGogBkESdiAGQQ50ciAGQQN2cyAGQQd2IAZBGXRycyAKaiATaiABQRN2IAFBDXRyIAFBCnZzIAFBEXYgAUEPdHJzaiIGQYWV3L0CaiARaiALIA0gBHNxIARzaiALQQZ2IAtBGnRyIAtBC3YgC0EVdHJzIAtBGXYgC0EHdHJzaiIaIAhqIhEgCyANc3EgDXNqIBFBBnYgEUEadHIgEUELdiARQRV0cnMgEUEZdiARQQd0cnNqIhsgDGohCCAHQRJ2IAdBDnRyIAdBA3ZzIAdBB3YgB0EZdHJzIANqIBlqIA9BE3YgD0ENdHIgD0EKdnMgD0ERdiAPQQ90cnNqIgpBk5rgmQVqIAtqIANBEnYgA0EOdHIgA0EDdnMgA0EHdiADQRl0cnMgBWogGGogBkETdiAGQQ10ciAGQQp2cyAGQRF2IAZBD3Ryc2oiA0H827HpBGogDWogCCARIAtzcSALc2ogCEEGdiAIQRp0ciAIQQt2IAhBFXRycyAIQRl2IAhBB3Ryc2oiBSAOaiINIAggEXNxIBFzaiANQQZ2IA1BGnRyIA1BC3YgDUEVdHJzIA1BGXYgDUEHdHJzaiIcIAJqIQQgAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIA5yIAxxIAIgDnFyaiAaaiILQQJ2IAtBHnRyIAtBDXYgC0ETdHJzIAtBFnYgC0EKdHJzIAsgAnIgDnEgCyACcXJqIBtqIgxBAnYgDEEedHIgDEENdiAMQRN0cnMgDEEWdiAMQQp0cnMgDCALciACcSAMIAtxcmogBWoiDkECdiAOQR50ciAOQQ12IA5BE3RycyAOQRZ2IA5BCnRycyAOIAxyIAtxIA4gDHFyaiAcaiECIBRBEnYgFEEOdHIgFEEDdnMgFEEHdiAUQRl0cnMgCWogAWogCkETdiAKQQ10ciAKQQp2cyAKQRF2IApBD3Ryc2oiBUG7laizB2ogCGogCUESdiAJQQ50ciAJQQN2cyAJQQd2IAlBGXRycyAHaiAWaiADQRN2IANBDXRyIANBCnZzIANBEXYgA0EPdHJzaiIJQdTmqagGaiARaiAEIA0gCHNxIAhzaiAEQQZ2IARBGnRyIARBC3YgBEEVdHJzIARBGXYgBEEHdHJzaiIaIAtqIhEgBCANc3EgDXNqIBFBBnYgEUEadHIgEUELdiARQRV0cnMgEUEZdiARQQd0cnNqIhsgDGohCCAVQRJ2IBVBDnRyIBVBA3ZzIBVBB3YgFUEZdHJzIBJqIAZqIAVBE3YgBUENdHIgBUEKdnMgBUERdiAFQQ90cnNqIgdBhdnIk3lqIARqIBJBEnYgEkEOdHIgEkEDdnMgEkEHdiASQRl0cnMgFGogEGogCUETdiAJQQ10ciAJQQp2cyAJQRF2IAlBD3Ryc2oiEkGukouOeGogDWogCCARIARzcSAEc2ogCEEGdiAIQRp0ciAIQQt2IAhBFXRycyAIQRl2IAhBB3Ryc2oiFCAOaiINIAggEXNxIBFzaiANQQZ2IA1BGnRyIA1BC3YgDUEVdHJzIA1BGXYgDUEHdHJzaiIcIAJqIQQgAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIA5yIAxxIAIgDnFyaiAaaiILQQJ2IAtBHnRyIAtBDXYgC0ETdHJzIAtBFnYgC0EKdHJzIAsgAnIgDnEgCyACcXJqIBtqIgxBAnYgDEEedHIgDEENdiAMQRN0cnMgDEEWdiAMQQp0cnMgDCALciACcSAMIAtxcmogFGoiDkECdiAOQR50ciAOQQ12IA5BE3RycyAOQRZ2IA5BCnRycyAOIAxyIAtxIA4gDHFyaiAcaiECIBdBEnYgF0EOdHIgF0EDdnMgF0EHdiAXQRl0cnMgE2ogA2ogB0ETdiAHQQ10ciAHQQp2cyAHQRF2IAdBD3Ryc2oiFEHLzOnAemogCGogE0ESdiATQQ50ciATQQN2cyATQQd2IBNBGXRycyAVaiAPaiASQRN2IBJBDXRyIBJBCnZzIBJBEXYgEkEPdHJzaiITQaHR/5V6aiARaiAEIA0gCHNxIAhzaiAEQQZ2IARBGnRyIARBC3YgBEEVdHJzIARBGXYgBEEHdHJzaiIaIAtqIhEgBCANc3EgDXNqIBFBBnYgEUEadHIgEUELdiARQRV0cnMgEUEZdiARQQd0cnNqIhsgDGohCCAZQRJ2IBlBDnRyIBlBA3ZzIBlBB3YgGUEZdHJzIBhqIAlqIBRBE3YgFEENdHIgFEEKdnMgFEERdiAUQQ90cnNqIhVBo6Oxu3xqIARqIBhBEnYgGEEOdHIgGEEDdnMgGEEHdiAYQRl0cnMgF2ogCmogE0ETdiATQQ10ciATQQp2cyATQRF2IBNBD3Ryc2oiGEHwlq6SfGogDWogCCARIARzcSAEc2ogCEEGdiAIQRp0ciAIQQt2IAhBFXRycyAIQRl2IAhBB3Ryc2oiFyAOaiINIAggEXNxIBFzaiANQQZ2IA1BGnRyIA1BC3YgDUEVdHJzIA1BGXYgDUEHdHJzaiIcIAJqIQQgAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIA5yIAxxIAIgDnFyaiAaaiILQQJ2IAtBHnRyIAtBDXYgC0ETdHJzIAtBFnYgC0EKdHJzIAsgAnIgDnEgCyACcXJqIBtqIgxBAnYgDEEedHIgDEENdiAMQRN0cnMgDEEWdiAMQQp0cnMgDCALciACcSAMIAtxcmogF2oiDkECdiAOQR50ciAOQQ12IA5BE3RycyAOQRZ2IA5BCnRycyAOIAxyIAtxIA4gDHFyaiAcaiECIAFBEnYgAUEOdHIgAUEDdnMgAUEHdiABQRl0cnMgFmogEmogFUETdiAVQQ10ciAVQQp2cyAVQRF2IBVBD3Ryc2oiF0GkjOS0fWogCGogFkESdiAWQQ50ciAWQQN2cyAWQQd2IBZBGXRycyAZaiAFaiAYQRN2IBhBDXRyIBhBCnZzIBhBEXYgGEEPdHJzaiIWQZnQy4x9aiARaiAEIA0gCHNxIAhzaiAEQQZ2IARBGnRyIARBC3YgBEEVdHJzIARBGXYgBEEHdHJzaiIaIAtqIhEgBCANc3EgDXNqIBFBBnYgEUEadHIgEUELdiARQRV0cnMgEUEZdiARQQd0cnNqIgsgDGohCCAGQRJ2IAZBDnRyIAZBA3ZzIAZBB3YgBkEZdHJzIBBqIBNqIBdBE3YgF0ENdHIgF0EKdnMgF0ERdiAXQQ90cnNqIhlB8MCqgwFqIARqIBBBEnYgEEEOdHIgEEEDdnMgEEEHdiAQQRl0cnMgAWogB2ogFkETdiAWQQ10ciAWQQp2cyAWQRF2IBZBD3Ryc2oiAUGF67igf2ogDWogCCARIARzcSAEc2ogCEEGdiAIQRp0ciAIQQt2IAhBFXRycyAIQRl2IAhBB3Ryc2oiGyAOaiINIAggEXNxIBFzaiANQQZ2IA1BGnRyIA1BC3YgDUEVdHJzIA1BGXYgDUEHdHJzaiIcIAJqIRAgAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIA5yIAxxIAIgDnFyaiAaaiIEQQJ2IARBHnRyIARBDXYgBEETdHJzIARBFnYgBEEKdHJzIAQgAnIgDnEgBCACcXJqIAtqIgtBAnYgC0EedHIgC0ENdiALQRN0cnMgC0EWdiALQQp0cnMgCyAEciACcSALIARxcmogG2oiDEECdiAMQR50ciAMQQ12IAxBE3RycyAMQRZ2IAxBCnRycyAMIAtyIARxIAwgC3FyaiAcaiECIANBEnYgA0EOdHIgA0EDdnMgA0EHdiADQRl0cnMgD2ogGGogGUETdiAZQQ10ciAZQQp2cyAZQRF2IBlBD3Ryc2oiGkGI2N3xAWogCGogD0ESdiAPQQ50ciAPQQN2cyAPQQd2IA9BGXRycyAGaiAUaiABQRN2IAFBDXRyIAFBCnZzIAFBEXYgAUEPdHJzaiIPQZaCk80BaiARaiAQIA0gCHNxIAhzaiAQQQZ2IBBBGnRyIBBBC3YgEEEVdHJzIBBBGXYgEEEHdHJzaiIIIARqIgQgECANc3EgDXNqIARBBnYgBEEadHIgBEELdiAEQRV0cnMgBEEZdiAEQQd0cnNqIhwgC2ohBiAJQRJ2IAlBDnRyIAlBA3ZzIAlBB3YgCUEZdHJzIApqIBZqIBpBE3YgGkENdHIgGkEKdnMgGkERdiAaQQ90cnNqIhFBtfnCpQNqIBBqIApBEnYgCkEOdHIgCkEDdnMgCkEHdiAKQRl0cnMgA2ogFWogD0ETdiAPQQ10ciAPQQp2cyAPQRF2IA9BD3Ryc2oiG0HM7qG6AmogDWogBiAEIBBzcSAQc2ogBkEGdiAGQRp0ciAGQQt2IAZBFXRycyAGQRl2IAZBB3Ryc2oiDSAMaiIOIAYgBHNxIARzaiAOQQZ2IA5BGnRyIA5BC3YgDkEVdHJzIA5BGXYgDkEHdHJzaiIlIAJqIQogAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIAxyIAtxIAIgDHFyaiAIaiIDQQJ2IANBHnRyIANBDXYgA0ETdHJzIANBFnYgA0EKdHJzIAMgAnIgDHEgAyACcXJqIBxqIhBBAnYgEEEedHIgEEENdiAQQRN0cnMgEEEWdiAQQQp0cnMgECADciACcSAQIANxcmogDWoiCEECdiAIQR50ciAIQQ12IAhBE3RycyAIQRZ2IAhBCnRycyAIIBByIANxIAggEHFyaiAlaiECIBJBEnYgEkEOdHIgEkEDdnMgEkEHdiASQRl0cnMgBWogAWogEUETdiARQQ10ciARQQp2cyARQRF2IBFBD3Ryc2oiC0HK1OL2BGogBmogBUESdiAFQQ50ciAFQQN2cyAFQQd2IAVBGXRycyAJaiAXaiAbQRN2IBtBDXRyIBtBCnZzIBtBEXYgG0EPdHJzaiIMQbOZ8MgDaiAEaiAKIA4gBnNxIAZzaiAKQQZ2IApBGnRyIApBC3YgCkEVdHJzIApBGXYgCkEHdHJzaiIFIANqIgQgCiAOc3EgDnNqIARBBnYgBEEadHIgBEELdiAEQRV0cnMgBEEZdiAEQQd0cnNqIgkgEGohBiATQRJ2IBNBDnRyIBNBA3ZzIBNBB3YgE0EZdHJzIAdqIA9qIAtBE3YgC0ENdHIgC0EKdnMgC0ERdiALQQ90cnNqIg1B89+5wQZqIApqIAdBEnYgB0EOdHIgB0EDdnMgB0EHdiAHQRl0cnMgEmogGWogDEETdiAMQQ10ciAMQQp2cyAMQRF2IAxBD3Ryc2oiHEHPlPPcBWogDmogBiAEIApzcSAKc2ogBkEGdiAGQRp0ciAGQQt2IAZBFXRycyAGQRl2IAZBB3Ryc2oiEiAIaiIHIAYgBHNxIARzaiAHQQZ2IAdBGnRyIAdBC3YgB0EVdHJzIAdBGXYgB0EHdHJzaiIOIAJqIQogAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIAhyIBBxIAIgCHFyaiAFaiIDQQJ2IANBHnRyIANBDXYgA0ETdHJzIANBFnYgA0EKdHJzIAMgAnIgCHEgAyACcXJqIAlqIgVBAnYgBUEedHIgBUENdiAFQRN0cnMgBUEWdiAFQQp0cnMgBSADciACcSAFIANxcmogEmoiCUECdiAJQR50ciAJQQ12IAlBE3RycyAJQRZ2IAlBCnRycyAJIAVyIANxIAkgBXFyaiAOaiECIBhBEnYgGEEOdHIgGEEDdnMgGEEHdiAYQRl0cnMgFGogG2ogDUETdiANQQ10ciANQQp2cyANQRF2IA1BD3Ryc2oiEEHvxpXFB2ogBmogFEESdiAUQQ50ciAUQQN2cyAUQQd2IBRBGXRycyATaiAaaiAcQRN2IBxBDXRyIBxBCnZzIBxBEXYgHEEPdHJzaiIUQe6FvqQHaiAEaiAKIAcgBnNxIAZzaiAKQQZ2IApBGnRyIApBC3YgCkEVdHJzIApBGXYgCkEHdHJzaiIIIANqIhIgCiAHc3EgB3NqIBJBBnYgEkEadHIgEkELdiASQRV0cnMgEkEZdiASQQd0cnNqIgQgBWohBiAWQRJ2IBZBDnRyIBZBA3ZzIBZBB3YgFkEZdHJzIBVqIAxqIBBBE3YgEEENdHIgEEEKdnMgEEERdiAQQQ90cnNqIhNBiISc5nhqIApqIBVBEnYgFUEOdHIgFUEDdnMgFUEHdiAVQRl0cnMgGGogEWogFEETdiAUQQ10ciAUQQp2cyAUQRF2IBRBD3Ryc2oiFUGU8KGmeGogB2ogBiASIApzcSAKc2ogBkEGdiAGQRp0ciAGQQt2IAZBFXRycyAGQRl2IAZBB3Ryc2oiGCAJaiIHIAYgEnNxIBJzaiAHQQZ2IAdBGnRyIAdBC3YgB0EVdHJzIAdBGXYgB0EHdHJzaiIQIAJqIQogAkECdiACQR50ciACQQ12IAJBE3RycyACQRZ2IAJBCnRycyACIAlyIAVxIAIgCXFyaiAIaiIDQQJ2IANBHnRyIANBDXYgA0ETdHJzIANBFnYgA0EKdHJzIAMgAnIgCXEgAyACcXJqIARqIgVBAnYgBUEedHIgBUENdiAFQRN0cnMgBUEWdiAFQQp0cnMgBSADciACcSAFIANxcmogGGoiCUECdiAJQR50ciAJQQ12IAlBE3RycyAJQRZ2IAlBCnRycyAJIAVyIANxIAkgBXFyaiAQaiECIAFBEnYgAUEOdHIgAUEDdnMgAUEHdiABQRl0cnMgF2ogHGogE0ETdiATQQ10ciATQQp2cyATQRF2IBNBD3Ryc2oiE0Hr2cGiemogBmogF0ESdiAXQQ50ciAXQQN2cyAXQQd2IBdBGXRycyAWaiALaiAVQRN2IBVBDXRyIBVBCnZzIBVBEXYgFUEPdHJzaiIVQfr/+4V5aiASaiAKIAcgBnNxIAZzaiAKQQZ2IApBGnRyIApBC3YgCkEVdHJzIApBGXYgCkEHdHJzaiISIANqIgYgCiAHc3EgB3NqIAZBBnYgBkEadHIgBkELdiAGQRV0cnMgBkEZdiAGQQd0cnNqIhggBWohAyABQffH5vd7aiAZQRJ2IBlBDnRyIBlBA3ZzIBlBB3YgGUEZdHJzaiANaiAVQRN2IBVBDXRyIBVBCnZzIBVBEXYgFUEPdHJzaiAHaiADIAYgCnNxIApzaiADQQZ2IANBGnRyIANBC3YgA0EVdHJzIANBGXYgA0EHdHJzaiIVIAlqIQcgACACQQJ2IAJBHnRyIAJBDXYgAkETdHJzIAJBFnYgAkEKdHJzIAIgCXIgBXEgAiAJcXJqIBJqIgBBAnYgAEEedHIgAEENdiAAQRN0cnMgAEEWdiAAQQp0cnMgACACciAJcSAAIAJxcmogGGoiAUECdiABQR50ciABQQ12IAFBE3RycyABQRZ2IAFBCnRycyABIAByIAJxIAEgAHFyaiAVaiIFIAFyIABxIAUgAXFyIB1qIAVBAnYgBUEedHIgBUENdiAFQRN0cnMgBUEWdiAFQQp0cnNqIBlB8vHFs3xqIA9BEnYgD0EOdHIgD0EDdnMgD0EHdiAPQRl0cnNqIBRqIBNBE3YgE0ENdHIgE0EKdnMgE0ERdiATQQ90cnNqIApqIAcgAyAGc3EgBnNqIAdBBnYgB0EadHIgB0ELdiAHQRV0cnMgB0EZdiAHQQd0cnNqIh1qNgIAIB4gBSAeKAIAajYCACAfIAEgHygCAGo2AgAgICAAICAoAgBqNgIAICIgAiAiKAIAaiAdajYCACAkIAcgJCgCAGo2AgAgIyADICMoAgBqNgIAICEgBiAhKAIAajYCAAveFgIefwl+IwQhCyMEQUBrJAQgCyACKAIArSIjIAEoAgCtIid+IiE+AgAgAkEEaiIYKAIArSImICd+IiKnIgYgIUIgiKdqIgUgIyABQQRqIhkoAgCtIiV+IiGnIgRqIgMgBEkgIUIgiKdqIQcgCyADNgIEIAUgBkkgIkIgiKdqIAdqIgUgAkEIaiIRKAIArSIkICd+IiGnIgRqIgMgBEkgIUIgiKdqIgkgBSAHSWoiByADICYgJX4iIaciBGoiAyAESSAhQiCIp2oiBmoiBSADICMgAUEIaiIaKAIArSIifiIhpyIDaiIEIANJICFCIIinaiIDaiEIIAsgBDYCCCAFIAZJIAcgCUlqIAggA0lqIAggAkEMaiISKAIArSIjICd+IiGnIgRqIgMgBEkgIUIgiKdqIghqIgkgAyAkICV+IiGnIgRqIgMgBEkgIUIgiKdqIgdqIgYgAyAmICJ+IiGnIgRqIgMgBEkgIUIgiKdqIgVqIQogAyACKAIArSIpIAFBDGoiGygCAK0iIn4iIaciA2oiBCADSSAhQiCIp2oiAyAKaiEMIAsgBDYCDCAGIAdJIAkgCElqIAogBUlqIAwgA0lqIAwgAkEQaiITKAIArSIoIAEoAgCtIid+IiGnIgRqIgMgBEkgIUIgiKdqIgxqIgggAyAjIBkoAgCtIiZ+IiGnIgRqIgMgBEkgIUIgiKdqIglqIgcgAyARKAIArSIlIBooAgCtIiN+IiGnIgRqIgMgBEkgIUIgiKdqIgZqIQ0gAyAYKAIArSIkICJ+IiGnIgRqIgMgBEkgIUIgiKdqIgUgDWohDiADICkgAUEQaiIcKAIArSIifiIhpyIDaiIEIANJICFCIIinaiIDIA5qIQogCyAENgIQIAcgCUkgCCAMSWogDSAGSWogDiAFSWogCiADSWogCiACQRRqIhQoAgCtICd+IiGnIgRqIgMgBEkgIUIgiKdqIgpqIgwgAyAoICZ+IiGnIgRqIgMgBEkgIUIgiKdqIghqIgkgAyASKAIArSAjfiIhpyIEaiIDIARJICFCIIinaiIHaiEPIAMgJSAbKAIArSIjfiIhpyIEaiIDIARJICFCIIinaiIGIA9qIRAgAyAkICJ+IiGnIgRqIgMgBEkgIUIgiKdqIgUgEGohDSADIAIoAgCtIAFBFGoiHSgCAK0iIn4iIaciA2oiBCADSSAhQiCIp2oiAyANaiEOIAsgBDYCFCAJIAhJIAwgCklqIA8gB0lqIBAgBklqIA0gBUlqIA4gA0lqIA4gAkEYaiIVKAIArSABKAIArX4iIaciBGoiAyAESSAhQiCIp2oiDmoiCiADIBQoAgCtIBkoAgCtfiIhpyIEaiIDIARJICFCIIinaiIMaiIIIAMgEygCAK0gGigCAK1+IiGnIgRqIgMgBEkgIUIgiKdqIglqIRYgAyASKAIArSAjfiIhpyIEaiIDIARJICFCIIinaiIHIBZqIRcgAyARKAIArSAcKAIArX4iIaciBGoiAyAESSAhQiCIp2oiBiAXaiEPIAMgGCgCAK0gIn4iIaciBGoiAyAESSAhQiCIp2oiBSAPaiEQIAMgAigCAK0gAUEYaiIeKAIArX4iIaciA2oiBCADSSAhQiCIp2oiAyAQaiENIAsgBDYCGCAIIAxJIAogDklqIBYgCUlqIBcgB0lqIA8gBklqIBAgBUlqIA0gA0lqIA0gAkEcaiIfKAIArSABKAIArX4iIaciBGoiAyAESSAhQiCIp2oiDmoiCiADIBUoAgCtIBkoAgCtfiIhpyIEaiIDIARJICFCIIinaiIMaiIIIAMgFCgCAK0gGigCAK1+IiGnIgRqIgMgBEkgIUIgiKdqIglqIRYgAyATKAIArSAbKAIArX4iIaciBGoiAyAESSAhQiCIp2oiByAWaiEXIAMgEigCAK0gHCgCAK1+IiGnIgRqIgMgBEkgIUIgiKdqIgYgF2ohDyADIBEoAgCtIB0oAgCtfiIhpyIEaiIDIARJICFCIIinaiIFIA9qIRAgAyAYKAIArSAeKAIArX4iIaciA2oiBCADSSAhQiCIp2oiAyAQaiENIAQgAigCAK0gAUEcaiIgKAIArX4iIaciAWoiAiABSSAhQiCIp2oiASANaiEEIAsgAjYCHCAIIAxJIAogDklqIBYgCUlqIBcgB0lqIA8gBklqIBAgBUlqIA0gA0lqIAQgAUlqIAQgHygCAK0gGSgCAK1+IiGnIgJqIgEgAkkgIUIgiKdqIgxqIgggASAVKAIArSAaKAIArSIjfiIhpyICaiIBIAJJICFCIIinaiIJaiIHIAEgFCgCAK0gGygCAK0iIn4iIaciAmoiASACSSAhQiCIp2oiBmohDyABIBMoAgCtIBwoAgCtIiV+IiGnIgJqIgEgAkkgIUIgiKdqIgUgD2ohECABIBIoAgCtIB0oAgCtIiR+IiGnIgJqIgEgAkkgIUIgiKdqIgQgEGohDSABIBEoAgCtIB4oAgCtIih+IiGnIgJqIgEgAkkgIUIgiKdqIgMgDWohDiABIBgoAgCtICAoAgCtIid+IiGnIgFqIgIgAUkgIUIgiKdqIgEgDmohCiALIAI2AiAgByAJSSAIIAxJaiAPIAZJaiAQIAVJaiANIARJaiAOIANJaiAKIAFJaiAKIB8oAgCtIiYgI34iIaciAmoiASACSSAhQiCIp2oiCGoiCSABIBUoAgCtIiMgIn4iIaciAmoiASACSSAhQiCIp2oiB2oiBiABIBQoAgCtIiIgJX4iIaciAmoiASACSSAhQiCIp2oiBWohDSABIBMoAgCtIiUgJH4iIaciAmoiASACSSAhQiCIp2oiBCANaiEOIAEgEigCAK0iJCAofiIhpyICaiIBIAJJICFCIIinaiIDIA5qIQogASARKAIArSAnfiIhpyIBaiICIAFJICFCIIinaiIBIApqIQwgCyACNgIkIAYgB0kgCSAISWogDSAFSWogDiAESWogCiADSWogDCABSWogDCAmIBsoAgCtfiIhpyICaiIBIAJJICFCIIinaiIJaiIHIAEgIyAcKAIArSIjfiIhpyICaiIBIAJJICFCIIinaiIGaiIFIAEgIiAdKAIArSIifiIhpyICaiIBIAJJICFCIIinaiIEaiEKIAEgJSAeKAIArSImfiIhpyICaiIBIAJJICFCIIinaiIDIApqIQwgASAkICAoAgCtIiV+IiGnIgFqIgIgAUkgIUIgiKdqIgEgDGohCCALIAI2AiggBSAGSSAHIAlJaiAKIARJaiAMIANJaiAIIAFJaiAIIB8oAgCtIiQgI34iIaciAmoiASACSSAhQiCIp2oiB2oiBiABIBUoAgCtIiMgIn4iIaciAmoiASACSSAhQiCIp2oiBWoiBCABIBQoAgCtIiIgJn4iIaciAmoiASACSSAhQiCIp2oiA2ohCCABIBMoAgCtICV+IiGnIgFqIgIgAUkgIUIgiKdqIgEgCGohCSALIAI2AiwgBCAFSSAGIAdJaiAIIANJaiAJIAFJaiAJICQgHSgCAK1+IiGnIgJqIgEgAkkgIUIgiKdqIgZqIgUgASAjIB4oAgCtIiN+IiGnIgJqIgEgAkkgIUIgiKdqIgRqIgMgASAiICAoAgCtIiR+IiGnIgFqIgIgAUkgIUIgiKdqIgFqIQcgCyACNgIwIAMgBEkgBSAGSWogByABSWogByAfKAIArSIiICN+IiGnIgJqIgEgAkkgIUIgiKdqIgVqIgQgASAVKAIArSAkfiIhpyICaiIBIAJJICFCIIinaiIDaiEGIAsgATYCNCALIAYgIiAkfiIhpyICaiIBNgI4IAsgBCAFSSAhQiCIp2ogBiADSWogASACSWo2AjwgACALECwgCyQEC8wFAgt/AX4gACABLQAeQQh0IAEtAB9yIAEtAB1BEHRyIAEtABxBGHRyNgIAIABBBGoiBiABLQAaQQh0IAEtABtyIAEtABlBEHRyIAEtABhBGHRyNgIAIABBCGoiByABLQAWQQh0IAEtABdyIAEtABVBEHRyIAEtABRBGHRyNgIAIABBDGoiCCABLQASQQh0IAEtABNyIAEtABFBEHRyIAEtABBBGHRyIgQ2AgAgAEEQaiIJIAEtAA5BCHQgAS0AD3IgAS0ADUEQdHIgAS0ADEEYdHIiAzYCACAAQRRqIgogAS0ACkEIdCABLQALciABLQAJQRB0ciABLQAIQRh0ciIFNgIAIABBGGoiCyABLQAGQQh0IAEtAAdyIAEtAAVBEHRyIAEtAARBGHRyIg02AgAgAEEcaiIMIAEtAAJBCHQgAS0AA3IgAS0AAUEQdHIgAS0AAEEYdHIiATYCACAAQQAgA0F+SSAFQX9HIAEgDXFBf0dyciIBQQFzIANBf0ZxIgNBAXMgBEHmubvVe0lxIAFyIgVBAXMgBEHmubvVe0txIANyIgRBAXMgBygCACIBQbvAovp6SXEgBXIiA0EBcyABQbvAovp6S3EgBHIiBUEBcyAGKAIAIgRBjL3J/ntJcSADckF/cyIDIARBjL3J/ntLcSAFciADIAAoAgAiBUHAgtmBfUtxciIDayIAQb/9pv4Cca0gBa18Ig4+AgAgBiAAQfPCtoEEca0gBK18IA5CIIh8Ig4+AgAgByAAQcS/3YUFca0gAa18IA5CIIh8Ig4+AgAgCCAAQZnGxKoEca0gCCgCAK18IA5CIIh8Ig4+AgAgCSADrSAJKAIArXwgDkIgiHwiDj4CACAKIA5CIIggCigCAK18Ig4+AgAgCyAOQiCIIAsoAgCtfCIOPgIAIAwgDkIgiCAMKAIArXw+AgAgAkUEQA8LIAIgAzYCAAuOBAEUfyAAQSRqIgwoAgAiBUEWdiIBQdEHbCAAKAIAaiECQQAgAUEGdCAAQQRqIg0oAgBqIAJBGnZqIgNBGnYgAEEIaiIOKAIAaiIBQRp2IABBDGoiDygCAGoiBkEadiAAQRBqIhAoAgBqIgdBGnYgAEEUaiIRKAIAaiIIQRp2IABBGGoiEigCAGoiBEEadiAAQRxqIhMoAgBqIglBGnYgAEEgaiIUKAIAaiILQRp2IAVB////AXFqIgVBFnYgA0H///8fcSIDQUBrIAJB////H3EiAkHRB2pBGnZqQf///x9LIAYgAXEgB3EgCHEgBEH///8fcSIEcSAJcSALcUH///8fRiAFQf///wFGcXFyIgprQdEHcSACaiECIApBBnQgA2ogAkEadmoiA0EadiABQf///x9xaiIKQRp2IAZB////H3FqIgZBGnYgB0H///8fcWoiB0EadiAIQf///x9xaiIIQRp2IARqIgRBGnYgCUH///8fcWoiCUEadiALQf///x9xaiEBIAAgAkH///8fcTYCACANIANB////H3E2AgAgDiAKQf///x9xNgIAIA8gBkH///8fcTYCACAQIAdB////H3E2AgAgESAIQf///x9xNgIAIBIgBEH///8fcTYCACATIAlB////H3E2AgAgFCABQf///x9xNgIAIAwgAUEadiAFakH///8BcTYCAAuhFwEnfyMEIQQjBEHAA2okBCACKAJQIQYgASgCeARAIAAgBjYCeCAAIAIpAgA3AgAgACACKQIINwIIIAAgAikCEDcCECAAIAIpAhg3AhggACACKQIgNwIgIABBKGoiAyACQShqIgEpAgA3AgAgAyABKQIINwIIIAMgASkCEDcCECADIAEpAhg3AhggAyABKQIgNwIgIABBATYCUCAAQdQAaiIAQgA3AgAgAEIANwIIIABCADcCECAAQgA3AhggAEEANgIgIAQkBA8LIAYEQCADBEAgA0EBNgIAIANBBGoiAkIANwIAIAJCADcCCCACQgA3AhAgAkIANwIYIAJBADYCIAsgACABKQIANwIAIAAgASkCCDcCCCAAIAEpAhA3AhAgACABKQIYNwIYIAAgASkCIDcCICAAIAEpAig3AiggACABKQIwNwIwIAAgASkCODcCOCAAQUBrIAFBQGspAgA3AgAgACABKQJINwJIIAAgASkCUDcCUCAAIAEpAlg3AlggACABKQJgNwJgIAAgASkCaDcCaCAAIAEpAnA3AnAgACABKAJ4NgJ4IAQkBA8LIARB+ABqIQwgBEHQAGohJCAEQShqIQogAEH4AGoiKUEANgIAIARBkANqIiUgAUHQAGoiJhAHIARB6AJqIgggASkCADcCACAIIAEpAgg3AgggCCABKQIQNwIQIAggASkCGDcCGCAIIAEpAiA3AiAgCEEkaiIdKAIAIhNBFnYiBkHRB2wgCCgCAGohGyAGQQZ0IAhBBGoiFygCAGogG0EadmoiGEEadiAIQQhqIhkoAgBqIhpBGnYgCEEMaiIFKAIAaiIHQRp2IAhBEGoiDSgCAGoiFEEadiAIQRRqIhUoAgBqIg5BGnYgCEEYaiIPKAIAaiIQQRp2IAhBHGoiESgCAGoiEkEadiAIQSBqIgYoAgBqIRwgCCAbQf///x9xIio2AgAgFyAYQf///x9xIgs2AgAgGSAaQf///x9xIh42AgAgBSAHQf///x9xIh82AgAgDSAUQf///x9xIiA2AgAgFSAOQf///x9xIiE2AgAgDyAQQf///x9xIiI2AgAgESASQf///x9xIiM2AgAgBiAcQf///x9xIhs2AgAgHSAcQRp2IBNB////AXFqIhw2AgAgBEHAAmoiFiACICUQCiAEQZgCaiIJIAFBKGoiBikCADcCACAJIAYpAgg3AgggCSAGKQIQNwIQIAkgBikCGDcCGCAJIAYpAiA3AiAgCUEkaiInKAIAIh1BFnYiBkHRB2wgCSgCAGohDSAGQQZ0IAlBBGoiEygCAGogDUEadmoiFEEadiAJQQhqIhcoAgBqIhVBGnYgCUEMaiIYKAIAaiIOQRp2IAlBEGoiGSgCAGoiD0EadiAJQRRqIhooAgBqIhBBGnYgCUEYaiIFKAIAaiIRQRp2IAlBHGoiBygCAGoiEkEadiAJQSBqIgYoAgBqISggCSANQf///x9xIg02AgAgEyAUQf///x9xIhQ2AgAgFyAVQf///x9xIhU2AgAgGCAOQf///x9xIg42AgAgGSAPQf///x9xIg82AgAgGiAQQf///x9xIhA2AgAgBSARQf///x9xIhE2AgAgByASQf///x9xIhI2AgAgBiAoQf///x9xIgY2AgAgJyAoQRp2IB1B////AXFqNgIAIARB8AFqIgcgAkEoaiAlEAogByAHICYQCiAEQcgBaiIFQbzh//8AICprIBYoAgBqNgIAIAVB/P3//wAgC2sgFigCBGo2AgQgBUH8////ACAeayAWKAIIajYCCCAFQfz///8AIB9rIBYoAgxqNgIMIAVB/P///wAgIGsgFigCEGo2AhAgBUH8////ACAhayAWKAIUajYCFCAFQfz///8AICJrIBYoAhhqNgIYIAVB/P///wAgI2sgFigCHGo2AhwgBUH8////ACAbayAWKAIgajYCICAFQfz//wcgHGsgFigCJGo2AiRB/P//ByAnKAIAayECIARBoAFqIgtBvOH//wAgDWsgBygCAGo2AgAgC0H8/f//ACAUayAHKAIEajYCBCALQfz///8AIBVrIAcoAghqNgIIIAtB/P///wAgDmsgBygCDGo2AgwgC0H8////ACAPayAHKAIQajYCECALQfz///8AIBBrIAcoAhRqNgIUIAtB/P///wAgEWsgBygCGGo2AhggC0H8////ACASayAHKAIcajYCHCALQfz///8AIAZrIAcoAiBqNgIgIAsgAiAHKAIkajYCJCAFEBdFBEAgDCALEAcgJCAFEAcgCiAFICQQCiADBEAgAyAFKQIANwIAIAMgBSkCCDcCCCADIAUpAhA3AhAgAyAFKQIYNwIYIAMgBSkCIDcCIAsgAEHQAGogJiAFEAogBCAIICQQCiAAIAQpAgA3AgAgACAEKQIINwIIIAAgBCkCEDcCECAAIAQpAhg3AhggACAEKQIgNwIgQfj7//8BIABBBGoiEygCAEEBdCAKQQRqIh4oAgBqayEOQfj///8BIABBCGoiFygCAEEBdCAKQQhqIh8oAgBqayEPQfj///8BIABBDGoiGCgCAEEBdCAKQQxqIiAoAgBqayEQQfj///8BIABBEGoiGSgCAEEBdCAKQRBqIiEoAgBqayERQfj///8BIABBFGoiGigCAEEBdCAKQRRqIiIoAgBqayESQfj///8BIABBGGoiBSgCAEEBdCAKQRhqIiMoAgBqayEGQfj///8BIABBHGoiBygCAEEBdCAKQRxqIhsoAgBqayEDQfj///8BIABBIGoiDSgCAEEBdCAKQSBqIhwoAgBqayECQfj//w8gAEEkaiIUKAIAQQF0IApBJGoiHSgCAGprIQEgAEH4wv//ASAAKAIAQQF0IAooAgBqayAMKAIAaiIVNgIAIBMgDiAMKAIEaiIONgIAIBcgDyAMKAIIaiIPNgIAIBggECAMKAIMaiIQNgIAIBkgESAMKAIQaiIRNgIAIBogEiAMKAIUaiISNgIAIAUgBiAMKAIYaiIGNgIAIAcgAyAMKAIcaiIDNgIAIA0gAiAMKAIgaiICNgIAIBQgASAMKAIkaiIBNgIAIABBKGoiE0G0pP//AiAVayAEKAIAajYCACAAQSxqIhdB9Pn//wIgDmsgBCgCBGo2AgAgAEEwaiIYQfT///8CIA9rIAQoAghqNgIAIABBNGoiGUH0////AiAQayAEKAIMajYCACAAQThqIhpB9P///wIgEWsgBCgCEGo2AgAgAEE8aiIFQfT///8CIBJrIAQoAhRqNgIAIABBQGsiB0H0////AiAGayAEKAIYajYCACAAQcQAaiINQfT///8CIANrIAQoAhxqNgIAIABByABqIhRB9P///wIgAmsgBCgCIGo2AgAgAEHMAGoiFUH0//8XIAFrIAQoAiRqNgIAIBMgEyALEAogCiAKIAkQCiAKQbzh//8AIAooAgBrIg42AgAgHkH8/f//ACAeKAIAayIPNgIAIB9B/P///wAgHygCAGsiEDYCACAgQfz///8AICAoAgBrIhE2AgAgIUH8////ACAhKAIAayISNgIAICJB/P///wAgIigCAGsiBjYCACAjQfz///8AICMoAgBrIgM2AgAgG0H8////ACAbKAIAayICNgIAIBxB/P///wAgHCgCAGsiATYCACAdQfz//wcgHSgCAGsiADYCACATIBMoAgAgDmo2AgAgFyAXKAIAIA9qNgIAIBggGCgCACAQajYCACAZIBkoAgAgEWo2AgAgGiAaKAIAIBJqNgIAIAUgBSgCACAGajYCACAHIAcoAgAgA2o2AgAgDSANKAIAIAJqNgIAIBQgFCgCACABajYCACAVIBUoAgAgAGo2AgAgBCQEDwsgCxAXBEAgACABIAMQGiAEJAQPCyADBEAgA0IANwIAIANCADcCCCADQgA3AhAgA0IANwIYIANCADcCIAsgKUEBNgIAIAQkBAuvAwEBfyAAIAFBHGoiAigCAEEYdjoAACAAIAIoAgBBEHY6AAEgACACKAIAQQh2OgACIAAgAigCADoAAyAAIAFBGGoiAigCAEEYdjoABCAAIAIoAgBBEHY6AAUgACACKAIAQQh2OgAGIAAgAigCADoAByAAIAFBFGoiAigCAEEYdjoACCAAIAIoAgBBEHY6AAkgACACKAIAQQh2OgAKIAAgAigCADoACyAAIAFBEGoiAigCAEEYdjoADCAAIAIoAgBBEHY6AA0gACACKAIAQQh2OgAOIAAgAigCADoADyAAIAFBDGoiAigCAEEYdjoAECAAIAIoAgBBEHY6ABEgACACKAIAQQh2OgASIAAgAigCADoAEyAAIAFBCGoiAigCAEEYdjoA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BxAHIAcgBxAHIAcgBxAHIAcgBxAHIAcgBxAHIAcgByAGEAogBEHIAWoiBSAHKQIANwIAIAUgBykCCDcCCCAFIAcpAhA3AhAgBSAHKQIYNwIYIAUgBykCIDcCICAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUQByAFIAUgBxAKIARBoAFqIgIgBSkCADcCACACIAUpAgg3AgggAiAFKQIQNwIQIAIgBSkCGDcCGCACIAUpAiA3AiAgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACEAcgAiACIAUQCiAEQfgAaiIJIAIpAgA3AgAgCSACKQIINwIIIAkgAikCEDcCECAJIAIpAhg3AhggCSACKQIgNwIgQQAhBgNAIAkgCRAHIAZBAWoiBkHYAEcNAAsgCSAJIAIQCiADIAkpAgA3AgAgAyAJKQIINwIIIAMgCSkCEDcCECADIAkpAhg3AhggAyAJKQIgNwIgIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAxAHIAMgAyAFEAogCCADKQIANwIAIAggAykCCDcCCCAIIAMpAhA3AhAgCCADKQIYNwIYIAggAykCIDcCICAIIAgQByAIIAgQByAIIAgQByAIIAggChAKIAQgCCkCADcCACAEIAgpAgg3AgggBCAIKQIQNwIQIAQgCCkCGDcCGCAEIAgpAiA3AiAgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEIAcQCiAEIAQQByAEIAQQByAEIAQQByAEIAQQByAEIAQQByAEIAQgARAKIAQgBBAHIAQgBBAHIAQgBBAHIAQgBCALEAogBCAEEAcgBCAEEAcgACABIAQQCiAEJAQL7gQBG38gAEEkaiILKAIAIgJBFnYiAUHRB2wgACgCAGohBCABQQZ0IABBBGoiDCgCAGogBEEadmoiBUEadiAAQQhqIg0oAgBqIgZB////H3EhByAGQRp2IABBDGoiDigCAGoiCEEadiAAQRBqIg8oAgBqIQEgCEH///8fcSEJIAFB////H3EhCiABQRp2IABBFGoiECgCAGoiEUEadiAAQRhqIhIoAgBqIRMgEUH///8fcSEUIBNBGnYgAEEcaiIVKAIAaiIWQRp2IABBIGoiFygCAGohAyAWQf///x9xIRggA0H///8fcSEZIANBGnYgAkH///8BcWoiAkEWdiAFQf///x9xIgVBQGsgBEH///8fcSIEQdEHaiIaQRp2IhtqQf///x9LIAggBnEgAXEgEXEgE0H///8fcSIBcSAWcSADcUH///8fRiACQf///wFGcXFyIgNFBEAgACAENgIAIAwgBTYCACANIAc2AgAgDiAJNgIAIA8gCjYCACAQIBQ2AgAgEiABNgIAIBUgGDYCACAXIBk2AgAgCyACNgIADwsgGyAFaiADQQZ0aiIDQRp2IAdqIgRBGnYgCWoiBkEadiAKaiIHQRp2IBRqIghBGnYgAWoiAUEadiAYaiIJQRp2IBlqIgpBGnYgAmpB////AXEhAiAAIBpB////H3E2AgAgDCADQf///x9xNgIAIA0gBEH///8fcTYCACAOIAZB////H3E2AgAgDyAHQf///x9xNgIAIBAgCEH///8fcTYCACASIAFB////H3E2AgAgFSAJQf///x9xNgIAIBcgCkH///8fcTYCACALIAI2AgALsAIBCn8gACgCJCIBQRZ2IgJB0QdsIAAoAgBqIgNB////H3EiBEHQB3MhBSAEQQBHIAVB////H0dxBEBBAA8LIANBGnYgAkEGdHIgACgCBGoiAkEadiAAKAIIaiIDQRp2IAAoAgxqIgZBGnYgACgCEGoiB0EadiAAKAIUaiIIQRp2IAAoAhhqIglBGnYgACgCHGoiCkEadiAAKAIgaiIAQRp2IAFB////AXFqIQEgAkHAAHMgBXEgA3EgBnEgB3EgCHEgCXEgCnEgAHEgAUGAgIAec3FB////H0YEf0EBBSACQf///x9xIARyIANB////H3FyIAZB////H3FyIAdB////H3FyIAhB////H3FyIAlB////H3FyIApB////H3FyIABB////H3FyIAFyRQtBAXELmAIBBH8gACACaiEEIAFB/wFxIQEgAkHDAE4EQANAIABBA3EEQCAAIAE6AAAgAEEBaiEADAELCyAEQXxxIgVBQGohBiABIAFBCHRyIAFBEHRyIAFBGHRyIQMDQCAAIAZMBEAgACADNgIAIAAgAzYCBCAAIAM2AgggACADNgIMIAAgAzYCECAAIAM2AhQgACADNgIYIAAgAzYCHCAAIAM2AiAgACADNgIkIAAgAzYCKCAAIAM2AiwgACADNgIwIAAgAzYCNCAAIAM2AjggACADNgI8IABBQGshAAwBCwsDQCAAIAVIBEAgACADNgIAIABBBGohAAwBCwsLA0AgACAESARAIAAgAToAACAAQQFqIQAMAQsLIAQgAmsLqy8BnwF/IwQhDSMEQbAmaiQEIA1BgCZqIQ4gDUHYJWohESANQdgkaiEGIA1BhCRqIRIgDUGwI2ohDCANQcgfaiEWIA1ByBdqIUkgDUHoD2ohBSANQagNaiEJIA1BiAhqIQsCfwJAIAMoAgQgAygCAHIgAygCCHIgAygCDHIgAygCEHIgAygCFHIgAygCGHIgAygCHHJFDQAgAigCeA0AIA1BhAhqIgpBADYCACANQYAIaiANIANBBRArIgM2AgAgBiACIAooAgAiD0H8AGxqIhBBABAaIAwgBikCADcCACAMIAYpAgg3AgggDCAGKQIQNwIQIAwgBikCGDcCGCAMIAYpAiA3AiAgDEEoaiIKIAZBKGoiCCkCADcCACAKIAgpAgg3AgggCiAIKQIQNwIQIAogCCkCGDcCGCAKIAgpAiA3AiAgDEEANgJQIA4gBkHQAGoiChAHIBEgDiAKEAogEiAQIA4QCiASQShqIgggAiAPQfwAbGpBKGogERAKIBIgAiAPQfwAbGooAng2AlAgBSASKQIANwIAIAUgEikCCDcCCCAFIBIpAhA3AhAgBSASKQIYNwIYIAUgEikCIDcCICAFQShqIhAgCCkCADcCACAQIAgpAgg3AgggECAIKQIQNwIQIBAgCCkCGDcCGCAQIAgpAiA3AiAgBUHQAGoiCCACIA9B/ABsakHQAGoiAikCADcCACAIIAIpAgg3AgggCCACKQIQNwIQIAggAikCGDcCGCAIIAIpAiA3AiAgBUH4AGoiE0EANgIAIAkgCikCADcCACAJIAopAgg3AgggCSAKKQIQNwIQIAkgCikCGDcCGCAJIAopAiA3AiAgBUH8AGoiAiAFIAwgCUEoaiIUEBAgBUH4AWoiCCACIAwgCUHQAGoiBxAQIAVB9AJqIgIgCCAMIAlB+ABqIh0QECAFQfADaiIIIAIgDCAJQaABaiIeEBAgBUHsBGoiAiAIIAwgCUHIAWoiHxAQIAVB6AVqIg8gAiAMIAlB8AFqIiEQECAFQeQGaiIIIA8gDCAJQZgCaiIPEBAgBUG0B2oiAiACIAoQCiALQcwEaiIJIAgpAgA3AgAgCSAIKQIINwIIIAkgCCkCEDcCECAJIAgpAhg3AhggCSAIKQIgNwIgIAtB9ARqIgkgBUGMB2oiCikCADcCACAJIAopAgg3AgggCSAKKQIQNwIQIAkgCikCGDcCGCAJIAopAiA3AiAgC0GYBWoiIigCACIjQRZ2IghB0QdsIAkoAgBqIQogCEEGdCALQfgEaiIkKAIAaiAKQRp2aiIlQRp2IAtB/ARqIiYoAgBqIidBGnYgC0GABWoiKCgCAGoiKUEadiALQYQFaiIqKAIAaiIrQRp2IAtBiAVqIiwoAgBqIi1BGnYgC0GMBWoiLigCAGoiL0EadiALQZAFaiIwKAIAaiIxQRp2IAtBlAVqIjIoAgBqIQggCSAKQf///x9xNgIAICQgJUH///8fcTYCACAmICdB////H3E2AgAgKCApQf///x9xNgIAICogK0H///8fcTYCACAsIC1B////H3E2AgAgLiAvQf///x9xNgIAIDAgMUH///8fcTYCACAyIAhB////H3E2AgAgIiAIQRp2ICNB////AXFqNgIAIBYgAikCADcCACAWIAIpAgg3AgggFiACKQIQNwIQIBYgAikCGDcCGCAWIAIpAiA3AiAgC0EANgKcBSAGIA8pAgA3AgAgBiAPKQIINwIIIAYgDykCEDcCECAGIA8pAhg3AhggBiAPKQIgNwIgIA4gBhAHIBEgDiAGEAogC0H4A2ogBUHoBWogDhAKIAtBoARqIAVBkAZqIBEQCiALIAUoAuAGNgLIBCAGIAYgIRAKIA4gBhAHIBEgDiAGEAogC0GkA2ogBUHsBGogDhAKIAtBzANqIAVBlAVqIBEQCiALIAUoAuQFNgL0AyAGIAYgHxAKIA4gBhAHIBEgDiAGEAogC0HQAmogBUHwA2ogDhAKIAtB+AJqIAVBmARqIBEQCiALIAUoAugENgKgAyAGIAYgHhAKIA4gBhAHIBEgDiAGEAogC0H8AWogBUH0AmogDhAKIAtBpAJqIAVBnANqIBEQCiALIAUoAuwDNgLMAiAGIAYgHRAKIA4gBhAHIBEgDiAGEAogC0GoAWogBUH4AWogDhAKIAtB0AFqIAVBoAJqIBEQCiALIAUoAvACNgL4ASAGIAYgBxAKIA4gBhAHIBEgDiAGEAogC0HUAGogBUH8AGogDhAKIAtB/ABqIAVBpAFqIBEQCiALIAUoAvQBNgKkASAGIAYgFBAKIA4gBhAHIBEgDiAGEAogCyAFIA4QCiALQShqIBAgERAKIAsgEygCADYCUEEBIUogA0EASgR/IAMFQQALDAELIBZBATYCACAWQQRqIgJCADcCACACQgA3AgggAkIANwIQIAJCADcCGCACQQA2AiBBASFLQQALIQIgBARAIEkgBEEPECsiAyFMIAMgAkoEQCADIQILCyABQfgAaiIdQQE2AgAgAUIANwIAIAFCADcCCCABQgA3AhAgAUIANwIYIAFCADcCICABQgA3AiggAUIANwIwIAFCADcCOCABQUBrQgA3AgAgAUIANwJIIAFCADcCUCABQgA3AlggAUIANwJgIAFCADcCaCABQgA3AnAgAkEATARAIA0kBA8LIA1B6CFqISsgDUHwIGohLCANQcggaiFNIA1B8B9qIgVB0ABqIWogAUHQAGohHiAGQQRqIU4gBkEIaiFPIAZBDGohUCAGQRBqIVEgBkEUaiFSIAZBGGohUyAGQRxqIVQgBkEgaiFVIAZBJGohViABQShqIRMgDEEEaiFXIAxBCGohWCAMQQxqIVkgDEEQaiFaIAxBFGohWyAMQRhqIVwgDEEcaiFdIAxBIGohXiAMQSRqIV8gBUEoaiFgIA1B4CJqIghBBGohayAIQQhqIWwgCEEMaiFtIAhBEGohbiAIQRRqIW8gCEEYaiFwIAhBHGohcSAIQSBqIXIgCEEkaiFzIBJBBGohdCASQQhqIXUgEkEMaiF2IBJBEGohdyASQRRqIXggEkEYaiF5IBJBHGoheiASQSBqIXsgEkEkaiF8IA1BuCJqIhBBBGohfSAQQQhqIX4gEEEMaiF/IBBBEGohgAEgEEEUaiGBASAQQRhqIYIBIBBBHGohgwEgEEEgaiGEASAQQSRqIYUBIA1BiCNqIg9BBGohhgEgD0EIaiGHASAPQQxqIYgBIA9BEGohiQEgD0EUaiGKASAPQRhqIYsBIA9BHGohjAEgD0EgaiGNASAPQSRqIY4BIAFBBGohYSABQQhqIWIgAUEMaiFjIAFBEGohZCABQRRqIWUgAUEYaiFmIAFBHGohZyABQSBqIWggAUEkaiFpIA1BwCFqIgpBBGohLSAKQQhqIS4gCkEMaiEvIApBEGohMCAKQRRqITEgCkEYaiEyIApBHGohOSAKQSBqITogCkEkaiE7IA1BkCJqIhRBBGohjwEgFEEIaiGQASAUQQxqIZEBIBRBEGohkgEgFEEUaiGTASAUQRhqIZQBIBRBHGohlQEgFEEgaiGWASAUQSRqIZcBIAFBLGohPCABQTBqIT0gAUE0aiE+IAFBOGohPyABQTxqIUAgAUFAayFBIAFBxABqIUIgAUHIAGohQyABQcwAaiFEIA1BmCFqIglBBGohmAEgCUEIaiGZASAJQQxqIZoBIAlBEGohmwEgCUEUaiGcASAJQRhqIZ0BIAlBHGohngEgCUEgaiGfASAJQSRqIaABIAFB0ABqIaEBIAFB1ABqIR8gBUEoaiEhIAVBLGohIiAFQTBqISMgBUE0aiEkIAVBOGohJSAFQTxqISYgBUFAayEnIAVBxABqISggBUHIAGohKSAFQcwAaiEqIA1BgAhqKAIAIaIBA0AgAkF/aiEEIAEgAUEAEBogSyACIKIBSnJFBEBBACEDA0AgDSADQYgIbGogBEECdGooAgAiBwRAIAsgA0EDdEHUAGxqIRUgB0EASgRAIAUgFSAHQX9qQQJtQdQAbGoiBykCADcCACAFIAcpAgg3AgggBSAHKQIQNwIQIAUgBykCGDcCGCAFIAcpAiA3AiAgBSAHKQIoNwIoIAUgBykCMDcCMCAFIAcpAjg3AjggBUFAayAHQUBrKQIANwIAIAUgBykCSDcCSCAFIAcoAlA2AlAFIAUgFSAHQX9zQQJtQdQAbGoiBykCADcCACAFIAcpAgg3AgggBSAHKQIQNwIQIAUgBykCGDcCGCAFIAcpAiA3AiAgBSAHKQIoNwIoIAUgBykCMDcCMCAFIAcpAjg3AjggBUFAayAHQUBrKQIANwIAIAUgBykCSDcCSCAFIAcoAlA2AlAgIUG84f//ACAhKAIAazYCACAiQfz9//8AICIoAgBrNgIAICNB/P///wAgIygCAGs2AgAgJEH8////ACAkKAIAazYCACAlQfz///8AICUoAgBrNgIAICZB/P///wAgJigCAGs2AgAgJ0H8////ACAnKAIAazYCACAoQfz///8AICgoAgBrNgIAIClB/P///wAgKSgCAGs2AgAgKkH8//8HICooAgBrNgIACyABIAEgBUEAEBALIANBAWoiAyBKRw0ACwsgAiBMTARAIEkgBEECdGooAgAiAwRAIAAoAgAhByADQQBKBEAgBSAHIANBf2pBAm1BBnRqECMFIAUgByADQX9zQQJtQQZ0ahAjICFBvOH//wAgISgCAGs2AgAgIkH8/f//ACAiKAIAazYCACAjQfz///8AICMoAgBrNgIAICRB/P///wAgJCgCAGs2AgAgJUH8////ACAlKAIAazYCACAmQfz///8AICYoAgBrNgIAICdB/P///wAgJygCAGs2AgAgKEH8////ACAoKAIAazYCACApQfz///8AICkoAgBrNgIAICpB/P//ByAqKAIAazYCAAsCQCBqKAIARQRAIB0oAgAEQCAdQQA2AgAgLCAWEAcgTSAsIBYQCiABIAUgLBAKIBMgYCBNEAogoQFBATYCACAfQgA3AgAgH0IANwIIIB9CADcCECAfQgA3AhggH0EANgIgDAILIB1BADYCACAOIB4gFhAKIBEgDhAHIAYgASkCADcCACAGIAEpAgg3AgggBiABKQIQNwIQIAYgASkCGDcCGCAGIAEpAiA3AiAgVigCACIVQRZ2IgdB0QdsIAYoAgBqIQMgB0EGdCBOKAIAaiADQRp2aiIXQRp2IE8oAgBqIhhBGnYgUCgCAGoiGUEadiBRKAIAaiIaQRp2IFIoAgBqIhtBGnYgUygCAGoiHEEadiBUKAIAaiIgQRp2IFUoAgBqIQcgBiADQf///x9xIkU2AgAgTiAXQf///x9xIhc2AgAgTyAYQf///x9xIhg2AgAgUCAZQf///x9xIhk2AgAgUSAaQf///x9xIho2AgAgUiAbQf///x9xIhs2AgAgUyAcQf///x9xIhw2AgAgVCAgQf///x9xIiA2AgAgVSAHQf///x9xIkY2AgAgViAHQRp2IBVB////AXFqIhU2AgAgEiAFIBEQCiAMIBMpAgA3AgAgDCATKQIINwIIIAwgEykCEDcCECAMIBMpAhg3AhggDCATKQIgNwIgIF8oAgAiR0EWdiIHQdEHbCAMKAIAaiEDIAdBBnQgVygCAGogA0EadmoiM0EadiBYKAIAaiI0QRp2IFkoAgBqIjVBGnYgWigCAGoiNkEadiBbKAIAaiI3QRp2IFwoAgBqIjhBGnYgXSgCAGoiSEEadiBeKAIAaiEHIAwgA0H///8fcSIDNgIAIFcgM0H///8fcSIzNgIAIFggNEH///8fcSI0NgIAIFkgNUH///8fcSI1NgIAIFogNkH///8fcSI2NgIAIFsgN0H///8fcSI3NgIAIFwgOEH///8fcSI4NgIAIF0gSEH///8fcSJINgIAIF4gB0H///8fcSKjATYCACBfIAdBGnYgR0H///8BcWoiBzYCACAPIGAgERAKIA8gDyAOEAogCEG84f//ACBFayASKAIAajYCACBrQfz9//8AIBdrIHQoAgBqNgIAIGxB/P///wAgGGsgdSgCAGo2AgAgbUH8////ACAZayB2KAIAajYCACBuQfz///8AIBprIHcoAgBqNgIAIG9B/P///wAgG2sgeCgCAGo2AgAgcEH8////ACAcayB5KAIAajYCACBxQfz///8AICBrIHooAgBqNgIAIHJB/P///wAgRmsgeygCAGo2AgAgc0H8//8HIBVrIHwoAgBqNgIAIBBBvOH//wAgA2sgDygCAGo2AgAgfUH8/f//ACAzayCGASgCAGo2AgAgfkH8////ACA0ayCHASgCAGo2AgAgf0H8////ACA1ayCIASgCAGo2AgAggAFB/P///wAgNmsgiQEoAgBqNgIAIIEBQfz///8AIDdrIIoBKAIAajYCACCCAUH8////ACA4ayCLASgCAGo2AgAggwFB/P///wAgSGsgjAEoAgBqNgIAIIQBQfz///8AIKMBayCNASgCAGo2AgAghQFB/P//ByAHayCOASgCAGo2AgAgCBAXRQRAIBQgEBAHICsgCBAHIAogCCArEAogHiAeIAgQCiAJIAYgKxAKIAEgCSkCADcCACABIAkpAgg3AgggASAJKQIQNwIQIAEgCSkCGDcCGCABIAkpAiA3AiAgLSgCACEDIC4oAgAhByAvKAIAIRUgMCgCACEXIDEoAgAhGCAyKAIAIRkgOSgCACEaIDooAgAhGyA7KAIAIRwgYSgCAEF+bCEgIGIoAgBBfmwhRSBjKAIAQX5sIUYgZCgCAEF+bCFHIGUoAgBBfmwhMyBmKAIAQX5sITQgZygCAEF+bCE1IGgoAgBBfmwhNiBpKAIAQX5sITcgASABKAIAQX5sQfjC//8BaiAKKAIAayAUKAIAaiI4NgIAIGEgIEH4+///AWogA2sgjwEoAgBqIgM2AgAgYiBFQfj///8BaiAHayCQASgCAGoiBzYCACBjIEZB+P///wFqIBVrIJEBKAIAaiIVNgIAIGQgR0H4////AWogF2sgkgEoAgBqIhc2AgAgZSAzQfj///8BaiAYayCTASgCAGoiGDYCACBmIDRB+P///wFqIBlrIJQBKAIAaiIZNgIAIGcgNUH4////AWogGmsglQEoAgBqIho2AgAgaCA2Qfj///8BaiAbayCWASgCAGoiGzYCACBpIDdB+P//D2ogHGsglwEoAgBqIhw2AgAgE0G0pP//AiA4ayAJKAIAajYCACA8QfT5//8CIANrIJgBKAIAajYCACA9QfT///8CIAdrIJkBKAIAajYCACA+QfT///8CIBVrIJoBKAIAajYCACA/QfT///8CIBdrIJsBKAIAajYCACBAQfT/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NwIIIAAgAykCEDcCECAAIAMpAhg3AhggACADKQIgNwIgQfb6/78CIABBBGoiASgCAEECdGshD0H2//+/AiAAQQhqIhAoAgBBAnRrIRFB9v//vwIgAEEMaiIbKAIAQQJ0ayEcQfb//78CIABBEGoiHSgCAEECdGshHkH2//+/AiAAQRRqIh8oAgBBAnRrISBB9v//vwIgAEEYaiIhKAIAQQJ0ayEiQfb//78CIABBHGoiIygCAEECdGshJEH2//+/AiAAQSBqIiUoAgBBAnRrISZB9v//EyAAQSRqIicoAgBBAnRrISggAEHWs/+/AiAAKAIAQQJ0ayAHKAIAIilqNgIAIAEgDyAHQQRqIg8oAgAiAWo2AgAgECARIAdBCGoiECgCACIRajYCACAbIBwgB0EMaiIbKAIAIhxqNgIAIB0gHiAHQRBqIh0oAgAiHmo2AgAgHyAgIAdBFGoiHygCACIgajYCACAhICIgB0EYaiIhKAIAIiJqNgIAICMgJCAHQRxqIiMoAgAiJGo2AgAgJSAmIAdBIGoiJSgCACImajYCACAnICggB0EkaiInKAIAIihqNgIAIAIoAgBBBmwhKiAGKAIAQQZsISsgCCgCAEEGbCEsIAkoAgBBBmwhLSAKKAIAQQZsIS4gCygCAEEGbCEvIAwoAgBBBmwhMCANKAIAQQZsITEgDigCAEEGbCEyIAMgAygCAEEGbEG84f//ACApa2o2AgAgAiAqQfz9//8AIAFrajYCACAGICtB/P///wAgEWtqNgIAIAggLEH8////ACAca2o2AgAgCSAtQfz///8AIB5rajYCACAKIC5B/P///wAgIGtqNgIAIAsgL0H8////ACAia2o2AgAgDCAwQfz///8AICRrajYCACANIDFB/P///wAgJmtqNgIAIA4gMkH8//8HIChrajYCACAAQShqIgEgBSADEAogB0Ga0v+/ASAEKAIAayICNgIAIA9B+vz/vwEgEigCAGsiAzYCACAQQfr//78BIBMoAgBrIgU2AgAgG0H6//+/ASAUKAIAayIHNgIAIB1B+v//vwEgFSgCAGsiBjYCACAfQfr//78BIBYoAgBrIgg2AgAgIUH6//+/ASAXKAIAayIJNgIAICNB+v//vwEgGCgCAGsiCjYCACAlQfr//78BIBkoAgBrIgs2AgAgJ0H6//8LIBooAgBr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BGohBCAGIAgQDEEBIANrIgNBwABJBH8gBAUgAkGBf2oiDUFAcSIOIAJrQcSSBGohBSADIQIgBCEDA0AgCCADKQAANwAAIAggAykACDcACCAIIAMpABA3ABAgCCADKQAYNwAYIAggAykAIDcAICAIIAMpACg3ACggCCADKQAwNwAwIAggAykAODcAOCADQUBrIQMgBiAIEAwgAkFAaiICQcAATw0ACyANIA5rIQMgBQshAiADBEAgAiEEQQAhAgwCCwsMAQsgCCACaiAEIAMQCxoLIAogECgCACICQR12QRh0NgIAIAogAkELdEGAgPwHcSACQRt0ciACQQV2QYD+A3FyIAJBFXZB/wFxcjYCBCAQIAJBNyACa0E/cUEBaiIDajYCACAGQSBqIQUCQAJAIANBwAAgAkE/cSICayIESQRAQfmMBCEEDAEFIAUgAmpB+YwEIAQQCxogBEH5jARqIQIgBiAFEAwgAyAEayIDQcAATwRAA0AgBSACKQAANwAAIAUgAikACDcACCAFIAIpABA3ABAgBSACKQAYNwAYIAUgAikAIDcAICAFIAIpACg3ACggBSACKQAwNwAwIAUgAikAODcAOCACQUBrIQIgBiAFEAwgA0FAaiIDQcAATw0ACwsgAwRAIAIhBEEAIQIMAgsLDAELIAUgAmogBCADEAsaCyAQKAIAIgJBP3EhBCAQIAJBCGo2AgAgBkEgaiEFAkACQEHAACAEayIDQQhLBEAgCiECQQghAwwBBSAFIARqIAogAxALGiAKIANqIQIgBiAFEAxBCCADayIDQcAATwRAA0AgBSACKQAANwAAIAUgAikACDcACCAFIAIpABA3ABAgBSACKQAYNwAYIAUgAikAIDcAICAFIAIpACg3ACggBSACKQAwNwAwIAUgAikAODcAOCACQUBrIQIgBiAFEAwgA0FAaiIDQcAATw0ACwsgAwRAQQAhBAwCCwsMAQsgBSAEaiACIAMQCxoLIAYoAgAQCSESIAZBADYCACAGQQRqIh4oAgAQCSEIIB5BADYCACAGQQhqIh8oAgAQCSENIB9BADYCACAGQQxqIiAoAgAQCSEOICBBADYCACAGQRBqIiEoAgAQCSEFICFBADYCACAGQRRqIiMoAgAQCSEEICNBADYCACAGQRhqIhMoAgAQCSEDIBNBADYCACAGQRxqIh0oAgAQ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EAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADEAggAyADIAIQDSAEQaABaiICIAMQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgBRANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiAJEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACIAYQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgCRANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiAKEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACIAoQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgBhANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiAGEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACIAQQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgCRANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiAGEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACIAsQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgCRANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiAGEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACIAYQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgCBANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiALEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACIAoQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgBBANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiAMEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACIAQQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIgBBANIAIgAhAIIAIgAhAIIAIgAhAIIAIgAhAIIAIgAiALEA0gAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACEAggAiACIAEQDSACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCACIAIQCCAAIAIgBxANIAQkBAvYAwETfyMEIQIjBEHQAGokBCACIAFB0ABqEAcgAiACIAAQCiABKAIkIgZBFnYiAEHRB2wgASgCAGohBCAAQQZ0IAEoAgRqIARBGnZqIgdBGnYgASgCCGoiCEEadiABKAIMaiIJQRp2IAEoAhBqIgpBGnYgASgCFGoiC0EadiABKAIYaiIMQRp2IAEoAhxqIg1BGnYgASgCIGohBUH8/f//ACACKAIEayEOQfz///8AIAIoAghrIQ9B/P///wAgAigCDGshEEH8////ACACKAIQayERQfz///8AIAIoAhRrIRJB/P///wAgAigCGGshE0H8////ACACKAIcayEUQfz///8AIAIoAiBrIQEgAigCJCEAIAJBKGoiA0G84f//ACACKAIAayAEQf///x9xajYCACADIA4gB0H///8fcWo2AgQgAyAPIAhB////H3FqNgIIIAMgECAJQf///x9xajYCDCADIBEgCkH///8fcWo2AhAgAyASIAtB////H3FqNgIUIAMgEyAMQf///x9xajYCGCADIBQgDUH///8fcWo2AhwgAyABIAVB////H3FqNgIgIAMgBkH///8BcUH8//8HaiAAayAFQRp2ajYCJCADEBchACACJAQgAAuXEAEKfyMEIQQjBEHgA2okBCAEQdAAaiEDIARBKGohCCAEQbgDaiILIAEQByALIAsgARAKIARBkANqIgogCxAHIAogCiABEAogBEHoAmoiBiAKKQIANwIAIAYgCikCCDcCCCAGIAopAhA3AhAgBiAKKQIYNwIYIAYgCikCIDcCICAGIAYQByAGIAYQByAGIAYQByAGIAYgChAKIARBwAJqIgIgBikCADcCACACIAYpAgg3AgggAiAGKQIQNwIQIAIgBikCGDcCGCACIAYpAiA3AiAgAiACEAcgAiACEAcgAiACEAcgAiACIAoQCiAEQZgCaiIGIAIpAgA3AgAgBiACKQIINwIIIAYgAikCEDcCECAGIAIpAhg3AhggBiACKQIgNwIgIAYgBhAHIAYgBhAHIAYgBiALEAogBEHwAWoiByAGKQIANwIAIAcgBikCCDcCCCAHIAYpAhA3AhAgByAGKQIYNwIYIAcgBikCIDcCICAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcQByAHIAcgBhAKIARByAFqIgUgBykCADcCACAFIAcpAgg3AgggBSAHKQIQNwIQIAUgBykCGDcCGCAFIAcpAiA3AiAgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFEAcgBSAFIAcQCiAEQaABaiICIAUpAgA3AgAgAiAFKQIINwIIIAIgBSkCEDcCECACIAUpAhg3AhggAiAFKQIgNwIgIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAhAHIAIgAiAFEAogBEH4AGoiCSACKQIANwIAIAkgAikCCDcCCCAJIAIpAhA3AhAgCSACKQIYNwIYIAkgAikCIDcCIEEAIQYDQCAJIAkQByAGQQFqIgZB2ABHDQALIAkgCSACEAogAyAJKQIANwIAIAMgCSkCCDcCCCADIAkpAhA3AhAgAyAJKQIYNwIYIAMgCSkCIDcCICADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMQByADIAMgBRAKIAggAykCADcCACAIIAMpAgg3AgggCCADKQIQNwIQIAggAykCGDcCGCAIIAMpAiA3AiAgCCAIEAcgCCAIEAcgCCAIEAcgCCAIIAoQCiAEIAgpAgA3AgAgBCAIKQIINwIIIAQgCCkCEDcCECAEIAgpAhg3AhggBCAIKQIgNwIgIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBBAHIAQgBCAHEAogBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEEAcgBCAEIAsQCiAEIAQQByAAIAQQByAEIAAQB0G84f//ACAEKAIAayABKAIAaiABKAIkQfz//wcgBCgCJGtqIgpBFnYiBkHRB2xqIQBB/P///wAgBCgCIGsgASgC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ACggBCABKQAwNwAwIAQgASkAODcAOCABQUBrIQEgBiAEEAwgAkFAaiICQcAATw0ACwsgAgRAQQAhAwwCCwsMAQsgBCADaiABIAIQCxoLIAYoAgAQCSEIIAZBADYCACAKKAIAEAkhCSAKQQA2AgAgCygCABAJIQogC0EANgIAIAwoAgAQCSELIAxBADYCACANKAIAEAkhByANQQA2AgAgDigCABAJIQMgDkEANgIAIA8oAgAQCSECIA9BADYCACARKAIAEAkhASAFIAg2AgAgBSAJNgIEIAUgCjYCCCAFIAs2AgwgBSAHNgIQIAUgAzYCFCAFIAI2AhggBSABNgIcIAAgBSAQEA4gBSQEC+YBAQN/IABB4ABqIgMoAgAiBEE/cSEFIAMgBCACajYCAEHAACAFayIEIAJNBEAgAEEgaiIDIAVqIAEgBBALGiABIARqIQEgACADEAwgAiAEayICQcAASQRAQQAhBQUDQCADIAEpAAA3AAAgAyABKQAINwAIIAMgASkAEDcAECADIAEpABg3ABggAyABKQAgNwAgIAMgASkAKDcAKCADIAEpADA3ADAgAyABKQA4NwA4IAFBQGshASAAIAMQDCACQUBqIgJBwABPDQBBACEFCwsLIAJFBEAPCyAAQSBqIAVqIAEgAhALGgvASwEzfyMEIQkjBEHwAWokBCAAQoGChIiQoMCAATcCACAAQoGChIiQoMCAATcCCCAAQoGChIiQoMCAATcCECAAQoGChIiQoMCAATcCGCAAQSBqIhlCADcCACAZQgA3AgggGUIANwIQIBlCADcCGCAJIgogGRATIApB4ABqIg0oAgAiCUE/cSEEIA0gCUEgajYCACAKQSBqIQsCQAJAQcAAIARrIglBIEsEQCAAIQkgBCEDQSAhCAwBBSALIARqIAAgCRALGiAAIAlqIQMgCiALEAxBICAJayIIQcAASQR/IAMFIABB5ABqIARBoH9qIgdBQHEiBkEcciAEa2ohBCAIIQkgAyEIA0AgCyAIKQAANwAAIAsgCCkACDcACCALIAgpABA3ABAgCyAIKQAYNwAYIAsgCCkAIDcAICALIAgpACg3ACggCyAIKQAwNwAwIAsgCCkAODcAOCAIQUBrIQggCiALEAwgCUFAaiIJQcAATw0ACyAHIAZrIQggBAshCSAIBEBBACEDDAILCwwBCyAL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cXIgAUEVdkH/AXFyNgIEIA0gAUE3IAFrQT9xQQFqIgJqNgIAIApBIGohBAJAAkAgAkHAACABQT9xIgFrIgNJBEBB+YwEIQMMAQUgBCABakH5jAQgAxALGiADQfmMBGohASAKIAQQDCACIANrIgJBwABPBEADQCAEIAEpAAA3AAAgBCABKQAINwAIIAQgASkAEDcAECAEIAEpABg3ABggBCABKQAgNwAgIAQgASkAKDcAKCAEIAEpADA3ADAgBCABKQA4NwA4IAFBQGshASAKIAQQDCACQUBqIgJBwABPDQALCyACBEAgASEDQQAhAQwCCwsMAQsgBCABaiADIAIQCxoLIA0oAgAiAUE/cSEDIA0gAUEIajYCACAKQSBqIQQCQAJAQcAAIANrIgJBCEsEQCAJIQFBCCECDAEFIAQgA2ogCSACEAsaIAkgAmohASAKIAQQDEEIIAJrIgJBwABPBEADQCAEIAEpAAA3AAAgBCABKQAINwAIIAQgASkAEDcAECAEIAEpABg3ABggBCABKQAgNwAgIAQgASkAKDcAKCAEIAEpADA3ADAgBCABKQA4NwA4IAFBQGshASAKIAQQDCACQUBqIgJBwABPDQALCyACBEBBACEDDAILCwwBCyAEIANqIAEgAhALGgsgCigCABAJIQ4gCkEANgIAIBooAgAQCSELIBpBADYCACAbKAIAEAkhByAbQQA2AgAgHCgCABAJIQYgHEEANgIAIB0oAgAQCSEEIB1BADYCACAeKAIAEAkhAyAeQQA2AgAgHygCABAJIQIgH0EANgIAICAoAgAQCSEBICBBADYCACAIIA42AgAgIiALNgIAICMgBzYCACAkIAY2AgAgJSAENgIAICYgAzYCACAnIAI2AgAgKCABNgIAIBEoAgAiAUE/cSEDIBEgAUEgajYCAAJAAkBBwAAgA2siBEEgSwRAIAghASADIQJBICEDDAEFIAUgA2ogCCAEEAsaIAggBGohAiAMIAUQDEEgIARrIgFBwABJBH8gASEDIAIFIANBoH9qIgNBBnZBAXQhBiAEQUBqIQQDQCAFIAIpAAA3AAAgBSACKQAINwAIIAUgAikAEDcAECAFIAIpABg3ABggBSACKQAgNwAgIAUgAikAKDcAKCAFIAIpADA3ADAgBSACKQA4NwA4IAJBQGshAiAMIAUQDCABQUBqIgFBwABPDQALIANBP3EhAyAIIAZBBGpBBXRqIARqCyEBIAMEQEEAIQIMAgsLDAELIAUgAmogASADEAsaCyAJIBEoAgAiAUEddkEYdDYCACAJIAFBC3RBgID8B3EgAUEbdHIgAUEFdkGA/gNxciABQRV2Qf8BcXI2AgQgESABQTcgAWtBP3FBAWoiAmo2AgACQAJAIAJBwAAgAUE/cSIBayIDSQRAQfmMBCEDDAEFIAUgAWpB+YwEIAMQCxogA0H5jARqIQEgDCAFEAwgAiADayICQcAATwRAA0AgBSABKQAANwAAIAUgASkACDcACCAFIAEpABA3ABAgBSABKQAYNwAYIAUgASkAIDcAICAFIAEpACg3ACggBSABKQAwNwAwIAUgASkAODcAOCABQUBrIQEgDCAFEAwgAkFAaiICQcAATw0ACwsgAgRAIAEhA0EAIQEMAgsLDAELIAUgAWogAyACEAsaCyARKAIAIgFBP3EhAyARIAFBCGo2AgACQAJAQcAAIANrIgJBCEsEQCAJIQFBCCECDAEFIAUgA2ogCSACEAsaIAkgAmohASAMIAUQDEEIIAJrIgJBwABPBEADQCAFIAEpAAA3AAAgBSABKQAINwAIIAUgASkAEDcAECAFIAEpABg3ABggBSABKQAgNwAgIAUgASkAKDcAKCAFIAEpADA3ADAgBSABKQA4NwA4IAFBQGshASAMIAUQDCACQUBqIgJBwABPDQALCyACBEBBACEDDAILCwwBCyAFIANqIAEgAhALGgsgDCgCABAJIQ4gDEEANgIAIBMoAgAQCSELIBNBADYCACAUKAIAEAkhByAUQQA2AgAgFSgCABAJIQYgFUEANgIAIBYoAgAQCSEEIBZBADYCACAXKAIAEAkhAyAXQQA2AgAgGCgCABAJIQIgGEEANgIAICEoAgAQCSEBICFBADYCACAuIA42AAAgLyALNgAAIDAgBzYAACAxIAY2AAAgMiAENgAAIDMgAzYAACA0IAI2AAAgNSABNgAAIAogGRATIA0oAgAiAUE/cSEEIA0gAUEgajYCACAKQSBqIQsCQAJAQcAAIARrIgFBIEsEQCAAIQEgBCEDQSAhAgwBBSALIARqIAAgARALGiAAIAFqIQMgCiALEAxBICABayICQcAASQR/IAMFIABB5ABqIARBoH9qIgdBQHEiBkEcciAEa2ohBCACIQEgAyECA0AgCyACKQAANwAAIAsgAikACDcACCALIAIpABA3ABAgCyACKQAYNwAYIAsgAikAIDcAICALIAIpACg3ACggCyACKQAwNwAwIAsgAikAODcAOCACQUBrIQIgCiALEAwgAUFAaiIBQcAATw0ACyAHIAZrIQIgBAshASACBEBBACEDDAILCwwBCyALIANqIAEgAhALGgsgCSANKAIAIgFBHXZBGHQ2AgAgCSABQQt0QYCA/AdxIAFBG3RyIAFBBXZBgP4DcXIgAUEVdkH/AXFyNgIEIA0gAUE3IAFrQT9xQQFqIgJqNgIAIApBIGohBAJAAkAgAkHAACABQT9xIgFrIgNJBEBB+YwEIQMMAQUgBCABakH5jAQgAxALGiADQfmMBGohASAKIAQQDCACIANrIgJBwABPBEADQCAEIAEpAAA3AAAgBCABKQAINwAIIAQgASkAEDcAECAEIAEpABg3ABggBCABKQAgNwAgIAQgASkAKDcAKCAEIAEpADA3ADAgBCABKQA4NwA4IAFBQGshASAKIAQQDCACQUBqIgJBwABPDQALCyACBEAgASEDQQAhAQwCCwsMAQsgBCABaiADIAIQCxoLIA0oAgAiAUE/cSEDIA0gAUEIajYCACAKQSBqIQQCQAJAQcAAIANrIgJBCEsEQCAJIQFBCCECDAEFIAQgA2ogCSACEAsaIAkgAmohASAKIAQQDEEIIAJrIgJBwABPBEADQCAEIAEpAAA3AAAgBCABKQAINwAIIAQgASkAEDcAECAEIAEpABg3ABggBCABKQAgNwAgIAQgASkAKDcAKCAEIAEpADA3ADAgBCABKQA4NwA4IAFBQGshASAKIAQQDCACQUBqIgJBwABPDQALCyACBEBBACEDDAILCwwBCyAEIANqIAEgAhALGgsgCigCABAJIQ4gCkEANgIAIBooAgAQCSELIBpBADYCACAbKAIAEAkhByAbQQA2AgAgHCgCABAJIQYgHEEANgIAIB0oAgAQCSEEIB1BADYCACAeKAIAEAkhAyAeQQA2AgAgHygCABAJIQIgH0EANgIAICAoAgAQCSEBICBBADYCACAIIA42AgAgIiALNgIAICMgBzYCACAkIAY2AgAgJSAENgIAICYgAzYCACAnIAI2AgAgKCABNgIAIBEoAgAiAUE/cSEDIBEgAUEgajYC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AEIANwIQIABCADcCGAsgASABKAIAIARqNgIAIAMkBEEBC9YDAQN/IwQhAyMEQYABaiQEIAAgASkCADcCACAAIAEpAgg3AgggACABKQIQNwIQIAAgASkCGDcCGCAAIAEpAiA3AiAgA0HQAGoiBSABEAcgA0EoaiIEIAEgBRAKIABBADYCUCADIAQoAgBBB2o2AgAgAyAEKAIENgIEIAMgBCgCCDYCCCADIAQoAgw2AgwgAyAEKAIQNgIQIAMgBCgCFDYCFCADIAQoAhg2AhggAyAEKAIcNgIcIAMgBCgCIDYCICADIAQoAiQ2AiQgAEEoaiIFIAMQIkUEQCADJARBAA8LIAUQFiAFKAIAIgFBAXEgAkYEQCADJARBAQ8LIAVBvOH//wAgAWs2AgAgAEEsaiIBQfz9//8AIAEoAgBrNgIAIABBMGoiAUH8////ACABKAIAazYCACAAQTRqIgFB/P///wAgASgCAGs2AgAgAEE4aiIBQfz///8AIAEoAgBrNgIAIABBPGoiAUH8////ACABKAIAazYCACAAQUBrIgFB/P///wAgASgCAGs2AgAgAEHEAGoiAUH8////ACABKAIAazYCACAAQcgAaiIBQfz///8AIAEoAgBrNgIAIABBzABqIgBB/P//ByAAKAIAazYCACADJARBAQv2CwIRfwJ+IwQhBSMEQaADaiQEIAVBuAJqIgJCADcAACACQgA3AAggAkIANwAQIAJCADcAGCACQgA3ACAgAkIANwAoIAJCADcAMCACQgA3ADggAUUEQCAAQQA2ApwBIABBJGoiA0GQiAQpAgA3AgAgA0GYiAQpAgA3AgggA0GgiAQpAgA3AhAgA0GoiAQpAgA3AhggA0GwiAQpAgA3AiAgAEEBNgJ0IABB+ABqIgNCADcCACADQgA3AgggA0IANwIQIANCADcCGCADQQA2AiAgAEGEuLznADYCTCAAQf61r/AANgJQIABBuMz59QA2AlQgAEHny/X2ADYCWCAAQcjQi/gANgJcIABB0vvu4wA2AmAgAEG8gMHtADYCZCAAQYbVuecANgJoIABB2bKj7AA2AmwgAEHG4rcHNgJwIABBATYCBCAAQQhqIgNCADcCACADQgA3AgggA0IANwIQIANBADYCGAsgBUH4AmoiBiAAQQRqIg8QESACIAYpAAA3AAAgAiAGKQAINwAIIAIgBikAEDcAECACIAYpABg3ABggAUEARyIHBEAgAkEgaiIDIAEpAAA3AAAgAyABKQAINwAIIAMgASkAEDcAECADIAEpABg3ABgLIAVBkAJqIQggBUHwAWohBCAFQfAAaiEDIAVByABqIQEgBUEEaiIQIAIgBwR/QcAABUEgCxAqIAJCADcAACACQgA3AAggAkIANwAQIAJCADcAGCACQgA3ACAgAkIANwAoIAJCADcAMCACQgA3ADggAUEEaiECIAFBCGohByABQQxqIQkgAUEQaiEKIAFBFGohCyABQRhqIQwgAUEcaiENIAFBIGohESABQSRqIRIDQCAQIAYQHyAFIAEgBhAURSIONgIAIA4EQCAFQQE2AgAMAQUgBSACKAIAIAEoAgByIAcoAgByIAkoAgByIAooAgByIAsoAgByIAwoAgByIA0oAgByIBEoAgByIBIoAgByRSIONgIAIA4NAQsLIAggARAHIABBJGoiAiACIAgQCiAAQcwAaiIHIAcgCBAKIAcgByABEAogAEH0AGoiCCAIIAEQCiABQgA3AgAgAUIANwIIIAFCADcCECABQgA3AhggAUIANwIgIARBBGohASAEQQhqIQggBEEMaiEHIARBEGohCSAEQRRqIQogBEEYaiELIARBHGohDANAIBAgBhAfIAQgBiAFEA4gBSgCAARAIAVBATYCAAwBBSAFIAEoAgAgBCgCAHIgCCgCAHIgBygCAHIgCSgCAHIgCigCAHIgCygCAHIgDCgCAHJFIg02AgAgDQ0BCwsgBkIANwAAIAZCADcACCAGQgA3ABAgBkIANwAYIAAgAyAEEB4gBCAEKAIAIgBBf3OtQsKC2YENfCITIAEoAgAiBiAAciAIKAIAIgByIAcoAgAiEHIgCSgCACINciAKKAIAIhFyIAsoAgAiEnIgDCgCACIOckEAR0EfdEEfda0iFIM+AgAgASATQiCIQoy9yf4LhCAGQX9zrXwiEyAUgz4CACAIIABBf3OtQrvAovoKfCATQiCIfCITIBSDPgIAIAcgEEF/c61C5rm71Qt8IBNCIIh8IhMgFIM+AgAgCSANQX9zrUL+////D3wgE0IgiHwiEyAUgz4CACAKIBFBf3OtQv////8PfCATQiCIfCITIBSDPgIAIAsgEkF/c61C/////w98IBNCIIh8IhMgFIM+AgAgDCAO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KSAGQQhqISogBkEMaiErIAZBEGohLCAGQRRqIS0gBkEYaiEuIAZBHGohLyAGQSBqITAgBkEkaiExIANBBGohMiADQQhqITMgA0EMaiE0IANBEGohNSADQRRqITYgA0EYaiE3IANBHGohOCADQSBqITkgA0EkaiE6IARBBGohOyAEQQhqIQkgBEEMaiEMIARBEGohDiAEQRRqIQ8gBEEYaiERIARBHGohEiAEQSBqIRMgBEEkaiEVIA0oAgBBvOH//wBqIRYgDSgCBEH8/f//AGohFyANKAIIQfz///8AaiEYIA0oAgxB/P///wBqIRkgDSgCEEH8////AGohGiANKAIUQfz///8AaiEbIA0oAhhB/P///wBqIRwgDSgCHEH8////AGohHSANKAIgQfz///8AaiEeIA0oAiRB/P//B2ohH0H/PyEBA0AgBiAHIAFBf2oiAkEGdGoiIBAjIBAgECAGEAogFCAQEAcgKCAUIBAQCiAGIAYgFBAKICkoAgAhISAqKAIAISIgKygCACEjICwoAgAhJCAtKAIAISUgLigCACEmIC8oAgAhJyAwKAIAIQsgMSgCACEFIAYgFiAGKAIAazYCACApIBcgIWs2AgAgKiAYICJrNgIAICsgGSAjazYCACAsIBogJGs2AgAgLSAbICVrNgIAIC4gHCAmazYCACAvIB0gJ2s2AgAgMCAeIAtrNgIAIDEgHyAFazYCACAKIAogKBAKIAMgBikCADcCACADIAYpAgg3AgggAyAGKQIQNwIQIAMgBikCGDcCGCADIAYpAiA3AiAgAxAPIAQgCikCADcCACAEIAopAgg3AgggBCAKKQIQNwIQIAQgCikCGDcCGCAEIAopAiA3AiAgBBAPICAgMigCACILQRp0IAMoAgByNgIAIAcgAkEGdGogMygCACIFQRR0IAtBBnZyNgIEIAcgAkEGdGogNCgCACILQQ50IAVBDHZyNgIIIAcgAkEGdGogNSgCACIFQQh0IAtBEnZyNgIMIAcgAkEGdGogNigCAEECdCAFQRh2ciA3KAIAIgVBHHRyNgIQIAcgAkEGdGogOCgCACILQRZ0IAVBBHZyNgIUIAcgAkEGdGogOSgCACIFQRB0IAtBCnZyNgIYIAcgAkEGdGogOigCAEEKdCAFQRB2cjYCHCAHIAJBBnRqIDsoAgAiC0EadCAEKAIA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IAYoAgBFBEAgBygCBCAHKAIAciAHKAIIciAHKAIMciAHKAIQciAHKAIUciAHKAIYciAHKAIccgRAIAkgAkEAEA4CQCAMIAIgA0EAIAVBACAOQQFxEQEAIgAEQCAIQQRqIRAgCEEIaiERIAhBDGohEiAIQRBqIRMgCEEUaiEUIAhBGGohFSAIQRxqIRZBACEEA0AgCCAMIAYQDiAGKAIARQRAIBAoAgAgCCgCAHIgESgCAHIgEigCAHIgEygCAHIgFCgCAHIgFSgCAHIgFigCAHIEQCAPIAogCyAHIAkgCCANEDENBAsLIAwgAiADQQAgBSAEQQFqIgQgDkEBcREBACIADQBBACEACwVBACEACwsgCUIANwIAIAlCADcCCCAJQgA3AhAgCUIANwIYIAhCADcCACAIQgA3AgggCEIANwIQIAhCADcCGCAHQgA3AgAgB0IANwIIIAdCADcCECAHQgA3AhggAARAIA0oAgAhAyABIAopAAA3AAAgASAKKQAINwAIIAEgCikAEDcAECABIAopABg3ABggAUEgaiICIAspAAA3AAAgAiALKQAINwAIIAIgCykAEDcAECACIAspABg3ABggAUFAayADOgAAIAYkBCAADwsLCyABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABggAUIANwAgIAFCADcAKCABQgA3ADAgAUIANwA4IAFBQGtBADoAACAGJARBAAv+AQECfyMEIQQjBEFAayQEIAFFBEBByooEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAQkBEEADwsgA0UEQEGuigQgACgCqAEgACgCpAFBA3FBAmoRAAAgBCQEQQAPCyAEQSBqIQUgAgR/IAUgAykAADcAACAFIAMpAAg3AAggBSADKQAQNwAQIAUgAykAGDcAGCAEIANBIGoiACkAADcAACAEIAApAAg3AAggBCAAKQAQNwAQIAQgACkAGDcAGCACIANBQGstAAA2AgAgASAFEBEgAUEgaiAEEBEgBCQEQQEFQb6MBCAAKAKoASAAKAKkAUEDcUECahEAACAEJARBAAsL7wIBA38jBCEEIwRB0ABqJAQgBEEANgIAIAFFBEBBrooEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAQkBEEADwsgAkUEQEG6igQgACgCqAEgACgCpAFBA3FBAmoRAAAgBCQEQQAPCyADQQNLBEBBpYwEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAQkBEEADwsgBEEoaiIFIAIgBBAOIAQoAgAhACAEQQhqIgYgAkEgaiAEEA4gBCgCACAAckUiACECIAAEfyABIAUpAAA3AAAgASAFKQAINwAIIAEgBSkAEDcAECABIAUpABg3ABggAUEgaiIAIAYpAAA3AAAgACAGKQAINwAIIAAgBikAEDcAECAAIAYpABg3ABggAUFAayADOgAAIAQkBCACBSABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABggAUIANwAgIAFCADcAKCABQgA3ADAgAUIANwA4IAFBQGtBADoAACAEJAQgAgsLlCoBX38jBCEHIwRBwANqJAQgB0GgAWohCCAHQfgAaiEKIAFB+ABqIUAgB0GQA2oiBiABQdAAaiI9EAcgB0HoAmoiAyABKQIANwIAIAMgASkCCDcCCCADIAEpAhA3AhAgAyABKQIYNwIYIAMgASkCIDcCICADQSRqIiUoAgAiFEEWdiIEQdEHbCADKAIAaiEFIARBBnQgA0EEaiImKAIAaiAFQRp2aiIVQRp2IANBCGoiJygCAGoiFkEadiADQQxqIhwoAgBqIhdBGnYgA0EQaiIdKAIAaiIYQRp2IANBFGoiMSgCAGoiDkEadiADQRhqIjIoAgBqIiBBGnYgA0EcaiIzKAIAaiIhQRp2IANBIGoiNCgCAGohBCADIAVB////H3E2AgAgJiAVQf///x9xNgIAICcgFkH///8fcTYCACAcIBdB////H3E2AgAgHSAYQf///x9xNgIAIDEgDkH///8fcTYCACAyICBB////H3E2AgAgMyAhQf///x9xNgIAIDQgBEH///8fcTYCACAlIARBGnYgFEH///8BcWo2AgAgB0HAAmoiBCACIAYQCiABKAJMIhlBFnYiBUHRB2wgASgCKGohGiAFQQZ0IAEoAixqIBpBGnZqIihBGnYgASgCMGoiKUEadiABKAI0aiIqQRp2IAEoAjhqIitBGnYgASgCPGoiLEEadiABQUBrKAIAaiItQRp2IAEoAkRqIiJBGnYgASgCSGohHiAHQZgCaiIFIAJBKGoiWCAGEAogBSAFID0QCiAHQfABaiIBIAMpAgA3AgAgASADKQIINwIIIAEgAykCEDcCECABIAMpAhg3AhggASAD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aiI6KAIAayETIDogEzYCAEH8////ACAKQSBqIjsoAgBrIR8gOyAfNgIAQfz//wcgCkEkaiI/KAIAayEbID8gGzYCACAuKAIAIBtqIkJBFnYiPEHRB2wgASgCACAkamohGyA8QQZ0IBQoAgAgCWpqIBtBGnZqIiRBGnYgFSgCACALamoiC0EadiAWKAIAIA9qaiIPQRp2IBcoAgAgDGpqIgxBGnYgGCgCACANamoiDUEadiAOKAIAIBJqaiISQRp2ICAoAgAgE2pqIhNBGnYgISgCACAfamohCSABIBtB////H3EiHzYCACAUICRB////H3EiGzYCACAVIAtB////H3EiCzYCACAWIA9B////H3EiDzYCACAXIAxB////H3EiDDYCACAYIA1B////H3EiDTYCACAOIBJB////H3EiEjYCACAgIBNB////H3EiEzYCACAhIAlB////H3EiJDYCACAuIAlBGnYgQkH///8BcWoiCTYCACAAIAEpAgA3AgAgACABKQIINwIIIAAgASkCEDcCECAAIAEpAhg3AhggACABKQIgNwIgIAEgH0EBdCAKKAIAajYCACAUIBtBAXQgAygCAGo2AgAgFSALQQF0IBAoAgBqNgIAIBYgD0EBdCARKAIAajYCACAXIAxBAXQgIygCAGo2AgAgGCANQQF0IDAoAgBqNgIAIA4gEkEBdCA5KAIAajYCACAgIBNBAXQgOigCAGo2AgAgISAkQQF0IDsoAgBqNgIAIC4gCUEBdCA/KAIAajYCACABIAEgBxAKIAEgASgCACAIKAIAaiIBNgIAIBQgFCgCACAeKAIAaiIDNgIAIBUgFSgCACAZKAIAaiIINgIAIBYgFigCACAlKAIAaiIKNgIAIBcgFygCACAmKAIAaiIUNgIAIBggGCgCACAnKAIAaiIVNgIAIA4gDigCACAcKAIAaiIWNgIAICAgICgCACAdKAIAaiIXNgIAICEgISgCACAiKAIAaiIYNgIAIC4gLigCACAvKAIAaiIONgIAQfj//w8gDmsiD0EWdiIOQdEHbEH4wv//ASABa2ohASAOQQZ0Qfj7//8BIANraiABQRp2aiIcQRp2Qfj///8BIAhraiIdQRp2Qfj///8BIApraiIJQRp2Qfj///8BIBRraiIQQRp2Qfj///8BIBVraiILQRp2Qfj///8BIBZraiIR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FHZyNgIwIAIgEUESdEGAgPAfcSAQQQ52cjYCNCACIAVBGHRBgICAGHEgEUEIdnI2AjggAiAFQQJ2Qf///x9xNgI8IAJBQGsgEkEEdEHw//8fcSAFQRx2cjYCACACIBNBCnRBgPj/H3EgEkEWdnI2AkQgAiAUQRB0QYCA/B9xIBNBEHZyNgJIIAIgFEEKdjYCTCACQdAAaiINQQA2AgAgDiACKAIAciAGciAHciAIciAVciADciAKciALciAMckUEQEHajAQgACgCqAEgACgCpAFBA3FBAmoRAAAgAUIANwAAIAFCADcACCABQgA3ABAgAUIANwAYIAFCADcAICABQgA3ACggAUIANwAwIAFCADcAOCAEJARBAA8LIARBwAJqIQogBEGYAmohCyAEQfgBaiEIIARB/ABqIQMgAUIANwAAIAFCADcACCABQgA3ABAgAUIANwAYIAFCADcAICABQgA3ACggAUIANwAwIAFCADcAOCAJKAIEIAkoAgByIAkoAghyIAkoAgxyIAkoAhByIAkoAhRyIAkoAhhyIAkoAhxyBH8gCEIANwIAIAhCADcCCCAIQgA3AhAgCEIANwIYIANB+ABqIgxBADYCACADIAIpAgA3AgAgAyACKQIINwIIIAMgAikCEDcCECADIAIpAhg3AhggAyACKQIgNwIgIANBKGoiBSACQShqIgYpAgA3AgAgBSAGKQIINwIIIAUgBikCEDcCECAFIAYpAhg3AhggBSAGKQIgNwIgIANBATYCUCADQdQAaiIHQgA3AgAgB0IANwIIIAdCADcCECAHQgA3AhggB0EANgIgIAAgAyADIAkgCBAZIA0gDCgCADYCACADQdAAaiIAIAAQFSAKIAAQByALIAAgChAKIAMgAyAKEAogBSAFIAsQCiAAQQE2AgAgB0IANwIAIAdCADcCCCAHQgA3AhAgB0IANwIYIAdBADYCICACIAMpAgA3AgAgAiADKQIINwIIIAIgAykCEDcCECACIAMpAhg3AhggAiADKQIgNwIgIAYgBSkCADcCACAGIAUpAgg3AgggBiAFKQIQNwIQIAYgBSkCGDcCGCAGIAUpAiA3AiAgASACEBsgBCQEQQEFIAQkBEEACwvhAgEBfyMEIQMjBEHQAGokBCADQQA2AgAgAUUEQEGIjAQgACgCqAEgACgCpAFBA3FBAmoRAAAgAyQEQQAPCyACRQRAQZeMBCAAKAKoASAAKAKkAUEDcUECahEAACADJARBAA8LIANBKGoiACACIAMQDiADQQhqIgIgAUEAEA4gAygCAAR/IAFCADcAACABQgA3AAggAUIANwAQIAFCADcAGEEABSAAKAIEIAAoAgByIAAoAghyIAAoAgxyIAAoAhByIAAoAhRyIAAoAhhyIAAoAhxyBH8gAiACIAAQDSABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABggASACEBFBAQUgAUIANwAAIAFCADcACCABQgA3ABAgAUIANwAYQQALCyEBIAJCADcCACACQgA3AgggAkIANwIQIAJCADcCGCAAQgA3AgAgAEIANwIIIABCADcCECAAQgA3AhggAyQEIAELgAsBE38jBCEEIwRB8AJqJAQgBEEANgIAIAAoAgBFBEBB+IoEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAQkBEEADwsgAUUEQEHkiAQgACgCqAEgACgCpAFBA3FBAmoRAAAgBCQEQQAPCyACRQRAQZeMBCAAKAKoASAAKAKkAUEDcUECahEAACAEJARBAA8LIARBCGoiFCACIAQQDiAEKAIABEAgAUIANwAAIAFCADcACCABQgA3ABAgAUIANwAYIAFCADcAICABQgA3ACggAUIANwAwIAFCADcAOCAEJARBAA8LIAEoAAQhBiABKAAIIQcgASgADCEIIAEoABAhAyABKAAUIQkgASgAGCEKIAEoABwhCyABKAAgIQwgASgAJCENIAEoACghDyABKAAsIRAgASgAMCEFIAEoADQhESABKAA4IRIgASgAPCETIARBKGoiAiABKAAAIg5B////H3E2AgAgAiAGQQZ0QcD//x9xIA5BGnZyIg42AgQgAiAHQQx0QYDg/x9xIAZBFHZyIgY2AgggAiAIQRJ0QYCA8B9xIAdBDnZyIgc2AgwgAiADQRh0QYCAgBhxIAhBCHZyIgg2AhAgAiADQQJ2Qf///x9xIhU2AhQgAiAJQQR0QfD//x9xIANBHHZyIgM2AhggAiAKQQp0QYD4/x9xIAlBFnZyIgk2AhwgAiALQRB0QYCA/B9xIApBEHZyIgo2AiAgAiALQQp2Igs2AiQgAiAMQf///x9xNgIoIAIgDUEGdEHA//8fcSAMQRp2cjYCLCACIA9BDHRBgOD/H3EgDUEUdnI2AjAgAiAQQRJ0QYCA8B9xIA9BDnZyNgI0IAIgBUEYdEGAgIAYcSAQQQh2cjYCOCACIAVBAnZB////H3E2AjwgAkFAayARQQR0QfD//x9xIAVBHHZyNgIAIAIgEkEKdEGA+P8fcSARQRZ2cjYCRCACIBNBEHRBgID8H3EgEkEQdnI2AkggAiATQQp2NgJMIAJB0ABqIgxBADYCACAOIAIoAgByIAZyIAdyIAhyIBVyIANyIAlyIApyIAtyRQRAQdqMBCAAKAKoASAAKAKkAUEDcUECahEAACABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABggAUIANwAgIAFCADcAKCABQgA3ADAgAUIANwA4IAQkBEEADwsgBEHIAmohCCAEQaACaiEKIAFCADcAACABQgA3AAggAUIANwAQIAFCADcAGCABQgA3ACAgAUIANwAoIAFCADcAMCABQgA3ADggBEGgAWoiA0H4AGoiDUEANgIAIAMgAikCADcCACADIAIpAgg3AgggAyACKQIQNwIQIAMgAikCGDcCGCADIAIpAiA3AiAgA0EoaiIFIAJBKGoiBikCADcCACAFIAYpAgg3AgggBSAGKQIQNwIQIAUgBikCGDcCGCAFIAYpAiA3AiAgA0EBNgJQIANB1ABqIgdCADcCACAHQgA3AgggB0IANwIQIAdCADcCGCAHQQA2AiAgBEGAAWoiC0EBNgIAIAtBBGoiCUIANwIAIAlCADcCCCAJQgA3AhAgCUEANgIYIAAgAyADIAsgFBAZIA0oAgAEfyAEJARBAAUgDEEANgIAIANB0ABqIgAgABAVIAggABAHIAogACAIEAogAyADIAgQCiAFIAUgChAKIABBATYCACAHQgA3AgAgB0IANwIIIAdCADcCECAHQgA3AhggB0EANgIgIAIgAykCADcCACACIAMpAgg3AgggAiADKQIQNwIQIAIgAykCGDcCGCACIAMpAiA3AiAgBiAFKQIANwIAIAYgBSkCCDcCCCAGIAUpAhA3AhAgBiAFKQIYNwIYIAYgBSkCIDcCICABIAIQGyAEJARBAQsLyQIBA38jBCEDIwRB0ABqJAQgA0EANgIAIAFFBEBBiIwEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAMkBEEADwsgAkUEQEGXjAQgACgCqAEgACgCpAFBA3FBAmoRAAAgAyQEQQAPCyADQShqIgQgAiADEA4gA0EIaiICIAFBABAOIAMoAgAEQCABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABhBACEABSACIAIgBBAcIAIoAgQgAigCAHIgAigCCHIgAigCDHIgAigCEHIgAigCFHIgAigCGHIgAigCHHJBAEciBSEAIAFCADcAACABQgA3AAggAUIANwAQIAFCADcAGCAFBEAgASACEBELCyACQgA3AgAgAkIANwIIIAJCADcCECACQgA3AhggBEIANwIAIARCADcCCCAEQgA3AhAgBEIANwIYIAMkBCAAC6MBAQF/IwQhAiMEQTBqJAQgAUUEQEGIjAQgACgCqAEgACgCpAFBA3FBAmoRAAAgAiQEQQAPCyACQQhqIgAgASACEA4gAigCAAR/QQAFIAAoAgQgACgCAHIgACgCCHIgACgCDHIgACgCEHIgACgCFHIgACgCGHIgACgCHHJBAEcLIQEgAEIANwIAIABCADcCCCAAQgA3AhAgAEIANwIYIAIkBCABC/4FARB/IwQhBiMEQdABaiQEIAZBADYCACAAQQRqIg4oAgBFBEBBuosEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAYkBEEADwsgAkUEQEGsiwQgACgCqAEgACgCpAFBA3FBAmoRAAAgBiQEQQAPCyABRQRAQfaLBCAAKAKoASAAKAKkAUEDcUECahEAACAGJARBAA8LIANFBEBBiIwEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAYkBEEADwsgBkGIAWohCiAGQegAaiELIAZByABqIQcgBkEoaiEIIAZBCGohCSAGQagBaiEMIAQEfyAEBUEBCyENIAcgAyAGEA4gBigCAEUEQCAHKAIEIAcoAgByIAcoAghyIAcoAgxyIAcoAhByIAcoAhRyIAcoAhhyIAcoAhxyBEAgCSACQQAQDgJAIAwgAiADQQAgBUEAIA1BAXERAQAiAARAIAhBBGohDyAIQQhqIRAgCEEMaiERIAhBEGohEiAIQRRqIRMgCEEYaiEUIAhBHGohFUEAIQQDQCAIIAwgBhAOIAYoAgBFBEAgDygCACAIKAIAciAQKAIAciARKAIAciASKAIAciATKAIAciAUKAIAciAVKAIAcgRAIA4gCiALIAcgCSAIQQAQMQ0ECwsgDCACIANBACAFIARBAWoiBCANQQFxEQEAIgANAEEAIQALBUEAIQALCyAJQgA3AgAgCUIANwIIIAlCADcCECAJQgA3AhggCEIANwIAIAhCADcCCCAIQgA3AhAgCEIANwIYIAdCADcCACAHQgA3AgggB0IANwIQIAdCADcCGCAABEAgASAKKQAANwAAIAEgCikACDcACCABIAopABA3ABAgASAKKQAYNwAYIAFBIGoiASALKQAANwAAIAEgCykACDcACCABIAspABA3ABAgASALKQAYNwAYIAYkBCAADwsLCyABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABggAUIANwAgIAFCADcAKCABQgA3ADAgAUIANwA4IAYkBEEAC9cCAQJ/IwQhByMEQcABaiQEIAdByABqIgYgAikAADcAACAGIAIpAAg3AAggBiACKQAQNwAQIAYgAikAGDcAGCAGQSBqIgIgASkAADcAACACIAEpAAg3AAggAiABKQAQNwAQIAIgASkAGDcAGCAEBH8gBkFAayIBIAQpAAA3AAAgASAEKQAINwAIIAEgBCkAEDcAECABIAQpABg3ABhB4AAFQcAACyEBIAMEQCAGIAFqIgIgAykAADcAACACIAMpAAg3AAggAUEQciEBCyAHIAYgARAqIAZCADcAACAGQgA3AAggBkIANwAQIAZCADcAGCAGQgA3ACAgBkIANwAoIAZCADcAMCAGQgA3ADggBkFAa0IANwAAIAZCADcASCAGQgA3AFAgBkIANwBYIAZCADcAYCAGQgA3AGhBACEBA0AgByAAEB8gAUEBaiIBIAVNDQALIAckBEEBC90QASl/IwQhBSMEQYAEaiQEIAAoAgBFBEBB+IoEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAUkBEEADwsgAkUEQEGsiwQgACgCqAEgACgCpAFBA3FBAmoRAAAgBSQEQQAPCyABRQRAQa6KBCAAKAKoASAAKAKkAUEDcUECahEAACAFJARBAA8LIANFBEBB5IgEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAUkBEEADwsgBSACQQAQDiAFQUBrIgYgASkAADcAACAGIAEpAAg3AAggBiABKQAQNwAQIAYgASkAGDcAGCAFQSBqIgQgAUEgaiIBKQAANwAAIAQgASkACDcACCAEIAEpABA3ABAgBCABKQAYNwAYIARBGGoi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////HzYCACAGQf///x82AgAgAkH///8BNgIAIAMgBxAhQQBHCwsLCwsLCwsFQQALBUEACwshACAFJAQgAAuYBQIJfwd+IwQhBCMEQSBqJAQgAkUEQEHbigQgACgCqAEgACgCpAFBA3FBAmoRAAAgBCQEQQAPCyAEIgAgAikAADcAACAAIAIpAAg3AAggACACKQAQNwAQIAAgAikAGDcAGCACKAA4IghBf0cgAigAPCIEQR92IgVBf3MiA3EgBEH/////B0lyIAMgAigANCIJQX9HcXIgAyACKAAwIgpBf0dxciADIAIoACwiA0Hz3N3qBUlxciIGQQFzIANB89zd6gVLcSAFciIHQQFzIAIoACgiBUGdoJG9BUlxIAZyIgtBAXMgBUGdoJG9BUtxIAdyIgdBAXMgAigAJCIGQcbepP99SXEgC3JBf3MiCyAGQcbepP99S3EgB3IgCyACKAAgIgJBoMHswAZLcXIhByABRQRAIAAkBCAHDwsgBwRAIAhBf3OtQv////8PfCAJQX9zrUL/////D3wgCkF/c61C/v///w98IANBf3OtQua5u9ULfCAFQX9zrUK7wKL6CnwgBkF/c61CjL3J/gt8IAJBf3OtQsKC2YENfCIMQiCIfCIOQiCIfCIPQiCIfCIQQiCIfCIRQiCIfCISQiCIfCENIAwgBiACciAFciADciAKciAJciAIciAEckEAR0EfdEEfda0iDIOnIQIgDyAMg6chBSAQIAyDpyEDIBEgDIOnIQogEiAMg6chCSANIAyDpyEIIARBf3OtQv////8PfCANQiCIfCAMg6chBCAOIAyDpyEGCyABIAApAAA3AAAgASAAKQAINwAIIAEgACkAEDcAECABIAApABg3ABggASACNgAgIAEgBjYAJCABIAU2ACggASADNgAsIAEgCjYAMCABIAk2ADQgASAINgA4IAEgBDYAPCAAJAQgBwuDAwIGfwh+IAJFBEBB24oEIAAoAqgBIAAoAqQBQQNxQQJqEQAAQQAPCyABBH8gAigAICIAQX9zrULCgtmBDXwhCiACKAAkIgMgAHIgAigAKCIAciACKAAsIgRyIAIoADAiBXIgAigANCIGciACKAA4IgdyIAIoADwiCHJBAEdBH3RBH3WtIQkgB0F/c61C/////w98IAZBf3OtQv////8PfCAFQX9zrUL+////D3wgBEF/c61C5rm71Qt8IABBf3OtQrvAovoKfCADQX9zrUKMvcn+C3wgCkIgiHwiDEIgiHwiDUIgiHwiDkIgiHwiD0IgiHwiEEIgiHwhCyABIAJBIBA0GiABIAogCYM+ACAgASAMIAmDPgAkIAEgDSAJgz4AKCABIA4gCYM+ACwgASAPIAmDPgAwIAEgECAJgz4ANCABIAsgCYM+ADggASAIQX9zrUL/////D3wgC0IgiHwgCYM+ADxBAQVB6YoEIAAoAqgBIAAoAqQBQQNxQQJqEQAAQQALC8sBAQJ/IwQhAyMEQUBrJAQgAUUEQEHKigQgACgCqAEgACgCpAFBA3FBAmoRAAAgAyQEQQAPCyADQSBqIQQgAgR/IAQgAikAADcAACAEIAIpAAg3AAggBCACKQAQNwAQIAQgAikAGDcAGCADIAJBIGoiACkAADcAACADIAApAAg3AAggAyAAKQAQNwAQIAMgACkAGDcAGCABIAQQESABQSBqIAMQESADJARBAQVBrooEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAMkBEEACwuUGwFcfyMEIRAjBEHQAGokBCABRQRAQdeJBCAAKAKoASAAKAKkAUEDcUECahEAACAQJARBAA8LIAJFBEBBgYkEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIBAkBEEADwsgA0UEQEGuigQgACgCqAEgACgCpAFBA3FBAmoRAAAgECQEQQAPCyADKAAAIQUgAygABCEGIAMoAAghByADKAAMIQggAygAECEJIAMoABQhCiADKAAYIQsgAygAHCEMIAMoACAhESADKAAkIQ8gAygAKCESIAMoACwhEyADKAAwIRQgAygANCEVIAMoADghFiADKAA8IQ0gEEEhaiIAQgA3AAAgAEIANwAIIABCADcAECAAQgA3ABggAEEAOgAgIBAiA0IANwAAIANCADcACCADQgA3ABAgA0IANwAYIANBADoAICAAQQFqIgQgDEEYdjoAACAAQQJqIhcgDEEQdjoAACAAQQNqIhggDEEIdjoAACAAQQRqIhkgDDoAACAAQQVqIgwgC0EYdjoAACAAQQZqIhogC0EQdjoAACAAQQdqIhsgC0EIdjoAACAAQQhqIhwgCzoAACAAQQlqIgsgCkEYdjoAACAAQQpqIh0gCkEQdjoAACAAQQtqIh4gCkEIdjoAACAAQQxqIh8gCjoAACAAQQ1qIgogCUEYdjoAACAAQQ5qIiAgCUEQdjoAACAAQQ9qIiEgCUEIdjoAACAAQRBqIiIgCToAACAAQRFqIgkgCEEYdjoAACAAQRJqIiMgCEEQdjoAACAAQRNqIiQgCEEIdjoAACAAQRRqIiUgCDoAACAAQRVqIgggB0EYdjoAACAAQRZqIiYgB0EQdjoAACAAQRdqIicgB0EIdjoAACAAQRhqIiggBzoAACAAQRlqIgcgBkEYdjoAACAAQRpqIikgBkEQdjoAACAAQRtqIiogBkEIdjoAACAAQRxqIisgBjoAACAAQR1qIgYgBUEYdjoAACAAQR5qIiwgBUEQdjoAACAAQR9qIi0gBUEIdjoAACAAQSBqIg4gBToAACADQQFqIgUgDUEYdjoAACADQQJqIi4gDUEQdjoAACADQQNqIi8gDUEIdjoAACADQQRqIjAgDToAACADQQVqIg0gFkEYdjoAACADQQZqIjEgFkEQdjoAACADQQdqIksgFkEIdkH/AXEiMjoAACADQQhqIkwgFkH/AXEiMzoAACADQQlqIhYgFUEYdiI0OgAAIANBCmoiTSAVQRB2Qf8BcSI1OgAAIANBC2oiTiAVQQh2Qf8BcSI2OgAAIANBDGoiTyAVQf8BcSI3OgAAIANBDWoiFSAUQRh2Ijg6AAAgA0EOaiJQIBRBEHZB/wFxIjk6AAAgA0EPaiJRIBRBCHZB/wFxIjo6AAAgA0EQaiJSIBRB/wFxIjs6AAAgA0ERaiIUIBNBGHYiPDoAACADQRJqIlMgE0EQdkH/AXEiPToAACADQRNqIlQgE0EIdkH/AXEiPjoAACADQRRqIlUgE0H/AXEiPzoAACADQRVqIhMgEkEYdiJAOgAAIANBFmoiViASQRB2Qf8BcSJBOgAAIANBF2oiVyASQQh2Qf8BcSJCOgAAIANBGGoiWCASQf8BcSJDOgAAIANBGWoiEiAPQRh2IkQ6AAAgA0EaaiJZIA9BEHZB/wFxIkU6AAAgA0EbaiJaIA9BCHZB/wFxIkY6AAAgA0EcaiJbIA9B/wFxIkc6AAAgA0EdaiJcIBFBGHYiSDoAACADQR5qIl0gEUEQdkH/AXEiSToAACADQR9qIg8gEUEIdkH/AXEiSjoAACADQSBqIl4gEUH/AXEiEToAACACKAIAAn8gACwAAAR/QSEFIAQsAAAiX0F/SgR/IF8EfyAEIQBBIAUgFywAACIAQX9KBH8gAAR/IBchAEEfBSAYLAAAIgBBf0oEfyAABH8gGCEAQR4FIBksAAAiAEF/SgR/IAAEfyAZIQBBHQUgDCwAACIAQX9KBH8gAAR/IAwhAEEcBSAaLAAAIgBBf0oEfyAABH8gGiEAQRsFIBssAAAiAEF/SgR/IAAEfyAbIQBBGgUgHCwAACIAQX9KBH8gAARAIBwhAEEZDBELIAssAAAiAEF/TARAIBwhAEEZDBELIAAEQCALIQBBGAwRCyAdLAAAIgBBf0wEQCALIQBBGAwRCyAABEAgHSEAQRcMEQsgHiwAACIAQX9MBEAgHSEAQRcMEQsgAARAIB4hAEEWDBELIB8sAAAiAEF/TARAIB4hAEEWDBELIAAEQCAfIQBBFQwRCyAKLAAAIgBBf0wEQCAfIQBBFQwRCyAABEAgCiEAQRQMEQsgICwAACIAQX9MBEAgCiEAQRQMEQsgAARAICAhAEETDBELICEsAAAiAEF/TARAICAhAEETDBELIAAEQCAhIQBBEgwRCyAiLAAAIgBBf0wEQCAhIQBBEgwRCyAABEAgIiEAQREMEQsgCSwAACIAQX9MBEAgIiEAQREMEQsgAARAIAkhAEEQDBELICMsAAAiAEF/TARAIAkhAEEQDBELIAAEQCAjIQBBDwwRCyAkLAAAIgBBf0wEQCAjIQBBDwwRCyAABEAgJCEAQQ4MEQsgJSwAACIAQX9MBEAgJCEAQQ4MEQsgAARAICUhAEENDBELIAgsAAAiAEF/TARAICUhAEENDBELIAAEQCAIIQBBDAwRCyAmLAAAIgBBf0wEQCAIIQBBDAwRCyAABEAgJiEAQQsMEQsgJywAACIAQX9MBEAgJiEAQQsMEQsgAARAICchAEEKDBELICgsAAAiAEF/TARAICchAEEKDBELIAAEQCAoIQBBCQwRCyAHLAAAIgBBf0wEQCAoIQBBCQwRCyAABEAgByEAQQgMEQsgKSwAACIAQX9MBEAgByEAQQgMEQsgAARAICkhAEEHDBELICosAAAiAEF/TARAICkhAEEHDBELIAAEQCAqIQBBBgwRCyArLAAAIgBBf0wEQCAqIQBBBgwRCyAABEAgKyEAQQUMEQsgBiwAACIAQX9MBEAgKyEAQQUMEQsgAARAIAYhAEEEDBELICwsAAAiAEF/TARAIAYhAEEEDBELIAAEQCAsIQBBAwwRCyAtLAAAIgBBf0wEQCAsIQBBAwwRCyAABEAgLSEAQQIMEQsgDiwAAEF/SiIEBH8gDgUgLQshACAEBH9BAQVBAgsFIBshAEEaCwsFIBohAEEbCwsFIAwhAEEcCwsFIBkhAEEdCwsFIBghAEEeCwsFIBchAEEfCwsFIAQhAEEgCwsFQSELCwsiDkEGagJ/IAMsAAAEf0EhBSAFLAAAIgRBf0oEfyAEBH8gBSEDQSAFIC4sAAAiA0F/SgR/IAMEfyAuIQNBHwUgLywAACIDQX9KBH8gAwR/IC8hA0EeBSAwLAAAIgNBf0oEfyADBH8gMCEDQR0FIA0sAAAiA0F/SgR/IAMEfyANIQNBHAUgMSwAACIDQX9KBH8gA0UgMkEYdEEYdUF/SnEEfyAyRSAzQRh0QRh1QX9KcQR/IDNFIDRBGHRBGHVBf0pxBH8gNEUgNUEYdEEYdUF/SnFFBEAgFiEDQRgMEAsgNUUgNkEYdEEYdUF/SnFFBEAgTSEDQRcMEAsgNkUgN0EYdEEYdUF/SnFFBEAgTiEDQRYMEAsgN0UgOEEYdEEYdUF/SnFFBEAgTyEDQRUMEAsgOEUgOUEYdEEYdUF/SnFFBEAgFSEDQRQMEAsgOUUgOkEYdEEYdUF/SnFFBEAgUCEDQRMMEAsgOkUgO0EYdEEYdUF/SnFFBEAgUSEDQRIMEAsgO0UgPEEYdEEYdUF/SnFFBEAgUiEDQREMEAsgPEUgPUEYdEEYdUF/SnFFBEAgFCEDQRAMEAsgPUUgPkEYdEEYdUF/SnFFBEAgUyEDQQ8MEAsgPkUgP0EYdEEYdUF/SnFFBEAgVCEDQQ4MEAsgP0UgQEEYdEEYdUF/SnFFBEAgVSEDQQ0MEAsgQEUgQUEYdEEYdUF/SnFFBEAgEyEDQQwMEAsgQUUgQkEYdEEYdUF/SnFFBEAgViEDQQsMEAsgQkUgQ0EYdEEYdUF/SnFFBEAgVyEDQQoMEAsgQ0UgREEYdEEYdUF/SnFFBEAgWCEDQQkMEAsgREUgRUEYdEEYdUF/SnFFBEAgEiEDQQgMEAsgRUUgRkEYdEEYdUF/SnFFBEAgWSEDQQcMEAsgRkUgR0EYdEEYdUF/SnFFBEAgWiEDQQYMEAsgR0UgSEEYdEEYdUF/SnFFBEAgWyEDQQUMEAsgSEUgSUEYdEEYdUF/SnFFBEAgXCEDQQQMEAsgSUUgSkEYdEEYdUF/SnFFBEAgXSEDQQMMEAsgSgRAIA8hA0ECDBALIBFBGHRBGHVBf0oiBAR/IF4FIA8LIQMgBAR/QQEFQQILBSBMIQNBGQsFIEshA0EaCwUgMSEDQRsLBSANIQNBHAsLBSAwIQNBHQsLBSAvIQNBHgsLBSAuIQNBHwsLBSAFIQNBIAsLBUEhCwsLIgRqIhdJIRggAiAXNgIAIBgEf0EABSABQTA6AAAgASAEIA5BBGoiAmo6AAEgAUECOgACIAEgDjoAAyABQQRqIAAgDhALGiABIAJqQQI6AAAgASAOQQVqaiAEOgAAIAEgDmpBBmogAyAEEAsaQQELIQAgECQEIAALswIBA38jBCEDIwRB0ABqJAQgA0EANgIAIAFFBEBBrooEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAMkBEEADwsgAkUEQEG6igQgACgCqAEgACgCpAFBA3FBAmoRAAAgAyQEQQAPCyADQShqIgQgAiADEA4gAygCACEAIANBCGoiBSACQSBqIAMQDiADKAIAIAByRSIAIQIgAAR/IAEgBCkAADcAACABIAQpAAg3AAggASAEKQAQNwAQIAEgBCkAGDcAGCABQSBqIgAgBSkAADcAACAAIAUpAAg3AAggACAFKQAQNwAQIAAgBSkAGDcAGCADJAQgAgUgAUIANwAAIAFCADcACCABQgA3ABAgAUIANwAYIAFCADcAICABQgA3ACggAUIANwAwIAFCADcAOCADJAQgAgsLpAQBBn8jBCEEIwRB0ABqJAQgAUUEQEGuigQgACgCqAEgACgCpAFBA3FBAmoRAAAgBCQEQQAPCyACRQRAQfOIBCAAKAKoASAAKAKkAUEDcUECahEAACAEJARBAA8LIARBIGohCCAEQUBrIgYgAjYCACACIANqIQcCQCADBEAgBiACQQFqIgU2AgAgA0EBSiACLAAAQTBGcQRAIAYgAkECaiIANgIAIAUsAAAiBUH/AXEhAyAFQX9HBEAgA0GAAXEEfyAFQYB/Rg0EIANB/wBxIgkgByAAa0sNBCAJQX9qIgNBA0sgACwAACIARXINBCAAQf8BcSEAIAYgAkEDaiIFNgIAIAMEQCAJQQJqIQkDQCAAQQh0IAUtAAByIQAgBiAFQQFqIgU2AgAgA0F/aiIDDQALIAIgCWohBQsgAEGAAUkgACAHIAVrS3INBCAAIQMgBSEAIAcFIAcLIQIgAyACIABrRgRAIAggBiAHEC0EQCAEIAYgBxAtBEAgBigCACAHRgRAIAEgCCkAADcAACABIAgpAAg3AAggASAIKQAQNwAQIAEgCCkAGDcAGCABQSBqIgAgBCkAADcAACAAIAQpAAg3AAggACAEKQAQNwAQIAAgBCkAGDcAGCAEJARBAQ8LCwsLCwsLCyABQgA3AAAgAUIANwAIIAFCADcAECABQgA3ABggAUIANwAgIAFCADcAKCABQgA3ADAgAUIANwA4IAQkBEEAC5gHARN/IwQhBSMEQeAAaiQEIAJFBEBBgYkEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAUkBEEADwsgAigCACIGIARBgAJxIhRBA3ZBIHNBIWpJBEBBk4kEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAUkBEEADwsgAkEANgIAIAFFBEBB14kEIAAoAqgBIAAoAqQBQQNxQQJqEQAAIAUkBEEADwsgAUEAIAYQGBogA0UEQEHkiAQgACgCqAEgACgCpAFBA3FBAmoRAAAgBSQEQQAPCyAEQf8BcUECRwRAQeaJBCAAKAKoASAAKAKkAUEDcUECahEAACAFJARBAA8LIAMoAAQhByADKAAIIQggAygADCEJIAMoABAhCiADKAAUIQYgAygAGCEEIAMoABwhDCADKAAgIQ0gAygAJCEOIAMoACghDyADKAAsIRAgAygAMCELIAMoADQhESADKAA4IRIgAygAPCETIAUgAygAACIDQf///x9xNgIAIAUgB0EGdEHA//8fcSADQRp2ciIVNgIEIAUgCEEMdEGA4P8fcSAHQRR2ciIWNgIIIAUgCUESdEGAgPAfcSAIQQ52ciIXNgIMIAUgCkEYdEGAgIAYcSAJQQh2ciIHNgIQIAUgCkECdkH///8fcSIINgIUIAUgBkEEdEHw//8fcSAKQRx2ciIJNgIYIAUgBEEKdEGA+P8fcSAGQRZ2ciIGNgIcIAUgDEEQdEGAgPwfcSAEQRB2ciIENgIgIAUgDEEKdiIDNgIkIAUgDUH///8fcTYCKCAFIA5BBnRBwP//H3EgDUEadnI2AiwgBSAPQQx0QYDg/x9xIA5BFHZyNgIwIAUgEEESdEGAgPAfcSAPQQ52cjYCNCAFIAtBGHRBgICAGHEgEEEIdnI2AjggBSALQQJ2Qf///x9xNgI8IAVBQGsgEUEEdEHw//8fcSALQRx2cjYCACAFIBJBCnRBgPj/H3EgEUEWdnI2AkQgBSATQRB0QYCA/B9xIBJBEHZyNgJIIAUgE0EKdjYCTCAFQQA2AlAgFSAFKAIAciAWciAXciAHciAIciAJciAGciAEciADckUEQEHajAQgACgCqAEgACgCpAFBA3FBAmoRAAAgBSQEQQAPCyAFEBYgBUEoaiIAEBYgAUEBaiAFEB0gAiAUBH8gASAAKAIAQQFxQQJyOgAAQSEFIAFBBDoAACABQSFqIAAQHUHBAAsiADYCACAFJARBAQu4CAETfyMEIQQjBEGgAmokBCABRQRAQeSIBCAAKAKoASAAKAKkAUEDcUECahEAACAEJARBAA8LIAFCADcAACABQgA3AAggAUIANwAQIAFCADcAGCABQgA3ACAgAUIANwAoIAFCADcAMCABQgA3ADggAkUEQEHziAQgACgCqAEgACgCpAFBA3FBAmoRAAAgBCQEQQAPCyAEQfgBaiEGIARB0AFqIQcgBEGoAWohBSAEQYABaiEAIARB2ABqIQgCQAJAAkACQCADQSFrDiEAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgECCyACLAAAQf4BcUECRwRAIAQkBEEADwsgBiACQQFqEBQEfyAEIAYgAiwAAEEDRhAuQQBHBUEACyEADAILAkACQAJAIAIsAABBBGsOBAABAAABCwwBCyAEJARBAA8LAn8gACACQQFqEBQEfyAIIAJBIWoQFAR/IARBADYCUCAEIAApAgA3AgAgBCAAKQIINwIIIAQgACkCEDcCECAEIAApAhg3AhggBCAAKQIgNwIgIARBKGoiAyAIKQIANwIAIAMgCCkCCDcCCCADIAgpAhA3AhAgAyAIKQIYNwIYIAMgCCkCIDcCICACLAAAIgBB/gFxQQZGBEBBACAAQQdGIAgoAgBBAXFBAEdzDQMaCyAHIAMQByAFIAQQByAFIAUgBBAKIAUoAgBBB2ogBSgCJCILQRZ2IgBB0QdsaiEJIABBBnQgBSgCBGogCUEadmoiDEEadiAFKAIIaiINQRp2IAUoAgxqIg5BGnYgBSgCEGoiD0EadiAFKAIUaiIQQRp2IAUoAhhqIhFBGnYgBSgCHGoiEkEadiAFKAIgaiEKIAcoAgQhEyAHKAIIIRQgBygCDCEVIAcoAhAhFiAHKAIUIQUgBygCGCEIIAcoAhwhA0H8////ACAHKAIgayECIAcoAiQhACAGQbzh//8AIAcoAgBrIAlB////H3FqNgIAIAZB/P3//wAgE2sgDEH///8fcWo2AgQgBkH8////ACAUayANQf///x9xajYCCCAGQfz///8AIBVrIA5B////H3FqNgIMIAZB/P///wAgFmsgD0H///8fcWo2AhAgBkH8////ACAFayAQQf///x9xajYCFCAGQfz///8AIAhrIBFB////H3FqNgIYIAZB/P///wAgA2sgEkH///8fcWo2AhwgBiACIApB////H3FqNgIgIAYgC0H///8BcUH8//8HaiAAayAKQRp2ajYCJCAGEBcFQQALBUEACwshAAwBCyAEJARBAA8LIABFBEAgBCQEQQAPCyABIAQQGyAEQgA3AgAgBEIANwIIIARCADcCECAEQgA3AhggBEIANwIgIARCADcCKCAEQgA3AjAgBEIANwI4IARBQGtCADcCACAEQgA3AkggBEEANgJQIAQkBEEBCwuahQQCAEGACAv6hAQBAAAAAAAAAAIAAAAAAAAAtUsEukjlzvvQbN4IH3uBVlJGtSHAWuua7D7tbnPTnjpKl8dFDAFC0sEOYI6YF3WraWlPnrhjxt8jwMm9KFnMe1jvq1BPfD9gEZd4SviE5lz8Sk+nATwTTlcoy8N1dk3kS/sbHpxLV7WjIFOyG9JkjCBuAAps2GoZ4iwu/i+2vCVwR43umyRQM3BiaUmxYEuRHqXN1pElCOdvFhiBpJjaaus67KMaHd8ABwxNCADf3RyFui0R2rynoHd4hPOt3zTCQ1c/eipVYe3RlTqfLfmGT37K6UyV6hC5+00mY+hKqQAjCAQ3zhdx7Q9sVRnPelVBZwTYBhQz5xWP0NJq8fdTf8+iIm7FDp0gNa8uhYHfpRR7qKjht+NRw3Q2PdJQx5K2y6AgSJwhqPlHjLNUORqWu6IONLMv442Dn7gtJRdPjLEJHEKtrEuOXzakQxfeJx1Fvgr2G/F1s0dVW+eAQccfaZ0ttWm2kQIa1j9dRwP3Lr9flSWBcPPrbEAywPOd/bWO3BEUOTMvxNDXKJl6BLBFssuonK4vtZYRcyTYpxRfO3BcWIgPUXnq712BP449Z+W9fBOkbRvzYU3AdvJJqk7XXnVIUC+HRbwrZbPsfP60RzdMRCg5Hrsb5aHtQdJH7Lgpy5sZ1KfWHOsCa5N3X6mTa1S8LgYkI9f3v/hihTgyaYgQecFOL8j+LHm0mQ6RZH9rxFbFIcLuvTLJFhnorQdKRM8Y6wjhOPWzjXAGUxWdO3FaN/nvtlHBdwBSre4vTAguIZFf4aek6MOmHpE5KM9fDlj+tCB+UmD13O1sIoth3eD8o4Y8WFggl7iSE99lHgxmqhG+r75emhu/u3czV6FjoA3ztqcwTgz6KgTZaVIGnhWZtq68uAu68vJggy4aRpmb/VRBJZWZi21QI5GCm6Q2kHbNQX1gVU89A1O0PAT+5z9LBP/9VE6pzrbf5Wyb7L61sYzSTphTBsIbyNnZqaNNUM+Wf3kC12t6Sd/mOXmVzPeU/vkP5LkgzckzgYUeDdTL+3ZDSPbZGQv5QZZHxgufggPl8GDVAGOtqua8HqwK7N2hrl8ONLxjZZ1HOG9ekoCPTF4mPL82Z3NeCIP8sfUvM8FiNbJyIeRkK3pXkfPtFEsxHVfS8SLFQW4kLLjrDFPciqkybwaJ+572mP6it8WkB97O5Rkk3oGLKWV9hZPdPVZzB9tYsbxRpBFQPOjrv6LAUyEt+0KJBXgy0Y1BD9YEdqlQXVOQ3qJPYzcqGKgldrOaWSzWvZLvYwTE4dmuFL44eo3sy7Qnl6YZ8q0Mr9DLkQvHUohCveL1KQiyd0RnicuTED4hQtl31z8ySt0ADZS4ELnYOAY/DZj/DeogetEQV4FPZU1z7GUJw9Ymy5/AB6t59MHOLy83uLL3zRzrYoQbJZDMDAcY0aOSQ8CiGKTu5DN9w/snZN5VHYmntFVnLwZdm8YA0tlNgw8EImDcQyNGxzoaSFsUNK6TfmkbAkz69j6UCAznGh1Aw8pvjVn8kephnjHT7bpKuCiZHzVL4OVd1EIS6GYI04GIduWKQ2V9P6/JReUMzXOqFLT52FhagM9rMMNP/B/Xj61H5PxOkZ58dCcoI2/rw/pcyqKZF8ZV9HPkcgr/sGUSQpQyEUTrh95P+8A2psWsbi3w0Yil2dtI0CXzSnDXjmCEC5yXfusp6pG9scoB47HjFtnBXSVtIJrUgCdlhEiAiKMR2OYbmIecMk4ABd3wbq0zd5koe2OzzvXDytp/dqlf7yFpJMkLbx95lzhd/Amjc7I26MCXXu1qGIpwQwyRJpaTSBek4bUCc0nHCecLctthre/rUqLcQIn9XjD2nW5TwSaAZhF/P2ReI8TVf18SxouFxTYevtew4eBJNMuMayYFIvDBuPV4LTkAWWFqL0WPW+7Ml7vLwzOq7z6OjJI7fHOe6hPm3DA8JvjyYVIl6VMieTI+fbRQuukqGzoZLTb9Z+lfgL0ZkFzvUkQh74JeDpNmpFW0XZbzOcFD9Kht7WQF8GU0GrAHTFOxUBX2CKOtxRtvvTUro2mPzZNz59lquczQkeKmtMA84mxSD5AUAvug9/4nqKbUJWc1TySJL5mY2MJTdiC8G8+oKEAWaA63X7XdrJ+wrBv5aRockRo8XZv4Rjqr1ldsI+6W4zWyfqVG0vRV04QvG7cDswPbyHuBwbm38r3kGvgFxlR20TiZVBCfQlueBQa+Fna27AaaCbHE2TcwfbIiG1+SLNk2MSYwcxrhLMzYxelGowBPXEhjrM19l3f1zn23RW4o+dCtNuKZZ/oMTwUw2T9KlLdvWpCzWsfAYXjWUJyCtwVomPbjQ6o+qvAH7op2PI7NCt5Q15B2NF5mcqF0BSrMjcUO/Ip4caZUnJ56ksLTM8MRh3Rgi7P5voeEIxdd59WUPmR5lwOmdo+SmtNuFzGyDX8CZOwJdhfb1fPCjm6hruuJBooLW3B0PbFPIK7M4TraMkL+nCUFlD8dd9zSYjX1somjzqJdB0Rx2R4WLuD7iijyCu55Pc8LzAiDte+YQyVT67ychZWD0jEIivMhZsHiV3lSel1obnA2P++AIPWn5lVrXbsa1tSwCwjJwshjogE+JTH4jXAbxPl3bA/KucCzbKWZc5lrVHslPJx3WKQlOcaSfjVbSecmTOWOcFcvgm0frWzeTsJ5/lnu07Hpitg1HvPnizBKco51/K40UXmPa2GGsTkyKkxyiFER2FPzdN4Tz80L0npxqvmkgRmHuZnCcus1p08ZYAFJi0EY3pHpaj+RSwJNyRswZvvaiXzMhydzUQCXLd0K5fKE80AaAeh+ZSZfVkB0reCfLc4eTw6m61Pl3szlQZBblBVu585bFiKWq/OIX+aNjp7hDra78eXrs7eaVr2Q2NGE4ue6OziP/o4rb7gq34ys89veTTRTrWYiIYdRpUbMD9i3ZZIODmCiFb/vCseyXC4/MJL4XgGUP+c2WvrOTYW0Yzj+l6CQD9Ad35W5D3bspJWV1F6B+uGuW7YpujpEorfBp+9c+Y91OM/06KXS3nJoKvSSB5EbYMFBTRlSwEFuelk8/9+/lLxDJ/2rFiN+kkmsgDbV6HFUyZUoaEmZvtymrhmA2ZcoEldsy6MAVu/g+3ujw/5nPVU972vdLpN+I55sw+3ZBbEMw9+siloT+x3jPZIU3Vvp3VFNziB4dMl3JBMPR3PHR3J7wf9AazUi+2Bg4XE/EbKROoSIc36yKyikp2Ezo/RUcC5obzdScWOYVZGcS6OywftPTUQM7+ncSjfbccITYQY/HWToIr8czYdzs5aKrKFAy6mu82nSW8Vy93EsdePzB0wacVBiOx4e8ooTwfWal0J1gkO4JmkRhwFVKqXPK5jaakU8JJMoG1gfAhcXJnYydKcDpqanU5nPfPYeRD5nTBwUp9xwa3/0EKbEcQkOMHIQIhq80nncDCIVs97YgoWu75i4qFh3A1dZWrswcIkiXCxnvijZPPpV2yBWGERnjSCwqI2ThNHetVOFyj0uTvBrvjS4iSnnB4Ru9cF9IoCS5vcyt5mt+Y8LAPqYPRAYYWQqzXY/8wF2z+8F1+Tm9l+KKVeR0HhcyO/D+vt6Zb2R71U31plhh75RHY2ltgNElhnOAZZYIFDXz5MFUvR+fgbZyQqx9erMfr1IOv/a4XpRsK4G38V71gstDyFSlKetGa7YaNAHAmdWlIolNnNnRBHsFFipsxeWM3O48czqj3P8zpOGESZqGvfB+ZdiAENaXrPk1ykmiQ4ylOirA4TImM4Rd365feSPVQ8ckq4746/GMDNT04Nzd08pidrR2OX9TstUOOYhdsIgmmuatRbq+HIWC77hgSimsEPtu0O7gnch6v4gwJ6oVHR/lXX26Z/s6En2BU8EKUOW5Jre2s/VP0iluiJSbChgscZhdNoYhV0lK0zm3Yt2BTXf7DbD8rvrrMrFHGjljxW2NAIIqcHc817Q6gYaH3KGOoZCpUDXDUSusLfHxIWxFQpz0Hscka1rgW4eZmPnoOyyVJGV5dxcAI8svY83/pwZC9OpvuhIrbbx+WOx4oNwFGfVnIMnQPpzukSVKweUInAfBadWoRV/X/VsnXUwhlZ/cRdzRTsHy9sSmV7M7PcHR07gV/osRAqHdgQKhWTMb2VGVaFiwKCyzGguVze89dDLO7l8g6H73qaR0qxffM16wsoPFtJ5fKxohlZ4f/dWAY7opyNFhAMUm/dQKv1K0TKoNxcrj2zOWNcccx/Tsb5ldsSkwmUBUIRb+0llNECbGXUS1dOBogDsNdXV+/y4V+s5XvKSDHp9rNWcQCgT9Clt2rbalhWK+HUAy9TIYTXB8EF0oDX2CPEsqZlWzmZr9OQR0r4NT/0GziF5EX008zS0D8e0CbdZEq5UGtNmbBpOAMukr8aBHoUMdoS2jq9nrQn0inziAy2+TVJ0ro9Dth2pwckvKpS3bnIOncOUr6Nixif1yR26IPQcX4sub/46kiTBwjdM0a7npxwDdN3wac4q7Ag/H4D/kAVC8eXNkggZFX/Rnv5Ub8ANf059tol64GxhnrxA8+adB/WhMM+vKOEb5Rr+3nvmY6hGIjkuRsLAvbZAaTOkM4W1JZrsJsy3ZctU6tt7/7TmQekFHTSpOR+dJtCJ88Vt5PJnr5YJmBNBx2a+in3yAByznkxkMZ9E8Fr/lpORt56EtQbSF3ejN6sLY3fK9RKhm4ulhNt4TNxyeERMd60QqpvXZomEVLe389+PvAZMZdds+Fbaqs9yLPN6QYpjZFQab8++VfERUcrLbWkXP0VmPiSdGB8dNYpN6wArSWnxrWWSdn0MaqtXuTm4kSEFK7HWnoVx4GPk8zpGGB/lfw0eI5cCP0OXQkdHteRLTbRzXnOat371AYe5+KPEUtqt3nf5JuZXr1s58lNb1SZezlk4B7NArhK/QFkB4cdfq/JPwl393LU2FL8xGs4ChV3PGvSR/b3hPJnKN69YM2Jb2/tiNwqGgYo9SfgxaylqVb50w+xW2MaVo/tMOhASkxAYb9Blj+IElj0eIxsPRiGoN6sAEAOhY0kCv7X9AjvfZJaLEyJzooPvT4nad5yAlFPaxMQKIjJQ95ktrcn6nSz9Q3jp0y/QaTK8xM2GCkNoH0iH/fwIToTMPwNJ+C9RmwPEMBCMoqS4zYakItICfnt58bH8CyypInRmkO1db6QlHWbZ8nWLohsoSn59LU2uosd4a5p4QcnNZ8cilnI4mqG3be6NikOqzyGYG0PkAMSKX43gfaDIf3EI9eIOcrCDj70U7VBPw3KR3i5lDndLJZTztDdMoUPiRDh8R+H5i0DlX9E6CXhr+6EB8Uu7AUTpKVKRF/eoQr2MeFEwj/jSJb6MxYT5/h6toCWjP8/ZNUK33laIk5I0U97xTTYecPgw8H7lHGXWa0bf5P5l/KiX/N8azgB32Hu0CAg6xQL8F0OS5xuMMLMXzHtPBtrHtI0e5SrhOeMxqiMVRKj3M+M52eGMXvYMflkM/aSVMROSz7z6uFVF7M4hnpWLorikLCS/VIxJf96Hnld9eoijVgU7+VLd+3806i3wLQPQQqdtkulEZdFgT4kJemRqFLatG6zU9XWaT4XZhvI+PYUBas3ce5fpneL+uklUjoJQySdpnzdhz44jaknjkSDypVNYcUp+BHCiEhb0+FeCW61S7NtSYrSH11q6avleG42pDyLu3GdXIwyPvr7138vc94PTHp6ZQzQRNm1sAOgtlGIoQnZNUI0IFksbE0OnsaXpwC9dHcGdhj19s6Ow069gUG9TQLvCd8rj3FZBNDZ5ZJmS+PfAGtn/ZUMDtlNKw2/1W+Dp4J4w1b2xDzTXB9uDcBsadnpcx0NpO4RQ2Txd9Cv/6RyLYweKtUWeENAvOD3A+rGCLyL36ylcbDyYeHqZMkGec1tOvHrRANBKudLKnf56Oeo0II1977WTcRit9F+J4WEsUbdq+GlpaVoQphxBo3uoJIEuyQnF7sfVwu4Q1l2FUhpt4h2CThKog7qydoc3McA9W9Pc5kLpT7ffEj5stLgfJ4StMSfrdWKerbfXajmodLeF2grUy5uSaoJZt0HNeccem/UKMf7z9HW7u5us7Yu5SQ5jALGcSoIdNodmEnLTUMY1n1VNStDB2yA3FDt5PZ/A6poctC4z3yCiAYUIftc+umpT6B5jmYF/1URjLM1VZXjIYIr0P36STyqQIfCPE/8Tu8L33BF6NzGb06k+oEbg81Uw7kQR90ZgftuPKcGVYkuWR/V5o+eFE2w2xDr3WTJB3bS/gbs0BCb7EPF9IxlfmI8x4vo/t/uzL7gXR2QopqfivJM5SPcgw+e8EtxpTvMO9p6h2O/hQh18TDneNSeSZP+f0ucRHFtDCrdm8go7kmA8xyWWqsyBfijiEVfVF7yEUd3WaSZUH5XyiyLMwr0BoJTvzWdrYCdf2xF1xVqV0DIglXFzB9YuVQoDuVb0qwTRxck8jt/s38JjWC3WHLSbf0qv6E9wOq7mtuZW6Qs0JecXj/PDdJxV0YuW/7OdBigktA/eAaV07lkAf+RQV93IurFUy0HsIvKbLMqHtJRJBx80PssrdfgPOAz+YLKFxgDPfq8CZbrF47TmDIirllrzp9PJSntCf06hc4YzyXJTQYuJYishN8ef7StBCe3z/Ed9soKSDH3u5HnzQFb4g55fZrutqYhqYtKW6xsw7u9NYqtyL+P9DTab7ZZzGGJEo2nfhckDfbJfjGbUxSU1xIbUTUZHTOtzUd5Y1/XSsQ4MSt9AAUhbyGGk3OnfE8vzJmsP+mxAuNwbwSFUL7DI0NFApHZGucx0p2WZ5iyF5odtq6WDVkxrGfCcSP5vkdKDRkow35trt2fWNmLAbCXpIbBfrpY2YNN0S5uyN35iEn3R/kHik3TVUFXkGLY2jVxrNmjnZI7CFDE+yhsLPk+3AyYTrzb8wFu5GAo2631xXcdp5aQwATR0EjfPH4CQn9yTW7aK16KBn7pvE4QU1djjLIMOpwhl4NsBm/yShyANQ0agSMA0dIBmk+EK4WwFaH7FhXwu60CRl96FN8NGAuC+7flR0gZbRAaqBHvcIlDLuKCCP4xS64b6hSUFQcTeY2wZFSVxJsxVZGVzUnNLhr208LDb+jhnZ+8PP9asut18qopJ+DWev9NL976IGHeP8FTXhsC8DisKQ00qAZQ0/RlGvNS8bZHpOZoUK/fFTdINKsU5pEr96ZZ7WJ2hLnz8cIJGYKC1WLZzIVPWUEGRRdp/HNSCVE+ql5dcvL009WqU8eUzxophdmniUL3mfa8VcFM5lhwuzW3cN4Dwceku7C95JBYPyDtJ9vSCZqOU0tAHxhiVo7btQNLVbZou0g9c5Ds4YCbmcnn2deQWpSi+/4ZtcojyY8d9WWifb/E6J3MYtmZUMU3AG4XHkUCFEBOsWQAWqCz2LXZLndbBn0QqZdQZb5uPDV9NCil+BlzKzipNLxsFbFe9ZHaDWoUb4vcpPr/9GA9pRNxRtz/EZfnTgD2QFkq5oi5yhAvZTTt1nh/M78mSs8SPUgnofO7T7ur3ZoQ9/WqHBxE8EK81+CJZLr9nSiVuJAy2FmiXv8myNtb8wx87ReQ7ngzBx33mjmYnMLYZwUKG2PA0NGBvzbgNoFNkY6AsWgHWxCSndggIshNqPxJB9g97OIrlSzX+ndWyvUA+ML4X8t4WhjFMEd7yqDTqS7gP8cJMuvUAOz4H1OmM0Ey4+0Z4/GbScu6crbspJ1mcXija99GEGX10ACRjqP0v1wtBYoNSQyPVvTKsqHEhxi60gUW8m8xmO+acRpkpvOKVeH9B+J6M9741aTkAH25AB1oapoJBWSHVpV8XigVvgu8QXhq0kw63xu3tZ5CK9QboHljhXGRxh1Qu8chCCTzzwmZokZuBIwzji6WrW5UD+TSZ3M6fjZrqJ+Uk1qTDANELX5THS+0oB/tmXdLZadH6i8c4NhPxEIEEhl6MOIvHrDYMY8PgGGla23uI+WKJ2gaJKpsdrYLB7nddv+IB9nR80baIVxnuoJM75mHR2+asd6f6F03Ta7rSzZIGlxzxkc/mX/1kYNDvplO8M7AQPrIosiaT4HmtVmSXTB4wwxJX9/46zjdBcAQIpUXrU7fM4rA7FxpHGfAq+IPGa3blT1Fd4PD4L5humuwnK67cQj+8pBDk6OzBr5FzHdvhaNhYa+JyuBOau7rBJvipwYbz/ELA2qSJxYRBhFd7Lv/eLjJw2ZpcLXgG6wDy00JlVRPjr1Ygi8MbUvWvy5ctdmSSs1xAZaW7J1WALTWjk+58aJ6OvKXDK8yAY8FAUrhZB0uLr4GrDQRpF3hJ7Pob1TczuQNM9P6nGafVilIChMcmGcZjCx4WjeT6qpj9T7NAab8uLCkDI0/Kjn26b7NyzldKvKH3B0QN0E+6beG/JjZarCjZZID7QRZTaqNUezMGGFP3zDJ14N7r4qukF/hSxRCGZDQxD5y2PL/HPnpfDT17q8j4ZmWxOpp0d4z8cVztHKNaOTeepwSJuesWHBv73N6gzrR/YKevfgDQZbFE/NIDuXtwHTijmaFncGyHElTlnKlSV08/jwL52lHWTdu6gZsFTTeBJgPpt9fgpzQE8Rkq45anbnttNKcPXCv9xMVtzB0cRpriRFonRYr4Kw3bqBNnTxdgFh695/3QutfePOYcxZgJGw34a8JPCRH+iZK0WogsCEELhTKXGox/Bik7YdCoXrNeT5lGtGl310YbJ70oHrKN7iCOuNi30IgoJiJO6CX4Th5jpP4lZByLOJGRjoPldXRUzwWZi87Xmw/dNDNL3UZUq0TWYa9Avg5gpZqU5udJBxhK4Po9pMz0rcaYva/ecLh4JUiG1S+KwBZvZnTifURSqZq3P5ZTHsB7Hw0oABF+6tS3gpfbGN+8fc35LOGDWZC0xPTgBMaLMfOTA2lxdmHiGaqlwxugEagUnHUcv68jX5vrWjADd5tA1EfXitapaMUv35XCgjZb3vCfwo/24z5Fcs1uTtdKp1YuKxcMbGeN0h4/5fboW4PwGsvgBP3gnoEAr8HfRmj8eP3UNfco5TBmqCsPMjQXua7pT4zEg7zk33g3j+/RwQdQxJcLAKXiJdInqeGs53omx5L5/tqbqnxBHoMmxmwVK1C5Lv8aqQOf0Fw01hs9ImMUMmQZutjHHlRPgnZFZDgG6I+14Zka3t7U3toBG7R2y+JVUjzEdEZIyL6Op2wjDDW/77eku1UhYbhj9m8s2X8+rUucYUgcfEPY82OvV/UvLtnRNI2wlOYCRYJz3vgTB0+v5bgIQl7+L6Fi6t/i78seqivUU9dDiGGoXmQR+4VNo0alfk4kHZgIB4RV3lr0eGmkVuMc2Nyh7xJ7KvoPd2ia/z5wAKlpcvR0ZbJcwg5lPWa1pb5uO3Tfv9RYu0dgkJcvWDkkAOl9EvR0WZkW4w7WtihO7AcLHXzg07xFE7XgUuKjFA0miJQ9rO9Z/HrPa2iIKlyT2/g65fiQaZWxZdevtnJngSEavUZ0E/ASkbxkeFu2PWGebI3jKRxbaB2Fq1h/ve3cZxZJ0SQe1+R0Cktbxofq8WVjD94OWSh0PPc1rP9avfyFAPpOeY7TGcHrBopurx257NKzvjKNmXSvUuG2ZzbqD5vNsbEROZKZOhiwbGtNgNgHhB20DQBDJjKVocxvHJPGe2iMb2XkRKDkfGWU9lXdAG5+d0z3XY4C4WzhvZ4ntue52tZMlOv6g/4U28qDAWCFESK3osM1r/7mbhSq5TM+Lle/hkc0Cw62JlIQOyWWbas9Q/ZDKeKGdn2KI3NVEw1w2wxhOPnknA5lyztAa9RJlQ19JbEbH3az7gv2ugCq/pNxrkkycporNMAhoBRRH6J5ZvhCYKzsCOMbqxb3SqFVT+8NpMZnSun+LVt2NF0ooDvN7xU+nd8/dXXqYq1afEVxeWW82dDxv33pgiWN3A88K2JoBauwdXETTMbTuThoMJoNiVp5qvDCzGd/knOLRDIvqgjEIOUioJcKymFX3NhUkAURv59HH+asAmxpFLl3ZjEUM6WcFbBXfqETVgmj+EfzJjYqg+3OCPJXTm+a9Aw72EhUhp2pQ7ICR44cFST+wjH+KE6yDeQmeDaKJny4u2vmRDk1yDUJFV+gQpdQbM+SY8YvJMCdKXhsv7L2WhIZWYQ0hLffi1hIOiOCieZW98NwqhGYRfYUGpLDwSYTSo8+lkdyRqvnFQTUKhY/bLp1TIqF2qW+2kfZCXFvxXU8d5ovBAycFPboSHxT8KXUG0pADbcuWwDw4FrN7evWBuVXdtXgvkybYE/A93DqUPqUEG7vfcDSuZvS2gNxK8KLZ4DHIG0Xg1y101wg3nxs7KrvwTEB7lCa4JnG+qa9iW+hiXb6ehc/gX1iEZHsz16YP4//zaUx7Ui5hjwCHIhCvbqQTjYLy/k0FFOAghFBt3/rPjiqnjGocfxmrDXT9svyf+oGSLo986g6Li2F+ElbGKMwWnMX4SsmRojHQEyxvN0VNsWHugct2+/xzKog/SQS+pv+EPl5U1yq/MSIVQz9FRPtMMo6YCYvSKCgMvsWvITzEcF4cwVQ4Zb6ucUK5ol/2LF7pBGQlBJNqmXUryiwd6xAYQzy8Jl7q7smvojbGr1O3ReTkWWlbZiQqcL7+/19bu4ihQrpd5rvkRLWJuH8FJLp9a/1Z7pnIBaiAlte7SiLbtrCIrE7MsDpnidQEQEEQksjGsTOjrKyUVJN2vNY2u9a+eoK75HgAE3Ydth0IxB3bmsJjpxsH6297vFUmppn+WmCmXngOm9SQ3Yd/hvAfWPYRof0bB0CunoRcMEyW0tr4AXnfqPORBaWk9aUrRWmQytm1v9U0RPTUIJnRH5v6S+Xs25vicXC5qBvPouS2EL4NwB43nO6pdSeW4e0thO19/JAhfEDZxgi+tXX8lDedfIhe/HzAF4PqKkfIQhrQkZ8ZpvcZlyfoCopprlLvAdrt9lNBQMWs3pA2Smfvc4JvBFvcpVkuexiqDmSBA5dsPelAOIn7D0X3/piIES4J5HLHlZTMfmP/RXAqVAPM79IEuzYlAn16+5DkM0f+/ODXVrPjHQNU5z1+66UkQgfk8UczZ/q+Yz+cXw95tOk/qTId9hQLoPiy6WhGwtOsj0DbB/AB9Tb0te3Pz2ICioIN/0N+OjQLorsIVFVN6K2DYvTE1VWFqL8fXMZVXDhao5h1rz1Jnk6f2rbOWYd0pb97hhyuiGdKS+3uRgnJaEgDai/U7Fav7ohGFxxRg7PTWTXFZjWPkIuN65tz6/EFclnNAn3kAJUEaNwtXtz/JOAwEgmL68o0kKL+P5jNV40jpKiMy6RqDDZUTmxYpRldB9YKWdyIe4RTDWaAzOxXKzLLRZnqWGGuv6V07seXAHlGsZo6ezFVbQxg0ZcmuvSWBz7cHqtdn+TgvXdq4A4C8vWsp147X03/G6NBX8Oh4ZibIiGgH65MLiIsxZEk/a6aeavmXyP8HRdeVKQ55M2Uc6lCtBmqYBBlgs0vC8aiITcqYSm2xtiSXrj/YV4bY3QQTPVb+1O3avc6qTmgMsDsYA2iT5VaBpz0UskCZljHU3sWesrQ4nUpuadt3ZvOUKpattC0yslVsUblJe2Qs/hOvTsfN40yJHHYH4hCmT+BnKM7p7h2I++FxOzzk/MBrBXoeL/MhYXcEh1YdOrH++wdisVec9GTcakGhBClJ9bPuwvqGugzsYTa8/bJeMxCKGzyUTVUMvJgs31c7NDs5W5ycbcehcff9KPm1x4GawZkBb7HJuos8HCfOoqoIYAGb1xd8W166cq6h5kEtUcZKKcckz5T+OGP/ahRjoGwG5Pimy+m6mx7rLHSei/7zAc9kYMj9VNRRanQE/oThN1tvVPg6VAOITyM2KM/A/BFLh0mZGmsKVQrcOUfPpVSGQLVKdAA9Rj6a8qWT2VamUv1VtV7Ff6umzM8LayaqAb96S+IoIdTiYS4vJiqna13w4dOIpD/H1fCw2bnzzc+u/9Wj7XBqv8xIl+X8UvEjaBWBbNFDr1hGQ58rdJpOYZPrqP/BQyEfeJPLR4qzTPvvRozgG6G3N7Kk53kHOTJjEVP9/wmGnrNOwEPbkKPiNGZw6yWKW8dFioCs6eGK73aBHKTH803YyHYL1tQ/OffCTqH8IY2vRH1DU4HEpBQMK+GwiUkTMwoXEem9ggAv9qPuUX162m9h+iXd8Gn8hI3Fwkwqf6VY8T+vUqVMy9akkh09f+F0boNChFgqyS6CDQoIn1Wij2BDgmh4qdphZsGr0NKccjuZajbR3A8Ih0MIuCY4gXyneU5WAHDToRuYFnWzcfE0lvZtKV5ciWZTGcnZ0IjjCQ4SdIKjUsgd0SvEugI1wTryPYqfIsqPpJ7r+WU8c+Vy2af5N/lXBc7oQGy4Dka2OD+huLo20CRw3SzSG+wV9Vlmp4ruPI6sz/nbKO0FtRuCjC830nY5dVvhx7pQiIB86Sf79aAL37R7uo0Mcy/7JCItE0JjkGUh7o75VS8nr/O+FyNV/zZVwvbbv9/xkYiCNYtEmO+gwN9xVhcXlDZSDPK8eJrIjh8CubRtwuQRbbdyLrjNz3Ya9mO0kTevge1nRi4Of7bQ/bFLTNgwaO24s6eVuSJZtLUgaPZZJCbruImI1hJLrGX4zT16ueiGa93JvYU/VfOuU5DFjGlwM2p80sH8FlpnDcuNLH8SAOUaxFHFMybbs5hK4xXqmJ5NG7dOvF3vHmop5CJf6bZZAm4fcA+x5TUOKHtrp0x8Q+u3tz7A0Z9g+T11Qb2MWv/xIPDG3bCpy35TMQqYEpIna+ymQk5qeVDp7pJINkuMMgL7bbaNPNNOz1F0wZcCHebe1zSLVcfOExA0rOGFbL8QOYHKF0tZC23+M3HnfEHcOrXX5JLuDbq+3bBZ0+lLsl5sJ4j596t3chS3y7gjxpwCwnGrNcPM9GsHNxzfW6T6rRkJuGeua7fvs4XwrIRAdAtkpzYbgB+PsGtftFWaoSpGfAVnJKp4hmeM4YOyCuCCNAMQ/sDQXuPp5g238b6Pasm1ImUvacgEeBGPDUr4ZM40Y5I73Bo9GvosuBFIyUZGp3+/gKDXcLLx43cbbsTxI94DHGKm3iUcUFXdcP+a7PfDnFlgSEQ3nup91YSlyEi0KYWOI3PJao6X1Du4udiuKpAt4u1guzr7DxWaXKEXR3nBRoeDGH5bXCuL2CVlBqzp1Cl7mSI8x4IO8UOvefzzrCJUKV5MOrxKLfQGZN6vlcqe3OdlEIxWGnWPJ2JhsnwPpQn5ErPzwDufrowY4PMuo6QGl4Z1BgY7HfL8T96QUgGQcWYm0rVS22bilPh4lTSSLla6tMVrTH9mjvF87DAH2VxC4Xfn5DaCbFOSNHVNJgq2i0YVH71a1xyDD9lDXMsH+O496hWwvAMqoC1JHyB+UEGI19QRjBPt80yi8EqrKuo7TSDMs8Y2XqRv97l4Dn4FbpBTK7Ra9++yrlRqATG2RFVe0kavnJo4SCGQ6tUGCd7QNJ/5UMzV3BF2aSmVZrQU3jdDNH6KjbPHohrc7HnNcUTYR4SuuCyK+Fd0Nkkw0O+MawFkxFUjBtbtXwY7Lr3D2vPf8KjOiomaZRRz06YYxjoPbpKtGVFPIwVLwRNd2iS8alcgGZVlkyLVYvFnix07JpFC+dS/SFjt1uvKlq2/5TqOkXP/l72eCbQudJ/49WdA/FcwBMIXWgrLqPwDGsi1edAyaYnmdGJ/xdnv+u0KnhEPR3IDL5eRzHSZ6jcuHT7JSLR3XSNu8+mJccHbTXvEpynn7d7wZurxZC+WyEjUBob6t1PpQN+K7Ibo1dQQutrj6XJF0D3L5JP9st3aC4L+qLLliNJPVgHW3K+GBR/AjhHrd7EcpqOHhQjYbaqw1U/cxg3L41seiwEYtOfGwZfnnQSXlXeXwYVm4SJQccsjaRZgNeQYPlLG2nf/XGSCOsQVmGzUJPpIDxcfErbl3j8eoq8ozlSQillG3rcieqfRo2CjRuWgvQfOUCVs0IoEK4znv7kOUDaMmD/PJmN0jQnmRCWMhUJmXHmPsUlRkm/AaIgQJWJzfhhtoYnT7u/wzEKafmxSFZUoDpwrbbB60tzwW8mZSosQAiawoL3iBjJvIBW4vt+5KgEpkZg6LSUGuYaDPY7z83Mwgz48KAtogQCk6T7Nfq0W1uqwhkYoytPwnkdmhgrLXN1606bPDS+4nMtHT7e6teKRJRbENxa+DbZnZnknStH3l9USj0DZnhQa6+/3K6Il4tFuymNyDRk9B93Jp6yNiwMpwP4NyDxetaAkKYwdiBE2oePRnMCO2Ig67yu0GGe/0Qf5/0DjnZWH+WHkNNS5qRWDXJqlVtcSONW6KeKmXwgSCdqagb9oDiJ6zd8GTEyS0T+pmxxErXbup9tLKWAudqeetWPgLfuBwgEt+egpyJhkhYlU9j9s0WH2W849p4bnLCpttcU+FKdXycxr84PXBAOv2emmrWVRNmr8kwLdXOSyS3E5p4Zu/XFm5KcZu4vgC7zrdzCVsA7yHtYRGybXa4QW20ArxDIeoPFoU77Fc98K85zojty1ctXuJpRRN5lubWfRPLEst9q15sH20OsML9Wn6ztldT1OXRuK9obDWi00WJyryEC1zoPrSJub+lin/4jd6AWA/HeDBnD8UYYnR+erm/kqQIFuMhwAhPNtkudpnCE5hes/fjuZPKjeiVy3LARfoQUsz2qhuq9bseaMTv5XOnozfsplGXbfgg40ZQknXhXAufla6s0LS1zkqX5OzFDPVDSTEMtt4Cu2A/ZQg0KSdf2nHf1DU8RGZbz0SWUf5SHp/l87onIFnfFgaNLr5tKLOI8soXWcvWpxJUjRqvcia71IfwChrvh9nZbKtawbl7F34i6ETNJ5UGiHrMBR0Sde3pqc5ekey7LB8Z+5JSES4VAiabS9vFK0K1Nwg/Kv5q0aXkySX3gKIQTLH2lgTs0XXykvCXKoJmqN8W/3I+J90wXtOj049qnfZk7cflagQxwRhE8BIKQGcwCktwCSpitLy8PrR2JgsM96A+jd/RHiRTv7cdmlLvXHHQfZvGuaZHxo+O7VR6xZXUHi5bRQUFdJXSimPjhq7YR0+IrcBA8Vwe90le4pYqHs6PmobCGjRfdNPXpFrR2BCZ9TcJJoJXqI2HOA0hqwfmq49EYZO11JuYuqIDn/eQYsc416c6jmSmJMu5nub/v+/X8dx9AUKrpnzyDZGRL/+513xs6qu/61awo6UaYHX5ZUx7lZ7nkTSIDbGRlumZh/R0T4aRhEzjw3v+NfVTFvyL4KnKJECVMTCZL3m3tc5ZoSa+Fa5oqvZAYxJZsXY6WkN7fWs3XRRnW1nO4q1sr6F784Ykc28OzheF++cjiT/Jt+b7Xn7k10pybHGtVIsMqI77fkiXpn9fBtocSEWK1vRhBPTaHDciNW5KX6mK+yu6fe00Rzzo91SxLv2AbLrZ3t+370JYjDdDYbJVaIm0se/ENl3xXRpBAUGRkrg1rn5kJbVBJmKcgZqK/UQG4jCr1jV8mBWz0jYvU7cDeD6t5ePqLTpHSkF/a4GJM8zDW/AuLFFNioZ0oqJ6Z6e5FcBJf0M+qbDpffns0YaUD/5NNH0/SmTtiEpKyQqldsjOJhIfhh6Cx47xRfGqXgvuCyMmjPEUXgu3JaYddtzQCH4Pk8PQqz56miYizDjWt3gXM7+4dtRqFaZ4aJNCk3NYGtRZFbvrP7MAMDbnecQPklWPQeRhMEhqYLUeIiG3QQhCQ69Tct+OsjUkE/9Jeraq+5T7t2EVRpPoORA0YIoSWQ18+jG0+er9GnbDB5lws95O1p1LExWR6FTA2v0BRDX7CbphDLL5fi3CglOlo+1C6UzWPrZfS5hsbCbSinOv6Xg6e5n0IxFpYOQl+q5+qSD5Iqt9t1IAshGUG2+BVFIj8p3xCqepNwwruA6ZVVqgmBv0J9ZJ4OsSRghntaARVzbKEF4dmy9ehyG9xjmYofTGn0A6ZfJbPqn+xelVZVA2hTfnNjtUkrFuE3xqoVWdOU5tACFQH/HAJrI8CViD9f2AFioa3F7jyTmiXmNTPmEHtwVzBe869ALNzrWlTqe5neUEUnF8wpCevCj+rBRaT5VxazGzos8AtJjWLc+L5eiBIpHNASunHUsie7wY1rYnN5mEx9WKyqvIZRo63RU35OyFRwsxZY1DLMuQnd6+py38RrKq0S4+RRUY0tDbUA+5IEHBCxW1r3aLwlO07vOnkXECWqATJzmqUlTeHXCj0/mFP2pVqETOzatDRGvtKjI2Nwpxq5T1DwiqEl+hLYM5fSNxr9GTtv0R7+fZN2CdGsSf/jNgPvf4inToip0DbBvkAOl97ZkHQ5GzYFqViTF+GOkm9Tp2AHhscq1VgNDhoIaCjPPVWv/qrGGbLbuYRX19mRYuzVA7cyPrRIjAz4tw3F+7uwJk+vVBWeGdjwiXjYvAO5zRDUdtcLHaNt/u/Uf9VQonmJArJbTcDFLNxpCi6+MMB4NO7wmvzC2ShPDv0kFC54reabcFXmnIujAfpLKUzSI4GlYBBKOgPJMkKoECcNuOxpptFUzJ7foL/gpvVGNoTnWwTALElDFh7LRDTsgQJZi80lJmRVNSIHh7QgBEbjCOq/ZspT0OazoaIJnxC1PxLb7NsCoJbI6JWiAbZ0mH1ImfaKNh3ztULdwLfk/Nv0qaLuWBeynDMJPhKKN2Fq3mu6xYWooMzLZgTbOdwaL6gCNQBWH/6UQlhImXsrktfsWze2F5kaHaBRcfitcKKAducSYSKbotCWDTUES38aUdvr4FOubL2OBbZhwLpUQR39eB6uj3k/ylJyA8xzjJIVFB+0pHav53eCTY6J4oBEqpiiINi9sg3FHSZhnXt4PTn6+JM2RczmNBvhWxjvtrx0Z6YmhwLwEIz7gHJRTOJga062q4vHvgrSY4QYqPGI5P1WcwHzoqkPGQdhx6HUvaB1dzoGmHsUW2oWj0w5+irsyq+J9rKi4udplIGGT2GSRCe0Risq5cNiJunUtimJfoxZf94OPh1i9YqYZp3pInFMXeIN/ylLgbRU5NsCXOyke8SM2fn+d0FZQzP7kqzzp8Q0Thh0DsqEsqAcco4YU+FIgvt8JqetX5QQZcmMyMs18e+RKH5jzvee1pXcebgHggOhUy4wQJxZKlBV3jNAvhiv/IXSdbSnIog8ue0og0Eid7gb9STN5uEaIZMWibOlj4qXH0lnCLSGN0Cqq0zpquOwQarYPNMX+3PCm3JwbhdTYDsYAZuBodUQEufVIEGKMv6AKFLEFyxUoqiN0IP7uspxR4xTMv1M/S9NxHanXI+eYzEm0gVHTzgbmk+DLWQ+ow5GaBWS6xmJY783e8m/vZ2/Nqbdp4DDU9F3W4YqxupEGC8bgahGVPcDJryWY5ljjivYk943v2RSzsJumbYX5qjeTEnl2z2lhkZZJ/yFTrha8GPoKGW9OstTlzdDcINOZlHxkGq6rQ5YP7q1CLbujflZi9dPRkHvTjZiN/i1tDgL9718patd9BzdIdjLrYRtuZ55DFpe9zeN57dp9d72DZIcMJOLtxehSEhgze4EI0U71u6V4cHlxdZOWNOyChWevc2nIApNE515OCoTCTzyZdHNbrCarYsFqrpKtRSuIXy7bdwIx9Ug9hT/stNJd6ReKD4osKoWtCBjwt9xrq2MmPnjOS7Warh/hu1tWITUb3HvEzp8X5cRYRX1r9UVXo+v5Wm+YEtTDelGfKTKapsvw6EAo+2CFiC8VUWI693NgGy3kIc0q9ZtJLYwhlk1lZk9/RseN45RKSkEnFaBcAcoda8FFagx1KZaQePe6x5yWFbFLOUeqNBlFNJ2FprpvD5ZCRsHe7Wc5fAaiXl2moBBCa2jLflLFQJO7wxk/xpqRj2p5jrpIouV61e88GGak7eCaDUv8sHm6ZQ3RkMeHYXulPHjJIdm6w5dPFsjjInuOqAkH9PJ+JVrvOQdQMRorfzCZlvkWeehLWKrdUjCEBRSc4bSi8nN25Em0dWy/ywkD8qRtNR47WMkAR8Z4qguAFzyJdlXxtRrS1t2zLztG/gQ0MY6AGB4fX052M5RkI3KvJpNlcQvVaeIbSD1YN3TVU477KL7hrM80wotCCkVqv2M05aUh+ArRGF+J37N6+uN9m+j3P+a6cn9lXjh6YAj9YNrGwwjovOSYfXw5T8Gw8KYr8y69qVEY2PllDiyZPO4ppO9T8W4eDUn/8rWjnkaTQ4F/r+YlllrXEFcXeMz2z2gPSJ50JZp+AGNX3bUj/v2/L4QNa0jqcmnI3Iyy6aTGGhvgBCGzp6/WOIMUFNCjKaRICmVyQB7PRy9+dyxKCS8Prx9Aw9wcfcA3TfqU7up84cjK7ibjwI8fYRi8K0MY2HHUMD5ZS1Wp3GGME6LaSdyJOHuHZFyCB+UG8owgUa1s0qmZS31kekMO8/2ncdKu1whbDn744/cjYKf4E4+mJUHHoEWgIVDHqpJ6L8mJlk0KIhVMARA74w6COMy/Ks7HX2jbVejlRzcFuckSe6lv0tMukeLMFZcyN8d2ZSs5I5x87ko75vBE0clWCYWIJDF7t5TfCWBkHtrSKjvrdNDqB7m/n1L6xnSH4lXbLsH7dE/2OUR9/5w8K1PvJFEAlX1MRpnao8Pu/QNeMpfL135eYVyNMpYQ+f/bWERCZ3eUioa5rI0VdKmRInOLVUecqmvTuheq7T2iIJzNTyTzWC5y/v9ui/09kcO6oivByEfPqzRnI50QMr4SAaZTZLhHnIr2t7RSwE9JkOlxCY2RmoxVaRCuflTFoDPZeydCft5AZLMnBqvzwYfoT59gRlIz+FCxx34FEZopVUNe394v4Mp+t4EZ/hajwauFNMkuWadzppYBwhL1PvQKdUjU+siXgWj+3xBHswdfl5XQ+epXlnyZpnkA13JNDfvcmgrnzq5VbQRhzAKQ/YDT9l8eMvuwNyLY2ZImIXsK6tzNLZ5vqI7LDMeHQE2/tvWs+BIZX7E3LKk4nC95kxEm/ex2BUFUIOgBr1tsqUOLQn2ScTy9jG0CaYmIhIdUcNazR/9wsPvdXx7AgoG1SQCGk++CjwOV+Eje3tc9mmqdDYEs9ylT/qhuqS1gD+16717lLUTwg2M+P3MONncve6EcKW94XAu1kKPGbKLwRuAHYm+2Z+WeGgb0Zx1EukWNe8TrA3XvHAoX6KX+kN5d80Xkuc0MiHadu/Bjcw5By/HaY17cSmHn+tNnRbOqYbTAfrphdLt269Rx5fvICIKgk0LWZQ+gYQa0AT+MfZKbH+yurfOLhulTcQ9vEcMRW3/sOhHhR8ueLZBW+Df75QeIPC3zZffJRbaolguRzkMKQAiGtx6052wYSxhasto6g9U8OIqYV2A++F2GIHki6ak8Qa2RZnyS6vIYr4qAvxNjD0AaeIHKjMksVBq1e/taymSaZzohFTNjoFRT7c+CUbUcQFjGGolxyLL7drnLKlFuRik3t3rVhGq6y4YTzwkWM06P063j2eGDgfmE0CPC1s0ck2rLvQiz24ZYJN+gJK1PFnttpOLbU779OLFU5pa7FQYD2zXTnaeCh2lKGo02QB3Pr1RkLPn/6KeovqO7w/J/xwUmhzqAWEsxma2sARUpxjFKmyeG/DG6jy1OgrgGqu73OsbdkRDhD5oq+TmvuhtpS32tEfGmwWMGf7NUa1YH8R+SBtxe7Fi8Cn6s1V2yiZ4sUN2WCYgXRc1R8LycpLjT4wtT4EIqjz6we7CwzTm1a3ZRFrV6sMkU1rhRlEAUzWL5sOUMQKWgOrCTJzwQxfi+fJYFbtKoUBkXiAMFIVcbBe7Hv6aEXHCANI65Ii04Ghquga0mrPXnzQ4BEmKaUbF1cUEauHmihd0Y1s8OJdDJOeadCdLh+Q0T+i7dZuv8nhAkqlF2zR6sSZoWXMvf1H9AiVMxhSv8+lcA+Woxt2+2Y4nJsvpraD1TNHVdzHPCCn8xcRrLRg2qph1thXHSH2S2AqdHpDLm2sTVahnN6LJ/s7N/eplgNi8zpjHXmNgcBuNveYXmqzvXj7rKxw98o1P3DTXvggeGXy5iAHqn5bqhHZqVa5lkq4pjHkqOZf1a0gqu1b0kGYWoaCPSMOSIOIZPKI9sQG6OB+EXSopcQ89g4jV3xWdPD++vIqYV3nTZ0TU/cd1uV0Z2dA20SacYeqvpaKWbecCZo29rQT3ldtIrclDGKnIGFDwRk8YtzhPVLScZxJlKihGJL0nvjN91TSr1IMiOP1D6KFqllv5IyowwEZM/2OH0XFPePj897TSdypScWmnRv7QfBbvOmkgKSEdW6VHeGZN7zRKIqm1O/pQR7PUxSw2cPK7mI7RGvlK6ZJMu2Ly+Mj2bkoEXFdsmudnHXc5Uj+fhVXvbqpX0xUVc6pOuizgXcnlz+TTXVOGFl5mfMsPTIcfB+bGy71DSjQkCkRPC3xDcXh8uPveFDXTjaM1Jl93wDQolAxrvpsPqLLT8LOe+HifeZYRk1Auk38zHh9aEWOUGrHHaRvW3yjrIP8MPTJgWXt+e9ETD9F4XaZTVAHOn333IC8ZwOG6u5TOAt3VYxcxhfa1HaKo7a0ggTi6r6tZzm9GsK4/SnO1EeaJQcq3uQ6pPgi6fifSwNSTQp9LLEKv3oS7g1dcmcfYx4BVLHH9vPyB/WkqB8rRfRGgE26QwZDQ8oTRIh/KaHyt68I24K0oyqpyUnVdOsGrKzLbC//cjsFwryCeeY7+gLw/STigyAio5TAk9HYvhRxIjI14Mdx7zsD/zPk9CMOkd6okxAnjxN5MduzVWwJohY0Yeth2s1cZKAPr3aMbL5ucUs1sPTihLVDvhhSdbBJb47voVKHvQNa3TDd0uXVYLtoBngcSW5Ifs9A9XL8Fgvp+Or1Phw2T1tKjhYpNn85T2vqGSyasyycNXaWluxA43MJykAVOKxaZN05U53fUDLYcOa7xgKmz+DNP1bI2bCunqLG1NhuOVmDsw4znBUUIYu9JPh0Bl/EY+QHcuMoMxE7p2Z5eyCB4I9RtOFjI4mFUdxzQe66TMYlDcG/BI8zZzDBEKgj5QPsc+y6+EozGql0ZFARVnFgd7aB33HR+KA0t2vFG/ivlDki8gJee8fAMtyjcjGMNrppZB6ksvxTk0TMlqGy5E9eTk4lBqpCTfr1VOODWAANZmeppsgby1tDInSA4dJQf+BfqXYd6Oft8L1Vhxk9KzeI7DSwwVgUvAkLDbBzMhrc6utK2lriQGXfPH7evboP0QLVeZBIQ5l5ozeqh4FegLnqTl/rWQbzSoiXCPCPy5DTpAqOMpHbXpBn0FEg7prHLKszskwpwlG+QeYBlIoqMExF2HKuRqCSGHl30zEB+7L2WeWMhxvOAOa0IZhLwicSdG4gGFx71+A5XH05bj5mdjuANmC0exVDuGrEy8k+rp+Ak1GJUOkdwmDw8aGvPDmX+515uAWgf1xFgBaGodH5lI+ixBfzRwLtk4HUldV+QRLPq+fPa6Miy+2N+errGEc6NYbJi8h//BktdQ+c2fmrmzSfRk7WQFGtwdxSQd5+jn7LKEFhqi50mjLOSovXHqEEDBSez6dPCaaTBg6MStngD8iJ3Kx4hC0DDHk/0AfABqJNRP5kt5LezSCUhE4I+hF+RNE6hk3B/KAaFeHinQxSzzYxbEEScJ0Bv63zBGZqRmhu3siXE5/3CNvN4XZqszKZhm2judM4Ik55JIl2eWPjL5xSs8+82gZ6ZVu3qJFH6aqjQnuO14PkdFG2I0DpsSDxKAihltrUOUytsPg7Zasm6eyNX3oDONTNLE+MQjQn7Zm5KOc3f3ktWOAGb9QkOZAo9nFTDIu2Xra3R+Ek+EGFRVRAez2Lz+XhlBAJaeL5x14zyVnELBg65aMCbcLZkb8Y+bfjvsgXXi4TW3E+y4IuSHs8IfPTGKTeufW4ysmymqKfHq37b2mCfndVdpnD1g6Iwi1UJcWPq78VhucyMgqyvEBcBvnpObasmGjIHAvcpHVPXPow+nYsRg/1TwYTD4lFmwsxURLMXX5UlQk7QxxmaN9f6W0AqU3DEBZA6lnKmvB4cdt9d5pgEkOvGxAeipfDyRn0SlOgYGnu0vmXT47aUrHwQ2B6YgVKovyHQE6N47v4temTw1xB7Ozv1NZBifBLbSZyfw+y6a0aGdfwtGQvMAaI+QWmcOuMUmbNkw5SKHiKspQ9lcVjYjknYJ4un00D0OYTeI1lwKblNLTHxKsuAxD/KVyMevIrWrI4MQZQXraUgz/A16bqhAHGZLlUc4OisfvFW/o6/N2BYMbw9N6uae18pDJ6gOBcA+NX7R+SouPgrGg3s2fsHYl18QhWnipEGF4wcF1Lh3QAnNFO/IuBdLPt9YN0n5KaCBUHTTlUqsVxrVxrJenKnheUuG0NEXOyfSFBoZ5MNXyG4JV7tlrDofo7uXI/TK13rIZxJ3OPTbasjMcBQmm4HiDE2CiMHw0nAIeFVmw6YOGTUhQYa+Vl4eax91ZAb5Xx/YULMhZkrMx3J6f15RU7l46V6sO2OLSg+WWFCDLMKF5zb5ugtmpE0D6J6/I1I7CEC642AmaUK+fcrUfAsvIOwSxD2iJVtWcp3jPxTW9BChJeki0uqCv8wOFqxnwsy7Ep3ZavooOCy/NES8GASMUSllf76Z/Gf8LhL4VSnKXYi2k498p0N9M06M2K+u/DUhO8w3RFzic6GV8wZ7VeB0t8PPlbNqj3jEM2VbhJbFfQhuHyhOy8Te1PSoqmoqKGuzMyC7fd87CjEIQYg3LEioumNZyICv34GtDqhpRa1T8rwsQvia4jRGIWePmV8mWRLXCai3k2pVrfIRZcSX0lB0TGzQcg3p5HVgJV4yrw04XBAJmTC2FV0ckwWXT6SySgQfVcgl01bXZ7k4WXBuEVrjtur/uh/lResV0LfscRD9OEWNqENzSlU/fY3G52zXd7lYmtDqrzNcEs9XvSnXqIRcgYna0SUKW2zLAoqDn6izoDV2Rir4Fwjiwpywd++HLbHd33joAR4XN6wGJuIHgM/UIFIIrAg8S4y0ir7XPBeyHLqeeJO13EdFDcufT6C/0dH4mxL9m1rGsrOqGyuLwgLQupE8EXm0/Vsl+hoXKj5J4KXZYk5HjW8U6C/21GtnF/TZ/+9r6zOo+R7HyZoC3V1iZFrmfO4X4ljOnb6wmHxDafVSukQOpLKaqARmDUV7iHWNQBooM31JPcJrqxj9CQfCRRJtyzjzq3H51XBaJxO8Hp5Is+nRvB6XdCfi492NtQclbYmvQkFocwJSEYWx8ZefyfdyLg8aF7YSXgV6XYeZXPAhoRqDvF7ydZdfndT6jcOZDGJudnjnfC73VJmbTkDUzjQPh7nz8QNFFdB9K53Ne35sttC9VaB4rBmgthsQ0NjkhEBDJUEiIWgqYvhEThBp1v6GAHTyFq1wL82SsiiITbbgXLtdf41xCNcKtr7oWpCb5Bw3rM8DbzDkeHXJ4U8RHIUl4Q9/WapTVQmhtr/JE8EL5gfMWeE90iDEhRfzcPZ+vNAGiSr7s7wKhseO3dORoUu+tv02uLun2RgR7EeVG3j7atZSRyi8E2U888hCEICRJSAxFbtalmiLBfLvkm9eEKENHFfz4RBWluQvK/P5+sX8ooFcQqgui1nU7ZrAwrgXR6dIuEcGZY85GgAHuiO5qIF3WU/tzGbvVi8Ti5P6uraVzAk8H1Db/r5f/lK1fFUQN+y5tQ294AvG9HxuxbO3EPpLNdBTOiiD2ARWSOxESsbXNNVaLOLI+oMhiHnZ7fAu8yqkjZuEPKzGuBfO7Hj/WJ+CaI9BuVXgICmo7zds6hubTFR3CiAa8TNZ9cHFEzHRr7gJy0P1BbWEkeKPVs/hTC2knnspwfjoiPM8fdjHAQ8vVd/sSbJWpyWJB+4O5juv/8FSmTWXhI93akdN2DTqiYxN/+H8DKnJ8nmpTWCBZQ+eCT/wpIjoACoMcMZ384GbC+MEvv10bqiT4zHoMFuz0VUaOXDP4uVpr9jluBZ8M6iqB3OBxRgBsq/PX+HYThqV6/XChbZbyfTX862RdwP/LtyzkBF81s3QZ1YzkkcTOIic8s6sjwlmVGlGLLMmkS+obpOe6mKYXT+CkGIoug7qIcau20+MXZ01j1Cb01rZNSqsaVpVp+TL2ikyVCq1S1zCFxAmnoPJvGpekTaah0JqTnBRRx186z1WxzOLlIqK8ktvLPvVlHW3jDnD+Xyk0dpryjHwvnqFGlGJ/+ggmzjJGdPml+MmJrDjU9YKuJo1U8hRAz8UGFgbVfP8KtmBDrBTVKOuBKCKuMYMLWbEoTlh+74a586ZP1WrnjSWpfvj0dIYpNEI7ZXFkrRmN+u1tFaS5WsokpBCVP1sUV2wY7zxZSgAFXg+ttMfK4ncLCc137FE8M5iB5y7aKJEJ5bczLpQKPqC1YGigKF2hq+hIUlcSJSAsfBlqkTi8R0pB1K/LvebeIj2aPDpZBqqZz9+iOr1yJTdkSuU+UIKsnOAJqbKtuZEFOyNfP5AQU7VbIiYmtIUmQCSUXf43Ax9ziVJ2TivsLWKbylUSEnMTovGkyXqZeFLzP1GLf0xiSLn1yawU78SUNwYAetkLOfLUrmCH/W6X+dcXwerIqK9a2MbT/Gmiigbq8jcbIqoHU0xpKaysdO5kojl+i0HaytQYpbzOfY/fh21hr5pc15ONmxUzkXXadyUQL+mSFf6GsUQ78pIzO8Si542P0AIXxotUN65F1Yor/aGl5+SUspZK7Ai7ioC7nAOMj3qKPmRTGqb6VY28KQoQki8iJmOLtmHx0qF56c7OCXh5vbFbJ6MbEwcXAhdKquJ9l+X/26oiZ4ogHE5SA7b/4n0CL9k3ENUet0DmFQzwxmnPa5xy02BVMZYPjrcaBBznNSE+eB3Wtu4Oa7IIssDBZESX4gpRkkNlkaR/rXIfeEytSserhEdt6InVinOaVa0FYSbnT4qHJOjDU0J5YnerXONlfRV+FAJ3a70jRCMEVS/wSTuj5OKTpEk1Bl0js9HIQjTkIDPFrONbKrOSNuduQ20HrYWyy2GfZl3/6RhZh5jOgF08ew4brDjOwmGsX6+vvMUQPlrAAgPJFE8WqtoPJwTdcZFhzgKqOqEeUN0ett+fXaCsSC3UpBkxki+XMvsSqKVZTNJ7ZmGFwBm6IAKVCbJSPZ6lGE3DphHVbE3Ro53cIizrdO42diUm7OP3tV5JX2Gg1tsIT7Xqkjqbi6Qe5mY3zZkPFgN5UNMCo6IEGmKgZB+jx9o3keSXXfUjOoZb/KOGuk1fxP06iawdKLa57FvXImWc8E89r5nuKoX60sZ3cELzi1zw68hXp/kSNFhN5OSqkgiGd+CLvADh24jHfGhpbOMJsoerkfY9443RS8d84EfaiKvc73JhX2K4iK2yTxaxEYrcqaxlPTKcGlB3BuS9XEKXVGGolswV9NiVUATHkKvBdY0WQmMD07fygwiSJSPw/yUM5jqVNm5ZUU25jiEKHSSAMNkQeuBm0uuVOpRc+EIlwq+IXF0re79uw2tPSD/T7Qc45Jzaw9xIgWqDbjzAkfjshKbD6WszuJpuDeMISvYYy3Hdlpf5YhpZit48qW5zlM7FDb+Te6utXCFPMuQ05n2VUFvL7BCFaP/O4WQHUKbZ45PJMJ3Hqfh19bwjIKyoDWtYyR/mRG3UN+EX11mymJrTSXWqFgIiMJnn/Q5Ydr0k5ZqWZhpolezunChMuGt12LBEWEtEA7dtMx2N/FMOtXSr/SN7SHPbxGSIf5vNZRV81cP2yqka49muR6e5zktxDkPvCBi16RYmOzgEyyP3ZWfoYGdAK+87oLIXdPBHXHDySlGlHqqqvbTm0HqS7OJWSkG57IL4DbRQrKFFxEidcJhkP7R9yDjvDl+vBHHfXzx5/P3aYZrD2Zc8EMq6sGpNwEk0xbBzhfWXgajwOQFuwaUYp14mI5u9X5j4qLABtud3Nj/PBnlnfu8tTMdZfDJWksbx+HubDHgppSfojVXn+mTTJoOM37uJCmUAiX91drCJX7c/AJROCe+bDjE8VI4hkDC7Y0jerTQGF9QN96+jOh3dVwELq4rRLK1Ld+Tu9nPVK1Q5tc3p5Ai3yMCaunxktWbuzmg/N9o/lbn5SH1qaDp9aHOQIT5i8cpIeRub1M9OB0K7osdsqWcxdylwoEewcxc+FzpT4gnslfJ705yrWTH4O7nfWz6l7TPWhlEwVuhCeuIxTiN7NyHdr/723WDiYas1Ltpt94pMxQuhqONOwnnAfEOwm50NpCeo0NduDe/qAF28tgs3q9btKNqF/MhhAEy40mU4aT5tXc7l3TMieLcXzjwHgDEROrOvMiWiQEhewB1NB+ZfgxW77QjxYoxqVeaY57zXoId18sonCTck2eeKDd/7MQYg9j1xdwES5APiubdsxg5JuHPAY+IslQMKnjjpRFxAEmeqxGse97IlHPhHFmnQ7nwzYxPF4bBhGivY6afrnmO3U5bUeZ5VtJd896UZOxLhFrMl700MOT+EEiJmO1XmdxMVQfFFB6m5CJAayhfMj281PrYyrPaIJj9tMT1JMxV3uUBK++RFNf2UPunxeET1yVmkloOiPl5uwjTKXDgCpgsEbZ3UraMfLUkqfo5m3Ye1xIgnTZx9Ajk7+deCdnYuUbT5tQL2aZScw10BvaoEwgnE6VIhQqPNw/VzJ2pWLWgzp3Z7UAbAwEUw1xuED8hZeBKz+3ZN9F/T3ucAs7cGNCx3Gl4Fw9DNWJbREOFA1ZiPkbMWcy06d+wpYkebjezCB/S58vesRfEOxrfGPHjlEx5Wp+O14W9FEM1ZHwKSU+LmraZpAsrWdh70r3wmdf3PRcsVJawzuRlmajDY3h/eTAm+0ic4+ClaSIm1Rp7MUaJREA2yz+lrgywOBIWOYozUh+fhSA4McyVDNAKw2ZrEFGJAL/FNwRlq7AIkL/+hE0e2GUfprg1497M2xW/aDiJsUh++WNYnJVh5E6IBByPNkQaeL2EHEIwwU+036raMl+mC2Y2qmfLEkBhtvm2ryWgC6O44FaLvEYwouq8jPp+YGrzL964fxfOvgfDxrQZK+y0v3Rp2NKHTFxV+qV+39MqTnu6ApL8S83Y5EFzVCBnTJJSys8hQaS6UNbJywqEQw6ugnhOsvOhbnYqz1EpiiZeOXNS8V45ItfnpaOJcXuSdNz4YWFMod7UCwdn5rsgbQN1Do3+vjdvqyOTxX7S16I1clgy+DyebZRwJB5McAv2okys2X8O56Ll0/Jvubo8eBS8Hq/JeK2ePDbSNgQoOd7H9qR9tUC76SS1luUGPUrHR2w+MaAwwEIvPpqRHzLosfVz3b9UFl5gbIIRDKBhwiSTkQ4ad38VWCMks132V/Nsub4kRfz/FgCBW9p9PjAqOEAH3InrnDhi8axEYBfSreOgQzvX4sB9Gu+nkoRA3St2Y+iCGU8ybwBkgiDuui7S+mgg0hhJ2j2hWKv11XtN9y43EFbxIZwM3sTZkST+0rKYsMTspe4BK+N5AFbrUqOgGIsw0hgB6x7QdQNFZiYjIV3If4lnwFWHWChDgyCim1rZdxDhBAkG4/tdXl2kCQRUMk0RUALSKKEjPEELS3cv8c8uYotcF0flqlM3O01e1wBu29HgYT9m+kxvgn9Cnk3zKOlnk2P9k9nAHRx5DlV6YMhkAhcjTpyKQUgUDyKdq10FAsno3i3yUamkVSmlSadCddGGaoCoXZf01D+uhdGpBeOoF+TKnYqXwXYncZtECdpcs8rs7gnBEFFTjxlvBW3yPZYPLXx9hx+B8tDYMmPOvAvluc//usQGqqkACnjb/G0kN/RGMG7fXNVJIzeZcJaQToWvBdVo0vx58blbl8nmVupCjrlG/N2jFtRsLEyeTiY36b+CZKYuKEnGquf6UFUg8mfkhHXmdRX8XIdmv26f5kOg3J1jVpZymGDkIFTs311AC3W/p6B7MrTJb9QMnbg/TgD7MP76PgJOitw5HjgB7dlRt1Rxv8lmPSJwC8Y7LongYfayNhztNQI8zLOYeKnnW3XzoUOsiNIF5FOAx1gJG+ehspOatqA5pmkglia9G/M4cnxAgNvBiitvHJDasemlJ6s+sXJ/vK4ONH+06hRepJTbeIHFxVXsv6+ZThDl3tymb1degiJqzMjFcgxdNUv0vDVvVxFE18ETl1Oczlfo7jyJaQdzYoHTDtVeQqcsWWHur7LyhSxfrnF+cPq3ZwklCF0vEIMfH0/PVxkrr6VDtg5qM+9V3c21OuRPuVDJn8M8w4CdoMLIzlbAjX8LKnoeWdlAfTqVxFdp0iW1Ng/mkXMKfyiZkEbB0pEkugIdHaVCoB29wHXESejiWaPBBpV40AdkkuExapDP0yAfIyDtZzAt2yzNKNaan0OOAuKsI90MeFpZ0aiO7t8ItVT1RjV7tf7E2sK/jTzMsXAgl+1A3I8I4LwEeo/vG5SWv3+tcuSGOyk7iCgJJDStPUvUBwtWQLFt0wvXY1rtvokxxiax5pvag+QWNZaioJ5n3lugOGZfoJuBf8VuKvH6wTEVdI72RsOBjrbdEnvJbbE4C1xfS+Z3ZQfJJmGP3I66x92uvd0on0fb+fmm4iFHu5Earv836BhdPuPXaQ6DYCNueo3lojdt7/rxgTqOWHvZ2qjAx5rdTFXLo4frSomZIdd1qLUqy6j/aq0ODAqYOlpqGZH+6qfBExsGuJ1tDCyjK/EuRiiXvmCmFrBtddWKbQnkYL6sebO4qXDYfPXGSqqVDyiOaZJ/6d/gfuXCIAT3ui7FJ4rRpASKCLS5Hsf5hGjduEM1mhJmbXoS3MoBt92r3l2LJYuEEJ/wmgpAxtAmGqtmpg64hRbt2SdYY2t893INeEvgxRd08S9HQ6epSHM2toakrZAwUAB0EdBWxTcrjbo2YkWpYH4KqUPnhTaw4fUhyHSvY976ulumpdoeg6GkB42BhEEn69cGQceQbLVXMSc/Zn+6Q2UfaS+XS8VDZPctlDa+lL6PeQqurUIuubS1g6tDknruTe2XHUR5vK6o3shlMCJk8ybgQwHzdXj5QxYn4X1S1M0aZK/jVbszo+YpwXu72LRiqFehzJ5+NHYWjCwXehEqnKmCbbyH1LbIacn5qpIAdMo+qtVZGbgj6wAcASAxYnlBrEwoUey8BluEUnR08DlvNRvYuJwoXQWN/S2Sv5dFQ9MgjuylnnaiCLioVU+/gwXQ9gYfPzNBey7IqFSMWU0xiHtFl7ZqxgG+YuSDt+lw7t1Hc6QPJtUCllxYG6d3PoEa3Pg4vR/7bG4DEKSkmNPKaUY8O2feHD9tDEzeNhunzMudaO2XMANPwgKlOA0mzbXahtux8uTZFn1YV36kN6dkj5Giuw4yjWogFX9974z96mqVDRbys/nk30Sve2LnS+nT+Yr1CTRg5Brj6xJSjwVSvDyPkoKrxZYu4CxDzkXIOR3YwgwI+4BFHsdgK/ke+9FFbfRqtStvSlsr8hEPgYjy3ad5d9uFK6jYzqX9ejr443GqejpK1UUv3I4t264qPmgbsT8mL8w1P00Lt2dIfcvw6dj9Nvab2t+ysH5Nc6Kmem+C3EbZ/QwDcWAR0zX+azG99+ZP5E9W3isCPrI/fgZSnIG8kmf5S4figZKAP0eAtUiJsxVckmMYpvomvOjM4PtjpsDMLERYvlrm77vlEr0M+aqbeDQgukS3h45eTV0dWRKC034IAxL0M55QOz0mlDW9k07h80izhCZSk3HJIElPsXMvr2A1EZfj+xb1cbB3RV6viy3dzwbEM2rd1kbQPtJqScvHWSZXkVqBUYVUriiMJGSoW9DRvEVJaRJlXiTF4843JnBL329a5Ln9o+JTjGS5CmI/5DyrKrbHvFpl8qFCEsBYfl+PuOZP1Jc8pB3dk3ZjYXSiQMS049YrZKfI5+SWtF7wwWW+gyB4WU8FV+nG/tB4Z2SNUcuucsZPuqlnR4IHUGoiVnBkytClkCJGdfm7F1EgMFTryIfXhNw8CQeou5ZubqBd9jleF9RjWvPe000HyNBwNKS8T55wlV+XBNjGpR+b5T3wPiALafxXMghSZZUohKlFT05k8CxaDohOx5rIi56fmuC5f9YAX4LJa+kDME1vHyjykzwKxDbFr2/0vC/O3+hDS5SU0H1AL1hPVvt0J/xIVlHJFz0akKN5yfGZ1qce1/UlHV7JDfpW787kTdCUjiwPOnj/G7CAnM0c+1xaEPaEOI5CV/wHJ9T51YJV97uwQIsye6n4yZxHUlT9Ju+V6XuE62A5DnX/2LxWk4t3aAQWAzKtiFSvJhYLhH/LWRjI7iO3usy/lHXoHYDCSTEHVKUY4ciIrN2t/XUIhVcjtYAVz2DDrt76r//d/Mka78PCJqJqXnQ4loDqgsVakURbq9FyRUe7DOkU6aQipr1qmw9r5H7v82p43tE5JX8HPnIeSEvmxLFkvdy0ZvgMVg6dho0WS5a2U3bzam2CDozkZCLjA4knSagKmEZXkdGKf28HxSAS37I/Gcrrg6ZX1fqhyO8Mth3xujqz3Sx30bIoqYSIUbLduLreBMaA9oLz8WSA45bYhgDZFKyzn0wy/+ghuALXGp67Vv+5VxPUF0F5Kt8GaYgCT3IBGpCelZrJLyxn5ecVTOUkn2zmgWzuJbd4/stK8elD8NQ0IVfRVbp/arlbR9GZeuzGnkHafjjIV58I524+0hec0nITCQcy41KKS6UV95IQ3fjddcT+tqK3DUndS2lWuGgsWvjlt9XgqnV5wcr3Hs67i1HtNf4RgB+kERCrbcL5xniCBCLct/Fl1Vvi1BfsGHMKjfXkCn4xQR4LJnyR5fxjIBysLxv8wEBmFzmucNwktRluTlxCunD+3vBfrhc2BejSbiV6SJBqThujhe925ruVvxrzK3AXtIXkqS48hYnRlKBaeXkCg7f6EQ3c1GqSqsYEGp2poznA3mGbvg+ITFRNgxuVAloC4KHufAkSOj/Fy46GQjEjxOah3T2TOs7c9aABm8Pmhouq18deNkNE4B8AIxurpu4KLbjuqCZ0HY4QG++7zcf/0J78VfN4hopEruP+XQ680gOqYdC7c6DaqmZ4vibMPgtpNlh4Sfb636vW4aLCBKmal2lo6zkn03Fem4K/6J7Z4xKYzw547gYjnOHW5MaJ1a42lJf2lIzsbOkE+N3SbGupDeK0njcxmasRWKAosvjh5nMjWjYUCVYXRQWHllJbcpCzdy/N/qrWvPm3hBZP2nej8wmMvjzWd05pudfMQzQOskf/RtzN9HiuSBih2iqtD6FfCH2iHu+G6Adne0Kq0YLju/bHRs4gl1CyTrDfFr6igzyg91MTUDhRdcEISx+fW6bRHtwdyXXT3RDTM9D3WLnfQ0oZ8fULPHl1+iS8xiUzJ67C4BgsYQPbY+WjsDfZh4t5WfJtCP0HcdyYvxBa1cEm7QKG+2Ok0BbocOwefjsYoehBUJhSVENp5xC22zXo36qmwmBCQ/1rlm6apKHb8Ux4s+7m9VphcM9SnUbHiRUK/rWGHTPxj4/DtDAuSuEzNoQd1x505Z+VvnwBeUPaQIW24U4c/maYpRsKhtlsOhlDR9Kyjtpjo1rHKlwoWQ+D/COhBNV78FoGi6ATCR7MvWhYchbSN/j0CRvyjfd5g4nl5z1t5Il3sOuQpW61+yOXetsLWQNQ7plYxS/lRkui2YeT4+YoyBMpuzy1vCZ9y2b64lL93f1lGtmrQk3ob9uEtNg9czZv1kM8d0y+VfvhCZgStYSZc4E8RvXS/BbC/PI70E0vcLEvXvERANDffMcr7yr2D3XDN3No0gge6C2wMIP0QgYRne7FziPNc03ijv/X8ynC4V/Ntvu93Nf4U8G3l0kT/y+e66tUtVjeYEYpa6X7TeUS6iSGJzkbIxecQ9RHX60TQTmqAImldz3vDuvFjFD8Z6WuwcOQCD2VO0lN/4PjfP6xeY08pmEdqI3SMl9/hn8kB40GGBahLOvNx5b0y8lh2OU/OPqAGD897Q8XcO7ZmIRfx8AX3XmDfri870J7SBjwANmd8i8aqZ0PMy2MvZ+AyxPpdAM6CY5o1UX2vDmhyXd/Bdv0tpopZO/LMFWaBOhgBtb5WpPS170g+jqLU0r6IwHK2TtoQx76jNoUW7aaKdC+JSOrGXFZjAKgoWEPA61VuAmmOeauhjheJ8Lh6z5gVed8+JmKUV3TDA1LFskt2zCGoADA2JAE7GZ87VH06yxj7JmNvI+Ks1f9vavRn8937P9UZfdDGjVxwIXL9VrN11H2RMbeZ/kvvY77JNcETcrwBNYP1n0Ulo4pUTJsT32MnQ+9/joUXEDoxn/BtMUKn4YNE5/U+nAO1FtZ23Frlzox0qcY/iTnUiqTSa8D/tYvstkTI0uND8kSBwWZBBkpbcf5/62opCZThMYj5p+ZtnV5StkPe72KY9zmEITWgH4ts6UrZnCXhIjoo4Qxqzy7W4asF7LFujUXtqg0/5NUueqP6eUcuQ3SyxBfEGYoJOOuCAPU/4LcJX7YlvyezdX0GMB8yc0+pfsbdvtHKVNjLL76eSpkor/t3zXdE4IUCwi34rpzqwBUyFNX/1aT4FGaMSnx38EBKGI2Tnx7wBRx6QtbdRHcZC2z4cW9ovwp7jM/wPGLUlYPFvQZLkStK+3PpRrqDHeNtlhcL0yuPS3mvzY5bfWbvjh2U0hdeus3FI59M9q4PsGlhl68fbd5Y+YVN5hrwH07HQG6OREhRabQUlVauc0MYeEfyBRcbfJj2+GmaQBvCbhqyMSeUC2xR3xuo/gz0spBIvjNubYUfm+s55xU+CqIDdd13TKWDOy0aZsj3trKL24oLoAg+lRm4iFC0mnjDTtCcyiikrqjcONNdHoSnlhY+kryJkGm8r6n7kPDMPXS1Ed+hGmCbW7S+c/HRUJqaEmqOdQE348fZ1dfQLCP2RcCXpkknuYFDbyN3RgHUQqVv7ZobQ18kDIWfHOHewuDMHyp7/Rvcx6Uknb/cFcNCvhvtG77d3ISnGdQ/RnwwOVagj7x3dcJOVMAY2+SpKlwsZfccsZtvq2Jgzx78YdfKwTMolgfBDHR1AlPDr1EPDhbKbRb3ucrDQG8vRdN2GJ8g6LOLekxEr76Al+atF6UOObyxQwCtbebNb30ZJNluOC+Hp4686/2GG++7CsCXe8zk+hwMOmXEDWzbSNe+o8dpm4cc8xJAwDRKbsGjIzXb8mLGGuGtA5QdT/sE/XNw8FdZqaW0DnRvjJ4dcL7IJOtpu0YPvv5BkT1J8GYSey2RmOWUhn0nRF0s5p5bVmP2DEHDeRq8fL2MNmQpg1S81CS5s0uwGznwl2HwMlrR3nv4W9BWENtB6SmZAzmqoED2j2v89VQVlaEuIUa4AmdqMbPgz6i1aqAcBKX0Q/UgDmodp7qNYGpLTpWFXzuGiwrqp7wGAbN8EAOGeU+UBR+/KC86uyIew/Ou+L3PpvQWMlFIvz+fxbsBZETppMJYUYgeWou6SPNgpSnFkgskWKk2pEO5QmlP+VpyV4Ozi1V+JRetzuwpj1aYB3GvSzosvhylKPIx8BPX0OPvRGeO6P319XDNxT+pViPrlEk6d3C60S64tkoaMQzz1hCbE5Cm4QkPkRFxUbetWdbx4gZzKntkIQ0Y+eHpt1mPcd/ViF1wZj6QY61k+v73MjVFuXL++lJFNLt/9lM5y3zH3xqY3o228/mTU/7YtTDp5J613C6MRukeuuDkRQHyX5wnW89LkWAzxdaV0NjVc0XxH2S3Gzcff6fv1QWH7zTYFNx5JSt9SGK00Nr2Mt9WEOSQm60sHMPj5AXSQCmYeh+13EfoM4nJJHs3BPly16HfqvZ90mD+PAEhGPYvVycotm4IAfoTX3e1ghvq0nJ6YcAi0/8zENdIN1BhvjfMbxHVpT5lJQ+YX6/GZq36XXIoCmzdMWBvcOM9MU6W40mxkAZvgjQlGrw7CQujG4jN82e6iU0IpvWsmO00ZM8q2jNByD6hw8ha2KlHLLrdRjJXOMsXs/oeChBMSQmDq/LSq13JiamPpkLyqZUTLGuO3n/pIMIy4IvqKW3ZCpkt1foYy0ViblsDX0xHy8ltQsq8nuancKtRe61b4QSiHaHeg/ymbo9XgmuS84lbanwNO8cqMiv6JFXCxvbxd1pXBwuua7/2RLhGFXKVJMZyjR9gaxHIvdbR3dkLwkC/LILtEy83UxuCRjplLIg03wQg3qZ8R7fngE+eIPFODEAII8adH9AZ76yh2iNkP0sPbbfGYTcN21nT05CEqIB6Oof8Nso5OaS3YMoSBAw26GxdnvGxWaMu8gtDG6scWPKWmuXsvAYndR4MSUfmqOJl/7TAqTCSU6QElqoKnWZ9sbG405+kP8aokZ6pcy2yYjawp3z4M7SAnN9qpRWR4oZ/O8x405jart/iPL742DitB1LGGYCZvXynd8/qhSI0DLzOaLcrTZbo/wlSStGeDYpv6X15DWvyXj0w/9sMnUgU8U3hrpWuDwJb1NeauirZlsdytRak+tWZK2bS30/HE6kgjha/MspiOJxZR5WG2AP1y0N74HQKx4lLUvrG+UAwOVOPav6j2YyQkRLrEknn8RFtBt1gCueoB6BziBQNe0kmVVD2WCibHTwyNFQ26lVTZGFHyWBhoMa4JPADFMxafLkMIceGz+CieSh3YBhkUjIvcAuo+yTp9PMH2yBy6ZTKm+RAZMDZVs6h8w8XaQxeOEY3UTaqTloFbPrQCUMwzGcXKSsASd2kFKZNNpkoApFXx2kOosTD+7b5cGVRsWad8/LEbpRdVIWIsN2hpR0WmPvsamNBQTz3+OxbbNgQ93CzRgDJ404Ivj9LSCndECECdrkZqXJ6yxhK0//fS03LF3GODzskBCMT5bPKNwAPtFWcUQ8uULaE8yw8sHrPUddUCb1gDYYfu3TY6ZxlxNyFxvXpew2N+8FMtYvv+2AwsIkWmMKOiGHM8IVMhe7zemgsI9UL7nn+HplmIXm1kz5cNKDTQ7umrbqURI+dd5pRdgCPfj6bYLTGykfL0Unf79ZnmMdB2BeZ+FscBDLFI+MMgzMqGs4iCaRI0b+oXK+8iYa0VJBm0YSgHVagS6XeHs4eJACaODpEOJadLO0FBR3IkDrBU1N5D8ic1yI9wAajmtqom1rkL3qt2TkS+PFeE9it3uDFn13Egbbry0PdkAkUDaB/gRniJkExTRfX3Pw4iXgVAjTqQyXaFNbLpZru1Gqo6KUGI3J6upo+CTi4PPcAtVu+kajGWo53IHDOk6Cmrs3B7Jj5w1ILmrrbQZnc+P/cR73zc3tsoDqe54nmtndXBCM6fN9RmIIxW/NebDvHlzL6Xggi2DmvkwnV82O0nfAvHW8CvPtO0oAEq/nucpz/CwI5u5FFsnfvugzbiqVU4UxtUwRpsEfGHKGlQCiJ9tDmP81f+HK/w2ZW6x7UbuC4b+/Ge0Pzl/5ekJ7lTGyI6PXZV+Pb62ZWQoQiLy98mHTyDIjDliXUT6OujwJmwGlzsTwY7x5Txw/S6f+5Ng+sN7VnyQVGWL2DXI3/56gwzNsKsAVfGyC6JnlUFt4OqT6E+mnc9hsDguRLPJyaapt2LrE3uCdtl0lRP6PAk4PPUIvriMCLgCI/CWYgk5INqpkUWwDLSH8mPWlJ02LOwx6NQjO5AS31BItBam/YB2OO+oCY7eNVWfpxtU0Yo4U037rGMbjcN4W677jM1OQQlhx4kuOb3uKeSoSavXUntLB1Gkh0rNz07VwI7diACifouU4wMVIxmRrmYZ6DymfuX1epnlVqPuxW1xIC6ug6dsDQN2FzWrVeRSj4C9ZfE8Y1m8yKrxkWbXeWpNG5Ph1OdHXrgRSyAqsEI0ngtU9l6tOumtgkC30VTAutJ++C/3bg6ewcS+m2seFGd8DB2HGAd1kbDpoKk2LPVn/l/oQTcKU7DixP8kvjCBYXK/eug3Q/dqGgbzkyetfDSrgunMoP3t5GHZCefgIpPZjQo8oqzqQhw7r//vJ4Uiax1TmleIYzJ1eDHgfOUToogLko2xBEL/u15AZOpZOMPsxM2ftfp7lfFNpCSgV31bvqG/VtNe+JUrYY4Ur/qlR4l+yIEhWwvdRlz6hMLOUSANxbc3qzPR5tLkdQ0i/EvGBkQaeVgBcMed6toSQ7wpp8K5lybndgzp51FdWt3poc4MynjH7DuaEjiE8fBLRtNOmqrdFHaZYKbsWI9LfFyli4vx5YqWmJPf54jglvPfjADsAsrr+9nmnPQ+UCKqcaM2Qz+mnhHFyo2FR8L2T0LBmBq+cV6SRwzh8pa1ndjuHpUprrUI3ip79dQyjOFTs2I0LoB4ssLKkejEJY8FKns5HBftb7s1vjuSaIzNQU0jt1bhhINuo05cuanA4doOjsibpgJcVCZXqdTL72YYaqE/foH7IB72evFHAnyWyH8FDvz9PltWWa6/GLRIO+fMKwuCWqEV+LOo4xQFYmhe0VpAX5evJQ/1kEpyK+QCS+yDQpJHzbK5Fydi1Tz4j8slOQCzOD4Fb9hk2utL2xunpqRUZw2bFAuBvnqKjfD43jqHhlPRdn65+L4vPaxd/UJUsMKwM4hEa6bX8L8hyAiwgu1Jbl19K1EoecA+PNaqiHQ4SriEtSK8hYRPOsQWYauLLlN/NhYhM0MTyOEt9PCSqZaZy8jLXx8IiPP+8dnO2PifD1gSQ+co6Uwc9wtRENYuLrM8Ic2qffrNi+uAEeLXelZf7GUDoASHd3eeJFi5u1+bcA1J25+EFKvG9PSRV5nJZFv229I8QuUpYjj0hPqxTpPRaA+ac4nBx5s1tGYNeBzgWG3HhGVKyR9Dc08QV/HdbwawBPoFKCnnLyejWjBEYkq0rl7vXe72KeDvDnaXhPkq3byMfLRlQ3ps/nyAq1owZbVRjm7BiN8NhuYEYGF5LR152gZy9wBeosVJmDcyQGg9vrVwmRIx2pRlCLLfmaEenRgL8CjvIpNXVDx9PYmEsdY8YW4iWHgSOx9eAA04tttlEE2FqJgRiWtSYQfD933Q6pP5m4YHFxf0hSpSmUCXjFsiSM12CModGAR/2y4B1lxQPGeYBLZlf/spDv2F3RhSrAydxpm/RIqMv/p1XAZW1Q6xgGfm1yNq3HXGhwmf97QyvGbj8EcMB34fuPTh0GoNsStsCru7JyEpClJlOEoVLkIlwz5HmlcjItij5D48oWVcQwzYBLrh98rdAah6aHdQGLYkYO/JpBbwqelsTL4/hFxrUuRTftQFcdhruAhx/NyShovvJAOJ0XtJ9RhzOWG1poShZttm5DpsfV8Y5HfA2CdsL9XwMMjL1wGc/cLrnnuhpALTbKre7wIfZOA9EyOuj+ZI9IHGhLHxnuQNy57m6A24d1V10UNwfTgVQiVUsQzJDhvJ9IzBU1Jtfrg7E/5OAWELPbTE706wsZ9ZnTH1cO3hbDC/pn+w7GY1xsLs8TBeGDt8091eCs9/m0/j204XlO6h7/3fyekXaUXuyqHdO8PVONT+kgaY8HgqHrEK8EkC/EU/aIrkxFNhnaY0LGUAJJDP2NDDy8llYgbmE+2pQpsrUK7ZJV43+kV5kXoNj2PuFKhZ+UmZAtSuNX6tIp0lRSmwCXWy4POau2hJXZIBzjZmT66o9FvyLJ8U2AfirwoQqZwGsz88C4cJZzfK9zw/omjCpnNVG3LnaiAe6z2hRPwvqlZ47/QyF+O88v/efR82xxSexs0IP67SK4WTCrAvm0t++0kV8naMxY0EDAn2Fii8ZwfIkhRvoAVRoY4W6fq7T8SXU7fYg9EEboRiKNkKeaRWAG1l1XHIzQbhRqrQ3NHDMCV6ZZ+vDmeQEAMD0/38Qq+Xc9YLJhalozjq6yqMqaR6Wg6OwxAeMfvY9oED9yktNAG3H+CWxBjtQ4nb5Pxe1l/Q7w0zSJc9F+P2+iRcNB2bptMW29gIooYqgFEzBXjAyk8aJyDtRxtJovKgYUVhH+T4tGwhu/ghChODTKLkwSSBLPyUhAMEdfHTzOeiqDRs8uh3fHrk0XPG+LlZuFdr55g4zq8pgy26SeRQ6YPAhZrWQZtm/cQr5MKZ26NCJMt8w806Wz+XL1FOB59wIB88iJi+do2pcT4cy5T4aNDvw+3KyhhdObUuZIVE6SZ/fcpN7BYv1TOfK/b9kNi6vEB13k8takBrfo/IpKoCjVah0gi47mJz+InwDz1Rq5eWnum6xnq4LM7fkSMOZbMCkl9JdA9mMV/exlCa/a6e5uO1Kz47CVmCV9sUZ8qu35NRDMdV/9ns+OADzK0vRyNVyLDG0EbUB3KJ0Xcg9rud40/I8Su+k8AKmudqahDiBMnjt3xT06BA5Nm46nG9uTN+ts4FRSppAuCtfSWbNg07ZJMmAyoexqnS3DJU+Xm7XKBe1tla5HqgUDPNiA4GABwIO6jo2fPq9RCZ7YQKNUY1cPtmM7rOYd9SW62QSz3N+XSCBj44jGZSY3A+0wI1n4tP82yvcTeqj36t4YAitzTlYQsAG/83Qelnjg2FY8HgMRD/V9Bv+RbM3EPQlBdMDWacFvJKdlNzNDDo9W1J19J6NoSlrHuf0pLkf/Nri+iixk4nByJIsm1ps8w7+tTpdWB6SKvSGCHhF6z643iv0LlD5AYVuSJ9qjmln1zyp6c2QV8tvy1x/Xi9R/z6kGsaiaEnLjKRgD26zwW8f3NzP+C8XdKkou9H53sjY4iXsxA/zYXlwWWcgPmoVHSso5OUs6Cx9jj+v8Knf+jkq2MYXct+Tk9iwj1IqDC9WiV4NV1FJTEWID+rDiJWQkPkkvY/xYYU2Btqnyqb619obPR0alpQoZobH9oU06XJsbwZwWAwCR5xUFZKpqlVRGUDqdVUdgdsb/HyrrwArFn/AiVt8FEv2PbViwZIg0RuT1Ekxzxm79CRz5/wjEDzXbdeMzyWVbihmRDmmRId03DFctMoeLbt8jI5VyW63uKZ1N4vue6BdsMfW63pZnYt39yzzpaEew9GGAw6y7cRz6BdZ3yq+6mVAOrUFjJWnwXlOQ9JTc1TlyD5j2fJqPXUzwTTIcWgId+Jg9wA9bkBymREj8sETCOZQLw2OS6f2C4gEXYZdq0SLaUjD+4Eprni0YoDm+P2dBKU5Ns/QBuFJC4ggF9IYmtfE8phqMCsRUmRTcea+AzOXzgAIHjnEVX/Xz8HdUcZvaKoZZ0l0i3j2QCgMXAlZoyxus8RKPOCrx60Sf0PyanZ8fFrb0j07Gk6IMoYL7ms8Az6FAfxaCfextY8JffRcl+vsbcR+xgNlI8xt7+2bq8f5x7mWs9OWEQB3MdWZmcGhM4ReGjM5aY5lxiglQQEUaOwuroAQ+fMU4QG1e9pP8Kda4zcKqWu6wsxN0ZaqHMrKrv2/JOCBMHx2bY9asi6iEcuicNf5GwCJwoOpUiH/3khbtFGmH4LyFv/2k965QEI1nyzd/o5TjikIEaBaf4T9OK8p7iXn4zAhN2phwoe+ulmXRXhAlf1Fsi6gHyIQ3yAJ2HJdilYAX4E5YBQ47xIL1NQ1xke6rs0S5OsMTJj9/AfWkqfHAoT/zlwRVuY5s2FCSADdZf9cGb/9NLXIHrqRwzOF8kBu8yRHYDQdwZJ4kAKTmOlTt9jwRJO+sM4KnhQfJZQCVVbhdhzM1kZZOivS8JWmmFUxNS1faGHZ8WtQ0ifjDf2wuYPkdCY1ElH0Fo5yktN6LQ8QcYn8k9nXE6MJeWMZSZCUqY3bdDmwCJQ027Sm108Bsv8MzNVivugaUx0oRPjBIisNtDzS/ybiKT9P4z6lcWI3k1PlC4UEykGouAK9dsIgu7dLiQDNaM7F7xL1mcPiD9misyg0g7mEHnbMry/PjdxYfRE2jwg6GZeunVDq+sLkfaCT9BPW3+WZlUUvo+51JrH1PpjxKAbmagHbg7vothiXWNyzVmQLpN8ZpgbVNVk0avPE3EOR/YG0yX7YgOmjEe+ZVr5soLqW2tK33mRxzd0OcAaeB5jCa5x9tqggwWs+js7gRCzsvkUWnBYJBYZWJku4ijGmUr0NICzYpNaY0z8jnbctrB+umSQkGzNlT9QC5zOnldLZM5Zr7aQsAkctDYigy4JxeNmA8EJIcBntqpB64sCkdhLzKLj3rbMC74Od7KLzpEaEtR2dRe5tHMaINNH1sOD3/z2Qx2Z6azfltDIschDJ36we2yUeKGn4BiD0JumzFOrJwxzpWZzMbKmN7LfjJwhMeOZCYfmS5nQCzBgm4t8+NFzR1xTsJPinQMmGkcQV5i1UI2K0t3Ems4y+jXHTdfFT3TyWyXuTIKM6iaNXP9c978EJXU3n/9NI22NAQq4rEJbjdSsJpBtx3pI1N9hHnebwHJCPwTeJZIEdvqWAOJHkf/dJfRqAsp6723nbDNxRW5qPDn85yW20GvGoaM5pe6M2NTzDZdthAHlSIs/5IQPPsvCkn1mlffir9KZe6Am0PN69koTFqEYB8je8IynlWiaNlMYWgne3ty64Dv+EpAFTRE+QXVfTRoZhATaw8kWWbqO2DA3oNEQkG21XVVLzyMPNig7O0fBJaE1EghfwdPF/ZHKgdquC1MpDVy9Dm+dwwiYETATsuXpwCtGnypTH69vVH+mHelta5rtJzHA/QO+Aj4Ly7+SLa2ZnPseD75ipfBOj8QKKPsvCuQeH3pVHCunNQV1PIERYcvNirHA4a3n/7EUPovbPe9ZVGWzIuc3dUVHh/MYru2IQsn1ZYd5Qg3kVg5CE5tagWLu6NXIiZGdr9iyHyzvOAhLmBeAj49xMLFYNPzycLG8Ra5q1EcdXi21jgyM9eqUwOjf1DhEP3DlyahM9iNtYt9KKvlnAn27EpsTvTvDe1nLZa1GV+ZUW9T57whJZ+apatJvm72Ki7hIkeRoALz3YYN5y4EMT8nYTwu5WzoMNAmEZiy+qywWJIzEz8vdypTGXHsh1LbeaFpILZ2zjJ+NskVpn6JHyFy7iqXYTw1lC+V9hzIY6aT6/TL9IKasePDpdiykLHRiBdvIzvnL+Nj0UgmPJWoQwO52UF0AiNoBJNtsc9bhdFkgZfa6MUj0wHV6LVwxBZgiF2uNJQDSdd6B+kI/X0jxb1TN5cNpEQTOfUkcY0qN0Yl8pTcH3UX4UGd2Xp11/nCaJT6VXKQ1bSn+3ZZqcRb8irW1ZQkdVFGPaWVH7QrDcQd2E+xB+CcreS+ZifeiGLt9rggmMC4zsyykq3UNUlHM+45xPrJM/xBoiKwHRPQgReULds+m1h+K4tXJDAi6wSRg/+h+XfaKtxmR61GInADxE35dCskHbU3ctfonCuV2EeymteshRiGCGcTraov87dmJdn2PDmL69nF8QV0eaADEikCVA/Qw+1Fzf/dPQ+FnFscUwJ4AmCp2+NJzXCwNF7ISv43cO+5iMwRE4Pu2xh3O96MEXG16gYEpoS6AW/Feyt07M5JNfwZ9bQTc6VGpKamh4b9TpSOjM/UPx/HdhWNPYboekT/JNiIlmqHDvi+XLXB4hJ6Yi9QxubvzVcrO9S/xaZhSXgUaxeR8Un+ybMRcXBierLDEgc/ZTZhu070XoTxOg1ghlV70KqLYdqWmS4ciymqKNmfGkdfVH8o17A20fu4kQsnW8fUo1YBFXXryrC+ORVQijZ8i8H29QccGYJmOo+UnCZPcebdCQO56/+mvhd4QjIUMSUph75s+m9qJKbE6G4p5gCHySX1e8Bg7+CkYjGryj3q1lnh4Nza5AILH4zeSfMtsyRthddA0xhcTLe7d7X5bB4BOdDC9plb1EB4rgc8KDWwtuYLV1TfK6AUUhYk4ZZh0gQwDRlo2uW5T0dA3tVBY3QtIFhxBKuiwnatjvIKhYxYEblGnRGS2WzZJbu8i2Ajm6zue7cwhAnPjwsm+7NeGEjI5FM1lbx4Q3hoMWOUq+uU1JRbr+NeLDzelN6w84iHRz5FA3Q0KmNLi4tIQ45NBdNY06Y1J81XEoYg+gVKytiya+PUlYLIxW+1OsXm/EPAGNWUyzHP4H7uGUiUr44csitN9UX5uPwawNgG1qtZ65nBxXKzBPOb984YZu8w4sm2kHgvTo/B8HKnaB/gaQUujAv2A59rJfTLgBrSL7T4L4DRXetiQzq3SV5Ud4pwSW+jmc94ZHYa3OHTlgKxdpAjRSdNsTIux9wFF+cXWucBgYYYmtNm5rCFcJHhzZrNURcz74VxNsg1GEtmxNDGb6yZcwrGPDBtp73MJILPpYNnmDeaULy7ce4poO5LdhQYKLxufqJ6Lq3h+VVL9bpsMVsJwIG9A2BU3filG6K0RonvwLfxg/nO4UMGdvD6NvSU1bpazG/vKJvQOiLNrAF5e+9991aZknvv3fT3z9opukJbJIXl0zEthlbQTjQruuZ3dLbz57e9P/Si/pmrGcFiLYjFh0Sq3wVDTfVfXvMZqXMPH6HiYvv6Kf2l6pTvkySFvDfRAbm5hFJU7gDFjXDEhrmKfJ+W6yM+JZxMGH/hjTkLDbzEoQmGHGQOmchgehxSLXQ2sE01FPoOD1NYlLzDNdPXGbK68N0gIqzHbyvq7rxAXveXXHtYX5pkO3GXBvimVsKnvRnP842PCyO8Nw2WBwW4CKrBI27cPyIa6rrrks42+S7jj9dSd13MDL7Yv7oEUai631eBPmdYFnNjxrZsovadQZEeENVGLXRBPKUrsCuMvjO9fkLX01XKgvg3Z5JYaK/cIBsWJFO1vISfy6WvwLAIW3R3kwTXb5iyUkMH1YzAVXIZsNGWxLpxl8yya+9jOgY4VSKvLa34DKfhBMteCmAH+VOeru9dmEavYKtq5hMKF/+Lc3DZaWjYepjOUQjRGbaOn/yqeGBilBbSxcMrCYNYDT/KlfOWatxssYpvd8NKlGn8DOxfHEqOyWCb9691vmDKz26TrsI0U4fhkvmklwYLphZ6WsVsmzqh8591QnaJxoxFK+8oPDIM5NRbtZxy2+IzbdVj8tvGVnMjjNKDuawkfegkr+Ti4q7LfRQfZ0xJLTAS8ERMVwh6zRYdTA+ysZdX5QGYuJ3SZ0mo0IhLXopgQEpoFy918lczbkFD87pZeSx6rQaqbh8ppojF0kDF6OSf0oWau/SPGu1gTi+dOFMx9uUc77qNbriNBm+P2VhT21NylfP1ur7jH/Mzr9stZrzyJsF4fMms5MpAgquNrJXinrthnSt38s0FrrhW0by31VnqAMLl3rINgU8CCN4Zs+E/rV9a4147h1j6OqObYnlf7doY1V3sajESQqES8b68gpLzufflo02CN76LUKq7GCUUDZOpULtKkwruMmNVWMdgVv44t2dC3eNZ4/NxLzY4OOamyCdj37mr7K714HuuhA2Omg5N1NXwe7JrFo0YB2gZ3Zp56h8MZ1ogSLtWakmnrXd0DLBevC6nBh4y29mq/yYSaU3etoKPNWmwZb/xLYg/pf5Aweuz2NI4EE+veBhDpTv17qPZcrp1/v+J0FRI+JeOumthKjAzuuXBIk9iVVHI4LsxCMwCcLHDmbIMFwxCDr+8DTOpVLod+yW35GrVTBjzugVFbnL/D5/ERMJylNPTTXaesIHIRMzZ+WQmzKj2mpHS78RDfdkQLZRqVuOqAVPJ1da9VL5yWnPO/FqOc9EWdt6XGT+OHwwCoPZwKdKgypmSdP4qKFoIkGwhFMM6a1os/o1GhwR0OoOjGEP8lQSHv4OYmr680K65B8najF6tWmEIxL0jLzgMhYpyxZVD/Oq3s3ugyagiKp4PGHAfL9czmETL0K1s1ZxNJR6bgONgIGoWeU7x4Yp/0rEfOnCxwp2LMxQy5AXP+fXaedSATe6kh9M6OoNirvAX4Vv6EJeEQ7FPG58CKfT0fZRvvqvAh+I0ymxQSy8OWUptVHXHc8rkurFZBKmhqebzI6GW7VBt5Oz4B8y8d42UDZVWs5bmcRh1xPbGe9TBewQAK5zlhiBmMPM7wk2QL0o8FasGecZXQfsYfaefXoYmCbl2KLJMDLfmZzy4INqhCs25ILA+FjYUuxM1VHqCboMyPC9j0shEsd2V0l2ZkeSneRq1xZz/q5eU6l/XzBBYGTcFAcTWfuDTjmAN38RtG58igroYNrUD4gQ+qyxDZwkWlx7vuCY3PTAC+HMOAvPZxvwbRgKaB51FwmATju3VTjMkJgv3sy4Zkh732dFeWQPiRt5Fa3tBLXyRw9H6zSXIuFbr/uYQLdAOVRXKpcOkSoyv/YKEvqd1d7sfOd30pv9Xp6p7AptWZHgqjIDaU/uFab/wg8/shrSgLSVkuusOLfE46ij0w3p1OKOTgKLWgZnC99ump8kxT63okxQEDyK6LAPFyHbMXyZDPTDfKN0fJs/VxmbtJvs8qBYBvYXxQtlPL3778EfPMOqLBcfgqfp0jwNoD7VKpBh4OEYttfasNtzsLiV+WSdtC1I6ARl40k/Fccv0q+9Q+dxoF695CZnqzMV+az2mGUIhdQaRGjLPMcCmHfZMRaEUPBCairb33x9vgMo+XBzdoOVgG/lGRCwajyj1+NyudntgR2pMOOGtYpiWVkf083/1AITn3raLGbD3qcfQjJaGLDSnWHcXOqLMtE/PREOONQS1ZF/jVGF+5gnH/PBXqtkAf7S4IQ1cWrYYf48LG8h1uhGoFTNYfxZ8LPSFVG1zmupT+dLU0GGOjifUTkZvYokhWUiR646b2l/cFo+VfvNXSUfUnqY1RkpvOkUnfgtSn0zsu+RAysOapalWuhUA4B8Vm00mjeE8L4Ueu3Mgue99iAr3w904IL13nnYatJf2Gj4Jv41Y5y9eHdooonWpmZowCUcFhCUdYe2YMwKKLMiJ69ZYM1MQLalLOP3Q6sH4Y7e48TeMErhVGOEqZ72l2JAoa9RGb3a7A8w7P8jLqQlhmqxcvy5i4jusuoIxZ4okCpQ4wFdHlsJ0zLVulMPwAMNJmGe2T4poeECdaKqVw6p3AR3oFzn9pcOkYtZHzlDUiIUiT3WTNfHgwcJW/c2g2Fb30Mlmm3mf+DmxZDZzhcRTJwIjed5liHa6snfn8fzElSIA1J/ggIn96USJOzex5qle7opdLZjgR+4kAD3aO2q+Ys8IgR7/xGXvv17RDRqQ6JkewFWAY+gaWdvIkZ1T1GrA6oMwTrTAS42eCAJjknq8WN3ej7AEiuI5uEpzzfJqGDv8mEsoXe99Q46VqwmJPmIaxhrLUarQJYHu2kI817YCAnc3LQgJ6t+DMfEoNrcS22gptB99l1rdmljXMVlzjeB3o3klpdToajiTaYl03m0a14DUnMa8rxsdORqC9/GxJFoErXuUo+p5g5uFw8WG6dhAalsTJDs9gYRchZx/wYv5xb7ROFotsdhTlly1dpd0j33VEmLrEfLLSn0QiIJr8NAHkPkvfilzDNgQZLpN81gh+6ApsvR8+QeziukmipMyB+USa1GHSQjXCNc9uFms6FL26D2PmBeMv/j0FR6ORm8JqVOAqAX89rlfpVxQ4OsAMqwDaikii6jcw37o7cmekjs/8WVaEftcI3v50XL2p3qprhjWxjgMzBOqIGZtNDAe+eszjl0dNUxYUru2yAOAWbDUHQPd/tXtGodEjSrbG2CoQ2v4stpH+AGvuzsh0q7cYvlGEOSwS+su7o3x1HRmzrxNaruXQxueopRw+Dkj+zsofRUbFRoU9voaOzoaWu63wc5S4OyeLH9kp4+Qq/U5kT3t93HWVoH50fJTwNvI5ts+mveRPLxcFZYWUqxOwwU7fDLB2NKgmCtjeDfVGsBcb0+8uwtgs97Mw29bS3wLE65frOYxohrxcX9eDtLpy75XDUdLLd9IHiodW9dLrHWEuBjZ7oQ99hkp5LMSd7KgM1HNphKROZeWlmIqUKzkeGQRICC4WB4xq7DQptedY96icQ+q1c9lFRA3baDhxbG2+Mylk1J6JeQ+NEYgysO3Je934ulYn2fpuxw3EMxZgELFVuHd6CFeTY+AjmU7V6LA04TzFyFblZ/Ktn9OonN/IT5LctlaBO0b35ASJUYYbOH1uL7o/7hGVuBe+7mnSAlSPZrJrdne8pHtRiSj6BZKAOhb3WR5S6LVURzIEBwhpDD9Oiub9q4eMMLD+5JNspz48GNRmjbPiyU84mz5fR3p+R+g4DZvVE4jiSR9Ffc5kiSiaUshGgPewsGKR1Ropwq4l8EuCyye43lcF6OcSJH2ty2IRu0VIWIx1Hso6DMFPQPQPmafGzr39Z6e/nRLmSjpTlUDrvwHk3m8U8ylB1YJRtGWWh+GhMAi87baJSf5pqeRrFbF2UrdvX+EJgxWxzygrquvFj4IBB8lQBeytyP6DE6CUe/bBDngl4u7uVDSz0nKl1OnX7Ca2R6sYuRWRuZWQONehUCNukpDFvX15/9QzP79TpvJXhqzn14G3JYLDnxSoFySEPgqih2sqIuYiAeJdsCyFY8zYHexnKS3tMrBLYvNkAuqZpjS3Os0oaSacB7QaTtIfRmY3HBMQNZ23gkJIni0Qiet2DjB0iT7wI/4iRDqDOdGVwZcNfCslhYR39oDnYvfqfnUCY8+Pe2936pmWDW73DYa3lf3oX/O9V290nPtrIc1r8JyBjac4v83yK+YMnEesUH6WKu/gbfH1wgDOwSUfSbEBwQDFv+DEukmoH/TdLJCg2im7OwAYVdkHL2b5Jr8u3f126bIxmrNKc51hG5ZZAZX6eA0tf+AASYcOufmuGLDqxleYgQaEeBwCo2NrdATbHLGw/8SsgN48sB1I7SOADyYHszZjvgYLV9l5mlWsoiYDBm4MjB/YU27uklgu/3n81lUBH+3OPIDkHvWp/sHbn7S6usJIa539/ngVMf0hPbIIDry0QXf+7pPNBF3/2kHy4740DMwc7o/ZtJyXI3u9HroH4S/Kb+wFsBEQzOL60FeaDtSnMT314SEM89vpMgJaV5CXh91rHmnSzKhG6FSYK9zEA5OQzt2lT4CIyALgSbyoW2z3JonfZNvSuLwtgozO5rCWYmM12D0sj5smPbu698tf1ZTpzMrlV8Aq44HTJtUYA8asWogkiJM1XjiZiNExTc+853qqgwvOESZ4zaAfwllVVjYDRjL2Wybw/sL0GW0C1vE9ugwELV+Ow+v7ggK5RThpXQ2pPWaIbX8GM8YiHa7xOkV2I7Brf33HygrbUEPz8RXBoz1keS2UIoZPyGNq1H68n9q3JwujiFbl/EU1R36MgC5numszUxrxEgsMcjNdZl5/zLeV3kEGCjW4aMbu5b2k+k/oIvl4h/mL4OTBMNv03XcFYI3HudacOsQH6aI10KJCL6IHxwt7jGmOGp+zaDDz4Fe4pq9QhxXNAqeCFLpw6N5a5foODShYjak4Z5eVfTdXjDIbzjwmoEB2vHcI7k+/c4VnvdZGLwPzX468uufG9f5/gwtSycDDKT+vVW4a4N+FuElEpcNIpGcJvueos1lNvyPvc1xmUGUNejCbSFOk1iMej4YxjSvG2OLmH8Y1WZ6f3FzWcnahU6rNvzJdPAPxYQbLw6xJDdzssGZH5KlBJef6Jyn2oghnD1Bf/looiY0HuNSP6C2BYvD80m5rw+luyFneCtXvCFvVMYpTYGjGgDp/UmFZhNOSuQgcqPfSVhiHdvHl/so/hFw4FXTK8hnBJ4OLuFjNADoTkSy0bLNem1tgyhF/wdHr/EIJNXNaLP+VykqWI2PUxlSThZTfLZREs5J+yiEnpRSGnyAT82959su8+yfR/st2W2uIlzEcSJM5GO0hDbeIqa/4tNjowLI9aCf6wGXPIiJtzspIVfMF7+gnTi0ddGw6yGiebmGt9iIxbtKXCXbwfokB8bPNousMPKJuRrZv65fjio7bAemqzng9qghdTxvuSL2O+/CWeqcKDOrOOAYBmBE/UH7j7ajj2MoF9CI92UDnXvYPn/2P6dHPyTyNokFfHbOJV/PnFe3oil/mi/UDdywF9YqHxu+2WOPhbI80xLFvUwuAMTK+eNe3W2JlDxDSHB1YhE8fJ/a2gXEgg7SHZZMcTW3dcN+h1FstMkgCB9o78upAxtjTVdvsF7wzGO/cAcWuxE0avbk6gUWIL8JSeg32iCG9soIpbH20JfZbnYJE3iJ1Q9Lbea6cyluYQPaiKY3xkV3SyHnOPVb/s2gRDQTllUj+IFouHb7TnPXEehny89l7ltLRatmpYHEug5QiFwVcRwvIRyYvJOagdAeegr/eVsfV3yrZxlXdZB0s2NV9C3AZ6HqhzM0uE1sOU4YPAjCEj+Hqs5qi0Jwd9CrKq39iTZhlO5uSE5c2g2qzE2bAFRsIh6al85vU51TWKylHo4FOO3L4CS9Z5DDm0bRNvOXBZrranpgIMEopXY4kPsESqKQAgQXCc6Wg9o5sfFPTk5nAtGekL+Bgg0Z+i0oJDSd7rp+gh7iZunvLRROuxy9Laj56QI5blJK37uhm7nwEhRt6bJlctpdTZOLuQ5P6PviUBPd8RGJ1orgu+ICBg6CH4ZzfXoYsiBS1lOATSvbd6X6wr85jVtbMeElxUEC64hpDne4gTVtSjGhUm6GxnELI5xWhU5mv5G85tjQ8QytisYlXakSipZv5zzDc5LVOYv+OnEZmPZSzt4u9EC7XnfB7ZFdI5mJe455iNvqDibpKkq/qCp3l+C3PLoXRPFsWudrn1Xo1qCCvyRRZj+TQklWsATwBncI98pfKGhXG5c3wyMAFsxvTOVIpZIyMbJ8fs8lI8wtgT5x+NVekaiDB1Au9nILKtrKnYLJj1jg9xbb4SoaaEFIKrdpwvBWYAY75yWeMS+/28vEzkZ0D+/JYxiHmwisGc2DRd4TgYGrw0L6fMaE/1B8nydqXt6aUeqT+dgA4X4hmnYaFXodA3/HWJjoKlfwrT6a6WqOzAl0vQcP02VhnU/1qxcIJXRjULBi2vFPW8SxaLgN+6Ez/Hd5JZK6MFqm5j8pN/A7HLnM60CwXQZ8Bplr7ti7D+XH9dJC88a5jwluWdwgNinjBeYx/L5q6TTBjNkJ+WkUuFHxRRkxL/2EdtXQc2YkOg6KS49IOQ06oqxb9S5rxGe6EZtYRPJ3jCNZJr32kJfkf1JnL+WLZLXqMSOp4hFmqLCINUjD5TQqgbDbLPM4tDkS8koY8rsLbuBUJzJi1e/q1iJ/M4D6+Q7XYsxroIZtttsp9c0QXiGWYYjL5gFyWBfnFBMcxCVslt+4uE2Cn3e2QqP8m4z7hw9LBKumFEXx1eWzbWiS3VI9yVSe+XzK4OPSAohkH6C3JMSvZ/jqUTXSCtcyh85VTIltC1p8oxkQG0yTrOuflppvUYh0bcKXOS/VnDsEGk74dpfTnxax0y7pOTCA6ZnxUMrvx2ZwBMMHnGtZQQjFuHVNv9L376BYUvXsnLVkiJWulRWWmiR4nUDYfOMnnOV5dk6hlYciyfFKNaVnuT4Tx3XvT9TInDZR+K/+xd9W1dtkL55QkkvR4rAx72KPJQma14p1cfH8yjt9v0642Xp7cuO0hI6yQ2aK5oH+naWjGWus9ToBu73RJN3UGbvxjdbBliRd7r2t+lhWNXNAHjM5GZiXLXKqUtbXbI5oRjRmRstP+R6c4cZ2aPMmyagYdMP1s/DVjQlr6tJ84gWC1irxWC3mPD6lseCdoS562+MsTmy0i/wZEkd5vUngOIESK0wQpVfp9KR4dD1C2aX8ekJMFv494tARH69KQPf4irYIdFzXm8Y/djb7D7HzgXNyoPXFz81/MbI7i6la1fgW5eny450u242qzhcc7WsTViYDG9NYSgjd6/eRUkJHUSiRJvaXcaBhYjibh5dtOKYAeY3VmFTqMUxgFlTnpeWfkUhIgnygx3Cn1HFNE/pU23rB+awHsMwS7IhTTWyNKGjdL/FEpUafVNufylL1yHVWLkhHlhjaFXqtnCq0qSi18NRp86pfDHGd9TPC46yFigs0wzNU9L3x8GjQ2gd7oLBmjXtNx4w3ytbyKtOzMaV6EJ+yqj6fmWo4j/ZMSBKZdF0WVBH5dNDpuyKYayX0oXsuLoQ1/9XsMgSeCItZepqKFvu/4mWNjx3jBrp94FPBUFU9FsLyBCga3YVGtXxJmqaQ8Mve2mSsoIJ13wJQlVk4HV9AZUBFAWNV1sVIMoBkq4u0q0lSatYKStxCzTQLx2yaJiI5Tu+whEp/KokCIePapzKp8i/p+cYKT1rktvLWaOFSAZyzjV3Ga/HB90XIovWwdYrzYO6CZdyJ6jryQshIPp87AP90LWbHzsnMHWNUz0R6Vn19TP1hLA+ixs7ipBJLAW7FShHNq0zch0rCEQMQ19zU+z+l3NC1bXpbRchYsXwresbaLG3vE8zQOjq321Sn5AlaC06DH9I5LEmYDZ9Tn6wWVT22/tTCBRoMmgfV3VCS7jamtRBsybyBKOVx2Tr0yaxtPNudOkwJWG3E7V6NpwYEGyH63EX0/MhXA0mpijQQZEXUBpVJV1wLaQ2Os07JoW/ciSdNvvoG8/V0qLElbL4zQHGexg93OR95zNZfUX/E0R91zmXi/8fV8Niujdvow3Ru0pNeHcK8RTZGRnl0vgTdetLU7vXWX9G+R5ttjUO7DHB5nFjiNqQJluz4T0VgT8j6o0Wc9WPNnpmVKVG3nOk7LzbE0+etFgVaviugdZPh4qgSN7p+St6NtmukmK0oEvBj0rEGcsS3k89XTK+//NdXOBTe3uDg8aZY/ehZh067MwjiuZC0LQ0iotiAcifR8WCn0XRr8CU2cw/9kEjJzlzVS6KtThyK/PM3N7GSITkil1qbfdunmERzE2qd7IY5I2lDgaUzij0Ny39uQNs7xlxU4zrkVv5fIpJFYFoqE/kEZ39gpIn4rVwPkNKhvdbuGA34J8y60j8H1hQo+9khe/qXNME5DyLSwatoPmKQ4vNEux0KavE+Q+uoC8lw7S27pDmZaivwUMXJKMNyWlFu5nrcUTa23lDQKyU7wAaCKSFaWU4f7F1LdpkmcIuPi1kgANpr8QcbichgwXCczJSUkgCDtwrerciQlWd1kqc4NPJanDMiLAh+mMUrp5G6iWWd98k8lMS0+y4iiXV/b/bADWpgkcMrr9+CV/g5O9NAgngVmUmYuSStWkBw3vwBIDE/HC8Zn0UEbg8WwPE/ik/Sy0aRtt91yqsBdgBy7ONPqKojatdPJbuYNvUjUkNN+LJDGB9qgZBfQhn8EBMaiFyN5EORyToRNkhEjUuGpcXtXGOLSXVk9dMW4kmXaJDuhYaqSHeB5Gq14EJLvFjmq2TQyjZsZHcDIbwWIDSRnA6gtQh1pzuwM/5rXqlpUrypM9EP7UdkErdPaqa1c0f3R3E0ICmttpg7gW1cdyRJRSV2vlIgVJ0StZzSgRKCco9+NSyGOjh4/HP+54H1NhBPyo4tx3zh/xPKf7KweY8kfbYCkvNm/hJu1qlMpMq152ey5hbro69Qg22Ga2ZOY7h14+hqcLy/RuJOkft7AkBMCr/AOzlfPdvW5TE8+LND3MqX4lM9i3L54MY3OV8CoAzLCeeQRTFXnwVxoThoSWZkmuSvBxRD80f55r/nAh6KSzg94lH6lf9AdeoBeyascqjT3w20fBMclDNFRb9esdgJRNRGnOWxuDb4UvbOG+ch4j4yvxgGYKZ4hqa75eGhw1xq4pOP7pctjc+jXcAXN8/34xjl57uQuPM6ywBTaGcPy5BmUjXbDPAn5/K7x5V98PtSfV0Tbc8LjQNp361mi7hH1V9lAhrBeHSTdvPRY/yksPL+dFKV+MLSZBxA6sbTgyiuqTShaznKHqoS8Coh7QRw4Nsr1CYWoMwR1VeNliipXZ/q388oHzklY8KsEA8amIpKlWWhdBGvzlrA6c8ChcJsz0ZBEUUHfvJQgSVONa6kdIphISK5cu7P94h7JF3EQWjZLiYGwRdUgI8HbHs4jA9J8YXL4cZBr4moV/BQrYJbJ7M3tB5oUbgK+D4Bkasn/0aDDjhNLRIXSfvFPRnkilxehc1pHttR8LtVvfzdzzTLZFGGyVtXmm5dHcddGVNwUcEplf6VRJ/lYJH3CE58eh7Lhl7Iw/eyZsEjxTg+r7bTmJcmFPJisbh+m022HAArR8nwdsZ3A1Sap5+DOjKMgbE5Yugv8/vd3d7ByBbW+1MzrPNgKVhSZkbjuI/j6LXs8nkC66oYhQDOtuJYcKbzdNlnEQn9NyHHCzjTiTNDhtE9toDU9OiNzFRspoYl4bn+JWoQRjYRQB2SudpOP2H3Sd0hctr/nqP16jsuHKRrhEMT7kWzn1YrGWV1uaXx7V3rxcBFkc2m0GOhiCSGUlWmFPuEH4FfqwA1/M6QHZ3NSFCYuGD+TZUf4JWc+hcx49Mykj/UPDELFkm1tsn4H8B9l40Ykz/qvdkn/r+wvUkT/ewauUmhQ9BFATwkBeE55CfYgPuk2hczqBr1+dIK/KVEQkKzSxC7ziIKU9g99GFyUGz75kQljlK1CXs3LSZUPD6tmZv3j+9cb5ZpalGAJmfeDRf3Ly7hMdDLIZT+hhXkJtG5HoY7eHYDKfG6r2RMFBb2zzY7oNM3F9OB898H9OSs8a01i5iybJTq7f+S9uJ6GWiOPEGGNv7qk9Xs9WuHhEeVqRBLeRwP/omwj9jCqYrEtrCc384NDOE0f5L+IsgL+BJx9CeVWQtZxcr1pICNBfBnS/lvsAoUDsUsdTL6KazjT3rFV78bkD1f6SeqQqViMXBfsXWtz9YfYgDbtmtKzdsxiibLY0NuGGmhRer+OxDYTkZalipCfJPOZVIpZLqJKt81luovsu7vggDj29ItXOmkou9AQj2A+JcUgQv05THsgaUvP2QOG677mYozosKQygp9AZKeadwJj64w5GuWCtdbX7xEmf6oaJqZTkkyyW7vjYi5GyanuTSMR4KQ3hxonG5V0k9jD+eaTU1NAZuS7T6ZrZP6zFZUMvEZZUqxUQkX8b3U0Rz4L3LQQ8VKIbD7KLrNMJGjeOgtJ+RTueMDHFhABahOnHg33CElQUmwYQLIwKd8iyzUg5dabVKFgRBYv/0eQl/CX4iNUGRH7Y0qgfZeAjeJ23R5a30vUxKFYLM5lHdVU0oCwywSSBbNAqYJCmSek+uJ1Qi7VoRu20c7FzZa/dfOthEF06asVhdQdWHCfJRsEha1JykbbvSqgyA60dnM1V4qtK5b17lAQ59MYUVzWBWjgH2qQo5GifQlYHe7noMxbfY98awPOnj16LKAHWUyhjnNM+Mfr3VhWx3W+B7w0AoWhFUYWaWm2TVG1smNgJiD3oiz37/QcWhClOjr0RHJEJhuOjyYtGDK7XbJBCA+CSX2KFp3Uf6obPfgemUVTEC0ExnLTHesDLpQZghAWISEw37t0yrYk9Pg+I1R5jokb8nIf8s0mhZ2bv8OQybEqlTZtHF2P1FEQ43EW4MJWfed3UlL+g15T1y8aRe3/eYpzyovd88PIGZJhIC1fz5Iqpt/JP/NwSlEZBpp/5cejCDHAi9GEvTvThArXoTzCDJxldNVAcZI/dFwrNyN/T03M6Ii26bmxx3dZ91qFHS40IVBNhiQxUx2RgBwqaiA2ZSwJeZtweWfobYW8i7FmPhETNDW0Ya1Bvl28U2yvKBogHKa/nre4lkwft1IfcSn5i5E4Ue8//DqhuoYXcVlx1v3potn3IWJJeVB8Td4NW1C8bLKeC/Qb1qEF6gaw/WIbPRihmJxtIHV2ItEKNLYa0TKjLvLoLFe3Fxb6MuDNQKRCI3CckHoLJ4Plt4OrPVRcu2I+2ruWYGO2r7OOmmqNPA2K9gjqtkkvQjz8roSzJ87hCg7yKl+1LXYxMWSL6z6xRM4sC5HlccEp1Het9JPuEhEXV8kbfC6BDA3EQ+LPDvLSypfDhv5Vj08MI22d+QaxJQalayidAjkbokH0qzAWSG/Q+gl2v1oLC90ta+hEw5EHSgNCsU/9UDftEhB9/P1rX/vaQ/OYt8279L7UEkZgyA6u5354EvIKPYNpygtphN7PLCsLMVuPXuFcF2fXrWIZ3MDUA18RkPZHPZy9gMrC2hJLsdNAGSZImGSfhQKzrBlvcyu8aae6mUYsEqzhKoPB0O/lZybFx3AMw7kXX6AbF6JPj3mY7WkRfYp4uRnNs6GibwxHtW0P8r4qGqWnPUxjz8SbvWpDHrRM6UEpApETJEKF52sYfb8H8cndC7H7g1wDDJfyjaia/g9eESa6gAZQeV5Nw9CmF7/NUqglwIYCbf8c8086lxHAv/T3v1iFUfCFy95Q7CNnhzu58c+rAiAJl6b6xKDzuJrdJQQ7qt1SeW5Q6EFqVAi95N+yGyvwp0JsZtuBxYaiFJ5juMDZ/hXDrvRs/TTGcDdj11+9xtsNErp6IK5oZKrpbAbZBm+VGImmcZp8mAkY5DbvM7VRrJjKZ++88MLyTpCTSlcwJnWgw7Zar0kNhkO43WP/fkgtFCjMFliaYx/94bEvrNzhmVDPq1GTaV5Y270/F/UcVZpIYneivEKWty4mwPS5LOqJfSVVn3XSENew09lQL15B7E53ZrtdR3sr/fpF3mmfYjiMWbR0vFo+YdWKqFk3Jcr5d3OXtwPFcqljSgrPd4dQo1Rg/xLnP/Z17ACdGVMcghvTxE4pHd9oVLoGCie3t829J8fiNz1xZs6K6ROE9v6OWNW2a1ClfeOLkuDoEw732SF5Dc0Z70sRs3Sb1tqWPyNqIfRDM5w/R8BmFuvWjOxwXVcYfkUcY4kUinBQ8RFjsK6fbfk095TYknNfgQL3hwLdABlRj2XA2NFy1lYQf4oQbiLZR4U7ip4JX3k6ihYAElSl2CPuV1w4XNgfCNkqIPky18PfuduzwnaRPntNrx74Y3c5Ye8mQgWEkctYYfK4h0j+L63uACtm4Nbffg5xmUolSIJyzmfCkrcAZHUO2GNP1OCSSDuv66LYCUx0HuPTIEsZtAPlz4yOIxH4DzZ7aX2INU2zaiMQfMLgn92Ff/6Gh71odypgqP0No/wCDWQQrzYHN6EZQUAVb+OEesiT0dDLk5q2yq/6sgZUhgpvJOwI9rDlgYEUuxkwXSJsc7l8ejKa8JhRSJOLOx07FX/keFh33peQYjZyMC8c9ITw0L7SsLFcHmdKoYBIK9JpDWYxDBWTWZ1V3KxlqzEr/ANjDCDGxmTVtGafE7juhG6B3aafveRxcqBKlAAOpnjeO7C1YhGBiTpDG8xOrITDkl2ZGTjjac1mtrjNOGBCJDHpjTrBFg+0O3ethAzzyO0k16EDBl4uJNi7DwqttMyqkXxKSgtbL35G4aO98NaCjc4IkmvX80a9oTeKYY5eVPouIMe3TV6eB8R/fuVQ6EyJYyWSTBRGNiIPFV1sUOGkntFoIb+f4Xq+u/8MAidQP2cal+Lf562+ZktoYXsFjmLjpePtAJc/2el+m4uO4oQpuUhLcOkWSYjccLXDl7jh7DNrVWNj9uRWMFTw5NdJM/GmyDf3RpNvp4DymPxsEdOs/rslkSTFajVKz4XkVm5gZvo5gisXc0nC5rX6Zb+fYruZr775HJABa3OT0pZRdwJqawndq0FjVRiHIybx1FO5iYY9vR5uZIW3vK/kvDG0L1g9Y7Jcj4RjM0NYzA/UrJeouneilnMs60Qt+SllUl07O5LrBhs4D8HJz8Y4Pi3k/IuSRJ9NkgvjlEBwsN1M6nWo+MMs0/jSezuls4Yz2xEZ9PZ36Q4V8QMHMsLIK7t2VT1soNm3qaIlxb/+SuLBs5fBI9bJgW/IY74qBm05yqjD/O4cYpcYOf3jAkeuIEDaUCHTQtsApiETI8E3/NmV356Gpo2NvB33+nacspobTwozKV1O+Ikk2ZCcXDXQpd3ys45ayjwoAE23MTPAP2pZGLHRXr8JtZUK1CmiTLut8aZVURkpvX2JbDv+gIyahGlJqnOSmToLwTSZzW6LuGsjHxHPITjHecEtCkWZPF5qW4/0TZmWKpowHxWpDvD5mvVhtGXtI7lhIx5JOsa1sWFIXFN2UYwEoueyJT6Gj2wPS38xXNqWUMnZIkLdsx/mRVpPqSqrTV56gNx//liIZ60MJdHQSLD65bDrZPVyw+NGftccWycvvyGbftImVGdtJOoTlqI0IfCEt+NNh6lndzSUW7LgEGH1KRkxKfjLroUQJeHWzlDvE0OjERP7zYiPR5Oj8+fELXtHaE2Y7JTc5r+PPAiyeOb7wRdmz/B4NyYkbddA3jwDe2ZVCbB/xq0VP9rghLHbxUWjo0rBJ0LZa9N8mcTRR834l1n1sxakT/ctpYHVC8BZklW/KtA/MDfnOzy3ck/91J2aWGQ2fkzEH9kQ5mobw8Izwhlz2gTz6v32cF/kyzvGVGIwwTQldPjA0iXUqqgslRUNBiQIpXnTckSKwIbIYLSIDkOuKMa4r9GtZKeFBLzxOUa7LiDajbrQJb5+1G64zekMiHDAPtwTIt/kkD5/mOFcBwqxq3Yj3kxc7iiSdV/gipRg2u3JtwZ8G62Eux/8NitL1+J15LW3UVdGfrVmEp6xAAXgZnyD+bON2iILRolQ10qnra7cesioXXz0GbfnYsLffHfphz9j4BtZQ5ab/ZxO7uArpf1hBUnHUr+t9OphZr7HVmkn1btplORAtIeDIz/0vrGvuz0l0VK0Fy3+MX9+JukyQYAoIMSBrjhOVC+NAB+79cep8t1qrN+RgpZIObqn/MlI6fNtExMys63WOisHkNicNcj8C+Ezo3bITF35n2s2hJHB6FVSDCxzdEAOxdIiV9cULl/a/EXUqcekymy01kDpvNU2qZMNaFwHyJ4hIq8gB+Y2IpJWmHW7GbZwb7GljPkkjgQlL8KWxWQ4qEjitJB90cmKRAkSgoDP6UOtIWkZMRLefTzxBCH7spxtLw23Spi7LnpGOETUiCG5vT9BMbRxf3CW1Ith6Wh4tBTVlU2sg+6TqDJUOI7HUR1/5SuiKNNsEp6j/eAIJHs+/qHirtQodjql68EYKr7C8LT8fq7SmJzph/EdB+NOCXhuYgEk7z6RbtUEDnCDXNRBXB8zwqTTFnzQkM8nDcrb6cS82OPLcnCg55gyH38TpOeb+/h4RQwTUiOgifz/daedHfLQU24PO7jvFLEABHrSm+CV+5Lv+5zoy0igi6/ZK1hJWugrB/BiSxR7V2bcBlDxupzzYIeFDdPzGyish5P03JyQasCiMrB/0/XJLmQaRoX/TCIbswCh7SVDJNfsDGNSSbscM/7GqGZqQiYGMHOwvs8/UKYlZU2dEOYjx3DApg7V3dO7524j+zu7r7yd2rM2Iarbiq5eki3W74JkrJcpZ5L2JJ1iTTDKFl98S2YN1wO4po9cQYdYTaAEEZxHkP873GFMEt4LkCMS3WY4D3rSEYbd2jThwZx/yM3y8iVkbN9Yh7wFlAllj9L12VLhW7NWmZ5cW3+K3lHv02gXEjnoMRxAHmYyIvmi43l/TLdB5TfkcJgi8h9vKAzuovqcq9s3vyyC2QBzUQs7q0ZJfNzSzUq0/8dnf0/rqAof/uW7WWp2Prf4czoZgIqcD9sk+gSxnuB/MGIvahfyitq36MGxxMwI2srrBi114rUiZlJ0iWzDuo/tohgQPeyyylso3OX+1TbKBykEy0fSOXPJGSMkAZ1KA6n1wrf3gycdajmYBhaEPDIEQEYt3XIMiQBI/fB0KTq+TZC1pDzNvyDTGdT4wL89PhWdUz4SnUVVvrNTVOmtTlsc6S613SW08w+eG+SQ1Vo9+vrgxh96p+FL7OTSTMk9ujvxG7udKRI5Kq1cqz4ofcHaiazbMWKn3XkeV3HaJpZC/nn4lINITyfZNzAyBCAVFA+li2oO/hE/+ak6wwzYew7DPxbjDp/jirXZjthf36ilg655CVPW3Mbq8AespAWIK24QfsxoMMRQVJeedlomgAEh83fTG+2efBQ1R9U42p32V/dJ32jiTJ3m6YqtQb8O/inbMpnN4Xfdw7z5ERj5PJJ6RuN8BewHFrNcsRljURKgV/mDwZUAANe7jy8t4NySXMAcP8iDZLyfFLsQsv8/OZYibqABKCIlBHOsDlfcVS8hB2OwPbojW1Sh/7aAw3CgAjTZNsl1LK0zRd/c/aWh5OI5+nrf8U+ZyCFCek8LE/wjq7Q3U+icbZn6Bv6cWzqO72dIqIVeYlTqYB+0nxZ68KgYJeiDUy/+55+isOd6GAaEG6LOeurvIZem6iGDTmNv6rRZ4SZsT8/SAqfNe4GTZUe637DCgeUsnxtL2vBYm2wM3/Yo13MUiCTxLDbdCi+XIFi3QTrgPaD4L2lDi8H/lZnazcXpqX0DaO/hdske1gFDMCP945SsPS5TZmcBmQ4vgbxQLi4E11SzIO9EZl7iUWBOsIUupRHe0B25bw9JxhXuF2f/V4wrbSBKIZc6tXJLk05QGunfbIHBqAPYn1zQRK5Q783zSSXu2uXgaPhQTcAfZafiZx1ap5sJGWqLTZPRAIAF0y4t9nWA91d5i1K2zHoQWoAaNCIx6Ri43RUwhoH3EBylCDWZ08S9aHZDmJ6z6YZC7wMPKdLqNQpezNqzAWCSbQzjx+KUSec2OjSXDuPnyRf85ICcbeqdTUQg37JFt2nLdAwkX1FZ5Qv/mxFxw3h+suMIF3TtEmEaJZ2C+NQFYZmcw6zmr0DUnR+rfaXN/RblJqHJp+mnPOpxNr3gePtrswQvX3YEizGFjpo7ya3PzOOZr+qITvR0XmH6hRuKFdlkqVVJeEUOfaEwEgDOiYuo0T947J+J9bH0o+y/bOi9mAANhaZHlSd5igtmFiPbeKt4stqKOz9nlxHPyWI19sReTXSvgvEVlSf5o7Ub/mqThTD0E6BvkMgVzwPvpTUI0Rkp4wBtE5YKgtoPGE+uoynUrk5DJCyNYnKCUYyZv8caNw2/TmlTWNDD0zypTb9CWbtkjycXOCq+xkPw7sK8tozoh+weygPj/sdIt9rYbQC4xQAjVVZZjceiWCLfIjXzWodH3ez5S634UCgPc2kbuzBpOw6bLAe4nS3ZZ9lwLCNHjnoI1a5e6THxmEfJmkmraCY2dLG5iaKV8Pza6H9xPfYg91m1crPgKUMfa6AkjD6erGL8yJJEg4Wykb1DR5GsFdegVn8Ya38xAsGY5QhhIW/Ovh7qUk1RuQ29lMktoZh7xqVnRT3ShIN157zLQDBXkDBnpoDTlTKz9FKwOgjjTxQPPByV4GOI9AYOebL5/4kF2pV2Uj135BtaJl3VjuS8C3wpG8GwpjizZWksMtkv65O3pivjqJOszfP/z+bHI1tFulddEna7PNX6VWWR5Dm2u3sk3JPzM+lHJOZj3MtvxmQjNoDTm+RryEreSt//p/rbSkIuXdGVAyk2G6+kinohzG/057YLUbuTeEa6h1bfKHWbhp8X1AvyRqEbIoF+/h+ogXpOOsouPujvEe1+r1RsQbwXU4SVCkVZlrqIDJuri56347RqrgQf/9e9B3COptxfMCqjRkrbdTi+CdlaIgrqp3iZi9awuw0agXZubI7S8HsezF/r+YOBIi0IdpKUaJO/3Lap64uN0E33KLxjRA3HOZToueQzo5RAfU5hJ1vAwkVBvKQ0c9tUpEChlb9we8rTpAV17i+M21xsRA6wZwxaqAEEcnclfpxf5OHozlYV8gw7CgHMpaDhG6FSvpPMh8bBlwlk9xwNWzQgjpG5SrDcNqJGLEOWk9iTujauFtg/INRVcqhf2gNSCWwmsozeMaGEVhhh5L2bg2sFYtJFtNkwyXs73JPMcUU2Pz+itPICxhErmBRAa1H4fX2qnrg4lwxWQ4p+m61H7nRT0lCSKtmyjWFmGmEzRXZnQ/oP78XM68evhDc82YGLjBq1Skazk9RgsN/hd1lWRycowg/TTcr5JGg6c1Bfp5/mErdhAhVdm11lq0PJNcpbReK7EKiid8tlc+pfzl1+pAfFy5DjO98c32H+HcSr5/bcjYq3ETphUUUdnIVh13e92aG4GlBV7hf8Abk6ppyOfvujmsuYcp+60EMCxUffs4scgvR7UiU9EVDmkGIxle7eGy+Z1Hq0ov7kofFIt/8yHWCdO/rtpLYjloQ5YqKYR9ShELTer7Fo4sCSNyJt1DGriWLrhzk4HmzgrXOZxZp84WOMlVoiXvxguM+k6QCY1WRORBi0YVwbWYIJScECT6KjnAbMWT6JCt6YybmU8edG2wrTsAuzjK/Ueo+AHiFGbu9E4uebQtKj6LVnzq/+Gl5dlu0KeLk1EnHdlATFog7T7YSeTMy2GVszRzr60/QxDSXPfprCz6/+BF3tu5PTxI8mluglWfcdoz5AzqICQewALjr3dtJblBFTSbzIYLAiMfjss1ywBSQfaWwvHsx/wplkUFaYWJK7e7Y4zmrpskYJ6LE9wlVpSeJhnqCze7LHgCHPn2Dim5wVqo9gSF2CbAuN6GMytVU4G7p/WW5XcEdiTQP7rY47D7k9wj9EZ0y82DGcZwr3K5aeLoGTqc3yRn7L/SdROdjEhRg/Ad8zdp0hYHdwI2EvI9l4Ewlnb7FfYNoSgEKz6hmTGe3nTTkI68WaecSUZO0//+aEn57dGorG4MgYB5cglfjijbNgvupEfzvTh4zJGE9bI2KVmjDli2dUhi1JaqaOuYRQxVB9qnhS5VA2ZT/kVLZVjSG42ZkcuuHQueclYgW1nvQ/vghc7/c3NBMdnX56UBJQVO4EelgY0hn+B0WSu0aDtPra2uZgCC0/k3RfZ2BgxruJBGBTwoOhCevD7oD/jzfFf3lKiIdOZOibbgJ7jC5KBSMZr+zugDbQooza1zfxfKgHiYUfHhyrnn9JWLsx2XEpJBYGecPkFM0uXSwt2T6KRFJEzM59DNr3R1mgc7KEjdnVCP5qy6zp2A4j3zK2EAdEAxyRGjRBlp+/uRkZINByoEEkSvfMTQTds5aI+kKw3ZI4Esvw3HjM+2WS7iR55pKVQQBqLhT9mb31C7ma5q8FMeovboGYS36KFJB0ZbxURXiQWwasXoQQZbygWLlMGIHYiW8eFNvC7Fu3tJitrG/+uhL1H6IIhZzIBYPmt66uijhuD+m720mp7B9lRLQaHm6MlKkKLpVi8kDuDIrH/uppeQY5abbrLBYD5/vqVZmvZ4aHM0nh6RtCF1FYUaBESDGS2t+N3Z1KgvhzSWMA0iZ/bbj5J2axCs22f5v+J9mI87J+VuOssj//MAaSP03F0JIxh96ocDNASTHlMNyHynE0dGsUkguAUM2PWyt2X5fIEzsZPm9YhcmNitrHgT8Wz2juDpxnl2E7bMTCYd7C4C4gPbPo06/cDVtRFnaoniWK2Gu+2Ka3dnjRvz4r0LP8aimOG3BoONQ7IDBfGbdpa6ASSeKvxUxdb3pEzU03fvGzbf6FVyqzkOLGVZJu++Ue5A5Bh8s/CP/aGrGPfGjhS/+D9fRRQo1lB/ytXWq5U0+tcZK7C3rDHZcEK7yi3iQKlZpV3FRWAF1T4EXM1CF8exoIsXs8FfEDRiiNm20DzJOaScHtg6PzLknMQAQFUaZIgtFs+IF1B3yXFDIYb1kBgqHNP3u9xO/fnLbttkGrQxwPfN1C1eMS31T/xEx1wwE9f8Mnz0a8h7G9kxijTpy1kTHpD7PpgiGStPSgr0uOG49ysAf6sBsqyjJ3Os75QKTSqGRmQK6lZoRiBC/1vODtt6va7Y12gRncQWyAFD0W1hMIZsDjS8Ac1dFf/6SXZp6frslm5kMA7M81fi28DLpH0hXKd/nCAT8SOe3ObbanRA6WTXfeA85pcn/04MPicLjoUdxNvoKfCxkjF6/IrWyKDBROKXGni3gMtZVMCW8Q1QarCzFQhlaP7rvZnPoc4KMrc/SjmGiT9lFzUQOTkpr8/PUPUPlMZFAmqhts0g2hWWNeaI7OYNy2ov4idS95krNIAOdpzqWKTQrU1rs11LTOZEzJSjgoZFMzWRXwAZDcImUvmd5i+xOBd0i/Ppdgnhn3W0Gd5u4gT57EKy0jtyn0HYQjoOGBWlyaQWpJ4YcSsyW4N3Ermo9eVCsYRuLBM2EdANCqhT5TuzDmGfdzH8j1XSTHbOcHOJgAphwTuo4CbECj0eRg2f15p8r9YYYDtsysMndXzWI6tVSK8TbyYm/Yhhrr1Gkb0iOLn0xglLVYJ2r8Z9+omaQCd9MozQ1XTXezAlmZ7IYy2oVuFRoTMnNC4K3VmqI+JgOggv/yNus9/7JiO29Rp/crg5BDlExFruGGeyS/EMVsJLQxnjGyK48Fci+7wxhytXF+GNVE58HOQl3aM/cyD4m+cOYUr7A76vJ09+wB/XSLyACyKeSXz5m+I8xm+X3Ztg8ckSCSEPw00EcMt3pRhV/HDMhmUmDXKL7jtav9almE9HBQ9zseVvHBIHFYuHGXJm21CR/Si08QwpKb21uzBLHquRDFQNGMFLfI2bmOIFYgT1pg8SAc4ioU1LgqezsWFET3U2A6ypH197pwLUh4lsKNI4GzAoJrE60tVS5MfjfvUt2yPH+Xj8my3NOu4d9yf937thxNZo287ctuo7OFBGUqz00ZdjnbOdyhr61ch145713plKWXwobihXnT+RwHR/TgDmAm2NTSKdYHZYOaKvlQlgVkT5o2TSb1u+5R39wWXMmh5/pyFh99Cdutv8uN7LO46C7gz2M3Cvmfar8+2WGNoyyeF4sDoG4ylg04atLvTqefVLdO2yL/GX6Xt4xkOiRgp+LWJeOPy7hMXlYuCcJHESFqVwlqUOAoLLUtarNJb5eTfDDF6fk1RpZ80fBU4Veer6T4wUU8ZNfA+H9T3vlSialILvLM/MCsH028C3oi7kGb93bVlbEZ2ZfLX9Jn4ACqVX63+/cp3fRzimxiLC9K9CHjtUhpi/xapaGnK2ulBb5aC/OM4hFp102A2riaf2gnjdUw1alB/7uEv7lG5EyrNbt7Bla0GYrNv4DbOr27lCFcGT4pZMCZKlDdcpmQfHMWLGgP9/lIo/aMah73K3o4eYnYrdlpUmwzyqpahuqFkTsc/WqNzVfA00Uwud6qCbzfl19nQ1tw4stRR8Neq16eutyGyYDzS3Pdhq0O5NSoKJbQH6ho/0sgm/D62Fc2nMLung52EViL4ePs3+p3ACNl6HkFSxkmGzKcB7BHIuXcluVFbuQMBLyNR7g8P4PEGd/H8V8T1CauxUuVMRfZFOidS8FU77LNGKulHVmjQnc54WqTtdjnq0S5eUrFmkdIy7nFahm8WAv5Anr7CKIecZoCzOfbnNPby0rsntnmnxO7mzLZ2fvS8dRCnk8Y6/gKTZr5fZdgqgpBdK8zVvDkcgetQSMomOXDkNKxPYkKlOEFkp2aSA+14Hjt687f5nrGriUcjJ3ea19HnN+QL7UtAvf35GvDYe76KXORRBkog2iUjltY0EV4A2ri6Ljrgm2xFNkxMRzqT/iQqL9KUbO+WD12Dd90tBq1lBQy160Pb0Mf0SmoNpVD6VikSAds6eHxvL4EGQYpolCLj3rsc8wK2dBXRtAWl55WZpDrK1YC2Qr5xXAAttJVVIElH7s43pEdRDCT4yfZ5o3+UNZdaYquImEn2VyIECaHOzUzQ4Ml/JQyu1lFWWIjFWyutsHnmri+S0KlNvV0JV4mKFIWgkh3B8r0kmG5Md+4ENwxf1azCbBUIo1bGcd0tqxNQCyC9RpJx7HOfwFlSKQ5ETqF/R0Ix4sZHOgKU2qp/aRtLmJMH5egTd2Kbpw5xPFfsa0o4sjlKn9i7ru0OZjyVFeIYv/IUKjtYLcc7YTJIDaCie2n399asYtL8vZJ/+TX4eMUrLeVMFw+Gy7FZjdqlu9OjPSjbIeHQkXgTDZRxQxOdzCBBwYFIkxF7y3RTGS9TQq9alg9dHz0BKVDLXL8UkGaDPD1LK2D0wzIw+TAmKN0jTsffH0budVH5DRTuRzrhVqVrGw9T6xyMS/G2mfH6MakMsuYqrYnihJxY4PKcJZdRNj6cdTE8G+CTLaRF1gjhcCqgeFt2gEWqq1w+Tra+ZB96b6xw/vk9VOnr1qNPWX0R6bBJefVlB8IronnnwKysTI6eJezG8VPagZ2BwiMGcs65q5whhrUibt2HSGUJ22FbymzsB2KfAV29/6hlychmq9nVtmCMHDtk6kNDRZh7dSRDI5iFwoE+uApHoIsT++ay50cb5T/HeNV/soheqt2s8Zw75NZ+nMbnlxN+kGLNBYxOXLtyy2NRkYXOM/5hLXM6leuW8d7dNgtt47mvVW7oGr58NaFFspuz/9oniklV6JAWNLVC42ThYBvF6IAyJ+2t0r5d6JlIlwjXLRfLqYB22bLej9QQ8D1hmW/TmahklebuFeKdVhS4izPOiEBkDL4fSiN0hqGnSOp0RGgHe2bTiqjmYvZ8MFQvYJeO8h5cykKFkQ2nPwtMout505ydey9IXw/p+TghNShUhxwABnxsHYbSrSMMKlPf71bB4M6ewU1BtxdRqqXweiLpuN3FJq+Yy7CVKQzUuLlg/m3ls5fQBa9SeZbO/1dis1iOciJ4dQNhlo5vFI6a7RX+GZdy4licujV70CmJTQ9EAdOlAY8vpqBAw02Rbej102MifkeH8TfLKajPX8YY1V7ePleDOdBnaushd60houZWKMI6fsocK82e3TibX3OVTqiPC2vBd/n1qsxIDVU5Qw0U05eWz/QWWLxpatO9L659rxYuFJyLr5qdSryF0GFx1WhU7wOtvCkpLzCw6lq+1i5nUayV49sTpj5Y8qB0q+pqdADgEVEKrJ+VPxNd6AsxCgv7QlaJWQ23oanWnhznDnnl1xEAFfnvqbQa6C1m3gJyUKuYpE7Cgp5H69dEGVhgP5TCsGRD9Fu5WB1AQUSHgMD1RJJ1DpeVSceSLOrJsOhYjY4A4SJg5BBlNg07ESrM5hScUS2F5qylbtFjqCc4WsT/z2cQecdI1OQZKlFBlJAafQ1NZQy1oB6mHQbSnNrBfIwk8QX3EIX86cO0/HqlYW2jZfLNmx3sniJrfFYmeHlN1ilXPAzULrWv71DnLeFh+4HywtV8GQdWgA2KLFYt0UrqSwEohjNr+gwSyBYwcz22P71zWu7mCyj9juDjW994J+4IlSP2pSdPHMK5hR6HuCNoezDS7YRvaqnEol4Oj3g0DqAq99G2dbcdWFIq6nhHlzeCyTCGvgIDZlo+AiZkcPkLSfbc79zmk+hPwgOPTJ3iYmsxjoMljCqO+JdJ0stsA5OwSMfB/QdNu7yxQvy4yRSFn4qesEJf3FZkrjbUOCk8OeruzKHYNLxFC5RxE6DqQ5TTxz/3XSSg3xW2N2pVUpsRsPZht1/ojraHrnGriSuAHMY/LE8Ub8Z5qDuPQK6Wufwe5SUsRKO8/0qKuQP70NCFhDwYSPITcKLy7ANfJr1C8KhOr27C42Exa2rUobQATUdZzvuL+RxkhOKjviugAde4eDSW6If3YO0aG7RqxBeM1rXFHfNnUBnxwtue5tcQz0B6gTnTiAPP2IKjEA44A1DorGlxYSt7BCvQ90wd0uXxKmf3RN+NiUHkhlu2w9hxadTFPBkifuGGxtMb4WsUoHueLR7MF2jJGOulLNvlsHCEBxeKdy7yqVIrVlotlSzn5AfDdxXICTX/36GHqVYaRzrcbGI9wWsgtwDFg0Y/W81twgJ/d0SHt/kRwQNlCcpHiqWAva6uosXWB7MHkFXAiMyOv38RRHynwIgQuQh+coC0TncUrBU62aBoYWT02DTcU1uGd09UOsDKuUQ7V7Btlmo66RDPvD01KY1M3LTpMRxQssfOQj75ix2D1n2CW7AJVBq/jTv/TKDCj/RA0IG0hIAh2QHQg40aMvElGauqnkF/LGh0gtJHVKJH31wqDZTe018RBvAIk70XF7VQE+GqRhlMK1wRlIWuKM5DZCVxDHKko/LF7/+BBjHXsBVk8GuQ6H8C7C832SD29PAdfIUP+5Vf7Guwk43efcGd5nrL/81AR8kWztRnaDiEgvGwV+w/t8oLEuzrD2QJR5ssg+W/U5W+sBbTGqdaiQbzC2faa2EyOQ7X/taW+0XNr6Stz7dDB5ohNhpSEGuVw5S9K7Yo2dix4573JbQZ+TwghIWXNYwsenoPjoLa6k2AP18rMVG06QmDI8MRkJ+ShWtzJn3XX0QFMrqqPA3EYE6XUnh2GisHKFZDVJ/6w0kUypgPY7yP5MR2+uWEdT5J+DmEq+QGGhCiUlYbWnKYKRqgqhVvZ2cAJf4RwgPuP1pJttaYWTWNsX5LraFr2m5u/9sc8FGThkjE85faIimfP2GUcTLXZZefOpJ8u07xZfTv6hDvzP+F4+DutG89L6V7Agu3wJr3JHQYhwrFVLwAj7ZWWIg/Baaqdt/3tEHcMA6X0gMkYICivHf5FbURoOV29/lHVuVolIz5BHp4oX/N163C6/icYPTO+ZaBCfLxlfMO4nrK5awnG6XqhBtRCAoltSueTiek6qTuvCPa/TbRraZ191+HA6PMHn8AcLYtdhWXaYFCHGNZQ+54xcezACFQs2WIlXMpCqN0bHVSCrFpmNyhGhptHdbA36CCV0yHMmEyPbr7LoQYeW1Q3EizPTkZfCXYVMlHlj4VaeNi9r5IG5z1S2RTNWg9cU+w1A3KE7YavBW/2pDX86/K1rBcjEeYxbRtbqLI3EFZud9DebKmYr/14O8d/s9kgm3NGMjLYwyKNAd83tsXFVoCpSTs14dKKMqCedByM/ti2D/GWDXsaidztPu0ln7jYy2pS0vU/fQ8rAIPEIOr/9pKPH33GDcpaR1vLVApAd4E0T7H+N6iqVPLAxo99HTKvczPvMhRn3n7HEBCh2z62xiNmtC4SepESbgn6DkV6PPiWTc25y3pCL+zDAuFc2KAjci0NHapCgjbaDBzCZ/pAwZEqaTnLinE0c4ROribCmUZNzZItHrxZfDK0/JU1qUkUkONRXk3zHAXjIvazdI6kXR++oNH6icx7XAJpnuPiv1+5m6sLK9LlxyN/MVubc0FeRSm2lT9beiWDpwKyT+/yCboWmmfE8z5avJOKAhS7/n5e0ozydaFP9pNMFExZQAYYAnwVcuNzIs9DTp0FlG3e+AYySQYGb0PWNwT96hB0I3gzAMarTC0Jix9e/ml40xirADe51GHZtHlI3wuqUF605XT07Wkq4o6/g6zDt3kaBz7L+RomcM7GPyelekymQMAjUjtmcsuBgG4pG2tmnzPS5IRZeL6edkMqREIEdd8aO4/WjmkTyU7kuGaUrxIksglgqm0ELi2HrIjuksdkpq/KC/lNriuFL3ycsPdAWC9bXXXGty/yMIHFKV0eETlj3YlVJ/mt7uR5mKb+RvUWBBLahjXvKLmRTs92loy8GUUV1OKziUa1ZWZnSoH+1cR9yVlYrHmf2K1loChUbGeVX4P+tM6UpjxcQHsUvVi/z3m7iRHGm1/M8t0M6u2zX0It318qYKD3OaZQT1Rnncdhu9rIIH0zyiDglKtLOYLPWfeOjBEGz5OPgxRlgLNF/qE8TjjJWfqHHX3xR6VRJxCaI/6hgtYGqMU1xxtMv+qlO1ZwB0Eo8TJC/d3z8INoeMEjo0udqIb4rWA3KwC72yLNO7h2J8eLPytEDIZKjdZhwEHYc2cYMl8RaLZlykqsUgYHAczQhmZPUl2RPx6a4b+Xq60PuT1RQgxCYbZXePd+TgvA5X/8wREnYWNvMTlMv1jfsPlV8gxCLox2VyB1U0X7VKlsOMij9L+Fx+pMXNBedl3wdJsQ5UO9v2FrOM0RZn1K3FmhR0baMi9AcrxkGZEfCSIyGIQbOiqJfiPvrglUJX3Lo4FvfbBR4q40Vyphh0g/1lr7TW00a+Nt7tyUA+KIxGy2Cp3JvUAZhYBYwOc7J043lpFA8PNOrzz3ZTJL/PmeP2JEwYr+NAqoySl/HJpIZyhe5okwSo9icZYZU6oQK3sWKVJp2dD+YnBBlRm9G8mW22bfHeV9eDtyDnRFPV6Q7Oi3jEWGQrKBWlxaGZaHmTriswXQkT6uQFNgWTgxcWIHb1Iu9XLDtw6bfQDF1enfsXl04LyFlNzJjliEVFPM/p9ZexYHjZTheR+HwrkHCOTd34vkmJrtXDrSG05Z6jDF9SIAWUqPNePhqQ7rLGvjo43Znq/g7/Cbu9T81wEW+CNvCIqEuMLq6eMjjgMfWIr7ev2hCzy9veCVP7L4viY8ZrmqHlfM7OGgEZ3RCEMYjXOxHir/r7EQyPlVTSOaUhZyUua/LrlZDmy+pCWyPvUOAuQW8kJVM4g89fwDIGNEGNbLCfhkghFFdfbZsua7iw30iLgDGFzSuFXywi1Nu5YKyMYHG1RNgYUx5gnAcEmcNlhTsWYynwiiSucKc663ZQ3oNBWZUWXM1EQF2mnJ6zUtZEKTVeShXL20Zkmzp0O9QHpUnSKTLBdnXprPip+RLboZ2Dz1OyOgn3tap6sQn2Ejv9AAehERuD8zluE1F7MyH9LaqmWwh1ZESiWVUkiFtBbZUlsIeKQRSfdSfYbh2l4VlFEePAW56JcRg/O8+HV9Vrmw5a5huKZ6kxanlaPJIvc6o10zWqGFAxg1JIxEkMhE5QvGm+mBBhZzNRK8XjEO7q5lLVbkh179JH6A+QUsEJLoVfmZSRW5WKGCB+6gO7Ce/O0gDemKXMt4LjOePDppmeVCYoADg0aaClADQeOQGyg/sx1OZkbOxKJ243f/yFZ0HXWGLTzkFhIQd9Pt2j9bpEJK6A1RwIY+bS/2m2AdZAiFMnSBkFGATFK3VNZP7OPIlDtVfu+IXM1xqlNZILPj2l60VXlKJ6DNLQPOnv7zdjfQ4Fp820HzzZ1H3WddLJ5JxHNbxz+v0Ux4ZkNQ0wzxB52eKWTGZljN03p2PJDLuoOsDlnQe544zEf6McAOeIBtJuDd/vAqiIaZ8ZZe9o7m0cWgTZODzOknzn4RbCz36f4zNQa3qX8y8OMJBluXGvnM3RR2jb4DpW0bXUyU6xP2ZHWo49o5V9mWNZ9bbPQsfzbgUG5vn2n+KBxAtkD0Kb+SvRwnoQDeiQzVTfnMCNceGuEBzz0Krqs4bWGi9ia410bhLOrgXaF4OUbghDMX+0aBRUZrD00jZaM0EMsl+o8TzqlK3PVZifcOoUq1UNgRjy6wurDsC/1m8ug4EhwpaeyC3FevzRmvM861u/ZiMQOiMkOS1vIwZ/CXJZXBrL/0hN35rUtKeIWhMzC+AQTWfHDTnR2Hi+90MsZetaPXgdU3webWH9Sh4fIXtTeJ3vpuV/HsU2sgcMlmUXgWOy6qCbDeTqaTqnQJTC6JNNiggr3FSgMfotpdsO4fP9tL9MN0fbo7qr5KBFodMu0fS9EcVESa+YmdJywE3DG3u9WPnBcJY231d4ut7cA0CXbDv3dvbp2196fbg3jeHkbtENKM8kRnv7MT645+6lfa4fpUKGZU4c0gsxqk68TgqKIr27almMpW35huI1tvLgvd1DUd81540afvJq9VYZx2+gIT1BKqyX7shRDXg2lkwbl8Ej7js+oWeWK+g1QkAL2CkQYHLpMIcn5IPQp5xzAgvqc76sBCAyyZ9Z6oILqj8B8xIU0F9inLZHWS6Ue4tospb14F9fP8oRCmWYueRwISgCPx9j2DswGz0KuZ0pdBDuewlqYj3z6V6piPxAwtQIoxOU9duFhZUPFcotmvzrAjzjua8jraiPjmhMjq/w/TISyhRbbiucRn8+UFIHS+BkLBnSh5rHlDLNoeEsNpVAD0co/5GSpLIm8Ognbekc9CC3zensQnRAopXPZkFs7GV56oGNKA8GvFOCLXtnPBQaMc0knOZbMEzwTDAkCs0omJ9WCLj2AGxF1LO3JfBNQxZdJ13TV550QaTk1uIxQZltEUKh1cAveZcMxpuwomOmsMI9EqYTWvLxuVu58lukaOg9KzCmksgoKPsEQ0lmIPbuk3h9AjfbYdaI3rHtnIvE6bGOh0mAKE6QwUuI/E411ilAY3yoExGN7W9G4uBMuKkTTAvzj95nmZRqMzR4H/5eEAf45BD3ihuDmim+UKQIwdllYb0LMYDgZLPppmD/FcTj51QVa2HUx7lQzdABhTWmCPJMeYhYicP+MGEO8JYdnF1rN31dpXzOieUjHqyN+V6grjS7sL+oS00zLb5vn9F2QV4MtFHvbwV3cIh6cCq6VuebFSPiFX1ymBSn6chFQcGkQct4joDUsioEkvOQuhXbOfNHQCk7m08T79o1V6maM8Y2ZwmbzkhMzvSEqFfKqExb9JCGgSz2s8mrNz/ESGBqtBzBoiJFFkKhCYb9OY6havuCRJ7CP2l3DpLiOYQ4sbe3t04LEHEKdZoqWWOobgdyeZ384rdUDgDdAb0xnXvQHp20KcCZkDkVMliE9odgXT3TM+3olYcCE8QbxOQcB178jWrvB/y3IvmPlbsFpnhq0vWKXVEh+0CFoSQrpUFxq6Y57Iv3wLRYZ3zAL50K6pLkMxjeDd6RrBLufGWjChb/EZqR7hRA6fCX02deTH7hligGwNVp4FTMbpfgIY5COWdF5goAyv5vRDlJqc6yJVHNMzncaSCyvMwCwwSeEPu87tpWPSvh8x/xpG8IUOPxQGf2hI1Nv9hZSaeqBchLaL00g5BBmXzc0zhS2F/G8gUG1mkn/6KWqa+VdcvgI3+jsnQwcWYE/R/C1KtNkdMCcnRr89PycvsHXrVzrelKi9PyBj+9YcggETk5U1vmqvArNUODE71NygJl2WAsOApf4IRpQ084AE2qDFWeQJAyrQDqkWf2YbobDtOCl/e5N7JAJJQHveLpM+e+JAJdH5Pq7SPPDIxfdho+WrYBPM3uu5BklW4QXJ/s/GC1fF9d41vblbzkUMMps5O1B3lyap1OVh/oJFMPcBKPe/VeQu8Pn4tYNi2DXY/MQhl64yQKI4aPoeYuPk7Ihpq329Bvu2oSK5fyOPbb4ukMrN2GXRUND2ZjcZGp8AlcAsRMdcxicdhZ3WsVqG4ODv7TiLjt/+6JbqlXH9WYTrPaKAp5zkXTVU+JUxUkZeD9UhY1OmBEnyY3k8noVxH6EyRsn46kMCP/rWsIaRKzHoQkGpFABBlPWu459/R/GAu7BCq/CkJCcznRyCtpQG2kP1YDZtrCci55iPtacDj+C1tmp6Iyq/nbEw3j8WOduoLXtXNyCaBN7GbT9PVVixkmAdahg4yENsy+8yL0QmIyfrtcqG+VRtVkf0AV1BiqJ+nEXwjApNOvCAHpI9uRYbutCng+TPY2IQqk7bGzAWTwjC6zf5qtmEX/jS0pQKeqiE4OoBJcAJ70rJPGs2hpEd4IsuZBh+eoYZjpoYeMb8hCoRN2I99UnL0v7Z7izP9jEn7HmCixKJlKhBVDGVUoaZ9lQ68mW60msOa/z+RA8aTFIyu+0N/OIh68o7cCUGn+I7Mttaz6I0xp0DyV5k6bbIiW0erD18aon/bTF03bOOZ06Bauvps5EaQa4CZ/EVUZO9tTN/uKHEEszq87qmbi1duQyRS2J1q6EJ96JMGyGuwcfIIlydYLzXW1N3z3tSRozs1GjMte3ovuZpZ3kAS4vQEw9SsqdlEZ0/nbYLCU+P9LGXgbXur3g9hoqh6OdfBpKqL+M0FWlbMooRRBU0WaYa2fD41iegAbl2I3SOJmATICA1tcD6K7lO63JbDKeLOOQhNDbBje1+Gz07ry8BJ4jw8+J+anPm73G8RZmmqHpOloUSwBmlG9W04As5NvoIFC5lJlEmm1pUsUfx3T9a7lwhsS9e1PbxMv7uo6CAlG7Zuacq1gU/DhOAULh2NeEuYxGDEjxnz0YRp+8mW9tREO8XOOAznzhHVwacI9K5MAYIokJIL35S/r1Ml+kNVObeKnSLzz8aBLVXrQNjmt+hTn8H6/3yaR0pvAssLOjSMXbhsvX9aRWgTtZacT/vwgr9tWmeMv6dv9+FNczBcSf3n/mQwF34OkblrV+cvsvsCh3McQ95cNQiLc1dM3lGjl2YmvpmqdyFQMUWBLvXTLvc5L6aIEhCESaUYoMjUfEWVyon19uP9xJLEG0sRORHLGeQkVIBoVPtFWocgYXklmYL4prOoxJJd7DrctoYLOtemtf3Spz91Ouq/C4Jia627Pwy+wdK0NihmRYDERCD4hwMCxCuHI3hyJJJs1qX/LxZYpyZkc1MPanxz3lhvExIgvmFWflvcEcnb4li/MfnMSGTS6L94k3EQ98TdCqopj3H/3Lk/+Hf8Q7T2Gj/QKAIDN50i+xMc7hBox39LXXdo+UW2MXM3v0Rp67p5hr5+Ex3qtPyCH4baRQQLphb9Sl37VYs1H9d2h0BQpnn+zaBRS7toyDHjplJf07NwRCda4RfrcHwIPgkfagrXYXqd3nVG7CnrBno+TprKbARHW6nUHXLsRXGA3suBnKX1rjAYa1E9OOeLXi20cUsGU9G/kASyIsci6i10psmlqdbNY5RI9Ri/ZSWNm5ZG6H53UMVbVVFEK0c3znanqf4dW7BEkVp4hyN9w8WhmCekYxy4p4iJsfKDbSwCxSgGgB9bK2qQAjK+IxaIVLBuvPl2IGzdHGNy1VVfE9XndAvdsq23yakWLI/5Ytg6CGokJPlYyYgnTXwMKz7aWZwKDqx/8JOHF5Ntv9u6CFnbJXc18KlcElaDoQ7gMtQ583kwBEazUb0efUFp/k5U69j/QeyjCXw6MnIbfnn3rfUtrVv1/aWnN12cxr9vvl89Nf4RTS7O3jql7sscH70Wi8cOAKSYz143ahaE5J9qgNtddra/cHrmWZIgV3oJFp1dJ9nVan5KeEiwIjmaii/dC7Xh8VxEkBKnLHkKxdWOnPkY2fTgZEDg8XYXchffb3yFMtaBFkSY4KAgPuUSeZCizUaSWx7HLbO97L+6djMU+JNiKNMJ3b6Td2/fiaoG63koYE/2KLCEE38R4N9TLGOw55T5zkmDdjCzuedNEo6FGvO/XP/DDP4m9RJnFby03l+D+pywYCNM9pfl5LZH1pjyiPI00kW/0wCLT4pUDGuhTr7Y+523YZvYqQEAp+RNUfs7lsb0StbQkzG8TTEezY5SUAQhGUeRHM12IaHiofasd1RsWGDfUtPbFKS62W0e9vO5imODrM9iCsMFtNC0aG9J3S42P+0STg4fJMj953S85jUsHSS2BA19PziBjSdUz4J4yBEG5R32ZfkJAnHI6T9NR6xLT3fFc7yCEG1bv8E0GTmF4ec+w32qryMhujEa3CpMZSh3mA5s+acqMn4g3IZ5Xl+TYXkeH8aZgQTAgmfeHCWbf5t2DzYON3x/ztNli/oenqJFIirNaNSOutJFBRZCt4Vv7j5oWqNSWsAEbUvTGtVU3VpgMjjF9HfEBrihNAGv+tAOlbd4p1ldiHrj4XKPjvObwKiYtqQYDl1IER9kivPCSa6yxe1SBP/5hTbsIfdoYM+2N29oAQp15UkrLCXH1aiURjzcQJBUPi5kAooSYk3OgRFR8cgOgZTMMiEZNYSJZAgfN0QbIW8E+ktHDjf2Hh9rvdw9/9vAcgBRCFDRzt9kyW7JBaZiKbudTxbdCS2USvHidtQadIxWx0xz0PNVpxezx3MfvUefaFQscMbPJfSAbvReR9im3xtpTq3Q+ZSgi59G64DeoJoN1KrhCBostAPBLOUTG9F+uLIGsoUd4NMyqiKffWDvPV+aosfWAmQWZxH7EQ2LMECQnjdyge3CbXk7rJbLGbQb70xW0sSJXV05bc8zFwfQ6P7zxZtucOuFnGiXJB0cejLaFHG28MmgAqPtUQSOrPcx0jwVGmEZ89oEmzaJn3vDO+UOGCc28u7Pko4klvoJFYgumQk67r/8BLeZnELThBcqX5GzNnT3ES4WoxC4xnZZvuTd9cZNCZBeM8jUqgIsFR3tBvYFRFTytQcX7XSIgx6TK8cg350M5H04LDSG/SjT4y2apl8KcEWjZkjteO8p5MO6baeesV7aNQm14WUhkYhhGN8tLkMRkoR/MwRMRWpiH2NYY4ZAkrqMjyaTy7O6WRNjGGrntRKMCQw2BQyo53fwB0M/A0kkLL0xJOnkFxv91q1egGkpFoay3OHiaVAjB+6RVswlDHRiTqC61FPkg7q8zmzkPXHrEH3XC8KQEasQzQ76orJFPZZt9Oq6PuMX19JM8Ac08wIX0vpCjX8sRJ6V8Uzwg4JLdMy/XlVmJ8os679NAweU9bIu+r/ucpJdwt8EaW21b9GRK6LXTSu/+aoW0UlzrESBbsYNJXV35HQAUIPCfLnKkLX/mrCXtK0tsrSJ9ilcbkUWDNM8O1lAeB54OhHMCJybJtIRyz4E4p/PAqkQU4NO+aIbHvHFT+6253BffmibWxi0tGs+eFMf88fwMnsqQuRuppzxDUGIbXkKIHm4UIhJKddozPNaAR1xOQrGhZK/HAXWtyjOygs8qWfT8VePdWyNH7YFhBn9Gdyt5L6wfZsT4KhW2rqb7GvHll8yJ59ghZ9pngTmDVQcJNYwVNqerkc8uKm/Cae+XxlGBULQpQZ+02nsEOtwDAcXWILQGChM+IahWrKxnkuFuU/FevKtGWDDQKkcoLmKDcXYC+6NO4ZAqTrPcygkW11AXG9t43Saq1R6UOEIdiSDd4wVU/YK49dUVoZwfD4ZQvCq21Z1GWao/02JKx7qz38435Rww0VrkoishHRiIEdq6ZVbP6ozew8huR9pL9kYjvZWGyP9eVojwOvUSTZNB+MEPX0YkFalphghtxazob34+xJl9j6IBtOaKy3LtSRk9q5rS/H26PLs03B0OQKGbfGWeMsIJE994aIszyrh71a3F8+v6orYiwbNYw1sUrwt/Sbd4XQys24eKYybxnvLdhXIY17JSepIuAGxSGopm2EwlaiWvv6h6hYorNWoleFapop7nbHy5BNP39BoU5BHEPVyJuCY4x/6YuqibZw/wTeAbSYxdJmYit0sof5ASElvnv7gglATYTGz6WpGMsGu20MiCG72MzQP+U0pJE0ygW235tG853FhNuHkmrstq3XuvRPtDasdI0FCoNDbM40L6mBMnxZR0NEkpAPY3GsC+fekVelcHUmSyBLQK1CeNWfYzF7HT3q+Nxhwi4hl50aP/mftt/42AY2U4pAU6JUUpEwniZd1znUIxAbVMd3ecJbwLkV2iROHVwYzGl3zswD2ZWr566bGHGpD/74QnXo7vuOiOSdFign4VkFIWfgkvkv9wBA5Fb4CuBtecsCHPPBA9ww7Afg09E1885w03hGwGAu28k3U215EQhgj093hitDRlaNIPaxzGivisVhHOfLUsRnCoyTm9+BobZlT7l+Z5dP76NPC7XLx9wR4q4lod5Z+NUuPTc9DA5X8kplozuvGqgdGKj6YxWXlS37JmTjoKFosAsPreG2ECtoJoVgg2hkW+2sqUf1SOMCMisYM5Ma0SmdMAx+WHyLOgGzfvPmPjjwilquxFnUEw92MELB3GkAPePxtcu5QMsOtRq/iUvHET6ZSEWBTadWewlTYFNHVfynrOQsa+s2UN5UXALNXw238xC8FqhhPEnBcYNqsBB4D/R3Vj5txkuAe5bflFG5dKBz60pn68n25prWZLgk8fuHgWH3drDHDY+6H1W0e5Bij1Rpi0nvJQPEeQlQFCx3meXr0PbCzj+MSLc7qILG2EYR/cyVUoQvia+Xy0vJljsVo//Q68Bc6/caPg0E9VVbP+DvKuk2oPB0S52BUzfzOZgG4i+SuOrs4CoZP7+UkUi+xCq1FncUit+gD/pwqaEaQXbmJy0mma9DmWS8bub4Mgd2MxyAVDfmkTco76V9nzG+td+UJYIABSljEdRdbESAP7c2R333c0KqjOzai75tTJK27U/2DO505/TT7ZUuGIlaANuv9eKNkEXqehcsNlj5PXwUoAzK7vB1/zV/vNhRvnPH62fMabHZ+UB9LrbSc7IUABzIbrmxMt+n8fV15nYsHEs3wTp6fkHMEAMTssSp8JiF/ZFFWp13fCoEJMahArVd7iKne/Z76OKQQ3f/+koV8Xfy8vt3jCBuH1Z8BUvBDzdCPKtmyffoCom6ojGX3KI5uBMGWiOPYfqAIoQg8CnLT0yhCvxJrFqKMYqEtVinhZg5tiKGy+/hDz3tEXZuw6ASLZC0St6x2N7QIo3oh3874YkzZUtuqGWLFMVPgyT1dBq/HuBH4R7NxLTopNFAXgn9C3G6l5mfD4og4zCR+q5pD0hvT7Ffs4Ukdofka8gxvWevWnvtqSfH9YUyHQd2Iad+jBqFCuRwOMkdsEw9XfUbcc79CuwNaH3ahrzAkdiyz6V9CX1WeCN/HIG9URDYKb5wXe27rgpV+AZ7vjHBj4+HbDp+Vhkd6qs0zoxJzKTq3eWpmyIbjTddI86hd97N4Cn5RXWLogc9YCbYSxwMDdwBsmJFHPBu8Q5o9GDyGS4JBe7435m9Bu+e2kMLvW4fZ3lmYpe4gMN9iYsg2O5b1h2PxveLaDVxeiYs4RvXRnT9xwfz7amfj0MkStqSSb+h3MplSSOCd2o6rQG3pzZQvjeUkuYgmuSqVStvox7Vg586+peVXhzhz0yVUlZkQ9O9fq0lzjsAUhzks2ewmj4EzBVDOuH3uxItNUEWrDdN9HU1f4v528+bjuQZ3hf9wPiZA7zIBzW3qrBrpc9WGQ8Mj94MFJfQVg+5Cu+Itg316zMM3wcAX2wRuZ+KWZDecbqmDLQxHy7WfaMFnU8cgsmx29UVEzsXS2R7GBJa8nvxCLGzUOWH2I/BXxfJwu/QQuVzPuQCfOuxVP7yHV8MXFM/2DEHOz4te4pYR0Z58N0CdjY+A5yMpNgoPmBSpxn3eAwTNgc3HDNkXUqDdvlErEFvaY5r5DdOY3/4Lec7gqRa6ovxvM5NIZ9jo9zKZ5VWo28sGVl0LWhLBsr7D5I+Mk4r9iZ2IBPtaxHT+Q/xuAn8N0cRcTNc0YZ/rCayXzdfdUYAWNosXkONjyDvTEQTFYp9IbDiUN+HoXvn3QiQNwv6J6P7VnzGyOGXoduzKtGVzGBvH6xA0cfmvGh8RfpGLQttowtFhZ/je1wozwYQlw76LJY9Jk03g0S9NFmRqEbaMFlofULFfZKeAc+MWWoUjBGaCSgqaHsP32+Umvite13WF0QikJYlm8tIN/qSJCFUEIgepgxaDXdbU1ZcymFW7kfddwv3Bn/5/FwYT62m1jzN5qA2d1JJqmdwp96BTDIFBpj0Wh+HMd8FKBtavEnyFTi5xEAkv+zEeudE6mZK36Upf8ThjjEtkvhiHZQ0SPwYkj1ILtKbnlAkOQCnvG1477+jf45Uvdh3k4iRkCBSRV/tTycRsXu73zQMARyVlxHa6fqMkpwr5n1raiI93/g2Q/M+6j19AOXSFz7o6f+t45v2pDiZcdUGfSCwMNthq9fJc5UHNjQ3K6mSbWV8aWkFHY9SdyHGKLFI6fKK1hRUk902f9P7qNZml7X254URvG+WZCtOXhpe4xh1rtfEPSGmeovTc+af/6lnSUl9KzuVzNiHtWfXX3Ugk502ff0WnQfiTDh+aNt6xAVOz+P4By+J+CE7I3TlhibGgPaoiRuQitJsuG7+DnSHKpWgqQbncf+NEHHd1Kad9O9GRDWe+NtXL4lIcW7JUD36l6eCL8vnhfB3cLpJ7g4xJovrh8osBQO6ff4uojcwJWNKfPY0/7B7e8P+0YZiXZylciuDog5Bh3LpdxLLzCUIs73k7+Xyy1GBxF3mWpk0BnejPS9/H4d0jQAS1JLbY8gML/jUuhYtwjQe1PhxhMThsB6Vv+eMhUNnChEP7Y62pda0mmNhpow1SUNaPNgct3YvI7nTyjRLMBi2tJEa8K2WoxrzdGl8MEYT7PBFhjyYMRfUUDW4dOQHp/HMobZ/b8ThQvrVfbDWGD3qFUpFvfDNJTgr91kdL2lgCRLntGdSFKB9Aml9vu7wUeB1F3lS0g8DqqILmHCmoO3Cd0FUsPEdNAkNoRFxVMtewE7cDlot14P8JWICTCJn8/NViKD/HRhg0JHmvHzcTQzshYyLZUVQCTEMIXxUQK2bebhX1EsBGzNLb8HLmjvntq7nHCMcJ8WMmnhmXOir6ixPL5TfmRh4dKlQ28GMoQ9zTwd5e5rN9nIDP3VyPFJZZ+53FmOUMwZ/5araNC6vrUqNCtDrgaNCm3z22oQZsYUqvr+luyi398VP2Q/2VEVrCcuE4RVybgnnd0OWMc3MfJa+YaM6whS4jX5VPm10Id6QmjNW5drBPJFK/SB2dhA0seX814VuNCyZ5zWBw9KVABOm0Na/NCfI1g/2HVS0Ybfs8wQiVe+9yU7EjzG9BZfa0gYOg4cepmqZo7DwjOtaukvYCwuKLSyY2NAsXoUNOLQzvkfqn76VT4IkofFgZIyX2OFQ+2XnG1KLAYvWCzFGGrWl2wjH1tTB5dfPZbycSl2/wPR6VztauZC6fn3zMZCO7mMbKrZigujS0agE0HaRmZ1Tx0FdnLAZ12ZTYBKSjatlUVq97GKfT4+4rwDTSpm0qtXpSmGQbTDlxHTTBsbTMuceZcX0rCn9GJFUnm3IaIDqHcaiEjliRWvUv00vzOY3xN1HsqTf0baYhLkCZg04aBZBZGURmkSWVicIofTYkCSO6ouwM48I2APDwSYc74Z93c0tGChvl1zEPBq+qzl8wuBLRxQT1j8heq9/oa99qie+CW9sMw+YvR5CshyyEUltRmvKNkDPc+YJT5bMDBZ8JnlIQvYM55ffkvIBclzMRNdS9PAXdQ3etbnQ/YtsYnA81vC7EUSE/avMcUVD694Cg7TfjGmGcr5NpM6NEFKlALKFqB0Yfpcd0bB+lkT/NtCbFY/+wdsWLuL5LErcQjvASroTHerAYl/Bfnj6RGxkHZZSUO2hl4KOjZ1570jx+vb+ppwIZi1ZV37NtO/ium6EZMcjv12M4v3JxppbVX24dKq6DY+QBDKxgfKXlmZbd993hhZgwHKUJAVjt8y9KJbIC4X2IAWgCRtGbZxrDUEQ6aE3lZ7GNXxAdRVbinVHeJjqXqC1Y/DQfHVNx9smc1W9x7iNtOCffT3YZpgqUU/HW71VOEb5COy2xoremX58T4Y4b7DySW/5CbFk9godrJlFaa3JWEY8u16KFmrn9aQ9k1DYCgt4X1a99lxrn2Neg5tlIcD9cSev6gv+/K/LiaihO/3yxdPZlgObDyHlch0gdTZV7XV4K3gORzfbpH2x1UxqeVVBsBKvobtkETctV0Lz+Xs7LbeW9Cs84R3l8pm9ESHnVgk8kTujBF6f2txJFLSBmx+4J1hHkfWyXDvm5KOYsbETvq3aPZGnCe70xpuDdm9sSpKyiT98Ad6Rt/NHhDTEmwG9Zdm9uv76iN8p5e0bYj58FsK62TPX1S2nY9dVI6iIzNwngeNcNzTa8ozi0u96FUHkHGIsJacEXE2QB6Dy4ZWA0lMT23llQhMJMNxyJQCL0yRAeD4+hJfCB2UDszTWKfJ+WVLLf8CBp4SqGuKkkdGpgJrQrAkzl+D9+11HXEZpg/B3GFHLO/rkH6Mv0/GkmyzVZJQZxu8ZnqHmy5FGhxAZ4nSRuzfoedjTC/Dx/BtbCOMpGESNmOZrLPfVw+eGx0BwA1U1QSwJDvSPbJO1RSnc1BDlxiCRQC0tr4PuYaoQASFeHF/0/uKfS0poWmjY+OUq71D/zEbBp1fwbrxI27j0VXIAJh5w06HEVY7Y/uP2hbtdshvw7IxLQYGdi7ouotxc3590+24m8vWL24+LoHuhrsG/NvQAgWvcS7WjWWID87ZKK60c86wRB9CY2dmXi79RcxXaEhtZDyacFOIsrkUtZbx+Tq9jcFLIHsdUExSw7kPyOhN5a0eW3CAMj4iZrNky8g90grLNA79KZfXLJofQUiGXK/JAFHNAcTXGVIuxK2yhOMCRdQaqGqb08coa8Nz5yOyWCD1bkffGWbW4IkH/2X+ZpDC16IHUGyr6Y3i+p80BL8X+ZZ5EpZo02ahPPsJqkStukn4Uems1rvaJYWpuCZ9/ukhwlP1F2nfiUTBLgseoZE4rTj3R3N8xjYDn0ANj7ZNGPDMz+HwFxVpD8jCjfFjIxL5zRzlOh8iIeMjN1Sr26RikOmYMsiWjzr2dEXzSehp7yL90E7kB0Dc7ez9hQWfg8OBWK/8ZFTpahmgn7SxczhTa7bShb1GVEaQL2Axmb8/at1gUKx8vmxNzCR6+TKccal5SYuQ9GKpKPshQLpsGlGnXBiBqgG2rog0AJZaESsu4qyAqCmi0sCN9ariBRtanRPtMLTV4H6cIA/ZmsNzB4b/X+VA4/ZkZltQMTZXim0pJk6XFf/8kBsSrLShMCdkOA6wSZNahRYR7AVl++F/05GP9AW17RhV9xvSAKEC1Sb7j0dNqrejQ/FeLILoQkgqtublHY5piAAts0+EFMlDY+nFlY2bK+paxLJewH1Stnw3lJlAjZwU11oMQXVdOR7/C7+4NHYJwaby/h44EKuLOCvawNlOYqXhGXKeASrCCuzh8z4QBMfhBK2ZXuVfHlBqQq0iG7JSYVdUxcckroWvkQGRNMyFOLoB3jEq7ZHyEcZewgl7P2ogC408Sv9StxZ4yYmoxUeCtNt8/5TsadHoi6yPO5A/MuWrVeYctvsmEM+KUv7xYM2wm22KMDuR8tpcxU5/8LCl1zWF4YGdDEQ2XjeIxGu4dK+PQzB4OVmPX3ss+z3FpnMABlkZzvwB/iLM09WFPnH+Jh57TJywXivsW5JYXrn8CUAiLbh+5ka8NxLOcdNINqJZ4Qq8vgl1WXKtZqpbGfR3N5hzNUjaw4cWaUenhYWFGDIatkF96/J8wIx+fNzO7bsKoM8ikMdVnxcxTikqNPElz6lgRolgB7SBYPs0ibhXOKAyX146UkeNeB/XkaxFS6+BHNPBtsele99TKsBt46t0JqBc/8y2b7fnvWFEFEqVCk14RsNqJsMoiwVcCeQOzDLEUmbA8zAAXHPGHCSpcMEu1yj2jWOq5HV67qVBT+64pCJG8HLWgk63LfjnDpous7nBLd9oTufWYdg9wG6aOnmmrgqNvwhj0dvzLlkUaoOrgqHE9ad+0OsTC49GksvmPv+gXztrerwbbKFbkDsYD6TN588mt6x0ZZQGsr16Gzjf9nPMQ4lwOpYAs204JV/arqSVks4oBwbi6KgxcH+CDqYXD5cRfZMKnxCSmTiyNJ/ZKabD85vGU7SE84FU0Tby3i9mVRGryLIEzDuSoZJaM9EpynzxHCnGO7meMmYN9THtbyP4vCaMfhcQ2P7eJ/s9VKINudiUy5rLK2nWYfhaXv89RatJr+r/nTdfBJgxzwtfsjuhzDS4s+ySURJAabzBTOJEt8abWFGM51mj70ITTBhu15+PnftPln/VcJILiBex0r0w25qKH1vg0ErLPnHDpPaCpRYgdhyuaOhxZM1UJ13IbvKFUh0g1/yIZmlUmQ/POU6HbfAGHp8kVLCvWRppeKNCWCoafvHay65wUanR8KqqMmKvZSIQsNZUy2ZQMulxP0diNHFZBIMm+GcbZU53jOdzDBEyZMdDZqxd5Nfpl4HJkh051JLfYAO2rOqN8gcZWeBiygGlTLBRlJB8nMOchXdxK0VcPxJmuqNNlJ8wNzyh8nqI/m4m6HEFVw24sOWWFNQ1TErIxSXc0+3Q31oSNkNVXxn7kqHln0zOsBOVLxPWgTfZKDcVtrWdxlgf84zo4omvBXE9OVQ81iXQ8ryWNxmx+8iXkdDkmwUTzbvdXrhFvGxuVPza/ABR5AjbReNvIGHuahgF7SMm92/n97r4Rn65qcueq2KD6BgItzKv3mMAQDDPK8YfK0gE0vXqomVgzxupEonBT5DSGuvdVRMYpUNzmZvd0Nqovf151tkiJJzR6UxAhnhWKQhvLx7Z+AqVjqvzs0slY3iNoh3rySk/g9hFEKrxKgEOs6Bw7gCj6oScpxL4T5tcfHo9N4ilvjYJEaCFasbzsNYjxoEJM4D6cv53MqE/+06b79fA5YFz8gUdIqbDsTDQmVTpAdhxrQ5bzPXwWo6+Ej4Nc9rEcpxA5kGrmVeXW+sgF3e4vVtIHoHo6Vo74xgfL2b4/VtDZi5cZZceSKehXQfhugA5jodz3NEeWRlC4o3tbusAIzPbj3rPo4rrZbvndWeGeeTHO1ofUY185WLJi21m9TABrPL8j1UQKhsJrOOyhoRiBSUV2jXr9YJQXj6ca0BbPQoGHLsX1OIyZX5qiv+UTv9XY6tXO7ECspdWktNaEd6EcpCF2i4b3jXOGSfA78FELCSynECZSIEnhmA7eFdVHkx7hxy5BJgfCfNtczPgI+g0MSoue2OtBBy0ad0MoGTL5lANDBaER+5JqTiyiMORDOBzJRi8vufnGx76oZhYkqVzGe1I0MY4UEuugljkChRyL5MN0C2xA2OA7wLP1rQo1Sy8SHypuv9rTA6b0jD25Qv6Q1l4+1UD99HoTSTu4LfTCAEgPu3LtJwwv5TrqQGWBQfPBxzntgJcqmKAqQb3BfFwZbhlCwk3KhidVJk+nYZo2fOJu4KXUvlKg53zz8UcTLVmmvwlIqMuTrT5Ae1ETLarbZ1K7e6ecl2Gqxa63DAZMVF6RZrJ7/51Gsv1O8nn5gotPsFlnHNHuyTullOPL61ChazIHnIjG+nKdfAH10p3Zb1kEydiI8FT/cdoNFdMG9eR+mSyabOWX4NVcXjh/FozmA+khSP/Ep3t6sS5xiwjq4bWBTPa2p0niQARg+LAL9KexgUlfXkSyjQWaXSos9kkrLHtuKJkPSi48mf87edtUT7+/AdGLEMt5wJUhqkggUFxd/DGxBAlmjOXiF+Hu16/K0d0C/AW5OhKPTy9yybUsePs2/ImmkvutgtiJ4WLXzllnzjX0DmPry/omoRO3ZcBIkiHCxYsWUjL6c0+Wn0VD6MK/871oFe1y3a18IIu8WqYyx/1jZiIXIw5SxDsMcCpRIduQs9OOc8O6xVWwxOeZlvLypoytVDtwXsq1TG4T7OfqvqF/tB8odg1V4z8n/2RJF00A/fuwEGHFLQ5lZwEimi48TdGH18ZFjPnnviCyxyq4Fg4nEq17dO5mJGPQSoYBEpGmywQdIUvoKQC4eB81AU3HRAw5zbmftTVuv6ndATNVEXW0sAxdQ78LY35cVvVp5g9Ny0hgPy3Qy9G8bDPXtkpNt0mGMqE3qlpl1nk+TvvmcrICvsH8tIiO6G7wecB4gXozZLzShzngvlLp26/nGrCRSotVUoAB9qQsVVHHjHCwcELSdb+fh6Rp4bYGOtl9q0AT1h2G7ppiRr+ml43mr6bylykWjUxyNLT4yJ9ggtTUC7lfr63EiPdpfsOZMnFSFWiHgn7G8MApqpahaDHD0G8rov7djyISioAKkmJUXKmvBbgDrueOR48Do3I4lamItWSLpSuew5KvXQOCH8BHzEx/W1p8NhTTRA0DYBIdCEqq7/MCuSFQcCl5gOHa3qHqJ7DUYefrKJm6w8as9jPj4WggLpzfLQMb2loUYMCkq5C6+VreYMG2xahgkP41kX+TbltFH0lrS52JNrNelsnoEYABL7YL5t5Kb3z34kf0y5Mfm/HNF3sO8t/BtBN0/vKk2ZQMqKcbmAd/XcEHqt4uIjMrfV1d3Yx5rUeVaXiQM/gRcVankgX3S7erZZoDVE4ePUgee97O+AmGrOV6SftaH32Jjq+07ul5kUojOPUzqjccR3oIYXCIluOYzfKuV+uIPkTgvW39t2uJJ4i1SxbKdEdu5aqLHUd3DXOLaUte4OJJt2K70NpphzrTgcW9ORpBKeC33H4nvOwzttuFqx5F8hTuCN4E9WWM+kvkFmKugPIYqPS8dCiqGPp8Xy5Em6Am89mt+xK8gHThr6ZHN3owshmCfC2nHMBmPjxq2qvppjy9v32KrcpC1v/ODlrVWY1GX2onJIwWjPecntCyS+ck/czBIWk0pZuvpwaQK8wM2/0GOztGtyMwQPhQgJ9ExBjrIutuysK7TLuVGZO3roUbjkOlhkzKGF2ps1MNMf4WUI1TarCbfd9ImR8URL32jhgF0tK5hmpsrlVYEiWJAL5r0wFhIGl0T5bducAVJpc2LRrPmT2LdslNF9QFD1+TOlEAP2Oh8d2q5J4VgrOJtXDCSRrNGoJeDB6oUGwUaDhyZ+NK/Y5jcrLWpNMQlmNV06SKNrJ3mvZBMf/tdz/nD/XdJn6t9eklWqi0hvInKMAIwHXp6pzAr03rPh4ylxHMS+PNI5cqAQQJjoA/wIXpKnLjBYhtbiZNq4TpjtbCi+AaV6aTtuMzJr7x7H90WjF0GSrrOLv0R1cPQ5bX/rFtPm/mtmIWB+S7KFOBx9H7zxAphryl+qbPbGcTgGuYJdWVtok87fvvcuhWmjnmlm5KRUiyrsTfHLIbccJ2hX5whD36zlDbxpIfh1hA4j4I9U94u/fTCtnEyit0kDQaN73BneLVqTdsnW0j2PkQNYbh8R5vBlkPsv/6wqERzirwVxgPwNh59HHQMW38xs1NAtSNMnryE4ShYbJK68Q9no72jSW7DWDk6ppzphToXDQlx6whAf/TjBOkPuWGDLkO0TUUqL6GRiHLae4cdB04tqZT4kWVbo45VWQnfAlNefZAhDe8SQ5RNfyfMwpkkIVcuSDbZhoWNMT260tw1rLgBFMonZcY8CWxIHorKeXlUQgRDQTtgB1ez7dBoLOp602zKTbTS+piSNX9RAvU+GJZUnEzAZhLUAFYZ4ePD4Goqc701LIrcdLILPlRDaqjFxu4r/jAWgfhOkCPNA7RwG6ywc69XWkTPHOHqMOZX+AZN7ib7hgE4TUBA3t2/QWoTQBLYbVcwnAMbL0bJcURUIYE9Rc+R+x0zHtvNKnfrzlKmplqP5P9hvIMCkbEpXjd3cwElA9yuMbOddUm7G6x4uF5eO3zIwc74ZtAwKTFUBqpjS8/jhS4ulRN1VHOT1oaLYvMuFZ3WL7bKdf45k1Il8vn9olpj7bT1gL2LMXnWo6NQv9T7Lryrr/k/32hwTbjEpiDJriBMWNFoetnFINT6U8LQCzEfyIrxahKUnh69Tad92sNO9IIDAC6c9hxpA+7rvBUQJQxQEyKq8zQQiLPQAUKKfZVAAH8/Bk/AEQ4q+qVVO3Y0eeSOaT072owl6TT7GVNRFUK7CrmFw7KizavgcdRzaicMSysyH3NQQQUmqNHylMJXsvoDlH2UBXyCO1PtuOfct7EsUnPjGVKbdQOfI9nM5/virdRmJxYiMDkOTCYcpxubtw/65CIX0rqgT9nXz7m6NLt0nE8DZM9DLr+mU1JfazviGQsrtB8cIkUVCU1tsrQWU8hdj39oKiiB6WLnVYNe+PgAOZmklnJKSqg8GeIr0vqHbWNJj6+GRTa9cixLSTikVge9GnNjGseSxAwrqlvU+nPRDK+SEeW1ewBW75UFhGl5wQa3PWXZ9I2Ig89NbZP1h447Y+jWkU6ruoI3R/NGBuoV/cUI2tKLx/eoOKbsBl4LlfvnD1/3d7xJOVV0Yfkf1eZSusWXCcRhQxfxR65kKiPdk2C++nxqZepTKTnvEddZmn1TFr1+rtuCxcZ1gm6G5LU+Hb9w6I28ZzxdzcAM0zEEEdhTKePIKv59aaf3s1D1HJy/o+VeyggDzGZ4LlI2b6qKt20HxOBWgMK2EZUdPXXZWajw4dfT2HOE1fO6NoQgaJ2tSAPkHN33ttWhs1V725roUVO/POF+/kTLiGiv8O9lT5P7B8q1jCkk9+MycfmAs0BAS97Wp/eUdixSO+lAc9mqR7+e8alDULARB8QpOvKiU4fPPEzCfrVGjv8Ojy8Y/8i5/l229g1AO8HJIHp4Kb6XbaeixiJ/F7auvTYBF/q7NO9ofk1PUy/vnizuDj5hulLGin8b56Jkz4pJtFzyymSEnUvh8N7tvtt8okcSUYzQ/xiy1WDKZqh2CCxO86NrJAFe3jtKkwWgAisjqGW1zDVPBdbC4h04I8Li/FnPqJUwPHbfFcyP//s1KZcEoH09eQJgOpD4byagqSUczju2xt8lWsKzi4SWzaitB5jp5SUNnxAYVSTsMMQJ0aniGcFqAPOALQyzQn2IqmF2/cJhWRXQ5pckuxpnfCOBRo+I78pGljhY9zwZO+6EXlqV2jtYnW9b1b1/I3kz3ar6/3bNnVTuS1KD9eDeQzqHHF+osO2tEip8hlRYAxELfIU4I1Qka9neBdEWCMjLR4GDDrT6XgU9xGCsbZy11PYLhRzBfX4it4T69loA+obBFkCupwtozwc02CBB1rosj+XuizIHgkbxJAZttZruwD8j/LVjqtbH0q6Jvx8Bta5u56gr0/uTPylAi3ZBab1CrMltnFRfsyRLcAxd6vQMgU4XuaDS81S35JNHUrgYSFlBLUPcIx2O5qjpLA96zyp6EgRv/g71SLgEwzKc4rqEZ3MlEqhXo7Dnuo/VCJ/lht5MvMU2s8b7n177RHJnK3oA6iZp5B1u5JaH2DhQfcwYaxEzoDO4COZb3YC2NGc9xXyA8uDci18ucdo48fVFl3qlzxkMkF3UIXpxFmAU1A1ssFFzVdriE4EL95KLR3B1DSsqrAOv3JhjIAjJ/bWM/nBuvKKLmVB21VreLWzrlXhkXFMc//J2En03QXPl7zdU7YOuUF9GFRX4RySiZjx+7rEp+MI4V76WjzoXBaSi0PJywkdLfHTWo3bgW2rStozB/LMjVb3Q4FGI50ula1Qs4RxmzP+cRYSJ8ApsP1Y51eoS8DI5vS750d96/3Wf/AhHUrG4+dN81dvsLR2a/llytnlnGe6mCkLn+mkgty3BXvvKyXcMwc0SUq36VieJYHn5zCCP7vIKrMeRacW0+XQLCduGGXmqNAwTzv10VQyOyEZxwnHtZQtsYUEA0FKn4RfzEflV1YJjZ+TFjmN02VkXy8McsTk1CqC2Zuf/QK5/GYXW22Us7Pkxg6u5HbRdF8fljWGTzAED6OkKhjPiKI0Pp0gXC5AHD2BQ8pe8XxUs8pFOyY4RDaHIfySZt3vu/yKp6cnOqSG+7yU3f3MvUtS87EWNcjQg6mJSLkR58MHkHYpIFpg/hZvIMKwH1G7XqRhfdtONuuweR3I0liSvpjT7h+trU+rOD8szVEyGkuC/uP+grRnF0QVO83SebmguQWL8UcOBduRIPclwoclbhm4aihM9PgKikyJQOYKMAkBRstycP3VFcKmgNkaZl6EJVkYIKq3SK3/vYn/i+1o72OOzN6ZUY40fgH6qu4ZHr1Gst2bP1kW0w3TqHola6z7zRizprGLD6IrXK/7Zt3bZ6ykH9EBUrLsiXjgjSTkR6NTYw3x3lVA8q9K2VItJiXh6YuWTDuCQWwafRcfqLcgoThK4JeeWmNgxnMuPvvnDsaxD3r6+q1qBfNer2m67utN12vZdLQDvTG+aEzXj4VfD27Ei/eujQZK1CXaOLm3FjZuwpN+/KlKHbj0q6Q1sX9ObbuEBtsVDQqQ5vZQFuCy4GNvVfsxuOMuerZT6xRaJ4Rg68oWdiukPGHEk+nMhENlw7Y3EXC7d01g0y3y/Y9J4/hivH1ekZgX+ALFVqAAn5WNAji3bAP8mwIDwcKhA1wpBgJWse4C3Pl+AplvHgC41BAD/iP0AcSZQQEVmiIBtBf9ACpChAPAv08CdpURA6MmdwK2DhIAAAAAAHB1YmtleSAhPSBOVUxMAGlucHV0ICE9IE5VTEwAb3V0cHV0bGVuICE9IE5VTEwAKm91dHB1dGxlbiA+PSAoKGZsYWdzICYgU0VDUDI1NksxX0ZMQUdTX0JJVF9DT01QUkVTU0lPTikgPyAzMyA6IDY1KQBvdXRwdXQgIT0gTlVMTAAoZmxhZ3MgJiBTRUNQMjU2SzFfRkxBR1NfVFlQRV9NQVNLKSA9PSBTRUNQMjU2SzFfRkxBR1NfVFlQRV9DT01QUkVTU0lPTgBzaWcgIT0gTlVMTABpbnB1dDY0ICE9IE5VTEwAb3V0cHV0NjQgIT0gTlVMTABzaWdpbiAhPSBOVUxMAHNpZ291dCAhPSBOVUxMAHNlY3AyNTZrMV9lY211bHRfY29udGV4dF9pc19idWlsdCgmY3R4LT5lY211bHRfY3R4KQBtc2czMiAhPSBOVUxMAHNlY3AyNTZrMV9lY211bHRfZ2VuX2NvbnRleHRfaXNfYnVpbHQoJmN0eC0+ZWNtdWx0X2dlbl9jdHgpAHNpZ25hdHVyZSAhPSBOVUxMAHNlY2tleSAhPSBOVUxMAHR3ZWFrICE9IE5VTEwAcmVjaWQgPj0gMCAmJiByZWNpZCA8PSAzAHJlY2lkICE9IE5VTEwAc2lnNjQgIT0gTlVMTAAhc2VjcDI1NmsxX2ZlX2lzX3plcm8oJmdlLT54KQABgABBuY0ECxBTY2hub3JyK1NIQTI1NiAg", La = (A, g, I) => ({
  contextCreate: (e) => A.exports._secp256k1_context_create(e),
  contextRandomize: (e, t) => A.exports._secp256k1_context_randomize(e, t),
  free: (e) => A.exports._free(e),
  heapU32: I,
  heapU8: g,
  instance: A,
  malloc: (e) => A.exports._malloc(e),
  mallocSizeT: (e) => {
    const t = A.exports._malloc(4), i = t >> 2;
    return I.set([e], i), t;
  },
  mallocUint8Array: (e) => {
    const t = A.exports._malloc(e.length);
    return g.set(e, t), t;
  },
  privkeyTweakAdd: (e, t, i) => A.exports._secp256k1_ec_privkey_tweak_add(e, t, i),
  privkeyTweakMul: (e, t, i) => A.exports._secp256k1_ec_privkey_tweak_mul(e, t, i),
  pubkeyCreate: (e, t, i) => A.exports._secp256k1_ec_pubkey_create(e, t, i),
  pubkeyParse: (e, t, i, n) => A.exports._secp256k1_ec_pubkey_parse(e, t, i, n),
  pubkeySerialize: (e, t, i, n, o) => A.exports._secp256k1_ec_pubkey_serialize(e, t, i, n, o),
  pubkeyTweakAdd: (e, t, i) => A.exports._secp256k1_ec_pubkey_tweak_add(e, t, i),
  pubkeyTweakMul: (e, t, i) => A.exports._secp256k1_ec_pubkey_tweak_mul(e, t, i),
  readHeapU8: (e, t) => new Uint8Array(g.buffer, e, t),
  readSizeT: (e) => {
    const t = e >> 2;
    return I[t];
  },
  recover: (e, t, i, n) => A.exports._secp256k1_ecdsa_recover(e, t, i, n),
  recoverableSignatureParse: (e, t, i, n) => A.exports._secp256k1_ecdsa_recoverable_signature_parse_compact(e, t, i, n),
  recoverableSignatureSerialize: (e, t, i, n) => A.exports._secp256k1_ecdsa_recoverable_signature_serialize_compact(e, t, i, n),
  schnorrSign: (e, t, i, n) => A.exports._secp256k1_schnorr_sign(e, t, i, n),
  schnorrVerify: (e, t, i, n) => A.exports._secp256k1_schnorr_verify(e, t, i, n),
  seckeyVerify: (e, t) => A.exports._secp256k1_ec_seckey_verify(e, t),
  sign: (e, t, i, n) => A.exports._secp256k1_ecdsa_sign(e, t, i, n),
  signRecoverable: (e, t, i, n) => A.exports._secp256k1_ecdsa_sign_recoverable(e, t, i, n),
  signatureMalleate: (e, t, i) => A.exports._secp256k1_ecdsa_signature_malleate(e, t, i),
  signatureNormalize: (e, t, i) => A.exports._secp256k1_ecdsa_signature_normalize(e, t, i),
  signatureParseCompact: (e, t, i) => A.exports._secp256k1_ecdsa_signature_parse_compact(e, t, i),
  signatureParseDER: (e, t, i, n) => A.exports._secp256k1_ecdsa_signature_parse_der(e, t, i, n),
  signatureSerializeCompact: (e, t, i) => A.exports._secp256k1_ecdsa_signature_serialize_compact(e, t, i),
  signatureSerializeDER: (e, t, i, n) => A.exports._secp256k1_ecdsa_signature_serialize_der(e, t, i, n),
  verify: (e, t, i, n) => A.exports._secp256k1_ecdsa_verify(e, t, i, n)
}), Oa = (A) => {
  const e = new Int16Array(A), t = new Int32Array(A), i = new Uint8Array(A);
  return t[0] = 1668509029, e[1] = 25459, !(i[2] !== 115 || i[3] !== 99);
}, gn = (A, g) => Math.ceil(g / A) * A, va = async (A) => {
  const n = new WebAssembly.Memory({
    initial: 256,
    maximum: 256
  });
  if (!Oa(n.buffer))
    throw new Error("Runtime error: expected the system to be little-endian.");
  const o = 1024, B = o + 67696 + 16, C = B, E = B + 4 + 15 & -16, Q = gn(16, E), s = Q + 5242880, d = gn(16, s), h = new Uint8Array(n.buffer), u = new Int32Array(n.buffer), y = new Uint32Array(n.buffer);
  u[C >> 2] = d;
  const l = 6, D = 6;
  let G;
  const R = {
    env: {
      ...{
        DYNAMICTOP_PTR: C,
        STACKTOP: Q,
        /* c8 ignore start */
        ___setErrNo: (H) => (G !== void 0 && (u[G() >> 2] = H), H),
        _abort: (H = "Secp256k1 Error") => {
          throw new Error(H);
        },
        // eslint-disable-next-line camelcase
        _emscripten_memcpy_big: (H, w, K) => (h.set(h.subarray(w, w + K), H), H),
        abort: (H = "Secp256k1 Error") => {
          throw new Error(H);
        },
        abortOnCannotGrowMemory: () => {
          throw new Error("Secp256k1 Error: abortOnCannotGrowMemory was called.");
        },
        enlargeMemory: () => {
          throw new Error("Secp256k1 Error: enlargeMemory was called.");
        },
        getTotalMemory: () => 16777216
        /* c8 ignore stop */
      },
      memory: n,
      memoryBase: o,
      table: new WebAssembly.Table({
        element: "anyfunc",
        initial: l,
        maximum: D
      }),
      tableBase: 0
    },
    global: { Infinity: 1 / 0, NaN: NaN }
  };
  return WebAssembly.instantiate(A, R).then((H) => (G = H.instance.exports.___errno_location, La(H.instance, h, y)));
}, Va = () => lI(Ta).buffer, Za = async () => va(Va()), za = "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cjYCBEG8FCAANgIAQbQUIAI2AgAgACACaiACNgIADAQLIAMQJQwBC0GkEUGkESgCAEF+IAFBA3Z3cTYCAAsgBCACaiECIAMgBGohAwsgAyADKAIEQX5xNgIEIAAgAkEBcjYCBCAAIAJqIAI2AgACfwJAIAJB/wFNBEAgAkEDdiIBQQN0QawRaiECQaQRKAIAIgNBASABQR9xdCIBcUUNASACQQhqIQMgAigCCAwCCyAAIAIQJgwCC0GkESADIAFyNgIAIAJBCGohAyACCyEBIAMgADYCACABIAA2AgwgACACNgIMIAAgATYCCAsgBUEIag8LQbgUIAAgAmsiATYCAEHAFEHAFCgCACIAIAJqIgM2AgAgAyABQQFyNgIEIAAgAkEDcjYCBCAAQQhqC6UBAQJ/QQIhBQJAAkACQAJAAkAgACgCBCIGIAFrIAJPDQAgASACaiICIAFJIQECQCAEBEBBACEFIAENAiAGQQF0IgEgAiACIAFJGyECDAELQQAhBSABDQELIAJBAEgNACAGRQ0BIAAoAgAgAhATIgFFDQIMAwsgBQ8LIAIQBCIBDQELIAMNAQsgAQRAIAAgATYCACAAQQRqIAI2AgBBAg8LQQEPCwALCABB5BUQBwALZgIBfwN+IwBBMGsiASQAIAApAhAhAiAAKQIIIQMgACkCACEEIAFBFGpBADYCACABIAQ3AxggAUIBNwIEIAFBrA42AhAgASABQRhqNgIAIAEgAzcDICABIAI3AyggASABQSBqECIAC7gBAQF/IwBB4AFrIgMkACADQThqQcwIKAIANgIAIANBMGpBxAgpAgA3AwAgA0IANwMgIANBvAgpAgA3AyggA0E8akEAQcQAEC4aIANBIGogASACEAkgA0GAAWogA0EgakHgABAsGiADQQhqIANBgAFqEAogA0EgaiADQQhqQRQQAyADQYgBaiADQShqKAIANgIAIAMgAykDIDcDgAEgAyADQYABahALIAAgAykDADcCACADQeABaiQAC5cDAQR/IwBBQGoiAyQAIAAgACkDACACrXw3AwAgAyAAQQhqNgIoIAMgA0EoajYCLAJAAkACQAJAAkACQCAAKAIcIgUEQEHAACAFayIEIAJNDQEgA0EYaiAFIAUgAmoiBCAAQSBqEBUgAygCHCACRw0FIAMoAhggASACECwaDAMLIAIhBAwB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QcgAaiICKQMANwMAIAEgASkDQDcDcCABIAw2AoQBIAEgFCAZQR53ajYCgAEgASAPNgKIASABIAY2AowBIAFB4ABqIAFB8ABqIAFBgAFqQQAQHiABKAJsIRYgASkCZCEfIAEoAiAhDSABKAIsIRAgASgCKCEKIAEoAiQhESABIAEoAmAiDjYCcCABIB83AnQgASAWNgJ8IAEgETYChAEgASAKNgKIASABIBA2AowBIAEgDSABKAJAQR53ajYCgAEgAUHgAGogAUHwAGogAUGAAWpBABAeIAIgAUHoAGoiFikDADcDACABIAEpA2A3A0AgASgCPCEHIAEoAjghCCABKAIwIRIgASgCNCEJIBMgAikDADcDACABIAEpA0A3A3AgASAJNgKEASABIBIgDkEed2o2AoABIAEgCDYCiAEgASAHNgKMASABQeAAaiABQfAAaiABQYABakEAEB4gASgCbCEOIAEpAmQhHyABKAJgIRcgASARIAQgC3NzNgKEASABIA0gBSADc3M2AoABIAEgCiAUIAVzczYCiAEgASAQIAwgBHNzNgKMASABQdAAaiABQYABaiAJIAggBxAfIAEgFzYCcCABIB83AnQgASAONgJ8IAEgASgCVCIDNgKEASABIAEoAlgiCzYCiAEgASABKAJcIg42AowBIAEgASgCQEEedyABKAJQIhVqNgKAASABQeAAaiABQfAAaiABQYABakEAEB4gAiAWKQMANwMAIAEgASkDYDcDQCABIAkgBiAMc3M2AoQBIAEgEiAPIBRzczYCgAEgASAIIA0gD3NzNgKIASABIAcgESAGc3M2AowBIAFB8ABqIAFBgAFqIAMgCyAOEB8gASgCfCEEIAEoAnghBSABKAJwIQ8gASgCdCEGIBMgAikDADcDACABIAEpA0A3A3AgASAGNgKEASABIA8gF0Eed2o2AoABIAEgBTYCiAEgASAENgKMASABQeAAaiABQfAAaiABQYABakEBEB4gASgCbCEMIAEpAmQhHyABKAJgIRcgASADIBAgEXNzNgKEASABIBUgCiANc3M2AoABIAEgCyASIApzczYCiAEgASAOIAkgEHNzNgKMASABQfAAaiABQYABaiAGIAUgBBAfIAEoAnAhFCABKAJ8IQ0gASgCeCEQIAEoAnQhCiABIBc2AnAgASAfNwJ0IAEgDDYCfCABIAo2AoQBIAEgEDYCiAEgASANNgKMASABIBQgASgCQEEed2o2AoABIAFB4ABqIAFB8ABqIAFBgAFqQQEQHiACIBYpAwA3AwAgASABKQNgNwNAIAEgBiAHIAlzczYChAEgASAPIAggEnNzNgKAASABIAUgFSAIc3M2AogBIAEgBCADIAdzczYCjAEgAUHwAGogAUGAAWogCiAQIA0QHyABKAJ8IQcgASgCeCEIIAEoAnAhDCABKAJ0IQkgEyACKQMANwMAIAEgASkDQDcDcCABIAk2AoQBIAEgDCAXQR53ajYCgAEgASAINgKIASABIAc2AowBIAFB4ABqIAFB8ABqIAFBgAFqQQEQHiABKAJsIRcgASkCZCEfIAEoAmAhGCABIAogDiADc3M2AoQBIAEgFCALIBVzczYCgAEgASAQIA8gC3NzNgKIASABIA0gBiAOc3M2AowBIAFB8ABqIAFBgAFqIAkgCCAHEB8gASgCcCELIAEoAnwhESABKAJ4IRIgASgCdCEDIAEgGDYCcCABIB83AnQgASAXNgJ8IAEgAzYChAEgASASNgKIASABIBE2AowBIAEgCyABKAJAQR53ajYCgAEgAUHgAGogAUHwAGogAUGAAWpBARAeIAIgFikDADcDACABIAEpA2A3A0AgASAJIAQgBnNzNgKEASABIAwgBSAPc3M2AoABIAEgCCAUIAVzczYCiAEgASAHIAogBHNzNgKMASABQdAAaiABQYABaiADIBIgERAfIBMgAikDADcDACABIAEpA0A3A3AgASABKAJUIg42AoQBIAEgASgCWCIPNgKIASABIAEoAlwiFTYCjAEgASABKAJQIhcgGEEed2o2AoABIAFB4ABqIAFB8ABqIAFBgAFqQQEQHiABKAJsIRogASkCZCEfIAEoAmAhGCABIAMgDSAKc3M2AoQBIAEgCyAQIBRzczYCgAEgASASIAwgEHNzNgKIASABIBEgCSANc3M2AowBIAFB8ABqIAFBgAFqIA4gDyAVEB8gASgCcCEUIAEoAnwhBCABKAJ4IQUgASgCdCEGIAEgGDYCcCABIB83AnQgASAaNgJ8IAEgBjYChAEgASAFNgKIASABIAQ2AowBIAEgFCABKAJAQR53ajYCgAEgAUHgAGogAUHwAGogAUGAAWpBAhAeIAIgFikDADcDACABIAEpA2A3A0AgASAOIAcgCXNzNgKEASABIBcgCCAMc3M2AoABIAEgDyALIAhzczYCiAEgASAVIAMgB3NzNgKMASABQfAAaiABQYABaiAGIAUgBBAfIAEoAnwhByABKAJ4IQggASgCcCEMIAEoAnQhCSATIAIpAwA3AwAgASABKQNANwNwIAEgCTYChAEgASAMIBhBHndqNgKAASABIAg2AogBIAEgBzYCjAEgAUHgAGogAUHwAGogAUGAAWpBAhAeIAEoAmwhGiABKQJkIR8gASgCYCEYIAEgBiARIANzczYChAEgASAUIBIgC3NzNgKAASABIAUgFyASc3M2AogBIAEgBCAOIBFzczYCjAEgAUHwAGogAUGAAWogCSAIIAcQHyABKAJwIQsgASgCfCENIAEoAnghECABKAJ0IQogASAYNgJwIAEgHzcCdCABIBo2AnwgASAKNgKEASABIBA2AogBIAEgDTYCjAEgASALIAEoAkBBHndqNgKAASABQeAAaiABQfAAaiABQYABakECEB4gAiAWKQMANwMAIAEgASkDYDcDQCABIAkgFSAOc3M2AoQBIAEgDCAPIBdzczYCgAEgASAIIBQgD3NzNgKIASABIAcgBiAVc3M2AowBIAFB8ABqIAFBgAFqIAogECANEB8gASgCfCERIAEoAnghEiABKAJwIQ4gASgCdCEDIBMgAikDADcDACABIAEpA0A3A3AgASADNgKEASABIA4gGEEed2o2AoABIAEgEjYCiAEgASARNgKMASABQeAAaiABQfAAaiABQYABakECEB4gASgCbCEPIAEpAmQhHyABKAJgIRUgASAKIAQgBnNzNgKEASABIAsgBSAUc3M2AoABIAEgECAMIAVzczYCiAEgASANIAkgBHNzNgKMASABQdAAaiABQYABaiADIBIgERAfIAEgFTYCcCABIB83AnQgASAPNgJ8IAEgASgCVCIENgKEASABIAEoAlgiBTYCiAEgASABKAJcIgY2AowBIAEgASgCQEEedyABKAJQIhRqNgKAASABQeAAaiABQfAAaiABQYABakECEB4gAiAWKQMANwMAIAEgASkDYDcDQCABIAMgByAJc3M2AoQBIAEgDiAIIAxzczYCgAEgASASIAsgCHNzNgKIASABIBEgCiAHc3M2AowBIAFB8ABqIAFBgAFqIAQgBSAGEB8gASgCfCEHIAEoAnghCCABKAJwIQ8gASgCdCEJIBMgAikDADcDACABIAEpA0A3A3AgASAJNgKEASABIA8gFUEed2o2AoABIAEgCDYCiAEgASAHNgKMASABQeAAaiABQfAAaiABQYABakEDEB4gASgCbCEVIAEpAmQhHyABKAJgIQwgASAEIA0gCnNzNgKEASABIBQgECALc3M2AoABIAEgBSAOIBBzczYCiAEgASAGIAMgDXNzNgKMASABQfAAaiABQYABaiAJIAggBxAfIAEoAnAhECABKAJ8IQogASgCeCELIAEoAnQhDSABIAw2AnAgASAfNwJ0IAEgFTYCfCABIA02AoQBIAEgCzYCiAEgASAKNgKMASABIBAgASgCQEEed2o2AoABIAFB4ABqIAFB8ABqIAFBgAFqQQMQHiACIBYpAwA3AwAgASABKQNgNwNAIAEgCSARIANzczYChAEgASAPIBIgDnNzNgKAASABIAggFCASc3M2AogBIAEgByAEIBFzczYCjAEgAUHwAGogAUGAAWogDSALIAoQHyABKAJ8IREgASgCeCESIAEoAnAhDiABKAJ0IQMgEyACKQMANwMAIAEgASkDQDcDcCABIAM2AoQBIAEgDiAMQR53ajYCgAEgASASNgKIASABIBE2AowBIAFB4ABqIAFB8ABqIAFBgAFqQQMQHiABKAJsIRUgASkCZCEfIAEoAmAhDCABIA0gBiAEc3M2AoQBIAEgECAFIBRzczYCgAEgASALIA8gBXNzNgKIASABIAogCSAGc3M2AowBIAFB8ABqIAFBgAFqIAMgEiAREB8gASgCcCEKIAEoAnwhBCABKAJ4IQUgASgCdCEGIAEgDDYCcCABIB83AnQgASAVNgJ8IAEgBjYChAEgASAFNgKIASABIAQ2AowBIAEgCiABKAJAQR53ajYCgAEgAUHgAGogAUHwAGogAUGAAWpBAxAeIAIgFikDADcDACABIAEpA2A3A0AgASADIAcgCXNzNgKEASABIA4gCCAPc3M2AoABIAEgEiAQIAhzczYCiAEgASARIA0gB3NzNgKMASABQdAAaiABQYABaiAGIAUgBBAfIBMgAikDADcDACABIAEpA0A3A3AgASABKQJUNwKEASABIAEoAlw2AowBIAEgASgCUCAMQR53ajYCgAEgAUHgAGogAUHwAGogAUGAAWpBAxAe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DSAKIABBDHZBD3FB4AFyOgAMQQMMAQsgCiAAQRJ2QfABcjoADCAKIABBP3FBgAFyOgAPIAogAEEMdkE/cUGAAXI6AA0gCiAAQQZ2QT9xQYABcjoADkEECyEIIAEoAhghAkF/IQAgAUEcaigCACIJQQxqIQECQAJAAkADQCAAQQFqIgAgBE8NASACIApBDGogCCABKAIAEQUARQ0ACwwBCyACIAcgBiAJQQxqKAIAIgERBQANAEF/IQADQCAAQQFqIgAgA08NAiACIApBDGogCCABEQUARQ0ACwtBAQwBC0EACyEAIApBEGokACAAC0YCAX8BfiMAQSBrIgIkACABKQIAIQMgAkEUaiABKQIINwIAIAJBlBY2AgQgAkGsDjYCACACIAA2AgggAiADNwIMIAIQJAALUAACQAJAQZARKAIAQQFGBEBBlBFBlBEoAgBBAWoiADYCACAAQQNJDQEMAgtBkBFCgYCAgBA3AwALQZwRKAIAIgBBf0wNAEGcESAANgIACwALPwECfyMAQRBrIgEkAAJ/IAAoAggiAiACDQAaQfwVEAcACxogASAAKQIMNwMAIAEgAEEUaikCADcDCCABECMAC7MCAQV/IAAoAhghAwJAAkACQCAAKAIMIgIgAEcEQCAAKAIIIgEgAjYCDCACIAE2AgggAw0BDAILIABBFGoiASAAQRBqIAEoAgAbIgQoAgAiAQRAAkADQCAEIQUgASICQRRqIgQoAgAiAQRAIAENAQwCCyACQRBqIQQgAigCECIBDQALCyAFQQA2AgAgAw0BDAILQQAhAiADRQ0BCwJAIAAoAhwiBEECdEG0E2oiASgCACAARwRAIANBEGogA0EUaiADKAIQIABGGyACNgIAIAINAQwCCyABIAI2AgAgAkUNAgsgAiADNgIYIAAoAhAiAQRAIAIgATYCECABIAI2AhgLIABBFGooAgAiAUUNACACQRRqIAE2AgAgASACNgIYCw8LQagRQagRKAIAQX4gBHdxNgIAC8UCAQR/IAACf0EAIAFBCHYiA0UNABpBHyICIAFB////B0sNABogAUEmIANnIgJrQR9xdkEBcUEfIAJrQQF0cgsiAjYCHCAAQgA3AhAgAkECdEG0E2ohAwJAAkACQEGoESgCACIEQQEgAkEfcXQiBXEEQCADKAIAIgQoAgRBeHEgAUcNASAEIQIM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LTFlY2M2Mjk5ZGI5ZWM4MjMvYmxvY2stYnVmZmVyLTAuMy4zL3NyYy9saWIucnNkZXN0aW5hdGlvbiBhbmQgc291cmNlIHNsaWNlcyBoYXZlIGRpZmZlcmVudCBsZW5ndGhzL3Jvb3QvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvc2hhLTEtMC43LjAvc3JjL3V0aWxzLnJzaW50ZXJuYWwgZXJyb3I6IGVudGVyZWQgdW5yZWFjaGFibGUgY29kZTogdW5rbm93biBpY29zYXJvdW5kIGluZGV4AEHwCwvSBAEAAAAAAAAAIAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAGNhcGFjaXR5IG92ZXJmbG93Y2FsbGVkIGBPcHRpb246OnVud3JhcCgpYCBvbiBhIGBOb25lYCB2YWx1ZWxpYmNvcmUvb3B0aW9uLnJzMDAwMTAyMDMwNDA1MDYwNzA4MDkxMDExMTIxMzE0MTUxNjE3MTgxOTIwMjEyMjIzMjQyNTI2MjcyODI5MzAzMTMyMzMzNDM1MzYzNzM4Mzk0MDQxNDI0MzQ0NDU0NjQ3NDg0OTUwNTE1MjUzNTQ1NTU2NTc1ODU5NjA2MTYyNjM2NDY1NjY2NzY4Njk3MDcxNzI3Mzc0NzU3Njc3Nzg3OTgwODE4MjgzODQ4NTg2ODc4ODg5OTA5MTkyOTM5NDk1OTY5Nzk4OTkAAAAAaW5kZXggb3V0IG9mIGJvdW5kczogdGhlIGxlbiBpcyAgYnV0IHRoZSBpbmRleCBpcyBsaWJjb3JlL3NsaWNlL21vZC5ycwABAAAAAAAAACAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAAABAAAAAQAAACAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAABpbmRleCAgb3V0IG9mIHJhbmdlIGZvciBzbGljZSBvZiBsZW5ndGggc2xpY2UgaW5kZXggc3RhcnRzIGF0ICBidXQgZW5kcyBhdCBpbnRlcm5hbCBlcnJvcjogZW50ZXJlZCB1bnJlYWNoYWJsZSBjb2RlbGliYWxsb2MvcmF3X3ZlYy5ycwBB7BQLnQIWBAAAJAAAAC8IAAATAAAASAIAAAkAAADQBAAAUwAAAEsAAAARAAAAUAQAACAAAABwBAAAWgAAAB8AAAAFAAAAIwUAADQAAABfBwAAFAAAAG0GAAAJAAAAzwUAABgAAAClBQAAKgAAAFcFAABOAAAAQgAAAA4AAAAUBgAAEQAAAC8IAAATAAAA8gIAAAUAAAAlBgAAKwAAAFAGAAARAAAAWQEAABUAAAADAAAAAAAAAAEAAAAEAAAALQcAACAAAABNBwAAEgAAALwHAAAGAAAAwgcAACIAAABfBwAAFAAAAK0HAAAFAAAA5AcAABYAAAD6BwAADQAAAF8HAAAUAAAAswcAAAUAAAAHCAAAKAAAAC8IAAATAAAA9QEAAB4ADAdsaW5raW5nAwKMDw==", Xa = "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IAJHDQUgAygCGCABIAIQKxoMAwsgAiEEDAELIANBMGogASACIAQQFiADQTxqKAIAIQQgAygCOCEBIAMoAjAhBSADKAI0IQIgA0EgaiAAQQxqIgYgACgCCBAXIAIgAygCJEcNBCADKAIgIAUgAhArGiAAQQhqQQA2AgAgA0EsaiAGEBgLIANBPGohAiADQThqIQUCQANAIARBP00NASADQTBqIAEgBEHAABAWIAIoAgAhBCAFKAIAIQEgA0EIakEAQcAAIAMoAjAgAygCNBAZIANBLGogAygCCBAYDAALAAsgA0EQaiAAQQxqIAQQGiADKAIUIARHDQEgAygCECABIAQQKxoLIABBCGogBDYCACADQUBrJAAPC0GEFBAHAAtBhBQQBwALQYQUEAcAC98EAgN/AX4jAEHQAGsiAiQAIAIgAUHMAGo2AiQgASkDACEFIAEoAgghBCACIAJBJGo2AigCQCAEQT9NBEAgAUEMaiIDIARqQYABOgAAIAEgASgCCEEBaiIENgIIIAJBGGogAyAEEBcgAigCGEEAIAIoAhwQLRpBwAAgASgCCGtBB00EQCACQShqIAMQGCACQRBqIAMgAUEIaigCABAaIAIoAhBBACACKAIUEC0aCyACQQhqIANBOBAXIAIoAgxBCEcNASACKAIIIAVCOIYgBUIohkKAgICAgIDA/wCDhCAFQhiGQoCAgICA4D+DIAVCCIZCgICAgPAfg4SEIAVCCIhCgICA+A+DIAVCGIhCgID8B4OEIAVCKIhCgP4DgyAFQjiIhISENwAAIAJBKGogAxAYIAFBCGpBADYCACACQQA2AiggAkEoakEEciEEQQAhAwJAA0AgA0EgRg0BIAQgA2pBADoAACACIAIoAihBAWo2AiggA0EBaiEDDAALAAsgAkFAayABQeQAaikAADcDACACQThqIAFB3ABqKQAANwMAIAJBMGogAUHUAGopAAA3AwAgAiABKQBMNwMoQQAhAwJAA0AgA0EgRg0BIAJBKGogA2oiBCAEKAIAIgRBGHQgBEEIdEGAgPwHcXIgBEEIdkGA/gNxIARBGHZycjYCACADQQRqIQMMAAsACyAAIAIpAyg3AAAgAEEYaiACQUBrKQMANwAAIABBEGogAkE4aikDADcAACAAQQhqIAJBMGopAwA3AAAgAkHQAGokAA8LQdwTIARBwAAQ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KAJsIQggASAPNgJkIAEgDjYCYCABIBM2AmggASAYNgJsIAEgAjYCdCABIBc2AnAgASAQNgJ4IAEgDDYCfCABQdAAaiABQeAAaiABQfAAaiAHQevZwaJ6aiAIQfr/+4V5ahAeIAEoAlwhByABKAJYIQggASgCUCEKIAEoAlQhESABIAI2AmQgASAXNgJgIAEgEDYCaCABIAw2AmwgASARNgJ0IAEgCjYCcCABIAg2AnggASAHNgJ8IAFB0ABqIAFB4ABqIAFB8ABqIA1B8vHFs3xqIBlB98fm93tqEB4gASgCXCENIAEoAlghGCABKAJQIRMgACAeIAEoAlRqNgIEIAAgEyAdajYCACAAIAogIWo2AgggACARICJqNgIMIAAgGCAcajYCECAAIA0gG2o2AhQgACAIICBqNgIYIAAgByAfajYCHCABQYABaiQAC30BAX8jAEEwayICJAAgAiABNgIEIAIgADYCACACQSxqQQE2AgAgAkEUakECNgIAIAJBHGpBAjYCACACQQE2AiQgAkGMFTYCCCACQQI2AgwgAkHMDTYCECACIAI2AiAgAiACQQRqNgIoIAIgAkEgajYCGCACQQhqQZwVECgAC3wBAX8jAEEwayIDJAAgAyACNgIEIAMgATYCACADQSxqQQE2AgAgA0EUakECNgIAIANBHGpBAjYCACADQQE2AiQgA0HcFDYCCCADQQI2AgwgA0HMDTYCECADIANBBGo2AiAgAyADNgIoIAMgA0EgajYCGCADQQhqIAAQKAAL1gEBBn8gACABKAIAIgggAigCBCIHcyACKAIAIgVxIAggB3FzIAVBHncgBUETd3MgBUEKd3NqIAIoAggiBkEadyAGQRV3cyAGQQd3cyAEaiABKAIMaiABKAIIIgQgAigCDCIJcyAGcSAEc2oiCmoiAjYCBCAAIAogASgCBGoiATYCDCAAIAJBHncgAkETd3MgAkEKd3MgAiAHIAVzcSAHIAVxc2ogBCADaiAJIAEgCSAGc3FzaiABQRp3IAFBFXdzIAFBB3dzaiIFajYCACAAIAUgCGo2AggLeAAgACACQRl3IAJBA3ZzIAJBDndzIAEoAgAiAmo2AgAgACACQRl3IAJBA3ZzIAJBDndzIAEoAgQiAmo2AgQgACACQRl3IAJBA3ZzIAJBDndzIAEoAggiAmo2AgggACACQRl3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", ja = "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AjYCACAAIAJBAXI2AgQMBQsgAEGsEygCACACaiICQQFyNgIEQbQTIAA2AgBBrBMgAjYCACAAIAJqIAI2AgAMBAsgAxAiDAELQZwQQZwQKAIAQX4gAUEDdndxNgIACyAEIAJqIQIgAyAEaiEDCyADIAMoAgRBfnE2AgQgACACQQFyNgIEIAAgAmogAjYCAAJ/AkAgAkH/AU0EQCACQQN2IgFBA3RBpBBqIQJBnBAoAgAiA0EBIAFBH3F0IgFxRQ0BIAJBCGohAyACKAIIDAILIAAgAhAjDAILQZwQIAMgAXI2AgAgAkEIaiEDIAILIQEgAyAANgIAIAEgADYCDCAAIAI2AgwgACABNgIICyAFQQhqDwtBsBMgACACayIBNgIAQbgTQbgTKAIAIgAgAmoiAzYCACADIAFBAXI2AgQgACACQQNyNgIEIABBCGoLpQEBAn9BAiEFAkACQAJAAkACQCAAKAIEIgYgAWsgAk8NACABIAJqIgIgAUkhAQJAIAQEQEEAIQUgAQ0CIAZBAXQiASACIAIgAUkbIQIMAQtBACEFIAENAQsgAkEASA0AIAZFDQEgACgCACACEBMiAUUNAgwDCyAFDwsgAhAEIgENAQsgAw0BCyABBEAgACABNgIAIABBBGogAjYCAEECDwtBAQ8LAAsIAEG8FBAHAAtmAgF/A34jAEEwayIBJAAgACkCECECIAApAgghAyAAKQIAIQQgAUEUakEANgIAIAEgBDcDGCABQgE3AgQgAUGkDTYCECABIAFBGGo2AgAgASADNwMgIAEgAjcDKCABIAFBIGoQJwALsgEBAn8jAEGABGsiAyQAIANB2ABqIgRCADcDACADQgA3A1AgA0GgAWpBAEGEARAsGiADQeAAakHICkHAABAqGiADQdAAaiABIAIQCSADQagCaiADQdAAakHYARAqGiADQRBqIANBqAJqEAogA0HQAGogA0EQakHAABADIANBsAJqIAQoAgA2AgAgAyADKQNQNwOoAiADQQhqIANBqAJqEAsgACADKQMINwIAIANBgARqJAALuwMCBH8CfiMAQUBqIgMkACAAIAApAwgiByACrUIDhnwiCDcDCCAIIAdUBEAgACAAKQMAQgF8NwMACyADIABBEGo2AiggAyADQShqNgIsAkACQAJAAkACQAJAIAAoAlAiBQRAQYABIAVrIgQg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sBMoAgAgAGoiADYCACABIABBAXI2AgQgAUG0EygCAEYEQEGsE0EANgIAQbQTQQA2AgALQdQTKAIAIABPDQcCQCAAQSlJDQBBxBMhAANAIAAoAgAiAiABTQRAIAIgACgCBGogAUsNAgsgACgCCCIADQALC0EAIQFBzBMoAgAiAEUNBANAIAFBAWohASAAKAIIIgANAAsgAUH/HyABQf8fSxsMBQtBtBMgATYCAEGsE0GsEygCACAAaiIANgIADAcLIAIQIgwBC0GcEEGcECgCAEF+IANBA3Z3cTYCAAsgASAAQQFyNgIEIAEgAGogADYCACABQbQTKAIARw0CQawTIAA2AgAPC0H/HwshAUHUE0F/NgIAQdwTIAE2AgAPC0HcEwJ/AkACfwJAIABB/wFNBEAgAEEDdiICQQN0QaQQaiEAQZwQKAIAIgNBASACQR9xdCICcUUNASAAQQhqIQMgACgCCAwCCyABIAAQI0HcE0HcEygCAEF/aiIBNgIAIAENBEHMEygCACIARQ0CQQAhAQNAIAFBAWohASAAKAIIIgANAAsgAUH/HyABQf8fSxsMAwtBnBAgAyACcjYCACAAQQhqIQMgAAshAiADIAE2AgAgAiABNgIMIAEgADYCDCABIAI2AggPC0H/HwsiATYCAAsPCyABIABBAXI2AgQgASAAaiAANgIACzkAAkAgAiABTwRAIAJBgQFPDQEgACACIAFrNgIEIAAgAyABajYCAA8LIAEgAhAcAAsgAkGAARACAAtNAgF/An4jAEEQayIEJAAgBEEIakEAIAMgASACEBkgBCkDCCEFIAQgAyACIAEgAhAZIAQpAwAhBiAAIAU3AgAgACAGNwIIIARBEGokAAssAQF/IwBBEGsiAyQAIANBCGogAkGAASABEBUgACADKQMINwIAIANBEGokAAsOACAAKAIAKAIAIAEQGws3AAJAIAIgAU8EQCAEIAJJDQEgACACIAFrNgIEIAAgAyABajYCAA8LIAEgAhAcAAsgAiAEEAIACysBAX8jAEEQayIDJAAgA0EIakEAIAIgARAVIAAgAykDCDcCACADQRBqJAALqioCAn8ifiMAQYAPayICJAAgAkGADmogAUGAARAqGkEAIQECQANAIAFBgAFGDQEgAkGADmogAWoiAyADKQMAIhxCOIYgHEIohkKAgICAgIDA/wCD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c2VydGlvbiBmYWlsZWQ6IDggPT0gZHN0LmxlbigpL3Jvb3QvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9naXRodWIuY29tLTFlY2M2Mjk5ZGI5ZWM4MjMvYnl0ZS10b29scy0wLjIuMC9zcmMvd3JpdGVfc2luZ2xlLnJzAEHwCQvKBS9yb290Ly5jYXJnby9yZWdpc3RyeS9zcmMvZ2l0aHViLmNvbS0xZWNjNjI5OWRiOWVjODIzL2Jsb2NrLWJ1ZmZlci0wLjMuMy9zcmMvbGliLnJzAAAAAAAIybzzZ+YJajunyoSFrme7K/iU/nLzbjzxNh1fOvVPpdGC5q1/Ug5RH2w+K4xoBZtrvUH7q9mDH3khfhMZzeBbAAAAAABjYXBhY2l0eSBvdmVyZmxvd2NhbGxlZCBgT3B0aW9uOjp1bndyYXAoKWAgb24gYSBgTm9uZWAgdmFsdWVsaWJjb3JlL29wdGlvbi5yczAwMDEwMjAzMDQwNTA2MDcwODA5MTAxMTEyMTMxNDE1MTYxNzE4MTkyMDIxMjIyMzI0MjUyNjI3MjgyOTMwMzEzMjMzMzQzNTM2MzczODM5NDA0MTQyNDM0NDQ1NDY0NzQ4NDk1MDUxNTI1MzU0NTU1NjU3NTg1OTYwNjE2MjYzNjQ2NTY2Njc2ODY5NzA3MTcyNzM3NDc1NzY3Nzc4Nzk4MDgxODI4Mzg0ODU4Njg3ODg4OTkwOTE5MjkzOTQ5NTk2OTc5ODk5AAAAaW5kZXggb3V0IG9mIGJvdW5kczogdGhlIGxlbiBpcyAgYnV0IHRoZSBpbmRleCBpcyBsaWJjb3JlL3NsaWNlL21vZC5ycwABAAAAAAAAACAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAAABAAAAAQAAACAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAABpbmRleCAgb3V0IG9mIHJhbmdlIGZvciBzbGljZSBvZiBsZW5ndGggc2xpY2UgaW5kZXggc3RhcnRzIGF0ICBidXQgZW5kcyBhdCBpbnRlcm5hbCBlcnJvcjogZW50ZXJlZCB1bnJlYWNoYWJsZSBjb2RlbGliYWxsb2MvcmF3X3ZlYy5ycwBB5BML/QEWBAAAJAAAAKcHAAATAAAASAIAAAkAAAA6BAAANAAAANcGAAAUAAAAbQYAAAkAAADwBAAAUwAAAEsAAAARAAAAbgQAACAAAACOBAAAWgAAAB8AAAAFAAAAjQUAABEAAACnBwAAEwAAAPICAAAFAAAAngUAACsAAADJBQAAEQAAAFkBAAAVAAAAAgAAAAAAAAABAAAAAwAAAKUGAAAgAAAAxQYAABIAAAA0BwAABgAAADoHAAAiAAAA1wYAABQAAACtBwAABQAAAFwHAAAWAAAAcgcAAA0AAADXBgAAFAAAALMHAAAFAAAAfwcAACgAAACnBwAAEwAAAPUBAAAeAAwHbGlua2luZwMC5A0=", Wa = async (A) => {
  const g = await se(A, "./ripemd160", "ripemd160", "ripemd160_init", "ripemd160_update", "ripemd160_final");
  return {
    final: g.final,
    hash: g.hash,
    init: g.init,
    update: g.update
  };
}, _a = () => lI(Pa).buffer, $a = async () => Wa(_a());
var DA;
(function(A) {
  A.unparsableSignature = "Failed to parse signature.", A.unparsablePublicKey = "Failed to parse public key.", A.derivePublicKeyFromInvalidPrivateKey = "Cannot derive public key from invalid private key.", A.signWithInvalidPrivateKey = "Failed to sign message hash. The private key is not valid.", A.recoverPublicKeyWithUnparsableSignature = "Failed to recover public key. Could not parse signature.", A.recoverPublicKeyInvalidMaterial = "Failed to recover public key. The compact signature, recovery, or message hash is invalid.", A.addTweakPrivateKey = "Private key is invalid or adding failed.", A.mulTweakPrivateKey = "Private key is invalid or multiplying failed.", A.addTweakPublicKey = "Failed to tweak public key (by addition).", A.mulTweakPublicKey = "Failed to tweak public key (by multiplication).";
})(DA || (DA = {}));
const As = (A, g) => {
  const I = A.contextCreate(dt.BOTH), e = A.malloc(
    72
    /* ByteLength.maxECDSASig */
  ), t = A.malloc(
    65
    /* ByteLength.maxPublicKey */
  ), i = A.malloc(
    32
    /* ByteLength.messageHash */
  ), n = A.malloc(
    64
    /* ByteLength.internalPublicKey */
  ), o = A.malloc(
    64
    /* ByteLength.internalSig */
  ), B = A.malloc(
    64
    /* ByteLength.schnorrSig */
  ), C = A.malloc(
    32
    /* ByteLength.privateKey */
  ), r = A.malloc(
    65
    /* ByteLength.recoverableSig */
  ), E = A.malloc(4), Q = E >> 2, a = () => A.heapU32[Q], s = A.malloc(4), d = s >> 2, h = (L, v) => {
    const BA = new Uint8Array(v);
    return BA.set(L), BA;
  }, u = (L) => {
    const v = h(
      L,
      65
      /* ByteLength.maxPublicKey */
    );
    return A.heapU8.set(v, t), A.pubkeyParse(
      I,
      n,
      t,
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      L.length
    ) === 1;
  }, y = (L) => {
    A.heapU32.set([L], d);
  }, l = () => A.heapU32[d], D = (L, v) => (y(L), A.pubkeySerialize(I, t, s, n, v), A.readHeapU8(t, l()).slice()), G = (L) => L ? D(33, WI.COMPRESSED) : D(65, WI.UNCOMPRESSED), f = (L) => (v) => u(v) ? G(L) : DA.unparsablePublicKey, R = (L, v) => {
    const BA = h(
      L,
      72
      /* ByteLength.maxECDSASig */
    );
    return A.heapU8.set(BA, e), v ? A.signatureParseDER(I, o, e, L.length) === 1 : A.signatureParseCompact(I, o, e) === 1;
  }, H = () => (A.signatureSerializeCompact(I, e, o), A.readHeapU8(
    e,
    64
    /* ByteLength.compactSig */
  ).slice()), w = () => (y(
    72
    /* ByteLength.maxECDSASig */
  ), A.signatureSerializeDER(I, e, s, o), A.readHeapU8(e, l()).slice()), K = (L) => (v) => R(v, L) ? L ? H() : w() : DA.unparsableSignature, M = (L) => {
    const v = h(
      L,
      32
      /* ByteLength.privateKey */
    );
    A.heapU8.set(v, C);
  }, U = (L, v) => {
    A.heapU8.fill(0, L, L + v);
  }, N = () => {
    U(
      C,
      32
      /* ByteLength.privateKey */
    );
  }, S = (L, v) => {
    M(L);
    const BA = v();
    return N(), BA;
  }, m = (L) => (v) => S(v, () => A.pubkeyCreate(I, n, C) !== 1) ? DA.derivePublicKeyFromInvalidPrivateKey : G(L), p = (L) => {
    const v = h(
      L,
      32
      /* ByteLength.messageHash */
    );
    A.heapU8.set(v, i);
  }, Y = () => {
    A.signatureNormalize(I, o, o);
  }, b = (L, v) => (BA) => R(BA, L) ? (v ? Y() : A.signatureMalleate(I, o, o), L ? w() : H()) : DA.unparsableSignature, x = (L, v, BA) => {
    const kg = R(L, v);
    return BA && Y(), kg;
  }, J = (L) => (v, BA) => (p(BA), S(v, () => A.sign(I, o, i, C) !== 1 ? DA.signWithInvalidPrivateKey : L ? (y(
    72
    /* ByteLength.maxECDSASig */
  ), A.signatureSerializeDER(I, e, s, o), A.readHeapU8(e, l()).slice()) : (A.signatureSerializeCompact(I, e, o), A.readHeapU8(
    e,
    64
    /* ByteLength.compactSig */
  ).slice()))), T = () => (L, v) => (p(v), S(L, () => A.schnorrSign(I, B, i, C) !== 1 ? DA.signWithInvalidPrivateKey : A.readHeapU8(
    B,
    64
    /* ByteLength.schnorrSig */
  ).slice())), O = (L) => (p(L), A.verify(I, o, i, n) === 1), $ = (L, v) => (BA, kg, pe) => u(kg) && x(BA, L, v) && O(pe), tA = (L, v) => {
    p(L);
    const BA = h(
      v,
      64
      /* ByteLength.schnorrSig */
    );
    return A.heapU8.set(BA, B), A.schnorrVerify(I, B, i, n) === 1;
  }, j = () => (L, v, BA) => u(v) ? tA(BA, L) : !1, nA = (L, v) => (p(v), S(L, () => A.signRecoverable(I, r, i, C) !== 1 ? DA.signWithInvalidPrivateKey : (A.recoverableSignatureSerialize(I, e, E, r), {
    recoveryId: a(),
    signature: A.readHeapU8(
      e,
      64
      /* ByteLength.compactSig */
    ).slice()
  }))), IA = (L) => (v, BA, kg) => {
    p(kg);
    const pe = h(
      v,
      72
      /* ByteLength.maxECDSASig */
    );
    return A.heapU8.set(pe, e), A.recoverableSignatureParse(I, r, e, BA) !== 1 ? DA.recoverPublicKeyWithUnparsableSignature : A.recover(I, n, r, i) !== 1 ? DA.recoverPublicKeyInvalidMaterial : G(L);
  }, rA = (L, v) => (p(v), S(L, () => A.privkeyTweakAdd(I, C, i) !== 1 ? DA.addTweakPrivateKey : A.readHeapU8(
    C,
    32
    /* ByteLength.privateKey */
  ).slice())), AA = (L, v) => (p(v), S(L, () => A.privkeyTweakMul(I, C, i) !== 1 ? DA.mulTweakPrivateKey : A.readHeapU8(
    C,
    32
    /* ByteLength.privateKey */
  ).slice())), CA = (L) => (v, BA) => u(v) ? (p(BA), A.pubkeyTweakAdd(I, n, i) !== 1 ? DA.addTweakPublicKey : G(L)) : DA.unparsablePublicKey, dg = (L) => (v, BA) => u(v) ? (p(BA), A.pubkeyTweakMul(I, n, i) !== 1 ? DA.mulTweakPublicKey : G(L)) : DA.unparsablePublicKey;
  return {
    addTweakPrivateKey: rA,
    addTweakPublicKeyCompressed: CA(!0),
    addTweakPublicKeyUncompressed: CA(!1),
    compressPublicKey: f(!0),
    derivePublicKeyCompressed: m(!0),
    derivePublicKeyUncompressed: m(!1),
    malleateSignatureCompact: b(!1, !1),
    malleateSignatureDER: b(!0, !1),
    mulTweakPrivateKey: AA,
    mulTweakPublicKeyCompressed: dg(!0),
    mulTweakPublicKeyUncompressed: dg(!1),
    normalizeSignatureCompact: b(!1, !0),
    normalizeSignatureDER: b(!0, !0),
    recoverPublicKeyCompressed: IA(!0),
    recoverPublicKeyUncompressed: IA(!1),
    signMessageHashCompact: J(!1),
    signMessageHashDER: J(!0),
    signMessageHashRecoverableCompact: nA,
    signMessageHashSchnorr: T(),
    signatureCompactToDER: K(!1),
    signatureDERToCompact: K(!0),
    uncompressPublicKey: f(!1),
    validatePrivateKey: (L) => S(L, () => A.seckeyVerify(I, C) === 1),
    validatePublicKey: u,
    verifySignatureCompact: $(!1, !0),
    verifySignatureCompactLowS: $(!1, !1),
    verifySignatureDER: $(!0, !0),
    verifySignatureDERLowS: $(!0, !1),
    verifySignatureSchnorr: j()
  };
}, gs = async (A) => As(await Za()), Is = async (A) => {
  const g = await se(A, "./sha1", "sha1", "sha1_init", "sha1_update", "sha1_final");
  return {
    final: g.final,
    hash: g.hash,
    init: g.init,
    update: g.update
  };
}, es = () => lI(za).buffer, ts = async () => Is(es()), is = async (A) => {
  const g = await se(A, "./sha256", "sha256", "sha256_init", "sha256_update", "sha256_final");
  return {
    final: g.final,
    hash: g.hash,
    init: g.init,
    update: g.update
  };
}, ns = () => lI(Xa).buffer, os = async () => is(ns()), Bs = async (A) => {
  const g = await se(A, "./sha512", "sha512", "sha512_init", "sha512_update", "sha512_final");
  return {
    final: g.final,
    hash: g.hash,
    init: g.init,
    update: g.update
  };
}, Cs = () => lI(ja).buffer, rs = async () => Bs(Cs()), [yI, gA, Sg, bA, cA] = await Promise.all([
  ts(),
  os(),
  rs(),
  $a(),
  gs()
]), vA = (A, g = gA) => g.hash(g.hash(A)), Es = (A, g) => (I, e) => {
  const t = new Uint8Array(g).fill(0);
  t.set(I.length > g ? A(I) : I, 0);
  const o = new Uint8Array(g).fill(54).map((a, s) => a ^ t[s]), B = EA([o, e]), C = A(B), Q = new Uint8Array(g).fill(92).map((a, s) => a ^ t[s]);
  return A(EA([Q, C]));
}, as = 128, ii = (A, g, I = Sg) => Es(I.hash, as)(A, g), ss = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var II;
(function(A) {
  A.integerOutOfRange = "An integer provided in the source array is out of the range of the specified source word length.", A.hasDisallowedPadding = "Encountered padding when padding was disallowed.", A.requiresDisallowedPadding = "Encoding requires padding while padding is disallowed.";
})(II || (II = {}));
const dB = ({ bin: A, sourceWordLength: g, resultWordLength: I, allowPadding: e = !0 }) => {
  let t = 0, i = 0;
  const n = [], o = (1 << I) - 1;
  for (let B = 0; B < A.length; ++B) {
    const C = A[B];
    if (C < 0 || C >> g !== 0)
      return II.integerOutOfRange;
    for (t = t << g | C, i += g; i >= I; )
      i -= I, n.push(t >> i & o);
  }
  if (e)
    i > 0 && n.push(t << I - i & o);
  else {
    if (i >= g)
      return II.hasDisallowedPadding;
    if ((t << I - i & o) > 0)
      return II.requiresDisallowedPadding;
  }
  return n;
}, lB = (A) => {
  let g = "";
  for (let I = 0; I < A.length; I++)
    g += ss[A[I]];
  return g;
}, Qs = 5, cs = 8;
var In;
(function(A) {
  A.notBech32CharacterSet = "Bech32 decoding error: input contains characters outside of the Bech32 character set.";
})(In || (In = {}));
const en = (A) => lB(dB({
  bin: A,
  resultWordLength: Qs,
  sourceWordLength: cs
}));
var tn;
(function(A) {
  A.mainnet = "bitcoincash", A.testnet = "bchtest", A.regtest = "bchreg";
})(tn || (tn = {}));
var nn;
(function(A) {
  A[A.p2pkh = 0] = "p2pkh", A[A.p2sh20 = 8] = "p2sh20", A[A.p2sh32 = 11] = "p2sh32", A[A.p2pkhWithTokens = 16] = "p2pkhWithTokens", A[A.p2sh20WithTokens = 24] = "p2sh20WithTokens", A[A.p2sh32WithTokens = 27] = "p2sh32WithTokens";
})(nn || (nn = {}));
var FA;
(function(A) {
  A.p2pkh = "p2pkh", A.p2sh = "p2sh", A.p2pkhWithTokens = "p2pkhWithTokens", A.p2shWithTokens = "p2shWithTokens";
})(FA || (FA = {}));
var _A;
(function(A) {
  A[A.p2pkh = 0] = "p2pkh", A[A.p2sh = 1] = "p2sh", A[A.p2pkhWithTokens = 2] = "p2pkhWithTokens", A[A.p2shWithTokens = 3] = "p2shWithTokens";
})(_A || (_A = {}));
const us = {
  [FA.p2pkh]: _A.p2pkh,
  [FA.p2sh]: _A.p2sh,
  [FA.p2pkhWithTokens]: _A.p2pkhWithTokens,
  [FA.p2shWithTokens]: _A.p2shWithTokens
};
_A.p2pkh + "", FA.p2pkh, _A.p2sh + "", FA.p2sh, _A.p2pkhWithTokens + "", FA.p2pkhWithTokens, _A.p2shWithTokens + "", FA.p2shWithTokens;
const yB = {
  20: 0,
  24: 1,
  28: 2,
  32: 3,
  40: 4,
  48: 5,
  56: 6,
  64: 7
}, hs = (A, g) => (
  // eslint-disable-next-line no-bitwise
  A << 3 | yB[g]
);
var on;
(function(A) {
  A.reservedBitSet = "Reserved bit is set.";
})(on || (on = {}));
const ds = (A) => {
  const g = [];
  for (let I = 0; I < A.length; I++)
    g.push(
      A.charCodeAt(I) & 31
      /* Constants.asciiCaseInsensitiveBits */
    );
  return g;
}, Bn = [152, 121, 243, 174, 30], ls = [4072443489, 3077413346, 1046459332, 783016616, 1329849456], ys = (A) => {
  let g = 0, I = 1, e = 0;
  for (let t = 0; t < A.length; t++) {
    e = g >>> 3, g &= 7, g <<= 5, g |= I >>> 27, I &= 134217727, I <<= 5, I ^= A[t];
    for (let i = 0; i < Bn.length; ++i)
      e & 1 << i && (g ^= Bn[i], I ^= ls[i]);
  }
  return I ^= 1, I < 0 && (I ^= 1 << 31, I += (1 << 30) * 2), g * (1 << 30) * 4 + I;
}, fs = (A) => {
  const g = [];
  for (let I = 0; I < 8; ++I)
    g.push(A & 31), A /= 32;
  return g.reverse();
};
var lt;
(function(A) {
  A.excessiveVersion = "CashAddress format encoding error: version must be 255 or less.";
})(lt || (lt = {}));
var EI;
(function(A) {
  A.noTypeBitsValueStandardizedForP2pk = "CashAddress encoding error: no CashAddress type bit has been standardized for P2PK locking bytecode.", A.unsupportedPayloadLength = "CashAddress encoding error: a payload of this length can not be encoded as a valid CashAddress.", A.unknownLockingBytecodeType = "CashAddress encoding error: unknown locking bytecode type.";
})(EI || (EI = {}));
const Ds = ({ payload: A, prefix: g, throwErrors: I = !0, version: e }) => {
  const t = [0, 0, 0, 0, 0, 0, 0, 0];
  if (e > 255)
    return P(lt.excessiveVersion, `Version: ${e}.`, I);
  const i = dB({
    bin: Uint8Array.from([e, ...A]),
    resultWordLength: 5,
    sourceWordLength: 8
  }), n = [
    ...ds(g),
    0,
    ...i,
    ...t
  ], o = ys(n), B = [
    ...i,
    ...fs(o)
  ];
  return { address: `${g}:${lB(B)}` };
}, Ns = (A) => yB[A] !== void 0, Ss = ({ payload: A, prefix: g, throwErrors: I = !0, typeBits: e }) => {
  const { length: t } = A;
  return Ns(t) ? Ds({
    payload: A,
    prefix: g,
    throwErrors: I,
    version: hs(e, t)
  }) : P(EI.unsupportedPayloadLength, `Payload length: ${t}.`, I);
}, HI = ({ payload: A, prefix: g = "bitcoincash", throwErrors: I = !0, type: e }) => Ss({
  payload: A,
  prefix: g,
  throwErrors: I,
  typeBits: us[e]
});
var Cn;
(function(A) {
  A.improperPadding = "CashAddress decoding error: the payload is improperly padded.", A.invalidCharacters = "CashAddress decoding error: the payload contains unexpected characters.", A.invalidChecksum = "CashAddress decoding error: invalid checksum - please review the address for errors.", A.invalidFormat = 'CashAddress decoding error: CashAddresses should be of the form "prefix:payload".', A.mismatchedPayloadLength = "CashAddress decoding error: mismatched payload length for specified address version.", A.reservedBit = "CashAddress decoding error: unknown CashAddress version, reserved bit set.", A.unknownAddressType = "CashAddress decoding error: unknown CashAddress type.";
})(Cn || (Cn = {}));
var rn;
(function(A) {
  A.tooManyErrors = "CashAddress format correction error: this address cannot be corrected as it contains more than 2 errors.";
})(rn || (rn = {}));
var XA;
(function(A) {
  A.p2pk = "P2PK", A.p2pkh = "P2PKH", A.p2sh20 = "P2SH20", A.p2sh32 = "P2SH32";
})(XA || (XA = {}));
const fB = (A) => A.length === 67 && A[0] === 65 && A[
  66
  /* PayToPublicKeyUncompressed.lastElement */
] === 172, DB = (A) => A.length === 35 && A[0] === 33 && A[
  34
  /* PayToPublicKeyCompressed.lastElement */
] === 172, NB = (A) => DB(A) || fB(A), ni = (A) => A.length === 25 && A[0] === 118 && A[1] === 169 && A[2] === 20 && A[23] === 136 && A[24] === 172, Qe = (A) => A.length === 23 && A[0] === 169 && A[1] === 20 && A[
  22
  /* PayToScriptHash20.lastElement */
] === 135, ce = (A) => A.length === 35 && A[0] === 170 && A[1] === 32 && A[
  34
  /* PayToScriptHash32.lastElement */
] === 135, ps = (A) => ni(A) ? {
  payload: A.slice(
    3,
    23
    /* AddressPayload.p2pkhEnd */
  ),
  type: XA.p2pkh
} : Qe(A) ? {
  payload: A.slice(
    2,
    22
    /* AddressPayload.p2sh20End */
  ),
  type: XA.p2sh20
} : ce(A) ? {
  payload: A.slice(
    2,
    34
    /* AddressPayload.p2sh32End */
  ),
  type: XA.p2sh32
} : fB(A) ? {
  payload: A.slice(
    1,
    66
    /* AddressPayload.p2pkUncompressedEnd */
  ),
  type: XA.p2pk
} : DB(A) ? {
  payload: A.slice(
    1,
    34
    /* AddressPayload.p2pkCompressedEnd */
  ),
  type: XA.p2pk
} : { payload: A.slice(), type: "unknown" }, ws = ({ prefix: A = "bitcoincash", bytecode: g, tokenSupport: I = !1 }) => {
  const { payload: e, type: t } = ps(g);
  return t === XA.p2pkh ? HI(I ? {
    payload: e,
    prefix: A,
    throwErrors: !1,
    type: FA.p2pkhWithTokens
  } : {
    payload: e,
    prefix: A,
    throwErrors: !1,
    type: FA.p2pkh
  }) : t === XA.p2sh20 || t === XA.p2sh32 ? HI(I ? {
    payload: e,
    prefix: A,
    throwErrors: !1,
    type: FA.p2shWithTokens
  } : {
    payload: e,
    prefix: A,
    throwErrors: !1,
    type: FA.p2sh
  }) : t === "P2PK" ? EI.noTypeBitsValueStandardizedForP2pk : EI.unknownLockingBytecodeType;
};
var yt;
(function(A) {
  A.insufficientLength = "Error reading bytes: insufficient length.";
})(yt || (yt = {}));
const ks = (A) => (g) => {
  const I = {
    bin: g.bin,
    index: g.index + A
  }, e = g.bin.slice(g.index, I.index);
  return e.length !== A ? P(yt.insufficientLength, `Bytes requested: ${A}; remaining bytes: ${e.length}`) : { position: I, result: e };
};
var ft;
(function(A) {
  A.insufficientBytes = "Error reading Uint32LE: requires 4 bytes.";
})(ft || (ft = {}));
const _I = (A) => {
  const g = {
    bin: A.bin,
    index: A.index + 4
  }, I = A.bin.subarray(A.index, g.index);
  if (I.length !== 4)
    return P(ft.insufficientBytes, `Remaining bytes: ${I.length}`);
  const e = ka(I);
  return { position: g, result: e };
};
var Dt;
(function(A) {
  A.insufficientBytes = "Error reading Uint64LE: requires 8 bytes.";
})(Dt || (Dt = {}));
const ms = (A) => {
  const g = {
    bin: A.bin,
    index: A.index + 8
  }, I = A.bin.subarray(A.index, g.index);
  if (I.length !== 8)
    return P(Dt.insufficientBytes, `Remaining bytes: ${I.length}`);
  const e = QB(I);
  return { position: g, result: e };
};
var $I;
(function(A) {
  A.invalidCompactUint = "Error reading CompactUint-prefixed bin: invalid CompactUint.", A.insufficientBytes = "Error reading CompactUint-prefixed bin: insufficient bytes.";
})($I || ($I = {}));
const oi = (A) => {
  const g = ei(A);
  if (typeof g == "string")
    return P($I.invalidCompactUint, g);
  const { result: I, position: e } = g, t = Number(I), i = { bin: A.bin, index: e.index + t }, n = A.bin.slice(e.index, i.index);
  return n.length !== t ? P($I.insufficientBytes, `Required bytes: ${t}, remaining bytes: ${n.length}`) : { position: i, result: n };
}, Hs = (A) => {
  const g = {
    bin: A.bin,
    index: A.bin.length
  }, I = A.bin.subarray(A.index, g.index);
  return { position: g, result: I };
};
var ig;
(function(A) {
  A.none = "none", A.mutable = "mutable", A.minting = "minting";
})(ig || (ig = {}));
Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255]);
const Rs = (A) => EA([
  A.outpointTransactionHash.slice().reverse(),
  yA(A.outpointIndex),
  ng(BigInt(A.unlockingBytecode.length)),
  A.unlockingBytecode,
  yA(A.sequenceNumber)
]);
var og;
(function(A) {
  A.transaction = "Error reading transaction.", A.endsWithUnexpectedBytes = "Error decoding transaction: the provided input includes unexpected bytes after the encoded transaction.", A.input = "Error reading transaction input.", A.inputs = "Error reading transaction inputs.", A.output = "Error reading transaction output.", A.outputs = "Error reading transaction outputs.", A.outputsEndWithUnexpectedBytes = "Error decoding transaction outputs: the provided serialization includes unexpected bytes after the encoded transaction outputs.", A.lockingBytecodeLength = "Error reading locking bytecode length.";
})(og || (og = {}));
const Us = (A) => {
  const g = ae(A, [
    ks(
      32
      /* TransactionConstants.outpointTransactionHashLength */
    ),
    _I,
    oi,
    _I
  ]);
  if (typeof g == "string")
    return P(og.input, g);
  const { position: I, result: [e, t, i, n] } = g;
  return {
    position: I,
    result: {
      outpointIndex: t,
      outpointTransactionHash: e.reverse(),
      sequenceNumber: n,
      unlockingBytecode: i
    }
  };
}, Fs = (A) => EA([
  ng(BigInt(A.length)),
  ...A.map(Rs)
]), Gs = (A) => {
  const g = cB(A, Us);
  return typeof g == "string" ? P(og.inputs, g) : g;
}, Ys = 9223372036854775807n, Ps = [
  ig.none,
  ig.mutable,
  ig.minting
], Ms = {
  [ig.none]: 0,
  [ig.mutable]: 1,
  [ig.minting]: 2
};
var RA;
(function(A) {
  A.invalidPrefix = "Error reading token prefix.", A.insufficientLength = "Invalid token prefix: insufficient length.", A.reservedBit = "Invalid token prefix: reserved bit is set.", A.invalidCapability = "Invalid token prefix: capability must be none (0), mutable (1), or minting (2).", A.commitmentWithoutNft = "Invalid token prefix: commitment requires an NFT.", A.capabilityWithoutNft = "Invalid token prefix: capability requires an NFT.", A.commitmentLengthZero = "Invalid token prefix: if encoded, commitment length must be greater than 0.", A.invalidCommitment = "Invalid token prefix: invalid non-fungible token commitment.", A.invalidAmountEncoding = "Invalid token prefix: invalid fungible token amount encoding.", A.zeroAmount = "Invalid token prefix: if encoded, fungible token amount must be greater than 0.", A.excessiveAmount = "Invalid token prefix: exceeds maximum fungible token amount of 9223372036854775807.", A.noTokens = "Invalid token prefix: must encode at least one token.";
})(RA || (RA = {}));
const En = (A) => {
  const g = ei(A);
  return typeof g == "string" ? P(RA.invalidAmountEncoding, g) : g.result > Ys ? P(RA.excessiveAmount, `Encoded amount: ${g.result}`) : g.result === 0n ? P(RA.zeroAmount) : g;
}, Ks = (A) => {
  const { bin: g, index: I } = A;
  if (g[I] !== 239)
    return { position: A, result: {} };
  if (g.length < I + 34)
    return P(RA.insufficientLength, `The minimum possible length is 34. Missing bytes: ${34 - (g.length - I)}`);
  const e = g.slice(
    I + 1,
    I + 33
    /* CashTokens.tokenBitfieldIndex */
  ).reverse(), t = g[
    I + 33
    /* CashTokens.tokenBitfieldIndex */
  ], i = t & 240;
  if ((i & 128) !== 0)
    return P(RA.reservedBit, `Bitfield: 0b${t.toString(
      2
      /* CashTokens.useBinaryOutput */
    )}`);
  const n = t & 15;
  if (n > 2)
    return P(RA.invalidCapability, `Capability value: ${n}`);
  const o = Ps[n], B = (i & 32) !== 0, C = (i & 64) !== 0;
  if (C && !B)
    return P(RA.commitmentWithoutNft, `Bitfield: 0b${t.toString(
      2
      /* CashTokens.useBinaryOutput */
    )}`);
  const r = (i & 16) !== 0, E = {
    bin: g,
    index: I + 33 + 1
  };
  if (B) {
    const a = C ? oi(E) : { position: E, result: Uint8Array.of() };
    if (typeof a == "string")
      return P(RA.invalidCommitment, a);
    if (C && a.result.length === 0)
      return P(RA.commitmentLengthZero);
    const s = r ? En(a.position) : { position: a.position, result: 0n };
    return typeof s == "string" ? s : {
      position: s.position,
      result: {
        token: {
          amount: s.result,
          category: e,
          nft: { capability: o, commitment: a.result }
        }
      }
    };
  }
  if (o !== ig.none)
    return P(RA.capabilityWithoutNft, `Bitfield: 0b${t.toString(
      2
      /* CashTokens.useBinaryOutput */
    )}`);
  if (!r)
    return P(RA.noTokens, `Bitfield: 0b${t.toString(
      2
      /* CashTokens.useBinaryOutput */
    )}`);
  const Q = En(E);
  return typeof Q == "string" ? Q : {
    position: Q.position,
    result: { token: { amount: Q.result, category: e } }
  };
}, bs = (A) => {
  const g = oi(A);
  if (typeof g == "string")
    return P(og.lockingBytecodeLength, g);
  const { result: I, position: e } = g, t = ae({ bin: I, index: 0 }, [
    Ks,
    Hs
  ]);
  if (typeof t == "string")
    return P(RA.invalidPrefix, t);
  const { result: [{ token: i }, n] } = t;
  return {
    position: e,
    result: { lockingBytecode: n, ...i === void 0 ? {} : { token: i } }
  };
}, qs = (A) => {
  const g = ae(A, [
    ms,
    bs
  ]);
  if (typeof g == "string")
    return P(og.output, g);
  const { position: I, result: [e, { lockingBytecode: t, token: i }] } = g;
  return {
    position: I,
    result: {
      lockingBytecode: t,
      ...i === void 0 ? {} : { token: i },
      valueSatoshis: e
    }
  };
}, Bi = (A) => {
  if (A === void 0 || A.nft === void 0 && A.amount < 1n)
    return Uint8Array.of();
  const g = A.nft === void 0 ? 0 : 32, I = A.nft === void 0 ? 0 : Ms[A.nft.capability], e = A.nft !== void 0 && A.nft.commitment.length > 0 ? 64 : 0, t = A.amount > 0n ? 16 : 0, i = (
    // eslint-disable-next-line no-bitwise
    g | e | t | I
  );
  return EA([
    Uint8Array.of(
      239
      /* CashTokens.PREFIX_TOKEN */
    ),
    A.category.slice().reverse(),
    Uint8Array.of(i),
    ...e === 0 ? [] : [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ng(BigInt(A.nft.commitment.length)),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      A.nft.commitment
    ],
    ...t === 0 ? [] : [ng(A.amount)]
  ]);
}, ue = (A) => {
  const g = EA([
    Bi(A.token),
    A.lockingBytecode
  ]);
  return EA([
    Ii(A.valueSatoshis),
    ng(BigInt(g.length)),
    g
  ]);
}, Js = (A) => {
  const g = cB(A, qs);
  return typeof g == "string" ? P(og.outputs, g) : g;
}, xs = (A) => EA([
  ng(BigInt(A.length)),
  ...A.map(ue)
]), Ts = (A) => {
  const g = ae(A, [
    _I,
    Gs,
    Js,
    _I
  ]);
  if (typeof g == "string")
    return P(og.transaction, g);
  const { position: I, result: [e, t, i, n] } = g;
  return {
    position: I,
    result: { inputs: t, locktime: n, outputs: i, version: e }
  };
}, Ls = (A) => {
  const g = Ts({ bin: A, index: 0 });
  return typeof g == "string" ? g : g.position.index !== A.length ? P(og.endsWithUnexpectedBytes, `Encoded transaction ends at index ${g.position.index - 1}, leaving ${A.length - g.position.index} remaining bytes.`) : g.result;
}, Os = Ls, Nt = Os, vs = (A) => EA([
  yA(A.version),
  Fs(A.inputs),
  xs(A.outputs),
  yA(A.locktime)
]), SB = vs, Vs = SB, Ci = (A) => EA(A.map((g) => EA([
  g.outpointTransactionHash.slice().reverse(),
  yA(g.outpointIndex)
]))), Ae = (A) => EA(A.map(ue)), ri = (A) => EA(A.map((g) => yA(g.sequenceNumber)));
var uA;
(function(A) {
  A[A.allOutputs = 1] = "allOutputs", A[A.noOutputs = 2] = "noOutputs", A[A.correspondingOutput = 3] = "correspondingOutput", A[A.utxos = 32] = "utxos", A[A.forkId = 64] = "forkId", A[A.singleInput = 128] = "singleInput";
})(uA || (uA = {}));
var St;
(function(A) {
  A[A.allOutputs = 65] = "allOutputs", A[A.allOutputsAllUtxos = 97] = "allOutputsAllUtxos", A[A.allOutputsSingleInput = 193] = "allOutputsSingleInput", A[A.correspondingOutput = 67] = "correspondingOutput", A[A.correspondingOutputAllUtxos = 99] = "correspondingOutputAllUtxos", A[A.correspondingOutputSingleInput = 195] = "correspondingOutputSingleInput", A[A.noOutputs = 66] = "noOutputs", A[A.noOutputsAllUtxos = 98] = "noOutputsAllUtxos", A[A.noOutputsSingleInput = 194] = "noOutputsSingleInput";
})(St || (St = {}));
const hA = St, pB = (A, g) => (
  // eslint-disable-next-line no-bitwise, @typescript-eslint/no-non-null-assertion
  (A[0] & g) !== 0
), wB = (A, g) => (A[0] & 31) === g, kB = (A) => pB(A, uA.singleInput), pt = (A) => wB(A, uA.correspondingOutput), mB = (A) => wB(A, uA.noOutputs), Zs = (A) => pB(A, uA.utxos), ge = () => new Uint8Array(
  32
  /* Internal.sha256HashByteLength */
).fill(0), zs = ({ signingSerializationType: A, transactionOutpoints: g }, I = gA) => kB(A) ? ge() : vA(g, I), Xs = ({ signingSerializationType: A, transactionUtxos: g }, I = gA) => Zs(A) ? vA(g, I) : Uint8Array.of(), js = ({ signingSerializationType: A, transactionSequenceNumbers: g }, I = gA) => !kB(A) && !pt(A) && !mB(A) ? vA(g, I) : ge(), Ws = ({ correspondingOutput: A, signingSerializationType: g, transactionOutputs: I }, e = gA) => !pt(g) && !mB(g) ? vA(I, e) : pt(g) ? A === void 0 ? ge() : vA(A, e) : ge(), _s = ({ correspondingOutput: A, coveredBytecode: g, forkId: I = new Uint8Array([0, 0, 0]), locktime: e, outpointIndex: t, outpointTransactionHash: i, outputTokenPrefix: n, outputValue: o, sequenceNumber: B, signingSerializationType: C, transactionOutpoints: r, transactionOutputs: E, transactionSequenceNumbers: Q, transactionUtxos: a, version: s }, d = gA) => EA([
  yA(s),
  zs({ signingSerializationType: C, transactionOutpoints: r }, d),
  Xs({ signingSerializationType: C, transactionUtxos: a }, d),
  js({
    signingSerializationType: C,
    transactionSequenceNumbers: Q
  }, d),
  i.slice().reverse(),
  yA(t),
  n,
  ng(BigInt(g.length)),
  g,
  o,
  yA(B),
  Ws({
    correspondingOutput: A,
    signingSerializationType: C,
    transactionOutputs: E
  }, d),
  yA(e),
  C,
  I
]), Ei = (A) => ({
  correspondingOutput: A.inputIndex < A.transaction.outputs.length ? ue(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A.transaction.outputs[A.inputIndex]
  ) : void 0,
  locktime: A.transaction.locktime,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  outpointIndex: A.transaction.inputs[A.inputIndex].outpointIndex,
  outpointTransactionHash: (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A.transaction.inputs[A.inputIndex].outpointTransactionHash
  ),
  outputTokenPrefix: Bi(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A.sourceOutputs[A.inputIndex].token
  ),
  outputValue: Ii(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A.sourceOutputs[A.inputIndex].valueSatoshis
  ),
  sequenceNumber: (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A.transaction.inputs[A.inputIndex].sequenceNumber
  ),
  transactionOutpoints: Ci(A.transaction.inputs),
  transactionOutputs: Ae(A.transaction.outputs),
  transactionSequenceNumbers: ri(A.transaction.inputs),
  transactionUtxos: Ae(A.sourceOutputs),
  version: A.transaction.version
}), aI = (A, { coveredBytecode: g, signingSerializationType: I }, e = gA) => _s({
  ...Ei(A),
  coveredBytecode: g,
  signingSerializationType: I
}, e);
var V;
(function(A) {
  A[A.maximumBytecodeLength = 1e4] = "maximumBytecodeLength", A[A.maximumControlStackDepth = 100] = "maximumControlStackDepth", A[A.maximumDataCarrierBytes = 223] = "maximumDataCarrierBytes", A[A.maximumOperationCount = 201] = "maximumOperationCount", A[A.maximumStackDepth = 1e3] = "maximumStackDepth", A[A.maximumStackItemLength = 520] = "maximumStackItemLength", A[A.maximumStandardVersion = 2] = "maximumStandardVersion", A[A.maximumStandardUnlockingBytecodeLength = 1650] = "maximumStandardUnlockingBytecodeLength", A[A.minimumTransactionSize = 100] = "minimumTransactionSize", A[A.maximumStandardTransactionSize = 1e5] = "maximumStandardTransactionSize", A[A.maximumTransactionSize = 1e6] = "maximumTransactionSize", A[A.maximumVmNumberByteLength = 8] = "maximumVmNumberByteLength", A.minVmNumber = "-9223372036854775807", A.maxVmNumber = "9223372036854775807", A[A.schnorrSignatureLength = 64] = "schnorrSignatureLength";
})(V || (V = {}));
const $s = [
  hA.allOutputs,
  hA.allOutputsSingleInput,
  hA.correspondingOutput,
  hA.correspondingOutputSingleInput,
  hA.noOutputs,
  hA.noOutputsSingleInput
], wt = [
  ...$s,
  hA.allOutputsAllUtxos,
  hA.correspondingOutputAllUtxos,
  hA.noOutputsAllUtxos
];
var F;
(function(A) {
  A.calledReserved = "Program called an unassigned, reserved operation.", A.calledReturn = "Program called an OP_RETURN operation.", A.calledUpgradableNop = "Program called a disallowed upgradable non-operation (OP_NOP1-OP_NOP10).", A.checkSequenceUnavailable = "Program called an OP_CHECKSEQUENCEVERIFY operation, but OP_CHECKSEQUENCEVERIFY requires transaction version 2 or higher.", A.disabledOpcode = "Program contains a disabled opcode.", A.divisionByZero = "Program attempted to divide a number by zero.", A.emptyAlternateStack = "Tried to read from an empty alternate stack.", A.emptyStack = "Tried to read from an empty stack.", A.exceededMaximumBytecodeLengthLocking = "The provided locking bytecode exceeds the maximum bytecode length.", A.exceededMaximumBytecodeLengthUnlocking = "The provided unlocking bytecode exceeds the maximum bytecode length.", A.exceededMaximumVmNumberByteLength = "Program attempted an OP_BIN2NUM operation on a byte sequence that cannot be encoded within the maximum VM Number length.", A.exceededMaximumControlStackDepth = "Program exceeded the maximum control stack depth.", A.exceededMaximumSignatureCheckCount = "Program exceeded the maximum signature check count.", A.exceededMaximumStackDepth = "Program exceeded the maximum stack depth.", A.exceededMaximumStackItemLength = "Program attempted to push a stack item that exceeded the maximum stack item length.", A.exceededMaximumOperationCount = "Program exceeded the maximum operation count (201 operations).", A.exceedsMaximumMultisigPublicKeyCount = "Program called an OP_CHECKMULTISIG that exceeds the maximum public key count (20 public keys).", A.failedVerify = "Program failed an OP_VERIFY operation.", A.invalidStackIndex = "Tried to read from an invalid stack index.", A.incompatibleLocktimeType = "Program called an OP_CHECKLOCKTIMEVERIFY operation with an incompatible locktime type. The transaction locktime and required locktime must both refer to either a block height or a block time.", A.incompatibleSequenceType = "Program called an OP_CHECKSEQUENCEVERIFY operation with an incompatible sequence type flag. The input sequence number and required sequence number must both use the same sequence locktime type.", A.insufficientLength = "Program called an OP_NUM2BIN operation with an insufficient byte length to re-encode the provided number.", A.insufficientPublicKeys = "Program called an OP_CHECKMULTISIG operation that requires signatures from more public keys than are provided.", A.invalidCheckBitsValue = "Program called an OP_CHECKMULTISIG operation with an invalid CheckBits value.", A.invalidCheckBitsSignatureCount = "Program called an OP_CHECKMULTISIG operation with a CheckBits value configuring validation for an incorrect number of signatures.", A.invalidNaturalNumber = "Invalid input: the key/signature count inputs for OP_CHECKMULTISIG require a natural number (n > 0).", A.invalidPublicKeyEncoding = "Encountered an improperly encoded public key.", A.invalidVmNumber = "Invalid input: this operation requires a valid VM Number.", A.invalidSignatureEncoding = "Encountered an improperly encoded signature.", A.invalidSplitIndex = "Program called an OP_SPLIT operation with an invalid index.", A.invalidTransactionInputIndex = "Program attempted to read from an invalid transaction input index.", A.invalidTransactionOutputIndex = "Program attempted to read from an invalid transaction output index.", A.invalidTransactionUtxoIndex = "Program attempted to read from an invalid transaction UTXO index.", A.locktimeDisabled = "Program called an OP_CHECKLOCKTIMEVERIFY operation, but locktime is disabled for this transaction.", A.mismatchedBitwiseOperandLength = "Program attempted a bitwise operation on operands of different lengths.", A.malformedLockingBytecode = "The provided locking bytecode is malformed.", A.malformedP2shBytecode = "Redeem bytecode was malformed prior to P2SH evaluation.", A.malformedPush = "Program must be long enough to push the requested number of bytes.", A.malformedUnlockingBytecode = "The provided unlocking bytecode is malformed.", A.negativeLocktime = "Program called an OP_CHECKLOCKTIMEVERIFY or OP_CHECKSEQUENCEVERIFY operation with a negative locktime.", A.nonEmptyControlStackLockingBytecode = "The locking bytecode completed with a non-empty control stack.", A.nonEmptyControlStackRedeemBytecode = "The redeem bytecode completed with a non-empty control stack.", A.nonEmptyControlStackUnlockingBytecode = "The unlocking bytecode completed with a non-empty control stack.", A.nonMinimalPush = "Push operations must use the smallest possible encoding.", A.nonNullSignatureFailure = 'Program failed a signature verification with a non-null signature (violating the "NULLFAIL" rule).', A.nonSchnorrSizedSignatureInSchnorrMultiSig = "Program used a non schnorr-sized signature (65 bytes) in a schnorr OP_CHECKMULTISIG operation.", A.overflowsVmNumberRange = "Program attempted an arithmetic operation which exceeds the range of VM Numbers.", A.requiresCleanStackLockingBytecode = "Non-P2SH locking bytecode completed evaluation with an unexpected number of items on the stack (must be exactly 1).", A.requiresCleanStackRedeemBytecode = "P2SH redeem bytecode completed evaluation with an unexpected number of items on the stack (must be exactly 1).", A.requiresPushOnly = "Unlocking bytecode may contain only push operations in version 1 and 2 transactions.", A.schnorrSizedSignatureInEcdsaMultiSig = "Program used a schnorr-sized signature (65 bytes) in a legacy-mode (ECDSA) OP_CHECKMULTISIG operation.", A.tokenValidationExcessiveCommitmentLength = "Transaction violates token validation: excessive token commitment length.", A.tokenValidationInvalidMintingToken = "Transaction violates token validation: the transaction outputs include a minting token that is not substantiated by the transaction inputs.", A.tokenValidationExcessiveAmount = "Transaction violates token validation: the transaction outputs include a sum of fungible tokens for a category exceeding the maximum fungible token amount.", A.tokenValidationInvalidFungibleMint = "Transaction violates token validation: the transaction creates new fungible tokens for a category without a matching genesis input.", A.tokenValidationOutputsExceedInputs = "Transaction violates token validation: the sum of fungible tokens in the transaction outputs exceed that of the transaction inputs for a category.", A.tokenValidationExcessiveMutableTokens = "Transaction violates token validation: the transaction creates more mutable tokens than are available for a category without a matching minting token.", A.tokenValidationExcessiveImmutableTokens = "Transaction violates token validation: the transaction creates an immutable token for a category without a matching minting token or sufficient mutable tokens.", A.unexpectedElse = "Encountered an OP_ELSE outside of an OP_IF ... OP_ENDIF block.", A.unexpectedEndIf = "Encountered an OP_ENDIF that is not following a matching OP_IF.", A.unknownOpcode = "Called an unknown opcode.", A.unmatchedSequenceDisable = "Program called an OP_CHECKSEQUENCEVERIFY operation requiring the disable flag, but the input's sequence number is missing the disable flag.", A.unmatchedP2shRedeemBytecode = "The P2SH redeem bytecode provided in this input does not match the hash required by the locking bytecode.", A.unsatisfiedLocktime = "Program called an OP_CHECKLOCKTIMEVERIFY operation that requires a locktime greater than the transaction's locktime.", A.unsatisfiedSequenceNumber = "Program called an OP_CHECKSEQUENCEVERIFY operation that requires a sequence number greater than the input's sequence number.", A.unsuccessfulEvaluation = "Unsuccessful evaluation: completed with a non-truthy value on top of the stack.", A.verifyFailedExcessiveLength = "Unable to verify transaction: excessive byte length.", A.verifyFailedInsufficientLength = "Unable to verify transaction: insufficient byte length.", A.verifyFailedMismatchedSourceOutputs = "Unable to verify transaction: a single spent output must be provided for each transaction input.", A.verifyFailedNoInputs = "Unable to verify transaction: transactions must have at least one input.", A.verifyFailedNoOutputs = "Unable to verify transaction: transactions must have at least one output.", A.verifyFailedInputsExceedMaxMoney = "Unable to verify transaction: the sum of source output values exceeds the maximum possible satoshi value.", A.verifyFailedOutputsExceedInputs = "Unable to verify transaction: the sum of transaction output values exceeds the sum of transaction inputs.", A.verifyFailedOutputsExceedMaxMoney = "Unable to verify transaction: the sum of transaction output values exceeds the maximum possible satoshi value.", A.verifyFailedDuplicateSourceOutputs = "Unable to verify transaction: the transaction attempts to spend the same outpoint in multiple inputs.", A.verifyFailedInvalidVersion = "Unable to verify transaction: transaction version must be either 1 or 2.", A.verifyFailedExcessiveSigChecks = "Unable to verify transaction: excessive cumulative signature check count.", A.verifyStandardFailedExcessiveLength = "Unable to verify standard transaction: transaction exceeds maximum standard byte length.", A.verifyStandardFailedNonstandardOutput = "Unable to verify standard transaction: standard transactions may only create standard output types.", A.verifyStandardFailedNonstandardSourceOutput = "Unable to verify standard transaction: standard transactions may only spend standard output types.", A.verifyStandardFailedDustOutput = "Unable to verify standard transaction: standard transactions may not have dust outputs.", A.verifyStandardFailedExcessiveDataCarrierBytes = "Unable to verify standard transaction: excessive data carrier bytes.", A.verifyStandardFailedExcessiveUnlockingBytecodeLength = "Unable to verify standard transaction: excessive unlocking bytecode length.", A.verifyStandardFailedNonPushUnlockingBytecode = "Unable to verify standard transaction: unlocking bytecode must only include push operations.";
})(F || (F = {}));
const q = (A, g, I) => ({
  ...A,
  error: A.error ?? P(g, I)
});
var c;
(function(A) {
  A[A.OP_0 = 0] = "OP_0", A[A.OP_PUSHBYTES_1 = 1] = "OP_PUSHBYTES_1", A[A.OP_PUSHBYTES_2 = 2] = "OP_PUSHBYTES_2", A[A.OP_PUSHBYTES_3 = 3] = "OP_PUSHBYTES_3", A[A.OP_PUSHBYTES_4 = 4] = "OP_PUSHBYTES_4", A[A.OP_PUSHBYTES_5 = 5] = "OP_PUSHBYTES_5", A[A.OP_PUSHBYTES_6 = 6] = "OP_PUSHBYTES_6", A[A.OP_PUSHBYTES_7 = 7] = "OP_PUSHBYTES_7", A[A.OP_PUSHBYTES_8 = 8] = "OP_PUSHBYTES_8", A[A.OP_PUSHBYTES_9 = 9] = "OP_PUSHBYTES_9", A[A.OP_PUSHBYTES_10 = 10] = "OP_PUSHBYTES_10", A[A.OP_PUSHBYTES_11 = 11] = "OP_PUSHBYTES_11", A[A.OP_PUSHBYTES_12 = 12] = "OP_PUSHBYTES_12", A[A.OP_PUSHBYTES_13 = 13] = "OP_PUSHBYTES_13", A[A.OP_PUSHBYTES_14 = 14] = "OP_PUSHBYTES_14", A[A.OP_PUSHBYTES_15 = 15] = "OP_PUSHBYTES_15", A[A.OP_PUSHBYTES_16 = 16] = "OP_PUSHBYTES_16", A[A.OP_PUSHBYTES_17 = 17] = "OP_PUSHBYTES_17", A[A.OP_PUSHBYTES_18 = 18] = "OP_PUSHBYTES_18", A[A.OP_PUSHBYTES_19 = 19] = "OP_PUSHBYTES_19", A[A.OP_PUSHBYTES_20 = 20] = "OP_PUSHBYTES_20", A[A.OP_PUSHBYTES_21 = 21] = "OP_PUSHBYTES_21", A[A.OP_PUSHBYTES_22 = 22] = "OP_PUSHBYTES_22", A[A.OP_PUSHBYTES_23 = 23] = "OP_PUSHBYTES_23", A[A.OP_PUSHBYTES_24 = 24] = "OP_PUSHBYTES_24", A[A.OP_PUSHBYTES_25 = 25] = "OP_PUSHBYTES_25", A[A.OP_PUSHBYTES_26 = 26] = "OP_PUSHBYTES_26", A[A.OP_PUSHBYTES_27 = 27] = "OP_PUSHBYTES_27", A[A.OP_PUSHBYTES_28 = 28] = "OP_PUSHBYTES_28", A[A.OP_PUSHBYTES_29 = 29] = "OP_PUSHBYTES_29", A[A.OP_PUSHBYTES_30 = 30] = "OP_PUSHBYTES_30", A[A.OP_PUSHBYTES_31 = 31] = "OP_PUSHBYTES_31", A[A.OP_PUSHBYTES_32 = 32] = "OP_PUSHBYTES_32", A[A.OP_PUSHBYTES_33 = 33] = "OP_PUSHBYTES_33", A[A.OP_PUSHBYTES_34 = 34] = "OP_PUSHBYTES_34", A[A.OP_PUSHBYTES_35 = 35] = "OP_PUSHBYTES_35", A[A.OP_PUSHBYTES_36 = 36] = "OP_PUSHBYTES_36", A[A.OP_PUSHBYTES_37 = 37] = "OP_PUSHBYTES_37", A[A.OP_PUSHBYTES_38 = 38] = "OP_PUSHBYTES_38", A[A.OP_PUSHBYTES_39 = 39] = "OP_PUSHBYTES_39", A[A.OP_PUSHBYTES_40 = 40] = "OP_PUSHBYTES_40", A[A.OP_PUSHBYTES_41 = 41] = "OP_PUSHBYTES_41", A[A.OP_PUSHBYTES_42 = 42] = "OP_PUSHBYTES_42", A[A.OP_PUSHBYTES_43 = 43] = "OP_PUSHBYTES_43", A[A.OP_PUSHBYTES_44 = 44] = "OP_PUSHBYTES_44", A[A.OP_PUSHBYTES_45 = 45] = "OP_PUSHBYTES_45", A[A.OP_PUSHBYTES_46 = 46] = "OP_PUSHBYTES_46", A[A.OP_PUSHBYTES_47 = 47] = "OP_PUSHBYTES_47", A[A.OP_PUSHBYTES_48 = 48] = "OP_PUSHBYTES_48", A[A.OP_PUSHBYTES_49 = 49] = "OP_PUSHBYTES_49", A[A.OP_PUSHBYTES_50 = 50] = "OP_PUSHBYTES_50", A[A.OP_PUSHBYTES_51 = 51] = "OP_PUSHBYTES_51", A[A.OP_PUSHBYTES_52 = 52] = "OP_PUSHBYTES_52", A[A.OP_PUSHBYTES_53 = 53] = "OP_PUSHBYTES_53", A[A.OP_PUSHBYTES_54 = 54] = "OP_PUSHBYTES_54", A[A.OP_PUSHBYTES_55 = 55] = "OP_PUSHBYTES_55", A[A.OP_PUSHBYTES_56 = 56] = "OP_PUSHBYTES_56", A[A.OP_PUSHBYTES_57 = 57] = "OP_PUSHBYTES_57", A[A.OP_PUSHBYTES_58 = 58] = "OP_PUSHBYTES_58", A[A.OP_PUSHBYTES_59 = 59] = "OP_PUSHBYTES_59", A[A.OP_PUSHBYTES_60 = 60] = "OP_PUSHBYTES_60", A[A.OP_PUSHBYTES_61 = 61] = "OP_PUSHBYTES_61", A[A.OP_PUSHBYTES_62 = 62] = "OP_PUSHBYTES_62", A[A.OP_PUSHBYTES_63 = 63] = "OP_PUSHBYTES_63", A[A.OP_PUSHBYTES_64 = 64] = "OP_PUSHBYTES_64", A[A.OP_PUSHBYTES_65 = 65] = "OP_PUSHBYTES_65", A[A.OP_PUSHBYTES_66 = 66] = "OP_PUSHBYTES_66", A[A.OP_PUSHBYTES_67 = 67] = "OP_PUSHBYTES_67", A[A.OP_PUSHBYTES_68 = 68] = "OP_PUSHBYTES_68", A[A.OP_PUSHBYTES_69 = 69] = "OP_PUSHBYTES_69", A[A.OP_PUSHBYTES_70 = 70] = "OP_PUSHBYTES_70", A[A.OP_PUSHBYTES_71 = 71] = "OP_PUSHBYTES_71", A[A.OP_PUSHBYTES_72 = 72] = "OP_PUSHBYTES_72", A[A.OP_PUSHBYTES_73 = 73] = "OP_PUSHBYTES_73", A[A.OP_PUSHBYTES_74 = 74] = "OP_PUSHBYTES_74", A[A.OP_PUSHBYTES_75 = 75] = "OP_PUSHBYTES_75", A[A.OP_PUSHDATA_1 = 76] = "OP_PUSHDATA_1", A[A.OP_PUSHDATA_2 = 77] = "OP_PUSHDATA_2", A[A.OP_PUSHDATA_4 = 78] = "OP_PUSHDATA_4", A[A.OP_1NEGATE = 79] = "OP_1NEGATE", A[A.OP_RESERVED = 80] = "OP_RESERVED", A[A.OP_1 = 81] = "OP_1", A[A.OP_2 = 82] = "OP_2", A[A.OP_3 = 83] = "OP_3", A[A.OP_4 = 84] = "OP_4", A[A.OP_5 = 85] = "OP_5", A[A.OP_6 = 86] = "OP_6", A[A.OP_7 = 87] = "OP_7", A[A.OP_8 = 88] = "OP_8", A[A.OP_9 = 89] = "OP_9", A[A.OP_10 = 90] = "OP_10", A[A.OP_11 = 91] = "OP_11", A[A.OP_12 = 92] = "OP_12", A[A.OP_13 = 93] = "OP_13", A[A.OP_14 = 94] = "OP_14", A[A.OP_15 = 95] = "OP_15", A[A.OP_16 = 96] = "OP_16", A[A.OP_NOP = 97] = "OP_NOP", A[A.OP_VER = 98] = "OP_VER", A[A.OP_IF = 99] = "OP_IF", A[A.OP_NOTIF = 100] = "OP_NOTIF", A[A.OP_VERIF = 101] = "OP_VERIF", A[A.OP_VERNOTIF = 102] = "OP_VERNOTIF", A[A.OP_ELSE = 103] = "OP_ELSE", A[A.OP_ENDIF = 104] = "OP_ENDIF", A[A.OP_VERIFY = 105] = "OP_VERIFY", A[A.OP_RETURN = 106] = "OP_RETURN", A[A.OP_TOALTSTACK = 107] = "OP_TOALTSTACK", A[A.OP_FROMALTSTACK = 108] = "OP_FROMALTSTACK", A[A.OP_2DROP = 109] = "OP_2DROP", A[A.OP_2DUP = 110] = "OP_2DUP", A[A.OP_3DUP = 111] = "OP_3DUP", A[A.OP_2OVER = 112] = "OP_2OVER", A[A.OP_2ROT = 113] = "OP_2ROT", A[A.OP_2SWAP = 114] = "OP_2SWAP", A[A.OP_IFDUP = 115] = "OP_IFDUP", A[A.OP_DEPTH = 116] = "OP_DEPTH", A[A.OP_DROP = 117] = "OP_DROP", A[A.OP_DUP = 118] = "OP_DUP", A[A.OP_NIP = 119] = "OP_NIP", A[A.OP_OVER = 120] = "OP_OVER", A[A.OP_PICK = 121] = "OP_PICK", A[A.OP_ROLL = 122] = "OP_ROLL", A[A.OP_ROT = 123] = "OP_ROT", A[A.OP_SWAP = 124] = "OP_SWAP", A[A.OP_TUCK = 125] = "OP_TUCK", A[A.OP_CAT = 126] = "OP_CAT", A[A.OP_SPLIT = 127] = "OP_SPLIT", A[A.OP_NUM2BIN = 128] = "OP_NUM2BIN", A[A.OP_BIN2NUM = 129] = "OP_BIN2NUM", A[A.OP_SIZE = 130] = "OP_SIZE", A[A.OP_INVERT = 131] = "OP_INVERT", A[A.OP_AND = 132] = "OP_AND", A[A.OP_OR = 133] = "OP_OR", A[A.OP_XOR = 134] = "OP_XOR", A[A.OP_EQUAL = 135] = "OP_EQUAL", A[A.OP_EQUALVERIFY = 136] = "OP_EQUALVERIFY", A[A.OP_RESERVED1 = 137] = "OP_RESERVED1", A[A.OP_RESERVED2 = 138] = "OP_RESERVED2", A[A.OP_1ADD = 139] = "OP_1ADD", A[A.OP_1SUB = 140] = "OP_1SUB", A[A.OP_2MUL = 141] = "OP_2MUL", A[A.OP_2DIV = 142] = "OP_2DIV", A[A.OP_NEGATE = 143] = "OP_NEGATE", A[A.OP_ABS = 144] = "OP_ABS", A[A.OP_NOT = 145] = "OP_NOT", A[A.OP_0NOTEQUAL = 146] = "OP_0NOTEQUAL", A[A.OP_ADD = 147] = "OP_ADD", A[A.OP_SUB = 148] = "OP_SUB", A[A.OP_MUL = 149] = "OP_MUL", A[A.OP_DIV = 150] = "OP_DIV", A[A.OP_MOD = 151] = "OP_MOD", A[A.OP_LSHIFT = 152] = "OP_LSHIFT", A[A.OP_RSHIFT = 153] = "OP_RSHIFT", A[A.OP_BOOLAND = 154] = "OP_BOOLAND", A[A.OP_BOOLOR = 155] = "OP_BOOLOR", A[A.OP_NUMEQUAL = 156] = "OP_NUMEQUAL", A[A.OP_NUMEQUALVERIFY = 157] = "OP_NUMEQUALVERIFY", A[A.OP_NUMNOTEQUAL = 158] = "OP_NUMNOTEQUAL", A[A.OP_LESSTHAN = 159] = "OP_LESSTHAN", A[A.OP_GREATERTHAN = 160] = "OP_GREATERTHAN", A[A.OP_LESSTHANOREQUAL = 161] = "OP_LESSTHANOREQUAL", A[A.OP_GREATERTHANOREQUAL = 162] = "OP_GREATERTHANOREQUAL", A[A.OP_MIN = 163] = "OP_MIN", A[A.OP_MAX = 164] = "OP_MAX", A[A.OP_WITHIN = 165] = "OP_WITHIN", A[A.OP_RIPEMD160 = 166] = "OP_RIPEMD160", A[A.OP_SHA1 = 167] = "OP_SHA1", A[A.OP_SHA256 = 168] = "OP_SHA256", A[A.OP_HASH160 = 169] = "OP_HASH160", A[A.OP_HASH256 = 170] = "OP_HASH256", A[A.OP_CODESEPARATOR = 171] = "OP_CODESEPARATOR", A[A.OP_CHECKSIG = 172] = "OP_CHECKSIG", A[A.OP_CHECKSIGVERIFY = 173] = "OP_CHECKSIGVERIFY", A[A.OP_CHECKMULTISIG = 174] = "OP_CHECKMULTISIG", A[A.OP_CHECKMULTISIGVERIFY = 175] = "OP_CHECKMULTISIGVERIFY", A[A.OP_NOP1 = 176] = "OP_NOP1", A[A.OP_CHECKLOCKTIMEVERIFY = 177] = "OP_CHECKLOCKTIMEVERIFY", A[A.OP_CHECKSEQUENCEVERIFY = 178] = "OP_CHECKSEQUENCEVERIFY", A[A.OP_NOP4 = 179] = "OP_NOP4", A[A.OP_NOP5 = 180] = "OP_NOP5", A[A.OP_NOP6 = 181] = "OP_NOP6", A[A.OP_NOP7 = 182] = "OP_NOP7", A[A.OP_NOP8 = 183] = "OP_NOP8", A[A.OP_NOP9 = 184] = "OP_NOP9", A[A.OP_NOP10 = 185] = "OP_NOP10", A[A.OP_CHECKDATASIG = 186] = "OP_CHECKDATASIG", A[A.OP_CHECKDATASIGVERIFY = 187] = "OP_CHECKDATASIGVERIFY", A[A.OP_REVERSEBYTES = 188] = "OP_REVERSEBYTES", A[A.OP_UNKNOWN189 = 189] = "OP_UNKNOWN189", A[A.OP_UNKNOWN190 = 190] = "OP_UNKNOWN190", A[A.OP_UNKNOWN191 = 191] = "OP_UNKNOWN191", A[A.OP_INPUTINDEX = 192] = "OP_INPUTINDEX", A[A.OP_ACTIVEBYTECODE = 193] = "OP_ACTIVEBYTECODE", A[A.OP_TXVERSION = 194] = "OP_TXVERSION", A[A.OP_TXINPUTCOUNT = 195] = "OP_TXINPUTCOUNT", A[A.OP_TXOUTPUTCOUNT = 196] = "OP_TXOUTPUTCOUNT", A[A.OP_TXLOCKTIME = 197] = "OP_TXLOCKTIME", A[A.OP_UTXOVALUE = 198] = "OP_UTXOVALUE", A[A.OP_UTXOBYTECODE = 199] = "OP_UTXOBYTECODE", A[A.OP_OUTPOINTTXHASH = 200] = "OP_OUTPOINTTXHASH", A[A.OP_OUTPOINTINDEX = 201] = "OP_OUTPOINTINDEX", A[A.OP_INPUTBYTECODE = 202] = "OP_INPUTBYTECODE", A[A.OP_INPUTSEQUENCENUMBER = 203] = "OP_INPUTSEQUENCENUMBER", A[A.OP_OUTPUTVALUE = 204] = "OP_OUTPUTVALUE", A[A.OP_OUTPUTBYTECODE = 205] = "OP_OUTPUTBYTECODE", A[A.OP_UTXOTOKENCATEGORY = 206] = "OP_UTXOTOKENCATEGORY", A[A.OP_UTXOTOKENCOMMITMENT = 207] = "OP_UTXOTOKENCOMMITMENT", A[A.OP_UTXOTOKENAMOUNT = 208] = "OP_UTXOTOKENAMOUNT", A[A.OP_OUTPUTTOKENCATEGORY = 209] = "OP_OUTPUTTOKENCATEGORY", A[A.OP_OUTPUTTOKENCOMMITMENT = 210] = "OP_OUTPUTTOKENCOMMITMENT", A[A.OP_OUTPUTTOKENAMOUNT = 211] = "OP_OUTPUTTOKENAMOUNT", A[A.OP_UNKNOWN212 = 212] = "OP_UNKNOWN212", A[A.OP_UNKNOWN213 = 213] = "OP_UNKNOWN213", A[A.OP_UNKNOWN214 = 214] = "OP_UNKNOWN214", A[A.OP_UNKNOWN215 = 215] = "OP_UNKNOWN215", A[A.OP_UNKNOWN216 = 216] = "OP_UNKNOWN216", A[A.OP_UNKNOWN217 = 217] = "OP_UNKNOWN217", A[A.OP_UNKNOWN218 = 218] = "OP_UNKNOWN218", A[A.OP_UNKNOWN219 = 219] = "OP_UNKNOWN219", A[A.OP_UNKNOWN220 = 220] = "OP_UNKNOWN220", A[A.OP_UNKNOWN221 = 221] = "OP_UNKNOWN221", A[A.OP_UNKNOWN222 = 222] = "OP_UNKNOWN222", A[A.OP_UNKNOWN223 = 223] = "OP_UNKNOWN223", A[A.OP_UNKNOWN224 = 224] = "OP_UNKNOWN224", A[A.OP_UNKNOWN225 = 225] = "OP_UNKNOWN225", A[A.OP_UNKNOWN226 = 226] = "OP_UNKNOWN226", A[A.OP_UNKNOWN227 = 227] = "OP_UNKNOWN227", A[A.OP_UNKNOWN228 = 228] = "OP_UNKNOWN228", A[A.OP_UNKNOWN229 = 229] = "OP_UNKNOWN229", A[A.OP_UNKNOWN230 = 230] = "OP_UNKNOWN230", A[A.OP_UNKNOWN231 = 231] = "OP_UNKNOWN231", A[A.OP_UNKNOWN232 = 232] = "OP_UNKNOWN232", A[A.OP_UNKNOWN233 = 233] = "OP_UNKNOWN233", A[A.OP_UNKNOWN234 = 234] = "OP_UNKNOWN234", A[A.OP_UNKNOWN235 = 235] = "OP_UNKNOWN235", A[A.OP_UNKNOWN236 = 236] = "OP_UNKNOWN236", A[A.OP_UNKNOWN237 = 237] = "OP_UNKNOWN237", A[A.OP_UNKNOWN238 = 238] = "OP_UNKNOWN238", A[A.OP_UNKNOWN239 = 239] = "OP_UNKNOWN239", A[A.OP_UNKNOWN240 = 240] = "OP_UNKNOWN240", A[A.OP_UNKNOWN241 = 241] = "OP_UNKNOWN241", A[A.OP_UNKNOWN242 = 242] = "OP_UNKNOWN242", A[A.OP_UNKNOWN243 = 243] = "OP_UNKNOWN243", A[A.OP_UNKNOWN244 = 244] = "OP_UNKNOWN244", A[A.OP_UNKNOWN245 = 245] = "OP_UNKNOWN245", A[A.OP_UNKNOWN246 = 246] = "OP_UNKNOWN246", A[A.OP_UNKNOWN247 = 247] = "OP_UNKNOWN247", A[A.OP_UNKNOWN248 = 248] = "OP_UNKNOWN248", A[A.OP_UNKNOWN249 = 249] = "OP_UNKNOWN249", A[A.OP_UNKNOWN250 = 250] = "OP_UNKNOWN250", A[A.OP_UNKNOWN251 = 251] = "OP_UNKNOWN251", A[A.OP_UNKNOWN252 = 252] = "OP_UNKNOWN252", A[A.OP_UNKNOWN253 = 253] = "OP_UNKNOWN253", A[A.OP_UNKNOWN254 = 254] = "OP_UNKNOWN254", A[A.OP_UNKNOWN255 = 255] = "OP_UNKNOWN255";
})(c || (c = {}));
var kt;
(function(A) {
  A[A.OP_BEGIN = 101] = "OP_BEGIN", A[A.OP_UNTIL = 102] = "OP_UNTIL";
})(kt || (kt = {}));
const mt = { ...c, ...kt };
var Ht;
Ht || (Ht = {});
const HB = { ...mt, ...Ht }, AQ = (A) => "malformed" in A, xI = (A) => A.length > 0 && // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
AQ(A[A.length - 1]), gQ = (A) => A.every((g) => "data" in g), ai = 1, si = 2, IQ = 4, eQ = (A, g) => {
  const I = new DataView(A.bin.buffer, A.index, g), e = !0;
  return g === ai ? I.getUint8(0) : g === si ? I.getUint16(0, e) : I.getUint32(0, e);
}, RB = (A) => ({
  76: ai,
  77: si,
  78: IQ
})[A] ?? 0, tQ = (A) => {
  const { bin: g, index: I } = A, e = g[I];
  if (e > 78)
    return {
      instruction: { opcode: e },
      position: { bin: g, index: I + 1 }
    };
  const t = RB(e);
  if (t !== 0 && I + t >= g.length) {
    const B = I + 1, C = B + t;
    return {
      instruction: {
        expectedLengthBytes: t,
        length: g.slice(B, C),
        malformed: !0,
        opcode: e
      },
      position: { bin: g, index: C }
    };
  }
  const i = t === 0 ? e : eQ({ bin: g, index: I + 1 }, t), n = I + 1 + t, o = n + i;
  return {
    instruction: {
      data: g.slice(n, o),
      ...o > g.length ? { expectedDataBytes: o - n, malformed: !0 } : void 0,
      opcode: e
    },
    position: { bin: g, index: o }
  };
}, eI = (A) => {
  const g = [];
  let I = 0;
  for (; I < A.length; ) {
    const { instruction: e, position: t } = tQ({
      bin: A,
      index: I
    });
    I = t.index, g.push(e);
  }
  return g;
}, an = (A) => A.length > 0 ? `0x${Z(A)}` : "", sn = (A) => `[missing ${A} byte${A === 1 ? "" : "s"}]`, iQ = (A) => "length" in A, UB = (A) => A >= 76, Qn = (A, g) => `${A[g.opcode] ?? "OP_UNKNOWN"} ${iQ(g) ? `${an(g.length)}${sn(g.expectedLengthBytes - g.length.length)}` : `${UB(g.opcode) ? `${g.expectedDataBytes} ` : ""}${an(g.data)}${sn(g.expectedDataBytes - g.data.length)}`}`, nQ = (A) => Object.entries(A).filter((g) => typeof g[1] == "number").reduce((g, I) => ({
  ...g,
  [I[0]]: Uint8Array.of(I[1])
}), {}), oQ = (A) => {
  const { opcode: g } = A, I = RB(g);
  return I === ai ? Uint8Array.of(A.data.length) : I === si ? gi(A.data.length) : yA(A.data.length);
}, BQ = (A) => Uint8Array.from([
  A.opcode,
  ..."data" in A ? [
    ...UB(A.opcode) ? oQ(A) : [],
    ...A.data
  ] : []
]), sI = (A) => EA(A.map(BQ));
var xg;
(function(A) {
  A.outOfRange = "Failed to decode VM Number: overflows VM Number range.", A.requiresMinimal = "Failed to decode VM Number: the number is not minimally-encoded.";
})(xg || (xg = {}));
const FB = (A) => A === xg.outOfRange || A === xg.requiresMinimal, cn = 8, GB = (A, { maximumVmNumberByteLength: g = cn, requireMinimalEncoding: I = !0 } = {
  maximumVmNumberByteLength: cn,
  requireMinimalEncoding: !0
}) => {
  if (A.length === 0)
    return 0n;
  if (A.length > g)
    return xg.outOfRange;
  const e = A[A.length - 1], t = A[A.length - 1 - 1];
  if (I && // eslint-disable-next-line no-bitwise
  (e & 127) === 0 && // eslint-disable-next-line no-bitwise, @typescript-eslint/no-non-null-assertion
  (A.length <= 1 || (t & 128) === 0))
    return xg.requiresMinimal;
  const o = 8, B = 128;
  let C = 0n;
  for (let E = 0; E < A.length; E++)
    C |= BigInt(A[E]) << BigInt(E * o);
  return (A[A.length - 1] & B) !== 0 ? -(C & ~(BigInt(B) << BigInt(o * (A.length - 1)))) : C;
}, VA = (A) => {
  if (A === 0n)
    return new Uint8Array();
  const g = [], I = A < 0, e = 255, t = 8;
  let i = I ? -A : A;
  for (; i > 0; )
    g.push(Number(i & BigInt(e))), i >>= BigInt(t);
  const n = 128;
  return (g[g.length - 1] & n) > 0 ? g.push(I ? n : 0) : I && (g[g.length - 1] |= n), new Uint8Array(g);
}, fg = (A) => {
  for (let I = 0; I < A.length; I++)
    if (A[I] !== 0)
      return !(I === A.length - 1 && A[I] === 128);
  return !1;
}, Dg = (A) => VA(A ? 1n : 0n), CQ = (A) => A <= 96, Rt = (A) => eI(A).every((I) => CQ(I.opcode)), he = (A) => A.length >= 1 && A[0] === 106 && Rt(A.slice(1)), rQ = (A, g) => {
  if (A < 1n)
    return 0n;
  const I = A * g / BigInt(
    1e3
    /* Dust.bytesPerKb */
  );
  return I === 0n ? 1n : I;
}, EQ = (A, g = BigInt(
  1e3
  /* Dust.standardDustRelayFee */
)) => {
  const I = A + 148;
  return BigInt(
    3
    /* Dust.minimumFeeMultiple */
  ) * rQ(BigInt(I), g);
}, YB = (A, g = BigInt(
  1e3
  /* Dust.standardDustRelayFee */
)) => {
  if (he(A.lockingBytecode))
    return 0n;
  const I = ue(A).length;
  return EQ(I, g);
}, aQ = (A, g = BigInt(
  1e3
  /* Dust.standardDustRelayFee */
)) => A.valueSatoshis < YB(A, g), sQ = (A) => A.length === 65 && A[0] === 4, QQ = (A) => A.length === 33 && (A[0] === 2 || A[0] === 3), QI = (A) => QQ(A) || sQ(A), un = (A) => A === 0 ? 0 : A === 79 ? -1 : !Number.isInteger(A) || A < 81 || A > 96 ? !1 : A - 80, PB = (A) => {
  const g = eI(A);
  if (xI(g))
    return !1;
  const I = g.length - 1;
  if (g.length < 4 || // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  g[I].opcode !== 174)
    return !1;
  const e = un(g[0].opcode), t = un(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    g[I - 1].opcode
  );
  if (t === !1 || e === !1)
    return !1;
  const i = g.slice(
    1,
    -2
    /* Multisig.keyEnd */
  );
  if (!gQ(i))
    return !1;
  const n = i.map((o) => o.data);
  return n.some((o) => !QI(o)) ? !1 : { m: e, n: t, publicKeys: n };
}, cQ = (A) => {
  const g = PB(A);
  if (g === !1)
    return !1;
  const { m: I, n: e } = g;
  return !(e < 1 || e > 3 || I < 1 || I > e);
}, uQ = (A) => ni(A) || Qe(A) || NB(A) || he(A) || cQ(A), hQ = (A) => uQ(A) || ce(A), dQ = (A) => ni(A) || Qe(A) || NB(A) || he(A) || PB(A) !== !1 || ce(A), lQ = (A) => {
  const g = A.length >= 4 && A.length <= 42, I = A[0] === 0 || // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  A[0] >= 81 && A[0] <= 96, e = (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A[1] + 2 === A.length
  );
  return g && I && e;
}, MB = (A) => (g) => {
  const I = A(g);
  return I.operationCount += 1, I;
}, Vg = (A) => A.controlStack.every((g) => g !== !1), k = (A) => (g) => Vg(g) ? A(g) : g, KB = (A, g) => Object.keys(g).reduce((I, e) => ({
  ...I,
  [e]: A.reduce(
    (t, i) => i(t),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    g[Number(e)]
  )
}), {}), sA = (A, g) => {
  const I = A.stack.pop();
  return I === void 0 ? q(A, F.emptyStack) : g(A, [I]);
}, GA = (A, g) => sA(A, (I, [e]) => sA(I, (t, [i]) => g(t, [i, e]))), Qi = (A, g) => sA(A, (I, [e]) => GA(I, (t, [i, n]) => g(t, [i, n, e]))), ci = (A, g) => GA(A, (I, [e, t]) => GA(I, (i, [n, o]) => g(i, [n, o, e, t]))), yQ = (A, g) => ci(A, (I, [e, t, i, n]) => GA(I, (o, [B, C]) => g(o, [
  B,
  C,
  e,
  t,
  i,
  n
]))), Tg = 8, HA = (A, g, { maximumVmNumberByteLength: I = Tg, requireMinimalEncoding: e = !0 } = {
  maximumVmNumberByteLength: Tg,
  requireMinimalEncoding: !0
}) => sA(A, (t, [i]) => {
  const n = GB(i, {
    maximumVmNumberByteLength: I,
    requireMinimalEncoding: e
  });
  return FB(n) ? q(A, F.invalidVmNumber, n) : g(t, [n]);
}), de = (A, g, { maximumVmNumberByteLength: I = Tg, requireMinimalEncoding: e = !0 } = {
  maximumVmNumberByteLength: Tg,
  requireMinimalEncoding: !0
}) => HA(A, (t, [i]) => HA(t, (n, [o]) => g(n, [o, i]), {
  maximumVmNumberByteLength: I,
  requireMinimalEncoding: e
}), {
  maximumVmNumberByteLength: I,
  requireMinimalEncoding: e
}), fQ = (A, g, { maximumVmNumberByteLength: I = Tg, requireMinimalEncoding: e = !0 } = {
  maximumVmNumberByteLength: Tg,
  requireMinimalEncoding: !0
}) => de(A, (t, [i, n]) => HA(t, (o, [B]) => g(o, [B, i, n]), {
  maximumVmNumberByteLength: I,
  requireMinimalEncoding: e
}), {
  maximumVmNumberByteLength: I,
  requireMinimalEncoding: e
}), z = (A, g, { pushedBytes: I = g.reduce((e, t) => e + t.length, 0) } = {}) => (A.stack.push(...g), A.metrics.stackPushedBytes += I, A), Zg = (A, g, { maximumStackItemLength: I = V.maximumStackItemLength } = {}) => g.length > I ? q(A, F.exceededMaximumStackItemLength, `Maximum stack item length: ${I}; item length: ${g.length} bytes.`) : (A.stack.push(g), A.metrics.stackPushedBytes += g.length, A), KA = (A, g) => z(A, [VA(g)]), ui = (A, g, { maximumVmNumberByteLength: I = V.maximumVmNumberByteLength, hasEncodingCost: e = !1 } = {}) => {
  const t = VA(g);
  return t.length > I ? q(A, F.overflowsVmNumberRange, `Maximum VM number byte length: ${I}; encoded number length: ${t.length}.`) : (A.metrics.arithmeticCost += e ? t.length : 0, z(A, [t]));
}, fI = (A, g) => (I) => g(A(I)), cI = (A) => (
  // eslint-disable-next-line no-bitwise, @typescript-eslint/no-magic-numbers
  1 + ((A + 8) / 64 | 0)
), DI = (A, { messageLength: g, resultIsHashed: I }, e) => {
  const t = cI(g), i = I ? 1 : 0, n = A.metrics.hashDigestIterations + t + i;
  return A.metrics.hashDigestIterations = n, e(A);
}, zg = (A) => sA(A, (g, [I]) => fg(I) ? g : q(g, F.failedVerify)), Ug = (A) => q(A, F.calledReserved), DQ = (A) => q(A, F.calledReturn), Lg = (A, g) => (A.controlStack.push(g), A), NQ = (A) => Vg(A) ? sA(A, (g, [I]) => Lg(g, fg(I))) : Lg(A, !1), SQ = (A) => Vg(A) ? sA(A, (g, [I]) => Lg(g, !fg(I))) : Lg(A, !1), pQ = (A) => typeof A.controlStack.pop() != "boolean" ? q(A, F.unexpectedEndIf) : A, wQ = (A) => {
  const g = A.controlStack[A.controlStack.length - 1];
  return typeof g != "boolean" ? q(A, F.unexpectedElse) : (A.controlStack[A.controlStack.length - 1] = !g, A);
}, hi = (A) => (g, { hasEncodingCost: I, maximumVmNumberByteLength: e }) => (t) => A(t, (i, n) => {
  const o = g(n);
  return ui(i, o, {
    hasEncodingCost: I,
    maximumVmNumberByteLength: e
  });
}, { maximumVmNumberByteLength: e }), Xg = hi(HA), qA = hi(de), kQ = hi(fQ), bB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => Xg(([g]) => g + 1n, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
bB();
const qB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => Xg(([g]) => g - 1n, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
qB();
const JB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => Xg(([g]) => -g, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
JB();
const xB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => Xg(([g]) => g < 0 ? -g : g, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
xB();
const TB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => Xg(([g]) => g === 0n ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
TB();
const LB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => Xg(([g]) => g === 0n ? 0n : 1n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
LB();
const OB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g + I, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
OB();
const vB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g - I, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
vB();
const VB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g !== 0n && I !== 0n ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
VB();
const ZB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g !== 0n || I !== 0n ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
ZB();
const di = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g === I ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
di();
const zB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => fI(di({ maximumVmNumberByteLength: A }), zg);
zB();
const XB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g === I ? 0n : 1n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
XB();
const li = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g < I ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
li();
const mQ = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g <= I ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
li();
const jB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g > I ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
jB();
const WB = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g >= I ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
WB();
const _B = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g < I ? g : I, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
_B();
const $B = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => qA(([g, I]) => g > I ? g : I, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
});
$B();
const AC = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => kQ(([g, I, e]) => I <= g && g < e ? 1n : 0n, {
  hasEncodingCost: !1,
  maximumVmNumberByteLength: A
});
AC();
const yi = (A, g) => {
  const [I, e] = A.stack.slice(
    -2
    /* Constants.lastTwoItems */
  ), t = I?.length ?? 0, i = e?.length ?? 0;
  return A.metrics.arithmeticCost += t * i, g(A);
}, gC = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => (g) => yi(g, qA(([I, e]) => I * e, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
}));
gC();
const fi = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => (g) => yi(g, () => de(g, (I, [e, t]) => t === 0n ? q(I, F.divisionByZero) : ui(I, e / t, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
}), { maximumVmNumberByteLength: A }));
fi();
const HQ = ({ maximumVmNumberByteLength: A = V.maximumVmNumberByteLength } = {}) => (g) => yi(g, () => de(g, (I, [e, t]) => t === 0n ? q(I, F.divisionByZero) : ui(I, e % t, {
  hasEncodingCost: !0,
  maximumVmNumberByteLength: A
}), { maximumVmNumberByteLength: A }));
fi();
const IC = (A) => GA(A, (g, [I, e]) => z(g, [
  Dg(re(I, e))
])), RQ = fI(IC, zg), Di = (A) => (g) => GA(g, (I, [e, t]) => e.length === t.length ? z(I, [A(e, t)]) : q(I, F.mismatchedBitwiseOperandLength, `First item length: ${e.length} bytes. Second item length: ${t.length} bytes.`)), UQ = Di((A, g) => A.map((I, e) => I & g[e])), FQ = Di((A, g) => A.map((I, e) => I | g[e])), GQ = Di((A, g) => A.map((I, e) => I ^ g[e])), YQ = k((A) => q(A, F.unknownOpcode)), eC = (A) => (
  // eslint-disable-next-line no-bitwise, @typescript-eslint/no-non-null-assertion
  (A & 128) !== 0
), PQ = (A, g, I) => A > 1 && g === 0 && !eC(I), hn = (A, g, I, e) => A[g] === 2 && I !== 0 && !eC(A[e]) && !PQ(I, A[e], A[e + 1]), tC = (A) => {
  const g = A.length > 8 && A.length < 72, I = A[
    0
    /* DER.sequenceTagIndex */
  ] === 48, e = A[
    1
    /* DER.sequenceLengthIndex */
  ] === A.length - 2, t = A[
    3
    /* DER.rLengthIndex */
  ];
  if (t === void 0)
    return !1;
  const i = t <= A.length - 7, n = hn(
    A,
    2,
    t,
    4
    /* DER.rValueIndex */
  ), o = 4 + t, B = o + 1, C = A[B];
  if (C === void 0)
    return !1;
  const r = B + 1, E = r + C === A.length, Q = hn(A, o, C, r);
  return g && I && e && i && n && E && Q;
}, Ut = (A, g) => A.length === 0 || g.includes(
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  A[A.length - 1]
) && (A.length === V.schnorrSignatureLength + 1 || tC(A.slice(0, A.length - 1))), Ft = (A) => ({
  signature: A.slice(0, -1),
  signingSerializationType: A.slice(-1)
}), MQ = ({ ripemd160: A } = {
  ripemd160: bA
}) => (g) => sA(g, (I, [e]) => DI(I, { messageLength: e.length, resultIsHashed: !1 }, (t) => z(t, [A.hash(e)]))), KQ = ({ sha1: A } = { sha1: yI }) => (g) => sA(g, (I, [e]) => DI(I, { messageLength: e.length, resultIsHashed: !1 }, (t) => z(t, [A.hash(e)]))), bQ = ({ sha256: A } = {
  sha256: gA
}) => (g) => sA(g, (I, [e]) => DI(I, { messageLength: e.length, resultIsHashed: !1 }, (t) => z(t, [A.hash(e)]))), qQ = ({ ripemd160: A, sha256: g } = { ripemd160: bA, sha256: gA }) => (I) => sA(I, (e, [t]) => DI(e, { messageLength: t.length, resultIsHashed: !0 }, (i) => z(i, [A.hash(g.hash(t))]))), JQ = ({ sha256: A } = {
  sha256: gA
}) => (g) => sA(g, (I, [e]) => DI(I, { messageLength: e.length, resultIsHashed: !0 }, (t) => z(t, [vA(e, A)]))), xQ = (A) => (A.lastCodeSeparator = A.ip, A), iC = ({ secp256k1: A, sha256: g } = { secp256k1: cA, sha256: gA }) => (I) => (
  // eslint-disable-next-line complexity
  GA(I, (e, [t, i]) => {
    if (!QI(i))
      return q(e, F.invalidPublicKeyEncoding);
    if (!Ut(t, wt))
      return q(e, F.invalidSignatureEncoding, `Transaction signature (including signing serialization): ${Z(t)}`);
    if (t.length === 0)
      return z(e, [Dg(!1)]);
    const n = sI(e.instructions.slice(e.lastCodeSeparator + 1)), { signingSerializationType: o, signature: B } = Ft(t), C = aI(e.program, { coveredBytecode: n, signingSerializationType: o }, g), r = vA(C, g);
    e.metrics.signatureCheckCount += 1;
    const E = 1;
    e.metrics.hashDigestIterations += E + cI(C.length), e.signedMessages.push({ digest: r, serialization: C });
    const Q = B.length === V.schnorrSignatureLength, a = Q ? A.verifySignatureSchnorr(B, i, r) : A.verifySignatureDERLowS(B, i, r);
    return a ? z(e, [Dg(a)]) : q(e, F.nonNullSignatureFailure, `Algorithm used: ${Q ? "Schnorr" : "ECDSA"}.`);
  })
), TQ = (A) => A.toString(
  2
  /* Multisig.binary */
).replace(/0/gu, "").length;
var Ie;
(function(A) {
  A.invalidBitfieldSize = "BitfieldDecode error: bitfield exceeds maximum length (32 bits).", A.bitsSetBeyondExpectedRange = "BitfieldDecode error: the decoded bitfield includes bits set beyond the expected range.";
})(Ie || (Ie = {}));
const LQ = (A, g) => {
  const I = Math.floor((g + 7) / 8);
  if (A.length !== I)
    return P(Ie.invalidBitfieldSize, `Bitfield length: ${A.length}, expected length: ${I}.`);
  let e = 0n;
  for (let i = 0; i < I; i++)
    e |= BigInt(A[i]) << BigInt(8 * i);
  const t = (1n << BigInt(g)) - 1n;
  return (e & t) !== e ? P(Ie.bitsSetBeyondExpectedRange, `Bitfield: ${e}, expected bit length: ${g}.`) : e;
}, Ni = ({ secp256k1: A, sha256: g, enforceOperationLimit: I } = {
  enforceOperationLimit: !0,
  secp256k1: cA,
  sha256: gA
}) => (e) => (
  // eslint-disable-next-line complexity
  HA(e, (t, i) => {
    const n = Number(i);
    if (n < 0)
      return q(t, F.invalidNaturalNumber, `Indicated public key count: ${n}.`);
    if (n > 20)
      return q(t, F.exceedsMaximumMultisigPublicKeyCount, `Indicated public key count: ${n}.`);
    const o = (
      // eslint-disable-next-line functional/immutable-data
      n > 0 ? t.stack.splice(-n) : []
    );
    return t.operationCount += n, I && t.operationCount > V.maximumOperationCount ? q(t, F.exceededMaximumOperationCount) : HA(t, (B, C) => {
      const r = Number(C);
      if (r < 0)
        return q(B, F.invalidNaturalNumber, `Indicated signature count: ${r}.`);
      if (r > n)
        return q(B, F.insufficientPublicKeys, `Indicated signature count: ${r}.`);
      const E = r > 0 ? (
        // eslint-disable-next-line functional/immutable-data
        B.stack.splice(-r)
      ) : [];
      return sA(
        B,
        // eslint-disable-next-line complexity
        (Q, [a]) => {
          const s = E.length > 0 ? sI(Q.instructions.slice(t.lastCodeSeparator + 1)) : Uint8Array.of();
          if (a.length !== 0) {
            const D = LQ(a, o.length);
            if (typeof D == "string")
              return q(Q, F.invalidCheckBitsValue, D);
            const G = TQ(D);
            if (G !== E.length)
              return q(Q, F.invalidCheckBitsSignatureCount, `CheckBits signatures configured: ${G}; signatures required: ${E.length}.`);
            let f = 0;
            for (let R = 0; R < E.length; R++, f++) {
              if (D >> BigInt(f) === 0n)
                return q(Q, "Expected to be unreachable: unexpected end of bitfield.");
              for (; (D >> BigInt(f) & 1n) === 0n; )
                f++;
              if (f >= o.length)
                return q(Q, "Expected to be unreachable: more set bits than available public keys.");
              const H = E[R], w = o[f];
              if (!QI(w))
                return q(Q, F.invalidPublicKeyEncoding, `Provided public key: ${Z(w)}`);
              if (!Ut(H, wt))
                return q(Q, F.invalidSignatureEncoding, `Transaction signature (including signing serialization type): ${Z(H)}`);
              const { signingSerializationType: K, signature: M } = Ft(H), U = aI(t.program, { coveredBytecode: s, signingSerializationType: K }, g), N = vA(U, g);
              Q.metrics.signatureCheckCount += 1;
              const S = 1;
              if (Q.metrics.hashDigestIterations += S + cI(U.length), Q.signedMessages.push({ digest: N, serialization: U }), M.length !== V.schnorrSignatureLength)
                return q(Q, F.nonSchnorrSizedSignatureInSchnorrMultiSig, `Provided signature: ${Z(M)}`);
              if (!A.verifySignatureSchnorr(M, w, N))
                return q(Q, F.nonNullSignatureFailure, `Algorithm used: 'Schnorr'. CheckBits: ${D.toString(
                  2
                  /* Multisig.binary */
                )}.`);
            }
            return D >> BigInt(f) !== 0n ? q(Q, "Expected to be unreachable: unexpected bits set after processing all signatures.") : z(Q, [Dg(!0)]);
          }
          let d = 0, h = E.length, u = o.length;
          for (; h > 0 && u > 0 && d + u >= h && d !== r; ) {
            const D = o[u - 1], G = (
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              E[h - 1]
            );
            if (!QI(D))
              return q(Q, F.invalidPublicKeyEncoding, `Provided public key: ${Z(D)}`);
            if (!Ut(G, wt))
              return q(Q, F.invalidSignatureEncoding, `Transaction signature (including signing serialization type): ${Z(G)}`);
            if (G.length === 0) {
              h -= 1;
              continue;
            }
            const { signingSerializationType: f, signature: R } = Ft(G), H = aI(t.program, { coveredBytecode: s, signingSerializationType: f }, g), w = vA(H, g), K = 1;
            if (Q.metrics.hashDigestIterations += K + cI(H.length), Q.signedMessages.push({ digest: w, serialization: H }), R.length === V.schnorrSignatureLength)
              return q(Q, F.schnorrSizedSignatureInEcdsaMultiSig, `Provided signature: ${Z(R)}`);
            A.verifySignatureDERLowS(R, D, w) && (d += 1, h -= 1), u -= 1;
          }
          const y = d === r;
          return !E.every((D) => D.length === 0) && (Q.metrics.signatureCheckCount += o.length, !y) ? q(Q, F.nonNullSignatureFailure) : z(Q, [Dg(y)]);
        }
      );
    });
  })
), OQ = ({ secp256k1: A, sha256: g } = { secp256k1: cA, sha256: gA }) => fI(iC({ secp256k1: A, sha256: g }), zg), nC = ({ enforceOperationLimit: A, secp256k1: g, sha256: I }) => fI(Ni({ enforceOperationLimit: A, secp256k1: g, sha256: I }), zg), vQ = (A) => A.length === 0 || A.length === V.schnorrSignatureLength || tC(A), oC = ({ secp256k1: A, sha256: g }) => (I) => (
  // eslint-disable-next-line complexity
  Qi(I, (e, [t, i, n]) => {
    if (!vQ(t))
      return q(e, F.invalidSignatureEncoding, `Data signature: ${Z(t)}`);
    if (!QI(n))
      return q(e, F.invalidPublicKeyEncoding, `Provided public key: ${Z(n)}`);
    if (t.length === 0)
      return z(I, [Dg(!1)]);
    const o = g.hash(i);
    e.metrics.signatureCheckCount += 1, e.metrics.hashDigestIterations += cI(i.length), e.signedMessages.push({ digest: o, message: i });
    const C = t.length === V.schnorrSignatureLength ? A.verifySignatureSchnorr(t, n, o) : A.verifySignatureDERLowS(t, n, o);
    return C ? z(e, [Dg(C)]) : q(e, F.nonNullSignatureFailure);
  })
), VQ = ({ secp256k1: A, sha256: g } = { secp256k1: cA, sha256: gA }) => fI(oC({ secp256k1: A, sha256: g }), zg), ZQ = (A) => sA(A, (g, [I]) => z(g, [I.slice().reverse()])), BC = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => GA(g, (I, [e, t]) => Zg(I, EA([e, t]), {
  maximumStackItemLength: A
}));
BC();
const zQ = (A) => HA(A, (g, I) => {
  const e = Number(I);
  return sA(g, (t, [i]) => e < 0 || e > i.length ? q(t, F.invalidSplitIndex, `stack item length: ${i.length}; requested split index: ${e}.`) : z(t, [i.slice(0, e), i.slice(e)]));
}), XQ = (A, g) => {
  let I = 0;
  A.length > 0 && (I = A[A.length - 1] & 128, A[A.length - 1] &= 127);
  const e = Array.from(A);
  for (; e.length < g - 1; )
    e.push(0);
  return e.push(I), Uint8Array.from(e);
}, CC = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => HA(g, (I, e) => {
  const t = Number(e);
  return t > A ? q(I, F.exceededMaximumStackItemLength, `Maximum stack item length: ${A} bytes. Item length: ${t} bytes.`) : HA(I, (i, [n]) => {
    const o = VA(n);
    return o.length > t ? q(i, F.insufficientLength, `Minimum necessary byte length: ${o.length}. Requested byte length: ${t}.`) : o.length === t ? z(i, [o]) : z(i, [
      XQ(o, t)
    ]);
  }, {
    maximumVmNumberByteLength: A,
    requireMinimalEncoding: !1
  });
});
CC();
const rC = ({ maximumStackItemLength: A = V.maximumStackItemLength, maximumVmNumberByteLength: g = V.maximumVmNumberByteLength } = {}) => (I) => HA(I, (e, [t]) => {
  const i = VA(t);
  return i.length > g ? q(e, F.exceededMaximumVmNumberByteLength, `Maximum VM number byte length: ${g}; required byte length: ${i.length}.`) : z(e, [i]);
}, {
  maximumVmNumberByteLength: A,
  requireMinimalEncoding: !1
});
rC();
const jQ = (A) => KA(A, BigInt(A.program.inputIndex)), EC = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => Zg(g, sI(g.instructions.slice(g.lastCodeSeparator + 1)), { maximumStackItemLength: A });
EC();
const WQ = (A) => KA(A, BigInt(Fa(A.program.transaction.version))), _Q = (A) => KA(A, BigInt(A.program.transaction.inputs.length)), $Q = (A) => KA(A, BigInt(A.program.transaction.outputs.length)), Ac = (A) => KA(A, BigInt(A.program.transaction.locktime)), NI = (A, g) => HA(A, (I, [e]) => {
  const t = I.program.sourceOutputs[Number(e)];
  return t === void 0 ? q(I, F.invalidTransactionUtxoIndex, `Transaction UTXO count: ${I.program.sourceOutputs.length}; requested index: ${e}.`) : g(A, [t]);
}), gc = (A) => NI(A, (g, [I]) => KA(g, I.valueSatoshis)), aC = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => NI(g, (I, [e]) => Zg(I, e.lockingBytecode.slice(), {
  maximumStackItemLength: A
}));
aC();
const le = (A, g) => HA(A, (I, [e]) => {
  const t = I.program.transaction.inputs[Number(e)];
  return t === void 0 ? q(I, F.invalidTransactionInputIndex, `Transaction input count: ${I.program.transaction.inputs.length}; requested index: ${e}.`) : g(A, [t]);
}), Ic = (A) => le(A, (g, [I]) => z(g, [I.outpointTransactionHash.slice().reverse()])), ec = (A) => le(A, (g, [I]) => KA(g, BigInt(I.outpointIndex))), sC = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => le(g, (I, [e]) => Zg(I, e.unlockingBytecode.slice(), {
  maximumStackItemLength: A
}));
sC();
const tc = (A) => le(A, (g, [I]) => KA(g, BigInt(I.sequenceNumber))), SI = (A, g) => HA(A, (I, [e]) => {
  const t = I.program.transaction.outputs[Number(e)];
  return t === void 0 ? q(I, F.invalidTransactionOutputIndex, `Transaction output count: ${I.program.transaction.outputs.length}; requested index: ${e}.`) : g(A, [t]);
}), ic = (A) => SI(A, (g, [I]) => KA(g, I.valueSatoshis)), QC = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => SI(g, (I, [e]) => Zg(I, e.lockingBytecode.slice(), {
  maximumStackItemLength: A
}));
QC();
const gg = (A) => A, ag = (A) => q(A, F.calledUpgradableNop), $g = (A) => q(A, F.unknownOpcode), cC = (A) => A.length <= 75 ? A.length === 0 ? Uint8Array.of(0) : A.length === 1 ? (
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  A[0] !== 0 && A[0] <= 16 ? Uint8Array.of(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A[0] + 80
    /* PushOperationConstants.pushNumberOpcodesOffset */
  ) : A[0] === 129 ? Uint8Array.of(
    79
    /* PushOperationConstants.OP_1NEGATE */
  ) : Uint8Array.from([1, ...A])
) : Uint8Array.from([A.length, ...A]) : A.length <= 255 ? Uint8Array.from([
  76,
  A.length,
  ...A
]) : A.length <= 65535 ? Uint8Array.from([
  77,
  ...gi(A.length),
  ...A
]) : Uint8Array.from([
  78,
  ...yA(A.length),
  ...A
]), nc = (A, g) => {
  if (g.length === 0)
    return A === 0;
  if (g.length === 1) {
    const I = g[0];
    if (I >= 1 && I <= 16)
      return A === I + 80;
    if (I === 129)
      return A === 79;
  }
  return g.length <= 75 ? A === g.length : g.length <= 255 ? A === 76 : g.length <= 65535 ? A === 77 : g.length <= 4294967295 ? A === 78 : !1;
}, oc = ({ maximumStackItemLength: A = V.maximumStackItemLength } = {}) => (g) => {
  const I = g.instructions[g.ip];
  return I.data.length > A ? q(g, F.exceededMaximumStackItemLength, `Maximum stack item length: ${A} bytes. Item length: ${I.data.length} bytes.`) : Vg(g) ? nc(I.opcode, I.data) ? z(g, [I.data]) : q(g, F.nonMinimalPush) : g;
}, fA = (A) => {
  const g = VA(BigInt(A));
  return (I) => z(I, [g]);
}, Bc = (A) => sA(A, (g, [I]) => (g.alternateStack.push(I), g)), Cc = (A) => {
  const g = A.alternateStack.pop();
  return g === void 0 ? q(A, F.emptyAlternateStack) : z(A, [g]);
}, rc = (A) => GA(A, (g) => g), Ec = (A) => GA(A, (g, [I, e]) => z(g, [I, e, I.slice(), e.slice()], {
  pushedBytes: I.length + e.length
})), ac = (A) => Qi(A, (g, [I, e, t]) => z(g, [I, e, t, I.slice(), e.slice(), t.slice()], {
  pushedBytes: I.length + e.length + t.length
})), sc = (A) => ci(A, (g, [I, e, t, i]) => z(g, [I, e, t, i, I.slice(), e.slice()], {
  pushedBytes: I.length + e.length
})), Qc = (A) => yQ(A, (g, [I, e, t, i, n, o]) => z(g, [t, i, n, o, I, e], {
  pushedBytes: I.length + e.length
})), cc = (A) => ci(A, (g, [I, e, t, i]) => z(g, [t, i, I, e], {
  pushedBytes: 0
})), uc = (A) => sA(A, (g, [I]) => fg(I) ? z(g, [I, I.slice()], {
  pushedBytes: I.length
}) : z(g, [I], {
  pushedBytes: 0
})), hc = (A) => z(A, [VA(BigInt(A.stack.length))]), dc = (A) => sA(A, (g) => g), lc = (A) => sA(A, (g, [I]) => z(g, [I, I.slice()], {
  pushedBytes: I.length
})), yc = (A) => GA(A, (g, [, I]) => z(g, [I], { pushedBytes: 0 })), fc = (A) => GA(A, (g, [I, e]) => z(g, [I, e, I.slice()], {
  pushedBytes: I.length
})), Dc = (A) => HA(A, (g, [I]) => {
  const e = g.stack[g.stack.length - 1 - Number(I)];
  return e === void 0 ? q(A, F.invalidStackIndex, `Current stack depth: ${g.stack.length}; requested depth: ${I}.`) : z(g, [e.slice()]);
}), Nc = (A) => HA(A, (g, [I]) => {
  const e = Number(I), t = g.stack.length - 1 - e;
  if (t < 0 || t > g.stack.length - 1)
    return q(A, F.invalidStackIndex, `Current stack depth: ${g.stack.length}; requested depth: ${e}.`);
  const i = g.stack.splice(t, 1)[0];
  return z(g, [i], { pushedBytes: i.length + e });
}), Sc = (A) => Qi(A, (g, [I, e, t]) => z(g, [e, t, I], {
  pushedBytes: 0
})), pc = (A) => GA(A, (g, [I, e]) => z(g, [e, I], {
  pushedBytes: 0
})), wc = (A) => GA(A, (g, [I, e]) => z(g, [e.slice(), I, e], {
  pushedBytes: e.length
})), kc = (A) => sA(A, (g, [I]) => {
  const e = VA(BigInt(I.length));
  return z(g, [I, e], {
    pushedBytes: e.length
  });
}), uC = (A, g) => {
  const I = A.stack[A.stack.length - 1];
  if (I === void 0)
    return q(A, F.emptyStack);
  const e = GB(I, {
    maximumVmNumberByteLength: 5,
    requireMinimalEncoding: !0
  });
  if (FB(e))
    return q(A, F.invalidVmNumber, e);
  const t = Number(e);
  return t < 0 ? q(A, F.negativeLocktime, `Locktime: ${t}.`) : g(A, t);
}, mc = (A, g) => A < 5e8 && g < 5e8 || A >= 5e8 && g >= 5e8, dn = (A) => uC(A, (g, I) => {
  if (!mc(g.program.transaction.locktime, I))
    return q(g, F.incompatibleLocktimeType, `Transaction locktime: ${g.program.transaction.locktime}; required locktime: ${I}.`);
  if (I > g.program.transaction.locktime)
    return q(g, F.unsatisfiedLocktime, `Transaction locktime: ${g.program.transaction.locktime}; required locktime: ${I}.`);
  const { sequenceNumber: e } = (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    g.program.transaction.inputs[g.program.inputIndex]
  );
  return e === 4294967295 ? q(g, F.locktimeDisabled, `Sequence number: ${e}.`) : g;
}), RI = (A, g) => (A & g) !== 0, ln = (A) => uC(
  A,
  // eslint-disable-next-line complexity
  (g, I) => {
    const { sequenceNumber: e } = (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      g.program.transaction.inputs[g.program.inputIndex]
    );
    return RI(
      I,
      2147483648
      /* Constants.sequenceLocktimeDisableFlag */
    ) ? g : g.program.transaction.version < 2 ? q(g, F.checkSequenceUnavailable, `Transaction version: ${g.program.transaction.version}.`) : RI(
      e,
      2147483648
      /* Constants.sequenceLocktimeDisableFlag */
    ) ? q(g, F.unmatchedSequenceDisable, `Sequence number: ${e}.`) : RI(
      I,
      4194304
      /* Constants.sequenceLocktimeTypeFlag */
    ) !== RI(
      e,
      4194304
      /* Constants.sequenceLocktimeTypeFlag */
    ) ? q(g, F.incompatibleSequenceType, `Sequence number: ${e}; required sequence number: ${I}.`) : (
      // eslint-disable-next-line no-bitwise
      (I & 65535) > // eslint-disable-next-line no-bitwise
      (e & 65535) ? q(g, F.unsatisfiedSequenceNumber, `Sequence number: ${e}; required sequence number: ${I}.`) : g
    );
  }
), Mg = {
  baseInstructionCost: 100,
  /**
   * The constant added to the unlocking bytecode length to determine a
   * contract's density control length (for operation cost and hashing budgets).
   */
  densityControlBaseLength: 41,
  hashDigestIterationCostConsensus: 64,
  hashDigestIterationCostStandard: 192,
  hashDigestIterationsPerByteNonstandard: 3.5,
  hashDigestIterationsPerByteStandard: 0.5,
  /**
   * A.K.A. `MAX_SCRIPT_SIZE`
   */
  maximumBytecodeLength: 1e4,
  maximumCommitmentLength: 40,
  /**
   * A.K.A. `MAX_CONSENSUS_VERSION`
   */
  maximumConsensusVersion: 2,
  maximumControlStackDepth: 100,
  /**
   * A.K.A. `MAX_OP_RETURN_RELAY`, `nMaxDatacarrierBytes`
   */
  maximumDataCarrierBytes: 223,
  maximumFungibleTokenAmount: "9223372036854775807",
  /**
   * A.K.A. `MAX_OPS_PER_SCRIPT`
   */
  maximumOperationCount: 201,
  /**
   * A.K.A. `MAX_STACK_SIZE`
   */
  maximumStackDepth: 1e3,
  /**
   * A.K.A. `MAX_SCRIPT_ELEMENT_SIZE`
   */
  maximumStackItemLength: 520,
  /**
   * A.K.A. `MAX_STANDARD_TX_SIZE`
   */
  maximumStandardTransactionSize: 1e5,
  /**
   * A.K.A. `MAX_TX_IN_SCRIPT_SIG_SIZE`
   */
  maximumStandardUnlockingBytecodeLength: 1650,
  /**
   * A.K.A. `MAX_TX_SIZE`
   */
  maximumTransactionLengthBytes: 1e6,
  /**
   * A.K.A. `MAX_TX_SIGCHECKS`
   */
  maximumTransactionSignatureChecks: 3e3,
  /**
   * A.K.A. `nMaxNumSize`
   */
  maximumVmNumberByteLength: 8,
  /**
   * A.K.A. `MIN_CONSENSUS_VERSION`
   */
  minimumConsensusVersion: 1,
  /**
   * Transactions smaller than 65 bytes are forbidden to prevent exploits of the
   * transaction Merkle tree design.
   *
   * A.K.A. `MIN_TX_SIZE`
   */
  minimumTransactionLengthBytes: 65,
  operationCostBudgetPerByte: 800,
  schnorrSignatureLength: 64,
  signatureCheckCost: 26e3
}, yn = (A) => (
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  Math.floor((A + 60) / 43)
);
var Gt;
(function(A) {
  A.OP_0 = "Push the VM Number 0 onto the stack. (A.K.A. OP_FALSE or OP_PUSHBYTES_0)", A.OP_PUSHBYTES_1 = "Push the next byte onto the stack.", A.OP_PUSHBYTES_2 = "Push the next 2 bytes onto the stack.", A.OP_PUSHBYTES_3 = "Push the next 3 bytes onto the stack.", A.OP_PUSHBYTES_4 = "Push the next 4 bytes onto the stack.", A.OP_PUSHBYTES_5 = "Push the next 5 bytes onto the stack.", A.OP_PUSHBYTES_6 = "Push the next 6 bytes onto the stack.", A.OP_PUSHBYTES_7 = "Push the next 7 bytes onto the stack.", A.OP_PUSHBYTES_8 = "Push the next 8 bytes onto the stack.", A.OP_PUSHBYTES_9 = "Push the next 9 bytes onto the stack.", A.OP_PUSHBYTES_10 = "Push the next 10 bytes onto the stack.", A.OP_PUSHBYTES_11 = "Push the next 11 bytes onto the stack.", A.OP_PUSHBYTES_12 = "Push the next 12 bytes onto the stack.", A.OP_PUSHBYTES_13 = "Push the next 13 bytes onto the stack.", A.OP_PUSHBYTES_14 = "Push the next 14 bytes onto the stack.", A.OP_PUSHBYTES_15 = "Push the next 15 bytes onto the stack.", A.OP_PUSHBYTES_16 = "Push the next 16 bytes onto the stack.", A.OP_PUSHBYTES_17 = "Push the next 17 bytes onto the stack.", A.OP_PUSHBYTES_18 = "Push the next 18 bytes onto the stack.", A.OP_PUSHBYTES_19 = "Push the next 19 bytes onto the stack.", A.OP_PUSHBYTES_20 = "Push the next 20 bytes onto the stack.", A.OP_PUSHBYTES_21 = "Push the next 21 bytes onto the stack.", A.OP_PUSHBYTES_22 = "Push the next 22 bytes onto the stack.", A.OP_PUSHBYTES_23 = "Push the next 23 bytes onto the stack.", A.OP_PUSHBYTES_24 = "Push the next 24 bytes onto the stack.", A.OP_PUSHBYTES_25 = "Push the next 25 bytes onto the stack.", A.OP_PUSHBYTES_26 = "Push the next 26 bytes onto the stack.", A.OP_PUSHBYTES_27 = "Push the next 27 bytes onto the stack.", A.OP_PUSHBYTES_28 = "Push the next 28 bytes onto the stack.", A.OP_PUSHBYTES_29 = "Push the next 29 bytes onto the stack.", A.OP_PUSHBYTES_30 = "Push the next 30 bytes onto the stack.", A.OP_PUSHBYTES_31 = "Push the next 31 bytes onto the stack.", A.OP_PUSHBYTES_32 = "Push the next 32 bytes onto the stack.", A.OP_PUSHBYTES_33 = "Push the next 33 bytes onto the stack.", A.OP_PUSHBYTES_34 = "Push the next 34 bytes onto the stack.", A.OP_PUSHBYTES_35 = "Push the next 35 bytes onto the stack.", A.OP_PUSHBYTES_36 = "Push the next 36 bytes onto the stack.", A.OP_PUSHBYTES_37 = "Push the next 37 bytes onto the stack.", A.OP_PUSHBYTES_38 = "Push the next 38 bytes onto the stack.", A.OP_PUSHBYTES_39 = "Push the next 39 bytes onto the stack.", A.OP_PUSHBYTES_40 = "Push the next 40 bytes onto the stack.", A.OP_PUSHBYTES_41 = "Push the next 41 bytes onto the stack.", A.OP_PUSHBYTES_42 = "Push the next 42 bytes onto the stack.", A.OP_PUSHBYTES_43 = "Push the next 43 bytes onto the stack.", A.OP_PUSHBYTES_44 = "Push the next 44 bytes onto the stack.", A.OP_PUSHBYTES_45 = "Push the next 45 bytes onto the stack.", A.OP_PUSHBYTES_46 = "Push the next 46 bytes onto the stack.", A.OP_PUSHBYTES_47 = "Push the next 47 bytes onto the stack.", A.OP_PUSHBYTES_48 = "Push the next 48 bytes onto the stack.", A.OP_PUSHBYTES_49 = "Push the next 49 bytes onto the stack.", A.OP_PUSHBYTES_50 = "Push the next 50 bytes onto the stack.", A.OP_PUSHBYTES_51 = "Push the next 51 bytes onto the stack.", A.OP_PUSHBYTES_52 = "Push the next 52 bytes onto the stack.", A.OP_PUSHBYTES_53 = "Push the next 53 bytes onto the stack.", A.OP_PUSHBYTES_54 = "Push the next 54 bytes onto the stack.", A.OP_PUSHBYTES_55 = "Push the next 55 bytes onto the stack.", A.OP_PUSHBYTES_56 = "Push the next 56 bytes onto the stack.", A.OP_PUSHBYTES_57 = "Push the next 57 bytes onto the stack.", A.OP_PUSHBYTES_58 = "Push the next 58 bytes onto the stack.", A.OP_PUSHBYTES_59 = "Push the next 59 bytes onto the stack.", A.OP_PUSHBYTES_60 = "Push the next 60 bytes onto the stack.", A.OP_PUSHBYTES_61 = "Push the next 61 bytes onto the stack.", A.OP_PUSHBYTES_62 = "Push the next 62 bytes onto the stack.", A.OP_PUSHBYTES_63 = "Push the next 63 bytes onto the stack.", A.OP_PUSHBYTES_64 = "Push the next 64 bytes onto the stack.", A.OP_PUSHBYTES_65 = "Push the next 65 bytes onto the stack.", A.OP_PUSHBYTES_66 = "Push the next 66 bytes onto the stack.", A.OP_PUSHBYTES_67 = "Push the next 67 bytes onto the stack.", A.OP_PUSHBYTES_68 = "Push the next 68 bytes onto the stack.", A.OP_PUSHBYTES_69 = "Push the next 69 bytes onto the stack.", A.OP_PUSHBYTES_70 = "Push the next 70 bytes onto the stack.", A.OP_PUSHBYTES_71 = "Push the next 71 bytes onto the stack.", A.OP_PUSHBYTES_72 = "Push the next 72 bytes onto the stack.", A.OP_PUSHBYTES_73 = "Push the next 73 bytes onto the stack.", A.OP_PUSHBYTES_74 = "Push the next 74 bytes onto the stack.", A.OP_PUSHBYTES_75 = "Push the next 75 bytes onto the stack.", A.OP_PUSHDATA_1 = "Read the next Uint8 and push that number of bytes onto the stack.", A.OP_PUSHDATA_2 = "Read the next little-endian Uint16 and push that number of bytes onto the stack.", A.OP_PUSHDATA_4 = "Read the next little-endian Uint32 and push that number of bytes onto the stack.", A.OP_1NEGATE = "Push the VM Number -1 onto the stack.", A.OP_RESERVED = "Error unless found in an unexecuted conditional branch. Note: OP_RESERVED does not count toward the opcode limit.", A.OP_1 = "Push a 1 (VM Number) onto the stack. (A.K.A. OP_TRUE)", A.OP_2 = "Push a 2 (VM Number) onto the stack.", A.OP_3 = "Push a 3 (VM Number) onto the stack.", A.OP_4 = "Push a 4 (VM Number) onto the stack.", A.OP_5 = "Push a 5 (VM Number) onto the stack.", A.OP_6 = "Push a 6 (VM Number) onto the stack.", A.OP_7 = "Push a 7 (VM Number) onto the stack.", A.OP_8 = "Push a 8 (VM Number) onto the stack.", A.OP_9 = "Push a 9 (VM Number) onto the stack.", A.OP_10 = "Push a 10 (VM Number) onto the stack.", A.OP_11 = "Push a 11 (VM Number) onto the stack.", A.OP_12 = "Push a 12 (VM Number) onto the stack.", A.OP_13 = "Push a 13 (VM Number) onto the stack.", A.OP_14 = "Push a 14 (VM Number) onto the stack.", A.OP_15 = "Push a 15 (VM Number) onto the stack.", A.OP_16 = "Push a 16 (VM Number) onto the stack.", A.OP_NOP = "No operation. Note: OP_NOP counts toward the opcode limit.", A.OP_VER = "Error unless found in an unexecuted conditional branch. Note: OP_VER counts toward the opcode limit. (Historically, this pushed a protocol version number to the stack.)", A.OP_IF = 'Pop the top item from the stack. If it is not "truthy", skip evaluation until a matching OP_ELSE or OP_ENDIF.', A.OP_NOTIF = 'Pop the top item from the stack. If it is "truthy", skip evaluation until a matching OP_ELSE or OP_ENDIF.', A.OP_VERIF = "Error, even when found in an unexecuted conditional branch. (Historically, this was a combination of OP_VER and OP_IF.)", A.OP_VERNOTIF = "Error, even when found in an unexecuted conditional branch. (Historically, this was a combination of OP_VER and OP_NOTIF.)", A.OP_ELSE = "Invert conditional evaluation within the current OP_IF ... OP_ENDIF block. (If evaluation is enabled, disable it, if it is disabled, enable it.)", A.OP_ENDIF = "End the current OP_IF/OP_NOTIF ... OP_ENDIF block.", A.OP_VERIFY = `Pop the top item from the stack and error if it isn't "truthy".`, A.OP_RETURN = "Error when executed.", A.OP_TOALTSTACK = "Pop the top item from the stack and push it onto the alternate stack.", A.OP_FROMALTSTACK = "Pop the top item from the alternate stack and push it onto the stack.", A.OP_2DROP = "Pop the top 2 items from the stack and discard them.", A.OP_2DUP = "Duplicate the top 2 items on the stack. (E.g. [a, b] -> [a, b, a, b])", A.OP_3DUP = "Duplicate the top 3 items on the stack. (E.g. [a, b, c] -> [a, b, c, a, b, c])", A.OP_2OVER = "Duplicate the 2 items beginning at a depth of 2 on the stack. (E.g. [a, b, c, d] -> [a, b, c, d, a, b])", A.OP_2ROT = "Rotate the top 6 items on the stack, bringing the fifth and sixth items to the top. (E.g. [a, b, c, d, e, f] -> [c, d, e, f, a, b])", A.OP_2SWAP = "Swap the positions of the top two pairs of items on the stack. (E.g. [a, b, c, d] -> [c, d, a, b])", A.OP_IFDUP = 'If the top item on the stack is "truthy", duplicate it.', A.OP_DEPTH = "Push the current number of stack items as a VM Number.", A.OP_DROP = "Pop the top item from the stack and discard it. (E.g. [a] -> [])", A.OP_DUP = "Duplicate the top item on the stack. (E.g. [a] -> [a, a])", A.OP_NIP = "Remove the second-to-top item from the stack. (E.g. [a, b] -> [b])", A.OP_OVER = "Duplicate the second-to-top item on the stack. (E.g. [a, b] -> [a, b, a])", A.OP_PICK = "Pop the top item from the stack as a VM Number. Duplicate the item at that depth (zero-indexed), placing it on top of the stack. (E.g. [a, b, c, 2] -> [a, b, c, a])", A.OP_ROLL = "Pop the top item from the stack as a VM Number. Move the item at that depth (zero-indexed) to the top of the stack. (E.g. [a, b, c, 2] -> [b, c, a])", A.OP_ROT = "Rotate the top 3 items on the stack, bringing the third item to the top. (E.g. [a, b, c] -> [b, c, a])", A.OP_SWAP = "Swap the top two items on the stack. (E.g. [a, b] -> [b, a])", A.OP_TUCK = "Duplicate the item at the top of the stack, inserting it below the second-to-top item. (E.g. [a, b] -> [b, a, b])", A.OP_CAT = "Pop the top 2 items from the stack and concatenate them, pushing the result.", A.OP_SPLIT = "Pop the top item from the stack as an index (VM Number) and the next item as a byte array. Split the byte array into two stack items at the index (zero-based), pushing the results.", A.OP_NUM2BIN = "Pop the top item from the stack as an item length (VM Number) and the next item as a VM Number (without encoding restrictions). Re-encode the number using a byte array of the provided length, filling any unused bytes with zeros, then push the result. (If the requested length is too short to encode the number, error.)", A.OP_BIN2NUM = "Pop the top item from the stack as a VM Number without encoding restrictions. Minimally-encode the number and push the result. (If the number can't be encoded within the maximum VM number length, error.)", A.OP_SIZE = "Push the byte-length of the top stack item as a VM Number.", A.OP_INVERT = "Error, even when found in an unexecuted conditional branch. (Historically, this flipped all the bits in a stack item.)", A.OP_AND = "Pop the top 2 items from the stack and perform a bitwise AND on each byte, pushing the result. If the length of the items are not equal, error.", A.OP_OR = "Pop the top 2 items from the stack and perform a bitwise OR on each byte, pushing the result. If the length of the items are not equal, error.", A.OP_XOR = "Pop the top 2 items from the stack and perform a bitwise XOR on each byte, pushing the result. If the length of the items are not equal, error.", A.OP_EQUAL = "Pop the top two items from the stack and compare them byte-by-byte. If they are the same, push a 1 (VM Number), otherwise push a 0 (VM Number).", A.OP_EQUALVERIFY = "Pop the top two items from the stack and compare them byte-by-byte. If the values are different, error. (This operation is a combination of OP_EQUAL followed by OP_VERIFY.)", A.OP_RESERVED1 = "Error unless found in an unexecuted conditional branch. Note: OP_RESERVED1 counts toward the opcode limit.", A.OP_RESERVED2 = "Error unless found in an unexecuted conditional branch. Note: OP_RESERVED2 counts toward the opcode limit.", A.OP_1ADD = "Pop the top item from the stack as a VM Number, add 1, then push the result.", A.OP_1SUB = "Pop the top item from the stack as a VM Number, subtract 1, then push the result.", A.OP_2MUL = "Error, even when found in an unexecuted conditional branch. (Historically, this multiplied a VM Number by 2.)", A.OP_2DIV = "Error, even when found in an unexecuted conditional branch. (Historically, this divided a VM Number by 2.)", A.OP_NEGATE = "Pop the top item from the stack as a VM Number, negate it, then push the result.", A.OP_ABS = "Pop the top item from the stack as a VM Number, take its absolute value, then push the result.", A.OP_NOT = "Pop the top item from the stack as a VM Number. If its value is 0, push a 1 (VM Number), otherwise, push a 0 (VM Number). (A.K.A. OP_0EQUAL)", A.OP_0NOTEQUAL = "Pop the top item from the stack as a VM Number. If its value is not 0, push a 1 (VM Number), otherwise, push a 0 (VM Number).", A.OP_ADD = "Pop the top two items from the stack as VM Numbers. Add them, then push the result.", A.OP_SUB = "Pop the top two items from the stack as VM Numbers. Subtract the top item from the second item, then push the result.", A.OP_MUL = "Pop the top two items from the stack as VM Numbers. Multiply them, then push the result.", A.OP_DIV = "Pop the top item from the stack as a denominator (VM Number) and the next as a numerator (VM Number). Divide and push the result to the stack.", A.OP_MOD = "Pop the top item from the stack as a denominator (VM Number) and the next as a numerator (VM Number). Divide and push the remainder to the stack.", A.OP_LSHIFT = "Error, even when found in an unexecuted conditional branch. (Historically, this performed a sign-preserving, left bit shift.)", A.OP_RSHIFT = "Error, even when found in an unexecuted conditional branch. (Historically, this performed a sign-preserving, right bit shift.)", A.OP_BOOLAND = "Pop the top two items from the stack as VM Numbers. If neither value is a 0 (VM Number), push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_BOOLOR = "Pop the top two items from the stack as VM Numbers. If either value is a 1 (VM Number), push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_NUMEQUAL = "Pop the top two items from the stack as VM Numbers. If the values are equal, push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_NUMEQUALVERIFY = "Pop the top two items from the stack as VM Numbers. If the values are different, error. (This operation is a combination of OP_NUMEQUAL followed by OP_VERIFY.)", A.OP_NUMNOTEQUAL = "Pop the top two items from the stack as VM Numbers. If the values are not equal, push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_LESSTHAN = "Pop the top two items from the stack as VM Numbers. If the second item is less than top item, push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_GREATERTHAN = "Pop the top two items from the stack as VM Numbers. If the second item is greater than top item, push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_LESSTHANOREQUAL = "Pop the top two items from the stack as VM Numbers. If the second item is less than or equal to the top item, push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_GREATERTHANOREQUAL = "Pop the top two items from the stack as VM Numbers. If the second item is greater than or equal to the top item, push a 1 (VM Number). Otherwise, push a 0 (VM Number).", A.OP_MIN = "Pop the top two items from the stack as VM Numbers. Push the smaller of the two numbers.", A.OP_MAX = "Pop the top two items from the stack as VM Numbers. Push the larger of the two numbers.", A.OP_WITHIN = "Pop the top three items from the stack as VM Numbers. If the top number is within the range defined by the following two numbers (left-inclusive), push a 1 (VM Number). Otherwise, push a 0 (VM Number). (E.g. for [a, b, c]: if (b <= a), and (a < c), [1]. Else [0].)", A.OP_RIPEMD160 = "Pop the top item from the stack and pass it through ripemd160, pushing the result onto the stack.", A.OP_SHA1 = "Pop the top item from the stack and pass it through sha1, pushing the result onto the stack.", A.OP_SHA256 = "Pop the top item from the stack and pass it through sha256, pushing the result onto the stack.", A.OP_HASH160 = "Pop the top item from the stack and pass it through sha256, then ripemd160, pushing the result onto the stack.", A.OP_HASH256 = "Pop the top item from the stack and pass it through sha256 twice, pushing the result onto the stack.", A.OP_CODESEPARATOR = "Update the value of lastCodeSeparator to the instruction pointer's current value. (This reduces the coverage of signing serializations used in signature verification operations.)", A.OP_CHECKSIG = "Pop the top two items from the stack. Treat the top as a signature and the second as a public key. If the signature is valid, push a 1 (VM Number), otherwise push a 0 (VM Number).", A.OP_CHECKSIGVERIFY = "Pop the top two items from the stack. Treat the top as a signature and the second as a public key. If the signature is not valid, error. (This operation is a combination of OP_CHECKSIG followed by OP_VERIFY.)", A.OP_CHECKMULTISIG = "Pop items from the stack: first pop the VM Number of public keys, then pop each of those public keys. Next, pop the VM Number of required signatures, then pop each of those signatures. Finally, pop a final VM Number that must be 0 due to a protocol bug. Checking each signature against each public key in order, if all signatures are valid – and the required number of signatures have been provided – push a 1 (VM Number), otherwise push a 0 (VM Number).", A.OP_CHECKMULTISIGVERIFY = "Pop items from the stack: first pop the VM Number of public keys, then pop each of those public keys. Next, pop the VM Number of required signatures, then pop each of those signatures. Finally, (due to a protocol bug) pop an unused final VM Number that must be 0. Checking each signature against each public key in order, if any signatures are invalid – or the required number of signatures have not been provided – error. (This operation is a combination of OP_CHECKMULTISIG followed by OP_VERIFY.)", A.OP_NOP1 = "No operation (reserved for future expansion). Note: OP_NOP1 counts toward the opcode limit.", A.OP_CHECKLOCKTIMEVERIFY = "Verify the transaction occurs after an absolute block time or height: read the top item on the stack as a VM Number (without removing it), and compare it to the transaction's locktime. If the required locktime has not passed, or if locktime has been disabled for this input by a maximized sequence number, error.", A.OP_CHECKSEQUENCEVERIFY = `Verify the transaction occurs after the output being spent has "aged" by a relative block time or block height since it was created: read the top item on the stack as a VM Number (without removing it), and compare it to the age encoded in the input's sequence number. If the required relative locktime has not passed, or if relative locktime has been disabled by the sequence number or the transaction version, error.`, A.OP_NOP4 = "No operation (reserved for future expansion). Note: OP_NOP4 counts toward the opcode limit.", A.OP_NOP6 = "No operation (reserved for future expansion). Note: OP_NOP6 counts toward the opcode limit.", A.OP_NOP5 = "No operation (reserved for future expansion). Note: OP_NOP5 counts toward the opcode limit.", A.OP_NOP7 = "No operation (reserved for future expansion). Note: OP_NOP7 counts toward the opcode limit.", A.OP_NOP8 = "No operation (reserved for future expansion). Note: OP_NOP8 counts toward the opcode limit.", A.OP_NOP9 = "No operation (reserved for future expansion). Note: OP_NOP9 counts toward the opcode limit.", A.OP_NOP10 = "No operation (reserved for future expansion). Note: OP_NOP10 counts toward the opcode limit.", A.OP_CHECKDATASIG = "Pop the top 3 items from the stack. Treat the top as a public key, the second as a message, and the third as a signature. If the signature is valid, push a 1 (VM Number), otherwise push a 0 (VM Number).", A.OP_CHECKDATASIGVERIFY = "Pop the top 3 items from the stack. Treat the top as a public key, the second as a message, and the third as a signature. If the signature is not valid, error. (This operation is a combination of OP_CHECKDATASIG followed by OP_VERIFY.)", A.OP_REVERSEBYTES = "Pop the top item from the stack and reverse it, pushing the result.", A.OP_INPUTINDEX = "Push the index of the input being evaluated to the stack as a VM Number.", A.OP_ACTIVEBYTECODE = "Push the bytecode currently being evaluated, beginning after the last executed OP_CODESEPARATOR, to the stack. For Pay-to-Script-Hash (P2SH) evaluations, this is the redeem bytecode of the Unspent Transaction Output (UTXO) being spent; for all other evaluations, this is the locking bytecode of the UTXO being spent.", A.OP_TXVERSION = "Push the version of the current transaction to the stack as a VM Number.", A.OP_TXINPUTCOUNT = "Push the count of inputs in the current transaction to the stack as a VM Number.", A.OP_TXOUTPUTCOUNT = "Push the count of outputs in the current transaction to the stack as a VM Number.", A.OP_TXLOCKTIME = "Push the locktime of the current transaction to the stack as a VM Number.", A.OP_UTXOVALUE = "Pop the top item from the stack as an input index (VM Number). Push the value (in satoshis) of the Unspent Transaction Output (UTXO) spent by that input to the stack as a VM Number.", A.OP_UTXOBYTECODE = "Pop the top item from the stack as an input index (VM Number). Push the full locking bytecode of the Unspent Transaction Output (UTXO) spent by that input to the stack.", A.OP_OUTPOINTTXHASH = "Pop the top item from the stack as an input index (VM Number). From that input, push the outpoint transaction hash – the hash of the transaction that created the Unspent Transaction Output (UTXO) that is being spent – to the stack in OP_HASH256 byte order.", A.OP_OUTPOINTINDEX = "Pop the top item from the stack as an input index (VM Number). From that input, push the outpoint index – the index of the output in the transaction that created the Unspent Transaction Output (UTXO) that is being spent – to the stack as a VM Number.", A.OP_INPUTBYTECODE = "Pop the top item from the stack as an input index (VM Number). Push the unlocking bytecode of the input at that index to the stack.", A.OP_INPUTSEQUENCENUMBER = "Pop the top item from the stack as an input index (VM Number). Push the sequence number of the input at that index to the stack as a VM Number.", A.OP_OUTPUTVALUE = "Pop the top item from the stack as an output index (VM Number). Push the value (in satoshis) of the output at that index to the stack as a VM Number.", A.OP_OUTPUTBYTECODE = "Pop the top item from the stack as an output index (VM Number). Push the locking bytecode of the output at that index to the stack.", A.OP_UTXOTOKENCATEGORY = "Pop the top item from the stack as an input index (VM Number). If the Unspent Transaction Output (UTXO) spent by that input includes no tokens, push a 0 (VM Number) to the stack. If the UTXO does not include a non-fungible token with a capability, push the UTXO's token category, otherwise, push the concatenation of the token category and capability, where the mutable capability is represented by 1 (VM Number) and the minting capability is represented by 2 (VM Number).", A.OP_UTXOTOKENCOMMITMENT = "Pop the top item from the stack as an input index (VM Number). Push the token commitment of the Unspent Transaction Output (UTXO) spent by that input to the stack. If the UTXO does not include a non-fungible token, or if it includes a non-fungible token with a zero-length commitment, push a 0 (VM Number).", A.OP_UTXOTOKENAMOUNT = "Pop the top item from the stack as an input index (VM Number). Push the fungible token amount of the Unspent Transaction Output (UTXO) spent by that input to the stack as a VM Number. If the UTXO includes no fungible tokens, push a 0 (VM Number).", A.OP_OUTPUTTOKENCATEGORY = "Pop the top item from the stack as an output index (VM Number). If the output spent by that input includes no tokens, push a 0 (VM Number) to the stack. If the output does not include a non-fungible token with a capability, push the output's token category, otherwise, push the concatenation of the token category and capability, where the mutable capability is represented by 1 (VM Number) and the minting capability is represented by 2 (VM Number).", A.OP_OUTPUTTOKENCOMMITMENT = "Pop the top item from the stack as an output index (VM Number). Push the token commitment of the output at that index to the stack. If the output does not include a non-fungible token, or if it includes a non-fungible token with a zero-length commitment, push a 0 (VM Number).", A.OP_OUTPUTTOKENAMOUNT = "Pop the top item from the stack as an output index (VM Number). Push the fungible token amount of the output at that index to the stack as a VM Number. If the output includes no fungible tokens, push a 0 (VM Number).";
})(Gt || (Gt = {}));
const Hc = F, Rc = (A) => A.reduce((g, I) => I.outpointIndex === 0 ? [...g, Z(I.outpointTransactionHash)] : g, []), Uc = (A) => A.reduce(
  // eslint-disable-next-line complexity
  (g, I) => {
    if (I.token === void 0)
      return g;
    const e = Z(I.token.category);
    return {
      availableImmutableTokens: [
        ...g.availableImmutableTokens,
        ...I.token.nft?.capability === "none" ? [
          {
            categoryHex: Z(I.token.category),
            commitmentHex: Z(I.token.nft.commitment)
          }
        ] : []
      ],
      availableMutableTokensByCategory: I.token.nft?.capability === "mutable" ? {
        ...g.availableMutableTokensByCategory,
        [e]: (g.availableMutableTokensByCategory[e] ?? 0) + 1
      } : g.availableMutableTokensByCategory,
      availableSumsByCategory: {
        ...g.availableSumsByCategory,
        [e]: (g.availableSumsByCategory[e] ?? 0n) + I.token.amount
      },
      inputMintingCategories: [
        ...g.inputMintingCategories,
        ...I.token.nft?.capability === "minting" ? [Z(I.token.category)] : []
      ]
    };
  },
  {
    availableImmutableTokens: [],
    availableMutableTokensByCategory: {},
    availableSumsByCategory: {},
    inputMintingCategories: []
  }
), Fc = (A) => A.reduce(
  // eslint-disable-next-line complexity
  (g, I) => {
    if (I.token === void 0)
      return g;
    const e = Z(I.token.category);
    return {
      outputImmutableTokens: [
        ...g.outputImmutableTokens,
        ...I.token.nft?.capability === "none" ? [
          {
            categoryHex: Z(I.token.category),
            commitmentHex: Z(I.token.nft.commitment)
          }
        ] : []
      ],
      outputMintingCategories: [
        ...g.outputMintingCategories,
        ...I.token.nft?.capability === "minting" ? [Z(I.token.category)] : []
      ],
      outputMutableTokensByCategory: I.token.nft?.capability === "mutable" ? {
        ...g.outputMutableTokensByCategory,
        [e]: (g.outputMutableTokensByCategory[e] ?? 0) + 1
      } : g.outputMutableTokensByCategory,
      outputSumsByCategory: {
        ...g.outputSumsByCategory,
        [e]: (g.outputSumsByCategory[e] ?? 0n) + I.token.amount
      }
    };
  },
  {
    outputImmutableTokens: [],
    outputMintingCategories: [],
    outputMutableTokensByCategory: {},
    outputSumsByCategory: {}
  }
), Gc = (A, g) => {
  const I = [...g, ...A.outputs].find((u) => u.token?.nft?.commitment !== void 0 && u.token.nft.commitment.length > Mg.maximumCommitmentLength);
  if (I !== void 0)
    return P(F.tokenValidationExcessiveCommitmentLength, `A token commitment exceeds the consensus limit of ${Mg.maximumCommitmentLength} bytes. Excessive token commitment length: ${// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    I.token.nft.commitment.length}`);
  const e = Rc(A.inputs), { availableSumsByCategory: t, availableMutableTokensByCategory: i, inputMintingCategories: n, availableImmutableTokens: o } = Uc(g), { outputSumsByCategory: B, outputMutableTokensByCategory: C, outputMintingCategories: r, outputImmutableTokens: E } = Fc(A.outputs), Q = [
    ...e,
    ...n
  ], a = r.find((u) => !Q.includes(u));
  if (a !== void 0)
    return P(F.tokenValidationInvalidMintingToken, `Invalid output minting token category: ${a}`);
  for (const [u, y] of Object.entries(B)) {
    if (y > BigInt(Mg.maximumFungibleTokenAmount))
      return P(F.tokenValidationExcessiveAmount, `Category: ${u}, total amount: ${y.toString()}. Consensus maximum amount: ${Mg.maximumFungibleTokenAmount}`);
    const l = t[u];
    if (l === void 0 && y > 0 && !e.includes(u))
      return P(F.tokenValidationInvalidFungibleMint, `Category: ${u}, tokens created: ${y}`);
    if (l !== void 0 && y > l)
      return P(F.tokenValidationOutputsExceedInputs, `Category: ${u}, input amount: ${l}, output amount: ${y}`);
  }
  const s = Object.entries(C).reduce((u, [y, l]) => Q.includes(y) ? u : { ...u, [y]: (u[y] ?? 0) - l }, i);
  for (const [u, y] of Object.entries(s))
    if (y < 0)
      return P(F.tokenValidationExcessiveMutableTokens, `Category: ${u}, excess mutable tokens: ${0 - y}`);
  const { unmatchedImmutableTokens: d } = E.reduce((u, y) => {
    const { categoryHex: l, commitmentHex: D } = y;
    if (Q.includes(l))
      return u;
    const G = o.findIndex((f) => f.categoryHex === l && f.commitmentHex === D);
    return G === -1 ? {
      availableImmutableTokens: u.availableImmutableTokens,
      unmatchedImmutableTokens: [...u.unmatchedImmutableTokens, y]
    } : (u.availableImmutableTokens.splice(G, 1), u);
  }, {
    availableImmutableTokens: o,
    unmatchedImmutableTokens: []
  }), h = d.reduce((u, y) => ({
    ...u,
    [y.categoryHex]: (u[y.categoryHex] ?? 0) + 1
  }), {});
  for (const [u, y] of Object.entries(h)) {
    const l = s[u] ?? 0;
    if (l < y)
      return P(F.tokenValidationExcessiveImmutableTokens, `Category ${u}, available mutable tokens: ${l}, new immutable tokens: ${y}`);
  }
  return !0;
}, hC = (A, g) => {
  const { token: I } = g;
  if (I === void 0)
    return KA(A, 0n);
  const e = I.nft?.capability === "minting" ? [
    2
    /* Constants.mintingCapabilityByte */
  ] : I.nft?.capability === "mutable" ? [
    1
    /* Constants.mutableCapabilityByte */
  ] : [], t = EA([
    I.category.slice().reverse(),
    Uint8Array.from(e)
  ]);
  return z(A, [t]);
}, dC = (A, g) => {
  const { token: I } = g;
  return I?.nft === void 0 ? KA(A, 0n) : Zg(A, I.nft.commitment);
}, lC = (A, g) => {
  const { token: I } = g;
  return I === void 0 ? KA(A, 0n) : KA(A, I.amount);
}, Yc = (A) => NI(A, (g, [I]) => hC(g, I)), Pc = (A) => NI(A, (g, [I]) => dC(g, I)), Mc = (A) => NI(A, (g, [I]) => lC(g, I)), Kc = (A) => SI(A, (g, [I]) => hC(g, I)), bc = (A) => SI(A, (g, [I]) => dC(g, I)), qc = (A) => SI(A, (g, [I]) => lC(g, I)), Jc = 1e8, xc = 21e6, UI = xc * Jc, Tc = (A = !0, { consensus: g = Mg, ripemd160: I, secp256k1: e, sha1: t, sha256: i } = {
  ripemd160: bA,
  secp256k1: cA,
  sha1: yI,
  sha256: gA
}) => {
  const n = oc(g);
  return {
    continue: (o) => o.error === void 0 && o.ip < o.instructions.length,
    // eslint-disable-next-line complexity
    evaluate: (o, { stateEvaluate: B, stateInitialize: C, stateOverride: r }) => {
      const { unlockingBytecode: E } = (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        o.transaction.inputs[o.inputIndex]
      ), { lockingBytecode: Q } = o.sourceOutputs[o.inputIndex], a = eI(E), s = eI(Q), d = {
        ...C(o),
        ...r,
        instructions: a,
        program: o,
        stack: []
      };
      if (E.length > g.maximumBytecodeLength)
        return q(d, F.exceededMaximumBytecodeLengthUnlocking, `Maximum bytecode length: ${g.maximumBytecodeLength} bytes. Unlocking bytecode length: ${E.length} bytes.`);
      if (xI(a))
        return q(d, F.malformedUnlockingBytecode, `Malformed instruction: ${Qn(c, a[a.length - 1])}.`);
      if (!Rt(E))
        return q(d, F.requiresPushOnly);
      if (Q.length > g.maximumBytecodeLength)
        return q(d, F.exceededMaximumBytecodeLengthLocking, `Maximum bytecode length: ${g.maximumBytecodeLength} bytes. Locking bytecode length: ${Q.length} bytes.`);
      if (xI(s))
        return q(d, F.malformedLockingBytecode, `Malformed instruction: ${Qn(c, s[s.length - 1])}.`);
      const h = B(d);
      if (h.error !== void 0)
        return h;
      if (h.controlStack.length !== 0)
        return q(h, F.nonEmptyControlStackUnlockingBytecode, `Remaining control stack depth: ${h.controlStack.length}.`);
      const u = B({
        ...C(o),
        ...r,
        instructions: s,
        metrics: h.metrics,
        program: o,
        stack: h.stack
      });
      if (u.controlStack.length !== 0)
        return q(u, F.nonEmptyControlStackLockingBytecode, `Remaining control stack depth: ${u.controlStack.length}.`);
      const y = Qe(Q), l = ce(Q);
      if (!y && !l)
        return u.stack.length !== 1 ? q(u, F.requiresCleanStackLockingBytecode, `Remaining stack depth: ${u.stack.length}.`) : u;
      const D = u.stack[u.stack.length - 1];
      if (!fg(D))
        return q(u, F.unmatchedP2shRedeemBytecode, `Top stack item: "${Z(D)}".`);
      const G = structuredClone(h.stack), f = G.pop() ?? Uint8Array.of();
      if (y && G.length === 0 && lQ(f))
        return u;
      const R = eI(f), H = xI(R) ? {
        ...u,
        error: F.malformedP2shBytecode
      } : B({
        ...C(o),
        ...r,
        instructions: R,
        metrics: u.metrics,
        program: o,
        stack: G
      });
      return H.controlStack.length !== 0 ? q(H, F.nonEmptyControlStackRedeemBytecode, `Remaining control stack depth: ${H.controlStack.length}.`) : H.stack.length !== 1 ? q(H, F.requiresCleanStackRedeemBytecode, `Remaining stack depth: ${H.stack.length}.`) : H;
    },
    every: (o) => {
      const { unlockingBytecode: B } = (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        o.program.transaction.inputs[o.program.inputIndex]
      );
      return o.metrics.maximumSignatureCheckCount = yn(B.length), A && o.metrics.signatureCheckCount > o.metrics.maximumSignatureCheckCount ? q(o, F.exceededMaximumSignatureCheckCount, `Maximum signature check count: ${o.metrics.maximumSignatureCheckCount}; signature check count following operation: ${o.metrics.signatureCheckCount}.`) : o.stack.length + o.alternateStack.length > g.maximumStackDepth ? q(o, F.exceededMaximumStackDepth, `Maximum stack depth: ${g.maximumStackDepth}.`) : o.operationCount > g.maximumOperationCount ? q(o, F.exceededMaximumOperationCount) : o;
    },
    initialize: (o) => {
      const { unlockingBytecode: B } = (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        o.transaction.inputs[o.inputIndex]
      ), C = g.densityControlBaseLength + B.length, r = A ? g.hashDigestIterationsPerByteStandard : g.hashDigestIterationsPerByteNonstandard;
      return {
        alternateStack: [],
        controlStack: [],
        ip: 0,
        lastCodeSeparator: -1,
        metrics: {
          arithmeticCost: 0,
          densityControlLength: C,
          evaluatedInstructionCount: 0,
          hashDigestIterations: 0,
          maximumHashDigestIterations: Math.floor(r * C),
          maximumOperationCost: Math.floor(C * g.operationCostBudgetPerByte),
          maximumSignatureCheckCount: yn(B.length),
          operationCost: 0,
          signatureCheckCount: 0,
          stackPushedBytes: 0
        },
        operationCount: 0,
        signedMessages: []
      };
    },
    operations: {
      [c.OP_0]: n,
      [c.OP_PUSHBYTES_1]: n,
      [c.OP_PUSHBYTES_2]: n,
      [c.OP_PUSHBYTES_3]: n,
      [c.OP_PUSHBYTES_4]: n,
      [c.OP_PUSHBYTES_5]: n,
      [c.OP_PUSHBYTES_6]: n,
      [c.OP_PUSHBYTES_7]: n,
      [c.OP_PUSHBYTES_8]: n,
      [c.OP_PUSHBYTES_9]: n,
      [c.OP_PUSHBYTES_10]: n,
      [c.OP_PUSHBYTES_11]: n,
      [c.OP_PUSHBYTES_12]: n,
      [c.OP_PUSHBYTES_13]: n,
      [c.OP_PUSHBYTES_14]: n,
      [c.OP_PUSHBYTES_15]: n,
      [c.OP_PUSHBYTES_16]: n,
      [c.OP_PUSHBYTES_17]: n,
      [c.OP_PUSHBYTES_18]: n,
      [c.OP_PUSHBYTES_19]: n,
      [c.OP_PUSHBYTES_20]: n,
      [c.OP_PUSHBYTES_21]: n,
      [c.OP_PUSHBYTES_22]: n,
      [c.OP_PUSHBYTES_23]: n,
      [c.OP_PUSHBYTES_24]: n,
      [c.OP_PUSHBYTES_25]: n,
      [c.OP_PUSHBYTES_26]: n,
      [c.OP_PUSHBYTES_27]: n,
      [c.OP_PUSHBYTES_28]: n,
      [c.OP_PUSHBYTES_29]: n,
      [c.OP_PUSHBYTES_30]: n,
      [c.OP_PUSHBYTES_31]: n,
      [c.OP_PUSHBYTES_32]: n,
      [c.OP_PUSHBYTES_33]: n,
      [c.OP_PUSHBYTES_34]: n,
      [c.OP_PUSHBYTES_35]: n,
      [c.OP_PUSHBYTES_36]: n,
      [c.OP_PUSHBYTES_37]: n,
      [c.OP_PUSHBYTES_38]: n,
      [c.OP_PUSHBYTES_39]: n,
      [c.OP_PUSHBYTES_40]: n,
      [c.OP_PUSHBYTES_41]: n,
      [c.OP_PUSHBYTES_42]: n,
      [c.OP_PUSHBYTES_43]: n,
      [c.OP_PUSHBYTES_44]: n,
      [c.OP_PUSHBYTES_45]: n,
      [c.OP_PUSHBYTES_46]: n,
      [c.OP_PUSHBYTES_47]: n,
      [c.OP_PUSHBYTES_48]: n,
      [c.OP_PUSHBYTES_49]: n,
      [c.OP_PUSHBYTES_50]: n,
      [c.OP_PUSHBYTES_51]: n,
      [c.OP_PUSHBYTES_52]: n,
      [c.OP_PUSHBYTES_53]: n,
      [c.OP_PUSHBYTES_54]: n,
      [c.OP_PUSHBYTES_55]: n,
      [c.OP_PUSHBYTES_56]: n,
      [c.OP_PUSHBYTES_57]: n,
      [c.OP_PUSHBYTES_58]: n,
      [c.OP_PUSHBYTES_59]: n,
      [c.OP_PUSHBYTES_60]: n,
      [c.OP_PUSHBYTES_61]: n,
      [c.OP_PUSHBYTES_62]: n,
      [c.OP_PUSHBYTES_63]: n,
      [c.OP_PUSHBYTES_64]: n,
      [c.OP_PUSHBYTES_65]: n,
      [c.OP_PUSHBYTES_66]: n,
      [c.OP_PUSHBYTES_67]: n,
      [c.OP_PUSHBYTES_68]: n,
      [c.OP_PUSHBYTES_69]: n,
      [c.OP_PUSHBYTES_70]: n,
      [c.OP_PUSHBYTES_71]: n,
      [c.OP_PUSHBYTES_72]: n,
      [c.OP_PUSHBYTES_73]: n,
      [c.OP_PUSHBYTES_74]: n,
      [c.OP_PUSHBYTES_75]: n,
      [c.OP_PUSHDATA_1]: n,
      [c.OP_PUSHDATA_2]: n,
      [c.OP_PUSHDATA_4]: n,
      [c.OP_1NEGATE]: k(fA(-1)),
      [c.OP_RESERVED]: k(Ug),
      [c.OP_1]: k(fA(1)),
      /* eslint-disable @typescript-eslint/no-magic-numbers */
      [c.OP_2]: k(fA(2)),
      [c.OP_3]: k(fA(3)),
      [c.OP_4]: k(fA(4)),
      [c.OP_5]: k(fA(5)),
      [c.OP_6]: k(fA(6)),
      [c.OP_7]: k(fA(7)),
      [c.OP_8]: k(fA(8)),
      [c.OP_9]: k(fA(9)),
      [c.OP_10]: k(fA(10)),
      [c.OP_11]: k(fA(11)),
      [c.OP_12]: k(fA(12)),
      [c.OP_13]: k(fA(13)),
      [c.OP_14]: k(fA(14)),
      [c.OP_15]: k(fA(15)),
      [c.OP_16]: k(fA(16)),
      /* eslint-enable @typescript-eslint/no-magic-numbers */
      ...KB([MB], {
        [c.OP_NOP]: k(gg),
        [c.OP_VER]: k(Ug),
        [c.OP_IF]: NQ,
        [c.OP_NOTIF]: SQ,
        [c.OP_VERIF]: Ug,
        [c.OP_VERNOTIF]: Ug,
        [c.OP_ELSE]: wQ,
        [c.OP_ENDIF]: pQ,
        [c.OP_VERIFY]: k(zg),
        [c.OP_RETURN]: k(DQ),
        [c.OP_TOALTSTACK]: k(Bc),
        [c.OP_FROMALTSTACK]: k(Cc),
        [c.OP_2DROP]: k(rc),
        [c.OP_2DUP]: k(Ec),
        [c.OP_3DUP]: k(ac),
        [c.OP_2OVER]: k(sc),
        [c.OP_2ROT]: k(Qc),
        [c.OP_2SWAP]: k(cc),
        [c.OP_IFDUP]: k(uc),
        [c.OP_DEPTH]: k(hc),
        [c.OP_DROP]: k(dc),
        [c.OP_DUP]: k(lc),
        [c.OP_NIP]: k(yc),
        [c.OP_OVER]: k(fc),
        [c.OP_PICK]: k(Dc),
        [c.OP_ROLL]: k(Nc),
        [c.OP_ROT]: k(Sc),
        [c.OP_SWAP]: k(pc),
        [c.OP_TUCK]: k(wc),
        [c.OP_CAT]: k(BC(g)),
        [c.OP_SPLIT]: k(zQ),
        [c.OP_NUM2BIN]: k(CC(g)),
        [c.OP_BIN2NUM]: k(rC(g)),
        [c.OP_SIZE]: k(kc),
        [c.OP_INVERT]: $g,
        [c.OP_AND]: k(UQ),
        [c.OP_OR]: k(FQ),
        [c.OP_XOR]: k(GQ),
        [c.OP_EQUAL]: k(IC),
        [c.OP_EQUALVERIFY]: k(RQ),
        [c.OP_RESERVED1]: k(Ug),
        [c.OP_RESERVED2]: k(Ug),
        [c.OP_1ADD]: k(bB(g)),
        [c.OP_1SUB]: k(qB(g)),
        [c.OP_2MUL]: $g,
        [c.OP_2DIV]: $g,
        [c.OP_NEGATE]: k(JB(g)),
        [c.OP_ABS]: k(xB(g)),
        [c.OP_NOT]: k(TB(g)),
        [c.OP_0NOTEQUAL]: k(LB(g)),
        [c.OP_ADD]: k(OB(g)),
        [c.OP_SUB]: k(vB(g)),
        [c.OP_MUL]: k(gC(g)),
        [c.OP_DIV]: k(fi(g)),
        [c.OP_MOD]: k(HQ(g)),
        [c.OP_LSHIFT]: $g,
        [c.OP_RSHIFT]: $g,
        [c.OP_BOOLAND]: k(VB(g)),
        [c.OP_BOOLOR]: k(ZB(g)),
        [c.OP_NUMEQUAL]: k(di(g)),
        [c.OP_NUMEQUALVERIFY]: k(zB(g)),
        [c.OP_NUMNOTEQUAL]: k(XB(g)),
        [c.OP_LESSTHAN]: k(li(g)),
        [c.OP_GREATERTHAN]: k(jB(g)),
        [c.OP_LESSTHANOREQUAL]: k(mQ(g)),
        [c.OP_GREATERTHANOREQUAL]: k(WB(g)),
        [c.OP_MIN]: k(_B(g)),
        [c.OP_MAX]: k($B(g)),
        [c.OP_WITHIN]: k(AC(g)),
        [c.OP_RIPEMD160]: k(MQ({ ripemd160: I })),
        [c.OP_SHA1]: k(KQ({ sha1: t })),
        [c.OP_SHA256]: k(bQ({ sha256: i })),
        [c.OP_HASH160]: k(qQ({ ripemd160: I, sha256: i })),
        [c.OP_HASH256]: k(JQ({ sha256: i })),
        [c.OP_CODESEPARATOR]: k(xQ),
        [c.OP_CHECKSIG]: k(iC({ secp256k1: e, sha256: i })),
        [c.OP_CHECKSIGVERIFY]: k(OQ({ secp256k1: e, sha256: i })),
        [c.OP_CHECKMULTISIG]: k(Ni({
          enforceOperationLimit: !0,
          secp256k1: e,
          sha256: i
        })),
        [c.OP_CHECKMULTISIGVERIFY]: k(nC({
          enforceOperationLimit: !0,
          secp256k1: e,
          sha256: i
        })),
        ...A ? {
          [c.OP_NOP1]: k(ag),
          [c.OP_CHECKLOCKTIMEVERIFY]: k(dn),
          [c.OP_CHECKSEQUENCEVERIFY]: k(ln),
          [c.OP_NOP4]: k(ag),
          [c.OP_NOP5]: k(ag),
          [c.OP_NOP6]: k(ag),
          [c.OP_NOP7]: k(ag),
          [c.OP_NOP8]: k(ag),
          [c.OP_NOP9]: k(ag),
          [c.OP_NOP10]: k(ag)
        } : {
          [c.OP_NOP1]: k(gg),
          [c.OP_CHECKLOCKTIMEVERIFY]: k(dn),
          [c.OP_CHECKSEQUENCEVERIFY]: k(ln),
          [c.OP_NOP4]: k(gg),
          [c.OP_NOP5]: k(gg),
          [c.OP_NOP6]: k(gg),
          [c.OP_NOP7]: k(gg),
          [c.OP_NOP8]: k(gg),
          [c.OP_NOP9]: k(gg),
          [c.OP_NOP10]: k(gg)
        },
        [c.OP_CHECKDATASIG]: k(oC({ secp256k1: e, sha256: i })),
        [c.OP_CHECKDATASIGVERIFY]: k(VQ({ secp256k1: e, sha256: i })),
        [c.OP_REVERSEBYTES]: k(ZQ),
        [c.OP_INPUTINDEX]: k(jQ),
        [c.OP_ACTIVEBYTECODE]: k(EC(g)),
        [c.OP_TXVERSION]: k(WQ),
        [c.OP_TXINPUTCOUNT]: k(_Q),
        [c.OP_TXOUTPUTCOUNT]: k($Q),
        [c.OP_TXLOCKTIME]: k(Ac),
        [c.OP_UTXOVALUE]: k(gc),
        [c.OP_UTXOBYTECODE]: k(aC(g)),
        [c.OP_OUTPOINTTXHASH]: k(Ic),
        [c.OP_OUTPOINTINDEX]: k(ec),
        [c.OP_INPUTBYTECODE]: k(sC(g)),
        [c.OP_INPUTSEQUENCENUMBER]: k(tc),
        [c.OP_OUTPUTVALUE]: k(ic),
        [c.OP_OUTPUTBYTECODE]: k(QC(g)),
        [c.OP_UTXOTOKENCATEGORY]: k(Yc),
        [c.OP_UTXOTOKENCOMMITMENT]: k(Pc),
        [c.OP_UTXOTOKENAMOUNT]: k(Mc),
        [c.OP_OUTPUTTOKENCATEGORY]: k(Kc),
        [c.OP_OUTPUTTOKENCOMMITMENT]: k(bc),
        [c.OP_OUTPUTTOKENAMOUNT]: k(qc)
      })
    },
    success: (o) => {
      if (o.error !== void 0)
        return o.error;
      const B = o.stack[o.stack.length - 1];
      return B === void 0 || !fg(B) ? P(F.unsuccessfulEvaluation, B === void 0 ? "Stack is empty." : `Top stack item: "${Z(B)}".`) : !0;
    },
    undefined: YQ,
    // eslint-disable-next-line complexity
    verify: ({ sourceOutputs: o, transaction: B }, { evaluate: C, success: r }) => {
      if (B.inputs.length === 0)
        return P(F.verifyFailedNoInputs);
      if (B.outputs.length === 0)
        return P(F.verifyFailedNoOutputs);
      if (B.inputs.length !== o.length)
        return P(F.verifyFailedMismatchedSourceOutputs, `Transaction input count: ${B.inputs.length}; source outputs count: ${o.length}.`);
      const E = SB(B).length;
      if (E < g.minimumTransactionLengthBytes)
        return P(F.verifyFailedInsufficientLength, `The transaction is ${E} bytes, but transactions must be no smaller than ${g.minimumTransactionLengthBytes} bytes to prevent an exploit of the transaction Merkle tree design.`);
      if (E > g.maximumTransactionLengthBytes)
        return P(F.verifyFailedExcessiveLength, `Transaction exceeds maximum byte length: the transaction is ${E} bytes, but the maximum transaction size is ${g.maximumTransactionLengthBytes} bytes.`);
      const Q = o.reduce((y, l) => y + l.valueSatoshis, 0n), a = B.outputs.reduce((y, l) => y + l.valueSatoshis, 0n);
      if (Q > UI)
        return P(F.verifyFailedInputsExceedMaxMoney, `Maximum supply in satoshis: ${UI}, cumulative input value: ${Q}.`);
      if (a > UI)
        return P(F.verifyFailedOutputsExceedMaxMoney, `Maximum supply in satoshis: ${UI}, cumulative output value: ${a}.`);
      if (a > Q)
        return P(F.verifyFailedOutputsExceedInputs, `Cumulative input value: ${Q}, cumulative output value: ${a}.`);
      const s = B.inputs.map((y) => `outpointTransactionHash: ${Z(y.outpointTransactionHash)}, outpointIndex: ${y.outpointIndex}`), d = s.find((y, l) => s.lastIndexOf(y) !== l);
      if (d !== void 0)
        return P(F.verifyFailedDuplicateSourceOutputs, d);
      if (B.version < g.minimumConsensusVersion || B.version > g.maximumConsensusVersion)
        return P(F.verifyFailedInvalidVersion, `Encoded version number: ${B.version}.`);
      if (A) {
        if (E > g.maximumStandardTransactionSize)
          return P(F.verifyStandardFailedExcessiveLength, `This transaction is ${E} bytes, but the maximum standard transaction size is ${g.maximumStandardTransactionSize} bytes.`);
        for (const [l, D] of o.entries())
          if (!dQ(D.lockingBytecode))
            return P(F.verifyStandardFailedNonstandardSourceOutput, `Source output ${l} is non-standard: locking bytecode does not match a standard pattern: P2PKH, P2PK, P2SH, P2MS, or arbitrary data (OP_RETURN).`);
        let y = 0;
        for (const [l, D] of B.outputs.entries()) {
          if (!hQ(D.lockingBytecode))
            return P(F.verifyStandardFailedNonstandardOutput, `Transaction output ${l} is non-standard: locking bytecode does not match a standard pattern: P2PKH, P2PK, P2SH, P2MS, or arbitrary data (OP_RETURN).`);
          if (he(D.lockingBytecode) && (y += D.lockingBytecode.length + 1), aQ(D))
            return P(F.verifyStandardFailedDustOutput, ` Transaction output ${l} must have a value of at least ${YB(D)} satoshis. Current value: ${D.valueSatoshis}`);
        }
        if (y > g.maximumDataCarrierBytes)
          return P(F.verifyStandardFailedExcessiveDataCarrierBytes, `Standard transactions may carry no more than ${g.maximumDataCarrierBytes} bytes in arbitrary data outputs; this transaction includes ${y} bytes of arbitrary data.`);
        for (const [l, D] of B.inputs.entries()) {
          if (D.unlockingBytecode.length > g.maximumStandardUnlockingBytecodeLength)
            return P(F.verifyStandardFailedExcessiveUnlockingBytecodeLength, `The maximum standard unlocking bytecode length is ${g.maximumStandardUnlockingBytecodeLength} bytes, but the unlocking bytecode at input index ${l} is ${D.unlockingBytecode.length} bytes.`);
          if (!Rt(D.unlockingBytecode))
            return P(F.verifyStandardFailedNonPushUnlockingBytecode, `The unlocking bytecode at input index ${l} contains non-push operations.`);
        }
      }
      const h = Gc(B, o);
      if (h !== !0)
        return h;
      let u = 0;
      for (const y of B.inputs.keys()) {
        const l = C({ inputIndex: y, sourceOutputs: o, transaction: B });
        if (u += l.metrics.signatureCheckCount, u > g.maximumTransactionSignatureChecks)
          return P(F.verifyFailedExcessiveSigChecks, `Transaction exceeded the per-transaction maximum of ${g.maximumTransactionSignatureChecks} signature checks while evaluating input index ${y} of ${B.inputs.length}.`);
        const D = r(l);
        if (typeof D == "string")
          return `Unable to verify transaction: error in evaluating input index ${y}: ${D}`;
      }
      return !0;
    }
  };
}, yC = (A, g = ["instructions", "program"], I = [
  "alternateStack",
  "controlStack",
  "signedMessages",
  "stack"
]) => Object.fromEntries(Object.entries(A).map(([e, t]) => g.includes(e) ? [e, t] : I.includes(e) ? [e, t.slice()] : [e, structuredClone(t)])), Lc = (A) => {
  const g = yC(A);
  return delete g.instructions, delete g.program, g.instruction = A.instructions[A.ip], g;
}, Oc = (A) => {
  const I = nB(256).map((f) => A.operations[f] ?? A.undefined), e = (f) => f.instructions[f.ip], t = (f) => (f.ip += 1, f), i = (f) => (f.metrics.evaluatedInstructionCount += 1, f), n = (f) => (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    I[e(f).opcode]
  ), o = ((f) => f), B = A.every ?? o, C = (f) => {
    const R = n(f);
    return t(B(i(R(f))));
  }, r = A.continue, E = (f, R) => {
    for (; r(f); )
      f = R(f);
    return f;
  }, Q = A.initialize ?? ((f) => ({ metrics: { evaluatedInstructionCount: 0 } })), a = yC, { success: s } = A, d = (f) => E(a(f), C), h = (f) => {
    const R = n(f);
    return t(B(i(R(a(f)))));
  }, u = (f) => {
    const R = [];
    return R.push(f), E(f, (H) => {
      const w = h(H);
      return R.push(w), w;
    }), R;
  }, y = (f) => C(a(f)), l = (f, { stateOverride: R } = {}) => A.evaluate(f, {
    stateEvaluate: d,
    stateInitialize: Q,
    stateOverride: R
  });
  return {
    debug: (f, { stateOverride: R, maskProgramState: H = !1 } = {}) => {
      const w = [], K = (N) => {
        const S = u(N);
        return w.push(...S), S[S.length - 1] ?? N;
      }, M = A.evaluate(f, {
        stateEvaluate: K,
        stateInitialize: Q,
        stateOverride: R
      }), U = [...w, M];
      return H ? U.map(Lc) : U;
    },
    evaluate: l,
    stateClone: a,
    stateContinue: r,
    stateDebug: u,
    stateEvaluate: d,
    stateInitialize: Q,
    stateStep: y,
    stateStepMutate: C,
    stateSuccess: s,
    verify: (f) => A.verify(f, {
      evaluate: l,
      initialize: Q,
      success: s
    })
  };
};
var Yt;
(function(A) {
  A.OP_BEGIN = "Push the current instruction pointer index to the control stack as an integer (to be read by OP_UNTIL).", A.OP_UNTIL = "Pop the top item from the control stack (if the control value is not an integer, error). Add the difference between the control value and the current instruction pointer index to the repeated bytes counter, if the sum of the repeated bytes counter and the active bytecode length is greater than the maximum bytecode length, error. Pop the top item from the stack, if the value is not truthy, move the instruction pointer to the control value (and re-evaluate the OP_BEGIN).";
})(Yt || (Yt = {}));
({
  ...Gt,
  ...Yt
});
var Pt;
(function(A) {
  A.excessiveHashing = "Program attempted a hashing operation that would exceed the hashing density limit.", A.excessiveOperationCost = "Program attempted an operation that would exceed the operation cost density limit.";
})(Pt || (Pt = {}));
const Pg = {
  ...Hc,
  ...Pt
};
var Mt;
(function(A) {
  A.unexpectedUntil = "Encountered an OP_UNTIL that is not following a matching OP_BEGIN.", A.unexpectedUntilMissingEndIf = "Encountered an OP_UNTIL before the previous OP_IF was closed by an OP_ENDIF.", A.excessiveLooping = "Program attempted an OP_UNTIL operation that would exceed the limit of repeated bytes.";
})(Mt || (Mt = {}));
const vc = {
  ...Pg,
  ...Mt
};
var Kt;
Kt || (Kt = {});
const Me = {
  ...vc,
  ...Kt
}, fC = {
  maximumStackItemLength: 1e4,
  maximumVmNumberByteLength: 1e4
};
BigInt(fC.maximumVmNumberByteLength);
const tI = {
  ...Mg,
  ...fC
}, Vc = (A, { baseInstructionCost: g = tI.baseInstructionCost, hashDigestIterationCost: I = tI.hashDigestIterationCostStandard, signatureCheckCost: e = tI.signatureCheckCost } = {}) => A.evaluatedInstructionCount * g + A.signatureCheckCount * e + A.hashDigestIterations * I + A.arithmeticCost + A.stackPushedBytes, Zc = (A = !0, { consensus: g = tI, ripemd160: I, secp256k1: e, sha1: t, sha256: i } = {
  ripemd160: bA,
  secp256k1: cA,
  sha1: yI,
  sha256: gA
}) => {
  const n = Tc(A, {
    consensus: g,
    ripemd160: I,
    secp256k1: e,
    sha1: t,
    sha256: i
  });
  return {
    ...n,
    // eslint-disable-next-line complexity
    every: (o) => (o.metrics.operationCost = Vc(o.metrics, {
      baseInstructionCost: g.baseInstructionCost,
      hashDigestIterationCost: A ? g.hashDigestIterationCostStandard : g.hashDigestIterationCostConsensus,
      signatureCheckCost: g.signatureCheckCost
    }), o.metrics.operationCost > o.metrics.maximumOperationCost ? q(o, Pg.excessiveOperationCost, `Maximum operation cost: ${o.metrics.maximumOperationCost} (density control length: ${o.metrics.densityControlLength}); operation cost following operation: ${o.metrics.operationCost}.`) : o.metrics.hashDigestIterations > o.metrics.maximumHashDigestIterations ? q(o, Pg.excessiveHashing, `Maximum hash digest iterations: ${o.metrics.maximumHashDigestIterations} (density control length: ${o.metrics.densityControlLength}); hash digest iterations following operation: ${o.metrics.hashDigestIterations}.`) : o.stack.length + o.alternateStack.length > g.maximumStackDepth ? q(o, Pg.exceededMaximumStackDepth, `Maximum stack depth: ${g.maximumStackDepth} items.`) : o.controlStack.length > g.maximumControlStackDepth ? q(o, Pg.exceededMaximumControlStackDepth, `Maximum control stack depth: ${g.maximumControlStackDepth}.`) : A && o.metrics.signatureCheckCount > o.metrics.maximumSignatureCheckCount ? q(o, Pg.exceededMaximumSignatureCheckCount, `Maximum signature check count: ${o.metrics.maximumSignatureCheckCount}; signature check count following operation: ${o.metrics.signatureCheckCount}.`) : o),
    operations: {
      ...n.operations,
      ...KB(
        /**
         * Note that tracking operation count is no longer required following
         * the `BCH_2025_05` upgrade; this implementation continues to track it
         * correctly for research and debugging.
         */
        [MB, k],
        {
          [c.OP_CHECKMULTISIG]: Ni({
            enforceOperationLimit: !1,
            secp256k1: e,
            sha256: i
          }),
          [c.OP_CHECKMULTISIGVERIFY]: nC({
            enforceOperationLimit: !1,
            secp256k1: e,
            sha256: i
          })
        }
      )
    }
  };
}, zc = (A) => Vg(A) ? Lg(A, A.ip) : Lg(
  A,
  -1
  /* Constants.markInactiveOpBegin */
), Xc = (A) => {
  const g = A.controlStack.pop();
  if (typeof g != "number")
    return q(A, Me.unexpectedUntil);
  if (!Vg(A))
    return g === -1 ? A : q(A, Me.unexpectedUntilMissingEndIf);
  A.repeatedBytes += sI(A.instructions.slice(g, A.ip)).length;
  const I = sI(A.instructions).length;
  return A.repeatedBytes + I > V.maximumBytecodeLength ? q(A, Me.excessiveLooping, `Repeated bytes: ${A.repeatedBytes}; active bytecode length: ${I}`) : sA(A, (e, [t]) => (fg(t) || (e.ip = g - 1), e));
}, jc = {}, DC = {
  ...tI,
  ...jc
}, Wc = (A = !0, { consensus: g = DC, ripemd160: I, secp256k1: e, sha1: t, sha256: i } = {
  ripemd160: bA,
  secp256k1: cA,
  sha1: yI,
  sha256: gA
}) => {
  const n = Zc(A, {
    consensus: g,
    ripemd160: I,
    secp256k1: e,
    sha1: t,
    sha256: i
  });
  return {
    ...n,
    initialize: (o) => ({
      ...n.initialize?.(o),
      repeatedBytes: 0
    }),
    operations: {
      ...n.operations,
      [mt.OP_BEGIN]: zc,
      [mt.OP_UNTIL]: Xc
    }
  };
}, _c = {
  /**
   * Because BCH_SPEC is used to compile CashAssembly internal evaluations,
   * setting a per-input overhead value equal to the current (BCH_2025)
   * `maximumBytecodeLength` ensures that any reasonable internal evaluation can
   * be compiled without exceeding operation cost limits.
   */
  densityControlBaseLength: 1e4,
  maximumBytecodeLength: 1e5,
  maximumStackItemLength: 1e5,
  maximumStandardUnlockingBytecodeLength: 1e5,
  maximumVmNumberByteLength: 1e5
}, $c = {
  ...DC,
  ..._c
}, Au = (A = !0, { consensus: g = $c, ripemd160: I, secp256k1: e, sha1: t, sha256: i } = {
  ripemd160: bA,
  secp256k1: cA,
  sha1: yI,
  sha256: gA
}) => {
  const n = Wc(A, {
    consensus: g,
    ripemd160: I,
    secp256k1: e,
    sha1: t,
    sha256: i
  }), o = (B) => B.reduce((C, r) => C + r.length, 0);
  return {
    ...n,
    every: (B) => {
      const C = n.every?.(B) ?? B, r = o(C.stack) + o(C.alternateStack);
      return C.metrics.maxMemoryUsage < r && (C.metrics.maxMemoryUsage = r), C;
    }
  };
}, gu = (A = !0) => Oc(Au(A)), Iu = HB, ye = (A) => {
  if (A.length !== 32 || A.every((e) => e === 0))
    return !1;
  const g = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 254, 186, 174, 220, 230, 175, 72, 160, 59, 191, 210, 94, 140, 208, 54, 65, 64], I = A.findIndex((e, t) => e !== g[t]);
  return I === -1 || // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  A[I] < g[I];
};
var TA;
(function(A) {
  A.childIndexExceedsMaximum = "HD node derivation error: child index exceeds maximum (4294967295).", A.requiresZeroDepthNode = "HD node derivation error: absolute derivation requires an HD node with a depth of 0.", A.hardenedDerivationRequiresPrivateNode = "HD node derivation error: derivation for hardened child indexes (indexes greater than or equal to 2147483648) requires an HD private node.", A.invalidAbsoluteDerivationPath = `HD node derivation error: invalid absolute derivation path; path must begin with "m" or "M" and contain only positive child index numbers, separated by forward slashes ("/"), with zero or one apostrophe ("'") after each child index number.`, A.invalidRelativeDerivationPath = `HD node derivation error: invalid relative derivation path; path must contain only positive child index numbers, separated by forward slashes ("/"), with zero or one apostrophe ("'") after each child index number.`, A.invalidDerivedKey = "HD node derivation error: an astronomically rare HMAC-SHA512 result produced an invalid Secp256k1 key.", A.invalidPrivateDerivationPrefix = 'HD node derivation error: private derivation paths must begin with "m".', A.invalidPublicDerivationPrefix = 'HD node derivation error: public derivation paths must begin with "M".';
})(TA || (TA = {}));
var MA;
(function(A) {
  A.incorrectLength = "HD key decoding error: length is incorrect (must encode 82 bytes).", A.invalidChecksum = "HD key decoding error: checksum is invalid.", A.invalidPublicKey = "HD key decoding error: the public key for this HD public node is not a valid Secp256k1 public key.", A.invalidPrivateKey = "HD key decoding error: the key for this HD private node is not a valid Secp256k1 private key.", A.missingPrivateKeyPaddingByte = "HD key decoding error: version indicates a private key, but the key data is missing a padding byte.", A.privateKeyExpected = "HD key decoding error: expected an HD private key, but encountered an HD public key.", A.publicKeyExpected = "HD key decoding error: expected an HD public key, but encountered an HD private key.", A.unknownCharacter = "HD key decoding error: key includes a non-base58 character.", A.unknownVersion = "HD key decoding error: key uses an unknown version.", A.zeroDepthWithNonZeroChildIndex = "HD key decoding error: key encodes a depth of zero with a non-zero child index.", A.zeroDepthWithNonZeroParentFingerprint = "HD key decoding error: key encodes a depth of zero with a non-zero parent fingerprint.";
})(MA || (MA = {}));
var Ig;
(function(A) {
  A.invalidChainCodeLength = "HD key encoding error: invalid chain code length. Chain code must be 32 bytes.", A.invalidChildDepth = "HD key encoding error: invalid child depth. Child depth must be between 0 and 255 (inclusive).", A.invalidChildIndex = "HD key encoding error: invalid child index. Child index must be between 0 and 4294967295 (inclusive).", A.invalidParentFingerprintLength = "HD key encoding error: invalid parent fingerprint length. Parent fingerprint must be 4 bytes.", A.invalidPrivateKeyLength = "HD key encoding error: invalid private key length. Secp256k1 private keys must be 32 bytes.", A.invalidPublicKeyLength = "HD key encoding error: invalid public key length. Public key must be 33 bytes (compressed).", A.invalidPublicKey = "HD key encoding error: the public key for this HD public node is not a valid Secp256k1 public key.", A.zeroDepthWithNonZeroChildIndex = "HD key encoding error: attempted to encode a zero depth key with a non-zero child index.", A.zeroDepthWithNonZeroParentFingerprint = "HD key encoding error: attempted to encode a zero depth key with a non-zero parent fingerprint.";
})(Ig || (Ig = {}));
const Si = Uint8Array.from([0, 0, 0, 0]), eu = uB("Bitcoin seed"), tu = (A, { assumeValidity: g, crypto: I = { sha512: Sg }, hmacSha512Key: e = eu, throwErrors: t = !0 } = {}) => {
  const i = ii(e, A, I.sha512), n = i.slice(
    0,
    32
    /* Bip32Constants.halfHmacSha512Length */
  ), o = i.slice(
    32
    /* Bip32Constants.halfHmacSha512Length */
  ), B = 0, C = 0, r = Si.slice(), E = g ?? ye(n);
  if (t && !E)
    throw new Error(TA.invalidDerivedKey);
  return E ? { chainCode: o, childIndex: C, depth: B, parentFingerprint: r, privateKey: n } : {
    chainCode: o,
    childIndex: C,
    depth: B,
    invalidMaterial: n,
    parentFingerprint: r
  };
}, iu = (A, { crypto: g = {
  ripemd160: bA,
  secp256k1: cA,
  sha256: gA
} } = {}) => {
  const I = g.secp256k1.derivePublicKeyCompressed(A.privateKey);
  return typeof I == "string" ? I : g.ripemd160.hash(g.sha256.hash(I));
}, nu = (A, { crypto: g = { ripemd160: bA, sha256: gA } } = {}) => g.ripemd160.hash(g.sha256.hash(A.publicKey));
var $A;
(function(A) {
  A[A.mainnetPrivateKey = 76066276] = "mainnetPrivateKey", A[A.mainnetPublicKey = 76067358] = "mainnetPublicKey", A[A.testnetPrivateKey = 70615956] = "testnetPrivateKey", A[A.testnetPublicKey = 70617039] = "testnetPublicKey";
})($A || ($A = {}));
const NC = (A) => A === $A.mainnetPublicKey || A === $A.testnetPublicKey, ou = (A) => A === $A.mainnetPrivateKey || A === $A.testnetPrivateKey, Bu = (A, { crypto: g = { secp256k1: cA, sha256: gA } } = {}) => {
  const I = fa(A);
  if (typeof I == "string")
    return P(MA.unknownCharacter, I);
  if (I.length !== 82)
    return P(MA.incorrectLength, `Length: ${I.length}.`);
  const e = I.slice(
    0,
    78
    /* Bip32Constants.hdKeyChecksumIndex */
  ), t = I.slice(
    78
    /* Bip32Constants.hdKeyChecksumIndex */
  ), i = g.sha256.hash(g.sha256.hash(e));
  if (!t.every((G, f) => G === i[f]))
    return P(MA.invalidChecksum, `Encoded: ${Z(t)}; computed: ${Z(i.slice(
      0,
      4
      /* Bip32Constants.hdKeyChecksumLength */
    ))}.`);
  const n = 4, o = 5, B = 9, C = 13, r = 45, E = new DataView(I.buffer, I.byteOffset, n).getUint32(0), Q = I[n], a = I.slice(o, B), s = new DataView(I.buffer, I.byteOffset + B, I.byteOffset + C).getUint32(0), d = I.slice(C, r), h = I.slice(
    r,
    78
    /* Bip32Constants.hdKeyChecksumIndex */
  ), u = ou(E);
  if (u && h[0] !== 0)
    return MA.missingPrivateKeyPaddingByte;
  if (u) {
    const G = h.slice(1);
    return {
      node: ye(G) ? {
        chainCode: d,
        childIndex: s,
        depth: Q,
        parentFingerprint: a,
        privateKey: G
      } : {
        chainCode: d,
        childIndex: s,
        depth: Q,
        invalidMaterial: G,
        parentFingerprint: a
      },
      version: E
    };
  }
  if (!NC(E))
    return P(MA.unknownVersion, `Version: ${E}`);
  const l = h;
  return {
    node: g.secp256k1.validatePublicKey(l) ? {
      chainCode: d,
      childIndex: s,
      depth: Q,
      parentFingerprint: a,
      publicKey: l
    } : {
      chainCode: d,
      childIndex: s,
      depth: Q,
      invalidMaterial: l,
      parentFingerprint: a
    },
    version: E
  };
}, SC = (A, { crypto: g = { secp256k1: cA, sha256: gA } } = {}) => {
  const I = Bu(A, { crypto: g });
  if (typeof I == "string")
    return I;
  const { node: e, version: t } = I;
  if (e.depth === 0) {
    if (e.childIndex !== 0)
      return P(MA.zeroDepthWithNonZeroChildIndex, `Child index: ${e.childIndex}.`);
    if (!re(e.parentFingerprint, Si))
      return P(MA.zeroDepthWithNonZeroParentFingerprint, `Parent fingerprint: ${e.parentFingerprint.join(",")}.`);
  }
  const i = NC(t);
  return "invalidMaterial" in e ? i ? P(MA.invalidPublicKey, `Invalid public key: ${Z(e.invalidMaterial)}.`) : P(MA.invalidPrivateKey) : { network: t === $A.mainnetPrivateKey || t === $A.mainnetPublicKey ? "mainnet" : "testnet", node: e };
}, pC = (A, { crypto: g = { secp256k1: cA, sha256: gA } } = {}) => {
  const I = SC(A, { crypto: g });
  if (typeof I == "string")
    return I;
  const { network: e, node: t } = I;
  return "publicKey" in t ? MA.privateKeyExpected : { network: e, node: t };
}, ee = (A, { crypto: g = { secp256k1: cA, sha256: gA } } = {}) => {
  const I = SC(A, { crypto: g });
  if (typeof I == "string")
    return I;
  const { network: e, node: t } = I;
  return "privateKey" in t ? MA.publicKeyExpected : { network: e, node: t };
}, Cu = ({ version: A, keyParameters: g, throwErrors: I = !0 }) => {
  if (g.node.depth === 0) {
    if (g.node.childIndex !== 0)
      return P(Ig.zeroDepthWithNonZeroChildIndex, `Child index: ${g.node.childIndex}.`, I);
    if (!re(g.node.parentFingerprint, Si))
      return P(Ig.zeroDepthWithNonZeroParentFingerprint, `Parent fingerprint: ${g.node.parentFingerprint.join(",")}.`, I);
  }
  if (g.node.chainCode.length !== 32)
    return P(Ig.invalidChainCodeLength, `Chain code length: ${g.node.chainCode.length}.`, I);
  if (g.node.parentFingerprint.length !== 4)
    return P(Ig.invalidParentFingerprintLength, `Parent fingerprint length: ${g.node.parentFingerprint.length}.`, I);
  if (g.node.depth < 0 || g.node.depth > 255)
    return P(Ig.invalidChildDepth, `Depth: ${g.node.depth}.`, I);
  const e = Uint8Array.of(g.node.depth);
  if (g.node.childIndex < 0 || g.node.childIndex > 4294967295)
    return P(Ig.invalidChildIndex, `Child index: ${g.node.childIndex}.`, I);
  const t = Ee(g.node.childIndex);
  return EA([
    A,
    e,
    g.node.parentFingerprint,
    t,
    g.node.chainCode
  ]);
}, ru = (A, { throwErrors: g = !0 } = {}) => {
  const I = Ee(A.network === "mainnet" ? $A.mainnetPrivateKey : $A.testnetPrivateKey);
  if (A.node.privateKey.length !== 32)
    return P(Ig.invalidPrivateKeyLength, `Private key length: ${A.node.privateKey.length}.`, g);
  const e = Cu({
    keyParameters: A,
    throwErrors: g,
    version: I
  });
  if (typeof e == "string")
    return e;
  const t = Uint8Array.of(0);
  return EA([
    e,
    t,
    A.node.privateKey
  ]);
}, Eu = (A, { crypto: g = { sha256: gA } } = {}) => {
  const e = g.sha256.hash(g.sha256.hash(A)).slice(0, 4);
  return Da(EA([A, e]));
}, au = (A, { crypto: g = { sha256: gA }, throwErrors: I = !0 } = {}) => {
  const e = ru(A, { throwErrors: I });
  return typeof e == "string" ? e : { hdPrivateKey: Eu(e, { crypto: g }) };
}, su = (A, g, { crypto: I = {
  ripemd160: bA,
  secp256k1: cA,
  sha256: gA,
  sha512: Sg
}, throwErrors: e = !0, returnInvalidNodes: t = !1 } = {}) => {
  if (g > 4294967295)
    return P(TA.childIndexExceedsMaximum, `Child index: ${g}.`, e);
  const n = iu(A, { crypto: I }), o = n.slice(
    0,
    4
    /* Bip32Constants.parentFingerprintLength */
  ), B = A.depth + 1, r = g >= 2147483648, E = r ? A.privateKey : I.secp256k1.derivePublicKeyCompressed(A.privateKey), Q = Uint8Array.from([
    ...r ? [0] : [],
    ...E,
    ...Ee(g)
  ]), a = ii(A.chainCode, Q, I.sha512), s = 32, d = a.slice(0, s), h = a.slice(s), u = I.secp256k1.addTweakPrivateKey(A.privateKey, d);
  if (typeof u == "string") {
    const y = P(TA.invalidDerivedKey, `Invalid child index: ${g}.`, e);
    return t ? {
      chainCode: h,
      childIndex: g,
      depth: B,
      invalidMaterial: d,
      parentFingerprint: o,
      parentIdentifier: n
    } : y;
  }
  return {
    chainCode: h,
    childIndex: g,
    depth: B,
    parentFingerprint: o,
    parentIdentifier: n,
    privateKey: u
  };
}, wC = (A, g, { crypto: I = {
  ripemd160: bA,
  secp256k1: cA,
  sha256: gA,
  sha512: Sg
}, returnInvalidNodes: e = !1, throwErrors: t = !0 } = {}) => {
  if (g >= 2147483648)
    return P(TA.hardenedDerivationRequiresPrivateNode, `Requested index: ${g}.`, t);
  const n = nu(A, { crypto: I }), o = n.slice(
    0,
    4
    /* Bip32Constants.parentFingerprintLength */
  ), B = A.depth + 1, C = Uint8Array.from([
    ...A.publicKey,
    ...Ee(g)
  ]), r = ii(A.chainCode, C, I.sha512), E = 32, Q = r.slice(0, E), a = r.slice(E), s = I.secp256k1.addTweakPublicKeyCompressed(A.publicKey, Q);
  if (typeof s == "string") {
    const d = P(TA.invalidDerivedKey, `Invalid child index: ${g}.`, t);
    return e ? {
      chainCode: a,
      childIndex: g,
      depth: B,
      invalidMaterial: Q,
      parentFingerprint: o,
      parentIdentifier: n
    } : d;
  }
  return {
    chainCode: a,
    childIndex: g,
    depth: B,
    parentFingerprint: o,
    parentIdentifier: n,
    publicKey: s
  };
}, pi = (A, g, { crypto: I = {
  ripemd160: bA,
  secp256k1: cA,
  sha256: gA,
  sha512: Sg
}, throwErrors: e = !0 } = {}) => {
  if (g === "")
    return A;
  if (!/^(?:[0-9]+'?)(?:\/[0-9]+'?)*$/u.test(g))
    return P(TA.invalidRelativeDerivationPath, `Invalid path: "${g}".`, e);
  const i = g.split("/"), n = "privateKey" in A, o = 10, B = 2147483648, C = i.map((r) => r.endsWith("'") ? parseInt(r.slice(0, -1), o) + B : parseInt(r, o));
  return n ? C.reduce((r, E) => typeof r == "string" ? r : su(r, E, {
    crypto: I,
    throwErrors: e
  }), A) : C.reduce((r, E) => typeof r == "string" ? r : wC(r, E, {
    crypto: I,
    throwErrors: e
  }), A);
}, Qu = (A, g, { crypto: I = {
  ripemd160: bA,
  secp256k1: cA,
  sha256: gA,
  sha512: Sg
}, throwErrors: e = !0 } = {}) => {
  if (A.depth !== 0)
    return P(TA.requiresZeroDepthNode, `Depth of provided HD node: ${A.depth}.`, e);
  if (!/^[mM](?:\/[0-9]+'?)*$/u.test(g))
    return P(TA.invalidAbsoluteDerivationPath, `Invalid path: "${g}".`, e);
  const i = g.split("/"), n = "privateKey" in A;
  if (n && i[0] !== "m")
    return P(TA.invalidPrivateDerivationPrefix, `Invalid path: "${g}".`, e);
  if (!n && i[0] !== "M")
    return P(TA.invalidPublicDerivationPrefix, `Invalid path: "${g}".`, e);
  if (i.length === 1)
    return A;
  const o = i.slice(1).join("/");
  return pi(A, o, {
    crypto: I,
    throwErrors: e
  });
};
var fn;
(function(A) {
  A.cannotCrackHardenedDerivation = "HD node cracking error: cannot crack an HD parent node using hardened child node.";
})(fn || (fn = {}));
var bt;
(function(A) {
  A.duplicateResults = 'Entropy generation error: the "getRandomValues" function provided by this JavaScript environment returned duplicate results across two evaluations; entropy generation was halted for safety.', A.insufficientEntropy = "Entropy generation error: the provided list of events contains insufficient entropy.";
})(bt || (bt = {}));
const cu = (A, g = crypto) => g.getRandomValues(new Uint8Array(A)), uu = (A, g = cu) => {
  const I = g(A), e = g(A);
  return I === e || re(I, e) ? P(bt.duplicateResults, `First result: [${String(I)}]; second result: [${String(e)}].`, !0) : I;
}, hu = () => uu(
  32
  /* KeyUtilConstants.privateKeyLength */
), Dn = (A = hu) => {
  let g;
  do
    g = A();
  while (!ye(g));
  return g;
};
var ug;
(function(A) {
  A.opcode = "opcode", A.variable = "variable", A.script = "script";
})(ug || (ug = {}));
var iI;
(function(A) {
  A.unknown = "unknown", A.variable = "variable", A.script = "script";
})(iI || (iI = {}));
const FI = (A) => ({
  startColumn: A.startColumn,
  startLineNumber: A.startLineNumber
}), GI = (A) => ({
  endColumn: A.endColumn,
  endLineNumber: A.endLineNumber
}), du = (A, g = {
  endColumn: 0,
  endLineNumber: 0,
  startColumn: 0,
  startLineNumber: 0
}) => {
  const e = A.length < 2 ? A.length === 1 ? (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A[0]
  ) : g : A.reduce(
    // eslint-disable-next-line complexity
    (t, i) => ({
      ...i.endLineNumber > t.endLineNumber || i.endLineNumber === t.endLineNumber && i.endColumn > t.endColumn ? GI(i) : GI(t),
      ...i.startLineNumber < t.startLineNumber || i.startLineNumber === t.startLineNumber && i.startColumn < t.startColumn ? FI(i) : FI(t)
    }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    A[0]
  );
  return {
    ...GI(e),
    ...FI(e)
  };
}, kC = (A) => A.reduce((g, I) => {
  switch (I.type) {
    case "error":
      return [
        ...g,
        {
          error: I.value,
          ...I.missingIdentifier === void 0 ? {} : {
            missingIdentifier: I.missingIdentifier,
            owningEntity: I.owningEntity
          },
          range: I.range
        }
      ];
    case "push":
    case "evaluation":
      return [...g, ...kC(I.value)];
    default:
      return g;
  }
}, []), wi = (A, g = "; ") => A.map((I) => `[${I.range.startLineNumber}, ${I.range.startColumn}] ${I.error}`).join(g);
function YA(A) {
  if (!(this instanceof YA))
    return new YA(A);
  this._ = A;
}
const Bg = YA.prototype;
function Cg(A, g) {
  return {
    expected: [],
    furthest: -1,
    index: A,
    status: !0,
    value: g
  };
}
function fe(A, g) {
  return g = [g], {
    expected: g,
    furthest: A,
    index: -1,
    status: !1,
    value: null
  };
}
function Og(A, g) {
  return !g || A.furthest > g.furthest ? A : {
    expected: A.furthest === g.furthest ? lu(A.expected, g.expected) : g.expected,
    furthest: g.furthest,
    index: A.index,
    status: A.status,
    value: A.value
  };
}
function mC(A, g) {
  const I = A.slice(0, g).split(`
`), e = I.length;
  return {
    column: I[I.length - 1].length + 1,
    line: e,
    offset: g
  };
}
function lu(A, g) {
  const I = {};
  for (let t = 0; t < A.length; t++)
    I[A[t]] = !0;
  for (let t = 0; t < g.length; t++)
    I[g[t]] = !0;
  const e = [];
  for (const t in I)
    e.push(t);
  return e.sort(), e;
}
function yu(A) {
  const g = String(A);
  return g.slice(g.lastIndexOf("/") + 1);
}
function fu(A) {
  return RegExp(`^(?:${A.source})`, yu(A));
}
function De(...A) {
  const g = [].slice.call(A), I = g.length;
  return YA(function(e, t) {
    let i;
    const n = new Array(I);
    for (let o = 0; o < I; o += 1) {
      if (i = Og(g[o]._(e, t), i), !i.status)
        return i;
      n[o] = i.value, t = i.index;
    }
    return Og(Cg(t, n), i);
  });
}
function ki(...A) {
  const g = [].slice.call(A), I = g.pop();
  return De.apply(null, g).map(function(e) {
    return I.apply(null, e);
  });
}
function Du(A) {
  const g = {};
  for (const I in A)
    (function(e) {
      const t = function() {
        return A[e](g);
      };
      g[e] = FC(t);
    })(I);
  return g;
}
function HC(...A) {
  const g = [].slice.call(A);
  return YA(function(I, e) {
    let t;
    for (let i = 0; i < g.length; i += 1)
      if (t = Og(g[i]._(I, e), t), t.status)
        return t;
    return t;
  });
}
function RC(A, g) {
  return UC(A, g).or(qt([]));
}
function UC(A, g) {
  const I = g.then(A).many();
  return ki(A, I, function(e, t) {
    return [e].concat(t);
  });
}
Bg.parse = function(A) {
  const g = this.skip(Su)._(A, 0);
  return g.status ? {
    status: !0,
    value: g.value
  } : {
    expected: g.expected,
    index: mC(A, g.furthest),
    status: !1
  };
};
Bg.or = function(A) {
  return HC(this, A);
};
Bg.then = function(A) {
  return De(this, A).map(function(g) {
    return g[1];
  });
};
Bg.many = function() {
  const A = this;
  return YA(function(g, I) {
    const e = [];
    let t;
    for (; ; )
      if (t = Og(A._(g, I), t), t.status) {
        if (I === t.index)
          throw new Error("infinite loop detected in .many() parser --- calling .many() on a parser that can accept zero characters is usually the cause");
        I = t.index, e.push(t.value);
      } else
        return Og(Cg(I, e), t);
  });
};
Bg.map = function(A) {
  const g = this;
  return YA(function(I, e) {
    const t = g._(I, e);
    return t.status ? Og(Cg(t.index, A(t.value)), t) : t;
  });
};
Bg.skip = function(A) {
  return De(this, A).map(function(g) {
    return g[0];
  });
};
Bg.node = function(A) {
  return ki(Jt, this, Jt, function(g, I, e) {
    return {
      end: e,
      name: A,
      start: g,
      value: I
    };
  });
};
Bg.sepBy = function(A) {
  return RC(this, A);
};
Bg.desc = function(A) {
  A = [A];
  const g = this;
  return YA(function(I, e) {
    const t = g._(I, e);
    return t.status || (t.expected = A), t;
  });
};
function Nu(A) {
  const g = `'${A}'`;
  return YA(function(I, e) {
    const t = e + A.length, i = I.slice(e, t);
    return i === A ? Cg(t, i) : fe(e, g);
  });
}
function mi(A, g = 0) {
  const I = fu(A), e = String(A);
  return YA(function(t, i) {
    const n = I.exec(t.slice(i));
    if (n) {
      const o = n[0], B = n[g];
      return Cg(i + o.length, B);
    }
    return fe(i, e);
  });
}
function qt(A) {
  return YA(function(g, I) {
    return Cg(I, A);
  });
}
function FC(A) {
  const g = YA(function(I, e) {
    return g._ = A()._, g._(I, e);
  });
  return g;
}
const Jt = YA(function(A, g) {
  return Cg(g, mC(A, g));
}), Su = YA(function(A, g) {
  return g < A.length ? fe(g, "EOF") : Cg(g, null);
}), pu = mi(/\s*/u).desc("optional whitespace"), wu = mi(/\s+/u).desc("whitespace"), W = {
  alt: HC,
  createLanguage: Du,
  index: Jt,
  lazy: FC,
  makeFailure: fe,
  makeSuccess: Cg,
  of: qt,
  optWhitespace: pu,
  regexp: mi,
  sepBy: RC,
  sepBy1: UC,
  seq: De,
  seqMap: ki,
  string: Nu,
  succeed: qt,
  whitespace: wu
}, ku = W.createLanguage({
  script: (A) => W.seqMap(W.optWhitespace, A.expression.sepBy(W.optWhitespace), W.optWhitespace, (g, I) => I).node("Script"),
  expression: (A) => W.alt(A.comment, A.push, A.evaluation, A.utf8, A.binary, A.hex, A.bigint, A.identifier),
  comment: (A) => W.alt(A.singleLineComment, A.multiLineComment).node("Comment"),
  singleLineComment: () => W.seqMap(W.string("//").desc("the start of a single-line comment ('//')"), W.regexp(/[^\n]*/u), (A, g) => g.trim()),
  multiLineComment: () => W.seqMap(W.string("/*").desc("the start of a multi-line comment ('/*')"), W.regexp(/[\s\S]*?\*\//u).desc("the end of this multi-line comment ('*/')"), (A, g) => g.slice(0, -2).trim()),
  push: (A) => W.seqMap(W.string("<").desc("the start of a push statement ('<')"), A.script, W.string(">").desc("the end of this push statement ('>')"), (g, I) => I).node("Push"),
  evaluation: (A) => W.seqMap(W.string("$").desc("the start of an evaluation ('$')"), W.string("(").desc("the opening parenthesis of this evaluation ('(')"), A.script, W.string(")").desc("the closing parenthesis of this evaluation (')')"), (g, I, e) => e).node("Evaluation"),
  identifier: () => W.regexp(/[a-zA-Z_][.a-zA-Z0-9_-]*/u).desc("a valid identifier").node("Identifier"),
  utf8: () => W.alt(W.seqMap(W.string('"').desc('a double quote (")'), W.regexp(/[^"]*/u), W.string('"').desc('a closing double quote (")'), (A, g) => g), W.seqMap(W.string("'").desc("a single quote (')"), W.regexp(/[^']*/u), W.string("'").desc("a closing single quote (')"), (A, g) => g)).node("UTF8Literal"),
  hex: () => W.seqMap(W.string("0x").desc("a hex literal ('0x...')"), W.regexp(/[0-9a-f]_*(?:_*[0-9a-f]_*[0-9a-f]_*)*[0-9a-f]/iu).desc("a valid hexadecimal string"), (A, g) => g).node("HexLiteral"),
  binary: () => W.seqMap(W.string("0b").desc("a binary literal ('0b...')"), W.regexp(/[01]+(?:[01_]*[01]+)*/iu).desc("a string of binary digits"), (A, g) => g).node("BinaryLiteral"),
  bigint: () => W.regexp(/-?[0-9]+(?:[0-9_]*[0-9]+)*/u).desc("an integer literal").node("BigIntLiteral")
}), mu = (A) => ku.script.parse(Ya(A)), YI = (A) => ({
  bytecode: Uint8Array.of(),
  range: A
}), Hu = (A) => A.error !== void 0 ? A.error : A.controlStack.length !== 0 ? "The CashAssembly internal evaluation completed with a non-empty control stack." : A.stack.length !== 1 ? "The CashAssembly internal evaluation completed with an unexpected number of items on the stack (must be exactly 1)." : !0, xt = (A, g, I) => {
  const e = A.map((i) => {
    switch (i.type) {
      case "bytecode":
        return { bytecode: i.value, range: i.range };
      case "push": {
        const n = xt(i.value, g, I);
        return {
          bytecode: cC(n.bytecode),
          ...n.errors === void 0 ? void 0 : { errors: n.errors },
          push: n,
          range: i.range
        };
      }
      case "evaluation": {
        if (typeof g > "u" || typeof I > "u")
          return {
            errors: [
              {
                error: "Both a VM and a createAuthenticationProgram method are required to reduce evaluations.",
                range: i.range
              }
            ],
            ...YI(i.range)
          };
        const n = xt(i.value, g, I);
        if (n.errors !== void 0)
          return {
            ...YI(i.range),
            errors: n.errors,
            source: n,
            trace: []
          };
        const o = g.debug(I(n.bytecode)), B = o[o.length - 1], C = Hu(B), r = B.stack[B.stack.length - 1];
        return {
          ...typeof C == "string" ? {
            bytecode: Uint8Array.of(),
            errors: [
              {
                error: `Failed to reduce evaluation: ${C}`,
                range: i.range
              }
            ]
          } : {
            bytecode: r
          },
          range: i.range,
          source: n,
          trace: o
        };
      }
      case "comment":
        return YI(i.range);
      case "error":
        return {
          errors: [
            {
              error: `Tried to reduce a CashAssembly script with resolution errors: ${i.value}`,
              range: i.range
            }
          ],
          ...YI(i.range)
        };
      default:
        throw new Error(`"${i.type}" is not a known segment type.`);
    }
  }), t = e.reduce((i, n) => ({
    bytecode: [...i.bytecode, n.bytecode],
    ranges: [...i.ranges, n.range],
    ...i.errors !== void 0 || n.errors !== void 0 ? {
      errors: [...i.errors ?? [], ...n.errors ?? []]
    } : void 0
  }), { bytecode: [], ranges: [] });
  return {
    ...t.errors === void 0 ? void 0 : { errors: t.errors },
    bytecode: EA(t.bytecode),
    range: du(
      t.ranges,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      A.length === 0 ? void 0 : A[0].range
    ),
    script: e
  };
}, Nn = (A) => ({
  endColumn: A.end.column,
  endLineNumber: A.end.line,
  startColumn: A.start.column,
  startLineNumber: A.start.line
}), Ke = (A) => A.replace(/_/gu, ""), Tt = (A, g) => {
  const I = A.value.map((e) => {
    const t = Nn(e);
    switch (e.name) {
      case "Identifier": {
        const i = e.value, n = g(i);
        return n.status ? {
          range: t,
          type: "bytecode",
          value: n.bytecode,
          ...n.type === ug.opcode ? {
            opcode: i
          } : n.type === ug.variable ? {
            ..."debug" in n ? { debug: n.debug } : {},
            ..."signature" in n ? { signature: n.signature } : {},
            variable: i
          } : (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            n.type === ug.script ? { script: i, source: n.source } : { unknown: i }
          )
        } : {
          ..."debug" in n ? { debug: n.debug } : {},
          ..."recoverable" in n && n.recoverable ? {
            missingIdentifier: i,
            owningEntity: n.entityOwnership
          } : {},
          range: t,
          type: "error",
          value: n.error
        };
      }
      case "Push":
        return {
          range: t,
          type: "push",
          value: Tt(e.value, g)
        };
      case "Evaluation":
        return {
          range: t,
          type: "evaluation",
          value: Tt(e.value, g)
        };
      case "BigIntLiteral":
        return {
          literal: e.value,
          literalType: "BigIntLiteral",
          range: t,
          type: "bytecode",
          value: VA(BigInt(Ke(e.value)))
        };
      case "BinaryLiteral":
        return {
          literal: e.value,
          literalType: "BinaryLiteral",
          range: t,
          type: "bytecode",
          value: pa(Ke(e.value))
        };
      case "HexLiteral":
        return {
          literal: e.value,
          literalType: "HexLiteral",
          range: t,
          type: "bytecode",
          value: lA(Ke(e.value))
        };
      case "UTF8Literal":
        return {
          literal: e.value,
          literalType: "UTF8Literal",
          range: t,
          type: "bytecode",
          value: uB(e.value)
        };
      case "Comment":
        return {
          range: t,
          type: "comment",
          value: e.value
        };
      default:
        return {
          range: t,
          type: "error",
          value: `Unrecognized segment: ${e.name}`
        };
    }
  });
  return I.length === 0 ? [{ range: Nn(A), type: "comment", value: "" }] : I;
};
var nI;
(function(A) {
  A.currentBlockTime = "current_block_time", A.currentBlockHeight = "current_block_height", A.signingSerialization = "signing_serialization";
})(nI || (nI = {}));
const PI = ({ data: A, configuration: g, identifier: I, matchingOperations: e, operationExample: t = "operation_identifier", operationId: i, variableId: n, variableType: o }) => {
  if (e === void 0)
    return {
      error: `The "${n}" variable type can not be resolved because the "${o}" operation has not been included in this compiler's configuration.`,
      status: "error"
    };
  if (typeof e == "function")
    return e(I, A, g);
  if (i === void 0)
    return {
      error: `This "${n}" variable could not be resolved because this compiler's "${o}" operations require an operation identifier, e.g. '${n}.${t}'.`,
      status: "error"
    };
  const B = e[i];
  return B === void 0 ? {
    error: `The identifier "${I}" could not be resolved because the "${n}.${i}" operation is not available to this compiler.`,
    status: "error"
  } : B(I, A, g);
}, Ru = ({ data: A, configuration: g, identifier: I }) => {
  const [e, t] = I.split(".");
  switch (e) {
    case nI.currentBlockHeight:
      return PI({
        configuration: g,
        data: A,
        identifier: I,
        matchingOperations: g.operations?.currentBlockHeight,
        operationId: t,
        variableId: e,
        variableType: "currentBlockHeight"
      });
    case nI.currentBlockTime:
      return PI({
        configuration: g,
        data: A,
        identifier: I,
        matchingOperations: g.operations?.currentBlockTime,
        operationId: t,
        variableId: e,
        variableType: "currentBlockTime"
      });
    case nI.signingSerialization:
      return PI({
        configuration: g,
        data: A,
        identifier: I,
        matchingOperations: g.operations?.signingSerialization,
        operationExample: "version",
        operationId: t,
        variableId: e,
        variableType: "signingSerialization"
      });
    default: {
      const i = g.variables?.[e];
      return i === void 0 ? { status: "skip" } : PI({
        configuration: g,
        data: A,
        identifier: I,
        operationId: t,
        variableId: e,
        ...{
          // eslint-disable-next-line @typescript-eslint/naming-convention
          AddressData: {
            matchingOperations: g.operations?.addressData,
            variableType: "addressData"
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          HdKey: {
            matchingOperations: g.operations?.hdKey,
            operationExample: "public_key",
            variableType: "hdKey"
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Key: {
            matchingOperations: g.operations?.key,
            operationExample: "public_key",
            variableType: "key"
          },
          // eslint-disable-next-line @typescript-eslint/naming-convention
          WalletData: {
            matchingOperations: g.operations?.walletData,
            variableType: "walletData"
          }
        }[i.type]
      });
    }
  }
}, Uu = (A) => {
  const I = A.filter((o) => o !== "EOF");
  I.length !== A.length && I.push("the end of the script");
  const e = I.slice(0, I.length - 1), t = I[I.length - 1];
  return `Encountered unexpected input while parsing script. Expected ${I.length >= 3 ? e.join(", ").concat(`, or ${t}`) : I.length === 2 ? I.join(" or ") : t}.`;
}, jA = () => ({
  endColumn: 0,
  endLineNumber: 0,
  startColumn: 0,
  startLineNumber: 0
}), Fu = ({ configuration: A, data: g }) => [
  ...g.bytecode === void 0 ? [] : Object.entries(g.bytecode).filter(([I]) => I.endsWith(".public_key")).reduce((I, [e, t]) => I.concat(A.secp256k1?.validatePublicKey(t) === !0 ? [] : [
    A.secp256k1 === void 0 ? {
      error: `Could not validate compilation data: the public key provided for "${e}" could not be validated because the "secp256k1" property was not provided in the compiler configuration.`,
      range: jA()
    } : {
      error: `Invalid compilation data detected: the public key provided for "${e}" is not a valid Secp256k1 public key.`,
      range: jA()
    }
  ]), []),
  ...g.keys?.privateKeys === void 0 ? [] : Object.entries(g.keys.privateKeys).reduce((I, [e, t]) => I.concat(ye(t) ? [] : [
    {
      error: `Invalid compilation data detected: the private key provided for the "${e}" variable is not a valid Secp256k1 private key.`,
      range: jA()
    }
  ]), []),
  ...g.hdKeys?.hdPrivateKeys === void 0 ? [] : Object.entries(g.hdKeys.hdPrivateKeys).reduce((I, [e, t]) => {
    const i = pC(t);
    return I.concat(typeof i == "string" ? [
      {
        error: `Invalid compilation data detected: the HD private key provided for the "${e}" entity is not a valid HD private key. ${i}`,
        range: jA()
      }
    ] : []);
  }, []),
  ...g.hdKeys?.hdPublicKeys === void 0 ? [] : Object.entries(g.hdKeys.hdPublicKeys).reduce((I, [e, t]) => {
    const i = ee(t);
    return I.concat(typeof i == "string" ? [
      {
        error: `Invalid compilation data detected: the HD public key provided for the "${e}" entity is not a valid HD public key. ${i}`,
        range: jA()
      }
    ] : []);
  }, [])
], Kg = ({ data: A, configuration: g, scriptId: I }) => {
  const e = g.scripts[I];
  if (e === void 0)
    return {
      errorType: "parse",
      errors: [
        {
          error: `No script with an ID of "${I}" was provided in the compiler configuration.`,
          range: jA()
        }
      ],
      success: !1
    };
  if (g.sourceScriptIds?.includes(I) === !0)
    return {
      errorType: "parse",
      errors: [
        {
          error: `A circular dependency was encountered: script "${I}" relies on itself to be generated. (Source scripts: ${g.sourceScriptIds.join(" → ")})`,
          range: jA()
        }
      ],
      success: !1
    };
  const t = g.sourceScriptIds === void 0 ? [I] : [...g.sourceScriptIds, I], i = Fu({ configuration: g, data: A });
  return i.length !== 0 ? {
    errorType: "parse",
    errors: i,
    success: !1
  } : Yu({
    configuration: { ...g, sourceScriptIds: t },
    data: A,
    script: e
  });
}, GC = ({ data: A, configuration: g, identifier: I }) => {
  if (g.scripts[I] === void 0)
    return !1;
  const e = Kg({
    configuration: g,
    data: A,
    scriptId: I
  });
  return e.success ? e : `Compilation error in resolved script "${I}": ${wi(e.errors)}`;
}, Gu = ({ data: A, configuration: g }) => (
  // eslint-disable-next-line complexity
  (I) => {
    const e = g.opcodes?.[I];
    if (e !== void 0)
      return {
        bytecode: e,
        status: !0,
        type: ug.opcode
      };
    const t = Ru({
      configuration: g,
      data: A,
      identifier: I
    });
    if (t.status !== "skip")
      return t.status === "error" ? {
        ..."debug" in t ? { debug: t.debug } : {},
        error: t.error,
        ...g.entityOwnership === void 0 ? {} : {
          entityOwnership: (
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            g.entityOwnership[I.split(".")[0]]
          )
        },
        recoverable: "recoverable" in t,
        status: !1,
        type: iI.variable
      } : {
        ..."debug" in t ? { debug: t.debug } : {},
        bytecode: t.bytecode,
        ..."signature" in t ? {
          signature: t.signature
        } : {},
        status: !0,
        type: ug.variable
      };
    const i = GC({
      configuration: g,
      data: A,
      identifier: I
    });
    return i !== !1 ? typeof i == "string" ? {
      error: i,
      scriptId: I,
      status: !1,
      type: iI.script
    } : {
      bytecode: i.bytecode,
      source: i,
      status: !0,
      type: ug.script
    } : {
      error: `Unknown identifier "${I}".`,
      status: !1,
      type: iI.unknown
    };
  }
), Yu = ({ data: A, configuration: g, script: I }) => {
  const e = mu(I);
  if (!e.status)
    return {
      errorType: "parse",
      errors: [
        {
          error: Uu(e.expected),
          range: {
            endColumn: e.index.column,
            endLineNumber: e.index.line,
            startColumn: e.index.column,
            startLineNumber: e.index.line
          }
        }
      ],
      success: !1
    };
  const t = Gu({ configuration: g, data: A }), i = Tt(e.value, t), n = kC(i);
  if (n.length !== 0)
    return {
      errorType: "resolve",
      errors: n,
      parse: e.value,
      resolve: i,
      success: !1
    };
  const o = xt(i, g.vm, g.createAuthenticationProgram);
  return {
    ...o.errors === void 0 ? { bytecode: o.bytecode, success: !0 } : { errorType: "reduce", errors: o.errors, success: !1 },
    parse: e.value,
    reduce: o,
    resolve: i
  };
}, Pu = (A, g, I) => {
  if (g.compilationContext?.transaction.locktime !== void 0) {
    if (I.unlockingScriptTimeLockTypes?.[A] === "height" && g.compilationContext.transaction.locktime >= 5e8)
      return {
        errorType: "parse",
        errors: [
          {
            error: `The script "${A}" requires a height-based locktime (less than 500,000,000), but this transaction uses a timestamp-based locktime ("${g.compilationContext.transaction.locktime}").`,
            range: jA()
          }
        ],
        success: !1
      };
    if (I.unlockingScriptTimeLockTypes?.[A] === "timestamp" && g.compilationContext.transaction.locktime < 5e8)
      return {
        errorType: "parse",
        errors: [
          {
            error: `The script "${A}" requires a timestamp-based locktime (greater than or equal to 500,000,000), but this transaction uses a height-based locktime ("${g.compilationContext.transaction.locktime}").`,
            range: jA()
          }
        ],
        success: !1
      };
  }
  if (g.compilationContext?.transaction.inputs[g.compilationContext.inputIndex]?.sequenceNumber !== void 0 && I.unlockingScriptTimeLockTypes?.[A] !== void 0 && // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  g.compilationContext.transaction.inputs[g.compilationContext.inputIndex].sequenceNumber === 4294967295)
    return {
      errorType: "parse",
      errors: [
        {
          error: `The script "${A}" requires a locktime, but this input's sequence number is set to disable transaction locktime (0xffffffff). This will cause the OP_CHECKLOCKTIMEVERIFY operation to error when the transaction is verified. To be valid, this input must use a sequence number that does not disable locktime.`,
          range: jA()
        }
      ],
      success: !1
    };
  const i = Kg({
    configuration: I,
    data: g,
    scriptId: A
  });
  if (!i.success)
    return i;
  const n = I.unlockingScripts?.[A], o = n === void 0 ? void 0 : I.lockingScriptTypes?.[n], B = o === "p2sh20" || o === "p2sh32", C = I.lockingScriptTypes?.[A];
  if (C === "p2sh20" || C === "p2sh32") {
    const E = Kg({
      configuration: {
        ...I,
        scripts: {
          p2sh20Locking: "OP_HASH160 <$(<lockingBytecode> OP_HASH160)> OP_EQUAL",
          p2sh32Locking: "OP_HASH256 <$(<lockingBytecode> OP_HASH256)> OP_EQUAL"
        },
        variables: { lockingBytecode: { type: "AddressData" } }
      },
      data: { bytecode: { lockingBytecode: i.bytecode } },
      scriptId: C === "p2sh20" ? "p2sh20Locking" : "p2sh32Locking"
    });
    return E.success ? {
      ...i,
      bytecode: E.bytecode,
      transformed: C === "p2sh20" ? "p2sh20-locking" : "p2sh32-locking"
    } : E;
  }
  if (B) {
    const E = Kg({
      configuration: I,
      data: g,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      scriptId: n
    });
    if (!E.success)
      return E;
    const Q = Kg({
      configuration: {
        ...I,
        scripts: {
          p2shUnlocking: "unlockingBytecode <lockingBytecode>"
        },
        variables: {
          lockingBytecode: { type: "AddressData" },
          unlockingBytecode: { type: "AddressData" }
        }
      },
      data: {
        bytecode: {
          lockingBytecode: E.bytecode,
          unlockingBytecode: i.bytecode
        }
      },
      scriptId: "p2shUnlocking"
    });
    return {
      ...i,
      bytecode: Q.bytecode,
      transformed: o === "p2sh20" ? "p2sh20-unlocking" : "p2sh32-unlocking"
    };
  }
  return i;
};
var QA;
(function(A) {
  A[A.defaultScenarioAddressIndex = 0] = "defaultScenarioAddressIndex", A.defaultScenarioBytecode = "", A[A.defaultScenarioCurrentBlockHeight = 2] = "defaultScenarioCurrentBlockHeight", A[A.defaultScenarioCurrentBlockTime = 1231469665] = "defaultScenarioCurrentBlockTime", A.defaultScenarioInputOutpointTransactionHash = "0000000000000000000000000000000000000000000000000000000000000001", A.defaultScenarioOutputTokenCategory = "0000000000000000000000000000000000000000000000000000000000000002", A[A.defaultScenarioInputSequenceNumber = 0] = "defaultScenarioInputSequenceNumber", A.defaultScenarioOutputLockingBytecode = "6a076c696261757468", A[A.defaultScenarioOutputValueSatoshis = 0] = "defaultScenarioOutputValueSatoshis", A[A.defaultScenarioTransactionLocktime = 0] = "defaultScenarioTransactionLocktime", A[A.defaultScenarioTransactionVersion = 2] = "defaultScenarioTransactionVersion", A[A.hdKeyAddressOffset = 0] = "hdKeyAddressOffset", A.hdKeyHdPublicKeyDerivationPath = "", A.hdKeyPrivateDerivationPath = "i", A.scenarioBytecodeScriptPrefix = "_scenario.";
})(QA || (QA = {}));
const jg = (A, g) => (I, e, t) => {
  for (const i of A) {
    const n = i(I, e, t);
    if (n.status !== "skip")
      return n;
  }
  return g(I, e, t);
}, iA = ({
  /**
   * If `true`, the accepted operation may return `false`, and any missing
   * properties will cause the returned operation to return `false` (meaning
   * the operation should be skipped)
   */
  canBeSkipped: A,
  /**
   * An array of the top-level properties required in the
   * {@link CompilationData}.
   */
  dataProperties: g,
  /**
   * An array of the top-level properties required in the
   * {@link CompilerConfiguration}
   */
  configurationProperties: I,
  /**
   * The operation to run if all required properties exist
   */
  operation: e
}) => (
  // eslint-disable-next-line complexity
  (t, i, n) => {
    for (const o of I)
      if (n[o] === void 0)
        return A ? { status: "skip" } : {
          error: `Cannot resolve "${t}" - the "${o}" property was not provided in the compiler configuration.`,
          status: "error"
        };
    for (const o of g)
      if (i[o] === void 0)
        return A ? { status: "skip" } : {
          error: `Cannot resolve "${t}" - the "${o}" property was not provided in the compilation data.`,
          status: "error"
        };
    return e(t, i, n);
  }
), Wg = iA({
  canBeSkipped: !0,
  configurationProperties: [],
  dataProperties: ["bytecode"],
  operation: (A, g) => {
    const I = g.bytecode[A];
    return I !== void 0 ? { bytecode: I, status: "success" } : { status: "skip" };
  }
}), YC = ({ addressIndex: A, entityId: g, entityHdPrivateKey: I, configuration: e, hdKey: t, identifier: i }) => {
  const n = t.addressOffset ?? QA.hdKeyAddressOffset, o = t.privateDerivationPath ?? QA.hdKeyPrivateDerivationPath, B = A + n;
  if (!/^(?:m|i|[0-9]+)'?(?:\/(?:[0-9]+|i)'?)*$/u.test(o))
    return {
      error: `Could not generate "${i}" - the path "${o}" is not a valid "privateDerivationPath".`,
      status: "error"
    };
  const r = tB(pC(I, {
    crypto: e
  })), E = o.replace("i", B.toString()), a = (E.includes("m") ? Qu : pi)(r.node, E, {
    crypto: e,
    throwErrors: !1
  });
  return typeof a == "string" ? {
    error: `Could not generate "${i}" - the path "${E}" could not be derived for entity "${g}": ${a}`,
    status: "error"
  } : {
    bytecode: a.privateKey,
    status: "success"
  };
}, PC = (A, g) => ({
  error: `Identifier "${A}" refers to an HdKey, but the "entityOwnership" for "${g}" is not available in this compiler configuration.`,
  status: "error"
}), MC = (A) => ({
  error: `Identifier "${A}" refers to an HdKey, but "hdKeys.addressIndex" was not provided in the compilation data.`,
  status: "error"
}), KC = ({ configuration: A, hdKeys: g, identifier: I }) => {
  const { addressIndex: e, hdPrivateKeys: t } = g, [i] = I.split("."), n = A.entityOwnership[i];
  if (n === void 0)
    return PC(I, i);
  if (e === void 0)
    return MC(I);
  const o = t === void 0 ? void 0 : t[n];
  if (o === void 0)
    return {
      error: `Identifier "${I}" refers to an HdKey owned by "${n}", but an HD private key for this entity (or an existing signature) was not provided in the compilation data.`,
      recoverable: !0,
      status: "error"
    };
  const B = A.variables[i];
  return YC({
    addressIndex: e,
    configuration: A,
    entityHdPrivateKey: o,
    entityId: n,
    hdKey: B,
    identifier: I
  });
}, bC = ({ targetScriptId: A, data: g, configuration: I }) => {
  const e = I.scripts[A], t = GC({
    configuration: I,
    data: g,
    identifier: A
  });
  return e === void 0 || t === !1 ? !1 : typeof t == "string" ? {
    error: t,
    status: "error"
  } : t.bytecode;
}, Ne = ({ data: A, configuration: g, identifier: I, sourceScriptIds: e, unlockingScripts: t }) => {
  const i = e[e.length - 1];
  if (i === void 0)
    return {
      error: `Identifier "${I}" requires a signing serialization, but "coveredBytecode" cannot be determined because the compiler configuration's "sourceScriptIds" is empty.`,
      status: "error"
    };
  const n = t[i];
  if (n === void 0)
    return {
      error: `Identifier "${I}" requires a signing serialization, but "coveredBytecode" cannot be determined because "${i}" is not present in the compiler configuration's "unlockingScripts".`,
      status: "error"
    };
  const o = bC({
    configuration: g,
    data: A,
    targetScriptId: n
  });
  return o === !1 ? {
    error: `Identifier "${I}" requires a signing serialization that covers an unknown locking script, "${n}".`,
    status: "error"
  } : o;
}, Mu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["bytecode"],
  operation: (A, g) => {
    const I = g.bytecode[A];
    return I !== void 0 ? { bytecode: I, status: "success" } : {
      error: `Identifier "${A}" refers to an AddressData, but "${A}" was not provided in the CompilationData "bytecode".`,
      recoverable: !0,
      status: "error"
    };
  }
}), Ku = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["bytecode"],
  operation: (A, g) => {
    const I = g.bytecode[A];
    return I !== void 0 ? { bytecode: I, status: "success" } : {
      error: `Identifier "${A}" refers to a WalletData, but "${A}" was not provided in the CompilationData "bytecode".`,
      recoverable: !0,
      status: "error"
    };
  }
}), bu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["currentBlockTime"],
  operation: (A, g) => ({
    bytecode: yA(g.currentBlockTime),
    status: "success"
  })
}), qu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["currentBlockHeight"],
  operation: (A, g) => ({
    bytecode: VA(BigInt(g.currentBlockHeight)),
    status: "success"
  })
}), Ju = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => {
    const { correspondingOutput: I } = Ei(g.compilationContext);
    return I === void 0 ? { bytecode: Uint8Array.of(), status: "success" } : {
      bytecode: I,
      status: "success"
    };
  }
}), xu = iA({
  canBeSkipped: !1,
  configurationProperties: ["sha256"],
  dataProperties: ["compilationContext"],
  operation: (A, g, I) => {
    const { correspondingOutput: e } = Ei(g.compilationContext);
    return e === void 0 ? { bytecode: Uint8Array.of(), status: "success" } : {
      bytecode: I.sha256.hash(I.sha256.hash(e)),
      status: "success"
    };
  }
}), qC = (A) => iA({
  canBeSkipped: !1,
  configurationProperties: ["sourceScriptIds", "unlockingScripts"],
  dataProperties: ["compilationContext"],
  operation: (g, I, e) => {
    const { unlockingScripts: t, sourceScriptIds: i } = e, n = Ne({
      configuration: e,
      data: I,
      identifier: g,
      sourceScriptIds: i,
      unlockingScripts: t
    });
    return "error" in n ? n : {
      bytecode: A ? ng(BigInt(n.length)) : n,
      status: "success"
    };
  }
}), Tu = qC(!1), Lu = qC(!0), Ou = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: yA(g.compilationContext.transaction.locktime),
    status: "success"
  })
}), vu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: yA(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      g.compilationContext.transaction.inputs[g.compilationContext.inputIndex].outpointIndex
    ),
    status: "success"
  })
}), Vu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      g.compilationContext.transaction.inputs[g.compilationContext.inputIndex].outpointTransactionHash
    ),
    status: "success"
  })
}), Zu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: Ii(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      g.compilationContext.sourceOutputs[g.compilationContext.inputIndex].valueSatoshis
    ),
    status: "success"
  })
}), zu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: yA(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      g.compilationContext.transaction.inputs[g.compilationContext.inputIndex].sequenceNumber
    ),
    status: "success"
  })
}), Xu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: Ci(g.compilationContext.transaction.inputs),
    status: "success"
  })
}), ju = iA({
  canBeSkipped: !1,
  configurationProperties: ["sha256"],
  dataProperties: ["compilationContext"],
  operation: (A, g, I) => ({
    bytecode: I.sha256.hash(I.sha256.hash(Ci(g.compilationContext.transaction.inputs))),
    status: "success"
  })
}), Wu = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: Ae(g.compilationContext.transaction.outputs),
    status: "success"
  })
}), _u = iA({
  canBeSkipped: !1,
  configurationProperties: ["sha256"],
  dataProperties: ["compilationContext"],
  operation: (A, g, I) => ({
    bytecode: I.sha256.hash(I.sha256.hash(Ae(g.compilationContext.transaction.outputs))),
    status: "success"
  })
}), $u = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: ri(g.compilationContext.transaction.inputs),
    status: "success"
  })
}), Ah = iA({
  canBeSkipped: !1,
  configurationProperties: ["sha256"],
  dataProperties: ["compilationContext"],
  operation: (A, g, I) => ({
    bytecode: I.sha256.hash(I.sha256.hash(ri(g.compilationContext.transaction.inputs))),
    status: "success"
  })
}), gh = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: yA(g.compilationContext.transaction.version),
    status: "success"
  })
}), Ih = jg([Wg], iA({
  canBeSkipped: !1,
  configurationProperties: ["secp256k1"],
  dataProperties: ["keys"],
  operation: (A, g, I) => {
    const { keys: e } = g, { secp256k1: t } = I, { privateKeys: i } = e, [n] = A.split(".");
    return i?.[n] !== void 0 ? {
      bytecode: t.derivePublicKeyCompressed(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        i[n]
      ),
      status: "success"
    } : {
      error: `Identifier "${A}" refers to a public key, but no public or private keys for "${n}" were provided in the compilation data.`,
      recoverable: !0,
      status: "error"
    };
  }
})), eh = jg([Wg], iA({
  canBeSkipped: !1,
  configurationProperties: [
    "entityOwnership",
    "ripemd160",
    "secp256k1",
    "sha256",
    "sha512",
    "variables"
  ],
  dataProperties: ["hdKeys"],
  operation: (
    // eslint-disable-next-line complexity
    (A, g, I) => {
      const { hdKeys: e } = g, { hdPrivateKeys: t, addressIndex: i, hdPublicKeys: n } = e, [o] = A.split("."), B = I.entityOwnership[o];
      if (B === void 0)
        return PC(A, o);
      if (i === void 0)
        return MC(A);
      const C = t === void 0 ? void 0 : t[B], r = I.variables[o];
      if (C !== void 0) {
        const R = YC({
          addressIndex: i,
          configuration: I,
          entityHdPrivateKey: C,
          entityId: B,
          hdKey: r,
          identifier: A
        });
        return R.status === "error" ? R : {
          bytecode: I.secp256k1.derivePublicKeyCompressed(R.bytecode),
          status: "success"
        };
      }
      const E = n === void 0 ? void 0 : n[B];
      if (E === void 0)
        return {
          error: `Identifier "${A}" refers to an HdKey owned by "${B}", but an HD private key or HD public key for this entity was not provided in the compilation data.`,
          recoverable: !0,
          status: "error"
        };
      const Q = r.addressOffset ?? QA.hdKeyAddressOffset, a = r.privateDerivationPath ?? QA.hdKeyPrivateDerivationPath, s = r.hdPublicKeyDerivationPath ?? QA.hdKeyHdPublicKeyDerivationPath, d = r.publicDerivationPath ?? a.replace("m/", "");
      if (s !== "" && !/^(?:m|[0-9]+)'?(?:\/(?:[0-9]+'?))*$/u.test(s))
        return {
          error: `Could not generate "${A}" - "hdPublicKeyDerivationPath" ("${s}") must be a fixed (no "i" characters), valid absolute derivation path.`,
          status: "error"
        };
      const u = s === "" ? d : `${s}/${d}`;
      if (a !== u)
        return {
          error: `Could not generate "${A}" - "privateDerivationPath" ("${a}") is expected to be the combination of "hdPublicKeyDerivationPath" and "publicDerivationPath": "${u}".`,
          status: "error"
        };
      const y = tB(ee(E, {
        crypto: I
      })), l = i + Q, D = d.replace("i", l.toString()), G = s.split("/").length - 1;
      if (s !== "" && y.node.depth !== G)
        return {
          error: `Could not generate "${A}" - the HD public key derivation path ("${s}") indicates an expected depth of ${G}, but the provided HD public key has a depth of ${y.node.depth}.`,
          status: "error"
        };
      const f = pi(y.node, D, { crypto: I, throwErrors: !1 });
      return typeof f == "string" ? {
        error: `Could not generate "${A}" - the path "${D}" could not be derived for entity "${B}": ${f}`,
        status: "error"
      } : { bytecode: f.publicKey, status: "success" };
    }
  )
})), MI = {
  addressData: Mu,
  currentBlockHeight: qu,
  currentBlockTime: bu,
  hdKey: {
    public_key: eh
  },
  key: {
    public_key: Ih
  },
  signingSerialization: {
    corresponding_output: Ju,
    corresponding_output_hash: xu,
    covered_bytecode: Tu,
    covered_bytecode_length: Lu,
    locktime: Ou,
    outpoint_index: vu,
    outpoint_transaction_hash: Vu,
    output_value: Zu,
    sequence_number: zu,
    transaction_outpoints: Xu,
    transaction_outpoints_hash: ju,
    transaction_outputs: Wu,
    transaction_outputs_hash: _u,
    transaction_sequence_numbers: $u,
    transaction_sequence_numbers_hash: Ah,
    version: gh
  },
  walletData: Ku
}, Sn = (A) => {
  const { variables: g, entityOwnership: I } = A, e = g === void 0 ? [] : Object.entries(g).filter((a) => a[1].type === "Key").map(([a]) => a), t = I === void 0 ? [] : Object.keys(Object.values(I).reduce((a, s) => ({ ...a, [s]: !0 }), {})), i = [...e, ...t].sort((a, s) => a.localeCompare(s, "en")).reduce((a, s, d) => ({
    ...a,
    [s]: ma(BigInt(d + 1))
  }), {}), n = g === void 0 ? void 0 : Object.entries(g).reduce((a, [s, d]) => d.type === "Key" ? {
    ...a,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    [s]: Z(i[s])
  } : a, {}), o = {
    data: {
      currentBlockHeight: QA.defaultScenarioCurrentBlockHeight,
      currentBlockTime: QA.defaultScenarioCurrentBlockTime,
      ...n === void 0 || Object.keys(n).length === 0 ? {} : { keys: { privateKeys: n } }
    },
    sourceOutputs: [{ lockingBytecode: ["slot"] }],
    transaction: {
      inputs: [{ unlockingBytecode: ["slot"] }],
      locktime: QA.defaultScenarioTransactionLocktime,
      outputs: [
        {
          lockingBytecode: QA.defaultScenarioOutputLockingBytecode
        }
      ],
      version: QA.defaultScenarioTransactionVersion
    }
  };
  if (!(g === void 0 ? !1 : Object.values(g).findIndex((a) => a.type === "HdKey") !== -1))
    return o;
  const { sha256: C, sha512: r } = A;
  if (C === void 0)
    return 'An implementations of "sha256" is required to generate defaults for HD keys, but the "sha256" property is not included in this compiler configuration.';
  if (r === void 0)
    return 'An implementations of "sha512" is required to generate defaults for HD keys, but the "sha512" property is not included in this compiler configuration.';
  const E = { sha256: C, sha512: r }, Q = t.reduce((a, s) => {
    const h = tu(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      i[s],
      { assumeValidity: !0, crypto: E }
    ), { hdPrivateKey: u } = au({ network: "mainnet", node: h }, { crypto: E });
    return { ...a, [s]: u };
  }, {});
  return {
    ...o,
    data: {
      ...o.data,
      hdKeys: {
        addressIndex: QA.defaultScenarioAddressIndex,
        hdPrivateKeys: Q
      }
    }
  };
}, JC = (A, g) => ({
  ...A,
  ...g,
  ...A.bytecode === void 0 && g.bytecode === void 0 ? {} : {
    bytecode: {
      ...A.bytecode,
      ...g.bytecode
    }
  },
  ...A.hdKeys === void 0 && g.hdKeys === void 0 ? {} : {
    hdKeys: {
      ...A.hdKeys,
      ...g.hdKeys,
      ...A.hdKeys?.hdPrivateKeys === void 0 && g.hdKeys?.hdPrivateKeys === void 0 ? {} : {
        hdPrivateKeys: {
          ...A.hdKeys?.hdPrivateKeys,
          ...g.hdKeys?.hdPrivateKeys
        }
      },
      ...A.hdKeys?.hdPublicKeys === void 0 && g.hdKeys?.hdPublicKeys === void 0 ? {} : {
        hdPublicKeys: {
          ...A.hdKeys?.hdPublicKeys,
          ...g.hdKeys?.hdPublicKeys
        }
      }
    }
  },
  ...A.keys === void 0 && g.keys === void 0 ? {} : {
    keys: {
      privateKeys: {
        ...A.keys?.privateKeys,
        ...g.keys?.privateKeys
      }
    }
  }
}), xC = (A, g) => ({
  ...A.data === void 0 && g.data === void 0 ? {} : {
    data: JC(A.data ?? {}, g.data ?? {})
  },
  ...A.transaction === void 0 && g.transaction === void 0 ? {} : {
    transaction: {
      ...A.transaction,
      ...g.transaction
    }
  },
  ...A.sourceOutputs === void 0 && g.sourceOutputs === void 0 ? {} : {
    sourceOutputs: g.sourceOutputs ?? A.sourceOutputs
  }
}), TC = ({ configuration: A, scenarioId: g, sourceScenarioIds: I = [] }) => {
  if (g === void 0)
    return Sn(A);
  if (I.includes(g))
    return `Cannot extend scenario "${g}": scenario "${g}" extends itself. Scenario inheritance path: ${I.join(" → ")}`;
  const e = A.scenarios?.[g];
  if (e === void 0)
    return `Cannot extend scenario "${g}": a scenario with the identifier ${g} is not included in this compiler configuration.`;
  const t = e.extends === void 0 ? Sn(A) : TC({
    configuration: A,
    scenarioId: e.extends,
    sourceScenarioIds: [...I, g]
  });
  return typeof t == "string" ? t : xC(t, e);
}, LC = (A) => ({
  ...A.data.currentBlockHeight === void 0 ? {} : {
    currentBlockHeight: A.data.currentBlockHeight
  },
  ...A.data.currentBlockTime === void 0 ? {} : {
    currentBlockTime: A.data.currentBlockTime
  },
  ...A.data.hdKeys === void 0 ? {} : {
    hdKeys: {
      ...A.data.hdKeys.addressIndex === void 0 ? {} : {
        addressIndex: A.data.hdKeys.addressIndex
      },
      ...A.data.hdKeys.hdPrivateKeys !== void 0 && Object.keys(A.data.hdKeys.hdPrivateKeys).length > 0 ? {
        hdPrivateKeys: A.data.hdKeys.hdPrivateKeys
      } : {},
      ...A.data.hdKeys.hdPublicKeys === void 0 ? {} : {
        hdPublicKeys: A.data.hdKeys.hdPublicKeys
      }
    }
  },
  ...A.data.keys?.privateKeys !== void 0 && Object.keys(A.data.keys.privateKeys).length > 0 ? {
    keys: {
      privateKeys: Object.entries(A.data.keys.privateKeys).reduce((g, [I, e]) => ({ ...g, [I]: lA(e) }), {})
    }
  } : {}
}), OC = ({ compilationData: A, configuration: g, scenarioDataBytecodeScripts: I }) => {
  const e = (C) => `${QA.scenarioBytecodeScriptPrefix}${C}`, t = Object.entries(I).reduce((C, [r, E]) => ({
    ...C,
    [e(r)]: E
  }), {}), i = {
    ...g,
    scripts: {
      ...g.scripts,
      ...t
    }
  }, n = Object.keys(I).map((C) => {
    const r = Kg({
      configuration: i,
      data: A,
      scriptId: e(C)
    });
    return r.success ? {
      bytecode: r.bytecode,
      id: C
    } : {
      errors: r.errors,
      id: C
    };
  }), o = n.filter((C) => "errors" in C);
  if (o.length > 0)
    return o.map((C) => `Compilation error while generating bytecode for "${C.id}": ${wi(C.errors)}`).join("; ");
  const B = n.reduce((C, r) => ({ ...C, [r.id]: r.bytecode }), {});
  return {
    ...Object.keys(B).length > 0 ? { bytecode: B } : {},
    ...A
  };
}, pn = (A = QA.defaultScenarioOutputValueSatoshis) => typeof A == "string" ? Ha(lA(A)) : BigInt(A), be = ({ bytecodeDefinition: A, compilationContext: g, configuration: I, defaultOverride: e, extendedScenario: t, generateBytecode: i, lockingOrUnlockingScriptIdUnderTest: n }) => {
  if (typeof A == "string")
    return lA(A);
  const o = A.script === void 0 || Array.isArray(A.script) ? n : A.script;
  if (o === void 0)
    return lA("");
  const B = A.overrides ?? e, C = JC(t.data, B), r = OC({
    compilationData: LC({
      data: C
    }),
    configuration: I,
    scenarioDataBytecodeScripts: C.bytecode ?? {}
  });
  return typeof r == "string" ? { errors: [{ error: `Could not compile scenario "data.bytecode": ${r}` }], success: !1 } : i({
    data: { ...r, compilationContext: g },
    debug: !0,
    scriptId: o
  });
}, wn = (A) => A.token === void 0 ? {} : {
  token: {
    amount: BigInt(A.token.amount ?? 0),
    // TODO: doesn't verify length
    category: lA(A.token.category ?? QA.defaultScenarioOutputTokenCategory),
    ...A.token.nft === void 0 ? {} : {
      nft: {
        capability: A.token.nft.capability ?? "none",
        commitment: lA(A.token.nft.commitment ?? "")
      }
    }
  }
}, th = ({ configuration: A, generateBytecode: g, scenarioId: I, unlockingScriptId: e, lockingScriptId: t }, i) => {
  const { scenarioDefinition: n, scenarioName: o } = I === void 0 ? { scenarioDefinition: {}, scenarioName: "the default scenario" } : {
    scenarioDefinition: A.scenarios?.[I],
    scenarioName: `scenario "${I}"`
  };
  if (n === void 0)
    return `Cannot generate ${o}: a scenario definition with the identifier ${I} is not included in this compiler configuration.`;
  const B = TC({ configuration: A, scenarioId: I });
  if (typeof B == "string")
    return `Cannot generate ${o}: ${B}`;
  const C = xC(B, n), r = LC(C), E = OC({
    compilationData: r,
    configuration: A,
    scenarioDataBytecodeScripts: C.data.bytecode ?? {}
  });
  if (typeof E == "string")
    return `Cannot generate ${o}. ${E}`;
  if (C.transaction.inputs.length !== C.sourceOutputs.length)
    return `Cannot generate ${o}: could not match source outputs with inputs - "sourceOutputs" must be the same length as "transaction.inputs".`;
  if (C.transaction.inputs.filter((p) => Array.isArray(p.unlockingBytecode)).length !== 1)
    return `Cannot generate ${o}: the specific input under test in this scenario is ambiguous - "transaction.inputs" must include exactly one input that has "unlockingBytecode" set to ["slot"].`;
  const a = C.transaction.inputs.findIndex((p) => Array.isArray(p.unlockingBytecode));
  if (C.sourceOutputs.filter((p) => Array.isArray(p.lockingBytecode)).length !== 1)
    return `Cannot generate ${o}: the source output unlocked by the input under test in this scenario is ambiguous - "sourceOutputs" must include exactly one output that has "lockingBytecode" set to ["slot"].`;
  if (!Array.isArray(C.sourceOutputs[a]?.lockingBytecode))
    return `Cannot generate ${o}: the source output unlocked by the input under test in this scenario is ambiguous - the ["slot"] in "transaction.inputs" and "sourceOutputs" must be at the same index.`;
  if (e !== void 0 && t !== void 0)
    return `Cannot generate ${o}: a scenario cannot be generated with both unlocking and locking script IDs defined. If an unlocking script is provided, the associated locking script ID must be read from the template.`;
  const d = t ?? (e === void 0 ? void 0 : A.unlockingScripts?.[e]);
  if (e !== void 0 && d === void 0)
    return `Cannot generate ${o} using unlocking script "${e}": the locking script unlocked by "${e}" is not provided in this compiler configuration.`;
  const h = C.sourceOutputs.map((p, Y) => {
    const b = Array.isArray(p.lockingBytecode), x = b ? d === void 0 ? QA.defaultScenarioBytecode : { script: d } : p.lockingBytecode ?? {};
    return {
      compiled: {
        lockingBytecode: be({
          bytecodeDefinition: x,
          configuration: A,
          defaultOverride: {},
          extendedScenario: C,
          generateBytecode: g,
          lockingOrUnlockingScriptIdUnderTest: d
        }),
        valueSatoshis: pn(p.valueSatoshis),
        ...wn(p)
      },
      index: Y,
      slot: b,
      type: "source output"
    };
  }), u = h.find((p) => p.slot)?.compiled.lockingBytecode, y = C.transaction.outputs.map((p, Y) => {
    const b = { hdKeys: { addressIndex: 1 } };
    return {
      compiled: {
        lockingBytecode: be({
          bytecodeDefinition: p.lockingBytecode ?? {},
          configuration: A,
          defaultOverride: b,
          extendedScenario: C,
          generateBytecode: g,
          lockingOrUnlockingScriptIdUnderTest: d
        }),
        valueSatoshis: pn(p.valueSatoshis),
        ...wn(p)
      },
      index: Y,
      type: "transaction output"
    };
  }), l = [
    ...h,
    ...y
  ].reduce((p, Y) => "errors" in Y.compiled.lockingBytecode ? [
    ...p,
    ...Y.compiled.lockingBytecode.errors.map((b) => `Failed compilation of ${Y.type} at index ${Y.index}: ${b.error}`)
  ] : p, []);
  if (l.length > 0) {
    const p = `Cannot generate ${o}: ${l.join(" ")}`;
    return i === !0 ? {
      lockingCompilation: u,
      scenario: p
    } : p;
  }
  const D = h, G = y, f = (p) => {
    const { lockingBytecode: Y, valueSatoshis: b, token: x } = p.compiled;
    return {
      lockingBytecode: "bytecode" in Y ? Y.bytecode : Y,
      valueSatoshis: b,
      ...x === void 0 ? {} : { token: x }
    };
  }, R = D.map(f), H = G.map(f), w = C.transaction.inputs.map((p, Y) => ({
    outpointIndex: p.outpointIndex ?? Y,
    // TODO: doesn't verify length
    outpointTransactionHash: lA(p.outpointTransactionHash ?? QA.defaultScenarioInputOutpointTransactionHash),
    sequenceNumber: p.sequenceNumber ?? QA.defaultScenarioInputSequenceNumber,
    unlockingBytecode: void 0
  })), K = C.transaction.inputs.map((p, Y) => {
    const b = Array.isArray(p.unlockingBytecode), x = Array.isArray(p.unlockingBytecode) ? e === void 0 ? QA.defaultScenarioBytecode : { script: e } : p.unlockingBytecode ?? {}, J = {};
    return {
      compiled: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        outpointIndex: w[Y].outpointIndex,
        outpointTransactionHash: (
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          w[Y].outpointTransactionHash
        ),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sequenceNumber: w[Y].sequenceNumber,
        unlockingBytecode: be({
          bytecodeDefinition: x,
          compilationContext: {
            inputIndex: Y,
            sourceOutputs: R,
            transaction: {
              inputs: w,
              locktime: C.transaction.locktime,
              outputs: H,
              version: C.transaction.version
            }
          },
          configuration: A,
          defaultOverride: J,
          extendedScenario: C,
          generateBytecode: g,
          lockingOrUnlockingScriptIdUnderTest: e
        })
      },
      index: Y,
      slot: b
    };
  }), M = K.find((p) => p.slot)?.compiled.unlockingBytecode, U = K.reduce((p, Y) => "errors" in Y.compiled.unlockingBytecode ? [
    ...p,
    ...Y.compiled.unlockingBytecode.errors.map((b) => `Failed compilation of input at index ${Y.index}: ${b.error}`)
  ] : p, []);
  if (U.length > 0) {
    const p = `Cannot generate ${o}: ${U.join(" ")}`;
    return i === !0 ? {
      lockingCompilation: u,
      scenario: p,
      unlockingCompilation: M
    } : p;
  }
  const S = K.map((p) => {
    const { outpointIndex: Y, outpointTransactionHash: b, sequenceNumber: x, unlockingBytecode: J } = p.compiled;
    return {
      outpointIndex: Y,
      outpointTransactionHash: b,
      sequenceNumber: x,
      unlockingBytecode: "bytecode" in J ? J.bytecode : J
    };
  }), m = {
    data: E,
    program: {
      inputIndex: a,
      sourceOutputs: R,
      transaction: {
        inputs: S,
        locktime: C.transaction.locktime,
        outputs: H,
        version: C.transaction.version
      }
    }
  };
  return i === !0 ? { lockingCompilation: u, scenario: m, unlockingCompilation: M } : m;
}, ih = (A) => ({ data: g, debug: I, scriptId: e }) => {
  const t = Pu(e, g, A);
  return I === !0 ? t : t.success ? { bytecode: t.bytecode, success: !0 } : {
    errorType: t.errorType,
    errors: t.errors,
    success: !1
  };
}, nh = (A) => {
  const g = ih(A);
  return {
    configuration: A,
    generateBytecode: g,
    generateScenario: ({ lockingScriptId: I, unlockingScriptId: e, scenarioId: t, debug: i }) => th({
      configuration: A,
      generateBytecode: g,
      lockingScriptId: I,
      scenarioId: t,
      unlockingScriptId: e
    }, i)
  };
}, oh = 32, Bh = 9996, Ch = (A) => ({
  inputIndex: 0,
  sourceOutputs: [
    {
      lockingBytecode: A,
      valueSatoshis: 0n
    }
  ],
  transaction: {
    inputs: [
      {
        outpointIndex: 0,
        outpointTransactionHash: new Uint8Array(oh),
        sequenceNumber: 0,
        unlockingBytecode: Uint8Array.of()
      }
    ],
    locktime: 0,
    outputs: [
      {
        lockingBytecode: EA([
          Uint8Array.of(Iu.OP_RETURN),
          cC(new Uint8Array(Bh))
        ]),
        valueSatoshis: 0n
      }
    ],
    version: 0
  }
}), rh = (A) => {
  const g = Object.entries(A.scripts).reduce((r, [E, Q]) => "tests" in Q ? {
    ...r,
    ...Object.entries(Q.tests).reduce((a, [s, d]) => {
      const h = Q.pushed === !0, u = `${E}.${s}.check`, y = `${E}.${s}.lock`, l = `${E}.${s}.unlock`;
      return {
        ...a,
        [u]: { script: d.check },
        [y]: {
          lockingType: "p2sh20",
          script: h ? `<${E}> ${u}` : `${E} ${u}`
        },
        [l]: {
          script: d.setup ?? "",
          unlocks: y
        }
      };
    }, {})
  } : r, {}), I = {
    ...A.scripts,
    ...g
  }, e = Object.entries(I).reduce((r, [E, Q]) => ({ ...r, [E]: Q.script }), {}), t = Object.values(A.entities).reduce((r, E) => ({ ...r, ...E.variables }), {}), i = Object.entries(A.entities).reduce((r, [E, Q]) => ({
    ...r,
    ...Object.keys(Q.variables ?? {}).reduce((a, s) => ({
      ...a,
      [s]: E
    }), {})
  }), {}), n = Object.entries(I).reduce((r, [E, Q]) => "unlocks" in Q && Q.unlocks !== void 0 ? { ...r, [E]: Q.unlocks } : r, {}), o = Object.entries(I).reduce((r, [E, Q]) => "timeLockType" in Q && Q.timeLockType !== void 0 ? { ...r, [E]: Q.timeLockType } : r, {}), B = Object.entries(I).reduce((r, [E, Q]) => "lockingType" in Q && Q.lockingType !== void 0 ? { ...r, [E]: Q.lockingType } : r, {}), C = A.scenarios === void 0 ? void 0 : Object.entries(A.scenarios).reduce((r, [E, Q]) => ({ ...r, [E]: Q }), {});
  return {
    entityOwnership: i,
    lockingScriptTypes: B,
    ...C === void 0 ? {} : { scenarios: C },
    scripts: e,
    unlockingScriptTimeLockTypes: o,
    unlockingScripts: n,
    variables: t
  };
};
var pA;
(function(A) {
  A.allOutputs = "all_outputs", A.allOutputsAllUtxos = "all_outputs_all_utxos", A.allOutputsSingleInput = "all_outputs_single_input", A.allOutputsSingleInputInvalidAllUtxos = "all_outputs_single_input_INVALID_all_utxos", A.correspondingOutput = "corresponding_output", A.correspondingOutputAllUtxos = "corresponding_output_all_utxos", A.correspondingOutputSingleInput = "corresponding_output_single_input", A.correspondingOutputSingleInputInvalidAllUtxos = "corresponding_output_single_input_INVALID_all_utxos", A.default = "default", A.noOutputs = "no_outputs", A.noOutputsAllUtxos = "no_outputs_all_utxos", A.noOutputsSingleInput = "no_outputs_single_input", A.noOutputsSingleInputInvalidAllUtxos = "no_outputs_single_input_INVALID_all_utxos";
})(pA || (pA = {}));
const vC = (A, g = "") => {
  switch (A) {
    case `${g}${pA.allOutputs}`:
      return Uint8Array.of(hA.allOutputs);
    case `${g}${pA.allOutputsAllUtxos}`:
    case `${g}${pA.default}`:
      return Uint8Array.of(hA.allOutputsAllUtxos);
    case `${g}${pA.allOutputsSingleInput}`:
      return Uint8Array.of(hA.allOutputsSingleInput);
    case `${g}${pA.allOutputsSingleInputInvalidAllUtxos}`:
      return Uint8Array.of(
        // eslint-disable-next-line no-bitwise
        uA.allOutputs | uA.singleInput | uA.utxos | uA.forkId
      );
    case `${g}${pA.correspondingOutput}`:
      return Uint8Array.of(hA.correspondingOutput);
    case `${g}${pA.correspondingOutputAllUtxos}`:
      return Uint8Array.of(hA.correspondingOutputAllUtxos);
    case `${g}${pA.correspondingOutputSingleInput}`:
      return Uint8Array.of(hA.correspondingOutputSingleInput);
    case `${g}${pA.correspondingOutputSingleInputInvalidAllUtxos}`:
      return Uint8Array.of(
        // eslint-disable-next-line no-bitwise
        uA.correspondingOutput | uA.singleInput | uA.utxos | uA.forkId
      );
    case `${g}${pA.noOutputs}`:
      return Uint8Array.of(hA.noOutputs);
    case `${g}${pA.noOutputsAllUtxos}`:
      return Uint8Array.of(hA.noOutputsAllUtxos);
    case `${g}${pA.noOutputsSingleInput}`:
      return Uint8Array.of(hA.noOutputsSingleInput);
    case `${g}${pA.noOutputsSingleInputInvalidAllUtxos}`:
      return Uint8Array.of(
        // eslint-disable-next-line no-bitwise
        uA.noOutputs | uA.singleInput | uA.utxos | uA.forkId
      );
    default:
      return;
  }
}, VC = ({ coveredBytecode: A, identifier: g, compilationContext: I, operationName: e, privateKey: t, sha256: i, sign: n }) => {
  const [, , o, B] = g.split(".");
  if (B !== void 0)
    return {
      error: `Unknown component in "${g}" - the fragment "${B}" is not recognized.`,
      status: "error"
    };
  if (o === void 0)
    return {
      error: `Invalid signature identifier. Signatures must be of the form: "[variable_id].${e}.[signing_serialization_type]".`,
      status: "error"
    };
  const C = vC(o);
  if (C === void 0)
    return {
      error: `Unknown signing serialization algorithm, "${o}".`,
      status: "error"
    };
  const r = aI(I, { coveredBytecode: A, signingSerializationType: C }, i), E = vA(r, i);
  return {
    bytecode: Uint8Array.from([
      ...n(t, E),
      ...C
    ]),
    signature: { serialization: r },
    status: "success"
  };
}, ZC = ({ operationName: A, secp256k1Method: g }) => jg([Wg], iA({
  canBeSkipped: !1,
  configurationProperties: [
    "entityOwnership",
    "ripemd160",
    "secp256k1",
    "sha256",
    "sha512",
    "variables",
    "sourceScriptIds",
    "unlockingScripts"
  ],
  dataProperties: ["hdKeys", "compilationContext"],
  operation: (I, e, t) => {
    const { hdKeys: i, compilationContext: n } = e, { secp256k1: o, sha256: B, sourceScriptIds: C, unlockingScripts: r } = t, E = KC({
      configuration: t,
      hdKeys: i,
      identifier: I
    });
    if (E.status === "error")
      return E;
    const Q = Ne({
      configuration: t,
      data: e,
      identifier: I,
      sourceScriptIds: C,
      unlockingScripts: r
    });
    return "error" in Q ? Q : VC({
      compilationContext: n,
      coveredBytecode: Q,
      identifier: I,
      operationName: A,
      privateKey: E.bytecode,
      sha256: B,
      sign: o[g]
    });
  }
})), Eh = ZC({
  operationName: "ecdsa_signature",
  secp256k1Method: "signMessageHashDER"
}), ah = ZC({
  operationName: "schnorr_signature",
  secp256k1Method: "signMessageHashSchnorr"
}), zC = ({ operationName: A, secp256k1Method: g }) => jg([Wg], iA({
  canBeSkipped: !1,
  configurationProperties: [
    "sha256",
    "secp256k1",
    "unlockingScripts",
    "sourceScriptIds"
  ],
  dataProperties: ["keys", "compilationContext"],
  operation: (I, e, t) => {
    const { keys: i, compilationContext: n } = e, { secp256k1: o, sha256: B, unlockingScripts: C, sourceScriptIds: r } = t, { privateKeys: E } = i, [Q] = I.split("."), a = E === void 0 ? void 0 : E[Q];
    if (a === void 0)
      return {
        error: `Identifier "${I}" refers to a Key, but a private key for "${Q}" (or an existing signature) was not provided in the compilation data.`,
        recoverable: !0,
        status: "error"
      };
    const s = Ne({
      configuration: t,
      data: e,
      identifier: I,
      sourceScriptIds: r,
      unlockingScripts: C
    });
    return "error" in s ? s : VC({
      compilationContext: n,
      coveredBytecode: s,
      identifier: I,
      operationName: A,
      privateKey: a,
      sha256: B,
      sign: o[g]
    });
  }
})), sh = zC({
  operationName: "ecdsa_signature",
  secp256k1Method: "signMessageHashDER"
}), Qh = zC({
  operationName: "schnorr_signature",
  secp256k1Method: "signMessageHashSchnorr"
}), XC = ({ data: A, configuration: g, identifier: I, operationName: e, privateKey: t, sha256: i, sign: n }) => {
  const [, , o, B] = I.split(".");
  if (B !== void 0)
    return {
      error: `Unknown component in "${I}" - the fragment "${B}" is not recognized.`,
      status: "error"
    };
  if (o === void 0)
    return {
      error: `Invalid data signature identifier. Data signatures must be of the form: "[variable_id].${e}.[target_script_id]".`,
      status: "error"
    };
  const C = bC({
    configuration: g,
    data: A,
    targetScriptId: o
  });
  if (C === !1)
    return {
      error: `Data signature tried to sign an unknown target script, "${o}".`,
      status: "error"
    };
  if ("error" in C)
    return C;
  const r = i.hash(C);
  return {
    bytecode: n(t, r),
    signature: { digest: r, message: C },
    status: "success"
  };
}, jC = ({ operationName: A, secp256k1Method: g }) => jg([Wg], iA({
  canBeSkipped: !1,
  configurationProperties: ["sha256", "secp256k1"],
  dataProperties: ["keys"],
  operation: (I, e, t) => {
    const { keys: i } = e, { secp256k1: n, sha256: o } = t, { privateKeys: B } = i, [C] = I.split("."), r = B === void 0 ? void 0 : B[C];
    return r === void 0 ? {
      error: `Identifier "${I}" refers to a Key, but a private key for "${C}" (or an existing signature) was not provided in the compilation data.`,
      recoverable: !0,
      status: "error"
    } : XC({
      configuration: t,
      data: e,
      identifier: I,
      operationName: A,
      privateKey: r,
      sha256: o,
      sign: n[g]
    });
  }
})), ch = jC({
  operationName: "ecdsa_data_signature",
  secp256k1Method: "signMessageHashDER"
}), uh = jC({
  operationName: "schnorr_data_signature",
  secp256k1Method: "signMessageHashSchnorr"
}), WC = ({ operationName: A, secp256k1Method: g }) => jg([Wg], iA({
  canBeSkipped: !1,
  configurationProperties: [
    "entityOwnership",
    "ripemd160",
    "secp256k1",
    "sha256",
    "sha512",
    "variables"
  ],
  dataProperties: ["hdKeys"],
  operation: (I, e, t) => {
    const { hdKeys: i } = e, { secp256k1: n, sha256: o } = t, B = KC({
      configuration: t,
      hdKeys: i,
      identifier: I
    });
    return B.status === "error" ? B : XC({
      configuration: t,
      data: e,
      identifier: I,
      operationName: A,
      privateKey: B.bytecode,
      sha256: o,
      sign: n[g]
    });
  }
})), hh = WC({
  operationName: "ecdsa_data_signature",
  secp256k1Method: "signMessageHashDER"
}), dh = WC({
  operationName: "schnorr_data_signature",
  secp256k1Method: "signMessageHashSchnorr"
}), lh = iA({
  canBeSkipped: !1,
  configurationProperties: [],
  dataProperties: ["compilationContext"],
  operation: (A, g) => ({
    bytecode: Bi(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      g.compilationContext.sourceOutputs[g.compilationContext.inputIndex].token
    ),
    status: "success"
  })
}), kn = (A) => ({
  error: `The "signature" compiler operation was renamed to "ecdsa_signature". Consider fixing this error by changing "${A}" to "${A.replace("signature", "schnorr_signature")}" (schnorr signatures reduce transaction sizes and enable multi-party signature aggregation).`,
  status: "error"
}), mn = (A) => ({
  error: `The "data_signature" compiler operation was renamed to "ecdsa_data_signature". Consider fixing this error by changing "${A}" to "${A.replace("data_signature", "schnorr_data_signature")}" (schnorr signatures reduce transaction sizes and enable multi-party signature aggregation).`,
  status: "error"
}), PA = iA({
  canBeSkipped: !1,
  configurationProperties: ["sha256", "sourceScriptIds", "unlockingScripts"],
  dataProperties: ["compilationContext"],
  operation: (A, g, I) => {
    const [, e, t] = A.split(".");
    if (e === void 0)
      return {
        error: 'Invalid signing serialization operation. Include the desired component or algorithm, e.g. "signing_serialization.version".',
        status: "error"
      };
    if (t !== void 0)
      return {
        error: `Unknown component in "${A}" - the fragment "${t}" is not recognized.`,
        status: "error"
      };
    const i = vC(e, "full_");
    if (i === void 0)
      return {
        error: `Unknown signing serialization algorithm, "${e}".`,
        status: "error"
      };
    const { sha256: n, sourceScriptIds: o, unlockingScripts: B } = I, C = Ne({
      configuration: I,
      data: g,
      identifier: A,
      sourceScriptIds: o,
      unlockingScripts: B
    });
    if ("error" in C)
      return C;
    const { compilationContext: r } = g;
    return {
      bytecode: aI(r, {
        coveredBytecode: C,
        signingSerializationType: i
      }, n),
      status: "success"
    };
  }
}), yh = {
  ...MI,
  hdKey: {
    data_signature: mn,
    ecdsa_data_signature: hh,
    ecdsa_signature: Eh,
    public_key: MI.hdKey.public_key,
    schnorr_data_signature: dh,
    schnorr_signature: ah,
    signature: kn
  },
  key: {
    data_signature: mn,
    ecdsa_data_signature: ch,
    ecdsa_signature: sh,
    public_key: MI.key.public_key,
    schnorr_data_signature: uh,
    schnorr_signature: Qh,
    signature: kn
  },
  signingSerialization: {
    ...MI.signingSerialization,
    full_all_outputs: PA,
    full_all_outputs_all_utxos: PA,
    full_all_outputs_single_input: PA,
    full_all_outputs_single_input_INVALID_all_utxos: PA,
    full_corresponding_output: PA,
    full_corresponding_output_all_utxos: PA,
    full_corresponding_output_single_input: PA,
    full_corresponding_output_single_input_INVALID_all_utxos: PA,
    full_default: PA,
    full_no_outputs: PA,
    full_no_outputs_all_utxos: PA,
    full_no_outputs_single_input: PA,
    full_no_outputs_single_input_INVALID_all_utxos: PA,
    token_prefix: lh
  }
}, fh = (A) => nh({
  createAuthenticationProgram: Ch,
  opcodes: nQ(HB),
  operations: yh,
  ripemd160: bA,
  secp256k1: cA,
  sha256: gA,
  sha512: Sg,
  vm: A.vm ?? gu(),
  ...A
}), Dh = (A, g) => fh({
  ...g,
  ...rh(A)
}), Nh = {
  entities: {
    owner: {
      description: "The individual who can spend from this wallet.",
      name: "Owner",
      scripts: ["lock", "unlock"],
      variables: {
        key: {
          description: "The private key that controls this wallet.",
          name: "Key",
          type: "Key"
        }
      }
    }
  },
  scripts: {
    lock: {
      lockingType: "standard",
      name: "P2PKH Lock",
      script: `OP_DUP
OP_HASH160 <$(<key.public_key> OP_HASH160
)> OP_EQUALVERIFY
OP_CHECKSIG`
    },
    unlock: {
      name: "Unlock",
      script: `<key.schnorr_signature.all_outputs>
<key.public_key>`,
      unlocks: "lock"
    }
  }
};
var Lt;
(function(A) {
  A.hdPrivateKeyToP2pkhLockingBytecodeCompilation = "P2PKH utility error: could not derive P2PKH locking bytecode from the provided HD private key.", A.hdPublicKeyToP2pkhLockingBytecodeCompilation = "P2PKH utility error: could not derive P2PKH locking bytecode from the provided HD public key.", A.privateKeyToP2pkhLockingBytecodeCompilation = "P2PKH utility error: could not derive P2PKH locking bytecode from the provided private key.", A.publicKeyToP2pkhLockingBytecodeCompilation = "P2PKH utility error: could not derive P2PKH locking bytecode from the provided public key.";
})(Lt || (Lt = {}));
const _C = ({ publicKey: A, throwErrors: g = !0 }) => {
  const e = Dh(Nh).generateBytecode({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    data: { bytecode: { "key.public_key": A } },
    scriptId: "lock"
  });
  return e.success ? e.bytecode : P(Lt.publicKeyToP2pkhLockingBytecodeCompilation, wi(e.errors), g);
}, Sh = ({ publicKey: A, prefix: g = "bitcoincash", throwErrors: I = !0, tokenSupport: e = !1 }) => {
  const t = _C({
    publicKey: A,
    throwErrors: I
  });
  return typeof t == "string" ? P(t, void 0, I) : ws({
    bytecode: t,
    prefix: g,
    tokenSupport: e
  });
};
function $C(A) {
  return A && A.__esModule && Object.prototype.hasOwnProperty.call(A, "default") ? A.default : A;
}
var qe = { exports: {} }, Hn;
function ph() {
  return Hn || (Hn = 1, (function(A) {
    var g = Object.prototype.hasOwnProperty, I = "~";
    function e() {
    }
    Object.create && (e.prototype = /* @__PURE__ */ Object.create(null), new e().__proto__ || (I = !1));
    function t(B, C, r) {
      this.fn = B, this.context = C, this.once = r || !1;
    }
    function i(B, C, r, E, Q) {
      if (typeof r != "function")
        throw new TypeError("The listener must be a function");
      var a = new t(r, E || B, Q), s = I ? I + C : C;
      return B._events[s] ? B._events[s].fn ? B._events[s] = [B._events[s], a] : B._events[s].push(a) : (B._events[s] = a, B._eventsCount++), B;
    }
    function n(B, C) {
      --B._eventsCount === 0 ? B._events = new e() : delete B._events[C];
    }
    function o() {
      this._events = new e(), this._eventsCount = 0;
    }
    o.prototype.eventNames = function() {
      var C = [], r, E;
      if (this._eventsCount === 0) return C;
      for (E in r = this._events)
        g.call(r, E) && C.push(I ? E.slice(1) : E);
      return Object.getOwnPropertySymbols ? C.concat(Object.getOwnPropertySymbols(r)) : C;
    }, o.prototype.listeners = function(C) {
      var r = I ? I + C : C, E = this._events[r];
      if (!E) return [];
      if (E.fn) return [E.fn];
      for (var Q = 0, a = E.length, s = new Array(a); Q < a; Q++)
        s[Q] = E[Q].fn;
      return s;
    }, o.prototype.listenerCount = function(C) {
      var r = I ? I + C : C, E = this._events[r];
      return E ? E.fn ? 1 : E.length : 0;
    }, o.prototype.emit = function(C, r, E, Q, a, s) {
      var d = I ? I + C : C;
      if (!this._events[d]) return !1;
      var h = this._events[d], u = arguments.length, y, l;
      if (h.fn) {
        switch (h.once && this.removeListener(C, h.fn, void 0, !0), u) {
          case 1:
            return h.fn.call(h.context), !0;
          case 2:
            return h.fn.call(h.context, r), !0;
          case 3:
            return h.fn.call(h.context, r, E), !0;
          case 4:
            return h.fn.call(h.context, r, E, Q), !0;
          case 5:
            return h.fn.call(h.context, r, E, Q, a), !0;
          case 6:
            return h.fn.call(h.context, r, E, Q, a, s), !0;
        }
        for (l = 1, y = new Array(u - 1); l < u; l++)
          y[l - 1] = arguments[l];
        h.fn.apply(h.context, y);
      } else {
        var D = h.length, G;
        for (l = 0; l < D; l++)
          switch (h[l].once && this.removeListener(C, h[l].fn, void 0, !0), u) {
            case 1:
              h[l].fn.call(h[l].context);
              break;
            case 2:
              h[l].fn.call(h[l].context, r);
              break;
            case 3:
              h[l].fn.call(h[l].context, r, E);
              break;
            case 4:
              h[l].fn.call(h[l].context, r, E, Q);
              break;
            default:
              if (!y) for (G = 1, y = new Array(u - 1); G < u; G++)
                y[G - 1] = arguments[G];
              h[l].fn.apply(h[l].context, y);
          }
      }
      return !0;
    }, o.prototype.on = function(C, r, E) {
      return i(this, C, r, E, !1);
    }, o.prototype.once = function(C, r, E) {
      return i(this, C, r, E, !0);
    }, o.prototype.removeListener = function(C, r, E, Q) {
      var a = I ? I + C : C;
      if (!this._events[a]) return this;
      if (!r)
        return n(this, a), this;
      var s = this._events[a];
      if (s.fn)
        s.fn === r && (!Q || s.once) && (!E || s.context === E) && n(this, a);
      else {
        for (var d = 0, h = [], u = s.length; d < u; d++)
          (s[d].fn !== r || Q && !s[d].once || E && s[d].context !== E) && h.push(s[d]);
        h.length ? this._events[a] = h.length === 1 ? h[0] : h : n(this, a);
      }
      return this;
    }, o.prototype.removeAllListeners = function(C) {
      var r;
      return C ? (r = I ? I + C : C, this._events[r] && n(this, r)) : (this._events = new e(), this._eventsCount = 0), this;
    }, o.prototype.off = o.prototype.removeListener, o.prototype.addListener = o.prototype.on, o.prefixed = I, o.EventEmitter = o, A.exports = o;
  })(qe)), qe.exports;
}
var wh = ph();
const Hi = /* @__PURE__ */ $C(wh), kh = "hdwalletv1";
var aA;
(function(A) {
  A.DappReady = "dapp_ready", A.WalletReady = "wallet_ready", A.SignTransactionRequest = "sign_transaction_request", A.SignTransactionResponse = "sign_transaction_response", A.SignCancel = "sign_cancel", A.Disconnect = "disconnect", A.Chunk = "chunk", A.Ping = "ping", A.Pong = "pong";
})(aA || (aA = {}));
const mh = "receive", Hh = "change", Rh = "defi";
function Uh(A) {
  return A && typeof A == "object" && typeof A.name == "string" && typeof A.xpub == "string";
}
function Rn(A) {
  switch (A) {
    case mh:
      return 0;
    case Hh:
      return 1;
    case Rh:
      return 7;
    default:
      return;
  }
}
function Fh(A) {
  const g = A;
  return A !== null && typeof A == "object" && Array.isArray(g.paths) && g.paths.every((I) => Uh(I)) && (g.extensions === void 0 || typeof g.extensions == "object" && g.extensions !== null);
}
function Ar(A) {
  return A && typeof A == "object" && typeof A.action == "string" && typeof A.time == "number";
}
function Un(A) {
  return A && typeof A == "object" && A.action === aA.Chunk && typeof A.msgId == "string" && typeof A.index == "number" && typeof A.total == "number" && typeof A.data == "string" && Number.isSafeInteger(A.index) && Number.isSafeInteger(A.total) && A.total >= 1 && A.total <= 4294967295 && A.index >= 0 && A.index < A.total;
}
function Ri(A) {
  const I = ao(cA.derivePublicKeyCompressed(A)).slice(1);
  return Z(I);
}
var X;
(function(A) {
  A.Relay = "relay", A.Network = "network", A.Misc = "misc";
})(X || (X = {}));
function eA(A, ...g) {
  console.log(`[${A}]`, ...g);
}
function xA(A, ...g) {
  console.error(`[${A}]`, ...g);
}
class Gh {
  queue = [];
  isReady = !1;
  logActivity = !1;
  constructor(g) {
    this.logActivity = g?.logActivity ?? !1;
  }
  getReady() {
    return this.isReady;
  }
  getQueueLength() {
    return this.queue.length;
  }
  enqueue(g) {
    return this.isReady ? Promise.resolve() : (this.logActivity && eA(X.Relay, `net: Relays not ready, queuing message ${g.action}`), new Promise((I, e) => {
      this.queue.push({ message: g, resolve: I, reject: e });
    }));
  }
  async setReady(g) {
    this.isReady = !0;
    const I = [...this.queue];
    this.queue = [], I.length > 0 && this.logActivity && eA(X.Relay, `Processing ${I.length} queued messages`);
    for (const e of I)
      try {
        await g(e.message), e.resolve();
      } catch (t) {
        e.reject(t);
      }
  }
  setNotReady(g = "Connection closed before message could be sent") {
    this.isReady = !1;
    const I = [...this.queue];
    this.queue = [];
    for (const e of I)
      e.reject(new Error(g));
  }
  clear() {
    const g = [...this.queue];
    this.queue = [];
    for (const I of g)
      I.reject(new Error("Queue cleared"));
  }
}
const Yh = "chunk", Ph = 1, Mh = 3e4, Kh = 4e4, Fn = 12e4, bh = 1e4;
function qh() {
  return { version: Ph };
}
function Jh(A) {
  return !!A && A[Yh] !== void 0;
}
function xh(A) {
  return new TextEncoder().encode(A).length;
}
function Th(A) {
  return xh(A) > Kh;
}
function Lh(A, g) {
  const I = Zh(), e = Math.floor(Date.now() / 1e3), t = new TextEncoder().encode(A), i = vh(t), n = Math.ceil(Mh * 4 / 3), o = Math.max(1, Math.ceil(i.length / n)), B = [];
  for (let C = 0; C < o; C++)
    B.push({
      action: aA.Chunk,
      time: e,
      msgId: I,
      index: C,
      total: o,
      data: i.slice(C * n, (C + 1) * n)
    });
  return B;
}
class Oh {
  onComplete;
  logActivity;
  now;
  buffers = /* @__PURE__ */ new Map();
  /// msgIds that have already been delivered, kept for a short grace period
  /// so late-arriving duplicate chunks (e.g. cross-subscription replay after
  /// reconnect) don't spawn a second reassembly and double-deliver.
  completed = /* @__PURE__ */ new Map();
  sweeperId = null;
  constructor(g, I = !0, e = () => Date.now()) {
    this.onComplete = g, this.logActivity = I, this.now = e;
  }
  start() {
    this.sweeperId === null && (this.sweeperId = setInterval(() => this.sweep(), bh));
  }
  stop() {
    this.sweeperId !== null && (clearInterval(this.sweeperId), this.sweeperId = null), this.buffers.clear(), this.completed.clear();
  }
  /// For tests. Otherwise start() schedules this automatically.
  sweep() {
    const g = this.now();
    for (const [I, e] of this.buffers)
      e.expiresAt <= g && (this.buffers.delete(I), this.logActivity && eA(X.Relay, `Chunk reassembly timeout: ${I} (${e.received}/${e.total} received)`));
    for (const [I, e] of this.completed)
      e <= g && this.completed.delete(I);
  }
  /// Ingest one chunk. If this completes the message, onComplete fires.
  /// Duplicate chunks (same msgId/index) are idempotent. Malformed chunks
  /// are dropped silently.
  ingest(g) {
    if (this.completed.has(g.msgId))
      return;
    let I = this.buffers.get(g.msgId);
    if (!I)
      I = {
        total: g.total,
        chunks: new Array(g.total),
        received: 0,
        expiresAt: this.now() + Fn
      }, this.buffers.set(g.msgId, I);
    else if (I.total !== g.total) {
      this.logActivity && xA(X.Relay, `Chunk total mismatch for ${g.msgId}: ${g.total} vs expected ${I.total}`);
      return;
    }
    if (I.chunks[g.index] !== void 0 || (I.chunks[g.index] = g.data, I.received++, I.received !== I.total))
      return;
    this.buffers.delete(g.msgId), this.completed.set(g.msgId, this.now() + Fn);
    let e;
    try {
      const t = I.chunks.join(""), i = Vh(t), n = new TextDecoder().decode(i), o = JSON.parse(n);
      if (!Ar(o)) {
        this.logActivity && xA(X.Relay, `Reassembled chunk msgId=${g.msgId} is not a valid ProtocolMessage`);
        return;
      }
      e = o;
    } catch (t) {
      this.logActivity && xA(X.Relay, `Chunk reassembly failed for msgId=${g.msgId}:`, t);
      return;
    }
    this.logActivity && eA(X.Relay, `Reassembled chunked message: action=${e.action} chunks=${I.total}`), this.onComplete(e);
  }
  /// Test helper: number of in-flight partial messages.
  get bufferCount() {
    return this.buffers.size;
  }
}
function vh(A) {
  let I = "";
  for (let e = 0; e < A.length; e += 32768) {
    const t = A.subarray(e, e + 32768);
    I += String.fromCharCode.apply(null, t);
  }
  return btoa(I);
}
function Vh(A) {
  const g = atob(A), I = new Uint8Array(g.length);
  for (let e = 0; e < g.length; e++)
    I[e] = g.charCodeAt(e);
  return I;
}
function Zh() {
  const A = globalThis;
  if (A.crypto?.randomUUID)
    return A.crypto.randomUUID();
  const g = new Uint8Array(16), I = globalThis.crypto;
  if (I?.getRandomValues)
    I.getRandomValues(g);
  else
    for (let e = 0; e < 16; e++)
      g[e] = Math.floor(Math.random() * 256);
  return Array.from(g, (e) => e.toString(16).padStart(2, "0")).join("");
}
EE(da);
const Gn = 1059, zh = 13, Yn = 14;
class bg extends Hi {
  // Keyed by "walletPubkeyHex:dappPubkeyHex". Persists the high-water mark
  // across RelayClient instance teardowns within the same JS session so that
  // reconnects after an explicit disconnect()+connect() still filter
  // relay-replayed messages from the prior session.
  static sessionTimestamps = /* @__PURE__ */ new Map();
  pool;
  sharedPool;
  pairedPubkeyHex;
  config;
  subscription = null;
  myPubkey;
  myPubkeyHex;
  lastProcessedTimestamp = 0;
  messageQueue;
  readyTimeoutId = null;
  disconnecting = !1;
  /// Capability flag: peer advertised support for the `chunk` transport
  /// extension in its dapp_ready / wallet_ready. Set via setPeerCapabilities.
  peerSupportsChunk = !1;
  /// Receiver-side reassembly buffer. Always active — if no chunks arrive it
  /// stays empty. Started in connect(), stopped in disconnect().
  reassembler;
  sequence = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 5e5));
  pendingCalls = /* @__PURE__ */ new Map();
  pendingDeliveries = /* @__PURE__ */ new Map();
  get sessionKey() {
    return this.pairedPubkeyHex ? `${this.myPubkeyHex}:${this.pairedPubkeyHex}` : null;
  }
  constructor(g, I) {
    if (super(), this.config = {
      logNetworkActivity: !0,
      ...g
    }, this.pool = I ?? new aE({ enablePing: !0 }), this.sharedPool = I !== void 0, this.messageQueue = new Gh({
      logActivity: this.config.logNetworkActivity
    }), this.reassembler = new Oh((t) => this.handleRelayMessage(t), !!this.config.logNetworkActivity), this.myPubkey = ao(cA.derivePublicKeyCompressed(this.config.signerPrivateKey)), this.myPubkeyHex = Ri(this.config.signerPrivateKey), this.isKeyExchangeComplete()) {
      const t = this.config.pairedPublicKey.length === 33 ? this.config.pairedPublicKey.slice(1) : this.config.pairedPublicKey;
      this.pairedPubkeyHex = Z(t);
    } else
      this.pairedPubkeyHex = "";
    const e = this.sessionKey ? bg.sessionTimestamps.get(this.sessionKey) : void 0;
    e && (this.lastProcessedTimestamp = e);
  }
  setPairedPublicKey(g) {
    const I = this.pairedPubkeyHex;
    this.config.pairedPublicKey = g;
    const e = g.length === 33 ? g.slice(1) : g;
    this.pairedPubkeyHex = this.isKeyExchangeComplete() ? Z(e) : "";
    const t = this.sessionKey ? bg.sessionTimestamps.get(this.sessionKey) : void 0;
    I !== this.pairedPubkeyHex && (this.reassembler.stop(), this.subscription && this.reassembler.start()), I && I !== this.pairedPubkeyHex ? this.lastProcessedTimestamp = t ?? Math.floor(Date.now() / 1e3) - 2 : t && t > this.lastProcessedTimestamp && (this.lastProcessedTimestamp = t), this.emit("paired");
  }
  /// Set transport-level capability flags based on the peer's advertisement in
  /// its dapp_ready / wallet_ready `extensions` field. Called by the connection
  /// manager after the handshake. New capability keys are additive — callers
  /// may omit any they don't set.
  setPeerCapabilities(g) {
    g.chunk !== void 0 && (this.peerSupportsChunk = g.chunk);
  }
  getPublicKey() {
    return this.myPubkey;
  }
  getPublicKeyHex() {
    return this.myPubkeyHex;
  }
  isKeyExchangeComplete() {
    return this.config.pairedPublicKey ? !this.config.pairedPublicKey.every((g) => g === 0) : !1;
  }
  emitDisconnect(g) {
    this.disconnecting || (this.disconnecting = !0, this.emit("disconnect", g));
  }
  async connect() {
    this.config.logNetworkActivity && eA(X.Relay, "Connecting to relay..."), this.readyTimeoutId && (clearTimeout(this.readyTimeoutId), this.readyTimeoutId = null), this.subscription && (this.disconnecting = !0, await this.subscription.close(), this.subscription = null), this.disconnecting = !1, this.reassembler.start(), this.lastProcessedTimestamp === 0 && (this.lastProcessedTimestamp = Math.floor(Date.now() / 1e3) - 2);
    try {
      this.subscription = this.pool.subscribeMany(this.config.explicitRelayUrls, { kinds: [Gn], "#p": [this.myPubkeyHex] }, {
        onevent: (g) => this.handleWrappedEvent(g),
        oneose: () => {
          this.readyTimeoutId && (clearTimeout(this.readyTimeoutId), this.readyTimeoutId = null), this.config.logNetworkActivity && eA(X.Relay, "EOSE received, relay connected"), this.messageQueue.setReady((g) => this.publishMessage(g)), this.emit("connection");
        },
        onclose: (g) => {
          this.config.logNetworkActivity && eA(X.Relay, `Subscription closed: ${g.join(", ")}`), this.emitDisconnect(new Error("Subscription closed"));
        }
      }), this.readyTimeoutId = setTimeout(() => {
        this.messageQueue.getReady() || (this.config.logNetworkActivity && eA(X.Relay, "EOSE timeout, assuming ready"), this.messageQueue.setReady((g) => this.publishMessage(g)), this.emit("connection")), this.readyTimeoutId = null;
      }, 5e3), this.config.logNetworkActivity && eA(X.Relay, "Subscription created, waiting for relay connection");
    } catch (g) {
      throw this.config.logNetworkActivity && xA(X.Relay, "Connection failed:", g), g;
    }
  }
  async disconnect() {
    this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, Math.floor(Date.now() / 1e3));
    const g = this.sessionKey;
    g && bg.sessionTimestamps.set(g, this.lastProcessedTimestamp), this.messageQueue.setNotReady(), this.reassembler.stop(), this.readyTimeoutId && (clearTimeout(this.readyTimeoutId), this.readyTimeoutId = null), this.subscription && (this.subscription.close(), this.subscription = null), this.sharedPool || this.pool.close(this.config.explicitRelayUrls);
  }
  getLastProcessedTimestamp() {
    return this.lastProcessedTimestamp;
  }
  setLastProcessedTimestamp(g) {
    pI(Number.isFinite(g) && g >= 0, "Invalid replay cutoff timestamp"), this.lastProcessedTimestamp = g;
  }
  async relay(g) {
    if (!this.config.pairedPublicKey)
      throw new Error("Cannot relay message: paired public key not set. Call setPairedPublicKey() first.");
    return this.messageQueue.getReady() ? this.publishMessage(g) : this.messageQueue.enqueue(g);
  }
  async publishMessage(g) {
    const I = JSON.stringify(g);
    if (!Th(I))
      return this.publishSerialized(g.action, I);
    if (!this.peerSupportsChunk) {
      const t = new Error(`Cannot send ${g.action}: message is larger than NIP-44's 65,535-byte ceiling and the peer does not advertise the 'chunk' transport extension. Please update the connected wallet/dapp to a version that supports chunked messages.`);
      throw this.config.logNetworkActivity && xA(X.Relay, t.message), t;
    }
    const e = Lh(I);
    this.config.logNetworkActivity && eA(X.Relay, `Chunking ${g.action}: ${e.length} chunks (serialized ~${I.length} bytes)`);
    for (const t of e)
      await this.publishSerialized(`${g.action}[chunk ${t.index + 1}/${t.total}]`, JSON.stringify(t));
  }
  /// Wrap and publish one gift-wrap event. Used for both unchunked messages
  /// and individual chunks. `displayAction` is only used for logs.
  async publishSerialized(g, I) {
    this.netlog("send", g);
    const e = Ia({
      kind: Yn,
      content: I,
      created_at: Math.floor(Date.now() / 1e3),
      tags: [["p", this.pairedPubkeyHex]]
    }, this.config.signerPrivateKey, this.pairedPubkeyHex), t = await Promise.allSettled(this.pool.publish(this.config.explicitRelayUrls, e)), i = t.filter((o) => o.status === "fulfilled"), n = t.filter((o) => o.status === "rejected");
    if (n.length > 0 && this.config.logNetworkActivity)
      for (const o of n)
        xA(X.Relay, `Failed to publish ${g} to a relay:`, o.reason);
    if (i.length === 0) {
      const o = new Error(`Failed to publish ${g} to all relays`);
      throw this.config.logNetworkActivity && xA(X.Relay, o.message), this.emitDisconnect(o), o;
    }
    this.config.logNetworkActivity && eA(X.Relay, `Published message ${g} to ${i.length}/${t.length} relay(s)`);
  }
  handleWrappedEvent(g) {
    try {
      pI(g.kind === Gn && JI(g) && Wi(g) && g.tags.some((i) => i[0] === "p" && i[1] === this.myPubkeyHex), "Invalid gift wrap");
      const I = JSON.parse(ji(g.content, Xi(this.config.signerPrivateKey, g.pubkey)));
      pI(JI(I) && I.kind === zh && Wi(I), "Invalid inner seal");
      const e = JSON.parse(ji(I.content, Xi(this.config.signerPrivateKey, I.pubkey)));
      pI(JI(e) && e.kind === Yn && e.pubkey === I.pubkey, "Invalid rumor or mismatched seal author");
      let t;
      try {
        t = JSON.parse(e.content);
      } catch {
        this.config.logNetworkActivity && xA(X.Relay, "Dropping incoming message: invalid JSON");
        return;
      }
      this.routeIncoming(t, I.pubkey);
    } catch {
      this.config.logNetworkActivity && xA(X.Relay, "Dropping invalid or unreadable gift wrap");
    }
  }
  /// Authenticate the peer and validate the envelope before changing replay state.
  routeIncoming(g, I) {
    if (!this.isAcceptableMessage(g)) {
      this.config.logNetworkActivity && eA(X.Relay, "Dropping incoming message: invalid envelope");
      return;
    }
    if (g.action === aA.Chunk && !Un(g)) {
      this.config.logNetworkActivity && eA(X.Relay, "Dropping incoming message: invalid chunk envelope");
      return;
    }
    if (this.pairedPubkeyHex) {
      if (I !== this.pairedPubkeyHex) {
        this.config.logNetworkActivity && eA(X.Relay, "Dropping incoming message: unknown peer");
        return;
      }
    } else if (g.action !== aA.WalletReady) {
      this.config.logNetworkActivity && eA(X.Relay, "Dropping incoming message: unpaired peer");
      return;
    }
    if (g.action === aA.WalletReady && (!("public_key" in g) || g.public_key !== I)) {
      this.config.logNetworkActivity && eA(X.Relay, "Dropping wallet_ready: public key differs from seal signer");
      return;
    }
    if (g.time < this.lastProcessedTimestamp) {
      this.config.logNetworkActivity && eA(X.Relay, `Dropping incoming message: time ${g.time} older than cutoff ${this.lastProcessedTimestamp}`);
      return;
    }
    if (this.pairedPubkeyHex && g.time > this.lastProcessedTimestamp && (this.lastProcessedTimestamp = g.time, bg.sessionTimestamps.set(this.sessionKey, this.lastProcessedTimestamp)), Un(g)) {
      this.config.logNetworkActivity && eA(X.Relay, `Received chunk ${g.index + 1}/${g.total} (msgId=${g.msgId})`), this.reassembler.ingest(g);
      return;
    }
    this.config.logNetworkActivity && eA(X.Relay, `Received message ${g.action} from relay`), this.handleRelayMessage(g);
  }
  isConnected() {
    return this.subscription !== null;
  }
  netlog(g, I, e) {
    if (!this.config.logNetworkActivity)
      return;
    const t = Z(vA(this.config.signerPrivateKey)).slice(-6), i = this.config.pairedPublicKey ? Z(this.config.pairedPublicKey).slice(-6) : "??????", n = `c${this.pendingCalls.size} d${this.pendingDeliveries.size}`;
    g === "send" ? eA(X.Relay, `net [${e ?? "?"} ${n}] ${t} -> ${i}: ${I}`) : eA(X.Relay, `net [${e ?? "?"} ${n}] ${t} <- ${i}: ${I}`);
  }
  isAcceptableMessage(g) {
    return Ar(g) && g.action.length > 0 && Number.isFinite(g.time) && g.time > 0 && (g.action !== aA.WalletReady || "public_key" in g && typeof g.public_key == "string");
  }
  handleRelayMessage(g) {
    this.isAcceptableMessage(g) && (g.action === aA.WalletReady && this.pairedPubkeyHex && (!("public_key" in g) || g.public_key !== this.pairedPubkeyHex) || this.emit("message", g));
  }
  nextSequence() {
    const g = this.sequence;
    return this.sequence += 2, g;
  }
}
async function Pn(A) {
  return new Promise((g) => setTimeout(g, A));
}
const Xh = (A, g, I, e = {}) => {
  const { reconnectInterval: t = 5e3, maxReconnectAttempts: i = 1 / 0, enableVisibilityHandling: n = !0, scope: o = X.Network, onVisibilityChange: B } = e;
  let C = !1, r = null, E = null;
  const Q = (l) => {
    C || (g.onReconnecting(A, l), r = null, u());
  }, a = () => g.onConnected(A);
  A.on(I.connected, a);
  const s = (...l) => {
    const D = l[0] instanceof Error ? l[0].message : null;
    eA(o, "Disconnected event received", D), Q(D);
  }, d = (l) => {
    const D = l?.message || String(l);
    eA(o, "Error event received", D), Q(D), g.onError && g.onError(A, l);
  };
  A.on(I.disconnected, s), I.error && A.on(I.error, d);
  const h = () => {
    typeof document > "u" || (E = () => {
      const l = document.visibilityState;
      if (B) {
        const D = {
          client: A,
          state: l,
          setPaused: (G) => {
            C = G;
          },
          isPaused: () => C,
          startConnectionLoop: u
        };
        (async () => {
          try {
            await B(D);
          } catch (G) {
            eA(o, "Error in custom visibility change handler:", G);
          }
        })();
        return;
      }
      l === "hidden" ? (C = !0, (async () => {
        try {
          await A.disconnect(), g.onDisconnected(A);
        } catch (D) {
          eA(o, "Error disconnecting on visibility change:", D);
        }
      })()) : l === "visible" && C && (C = !1, u());
    }, document.addEventListener("visibilitychange", E));
  }, u = () => {
    r || (r = (async () => {
      let l = 0, D = !1;
      for (; ; ) {
        if (C) {
          await Pn(1e3);
          continue;
        }
        try {
          await A.connect(), l = 0, D = !0, r = null;
          return;
        } catch (G) {
          if (l++, (D || l === 1) && (g.onReconnecting(A, `${G}`), D = !1), l > i) {
            g.onDisconnected(A), r = null;
            return;
          }
          try {
            await A.disconnect();
          } catch (f) {
            eA(o, "Failed to disconnect client", f);
          }
          await Pn(t);
        }
      }
    })());
  };
  return n && h(), {
    cleanup: async () => {
      C = !0, typeof document < "u" && E !== null && document.removeEventListener("visibilitychange", E), A.off(I.connected, a), A.off(I.disconnected, s), I.error && A.off(I.error, d), g.onDisconnected(A);
      try {
        await A.disconnect();
      } catch (l) {
        eA(o, "Failed to disconnect client during cleanup", l);
      }
    },
    startConnectionLoop: u
  };
};
class WA {
  status;
  error;
  sessionId;
  constructor(g, I, e = null) {
    this.status = g, this.error = I, this.sessionId = e;
  }
  static connected(g) {
    return new WA("connected", null, g || null);
  }
  static reconnecting(g, I) {
    return new WA("reconnecting", g, I || null);
  }
  static disconnected() {
    return new WA("disconnected", null, null);
  }
  static sessionDeleted() {
    return new WA("session_deleted", null, null);
  }
}
const jh = (A, g, I, e) => {
  const t = new bg({
    explicitRelayUrls: e?.explicitRelayUrls ?? [],
    signerPrivateKey: g,
    pairedPublicKey: I
  });
  let i = 0;
  const n = Xh(t, {
    onConnected: () => {
      i > 0 ? t.setLastProcessedTimestamp(i) : i = t.getLastProcessedTimestamp(), A({
        client: t,
        status: WA.connected()
      });
    },
    onReconnecting: (o, B) => {
      A({
        client: t,
        status: WA.reconnecting(B)
      });
    },
    onDisconnected: () => {
      A({
        client: t,
        status: WA.disconnected()
      });
    },
    onError: (o, B) => {
    }
  }, {
    connected: "connection",
    disconnected: "disconnect",
    error: "error"
  }, {
    reconnectInterval: e?.reconnectInterval,
    maxReconnectAttempts: e?.maxReconnectAttempts,
    enableVisibilityHandling: e?.enableVisibilityHandling ?? !0,
    scope: X.Relay,
    onVisibilityChange: async (o) => {
      if (o.state === "hidden") {
        eA(X.Relay, "Page hidden, disconnecting relay"), o.setPaused(!0);
        try {
          await t.disconnect(), i = t.getLastProcessedTimestamp(), eA(X.Relay, `Disconnected, last processed timestamp: ${i}`), A({
            client: t,
            status: WA.disconnected()
          });
        } catch (B) {
          xA(X.Relay, "Error disconnecting on visibility change:", B);
        }
      } else o.state === "visible" && o.isPaused() && (eA(X.Relay, "Page visible, reconnecting relay"), o.setPaused(!1), o.startConnectionLoop());
    }
  });
  return n.startConnectionLoop(), () => {
    A({
      client: t,
      status: WA.disconnected()
    }), (async () => {
      try {
        await n.cleanup();
      } catch {
      }
    })();
  };
}, Mn = "relay.riften.net", Wh = 443, Kn = "wss", _h = [
  "wss://relay.riften.net:443",
  "wss://relay.cauldron.quest:443"
];
function $h() {
  const A = Dn(), g = Z(A), I = Ri(A), t = Dn().slice(0, 8), i = Z(t);
  return {
    privateKey: g,
    publicKey: I,
    secret: i
  };
}
function Ad(A, g, I = {}) {
  const e = lA(A), t = lA(g);
  if (e.length !== 32)
    throw new Error(`Invalid public key length: expected 32 bytes, got ${e.length}`);
  if (t.length !== 8)
    throw new Error(`Invalid secret length: expected 8 bytes, got ${t.length}`);
  const i = en(e).toLowerCase(), n = en(t).toLowerCase(), o = I.hostname || Mn, B = I.port ?? Wh, C = I.protocol || Kn, r = o === Mn, Q = B === (C === "wss" ? 443 : 80), a = C === Kn;
  let s;
  if (r && Q && a)
    s = `wiz://?p=${i}&s=${n}`;
  else {
    const h = Q ? "" : `:${B}`;
    s = `wiz://${`${o}${h}`}?p=${i}&s=${n}`, a || (s += `&pr=${C}`);
  }
  const d = s.toUpperCase().replace("?", "%3F").replace(/=/g, "%3D").replace(/&/g, "%26");
  return { uri: s, qrUri: d };
}
function gd(A, g = {}) {
  const I = new Hi();
  let e, t;
  if (g.existingCredentials) {
    const s = g.existingCredentials.privateKey;
    if (s.length !== 64)
      throw new Error("Private key must be 64 hex characters (32 bytes)");
    t = lA(s);
    const d = Ri(t);
    e = {
      privateKey: s,
      publicKey: d,
      secret: g.existingCredentials.secret
    };
  } else
    e = $h(), t = lA(e.privateKey);
  let i = {};
  if (g.explicitRelayUrls && g.explicitRelayUrls.length > 0) {
    const s = g.explicitRelayUrls[0], d = s.match(/^wss?:\/\/([^:/]+)/), h = s.match(/:(\d+)/);
    d && (i.hostname = d[1]), h && (i.port = parseInt(h[1], 10)), s.startsWith("wss://") ? i.protocol = "wss" : s.startsWith("ws://") && (i.protocol = "ws");
  }
  const { uri: n, qrUri: o } = Ad(e.publicKey, e.secret, i);
  let B = null, C = !1, r = null;
  g.existingCredentials && (r = lA(g.existingCredentials.walletPublicKey), C = !0);
  const E = (s) => {
    B || (B = s.client, B.on("message", async (d) => {
      if (d.action === aA.WalletReady) {
        const h = d;
        if (h.secret !== e.secret) {
          C || xA(X.Relay, "Key exchange failed: secret mismatch");
          return;
        }
        const u = lA(h.public_key);
        if (u.length !== 32) {
          xA(X.Relay, "Invalid wallet public key length");
          return;
        }
        r = u, B.setPairedPublicKey(u), C || (C = !0, I.emit("keyexchangecomplete", u));
      }
    })), s.status.status === "connected" && r && B && (B.setPairedPublicKey(r), C = !0), A(s);
  }, Q = g.explicitRelayUrls && g.explicitRelayUrls.length > 0 ? g.explicitRelayUrls : [..._h], a = jh(E, t, r ?? new Uint8Array(33), {
    explicitRelayUrls: Q,
    reconnectInterval: g.reconnectInterval,
    maxReconnectAttempts: g.maxReconnectAttempts
  });
  return {
    client: B,
    uri: n,
    qrUri: o,
    credentials: e,
    events: I,
    cleanup: a
  };
}
var oI;
(function(A) {
  A.ProtocolMismatch = "protocol_mismatch", A.UserDisconnect = "user_disconnect";
})(oI || (oI = {}));
class Id {
  // xpub nodes for on-demand pubkey derivation
  xpubNodes = /* @__PURE__ */ new Map();
  /** Derive a pubkey on demand from the stored xpub node. */
  getPubkey(g, I) {
    const e = this.xpubNodes.get(g);
    if (!e)
      return;
    const t = wC(e, Number(I));
    if (typeof t != "string")
      return t.publicKey;
  }
  /** Returns true if an xpub node is available for this child index. */
  hasPath(g) {
    return this.xpubNodes.has(g);
  }
  setXpubNode(g, I) {
    this.xpubNodes.set(g, I);
  }
  getXpubNode(g) {
    return this.xpubNodes.get(g);
  }
}
function ed() {
  return typeof localStorage < "u" && typeof localStorage.getItem == "function" ? localStorage : null;
}
function Ui(A) {
  return A ?? ed();
}
const Se = "wizardconnect-session";
function uI(A = Se, g) {
  const I = Ui(g);
  if (!I)
    return null;
  const e = I.getItem(A);
  if (!e)
    return null;
  try {
    const t = JSON.parse(e);
    return !t.privateKey || !t.secret ? null : t;
  } catch {
    return null;
  }
}
function Je(A = Se, g, I) {
  const e = Ui(I);
  if (!e)
    return;
  const i = { ...uI(A, e), ...g };
  e.setItem(A, JSON.stringify(i));
}
function td(A = Se, g) {
  const I = Ui(g);
  I && I.removeItem(A);
}
class id extends Hi {
  dappName;
  dappIcon;
  conn = null;
  listenerAttached = !1;
  /** Pubkey state — exposed for callers that need to query by index. */
  pubkeyState;
  walletName = null;
  walletIcon = null;
  protocol = null;
  /** Protocols this dapp supports, in preference order. */
  supportedProtocols = [kh];
  walletDiscovered = !1;
  disconnectGraceTimer = null;
  pingInterval = null;
  /** Timestamp (ms) of the last pong or wallet_ready received. Used for liveness detection. */
  lastPongTime = 0;
  sessionPaths = [];
  pendingSignatureRequests = /* @__PURE__ */ new Map();
  sessionOptions = null;
  /**
   * @param dappName  Optional display name of the dapp (sent in dapp_ready).
   * @param dappIcon  Optional icon URL/data-URI of the dapp (sent in dapp_ready).
   * @param options   Optional configuration. Session persistence is enabled by
   *                  default (key: "wizardconnect-session", storage: localStorage).
   *                  Pass `session: false` to disable.
   */
  constructor(g, I, e) {
    if (super(), this.dappName = g, this.dappIcon = I, this.pubkeyState = new Id(), e?.session !== !1) {
      const t = e?.session ?? {};
      this.sessionOptions = {
        key: t.key ?? Se,
        storage: t.storage
      };
      const i = uI(this.sessionOptions.key, this.sessionOptions.storage);
      if (i && (i.walletName && (this.walletName = i.walletName), i.walletIcon && (this.walletIcon = i.walletIcon), i.paths?.length))
        try {
          this.restoreSessionPaths(i.paths);
        } catch {
        }
    }
  }
  // --- Session persistence (public API) ----------------------------------------
  /**
   * Attach a relay result from `initiateDappRelay()`. Automatically:
   * - Saves relay credentials (privateKey, secret) to the session
   * - Listens for `keyexchangecomplete` and saves the wallet public key
   *
   * No-op if session persistence is disabled.
   */
  attachRelay(g) {
    this.sessionOptions && (Je(this.sessionOptions.key, {
      privateKey: g.credentials.privateKey,
      secret: g.credentials.secret
    }, this.sessionOptions.storage), g.events.on("keyexchangecomplete", (I) => {
      this.sessionOptions && Je(this.sessionOptions.key, { walletPublicKey: Z(I) }, this.sessionOptions.storage);
    }));
  }
  /**
   * Load the stored session (e.g. for reconnection).
   * Returns null if session persistence is disabled or no session exists.
   */
  loadStoredSession() {
    return this.sessionOptions ? uI(this.sessionOptions.key, this.sessionOptions.storage) : null;
  }
  /**
   * Clear the stored session. Call on disconnect.
   * No-op if session persistence is disabled.
   */
  clearStoredSession() {
    this.sessionOptions && td(this.sessionOptions.key, this.sessionOptions.storage);
  }
  // --- Relay connection -------------------------------------------------------
  /**
   * Call this from the RelayStatusCallback passed to `initiateDappRelay`.
   * Attaches the message listener exactly once and re-sends dapp_ready
   * each time the connection is established (handles reconnects).
   */
  updateConnection(g, I) {
    g && (this.listenerAttached || (this.listenerAttached = !0, g.on("message", (e) => this.handleMessage(e))), this.conn = g), I.status === "connected" && this.conn ? this.onConnected() : (I.status === "reconnecting" || I.status === "disconnected") && (this.stopPingInterval(), I.status === "reconnecting" && this.emit("reconnecting"));
  }
  isWalletDiscovered() {
    return this.walletDiscovered;
  }
  /**
   * Get a sequence number from the relay client.
   * Use this to populate the `sequence` field of a SignTransactionRequest.
   */
  nextSequence() {
    if (!this.conn)
      throw new Error("[wizardconnect/dapp] Not connected");
    return this.conn.nextSequence();
  }
  /**
   * Send a sign transaction request and wait for the wallet's response.
   * The caller is responsible for creating the full SignTransactionRequest
   * (including sequence from `nextSequence()`).
   */
  async sendSignRequest(g) {
    if (!this.conn)
      throw new Error("[wizardconnect/dapp] Not connected");
    return new Promise((I, e) => {
      this.pendingSignatureRequests.set(g.sequence, {
        request: g,
        resolve: I,
        reject: e
      }), this.conn.relay(g).then(() => {
        this.emit("messagesent", g);
      }).catch((t) => {
        this.pendingSignatureRequests.delete(g.sequence), e(t instanceof Error ? t : new Error(String(t)));
      });
    });
  }
  /**
   * Cancel an in-flight sign request.
   * Immediately rejects the pending Promise and sends sign_cancel to the wallet.
   */
  async sendSignCancel(g, I) {
    const e = this.pendingSignatureRequests.get(g);
    if (e && (this.pendingSignatureRequests.delete(g), e.reject(new Error(I ?? "Sign request cancelled"))), !this.conn)
      return;
    const t = {
      action: aA.SignCancel,
      sequence: g,
      ...I !== void 0 && { reason: I },
      time: Math.floor(Date.now() / 1e3)
    };
    await this.conn.relay(t), this.emit("messagesent", t);
  }
  /**
   * Send a disconnect message to the wallet (courtesy notification).
   * The caller is responsible for calling dappRelay.cleanup() afterwards.
   */
  async sendDisconnect(g) {
    if (!this.conn)
      return;
    const I = {
      action: aA.Disconnect,
      reason: oI.UserDisconnect,
      time: Math.floor(Date.now() / 1e3),
      ...g !== void 0 && { message: g }
    };
    await this.conn.relay(I), this.emit("messagesent", I);
  }
  /**
   * Convenience method: build and send a sign transaction request.
   * Auto-fills `action`, `sequence`, and `time`. Supports cancellation via
   * AbortSignal — when aborted, sendSignCancel is called automatically.
   */
  async signTransaction(g, I) {
    const e = this.nextSequence(), t = {
      action: aA.SignTransactionRequest,
      time: Math.floor(Date.now() / 1e3),
      sequence: e,
      ...g
    }, i = this.sendSignRequest(t);
    return I?.signal ? (i.catch(() => {
    }), new Promise((n, o) => {
      const B = () => {
        const C = I.signal.reason instanceof Error ? I.signal.reason.message : typeof I.signal.reason == "string" ? I.signal.reason : "Sign request cancelled";
        this.sendSignCancel(e, C).catch(() => {
        }), o(new DOMException(C, "AbortError"));
      };
      if (I.signal.aborted) {
        B();
        return;
      }
      I.signal.addEventListener("abort", B, { once: !0 }), i.then(n).catch(o).finally(() => {
        I.signal.removeEventListener("abort", B);
      });
    })) : i;
  }
  // --- Pubkey state delegation ------------------------------------------------
  // Convenience methods that forward to pubkeyState.
  getPubkey(g, I) {
    return this.pubkeyState.getPubkey(g, I);
  }
  /** Returns true if an xpub node is available for this child index. */
  hasPath(g) {
    return this.pubkeyState.hasPath(g);
  }
  /**
   * Returns the stored xpub node for the given child index.
   * Available after wallet_ready is received.
   */
  getXpubNode(g) {
    return this.pubkeyState.getXpubNode(g);
  }
  /**
   * Returns the raw PathXpub entries received from the wallet.
   * Available after wallet_ready is received.
   */
  getSessionPaths() {
    return [...this.sessionPaths];
  }
  /**
   * Restore session paths from a previous session (e.g. from localStorage).
   * Decodes xpub strings and populates pubkeyState so getPubkey() works
   * without waiting for wallet_ready.
   */
  restoreSessionPaths(g) {
    this.sessionPaths = [...g];
    for (const I of g) {
      const e = ee(I.xpub);
      if (typeof e == "string")
        throw new Error(`[wizardconnect/dapp] Invalid xpub for path "${I.name}": ${e}`);
      const t = Rn(I.name);
      t !== void 0 && this.pubkeyState.setXpubNode(t, e.node);
    }
  }
  // --- Private protocol handling -------------------------------------------
  onConnected() {
    (async () => {
      const g = Date.now() + 3e4;
      for (; this.conn && !this.conn.isKeyExchangeComplete(); ) {
        if (Date.now() >= g) {
          console.error("[wizardconnect/dapp] Key exchange timed out");
          return;
        }
        await new Promise((I) => setTimeout(I, 100));
      }
      this.conn && await this.pushDappReady();
    })().catch((g) => console.error("[wizardconnect/dapp] Error in onConnected:", g));
  }
  startPingInterval() {
    this.stopPingInterval(), this.lastPongTime = Date.now(), this.pingInterval = setInterval(() => {
      if (!this.conn || !this.walletDiscovered)
        return;
      if (Date.now() - this.lastPongTime > 75e3) {
        this.stopPingInterval(), this.emit("reconnecting");
        return;
      }
      const g = {
        action: aA.Ping,
        time: Math.floor(Date.now() / 1e3)
      };
      this.conn.relay(g).catch(() => {
      });
    }, 1e4);
  }
  stopPingInterval() {
    this.pingInterval !== null && (clearInterval(this.pingInterval), this.pingInterval = null);
  }
  destroy() {
    this.stopPingInterval(), this.disconnectGraceTimer !== null && (clearTimeout(this.disconnectGraceTimer), this.disconnectGraceTimer = null);
  }
  async pushDappReady() {
    if (!this.conn)
      return;
    const g = {
      action: aA.DappReady,
      supported_protocols: this.supportedProtocols,
      wallet_discovered: this.walletDiscovered,
      time: Math.floor(Date.now() / 1e3),
      // Include selected_protocol on the reactive send (after the dapp has seen the wallet)
      ...this.walletDiscovered && this.protocol && { selected_protocol: this.protocol },
      ...this.dappName !== void 0 && { dapp_name: this.dappName },
      ...this.dappIcon !== void 0 && { dapp_icon: this.dappIcon },
      // Transport-level: advertise chunking so the wallet can send large
      // SignTransactionResponses (signed tx hex can reach ~2 MB) that exceed
      // NIP-44's plaintext ceiling.
      extensions: { chunk: qh() }
    };
    await this.conn.relay(g), this.emit("messagesent", g);
  }
  handleMessage(g) {
    switch (this.emit("messagereceived", g), g.action) {
      case aA.WalletReady:
        this.handleWalletReady(g).catch((I) => console.error("[wizardconnect/dapp] Error handling wallet_ready:", I));
        break;
      case aA.SignTransactionResponse:
        this.handleSignTransactionResponse(g);
        break;
      case aA.Disconnect:
        this.handleRemoteDisconnect(g);
        break;
      case aA.Pong:
        this.lastPongTime = Date.now();
        break;
      case aA.DappReady:
        break;
    }
  }
  handleRemoteDisconnect(g) {
    this.disconnectGraceTimer !== null && clearTimeout(this.disconnectGraceTimer), this.disconnectGraceTimer = setTimeout(() => {
      this.disconnectGraceTimer = null, this.stopPingInterval(), this.emit("disconnect", g.reason, g.message);
    }, 8e3);
  }
  async handleWalletReady(g) {
    this.disconnectGraceTimer !== null && (clearTimeout(this.disconnectGraceTimer), this.disconnectGraceTimer = null), this.lastPongTime = Date.now(), this.walletDiscovered = !0, this.walletName = g.wallet_name, this.walletIcon = g.wallet_icon;
    const I = this.supportedProtocols.find((t) => g.supported_protocols.includes(t));
    if (!I) {
      const t = `No protocol overlap. Wallet: [${g.supported_protocols}], Dapp: [${this.supportedProtocols}]`, i = {
        action: aA.Disconnect,
        reason: oI.ProtocolMismatch,
        message: t,
        time: Math.floor(Date.now() / 1e3)
      };
      this.conn?.relay(i).catch(() => {
      }), this.stopPingInterval(), this.emit("disconnect", oI.ProtocolMismatch, t);
      return;
    }
    this.protocol = I;
    const e = g.session[I];
    if (!Fh(e)) {
      console.error("[wizardconnect/dapp] Invalid hdwalletv1 session data:", e);
      return;
    }
    this.conn && this.conn.setPeerCapabilities({
      chunk: Jh(g.extensions)
    }), this.sessionPaths = [...e.paths];
    for (const t of e.paths) {
      const i = ee(t.xpub);
      if (typeof i == "string") {
        console.warn("[wizardconnect/dapp] Bad xpub for path", t.name, i);
        continue;
      }
      const n = Rn(t.name);
      n !== void 0 && this.pubkeyState.setXpubNode(n, i.node);
    }
    if (g.dapp_discovered || await this.pushDappReady().catch((t) => console.error("[wizardconnect/dapp] Error pushing dapp_ready:", t)), this.emit("walletready", g), this.pendingSignatureRequests.size > 0) {
      const t = Math.floor(Date.now() / 1e3);
      for (const [, i] of this.pendingSignatureRequests) {
        const n = { ...i.request, time: t };
        this.conn.relay(n).then(() => this.emit("messagesent", n)).catch((o) => {
          this.pendingSignatureRequests.delete(i.request.sequence), i.reject(o instanceof Error ? o : new Error(String(o)));
        });
      }
    }
    if (this.sessionOptions) {
      const t = {
        walletName: this.walletName ?? void 0,
        walletIcon: this.walletIcon ?? void 0,
        paths: this.getSessionPaths()
      };
      Je(this.sessionOptions.key, t, this.sessionOptions.storage);
    }
    this.startPingInterval();
  }
  handleSignTransactionResponse(g) {
    const I = this.pendingSignatureRequests.get(g.sequence);
    if (!I) {
      console.warn("[wizardconnect/dapp] No pending request for sequence:", g.sequence);
      return;
    }
    this.pendingSignatureRequests.delete(g.sequence), g.error ? I.reject(new Error(g.error)) : I.resolve(g);
  }
}
var Fg = {}, xe, bn;
function nd() {
  return bn || (bn = 1, xe = function() {
    return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
  }), xe;
}
var Te = {}, sg = {}, qn;
function pg() {
  if (qn) return sg;
  qn = 1;
  let A;
  const g = [
    0,
    // Not used
    26,
    44,
    70,
    100,
    134,
    172,
    196,
    242,
    292,
    346,
    404,
    466,
    532,
    581,
    655,
    733,
    815,
    901,
    991,
    1085,
    1156,
    1258,
    1364,
    1474,
    1588,
    1706,
    1828,
    1921,
    2051,
    2185,
    2323,
    2465,
    2611,
    2761,
    2876,
    3034,
    3196,
    3362,
    3532,
    3706
  ];
  return sg.getSymbolSize = function(e) {
    if (!e) throw new Error('"version" cannot be null or undefined');
    if (e < 1 || e > 40) throw new Error('"version" should be in range from 1 to 40');
    return e * 4 + 17;
  }, sg.getSymbolTotalCodewords = function(e) {
    return g[e];
  }, sg.getBCHDigit = function(I) {
    let e = 0;
    for (; I !== 0; )
      e++, I >>>= 1;
    return e;
  }, sg.setToSJISFunction = function(e) {
    if (typeof e != "function")
      throw new Error('"toSJISFunc" is not a valid function.');
    A = e;
  }, sg.isKanjiModeEnabled = function() {
    return typeof A < "u";
  }, sg.toSJIS = function(e) {
    return A(e);
  }, sg;
}
var Le = {}, Jn;
function Fi() {
  return Jn || (Jn = 1, (function(A) {
    A.L = { bit: 1 }, A.M = { bit: 0 }, A.Q = { bit: 3 }, A.H = { bit: 2 };
    function g(I) {
      if (typeof I != "string")
        throw new Error("Param is not a string");
      switch (I.toLowerCase()) {
        case "l":
        case "low":
          return A.L;
        case "m":
        case "medium":
          return A.M;
        case "q":
        case "quartile":
          return A.Q;
        case "h":
        case "high":
          return A.H;
        default:
          throw new Error("Unknown EC Level: " + I);
      }
    }
    A.isValid = function(e) {
      return e && typeof e.bit < "u" && e.bit >= 0 && e.bit < 4;
    }, A.from = function(e, t) {
      if (A.isValid(e))
        return e;
      try {
        return g(e);
      } catch {
        return t;
      }
    };
  })(Le)), Le;
}
var Oe, xn;
function od() {
  if (xn) return Oe;
  xn = 1;
  function A() {
    this.buffer = [], this.length = 0;
  }
  return A.prototype = {
    get: function(g) {
      const I = Math.floor(g / 8);
      return (this.buffer[I] >>> 7 - g % 8 & 1) === 1;
    },
    put: function(g, I) {
      for (let e = 0; e < I; e++)
        this.putBit((g >>> I - e - 1 & 1) === 1);
    },
    getLengthInBits: function() {
      return this.length;
    },
    putBit: function(g) {
      const I = Math.floor(this.length / 8);
      this.buffer.length <= I && this.buffer.push(0), g && (this.buffer[I] |= 128 >>> this.length % 8), this.length++;
    }
  }, Oe = A, Oe;
}
var ve, Tn;
function Bd() {
  if (Tn) return ve;
  Tn = 1;
  function A(g) {
    if (!g || g < 1)
      throw new Error("BitMatrix size must be defined and greater than 0");
    this.size = g, this.data = new Uint8Array(g * g), this.reservedBit = new Uint8Array(g * g);
  }
  return A.prototype.set = function(g, I, e, t) {
    const i = g * this.size + I;
    this.data[i] = e, t && (this.reservedBit[i] = !0);
  }, A.prototype.get = function(g, I) {
    return this.data[g * this.size + I];
  }, A.prototype.xor = function(g, I, e) {
    this.data[g * this.size + I] ^= e;
  }, A.prototype.isReserved = function(g, I) {
    return this.reservedBit[g * this.size + I];
  }, ve = A, ve;
}
var Ve = {}, Ln;
function Cd() {
  return Ln || (Ln = 1, (function(A) {
    const g = pg().getSymbolSize;
    A.getRowColCoords = function(e) {
      if (e === 1) return [];
      const t = Math.floor(e / 7) + 2, i = g(e), n = i === 145 ? 26 : Math.ceil((i - 13) / (2 * t - 2)) * 2, o = [i - 7];
      for (let B = 1; B < t - 1; B++)
        o[B] = o[B - 1] - n;
      return o.push(6), o.reverse();
    }, A.getPositions = function(e) {
      const t = [], i = A.getRowColCoords(e), n = i.length;
      for (let o = 0; o < n; o++)
        for (let B = 0; B < n; B++)
          o === 0 && B === 0 || // top-left
          o === 0 && B === n - 1 || // bottom-left
          o === n - 1 && B === 0 || t.push([i[o], i[B]]);
      return t;
    };
  })(Ve)), Ve;
}
var Ze = {}, On;
function rd() {
  if (On) return Ze;
  On = 1;
  const A = pg().getSymbolSize, g = 7;
  return Ze.getPositions = function(e) {
    const t = A(e);
    return [
      // top-left
      [0, 0],
      // top-right
      [t - g, 0],
      // bottom-left
      [0, t - g]
    ];
  }, Ze;
}
var ze = {}, vn;
function Ed() {
  return vn || (vn = 1, (function(A) {
    A.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    const g = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    A.isValid = function(t) {
      return t != null && t !== "" && !isNaN(t) && t >= 0 && t <= 7;
    }, A.from = function(t) {
      return A.isValid(t) ? parseInt(t, 10) : void 0;
    }, A.getPenaltyN1 = function(t) {
      const i = t.size;
      let n = 0, o = 0, B = 0, C = null, r = null;
      for (let E = 0; E < i; E++) {
        o = B = 0, C = r = null;
        for (let Q = 0; Q < i; Q++) {
          let a = t.get(E, Q);
          a === C ? o++ : (o >= 5 && (n += g.N1 + (o - 5)), C = a, o = 1), a = t.get(Q, E), a === r ? B++ : (B >= 5 && (n += g.N1 + (B - 5)), r = a, B = 1);
        }
        o >= 5 && (n += g.N1 + (o - 5)), B >= 5 && (n += g.N1 + (B - 5));
      }
      return n;
    }, A.getPenaltyN2 = function(t) {
      const i = t.size;
      let n = 0;
      for (let o = 0; o < i - 1; o++)
        for (let B = 0; B < i - 1; B++) {
          const C = t.get(o, B) + t.get(o, B + 1) + t.get(o + 1, B) + t.get(o + 1, B + 1);
          (C === 4 || C === 0) && n++;
        }
      return n * g.N2;
    }, A.getPenaltyN3 = function(t) {
      const i = t.size;
      let n = 0, o = 0, B = 0;
      for (let C = 0; C < i; C++) {
        o = B = 0;
        for (let r = 0; r < i; r++)
          o = o << 1 & 2047 | t.get(C, r), r >= 10 && (o === 1488 || o === 93) && n++, B = B << 1 & 2047 | t.get(r, C), r >= 10 && (B === 1488 || B === 93) && n++;
      }
      return n * g.N3;
    }, A.getPenaltyN4 = function(t) {
      let i = 0;
      const n = t.data.length;
      for (let B = 0; B < n; B++) i += t.data[B];
      return Math.abs(Math.ceil(i * 100 / n / 5) - 10) * g.N4;
    };
    function I(e, t, i) {
      switch (e) {
        case A.Patterns.PATTERN000:
          return (t + i) % 2 === 0;
        case A.Patterns.PATTERN001:
          return t % 2 === 0;
        case A.Patterns.PATTERN010:
          return i % 3 === 0;
        case A.Patterns.PATTERN011:
          return (t + i) % 3 === 0;
        case A.Patterns.PATTERN100:
          return (Math.floor(t / 2) + Math.floor(i / 3)) % 2 === 0;
        case A.Patterns.PATTERN101:
          return t * i % 2 + t * i % 3 === 0;
        case A.Patterns.PATTERN110:
          return (t * i % 2 + t * i % 3) % 2 === 0;
        case A.Patterns.PATTERN111:
          return (t * i % 3 + (t + i) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + e);
      }
    }
    A.applyMask = function(t, i) {
      const n = i.size;
      for (let o = 0; o < n; o++)
        for (let B = 0; B < n; B++)
          i.isReserved(B, o) || i.xor(B, o, I(t, B, o));
    }, A.getBestMask = function(t, i) {
      const n = Object.keys(A.Patterns).length;
      let o = 0, B = 1 / 0;
      for (let C = 0; C < n; C++) {
        i(C), A.applyMask(C, t);
        const r = A.getPenaltyN1(t) + A.getPenaltyN2(t) + A.getPenaltyN3(t) + A.getPenaltyN4(t);
        A.applyMask(C, t), r < B && (B = r, o = C);
      }
      return o;
    };
  })(ze)), ze;
}
var KI = {}, Vn;
function gr() {
  if (Vn) return KI;
  Vn = 1;
  const A = Fi(), g = [
    // L  M  Q  H
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    1,
    2,
    2,
    4,
    1,
    2,
    4,
    4,
    2,
    4,
    4,
    4,
    2,
    4,
    6,
    5,
    2,
    4,
    6,
    6,
    2,
    5,
    8,
    8,
    4,
    5,
    8,
    8,
    4,
    5,
    8,
    11,
    4,
    8,
    10,
    11,
    4,
    9,
    12,
    16,
    4,
    9,
    16,
    16,
    6,
    10,
    12,
    18,
    6,
    10,
    17,
    16,
    6,
    11,
    16,
    19,
    6,
    13,
    18,
    21,
    7,
    14,
    21,
    25,
    8,
    16,
    20,
    25,
    8,
    17,
    23,
    25,
    9,
    17,
    23,
    34,
    9,
    18,
    25,
    30,
    10,
    20,
    27,
    32,
    12,
    21,
    29,
    35,
    12,
    23,
    34,
    37,
    12,
    25,
    34,
    40,
    13,
    26,
    35,
    42,
    14,
    28,
    38,
    45,
    15,
    29,
    40,
    48,
    16,
    31,
    43,
    51,
    17,
    33,
    45,
    54,
    18,
    35,
    48,
    57,
    19,
    37,
    51,
    60,
    19,
    38,
    53,
    63,
    20,
    40,
    56,
    66,
    21,
    43,
    59,
    70,
    22,
    45,
    62,
    74,
    24,
    47,
    65,
    77,
    25,
    49,
    68,
    81
  ], I = [
    // L  M  Q  H
    7,
    10,
    13,
    17,
    10,
    16,
    22,
    28,
    15,
    26,
    36,
    44,
    20,
    36,
    52,
    64,
    26,
    48,
    72,
    88,
    36,
    64,
    96,
    112,
    40,
    72,
    108,
    130,
    48,
    88,
    132,
    156,
    60,
    110,
    160,
    192,
    72,
    130,
    192,
    224,
    80,
    150,
    224,
    264,
    96,
    176,
    260,
    308,
    104,
    198,
    288,
    352,
    120,
    216,
    320,
    384,
    132,
    240,
    360,
    432,
    144,
    280,
    408,
    480,
    168,
    308,
    448,
    532,
    180,
    338,
    504,
    588,
    196,
    364,
    546,
    650,
    224,
    416,
    600,
    700,
    224,
    442,
    644,
    750,
    252,
    476,
    690,
    816,
    270,
    504,
    750,
    900,
    300,
    560,
    810,
    960,
    312,
    588,
    870,
    1050,
    336,
    644,
    952,
    1110,
    360,
    700,
    1020,
    1200,
    390,
    728,
    1050,
    1260,
    420,
    784,
    1140,
    1350,
    450,
    812,
    1200,
    1440,
    480,
    868,
    1290,
    1530,
    510,
    924,
    1350,
    1620,
    540,
    980,
    1440,
    1710,
    570,
    1036,
    1530,
    1800,
    570,
    1064,
    1590,
    1890,
    600,
    1120,
    1680,
    1980,
    630,
    1204,
    1770,
    2100,
    660,
    1260,
    1860,
    2220,
    720,
    1316,
    1950,
    2310,
    750,
    1372,
    2040,
    2430
  ];
  return KI.getBlocksCount = function(t, i) {
    switch (i) {
      case A.L:
        return g[(t - 1) * 4 + 0];
      case A.M:
        return g[(t - 1) * 4 + 1];
      case A.Q:
        return g[(t - 1) * 4 + 2];
      case A.H:
        return g[(t - 1) * 4 + 3];
      default:
        return;
    }
  }, KI.getTotalCodewordsCount = function(t, i) {
    switch (i) {
      case A.L:
        return I[(t - 1) * 4 + 0];
      case A.M:
        return I[(t - 1) * 4 + 1];
      case A.Q:
        return I[(t - 1) * 4 + 2];
      case A.H:
        return I[(t - 1) * 4 + 3];
      default:
        return;
    }
  }, KI;
}
var Xe = {}, AI = {}, Zn;
function ad() {
  if (Zn) return AI;
  Zn = 1;
  const A = new Uint8Array(512), g = new Uint8Array(256);
  return (function() {
    let e = 1;
    for (let t = 0; t < 255; t++)
      A[t] = e, g[e] = t, e <<= 1, e & 256 && (e ^= 285);
    for (let t = 255; t < 512; t++)
      A[t] = A[t - 255];
  })(), AI.log = function(e) {
    if (e < 1) throw new Error("log(" + e + ")");
    return g[e];
  }, AI.exp = function(e) {
    return A[e];
  }, AI.mul = function(e, t) {
    return e === 0 || t === 0 ? 0 : A[g[e] + g[t]];
  }, AI;
}
var zn;
function sd() {
  return zn || (zn = 1, (function(A) {
    const g = ad();
    A.mul = function(e, t) {
      const i = new Uint8Array(e.length + t.length - 1);
      for (let n = 0; n < e.length; n++)
        for (let o = 0; o < t.length; o++)
          i[n + o] ^= g.mul(e[n], t[o]);
      return i;
    }, A.mod = function(e, t) {
      let i = new Uint8Array(e);
      for (; i.length - t.length >= 0; ) {
        const n = i[0];
        for (let B = 0; B < t.length; B++)
          i[B] ^= g.mul(t[B], n);
        let o = 0;
        for (; o < i.length && i[o] === 0; ) o++;
        i = i.slice(o);
      }
      return i;
    }, A.generateECPolynomial = function(e) {
      let t = new Uint8Array([1]);
      for (let i = 0; i < e; i++)
        t = A.mul(t, new Uint8Array([1, g.exp(i)]));
      return t;
    };
  })(Xe)), Xe;
}
var je, Xn;
function Qd() {
  if (Xn) return je;
  Xn = 1;
  const A = sd();
  function g(I) {
    this.genPoly = void 0, this.degree = I, this.degree && this.initialize(this.degree);
  }
  return g.prototype.initialize = function(e) {
    this.degree = e, this.genPoly = A.generateECPolynomial(this.degree);
  }, g.prototype.encode = function(e) {
    if (!this.genPoly)
      throw new Error("Encoder not initialized");
    const t = new Uint8Array(e.length + this.degree);
    t.set(e);
    const i = A.mod(t, this.genPoly), n = this.degree - i.length;
    if (n > 0) {
      const o = new Uint8Array(this.degree);
      return o.set(i, n), o;
    }
    return i;
  }, je = g, je;
}
var We = {}, _e = {}, $e = {}, jn;
function Ir() {
  return jn || (jn = 1, $e.isValid = function(g) {
    return !isNaN(g) && g >= 1 && g <= 40;
  }), $e;
}
var zA = {}, Wn;
function er() {
  if (Wn) return zA;
  Wn = 1;
  const A = "[0-9]+", g = "[A-Z $%*+\\-./:]+";
  let I = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  I = I.replace(/u/g, "\\u");
  const e = "(?:(?![A-Z0-9 $%*+\\-./:]|" + I + `)(?:.|[\r
]))+`;
  zA.KANJI = new RegExp(I, "g"), zA.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g"), zA.BYTE = new RegExp(e, "g"), zA.NUMERIC = new RegExp(A, "g"), zA.ALPHANUMERIC = new RegExp(g, "g");
  const t = new RegExp("^" + I + "$"), i = new RegExp("^" + A + "$"), n = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  return zA.testKanji = function(B) {
    return t.test(B);
  }, zA.testNumeric = function(B) {
    return i.test(B);
  }, zA.testAlphanumeric = function(B) {
    return n.test(B);
  }, zA;
}
var _n;
function wg() {
  return _n || (_n = 1, (function(A) {
    const g = Ir(), I = er();
    A.NUMERIC = {
      id: "Numeric",
      bit: 1,
      ccBits: [10, 12, 14]
    }, A.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 2,
      ccBits: [9, 11, 13]
    }, A.BYTE = {
      id: "Byte",
      bit: 4,
      ccBits: [8, 16, 16]
    }, A.KANJI = {
      id: "Kanji",
      bit: 8,
      ccBits: [8, 10, 12]
    }, A.MIXED = {
      bit: -1
    }, A.getCharCountIndicator = function(i, n) {
      if (!i.ccBits) throw new Error("Invalid mode: " + i);
      if (!g.isValid(n))
        throw new Error("Invalid version: " + n);
      return n >= 1 && n < 10 ? i.ccBits[0] : n < 27 ? i.ccBits[1] : i.ccBits[2];
    }, A.getBestModeForData = function(i) {
      return I.testNumeric(i) ? A.NUMERIC : I.testAlphanumeric(i) ? A.ALPHANUMERIC : I.testKanji(i) ? A.KANJI : A.BYTE;
    }, A.toString = function(i) {
      if (i && i.id) return i.id;
      throw new Error("Invalid mode");
    }, A.isValid = function(i) {
      return i && i.bit && i.ccBits;
    };
    function e(t) {
      if (typeof t != "string")
        throw new Error("Param is not a string");
      switch (t.toLowerCase()) {
        case "numeric":
          return A.NUMERIC;
        case "alphanumeric":
          return A.ALPHANUMERIC;
        case "kanji":
          return A.KANJI;
        case "byte":
          return A.BYTE;
        default:
          throw new Error("Unknown mode: " + t);
      }
    }
    A.from = function(i, n) {
      if (A.isValid(i))
        return i;
      try {
        return e(i);
      } catch {
        return n;
      }
    };
  })(_e)), _e;
}
var $n;
function cd() {
  return $n || ($n = 1, (function(A) {
    const g = pg(), I = gr(), e = Fi(), t = wg(), i = Ir(), n = 7973, o = g.getBCHDigit(n);
    function B(Q, a, s) {
      for (let d = 1; d <= 40; d++)
        if (a <= A.getCapacity(d, s, Q))
          return d;
    }
    function C(Q, a) {
      return t.getCharCountIndicator(Q, a) + 4;
    }
    function r(Q, a) {
      let s = 0;
      return Q.forEach(function(d) {
        const h = C(d.mode, a);
        s += h + d.getBitsLength();
      }), s;
    }
    function E(Q, a) {
      for (let s = 1; s <= 40; s++)
        if (r(Q, s) <= A.getCapacity(s, a, t.MIXED))
          return s;
    }
    A.from = function(a, s) {
      return i.isValid(a) ? parseInt(a, 10) : s;
    }, A.getCapacity = function(a, s, d) {
      if (!i.isValid(a))
        throw new Error("Invalid QR Code version");
      typeof d > "u" && (d = t.BYTE);
      const h = g.getSymbolTotalCodewords(a), u = I.getTotalCodewordsCount(a, s), y = (h - u) * 8;
      if (d === t.MIXED) return y;
      const l = y - C(d, a);
      switch (d) {
        case t.NUMERIC:
          return Math.floor(l / 10 * 3);
        case t.ALPHANUMERIC:
          return Math.floor(l / 11 * 2);
        case t.KANJI:
          return Math.floor(l / 13);
        case t.BYTE:
        default:
          return Math.floor(l / 8);
      }
    }, A.getBestVersionForData = function(a, s) {
      let d;
      const h = e.from(s, e.M);
      if (Array.isArray(a)) {
        if (a.length > 1)
          return E(a, h);
        if (a.length === 0)
          return 1;
        d = a[0];
      } else
        d = a;
      return B(d.mode, d.getLength(), h);
    }, A.getEncodedBits = function(a) {
      if (!i.isValid(a) || a < 7)
        throw new Error("Invalid QR Code version");
      let s = a << 12;
      for (; g.getBCHDigit(s) - o >= 0; )
        s ^= n << g.getBCHDigit(s) - o;
      return a << 12 | s;
    };
  })(We)), We;
}
var At = {}, Ao;
function ud() {
  if (Ao) return At;
  Ao = 1;
  const A = pg(), g = 1335, I = 21522, e = A.getBCHDigit(g);
  return At.getEncodedBits = function(i, n) {
    const o = i.bit << 3 | n;
    let B = o << 10;
    for (; A.getBCHDigit(B) - e >= 0; )
      B ^= g << A.getBCHDigit(B) - e;
    return (o << 10 | B) ^ I;
  }, At;
}
var gt = {}, It, go;
function hd() {
  if (go) return It;
  go = 1;
  const A = wg();
  function g(I) {
    this.mode = A.NUMERIC, this.data = I.toString();
  }
  return g.getBitsLength = function(e) {
    return 10 * Math.floor(e / 3) + (e % 3 ? e % 3 * 3 + 1 : 0);
  }, g.prototype.getLength = function() {
    return this.data.length;
  }, g.prototype.getBitsLength = function() {
    return g.getBitsLength(this.data.length);
  }, g.prototype.write = function(e) {
    let t, i, n;
    for (t = 0; t + 3 <= this.data.length; t += 3)
      i = this.data.substr(t, 3), n = parseInt(i, 10), e.put(n, 10);
    const o = this.data.length - t;
    o > 0 && (i = this.data.substr(t), n = parseInt(i, 10), e.put(n, o * 3 + 1));
  }, It = g, It;
}
var et, Io;
function dd() {
  if (Io) return et;
  Io = 1;
  const A = wg(), g = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    " ",
    "$",
    "%",
    "*",
    "+",
    "-",
    ".",
    "/",
    ":"
  ];
  function I(e) {
    this.mode = A.ALPHANUMERIC, this.data = e;
  }
  return I.getBitsLength = function(t) {
    return 11 * Math.floor(t / 2) + 6 * (t % 2);
  }, I.prototype.getLength = function() {
    return this.data.length;
  }, I.prototype.getBitsLength = function() {
    return I.getBitsLength(this.data.length);
  }, I.prototype.write = function(t) {
    let i;
    for (i = 0; i + 2 <= this.data.length; i += 2) {
      let n = g.indexOf(this.data[i]) * 45;
      n += g.indexOf(this.data[i + 1]), t.put(n, 11);
    }
    this.data.length % 2 && t.put(g.indexOf(this.data[i]), 6);
  }, et = I, et;
}
var tt, eo;
function ld() {
  if (eo) return tt;
  eo = 1;
  const A = wg();
  function g(I) {
    this.mode = A.BYTE, typeof I == "string" ? this.data = new TextEncoder().encode(I) : this.data = new Uint8Array(I);
  }
  return g.getBitsLength = function(e) {
    return e * 8;
  }, g.prototype.getLength = function() {
    return this.data.length;
  }, g.prototype.getBitsLength = function() {
    return g.getBitsLength(this.data.length);
  }, g.prototype.write = function(I) {
    for (let e = 0, t = this.data.length; e < t; e++)
      I.put(this.data[e], 8);
  }, tt = g, tt;
}
var it, to;
function yd() {
  if (to) return it;
  to = 1;
  const A = wg(), g = pg();
  function I(e) {
    this.mode = A.KANJI, this.data = e;
  }
  return I.getBitsLength = function(t) {
    return t * 13;
  }, I.prototype.getLength = function() {
    return this.data.length;
  }, I.prototype.getBitsLength = function() {
    return I.getBitsLength(this.data.length);
  }, I.prototype.write = function(e) {
    let t;
    for (t = 0; t < this.data.length; t++) {
      let i = g.toSJIS(this.data[t]);
      if (i >= 33088 && i <= 40956)
        i -= 33088;
      else if (i >= 57408 && i <= 60351)
        i -= 49472;
      else
        throw new Error(
          "Invalid SJIS character: " + this.data[t] + `
Make sure your charset is UTF-8`
        );
      i = (i >>> 8 & 255) * 192 + (i & 255), e.put(i, 13);
    }
  }, it = I, it;
}
var nt = { exports: {} }, io;
function fd() {
  return io || (io = 1, (function(A) {
    var g = {
      single_source_shortest_paths: function(I, e, t) {
        var i = {}, n = {};
        n[e] = 0;
        var o = g.PriorityQueue.make();
        o.push(e, 0);
        for (var B, C, r, E, Q, a, s, d, h; !o.empty(); ) {
          B = o.pop(), C = B.value, E = B.cost, Q = I[C] || {};
          for (r in Q)
            Q.hasOwnProperty(r) && (a = Q[r], s = E + a, d = n[r], h = typeof n[r] > "u", (h || d > s) && (n[r] = s, o.push(r, s), i[r] = C));
        }
        if (typeof t < "u" && typeof n[t] > "u") {
          var u = ["Could not find a path from ", e, " to ", t, "."].join("");
          throw new Error(u);
        }
        return i;
      },
      extract_shortest_path_from_predecessor_list: function(I, e) {
        for (var t = [], i = e; i; )
          t.push(i), I[i], i = I[i];
        return t.reverse(), t;
      },
      find_path: function(I, e, t) {
        var i = g.single_source_shortest_paths(I, e, t);
        return g.extract_shortest_path_from_predecessor_list(
          i,
          t
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(I) {
          var e = g.PriorityQueue, t = {}, i;
          I = I || {};
          for (i in e)
            e.hasOwnProperty(i) && (t[i] = e[i]);
          return t.queue = [], t.sorter = I.sorter || e.default_sorter, t;
        },
        default_sorter: function(I, e) {
          return I.cost - e.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(I, e) {
          var t = { value: I, cost: e };
          this.queue.push(t), this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    A.exports = g;
  })(nt)), nt.exports;
}
var no;
function Dd() {
  return no || (no = 1, (function(A) {
    const g = wg(), I = hd(), e = dd(), t = ld(), i = yd(), n = er(), o = pg(), B = fd();
    function C(u) {
      return unescape(encodeURIComponent(u)).length;
    }
    function r(u, y, l) {
      const D = [];
      let G;
      for (; (G = u.exec(l)) !== null; )
        D.push({
          data: G[0],
          index: G.index,
          mode: y,
          length: G[0].length
        });
      return D;
    }
    function E(u) {
      const y = r(n.NUMERIC, g.NUMERIC, u), l = r(n.ALPHANUMERIC, g.ALPHANUMERIC, u);
      let D, G;
      return o.isKanjiModeEnabled() ? (D = r(n.BYTE, g.BYTE, u), G = r(n.KANJI, g.KANJI, u)) : (D = r(n.BYTE_KANJI, g.BYTE, u), G = []), y.concat(l, D, G).sort(function(R, H) {
        return R.index - H.index;
      }).map(function(R) {
        return {
          data: R.data,
          mode: R.mode,
          length: R.length
        };
      });
    }
    function Q(u, y) {
      switch (y) {
        case g.NUMERIC:
          return I.getBitsLength(u);
        case g.ALPHANUMERIC:
          return e.getBitsLength(u);
        case g.KANJI:
          return i.getBitsLength(u);
        case g.BYTE:
          return t.getBitsLength(u);
      }
    }
    function a(u) {
      return u.reduce(function(y, l) {
        const D = y.length - 1 >= 0 ? y[y.length - 1] : null;
        return D && D.mode === l.mode ? (y[y.length - 1].data += l.data, y) : (y.push(l), y);
      }, []);
    }
    function s(u) {
      const y = [];
      for (let l = 0; l < u.length; l++) {
        const D = u[l];
        switch (D.mode) {
          case g.NUMERIC:
            y.push([
              D,
              { data: D.data, mode: g.ALPHANUMERIC, length: D.length },
              { data: D.data, mode: g.BYTE, length: D.length }
            ]);
            break;
          case g.ALPHANUMERIC:
            y.push([
              D,
              { data: D.data, mode: g.BYTE, length: D.length }
            ]);
            break;
          case g.KANJI:
            y.push([
              D,
              { data: D.data, mode: g.BYTE, length: C(D.data) }
            ]);
            break;
          case g.BYTE:
            y.push([
              { data: D.data, mode: g.BYTE, length: C(D.data) }
            ]);
        }
      }
      return y;
    }
    function d(u, y) {
      const l = {}, D = { start: {} };
      let G = ["start"];
      for (let f = 0; f < u.length; f++) {
        const R = u[f], H = [];
        for (let w = 0; w < R.length; w++) {
          const K = R[w], M = "" + f + w;
          H.push(M), l[M] = { node: K, lastCount: 0 }, D[M] = {};
          for (let U = 0; U < G.length; U++) {
            const N = G[U];
            l[N] && l[N].node.mode === K.mode ? (D[N][M] = Q(l[N].lastCount + K.length, K.mode) - Q(l[N].lastCount, K.mode), l[N].lastCount += K.length) : (l[N] && (l[N].lastCount = K.length), D[N][M] = Q(K.length, K.mode) + 4 + g.getCharCountIndicator(K.mode, y));
          }
        }
        G = H;
      }
      for (let f = 0; f < G.length; f++)
        D[G[f]].end = 0;
      return { map: D, table: l };
    }
    function h(u, y) {
      let l;
      const D = g.getBestModeForData(u);
      if (l = g.from(y, D), l !== g.BYTE && l.bit < D.bit)
        throw new Error('"' + u + '" cannot be encoded with mode ' + g.toString(l) + `.
 Suggested mode is: ` + g.toString(D));
      switch (l === g.KANJI && !o.isKanjiModeEnabled() && (l = g.BYTE), l) {
        case g.NUMERIC:
          return new I(u);
        case g.ALPHANUMERIC:
          return new e(u);
        case g.KANJI:
          return new i(u);
        case g.BYTE:
          return new t(u);
      }
    }
    A.fromArray = function(y) {
      return y.reduce(function(l, D) {
        return typeof D == "string" ? l.push(h(D, null)) : D.data && l.push(h(D.data, D.mode)), l;
      }, []);
    }, A.fromString = function(y, l) {
      const D = E(y, o.isKanjiModeEnabled()), G = s(D), f = d(G, l), R = B.find_path(f.map, "start", "end"), H = [];
      for (let w = 1; w < R.length - 1; w++)
        H.push(f.table[R[w]].node);
      return A.fromArray(a(H));
    }, A.rawSplit = function(y) {
      return A.fromArray(
        E(y, o.isKanjiModeEnabled())
      );
    };
  })(gt)), gt;
}
var oo;
function Nd() {
  if (oo) return Te;
  oo = 1;
  const A = pg(), g = Fi(), I = od(), e = Bd(), t = Cd(), i = rd(), n = Ed(), o = gr(), B = Qd(), C = cd(), r = ud(), E = wg(), Q = Dd();
  function a(f, R) {
    const H = f.size, w = i.getPositions(R);
    for (let K = 0; K < w.length; K++) {
      const M = w[K][0], U = w[K][1];
      for (let N = -1; N <= 7; N++)
        if (!(M + N <= -1 || H <= M + N))
          for (let S = -1; S <= 7; S++)
            U + S <= -1 || H <= U + S || (N >= 0 && N <= 6 && (S === 0 || S === 6) || S >= 0 && S <= 6 && (N === 0 || N === 6) || N >= 2 && N <= 4 && S >= 2 && S <= 4 ? f.set(M + N, U + S, !0, !0) : f.set(M + N, U + S, !1, !0));
    }
  }
  function s(f) {
    const R = f.size;
    for (let H = 8; H < R - 8; H++) {
      const w = H % 2 === 0;
      f.set(H, 6, w, !0), f.set(6, H, w, !0);
    }
  }
  function d(f, R) {
    const H = t.getPositions(R);
    for (let w = 0; w < H.length; w++) {
      const K = H[w][0], M = H[w][1];
      for (let U = -2; U <= 2; U++)
        for (let N = -2; N <= 2; N++)
          U === -2 || U === 2 || N === -2 || N === 2 || U === 0 && N === 0 ? f.set(K + U, M + N, !0, !0) : f.set(K + U, M + N, !1, !0);
    }
  }
  function h(f, R) {
    const H = f.size, w = C.getEncodedBits(R);
    let K, M, U;
    for (let N = 0; N < 18; N++)
      K = Math.floor(N / 3), M = N % 3 + H - 8 - 3, U = (w >> N & 1) === 1, f.set(K, M, U, !0), f.set(M, K, U, !0);
  }
  function u(f, R, H) {
    const w = f.size, K = r.getEncodedBits(R, H);
    let M, U;
    for (M = 0; M < 15; M++)
      U = (K >> M & 1) === 1, M < 6 ? f.set(M, 8, U, !0) : M < 8 ? f.set(M + 1, 8, U, !0) : f.set(w - 15 + M, 8, U, !0), M < 8 ? f.set(8, w - M - 1, U, !0) : M < 9 ? f.set(8, 15 - M - 1 + 1, U, !0) : f.set(8, 15 - M - 1, U, !0);
    f.set(w - 8, 8, 1, !0);
  }
  function y(f, R) {
    const H = f.size;
    let w = -1, K = H - 1, M = 7, U = 0;
    for (let N = H - 1; N > 0; N -= 2)
      for (N === 6 && N--; ; ) {
        for (let S = 0; S < 2; S++)
          if (!f.isReserved(K, N - S)) {
            let m = !1;
            U < R.length && (m = (R[U] >>> M & 1) === 1), f.set(K, N - S, m), M--, M === -1 && (U++, M = 7);
          }
        if (K += w, K < 0 || H <= K) {
          K -= w, w = -w;
          break;
        }
      }
  }
  function l(f, R, H) {
    const w = new I();
    H.forEach(function(S) {
      w.put(S.mode.bit, 4), w.put(S.getLength(), E.getCharCountIndicator(S.mode, f)), S.write(w);
    });
    const K = A.getSymbolTotalCodewords(f), M = o.getTotalCodewordsCount(f, R), U = (K - M) * 8;
    for (w.getLengthInBits() + 4 <= U && w.put(0, 4); w.getLengthInBits() % 8 !== 0; )
      w.putBit(0);
    const N = (U - w.getLengthInBits()) / 8;
    for (let S = 0; S < N; S++)
      w.put(S % 2 ? 17 : 236, 8);
    return D(w, f, R);
  }
  function D(f, R, H) {
    const w = A.getSymbolTotalCodewords(R), K = o.getTotalCodewordsCount(R, H), M = w - K, U = o.getBlocksCount(R, H), N = w % U, S = U - N, m = Math.floor(w / U), p = Math.floor(M / U), Y = p + 1, b = m - p, x = new B(b);
    let J = 0;
    const T = new Array(U), O = new Array(U);
    let $ = 0;
    const tA = new Uint8Array(f.buffer);
    for (let AA = 0; AA < U; AA++) {
      const CA = AA < S ? p : Y;
      T[AA] = tA.slice(J, J + CA), O[AA] = x.encode(T[AA]), J += CA, $ = Math.max($, CA);
    }
    const j = new Uint8Array(w);
    let nA = 0, IA, rA;
    for (IA = 0; IA < $; IA++)
      for (rA = 0; rA < U; rA++)
        IA < T[rA].length && (j[nA++] = T[rA][IA]);
    for (IA = 0; IA < b; IA++)
      for (rA = 0; rA < U; rA++)
        j[nA++] = O[rA][IA];
    return j;
  }
  function G(f, R, H, w) {
    let K;
    if (Array.isArray(f))
      K = Q.fromArray(f);
    else if (typeof f == "string") {
      let m = R;
      if (!m) {
        const p = Q.rawSplit(f);
        m = C.getBestVersionForData(p, H);
      }
      K = Q.fromString(f, m || 40);
    } else
      throw new Error("Invalid data");
    const M = C.getBestVersionForData(K, H);
    if (!M)
      throw new Error("The amount of data is too big to be stored in a QR Code");
    if (!R)
      R = M;
    else if (R < M)
      throw new Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` + M + `.
`
      );
    const U = l(R, H, K), N = A.getSymbolSize(R), S = new e(N);
    return a(S, R), s(S), d(S, R), u(S, H, 0), R >= 7 && h(S, R), y(S, U), isNaN(w) && (w = n.getBestMask(
      S,
      u.bind(null, S, H)
    )), n.applyMask(w, S), u(S, H, w), {
      modules: S,
      version: R,
      errorCorrectionLevel: H,
      maskPattern: w,
      segments: K
    };
  }
  return Te.create = function(R, H) {
    if (typeof R > "u" || R === "")
      throw new Error("No input text");
    let w = g.M, K, M;
    return typeof H < "u" && (w = g.from(H.errorCorrectionLevel, g.M), K = C.from(H.version), M = n.from(H.maskPattern), H.toSJISFunc && A.setToSJISFunction(H.toSJISFunc)), G(R, K, w, M);
  }, Te;
}
var ot = {}, Bt = {}, Bo;
function tr() {
  return Bo || (Bo = 1, (function(A) {
    function g(I) {
      if (typeof I == "number" && (I = I.toString()), typeof I != "string")
        throw new Error("Color should be defined as hex string");
      let e = I.slice().replace("#", "").split("");
      if (e.length < 3 || e.length === 5 || e.length > 8)
        throw new Error("Invalid hex color: " + I);
      (e.length === 3 || e.length === 4) && (e = Array.prototype.concat.apply([], e.map(function(i) {
        return [i, i];
      }))), e.length === 6 && e.push("F", "F");
      const t = parseInt(e.join(""), 16);
      return {
        r: t >> 24 & 255,
        g: t >> 16 & 255,
        b: t >> 8 & 255,
        a: t & 255,
        hex: "#" + e.slice(0, 6).join("")
      };
    }
    A.getOptions = function(e) {
      e || (e = {}), e.color || (e.color = {});
      const t = typeof e.margin > "u" || e.margin === null || e.margin < 0 ? 4 : e.margin, i = e.width && e.width >= 21 ? e.width : void 0, n = e.scale || 4;
      return {
        width: i,
        scale: i ? 4 : n,
        margin: t,
        color: {
          dark: g(e.color.dark || "#000000ff"),
          light: g(e.color.light || "#ffffffff")
        },
        type: e.type,
        rendererOpts: e.rendererOpts || {}
      };
    }, A.getScale = function(e, t) {
      return t.width && t.width >= e + t.margin * 2 ? t.width / (e + t.margin * 2) : t.scale;
    }, A.getImageWidth = function(e, t) {
      const i = A.getScale(e, t);
      return Math.floor((e + t.margin * 2) * i);
    }, A.qrToImageData = function(e, t, i) {
      const n = t.modules.size, o = t.modules.data, B = A.getScale(n, i), C = Math.floor((n + i.margin * 2) * B), r = i.margin * B, E = [i.color.light, i.color.dark];
      for (let Q = 0; Q < C; Q++)
        for (let a = 0; a < C; a++) {
          let s = (Q * C + a) * 4, d = i.color.light;
          if (Q >= r && a >= r && Q < C - r && a < C - r) {
            const h = Math.floor((Q - r) / B), u = Math.floor((a - r) / B);
            d = E[o[h * n + u] ? 1 : 0];
          }
          e[s++] = d.r, e[s++] = d.g, e[s++] = d.b, e[s] = d.a;
        }
    };
  })(Bt)), Bt;
}
var Co;
function Sd() {
  return Co || (Co = 1, (function(A) {
    const g = tr();
    function I(t, i, n) {
      t.clearRect(0, 0, i.width, i.height), i.style || (i.style = {}), i.height = n, i.width = n, i.style.height = n + "px", i.style.width = n + "px";
    }
    function e() {
      try {
        return document.createElement("canvas");
      } catch {
        throw new Error("You need to specify a canvas element");
      }
    }
    A.render = function(i, n, o) {
      let B = o, C = n;
      typeof B > "u" && (!n || !n.getContext) && (B = n, n = void 0), n || (C = e()), B = g.getOptions(B);
      const r = g.getImageWidth(i.modules.size, B), E = C.getContext("2d"), Q = E.createImageData(r, r);
      return g.qrToImageData(Q.data, i, B), I(E, C, r), E.putImageData(Q, 0, 0), C;
    }, A.renderToDataURL = function(i, n, o) {
      let B = o;
      typeof B > "u" && (!n || !n.getContext) && (B = n, n = void 0), B || (B = {});
      const C = A.render(i, n, B), r = B.type || "image/png", E = B.rendererOpts || {};
      return C.toDataURL(r, E.quality);
    };
  })(ot)), ot;
}
var Ct = {}, ro;
function pd() {
  if (ro) return Ct;
  ro = 1;
  const A = tr();
  function g(t, i) {
    const n = t.a / 255, o = i + '="' + t.hex + '"';
    return n < 1 ? o + " " + i + '-opacity="' + n.toFixed(2).slice(1) + '"' : o;
  }
  function I(t, i, n) {
    let o = t + i;
    return typeof n < "u" && (o += " " + n), o;
  }
  function e(t, i, n) {
    let o = "", B = 0, C = !1, r = 0;
    for (let E = 0; E < t.length; E++) {
      const Q = Math.floor(E % i), a = Math.floor(E / i);
      !Q && !C && (C = !0), t[E] ? (r++, E > 0 && Q > 0 && t[E - 1] || (o += C ? I("M", Q + n, 0.5 + a + n) : I("m", B, 0), B = 0, C = !1), Q + 1 < i && t[E + 1] || (o += I("h", r), r = 0)) : B++;
    }
    return o;
  }
  return Ct.render = function(i, n, o) {
    const B = A.getOptions(n), C = i.modules.size, r = i.modules.data, E = C + B.margin * 2, Q = B.color.light.a ? "<path " + g(B.color.light, "fill") + ' d="M0 0h' + E + "v" + E + 'H0z"/>' : "", a = "<path " + g(B.color.dark, "stroke") + ' d="' + e(r, C, B.margin) + '"/>', s = 'viewBox="0 0 ' + E + " " + E + '"', h = '<svg xmlns="http://www.w3.org/2000/svg" ' + (B.width ? 'width="' + B.width + '" height="' + B.width + '" ' : "") + s + ' shape-rendering="crispEdges">' + Q + a + `</svg>
`;
    return typeof o == "function" && o(null, h), h;
  }, Ct;
}
var Eo;
function wd() {
  if (Eo) return Fg;
  Eo = 1;
  const A = nd(), g = Nd(), I = Sd(), e = pd();
  function t(i, n, o, B, C) {
    const r = [].slice.call(arguments, 1), E = r.length, Q = typeof r[E - 1] == "function";
    if (!Q && !A())
      throw new Error("Callback required as last argument");
    if (Q) {
      if (E < 2)
        throw new Error("Too few arguments provided");
      E === 2 ? (C = o, o = n, n = B = void 0) : E === 3 && (n.getContext && typeof C > "u" ? (C = B, B = void 0) : (C = B, B = o, o = n, n = void 0));
    } else {
      if (E < 1)
        throw new Error("Too few arguments provided");
      return E === 1 ? (o = n, n = B = void 0) : E === 2 && !n.getContext && (B = o, o = n, n = void 0), new Promise(function(a, s) {
        try {
          const d = g.create(o, B);
          a(i(d, n, B));
        } catch (d) {
          s(d);
        }
      });
    }
    try {
      const a = g.create(o, B);
      C(null, i(a, n, B));
    } catch (a) {
      C(a);
    }
  }
  return Fg.create = g.create, Fg.toCanvas = t.bind(null, I.render), Fg.toDataURL = t.bind(null, I.renderToDataURL), Fg.toString = t.bind(null, function(i, n, o) {
    return e.render(i, o);
  }), Fg;
}
var kd = wd();
const md = /* @__PURE__ */ $C(kd);
function Hd(A) {
  const g = {
    outpointTransactionHash: Z(A.outpointTransactionHash),
    outpointIndex: A.outpointIndex,
    unlockingBytecode: Z(A.unlockingBytecode),
    sequenceNumber: A.sequenceNumber,
    valueSatoshis: `<bigint: ${A.valueSatoshis}n>`,
    lockingBytecode: Z(A.lockingBytecode)
  };
  return A.token && (g.token = {
    category: Z(A.token.category),
    amount: `<bigint: ${A.token.amount}n>`,
    ...A.token.nft && {
      nft: {
        ...A.token.nft.capability !== void 0 && {
          capability: A.token.nft.capability
        },
        ...A.token.nft.commitment !== void 0 && {
          commitment: Z(A.token.nft.commitment)
        }
      }
    }
  }), g;
}
function Rd(A, g) {
  if (A.broadcast !== !1 || !Array.isArray(A.inputPaths) || !A.inputPaths.length || A.inputPaths.length > 100 || A.publicKeys?.length !== A.inputPaths.length || A.sourceOutputs?.length !== A.inputPaths.length) throw new Error("invalid_plan");
  const I = Nt(lA(A.transaction));
  if (typeof I == "string" || I.inputs.length !== A.inputPaths.length) throw new Error("invalid_plan");
  const e = A.sourceOutputs.map((t, i) => {
    const [n, o, B] = A.inputPaths[i];
    if (n !== i || !["receive", "change"].includes(o) || !Number.isSafeInteger(B) || B < 0 || B >= 2 ** 31) throw new Error("invalid_path");
    const C = I.inputs[i];
    if (Z(C.outpointTransactionHash) !== t.txid || C.outpointIndex !== t.vout || C.sequenceNumber !== t.sequenceNumber) throw new Error("invalid_source");
    const r = g.getPubkey(o === "receive" ? 0 : 1, BigInt(B));
    if (!r || Z(r) !== A.publicKeys[i]) throw new Error("wrong_wallet");
    const E = _C({ publicKey: r });
    if (Z(E) !== t.lockingBytecode || !/^[0-9a-f]{64}$/.test(t.txid) || !Number.isInteger(t.vout) || t.vout < 0 || !/^[0-9]{1,16}$/.test(t.valueSatoshis) || BigInt(t.valueSatoshis) <= 0n) throw new Error("invalid_source");
    return Hd({ outpointTransactionHash: lA(t.txid), outpointIndex: t.vout, sequenceNumber: t.sequenceNumber, unlockingBytecode: new Uint8Array(), lockingBytecode: E, valueSatoshis: BigInt(t.valueSatoshis) });
  });
  return { transaction: { transaction: A.transaction, sourceOutputs: e, broadcast: !1, userPrompt: "BCH Flow · review destination, change and fee" }, inputPaths: A.inputPaths };
}
function Ud(A, g) {
  if (typeof g != "string" || !/^(?:[0-9a-fA-F]{2}){1,100000}$/.test(g)) throw new Error("invalid_signed_transaction");
  const I = Nt(lA(A)), e = Nt(lA(g));
  if (typeof I == "string" || typeof e == "string" || I.inputs.length !== e.inputs.length) throw new Error("invalid_signed_transaction");
  const t = { ...e, inputs: e.inputs.map((i, n) => ({ ...i, unlockingBytecode: I.inputs[n].unlockingBytecode })) };
  if (Z(Vs(t)) !== A.toLowerCase()) throw new Error("changed_transaction");
  return g;
}
const SA = document.querySelector("[data-wizardconnect]");
if (SA) {
  let d = function() {
    I.open && I.close(), clearTimeout(Q), a?.abort(), E?.cleanup(), r?.clearStoredSession(), r?.destroy(), r?.removeAllListeners(), r = null, E = null, g.removeItem(A), n.disabled = !1, o.hidden = !0, t.textContent = "", i.value = "", SA.querySelector("[data-wizard-qr]").getContext("2d").clearRect(0, 0, 256, 256);
  }, h = function() {
    I.close();
  }, u = function(y = !1) {
    if (clearTimeout(Q), !isSecureContext) {
      s("secure");
      return;
    }
    if (E) {
      I.showModal();
      return;
    }
    const l = y ? uI(A, g) : null;
    y || g.removeItem(A), r = new id("BCH Flow", void 0, { session: { key: A, storage: g } }), r.on("walletready", () => {
      if (!r.hasPath(0) || !r.hasPath(1)) {
        d(), s("unsupported");
        return;
      }
      clearTimeout(Q);
      const D = Sh({ publicKey: r.getPubkey(0, 0n), prefix: "bitcoincash" });
      t.textContent = typeof D == "string" ? D : D.address, s("connected"), o.hidden = !1, n.disabled = !1, h();
    }), r.on("disconnect", () => {
      d(), s("disconnected");
    }), r.on("reconnecting", () => s("reconnecting")), s("waiting"), n.disabled = !0;
    try {
      E = gd((D) => {
        r?.updateConnection(D.client, D.status), D.status.status === "disconnected" && s("relayError");
      }, { explicitRelayUrls: C, ...l?.walletPublicKey ? { existingCredentials: l } : {} }), r.attachRelay(E), i.value = E.uri, md.toCanvas(SA.querySelector("[data-wizard-qr]"), E.qrUri, { width: 256, margin: 2, errorCorrectionLevel: "M" }).catch(() => s("failed")), Q = setTimeout(() => {
        d(), s("timedOut");
      }, 9e4), y || I.showModal();
    } catch {
      d(), s("failed");
    }
  };
  const A = "bchflow.wizard." + SA.dataset.scope;
  let g;
  try {
    g = sessionStorage, g.setItem(A + ".probe", "1"), g.removeItem(A + ".probe");
  } catch {
    const y = /* @__PURE__ */ new Map();
    g = { getItem: (l) => y.get(l) || null, setItem: (l, D) => y.set(l, D), removeItem: (l) => y.delete(l) };
  }
  const I = SA.querySelector("dialog"), e = SA.querySelector("[data-wizard-status]"), t = SA.querySelector("[data-wizard-address]"), i = SA.querySelector("[data-wizard-uri]"), n = SA.querySelector("[data-wizard-connect]"), o = SA.querySelector("[data-wizard-disconnect]"), B = JSON.parse(SA.querySelector("#wizard-relays").textContent), C = Array.isArray(B) && B.length ? B : ["wss://relay.riften.net:443", "wss://relay.cauldron.quest:443"];
  let r = null, E = null, Q = null, a = null;
  const s = (y) => {
    e.textContent = SA.dataset[y] || SA.dataset.failed;
  };
  n.addEventListener("click", () => {
    if (r?.isWalletDiscovered()) {
      s("connected");
      return;
    }
    u();
  }), SA.querySelector("[data-wizard-close]").addEventListener("click", () => {
    h(), r?.isWalletDiscovered() || (d(), s("disconnected"));
  }), I.addEventListener("cancel", () => {
    r?.isWalletDiscovered() || (d(), s("disconnected"));
  }), o.addEventListener("click", async () => {
    try {
      await r?.sendDisconnect("Disconnected from BCH Flow");
    } catch {
    }
    d(), s("disconnected");
  }), SA.querySelector("[data-wizard-copy]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(i.value);
    } catch {
      i.focus(), i.select();
    }
  }), document.querySelectorAll("[data-wizard-sign]").forEach((y) => y.addEventListener("click", async () => {
    if (!r?.isWalletDiscovered()) {
      u();
      return;
    }
    if (a) return;
    a = new AbortController(), y.disabled = !0, s("signing");
    const l = setTimeout(() => a?.abort(), 12e4);
    try {
      const D = await fetch(y.dataset.wizardSign, { method: "POST", credentials: "same-origin", headers: { "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value, Accept: "application/json" }, signal: a.signal });
      if (!D.ok) throw new Error("server_rejected");
      const G = await D.json(), f = await r.signTransaction(Rd(G, r), { signal: a.signal });
      if (f.error) throw new Error("wallet_rejected");
      const R = Ud(G.transaction, f.signedTransaction), H = y.closest(".premium-withdrawal").querySelector("form:has([name=action][value=submit])");
      if (!H) throw new Error("authorization_expired");
      H.querySelector("[name=raw_transaction]").value = R, H.querySelector("[name=raw_transaction]").dispatchEvent(new Event("input", { bubbles: !0 })), H.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "center" }), s("signed");
    } catch (D) {
      s(D.message === "wrong_wallet" ? "wrongWallet" : D.name === "AbortError" ? "cancelled" : "failed");
    } finally {
      clearTimeout(l), a = null, y.disabled = !1;
    }
  })), document.querySelectorAll('form[action$="/logout/"]').forEach((y) => y.addEventListener("submit", () => {
    d();
  })), addEventListener("pagehide", () => {
    clearTimeout(Q), a?.abort(), r?.destroy(), E?.cleanup();
  }), uI(A, g)?.walletPublicKey && u(!0);
}
