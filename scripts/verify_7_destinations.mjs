const destinations = [
  { id: 'tx_in', url: 'https://talentxcel.in' },
  { id: 'tx_net', url: 'https://talentxcel.net' },
  { id: 'chatr_biz', url: 'https://chatrchat.in' },
  { id: 'nuty_apex', url: 'https://nutytales.com' },
  { id: 'nuty_nri', url: 'https://nri.nutytales.com' },
  { id: 'tx_resume', url: 'https://resume.talentxcel.in' },
  { id: 'tx_jobs', url: 'https://jobs.talentxcel.in' }
];

async function verifyAll() {
  for (const d of destinations) {
    try {
      const res = await fetch(d.url, { method: 'GET', redirect: 'follow' });
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      console.log('---');
      console.log('ID:', d.id);
      console.log('URL:', d.url);
      console.log('HTTP Status:', res.status);
      console.log('Final URL:', res.url);
      console.log('Page Title:', titleMatch ? titleMatch[1].trim() : 'N/A');
      console.log('Description:', descMatch ? descMatch[1].trim().slice(0, 140) + '...' : 'N/A');
    } catch (e) {
      console.log('ID:', d.id, '-> Error:', e.message);
    }
  }
}
verifyAll();
