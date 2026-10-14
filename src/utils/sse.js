// Parser incremental de Server-Sent Events. Recebe pedaços de texto (que podem
// cortar um evento no meio) e chama onEvent({ event, data }) para cada evento
// completo. Linhas de comentário (": ...") e eventos sem "data" são ignorados;
// "data" precisa ser JSON.

function parseBlock(block) {
  let event = 'message';
  const data = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const i = line.indexOf(':');
    const field = i === -1 ? line : line.slice(0, i);
    let value = i === -1 ? '' : line.slice(i + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  if (data.length === 0) return null;
  try {
    return { event, data: JSON.parse(data.join('\n')) };
  } catch {
    return null;
  }
}

export function createSseParser(onEvent) {
  let buffer = '';
  return {
    push(text) {
      // Normaliza o buffer inteiro: um "\r" no fim de um pedaço pode ter o "\n" no próximo.
      buffer = (buffer + text).replace(/\r\n/g, '\n');
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const ev = parseBlock(block);
        if (ev) onEvent(ev);
      }
    },
    // Chame no fim da conexão: processa um último evento sem linha em branco final.
    flush() {
      const rest = buffer;
      buffer = '';
      if (rest.trim()) {
        const ev = parseBlock(rest);
        if (ev) onEvent(ev);
      }
    },
  };
}
