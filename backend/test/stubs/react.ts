// Stub mínimo do React para testar componentes de classe do app em Node (sem instalar o React no backend).
// createElement devolve um descritor simples ({ type, props, children }) que o teste percorre.
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
export default { Component, Fragment, createElement };
