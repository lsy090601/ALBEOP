import type { IncomingMessage, ServerResponse } from 'node:http';
import { deleteProfileData, fetchProfile, updateProfile } from './_lib/runProfile.ts';
import { readJsonBody } from './_lib/readJsonBody.ts';
import type { ProfileFields } from './_lib/runProfile.ts';

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

export default async function handler(req: IncomingMessage, res: VercelLikeResponse) {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const profileId = url.searchParams.get('profile_id');
    if (!profileId) {
      res.status(400).json({ ok: false, error: 'profile_id는 필수예요.' });
      return;
    }

    if (req.method === 'GET') {
      const profile = await fetchProfile(profileId);
      if (!profile) {
        res.status(404).json({ ok: false, error: '프로필을 찾을 수 없어요.' });
        return;
      }
      res.status(200).json({ ok: true, profile });
      return;
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody<Partial<ProfileFields>>(req);
      const profile = await updateProfile(profileId, body);
      res.status(200).json({ ok: true, profile });
      return;
    }

    if (req.method === 'DELETE') {
      await deleteProfileData(profileId);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ ok: false, error: '지원하지 않는 메서드예요.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
