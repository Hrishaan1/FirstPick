const SESSION_LOCAL_KEY = "ftc-session-code";

const fbSync = {
  sessionCode: null,
  unsub: null,
  onRemoteChange: null,

  async tryReconnect() {
    const code = localStorage.getItem(SESSION_LOCAL_KEY);
    if (!code) return null;
    try {
      const doc = await FIRESTORE.collection("sessions").doc(code).get();
      if (!doc.exists) {
        localStorage.removeItem(SESSION_LOCAL_KEY);
        return null;
      }
      this.sessionCode = code;
      this._listen();
      return this._clean(doc.data());
    } catch {
      return null;
    }
  },

  async create(initialData) {
    const code = await this._generateUniqueCode();
    this.sessionCode = code;
    await FIRESTORE.collection("sessions").doc(code).set({
      ...initialData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    localStorage.setItem(SESSION_LOCAL_KEY, code);
    this._listen();
    return code;
  },

  async join(code) {
    const doc = await FIRESTORE.collection("sessions").doc(code).get();
    if (!doc.exists) return null;
    this.sessionCode = code;
    localStorage.setItem(SESSION_LOCAL_KEY, code);
    this._listen();
    return this._clean(doc.data());
  },

  async save(data) {
    if (!this.sessionCode) return;
    await FIRESTORE.collection("sessions").doc(this.sessionCode).set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  disconnect() {
    if (this.unsub) this.unsub();
    this.unsub = null;
    this.sessionCode = null;
    localStorage.removeItem(SESSION_LOCAL_KEY);
  },

  getCode() {
    return this.sessionCode;
  },

  isConnected() {
    return !!this.sessionCode;
  },

  _listen() {
    if (this.unsub) this.unsub();
    if (!this.sessionCode) return;
    this.unsub = FIRESTORE.collection("sessions").doc(this.sessionCode)
      .onSnapshot((snap) => {
        if (snap.exists && this.onRemoteChange) {
          this.onRemoteChange(this._clean(snap.data()));
        }
      });
  },

  async _generateUniqueCode() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = this._generateCode();
      const doc = await FIRESTORE.collection("sessions").doc(code).get();
      if (!doc.exists) return code;
    }
    return this._generateCode();
  },

  _generateCode() {
    const nums = Math.floor(10000 + Math.random() * 90000);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let suffix = "";
    for (let i = 0; i < 3; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `FTC-${nums}-${suffix}`;
  },

  _clean(data) {
    if (!data) return null;
    const { createdAt, updatedAt, ...rest } = data;
    if (rest.eventName === undefined) rest.eventName = "";
    return rest;
  }
};
