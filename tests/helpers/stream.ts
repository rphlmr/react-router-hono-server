export type StreamRead = {
  chunks: string[];
  text: string;
};

export async function readResponseStream(response: Response): Promise<StreamRead> {
  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (chunk.length > 0) {
      chunks.push(chunk);
      text += chunk;
    }
  }

  text += decoder.decode();
  return { chunks, text };
}

export function prefixBefore(text: string, marker: string) {
  const index = text.indexOf(marker);
  return index === -1 ? text : text.slice(0, index);
}
