// Renderizador mínimo para componentes de função com hooks (useState, useEffect, useRef, useCallback, useMemo).
// Expande os componentes de função em árvores de elementos "host" (strings) e roda os efeitos como o React faria.
import { __setDispatcher } from './react';

type Inst = { hooks: any[]; idx: number; seen: boolean };

export function mount(Root: any, rootProps: any = {}) {
  const instances = new Map<string, Inst>();
  let tree: any = null;
  let pending: (() => void)[] = [];
  let rendering = false;
  let dirty = false;
  let unmounted = false;
  let currentProps = rootProps;

  const depsEqual = (a?: any[], b?: any[]) => !!a && !!b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

  function makeDispatcher(inst: Inst) {
    return {
      useState(init: any) {
        const i = inst.idx++;
        if (!(i in inst.hooks)) {
          inst.hooks[i] = {
            value: typeof init === 'function' ? init() : init,
            set: (v: any) => {
              const next = typeof v === 'function' ? v(inst.hooks[i].value) : v;
              if (Object.is(next, inst.hooks[i].value)) return;
              inst.hooks[i].value = next;
              schedule();
            },
          };
        }
        return [inst.hooks[i].value, inst.hooks[i].set];
      },
      useRef(init: any) {
        const i = inst.idx++;
        if (!(i in inst.hooks)) inst.hooks[i] = { ref: { current: init } };
        return inst.hooks[i].ref;
      },
      useMemo(fn: any, deps?: any[]) {
        const i = inst.idx++;
        const h = inst.hooks[i];
        if (!h || !depsEqual(h.deps, deps)) inst.hooks[i] = { value: fn(), deps };
        return inst.hooks[i].value;
      },
      useCallback(fn: any, deps?: any[]) {
        const i = inst.idx++;
        const h = inst.hooks[i];
        if (!h || !depsEqual(h.deps, deps)) inst.hooks[i] = { value: fn, deps };
        return inst.hooks[i].value;
      },
      useEffect(fn: any, deps?: any[]) {
        const i = inst.idx++;
        const h = inst.hooks[i];
        if (!h || !deps || !depsEqual(h.deps, deps)) {
          const entry: any = { deps, cleanup: h?.cleanup };
          inst.hooks[i] = entry;
          pending.push(() => {
            if (entry.cleanup) { entry.cleanup(); entry.cleanup = undefined; }
            const c = fn();
            if (typeof c === 'function') entry.cleanup = c;
          });
        }
      },
    };
  }

  function expand(node: any, path: string): any {
    if (node === null || node === undefined || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((n, i) => expand(n, `${path}.${i}`));
    if (typeof node.type === 'function') {
      let inst = instances.get(path);
      if (!inst) { inst = { hooks: [], idx: 0, seen: true }; instances.set(path, inst); }
      inst.seen = true;
      inst.idx = 0;
      __setDispatcher(makeDispatcher(inst));
      const out = node.type({ ...node.props, children: node.children });
      return expand(out, `${path}/c`);
    }
    return { ...node, children: (node.children || []).map((c: any, i: number) => expand(c, `${path}/${i}`)) };
  }

  function render() {
    rendering = true;
    for (const inst of instances.values()) inst.seen = false;
    pending = [];
    tree = expand({ type: Root, props: currentProps, children: [] }, 'root');
    // desmonta quem saiu da árvore (roda os cleanups)
    for (const [p, inst] of [...instances.entries()]) {
      if (!inst.seen) { inst.hooks.forEach((h) => h?.cleanup?.()); instances.delete(p); }
    }
    const run = pending;
    pending = [];
    // setState dentro de um efeito só agenda a próxima renderização: ela vem depois de TODOS os efeitos (como no React)
    run.forEach((f) => f());
    rendering = false;
    if (dirty) { dirty = false; render(); }
  }

  function schedule() {
    if (unmounted) return;
    if (rendering) { dirty = true; return; }
    render();
  }

  render();
  return {
    get tree() { return tree; },
    rerender(props: any) { currentProps = { ...currentProps, ...props }; render(); },
    unmount() { unmounted = true; for (const inst of instances.values()) inst.hooks.forEach((h) => h?.cleanup?.()); instances.clear(); },
    // deixa promessas pendentes resolverem (ex.: AccessibilityInfo.isReduceMotionEnabled) e atualizarem o estado
    async flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); },
  };
}

export function findAll(node: any, pred: (n: any) => boolean, out: any[] = []): any[] {
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out)); return out; }
  if (pred(node)) out.push(node);
  (node.children || []).forEach((c: any) => findAll(c, pred, out));
  return out;
}
export const byTestId = (tree: any, id: string) => findAll(tree, (n) => n.props?.testID === id)[0];
export const byLabel = (tree: any, label: string) => findAll(tree, (n) => n.props?.accessibilityLabel === label)[0];
export const textsOf = (tree: any) => findAll(tree, (n) => n.type === 'Text').flatMap((n) => n.children.map(String));
