import fs from 'fs';
import path from 'path';
import https from 'https';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const headers = {
      'User-Agent': 'DocuLockerAcademicBenchmarkBot/1.0 (contact: test@doculocker.local) Node/20'
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
  console.log('Rozpoczynanie pobierania probek paragonow z zachowaniem limitow zapytan...');

  // Lista wybranych plikow paragonow z Wikimedia Commons
  const filesToFetch = [
    { title: 'File:Paragon fiskalny.png', category: 'grocery', name: 'wzorcowy_paragon_01.png' },
    { title: 'File:Paragon fiskalny-2024.08.02.jpg', category: 'grocery', name: 'paragon_2024_08_02.jpg' },
    { title: 'File:Paragon fiskalny - 2024.07.05.jpg', category: 'grocery', name: 'paragon_2024_07_05.jpg' },
    { title: 'File:Paragon fiskalny - 12.04.2025.jpg', category: 'grocery', name: 'paragon_2025_04_12.jpg' },
    { title: 'File:Paragon fiskalny - 02.03.2026.jpg', category: 'grocery', name: 'paragon_2026_03_02.jpg' },
    { title: 'File:Paragon fiskalny-opis.jpg', category: 'edge_cases', name: 'paragon_opis.jpg' }
  ];

  for (const item of filesToFetch) {
    const dest = path.resolve(`test_dataset/images/${item.category}/${item.name}`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Pominieto (juz istnieje): ${item.name}`);
      continue;
    }

    console.log(`Pobieranie metadanych dla ${item.title}...`);
    try {
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(item.title)}&prop=imageinfo&iiprop=url&format=json`;
      const res = await fetch(infoUrl, {
        headers: { 'User-Agent': 'DocuLockerAcademicBenchmarkBot/1.0 (contact: test@doculocker.local)' }
      });
      const data = await res.json();
      const pages = data?.query?.pages || {};
      const page = Object.values(pages)[0];
      const imageUrl = page?.imageinfo?.[0]?.url;

      if (imageUrl) {
        console.log(`Pobieranie pliku ${imageUrl} -> ${item.name}`);
        await downloadFile(imageUrl, dest);
        console.log(`Zapisano: ${item.name} (${fs.statSync(dest).size} bajtow)`);
      } else {
        console.warn(`Brak adresu URL dla ${item.title}`);
      }
    } catch (err) {
      console.error(`Blad dla ${item.name}:`, err.message);
    }

    await sleep(1500); // polite rate limit
  }

  console.log('Koniec pobierania.');
}

main();
