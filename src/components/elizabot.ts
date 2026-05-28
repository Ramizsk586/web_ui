import {
  elizaInitials,
  elizaFinals,
  elizaQuits,
  elizaPres,
  elizaPosts,
  elizaSynons,
  elizaKeywords,
  elizaPostTransforms
} from './elizadata';

export class ElizaBot {
  noRandom: boolean;
  capitalizeFirstLetter: boolean;
  debug: boolean;
  memSize: number;
  version: string;
  quit: boolean;
  mem: string[];
  lastchoice: number[][];
  sentence: string;

  // Instance specific copies of parsed rules
  keywords: any[];
  pres: Record<string, string>;
  posts: Record<string, string>;
  preExp: RegExp;
  postExp: RegExp;

  constructor(noRandomFlag: boolean = false) {
    this.noRandom = noRandomFlag;
    this.capitalizeFirstLetter = true;
    this.debug = false;
    this.memSize = 20;
    this.version = "1.1 (original)";
    this.quit = false;
    this.mem = [];
    this.lastchoice = [];
    this.sentence = '';

    // Initialize mapping copies
    this.keywords = JSON.parse(JSON.stringify(elizaKeywords));
    this.pres = {};
    this.posts = {};
    this.preExp = /####/;
    this.postExp = /####/;

    this._init();
    this.reset();
  }

  reset() {
    this.quit = false;
    this.mem = [];
    this.lastchoice = [];
    for (let k = 0; k < this.keywords.length; k++) {
      this.lastchoice[k] = [];
      const rules = this.keywords[k][2];
      for (let i = 0; i < rules.length; i++) {
        this.lastchoice[k][i] = -1;
      }
    }
  }

  _init() {
    // parse data and convert from canonical form to internal representation
    const synPatterns: Record<string, string> = {};
    if (elizaSynons && typeof elizaSynons === 'object') {
      for (const i in elizaSynons) {
        synPatterns[i] = '(' + i + '|' + elizaSynons[i].join('|') + ')';
      }
    }

    // 1st: convert rules to regexps
    // expand synonyms and asterisk expressions
    const sre = /@(\S+)/;
    const are = /(\S)\s*\*\s*(\S)/;
    const are1 = /^\s*\*\s*(\S)/;
    const are2 = /(\S)\s*\*\s*$/;
    const are3 = /^\s*\*\s*$/;
    const wsre = /\s+/g;

    for (let k = 0; k < this.keywords.length; k++) {
      const rules = this.keywords[k][2];
      this.keywords[k][3] = k; // Original index for sorting order persistence
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        // check mem flag and store it as decomp element 2
        if (r[0].charAt(0) === '$') {
          let ofs = 1;
          while (r[0].charAt(ofs) === ' ') ofs++;
          r[0] = r[0].substring(ofs);
          r[2] = true;
        } else {
          r[2] = false;
        }
        // expand synonyms
        let m = sre.exec(r[0]);
        while (m) {
          const sp = synPatterns[m[1]] ? synPatterns[m[1]] : m[1];
          r[0] = r[0].substring(0, m.index) + sp + r[0].substring(m.index + m[0].length);
          m = sre.exec(r[0]);
        }
        // expand asterisk expressions
        if (are3.test(r[0])) {
          r[0] = '\\s*(.*)\\s*';
        } else {
          m = are.exec(r[0]);
          if (m) {
            let lp = '';
            let rp = r[0];
            while (m) {
              lp += rp.substring(0, m.index + 1);
              if (m[1] !== ')') lp += '\\b';
              lp += '\\s*(.*)\\s*';
              if ((m[2] !== '(') && (m[2] !== '\\')) lp += '\\b';
              lp += m[2];
              rp = rp.substring(m.index + m[0].length);
              m = are.exec(rp);
            }
            r[0] = lp + rp;
          }
          m = are1.exec(r[0]);
          if (m) {
            let lp = '\\s*(.*)\\s*';
            if ((m[1] !== ')') && (m[1] !== '\\')) lp += '\\b';
            r[0] = lp + r[0].substring(m.index - 1 + m[0].length);
          }
          m = are2.exec(r[0]);
          if (m) {
            let lp = r[0].substring(0, m.index + 1);
            if (m[1] !== '(') lp += '\\b';
            r[0] = lp + '\\s*(.*)\\s*';
          }
        }
        // expand whitespace
        r[0] = r[0].replace(wsre, '\\s+');
        wsre.lastIndex = 0;
      }
    }

