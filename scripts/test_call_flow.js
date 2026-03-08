/*
  End-to-end Agora token diagnostic.

  Usage:
    node scripts/test_call_flow.js <BASE_URL> <JWT_TOKEN> <CHANNEL_NAME> <UID>

  Example:
    node scripts/test_call_flow.js http://192.168.1.9:8000 <token> diagnostic_direct_join 1001
*/

const [,, baseUrlArg, jwtArg, channelArg, uidArg] = process.argv;

if (!baseUrlArg || !jwtArg || !channelArg || !uidArg) {
  console.error('Usage: node scripts/test_call_flow.js <BASE_URL> <JWT_TOKEN> <CHANNEL_NAME> <UID>');
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/$/, '');
const uid = Number(uidArg);

if (!Number.isFinite(uid) || uid <= 0) {
  console.error('UID must be a positive number');
  process.exit(1);
}

async function main() {
  const endpoint = `${baseUrl}/api/agora/generate-token`;
  const payload = { channelName: channelArg, uid, role: 'publisher' };

  console.log('[TEST CALL FLOW] Request endpoint:', endpoint);
  console.log('[TEST CALL FLOW] Request payload:', payload);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtArg}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  console.log('[TEST CALL FLOW] Status:', response.status);
  console.log('[TEST CALL FLOW] Response:', body);

  if (!response.ok) {
    console.error('[TEST CALL FLOW] FAILED: endpoint returned non-OK status');
    process.exit(2);
  }

  const token = body?.token || '';
  console.log('[TEST CALL FLOW] Token prefix:', token.substring(0, 10));
  console.log('[TEST CALL FLOW] Token length:', token.length);

  if (!token.startsWith('006')) {
    console.error('[TEST CALL FLOW] FAILED: Token prefix does not start with 006');
    process.exit(3);
  }

  console.log('[TEST CALL FLOW] SUCCESS: token prefix is valid (006...)');
}

main().catch((err) => {
  console.error('[TEST CALL FLOW] ERROR:', err?.message || err);
  process.exit(99);
});
