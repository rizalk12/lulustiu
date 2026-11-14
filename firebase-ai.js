// LulusTIU — lapisan AI hybrid (Firebase AI Logic)
// Pola resmi (dokumentasi Firebase AI Logic, dicek 8 Nov 2026):
//   import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai"
//   const ai = getAI(app, { backend: new GoogleAIBackend() });
//   const model = getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: {...}, onDeviceParams: {...} });
// On-device di web = Gemini Nano lewat Chrome Prompt API — hanya Chrome DESKTOP v139+.
// Di HP / browser lain, SDK otomatis jatuh ke model cloud. Itulah desain hybrid-nya.
//
// File ini TIDAK gagal walau Firebase belum dikonfigurasi: window.LulusAI.ready tetap false
// dan app.js memakai bank soal + hint/pembahasan bawaan (mode offline penuh).

(function () {
  // Samakan versi dengan cuplikan SDK di Firebase Console proyekmu bila berbeda.
  const SDK_VER = "11.10.0";
  const CDN = "https://www.gstatic.com/firebasejs/" + SDK_VER + "/";
  // Model cloud untuk pembahasan & generator soal. Verifikasi nama model terbaru
  // di dokumentasi + aturan resmi hackathon (rilis 9 Nov 2026), lalu ubah di sini bila perlu.
  const CLOUD_MODEL = "gemini-3.8-flash";

  const LulusAI = {
    ready: false,
    mode: "offline", // "offline" | "ondevice" | "cloud" | "hybrid"
    _ai: null,
    _hintModel: null,
    _cloudModel: null,

    async init() {
      const cfg = window.FIREBASE_CONFIG;
      if (!cfg || !cfg.apiKey || String(cfg.apiKey).indexOf("ISI_") === 0) {
        return false; // belum dikonfigurasi → mode offline
      }
      try {
        const appMod = await import(CDN + "firebase-app.js");
        const aiMod = await import(CDN + "firebase-ai.js");
        const app = appMod.initializeApp(cfg);
        const ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
        this._ai = ai;
        this._aiMod = aiMod;

        // Model HINT: utamakan on-device (instan, offline, privat).
        this._hintModel = aiMod.getGenerativeModel(ai, {
          mode: aiMod.InferenceMode.PREFER_ON_DEVICE,
          inCloudParams: { model: CLOUD_MODEL },
          onDeviceParams: { promptOptions: {} },
        });
        // Model PEMBAHASAN + GENERATOR: utamakan cloud (penalaran lebih dalam).
        this._cloudModel = aiMod.getGenerativeModel(ai, {
          mode: aiMod.InferenceMode.PREFER_IN_CLOUD,
          inCloudParams: { model: CLOUD_MODEL },
          onDeviceParams: { promptOptions: {} },
        });
        // Inisialisasi model on-device perlu interaksi pengguna (syarat Chrome Prompt API).
        if (typeof aiMod.initializeDeviceModel === "function") {
          try { await aiMod.initializeDeviceModel(); } catch (e) { /* abaikan: fallback cloud tetap jalan */ }
        }
        this.ready = true;
        this.mode = "hybrid";
        return true;
      } catch (e) {
        console.warn("LulusAI: Firebase AI gagal init, lanjut mode offline.", e);
        this.ready = false;
        this.mode = "offline";
        return false;
      }
    },

    async _gen(model, prompt) {
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    },

    // Hint: langkah pertama SAJA, dilarang membocorkan jawaban akhir.
    async getHint(q) {
      if (!this.ready) return null;
      try {
        const prompt =
          "Kamu tutor TIU CPNS. Beri PETUNJUK langkah pertama saja (maksimal 2 kalimat, Bahasa Indonesia) " +
          "untuk soal berikut. JANGAN menyebut jawaban akhir atau hasil hitungan final.\n\nSoal: " + q.q +
          "\nPilihan: " + q.options.join(" | ");
        return await this._gen(this._hintModel, prompt);
      } catch (e) { return null; }
    },

    // Pembahasan lengkap langkah demi langkah (cloud).
    async getSolution(q) {
      if (!this.ready) return null;
      try {
        const prompt =
          "Kamu tutor TIU CPNS. Jelaskan pembahasan soal berikut langkah demi langkah (Bahasa Indonesia, ringkas, " +
          "akhiri dengan jawaban benar). Soal: " + q.q + "\nPilihan: " + q.options.join(" | ") +
          "\nJawaban benar: " + "ABCDE"[q.answer] + ". " + q.options[q.answer];
        return await this._gen(this._cloudModel, prompt);
      } catch (e) { return null; }
    },

    // Generator soal baru per subtipe (cloud, output JSON terstruktur sederhana).
    async generateQuestions(subtype, n) {
      if (!this.ready) return null;
      try {
        const prompt =
          "Buat " + n + " soal latihan TIU numerik subtipe '" + subtype + "' setara SKD CPNS, Bahasa Indonesia, " +
          "masing-masing 5 pilihan (A-E) dengan tepat satu jawaban benar. Balas HANYA JSON array tanpa teks lain, format: " +
          '[{"q":"...","options":["...","...","...","...","..."],"answer":0,"hint":"langkah pertama saja","solution":"pembahasan singkat"}] ' +
          "answer adalah indeks 0-4. Pastikan hitungannya benar.";
        const txt = await this._gen(this._cloudModel, prompt);
        const start = txt.indexOf("["), end = txt.lastIndexOf("]");
        if (start < 0 || end < 0) return null;
        const arr = JSON.parse(txt.slice(start, end + 1));
        if (!Array.isArray(arr)) return null;
        return arr.filter(x => x && x.q && Array.isArray(x.options) && x.options.length === 5 &&
          Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 5)
          .map((x, i) => ({ id: "AI-" + subtype + "-" + Date.now() + "-" + i, subtype, q: x.q,
            options: x.options, answer: x.answer, hint: x.hint || "", solution: x.solution || "" }));
      } catch (e) { return null; }
    },
  };

  window.LulusAI = LulusAI;
})();
