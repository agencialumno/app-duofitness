// Stub mínimo do React para testar componentes do app em Node (sem instalar o React no backend).
// createElement devolve um descritor simples ({ type, props, children }) que o teste percorre.
// Os hooks delegam a um "dispatcher" instalado pelo renderizador de teste (test/stubs/mini-render.ts).
export class Component {
  props: any;
  state: any;
  constructor(props: any) { this.props = props; }
  // aplica na hora (o React real agrupa, mas para o teste o efeito final é o mesmo)
  setState(u: any) {
    const patch = typeof u === 'function' ? u(this.state, this.props) : u;
    this.state = { ...this.state, ...patch };
  }
}
export const Fragment = 'Fragment';
export function createElement(type: any, props: any, ...children: any[]) {
  return { type, props: props || {}, children };
}

let dispatcher: any = null;
export function __setDispatcher(d: any) { dispatcher = d; }
const need = () => { if (!dispatcher) throw new Error('hook usado fora de um componente renderizado pelo mini-render'); return dispatcher; };
export const useState = (init: any) => need().useState(init);
export const useEffect = (fn: any, deps?: any[]) => need().useEffect(fn, deps);
export const useRef = (init?: any) => need().useRef(init);
export const useCallback = (fn: any, deps?: any[]) => need().useCallback(fn, deps);
export const useMemo = (fn: any, deps?: any[]) => need().useMemo(fn, deps);

export default { Component, Fragment, createElement, useState, useEffect, useRef, useCallback, useMemo };
