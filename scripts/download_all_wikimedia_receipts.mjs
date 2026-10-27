import fs from 'fs';
import path from 'path';
import https from 'https';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const headers = {
      'User-Agent': 'DocuLockerBatchResearch/1.0 (contact: student-project@doculocker.local)'
    };

    https.get(url, { headers }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Pobieranie listy plikow z Wikimedia Commons...');
  const catUrl = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Receipts_of_Poland&cmtype=file&cmlimit=60&format=json';

  const res = await fetch(catUrl, {
    headers: { 'User-Agent': 'DocuLockerBatchResearch/1.0' }
  });
  const data = await res.json();
  const members = data?.query?.categorymembers || [];
  console.log(`Pobrano ${members.length} pozycji.`);

  let downloadedCount = 0;
  for (const item of members) {
    if (downloadedCount >= 18) break;

    const title = item.title;
    const cleanBase = title.replace(/^File:/, '').replace(/[^\w\d.-]/g, '_');
    const ext = path.extname(cleanBase).toLowerCase();

    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      continue;
    }

    const dest = path.resolve('test_dataset/images/grocery', cleanBase);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Pominieto istniejacy: ${cleanBase}`);
      continue;
    }

    try {
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
      const infoRes = await fetch(infoUrl, {
        headers: { 'User-Agent': 'DocuLockerBatchResearch/1.0' }
      });
      const infoData = await infoRes.json();
      const pages = infoData?.query?.pages || {};
      const page = Object.values(pages)[0];
      const imageUrl = page?.imageinfo?.[0]?.url;

      if (imageUrl) {
        console.log(`[${downloadedCount + 1}/18] Pobieranie: ${cleanBase}...`);
        await downloadFile(imageUrl, dest);
        downloadedCount++;
        console.log(`-> Zapisano ${cleanBase} (${fs.statSync(dest).size} B)`);
      }
    } catch (e) {
      console.error(`Blad dla ${cleanBase}:`, e.message);
    }

    await sleep(1200);
  }

  console.log(`Zakonczono. Pobrano ${downloadedCount} nowych probek.`);
}

main();
