// Smoke test: endpoint autocomplete amazon.it diretto e proxy della web app (se avviata).
const q = process.argv[2] ?? 'libro ricette';
const direct = `https://completion.amazon.it/api/2017/suggestions?mid=APJ6JRA9NG5V4&alias=stripbooks&prefix=${encodeURIComponent(q)}`;

const r = await fetch(direct, { headers: { 'user-agent': 'Mozilla/5.0' } });
const data = await r.json();
const values = (data.suggestions ?? []).map((s) => s.value);
console.log(`Amazon diretto (${values.length}):`);
for (const v of values) console.log('  ' + v);

const web = process.env.WEB_URL ?? 'http://localhost:3000';
try {
  const p = await fetch(`${web}/api/autocomplete?q=${encodeURIComponent(q)}&alias=stripbooks`);
  console.log(`\nProxy web app: HTTP ${p.status}${p.status === 401 ? ' (serve il login, atteso senza cookie)' : ''}`);
  if (p.ok) console.log(JSON.stringify(await p.json(), null, 1).slice(0, 600));
} catch {
  console.log(`\nProxy web app non raggiungibile su ${web} (avvia npm run dev:web)`);
}
