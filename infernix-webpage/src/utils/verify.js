export const VERIFY_STEPS = [
  { id: 'parse',    label: 'Parsing code structure' },
  { id: 'syntax',   label: 'Validating Luau syntax' },
  { id: 'api',      label: 'Checking API compatibility' },
  { id: 'hyperion', label: 'Scanning Hyperion patterns' },
  { id: 'byfron',   label: 'Analyzing Byfron vectors' },
  { id: 'finalize', label: 'Compiling report' },
];

export function makeVerifState(attempt = 1, maxAttempts = 3, code = '') {
  return {
    steps: VERIFY_STEPS.map(s => ({ ...s, status: 'idle' })),
    attempt,
    maxAttempts,
    code,
    issues: [],
    passed: null,
    retrying: false,
  };
}

const STATUS_MAP = { start: 'running', done: 'done', fail: 'fail' };

export async function runVerifyLoop(artifact, setVerif, setArtifacts) {
  const MAX = 3;
  let code = artifact.code;

  for (let attempt = 1; attempt <= MAX; attempt++) {
    setVerif(makeVerifState(attempt, MAX, code));

    let verifyResult = null;
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: artifact.language }),
      });
      if (!res.ok) break;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw.startsWith('{')) continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'step') {
              setVerif(prev => prev ? {
                ...prev,
                steps: prev.steps.map(s => s.id === evt.id
                  ? { ...s, status: STATUS_MAP[evt.status] ?? evt.status, label: evt.label || s.label }
                  : s
                ),
              } : null);
            } else if (evt.type === 'result') {
              verifyResult = evt;
            }
          } catch {}
        }
      }
    } catch { break; }

    if (!verifyResult) break;

    const { pass, issues = [], fixedCode = null } = verifyResult;
    const canRetry = !!fixedCode && attempt < MAX;
    setVerif(prev => prev ? { ...prev, issues, passed: pass, retrying: canRetry } : null);

    if (pass) {
      setTimeout(() => setVerif(null), 2500);
      break;
    }

    if (!canRetry) {
      if (fixedCode) {
        setArtifacts(prev => ({ ...prev, [artifact.id]: { ...artifact, code: fixedCode } }));
      }
      setTimeout(() => setVerif(null), 6000);
      break;
    }

    // Apply fixed code and re-verify
    code = fixedCode;
    setArtifacts(prev => ({ ...prev, [artifact.id]: { ...artifact, code: fixedCode } }));
    await new Promise(r => setTimeout(r, 1400));
  }
}
