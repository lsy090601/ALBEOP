// POST 핸들러 공용: Vercel Node 런타임이 req.body에 자동으로 파싱해 주는 경우와,
// (로컬 테스트 등에서) 파싱되지 않은 원본 스트림만 있는 경우를 모두 지원한다.

import type { IncomingMessage } from 'node:http';

interface RequestWithBody extends IncomingMessage {
  body?: unknown;
}

async function readStream(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const withBody = req as RequestWithBody;
  if (withBody.body !== undefined) {
    return (
      typeof withBody.body === 'string' ? JSON.parse(withBody.body) : withBody.body
    ) as T;
  }

  const raw = await readStream(req);
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}