    // Now sort keywords by rank descending, using lambda to bind context
    this.keywords.sort((a, b) => this._sortKeywords(a, b));

    // compose regexes and reference maps for pre/post transformations
    this.pres = {};
    this.posts = {};

    if (elizaPres && elizaPres.length) {
      const a = [];
      for (let i = 0; i < elizaPres.length; i += 2) {
        a.push(elizaPres[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        this.pres[elizaPres[i]] = elizaPres[i + 1];
      }
      this.preExp = new RegExp('\\b(' + a.join('|') + ')\\b');
    }

    if (elizaPosts && elizaPosts.length) {
      const a = [];
      for (let i = 0; i < elizaPosts.length; i += 2) {
        a.push(elizaPosts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        this.posts[elizaPosts[i]] = elizaPosts[i + 1];
      }
      this.postExp = new RegExp('\\b(' + a.join('|') + ')\\b');
    }
  }

  _sortKeywords(a: any, b: any) {
    if (a[1] > b[1]) return -1;
    if (a[1] < b[1]) return 1;
    if (a[3] > b[3]) return 1;
    if (a[3] < b[3]) return -1;
    return 0;
  }

  transform(text: string): string {
    let rpl = '';
    this.quit = false;
    
    // Unify input text strings
    text = text.toLowerCase();
    text = text.replace(/[@#$%\^&*()_+=~`{\[}\]|:;<>\/\\\t]/g, ' ');
    text = text.replace(/\s+-+\s+/g, '.');
    text = text.replace(/\s*[,\.\?!;]+\s*/g, '.');
    text = text.replace(/\s*\bbut\b\s*/g, '.');
    text = text.replace(/\s{2,}/g, ' ');

    // split sentences and step through them
    const parts = text.split('.');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part !== '') {
        // check for quit key expressions
        for (let q = 0; q < elizaQuits.length; q++) {
          if (elizaQuits[q] === part) {
            this.quit = true;
            return this.getFinal();
          }
        }
        // preprocess substitutions
        let partProcessed = part;
        let m = this.preExp.exec(partProcessed);
        if (m) {
          let lp = '';
          let rp = partProcessed;
          while (m) {
            lp += rp.substring(0, m.index) + this.pres[m[1]];
            rp = rp.substring(m.index + m[0].length);
            m = this.preExp.exec(rp);
          }
          partProcessed = lp + rp;
        }
        this.sentence = partProcessed;
        // search matching keywords
        for (let k = 0; k < this.keywords.length; k++) {
          const matchWord = this.keywords[k][0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (partProcessed.search(new RegExp('\\b' + matchWord + '\\b', 'i')) >= 0) {
            rpl = this._execRule(k);
          }
          if (rpl !== '') return rpl;
        }
      }
    }
    // try retrieval from memory array
    rpl = this._memGet();
    // default to xnone rules if completely unmatched
    if (rpl === '') {
      this.sentence = ' ';
      const k = this._getRuleIndexByKey('xnone');
      if (k >= 0) rpl = this._execRule(k);
    }
    return (rpl !== '') ? rpl : 'I am at a loss for words.';
  }

  _execRule(k: number): string {
    const rule = this.keywords[k];
    const decomps = rule[2];
    const paramre = /\(([0-9]+)\)/;
    
    for (let i = 0; i < decomps.length; i++) {
      const m = this.sentence.match(new RegExp(decomps[i][0], 'i'));
      if (m != null) {
        const reasmbs = decomps[i][1];
        const memflag = decomps[i][2];
        let ri = this.noRandom ? 0 : Math.floor(Math.random() * reasmbs.length);
        if (((this.noRandom) && (this.lastchoice[k][i] > ri)) || (this.lastchoice[k][i] === ri)) {
          ri = ++this.lastchoice[k][i];
          if (ri >= reasmbs.length) {
            ri = 0;
            this.lastchoice[k][i] = -1;
          }
        } else {
          this.lastchoice[k][i] = ri;
        }
        let rpl = reasmbs[ri];
        if (this.debug) {
          console.log('match:\nkey: ' + this.keywords[k][0] +
            '\nrank: ' + this.keywords[k][1] +
            '\ndecomp: ' + decomps[i][0] +
            '\nreasmb: ' + rpl +
            '\nmemflag: ' + memflag);
        }
        if (rpl.search(/^goto /i) === 0) {
          const ki = this._getRuleIndexByKey(rpl.substring(5));
          if (ki >= 0) return this._execRule(ki);
        }
        // substitute positional params matching wildcards
        let m1 = paramre.exec(rpl);
        if (m1) {
          let lp = '';
          let rp = rpl;
          while (m1) {
            let param = m[parseInt(m1[1], 10)];
            if (param) {
              let m2 = this.postExp.exec(param);
              if (m2) {
                let lp2 = '';
                let rp2 = param;
                while (m2) {
                  lp2 += rp2.substring(0, m2.index) + this.posts[m2[1]];
                  rp2 = rp2.substring(m2.index + m2[0].length);
                  m2 = this.postExp.exec(rp2);
                }
                param = lp2 + rp2;
              }
            } else {
              param = '';
            }
            lp += rp.substring(0, m1.index) + param;
            rp = rp.substring(m1.index + m1[0].length);
            m1 = paramre.exec(rp);
          }
          rpl = lp + rp;
        }
        rpl = this._postTransform(rpl);
        if (memflag) {
          this._memSave(rpl);
        } else {
          return rpl;
        }
      }
    }
    return '';
  }

  _postTransform(s: string): string {
    s = s.replace(/\s{2,}/g, ' ');
    s = s.replace(/\s+\./g, '.');
    if (elizaPostTransforms && elizaPostTransforms.length) {
      for (let i = 0; i < elizaPostTransforms.length; i += 2) {
        s = s.replace(elizaPostTransforms[i], elizaPostTransforms[i + 1]);
        elizaPostTransforms[i].lastIndex = 0;
      }
    }
    if (this.capitalizeFirstLetter) {
      const re = /^([a-z])/;
      const m = re.exec(s);
      if (m) s = m[0].toUpperCase() + s.substring(1);
    }
    return s;
  }

  _getRuleIndexByKey(key: string): number {
    for (let k = 0; k < this.keywords.length; k++) {
      if (this.keywords[k][0] === key) return k;
    }
    return -1;
  }

  _memSave(t: string) {
    this.mem.push(t);
    if (this.mem.length > this.memSize) this.mem.shift();
  }

  _memGet(): string {
    if (this.mem.length) {
      if (this.noRandom) return this.mem.shift() || '';
      const n = Math.floor(Math.random() * this.mem.length);
      const rpl = this.mem[n];
      for (let i = n + 1; i < this.mem.length; i++) this.mem[i - 1] = this.mem[i];
      this.mem.length--;
      return rpl;
    }
    return '';
  }

  getFinal(): string {
    if (!elizaFinals) return '';
    return elizaFinals[Math.floor(Math.random() * elizaFinals.length)];
  }

  getInitial(): string {
    if (!elizaInitials) return '';
    return elizaInitials[Math.floor(Math.random() * elizaInitials.length)];
  }
}
