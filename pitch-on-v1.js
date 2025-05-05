// Version: 1.0.1
// (C) 2025 indianayourself - (C) 2025 pigeonposse
// Ignacio Ramos @irfaelo
// 

  const SignalCenter = {
    _signals: {},
  
    emit(signal, data) {
      (this._signals[signal] || []).forEach(cb => cb(data));
    },
  
    on(signal, callback) {
      if (!this._signals[signal]) this._signals[signal] = [];
      this._signals[signal].push(callback);
    },
  
    off(signal, callback) {
      if (!this._signals[signal]) return;
      this._signals[signal] = this._signals[signal].filter(cb => cb !== callback);
    }
  };
  ;class IYComponentBase extends HTMLElement {
    constructor(template, encapsulated = true) {
      super();
      this._template = template;
      this._encapsulated = encapsulated;
    }
  
    connectedCallback() {
      try {
        // Protección: no procesar si no hay template
        if (!this._template) return;
  
        if (this.hasAttribute('if')) {
          this._ifCondition = this.getAttribute('if');
          this._bindReactiveIf();
          this.style.display = this._evaluateIfCondition() ? '' : 'none';
        }
  
        if (this.hasAttribute('for')) {
          if (this._processedFor) return;
          this._processedFor = true;
  
          const expr = this.getAttribute('for');
          const match = expr.match(/^(\w+)\s+of\s+(\w+)$/);
          if (!match) {
            console.warn(`'for' mal formado: ${expr}`);
            return;
          }
          const [_, varName, listName] = match;
          const list = window[listName];
  
          if (!Array.isArray(list)) {
            console.warn(`Lista no encontrada: window["${listName}"]`);
            return;
          }
  
          const parent = this.parentElement;
          const template = this.cloneNode(true);
          template.removeAttribute('for');
  
          list.forEach(item => {
            const clone = template.cloneNode(true);
            for (const [k, v] of Object.entries(item)) {
              clone.setAttribute(k, typeof v === "object" ? JSON.stringify(v) : v);
            }
            parent.appendChild(clone);
          });
  
          this.remove();
          return;
        }
  
        this._mount();
      } catch (e) {
        console.error('Error en connectedCallback:', e);
      }
    }
  
    _evaluateIfCondition() {
      try {
        return Function(`return (${this._ifCondition})`)();
      } catch (e) {
        console.warn('Error evaluando if:', e);
        return false;
      }
    }
  
    _bindReactiveIf() {
const matches = [...this._ifCondition.matchAll(/document\.getElementById\(['"](.+?)['"]\)/g)];

matches.forEach(match => {
  const id = match[1];
  const el = document.getElementById(id);
  if (el) {
    const update = () => {
      try {
        const result = this._evaluateIfCondition();
        const hideClass = this.getAttribute('hide-class');

        if (hideClass) {
          if (result) {
            this.style.display = '';
            requestAnimationFrame(() => {
              this.classList.remove(hideClass);
            });
          } else {
            this.classList.add(hideClass);
          }
        } else {
          this.style.display = result ? '' : 'none';
        }
      } catch (e) {
        console.warn('Error en reactividad if:', e);
      }
    };

    el.addEventListener('toggle', update);
    el.addEventListener('ready', update);
    update();
  }
});
}

  
    _getContext() {
      const obj = {};
      for (const attr of this.attributes) {
        try {
          obj[attr.name] = JSON.parse(attr.value);
        } catch {
          obj[attr.name] = attr.value;
        }
      }
      return obj;
    }
  
    _mount() {
      try {
        const root = this._encapsulated ? this.attachShadow({ mode: 'open' }) : this;
        let html = this._template.html || '';
        const css = this._template.css || '';
        const attr = this._template.attr || {};
  
        for (const key in attr) {
          const val = this.getAttribute(key) || attr[key];
          html = html.split(`{{${key}}}`).join(val);
        }
  
        const style = css ? `<style>${css}</style>` : '';
        root.innerHTML = style + html;
  
        this._processInnerFor(root);
  
        if (this._template.methods) {
          Object.entries(this._template.methods).forEach(([name, fn]) => {
            this[name] = fn.bind(this);
          });
        }
  
        if (typeof this._template.post === 'function') {
          this._template.post.call(this);
        }
      } catch (e) {
        console.error('Error en _mount:', e);
      }

      // Dentro del _mount o justo después del define()
 
this.emitSignal = (signal, data) => SignalCenter.emit(signal, data);
this.onSignal = (signal, callback) => SignalCenter.on(signal, callback);
this.offSignal = (signal, callback) => SignalCenter.off(signal, callback);

    }
  
    _processInnerFor(root) {
      const elements = root.querySelectorAll('[for]');
      const context = this._getContext();
  
      elements.forEach(el => {
        const expr = el.getAttribute('for');
        const match = expr.match(/^(\w+)\s+of\s+(\w+)$/);
        if (!match) {
          console.warn(`Error procesando for interno: ${expr}`);
          return;
        }
        const [_, varName, listName] = match;
        const list = context[listName];
        if (!Array.isArray(list)) {
          console.warn(`Lista interna no encontrada: ${listName}`);
          return;
        }
  
        const parent = el.parentElement;
        const template = el.cloneNode(true);
        template.removeAttribute('for');
  
        list.forEach(item => {
          const clone = template.cloneNode(true);
          clone.innerHTML = clone.innerHTML.split(`{{${varName}}}`).join(item);
          parent.appendChild(clone);
        });
  
        el.remove();
      });
    }
  }
  class IYComponentBuilder {
    constructor(tag) {
      this.tag = tag;
      this.template = {
        html: '',
        css: '',
        attr: {},
        encapsulated: true,
        methods: {},
        pre: null,
        post: null,
      };
    }
  
    html(html) {
      this.template.html = html;
      return this;
    }
  
    css(css) {
      this.template.css = css;
      return this;
    }
  
    attr(attrObj) {
      this.template.attr = attrObj;
      return this;
    }
  
    encapsulated(bool) {
      this.template.encapsulated = bool;
      return this;
    }
  
    methods(methodObj) {
      this.template.methods = methodObj;
      return this;
    }
  
    pre(fn) {
      this.template.pre = fn;
      return this;
    }
  
    post(fn) {
      this.template.post = fn;
      return this;
    }
  
    define() {
      const builder = this;
      class CustomElement extends IYComponentBase {
        constructor() {
          super(builder.template, builder.template.encapsulated);
        }
      }
      customElements.define(this.tag, CustomElement);
      return CustomElement;
    }
  }

