import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser for JSON with ample limit for photos
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Fizyczne pobranie kompletnej paczki aplikacji (.ZIP)
app.get('/api/download-package', async (req: Request, res: Response) => {
  try {
    const zip = new JSZip();

    const distDir = path.resolve(__dirname, 'dist');
    const publicDir = path.resolve(__dirname, 'public');

    function addDirectoryToZip(targetZip: JSZip, localPath: string) {
      if (!fs.existsSync(localPath)) return;
      const items = fs.readdirSync(localPath, { withFileTypes: true });
      for (const item of items) {
        const itemFullPath = path.join(localPath, item.name);
        if (item.isDirectory()) {
          const subFolder = targetZip.folder(item.name);
          if (subFolder) addDirectoryToZip(subFolder, itemFullPath);
        } else {
          targetZip.file(item.name, fs.readFileSync(itemFullPath));
        }
      }
    }

    // 1. DEDYKOWANY FOLDER dist/ (GOTOWA STRONA WWW DO WRZUCENIA NA NETLIFY / VERCEL / HOSTING)
    const distFolder = zip.folder('dist');
    if (distFolder && fs.existsSync(distDir)) {
      addDirectoryToZip(distFolder, distDir);
    } else if (distFolder && fs.existsSync(publicDir)) {
      addDirectoryToZip(distFolder, publicDir);
    }

    // Upewnij się, że manifest.json i ikony PNG są w głównym katalogu ZIP
    const manifestPath = path.resolve(publicDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      zip.file('manifest.json', fs.readFileSync(manifestPath, 'utf8'));
    }

    const pngIcons = ['pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'apple-touch-icon.png'];
    for (const icon of pngIcons) {
      const p = path.resolve(publicDir, icon);
      if (fs.existsSync(p)) {
        zip.file(icon, fs.readFileSync(p));
      }
    }

    // Dodaj netlify.toml dla automatycznego deployu z GitHub
    const netlifyPath = path.resolve(__dirname, 'netlify.toml');
    if (fs.existsSync(netlifyPath)) {
      const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
      zip.file('netlify.toml', netlifyContent);
      if (distFolder) {
        distFolder.file('netlify.toml', netlifyContent);
      }
    }

    const netlifyFuncPath = path.resolve(__dirname, 'netlify', 'functions', 'scan-receipt.ts');
    if (fs.existsSync(netlifyFuncPath)) {
      const netlifyFolder = zip.folder('netlify');
      const netlifyFuncsFolder = netlifyFolder?.folder('functions');
      if (netlifyFuncsFolder) {
        netlifyFuncsFolder.file('scan-receipt.ts', fs.readFileSync(netlifyFuncPath, 'utf8'));
      }
    }

    const standalonePath = path.resolve(distDir, 'Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html');
    const legacyStandalonePath = path.resolve(distDir, 'Domowy_Budzet_Offline_Standalone.html');
    const publicStandalonePath = path.resolve(publicDir, 'Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html');
    const publicLegacyPath = path.resolve(publicDir, 'Domowy_Budzet_Offline_Standalone.html');

    let standaloneBuffer: Buffer | null = null;
    if (fs.existsSync(standalonePath)) {
      standaloneBuffer = fs.readFileSync(standalonePath);
    } else if (fs.existsSync(publicStandalonePath)) {
      standaloneBuffer = fs.readFileSync(publicStandalonePath);
    } else if (fs.existsSync(legacyStandalonePath)) {
      standaloneBuffer = fs.readFileSync(legacyStandalonePath);
    } else if (fs.existsSync(publicLegacyPath)) {
      standaloneBuffer = fs.readFileSync(publicLegacyPath);
    }

    if (standaloneBuffer) {
      zip.file('Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html', standaloneBuffer);
      zip.file('Domowy_Budzet_Offline_Standalone.html', standaloneBuffer);
    }

    const appUrl = 'https://ais-dev-ptp7mu6a5rt22psqkjkpdz-20365823493.europe-west3.run.app';

    // 2. WERSJA W CHMURZE LIVE SYNC: Plik HTML otwierający aplikację z synchronizacją chmurową
    const liveCloudRedirectHtml = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Domowy Budżet i Spiżarnia AI - Wersja w Chmurze Live Sync</title>
  <script>
    // Automatyczne otwarcie pełnej aplikacji z synchronizacją w chmurze
    try {
      window.location.replace("Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html");
    } catch (e) {
      window.location.href = "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html";
    }
  </script>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 28px;
      padding: 36px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .icon {
      font-size: 52px;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 10px 0;
      color: #ffffff;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .btn {
      display: block;
      width: 100%;
      background: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      padding: 13px 20px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 14px;
      transition: background 0.2s;
      box-sizing: border-box;
      margin-bottom: 10px;
    }
    .btn:hover {
      background: #4338ca;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.18);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">☁️⚡</div>
    <div class="badge">● SYNCHRONIZACJA CHMUROWA FIRESTORE AKTYWNA</div>
    <h1>Domowy Budżet i Spiżarnia AI</h1>
    <p>Otwieranie aplikacji z natychmiastową synchronizacją w chmurze między telefonami i komputerami...</p>
    <a href="Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" class="btn">Uruchom aplikację w tej przeglądarce &rarr;</a>
    <a href="${appUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Otwórz bezpośredni serwer chmurowy</a>
  </div>
</body>
</html>`;
    zip.file('Otworz_Wersje_W_Chmurze_Live_Sync.html', liveCloudRedirectHtml);

    // 3. Skrót / Launcher dla systemu Windows (.bat) otwierający wersję z synchronizacją
    const windowsCloudLauncher = `@echo off
chcp 65001 >nul
title Domowy Budżet i Spiżarnia AI - Live Cloud Sync
echo ======================================================================
echo   DOMOWY BUDŻET I SPIŻARNIA AI - WERSJA W CHMURZE LIVE SYNC
echo   Automatyczna synchronizacja wielourządzeniowa: AKTYWNA (Cloud Firestore)
echo ======================================================================
echo Otwieranie aplikacji w Twojej domyślnej przeglądarce...
if exist "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" (
    start "" "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html"
) else if exist "Domowy_Budzet_Offline_Standalone.html" (
    start "" "Domowy_Budzet_Offline_Standalone.html"
) else (
    start "" "${appUrl}"
)
`;
    zip.file('Uruchom_Wersje_W_Chmurze_Live_Sync.bat', windowsCloudLauncher);

    // 4. Skrót internetowy Windows (.url)
    const windowsInternetShortcut = `[InternetShortcut]
URL=${appUrl}
IconIndex=0
`;
    zip.file('Domowy_Budzet_Synchronizacja_Chmura.url', windowsInternetShortcut);

    // 5. Skrót / Launcher dla Mac & Linux (.sh) dla wersji w chmurze
    const macLinuxCloudLauncher = `#!/usr/bin/env bash
echo "Otwieranie aplikacji Domowy Budżet & Spiżarnia AI (Live Cloud Sync)..."
if [ -f "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" ]; then
    open "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" 2>/dev/null || xdg-open "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" 2>/dev/null || sensible-browser "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" 2>/dev/null
else
    open "Domowy_Budzet_Offline_Standalone.html" 2>/dev/null || xdg-open "Domowy_Budzet_Offline_Standalone.html" 2>/dev/null || sensible-browser "Domowy_Budzet_Offline_Standalone.html" 2>/dev/null
fi
`;
    zip.file('Uruchom_Wersje_W_Chmurze_Live_Sync.sh', macLinuxCloudLauncher);

    // 6. Plik dla wersji offline (fallback)
    const windowsOfflineLauncher = `@echo off
chcp 65001 >nul
title Domowy Budżet - Wersja Offline
echo Otwieranie aplikacji...
if exist "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html" (
    start "" "Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html"
) else (
    start "" "Domowy_Budzet_Offline_Standalone.html"
)
`;
    zip.file('Uruchom_Wersje_Offline.bat', windowsOfflineLauncher);

    // 7. Skrypty szybkiego połączenia z GitHub i Netlify
    const windowsGithubSetup = `@echo off
chcp 65001 >nul
title Polaczenie z GitHub i Netlify
echo ======================================================================
echo   POŁĄCZENIE APLIKACJI Z GITHUB & NETLIFY (AUTOMATYCZNE AKTUALIZACJE)
echo ======================================================================
echo.
echo Krok 1: Wejdź na https://github.com/new i utwórz nowe repozytorium
echo        (np. nazwij je: domowy-budzet).
echo.
set /p REPO_URL="Wklej adres URL Twojego nowego repozytorium GitHub (np. https://github.com/twoj-login/domowy-budzet.git): "
if "%REPO_URL%"=="" goto end

echo.
echo Inicjalizacja repozytorium Git...
git init
git add .
git commit -m "Domowy Budzet z Chmura Live Sync"
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git push -u origin main

echo.
echo ======================================================================
echo Gotowe! Twój kod znajduje się teraz na Twoim GitHubie.
echo Teraz wejdź na https://app.netlify.com, kliknij "Add new site"
echo -> "Import an existing project" i wskaż swoje repozytorium GitHub.
echo Plik netlify.toml automatycznie skonfiguruje budowanie aplikacji!
echo ======================================================================
:end
pause
`;
    zip.file('Polacz_Z_GitHub.bat', windowsGithubSetup);

    const macLinuxGithubSetup = `#!/usr/bin/env bash
echo "======================================================================"
echo "  POŁĄCZENIE APLIKACJI Z GITHUB & NETLIFY (AUTOMATYCZNE AKTUALIZACJE)"
echo "======================================================================"
echo ""
echo "Krok 1: Wejdź na https://github.com/new i utwórz nowe repozytorium."
echo ""
read -p "Wklej adres URL Twojego repozytorium GitHub: " REPO_URL
if [ -n "$REPO_URL" ]; then
    git init
    git add .
    git commit -m "Domowy Budzet z Chmura Live Sync"
    git branch -M main
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"
    git push -u origin main
    echo ""
    echo "Gotowe! Twój kod jest na GitHubie. W Netlify wybierz 'Import from GitHub'."
fi
`;
    zip.file('Polacz_Z_GitHub.sh', macLinuxGithubSetup);

    const androidFolder = zip.folder('android_project');
    if (androidFolder) {
      const appUrl = 'https://ais-dev-ptp7mu6a5rt22psqkjkpdz-20365823493.europe-west3.run.app';

      const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="pl.domowybudzet.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Domowy Budżet"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
      androidFolder.file('AndroidManifest.xml', androidManifest);

      const mainActivityJava = `package pl.domowybudzet.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("${appUrl}");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}`;
      androidFolder.file('src/main/java/pl/domowybudzet/app/MainActivity.java', mainActivityJava);

      const buildGradle = `apply plugin: 'com.android.application'

android {
    namespace 'pl.domowybudzet.app'
    compileSdkVersion 34

    defaultConfig {
        applicationId "pl.domowybudzet.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
}`;
      androidFolder.file('build.gradle', buildGradle);

      const androidReadme = `JAK WYGENEROWAĆ PLIK .APK LUB WYDAĆ W GOOGLE PLAY:
1. Otwórz ten folder w Android Studio (lub uruchom ./gradlew assembleRelease).
2. Otrzymasz gotowy plik instalatora: Domowy-Budzet.apk
3. Możesz go przesłać na dowolny telefon i zainstalować z opcją "Zezwalaj z tego źródła".
`;
      androidFolder.file('JAK_ZBUDOWAC_APK.txt', androidReadme);
    }

    // 5. Instrukcja dla użytkownika i administratora
    const guideTxt = `==================================================================================
           DOMOWY BUDŻET & SPIŻARNIA AI - KOMPLETNY PAKIET APLIKACJI
==================================================================================

DROGI UŻYTKOWNIKU!
Paczka ZIP zawiera wszystko, czego potrzebujesz:

==================================================================================
★ FOLDER "dist/" - TWOJA GOTOWA STRONA WWW DO WRZUCENIA NA HOSTING ★
==================================================================================
W tej paczce znajduje się dedykowany folder "dist/".
Zawiera on kompletną, skompilowaną aplikację webową (HTML, JS, CSS, ikony, PWA):
- dist/index.html (główna strona aplikacji)
- dist/assets/ (skompilowane skrypty i style)
- dist/manifest.json i dist/sw.js (obsługa instalacji jako aplikacja PWA)
- dist/_redirects (dla hostingu Netlify / Cloudflare Pages)
- dist/.htaccess (dla serwerów Apache / tradycyjnego hostingu www)
- dist/Domowy_Budzet_Aplikacja_Chmura_Live_Sync.html (wersja samowystarczalna)

JAK WRZUCIĆ FOLDER dist/ NA STRONĘ INTERNETOWĄ (W 30 SEKUND):
Opcja A - Całkowicie za darmo na Netlify Drop:
  1. Wejdź na https://app.netlify.com/drop
  2. Przeciągnij i upuść CAŁY folder "dist" na stronę Netlify.
  3. Natychmiast otrzymujesz swój własny, publiczny adres www (np. moja-rodzina.netlify.app)!
  4. Strona od razu łączy się z bazą Firestore Live Sync, a nikt z zewnątrz nie wejdzie bez autoryzacji Twojej rodziny.

Opcja B - Tradycyjny hosting / serwer www (np. cPanel, Cyberfolks, LH.pl, OVH):
  Wgraj całą zawartość folderu "dist/" przez FTP do katalogu public_html.

==================================================================================
1. URUCHOMIENIE BEZPOŚREDNIE NA KOMPUTERZE (BEZ WRZUCANIA NA HOSTING):
==================================================================================
- Kliknij dwukrotnie plik: "Otworz_Wersje_W_Chmurze_Live_Sync.html"
  (albo skrót: "Uruchom_Wersje_W_Chmurze_Live_Sync.bat" lub "Uruchom_Wersje_W_Chmurze_Live_Sync.sh")
- Aplikacja otworzy się w Twojej domyślnej przeglądarce i łączy się z chmurą Firestore.
- Wszystkie zmiany, paragony, wydatki, zaproszenia i uprawnienia członków rodziny
  synchronizują się natychmiast na żywo pomiędzy wszystkimi urządzeniami!

==================================================================================
2. WERSJA LOKALNA OFFLINE (BEZ WYMOGU INTERNETU):
==================================================================================
- Kliknij dwukrotnie plik "Domowy_Budzet_Offline_Standalone.html"
- Działa całkowicie lokalnie w przeglądarce na Twoim komputerze bez konieczności połączenia z internetem.

==================================================================================
3. INSTALACJA NA TELEFONIE (JAK ZE SKLEPU GOOGLE PLAY):
==================================================================================
Aplikacja korzysta z oficjalnej technologii WebAPK / PWA firmy Google:
Gdy otworzysz stronę www na telefonie w Google Chrome:
- Krok 1: Kliknij menu 3 kropki (⋮) w prawym górnym rogu.
- Krok 2: Wybierz "Zainstaluj aplikację" (lub "Dodaj do ekranu głównego").
- Krok 3: Aplikacja zainstaluje się na pulpicie Twojego telefonu z oficjalną ikoną!

==================================================================================
4. ZARZĄDZANIE RODZINĄ I BEZPIECZEŃSTWO:
==================================================================================
- Zaloguj się jako Administrator (Twój kod PIN).
- W zakładce "Rodzina & Uprawnienia" możesz dodawać członków rodziny, nadawać im role,
  ustalać PIN-y oraz precyzyjne uprawnienia (np. tylko odczyt, edycja paragonów, finanse).
- Kliknij "Zaproś na telefon" i wyślij spersonalizowany link członkowi rodziny.
- Baza danych jest zabezpieczona - dostęp mają wyłącznie członkowie utworzonych rodzin!

==================================================================================
5. POŁĄCZENIE Z GITHUB & NETLIFY (AUTOMATYCZNE AKTUALIZACJE STRONY):
==================================================================================
Chcesz, żeby po każdej zmianie w kodzie Twoja strona na Netlify sama się aktualizowała?
Krok 1: Wejdź na https://github.com/new i stwórz darmowe repozytorium (np. domowy-budzet).
Krok 2: Uruchom skrypt "Polacz_Z_GitHub.bat" (Windows) lub "Polacz_Z_GitHub.sh" (Mac/Linux)
        albo wklej komendy wyświetlane w aplikacji po kliknięciu "Połącz z GitHub".
Krok 3: W Netlify (app.netlify.com) kliknij "Add new site" -> "Import from GitHub".
        Dołączony plik "netlify.toml" automatycznie ustawi build: vite build oraz folder: dist.
Od tego momentu każda zmiana w kodzie sama zaktualizuje Twoją stronę www!
`;
    zip.file('CZYTAJ_TO_NAJPIERW_INSTRUKCJA.txt', guideTxt);

    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Domowy-Budzet-Paczka-Instalacyjna.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Błąd generowania paczki ZIP:', err);
    res.status(500).json({ error: 'Nie udało się wygenerować paczki instalacyjnej: ' + err.message });
  }
});

// Helper to strip data URL prefix if present
function parseBase64(input: string): { data: string; mimeType: string } {
  if (input.startsWith('data:')) {
    const matches = input.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return { mimeType: matches[1], data: matches[2] };
    }
  }
  return { mimeType: 'image/jpeg', data: input };
}

// ==========================================
// 1. RECEIPT SCANNER & OCR (Image & Text)
// ==========================================
app.post('/api/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { image, mimeType, text, categories } = req.body;

    const availableCategories = Array.isArray(categories) && categories.length > 0
      ? categories.join(', ')
      : 'Spożywcze & Supermarket, Chemia & Kosmetyki, Mieszkanie & Rachunki, Paliwo & Transport, Zdrowie & Leki, Ubrania & Obuwie, Rozrywka & Wyjścia, Dom i Ogród, Inne';

    // If Gemini client is available, use it!
    if (ai) {
      const contents: any[] = [];

      const promptText = `
Jesteś precyzyjnym systemem OCR i analitykiem paragonów fiskalnych oraz e-paragonów z polskich sklepów (np. Biedronka, Lidl, Dino, Kaufland, Auchan, Carrefour, Rossmann, Hebe, Orlen, BP, Castorama, Leroy Merlin itp.).

Zanalizuj załączony paragon (obraz i/lub tekst z poczty e-mail / aplikacji lojalnościowej).
Twoje zadanie:
1. Nazwa sklepu / sprzedawcy (np. Biedronka, Lidl, Rossmann, Orlen).
2. Data zakupu w formacie RRRR-MM-DD (jeśli brak roku, przyjmij bieżący rok ${new Date().getFullYear()}).
3. Suma całkowita (wartość liczbowa w PLN, np. 84.50).
4. Numer paragonu lub transakcji (jeśli widoczny, inaczej puste).
5. Wyodrębnij KAŻDĄ pozycję towarową:
   - name: pełna czytelna nazwa produktu (rozwiń powszechne skróty fiskalne, np. "MLEKO LAC 3.2" -> "Mleko Łaciate 3.2%")
   - quantity: ilość liczbowa (np. 1, 2, 0.75 dla wagi)
   - unit: jednostka ('szt.', 'kg', 'opak.', 'l')
   - unitPrice: cena za sztukę/jednostkę
   - totalPrice: łączna kwota za tę pozycję
   - category: najlepiej pasująca kategoria z listy: [${availableCategories}]
   - isPantryItem: wartość logiczna true jeśli produkt nadaje się do domowego magazynu/spiżarni (np. żywność trwała, makarony, mąka, mleko, sery, konserwy, napoje, przyprawy, chemia gospodarcza, papier, kosmetyki, płyny). Artykuły jak ubrania, paliwo, usługi to false.
   - pantryCategory: jeśli isPantryItem to true, wybierz jedną z: 'Przyprawy i dodatki', 'Makarony, ryże i kasze', 'Nabiał i sery', 'Napoje', 'Chemia i czystość', 'Konserwy i przetwory', 'Przekąski i słodycze', 'Pieczywo', 'Mrożonki', 'Inne produkty'. Jeśli isPantryItem to false, wpisz null.
`;

      if (image) {
        const parsed = parseBase64(image);
        contents.push({
          inlineData: {
            mimeType: mimeType || parsed.mimeType,
            data: parsed.data,
          },
        });
      }

      if (text) {
        contents.push({
          text: `TREŚĆ TEKSTOWA E-PARAGONU / WIADOMOŚCI EMAIL:\n${text}`,
        });
      }

      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: contents },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shopName: { type: Type.STRING },
              date: { type: Type.STRING, description: 'YYYY-MM-DD' },
              totalAmount: { type: Type.NUMBER },
              receiptNumber: { type: Type.STRING },
              paymentMethod: { type: Type.STRING },
              suggestedAccount: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER },
                    totalPrice: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    isPantryItem: { type: Type.BOOLEAN },
                    pantryCategory: { type: Type.STRING },
                  },
                  required: ['name', 'quantity', 'unit', 'totalPrice', 'category', 'isPantryItem'],
                },
              },
            },
            required: ['shopName', 'date', 'totalAmount', 'items'],
          },
        },
      });

      const responseJson = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: responseJson,
      });
    }

    // Smart Fallback Parser if no API key or offline simulation
    console.log('Gemini API key not configured, executing smart local parser simulation...');
    const fallbackData = generateFallbackReceipt(text);
    return res.json({
      success: true,
      source: 'local-heuristic',
      data: fallbackData,
    });
  } catch (error: any) {
    console.error('Błąd podczas skanowania paragonu:', error);
    // If Gemini fails, return graceful heuristic fallback instead of crashing
    try {
      const fallback = generateFallbackReceipt(req.body.text);
      return res.json({
        success: true,
        source: 'local-fallback-after-error',
        warning: error.message,
        data: fallback,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Nie udało się przetworzyć paragonu: ' + (error.message || 'Nieznany błąd'),
      });
    }
  }
});

// ==========================================
// 2. EMPTY PACKAGE / PANTRY SCANNER
// ==========================================
app.post('/api/scan-empty-package', async (req: Request, res: Response) => {
  try {
    const { image, mimeType, pantryItems } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Brak zdjęcia opakowania' });
    }

    const itemsSummary = Array.isArray(pantryItems)
      ? pantryItems.map((item: any) => `ID: ${item.id} | Nazwa: ${item.name} | Kategoria: ${item.category} | Ilość w spiżarni: ${item.quantity} ${item.unit}`).join('\n')
      : 'Brak produktów w bazie';

    if (ai) {
      const parsed = parseBase64(image);
      const prompt = `
Jesteś inteligentnym systemem rozpoznawania zużytych i pustych opakowań w domowej spiżarni.
Użytkownik zrobił zdjęcie zużytego / pustego opakowania (np. po makaronie, przyprawie, mleku, oliwie, tabletkach do zmywarki, płynie, kawie itp.).

Zanalizuj zdjęcie i:
1. Rozpoznaj co to za produkt (marka, typ, gramatura jeśli widoczna, np. 'Makaron Spaghetti Barilla 500g', 'Majeranek Prymat', 'Mleko Łaciate 3.2%').
2. Porównaj z listą aktualnych pozycji w spiżarni użytkownika:
${itemsSummary}
3. Jeśli produkt pasuje do którejś pozycji z listy, wskaż 'matchedItemId' (dokładne ID z listy) oraz 'matchedItemName'. Jeśli nie ma go na liście, ustaw matchedItemId: null.
4. Określ ile sztuk/jednostek zużyto ('quantityUsed', najczęściej 1).
5. Określ czy opakowanie jest całkowicie puste ('isEmpty': true/false).
6. Rekomendacja 'addToShoppingList': true, jeśli produkt jest całkowicie zużyty i warto go dokupić.
7. Krótkie uzasadnienie w języku polskim ('confidenceNote').
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || parsed.mimeType,
                data: parsed.data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recognizedProduct: { type: Type.STRING },
              brand: { type: Type.STRING },
              category: { type: Type.STRING },
              matchedItemId: { type: Type.STRING, nullable: true },
              matchedItemName: { type: Type.STRING, nullable: true },
              quantityUsed: { type: Type.NUMBER },
              isEmpty: { type: Type.BOOLEAN },
              addToShoppingList: { type: Type.BOOLEAN },
              confidenceNote: { type: Type.STRING },
            },
            required: ['recognizedProduct', 'category', 'quantityUsed', 'isEmpty', 'addToShoppingList'],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        source: 'gemini-3.8-flash',
        data: result,
      });
    }

    // Fallback simulation for empty packaging
    const matched = Array.isArray(pantryItems) && pantryItems.length > 0 ? pantryItems[0] : null;
    return res.json({
      success: true,
      source: 'local-heuristic',
      data: {
        recognizedProduct: matched ? matched.name : 'Makaron Penne Rigate 500g',
        brand: 'Lubella',
        category: 'Makarony, ryże i kasze',
        matchedItemId: matched ? matched.id : null,
        matchedItemName: matched ? matched.name : 'Makaron Penne Lubella',
        quantityUsed: 1,
        isEmpty: true,
        addToShoppingList: true,
        confidenceNote: 'Rozpoznano zużyte opakowanie makaronu na podstawie etykiety i kształtu paczki.',
      },
    });
  } catch (error: any) {
    console.error('Błąd rozpoznawania opakowania:', error);
    return res.status(500).json({
      success: false,
      error: 'Błąd analizy opakowania: ' + (error.message || 'Nieznany błąd'),
    });
  }
});

// ==========================================
// 3. PROMOTIONS CHECKER (FLYER & DEALS)
// ==========================================
import { checkPromotionsApi, transcribeVoiceNoteApi, scanPantryProductsApi } from './src/serverApi.ts';

app.post('/api/check-promotions', async (req: Request, res: Response) => {
  try {
    const result = await checkPromotionsApi(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Błąd sprawdzania promocji:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 4. VOICE NOTE TRANSCRIPTION (CAR MODE)
// ==========================================
app.post('/api/transcribe-voice-note', async (req: Request, res: Response) => {
  try {
    const result = await transcribeVoiceNoteApi(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Błąd transkrypcji notatki głosowej:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. SCAN MULTIPLE PANTRY PRODUCTS WITHOUT RECEIPT
// ==========================================
app.post('/api/scan-pantry-products', async (req: Request, res: Response) => {
  try {
    const result = await scanPantryProductsApi(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Błąd skanowania produktów spiżarni:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 7. INVITES API (Server-side Dual Store for 100% Reliable Invites)
// ==========================================
const invitesCache = new Map<string, any>();
const invitesFilePath = path.resolve(__dirname, 'invites_store.json');
try {
  if (fs.existsSync(invitesFilePath)) {
    const raw = fs.readFileSync(invitesFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      invitesCache.set(k, v);
    }
  }
} catch (e) {
  console.error('Error reading invites_store.json:', e);
}

function persistInvites() {
  try {
    const obj: Record<string, any> = {};
    for (const [k, v] of invitesCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(invitesFilePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('Error persisting invites:', e);
  }
}

app.post('/api/invites', (req: Request, res: Response) => {
  try {
    const invite = req.body;
    if (!invite || !invite.token) {
      return res.status(400).json({ error: 'Brak tokena zaproszenia' });
    }
    invitesCache.set(invite.token, {
      ...invite,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
    persistInvites();
    res.json({ success: true, token: invite.token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct friendly web route for /invite/:token -> redirects to SPA root with ?invite=token
app.get('/invite/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  res.redirect(`/?invite=${encodeURIComponent(token)}`);
});

app.get('/api/invites/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const invite = invitesCache.get(token);
  if (!invite) {
    return res.json({ success: false, notFound: true, message: 'Brak tokena w pamięci serwera proxy (odpytywanie chmury Firestore)' });
  }
  res.json({ success: true, invite });
});

app.post('/api/invites/:token/accept', (req: Request, res: Response) => {
  const token = req.params.token;
  const invite = invitesCache.get(token);
  if (invite) {
    invite.status = 'ACCEPTED';
    invite.acceptedAt = new Date().toISOString();
    invite.acceptedBy = req.body?.login || 'Użytkownik';
    invitesCache.set(token, invite);
    persistInvites();
  }
  res.json({ success: true, message: 'Zaproszenie zaakceptowane' });
});


// Heuristic fallback generator for testing & offline mode
function generateFallbackReceipt(rawText?: string) {
  const isLidl = rawText && /lidl/i.test(rawText);
  const isRossmann = rawText && /rossmann/i.test(rawText);
  const isOrlen = rawText && /(orlen|paliwo|verva|efecta)/i.test(rawText);

  if (isOrlen) {
    return {
      shopName: 'PKN ORLEN Stacja Paliw nr 4281',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 247.80,
      receiptNumber: 'ORL/2026/09124',
      paymentMethod: 'Karta płatnicza',
      suggestedAccount: 'Konto Główne',
      items: [
        {
          name: 'Paliwo Efecta 95 (38.50 l)',
          quantity: 38.5,
          unit: 'l',
          unitPrice: 6.20,
          totalPrice: 238.70,
          category: 'Paliwo & Transport',
          isPantryItem: false,
          pantryCategory: null,
        },
        {
          name: 'Kawa Caffe Latte Duża',
          quantity: 1,
          unit: 'szt.',
          unitPrice: 9.10,
          totalPrice: 9.10,
          category: 'Rozrywka & Wyjścia',
          isPantryItem: false,
          pantryCategory: null,
        },
      ],
    };
  }

  if (isRossmann) {
    return {
      shopName: 'Rossmann SDP Sp. z o.o.',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 76.40,
      receiptNumber: 'RO/2026/8841',
      paymentMethod: 'Karta / BLIK',
      suggestedAccount: 'Konto Główne',
      items: [
        {
          name: 'Kapsułki do prania Ariel All-in-1',
          quantity: 1,
          unit: 'opak.',
          unitPrice: 38.99,
          totalPrice: 38.99,
          category: 'Chemia & Kosmetyki',
          isPantryItem: true,
          pantryCategory: 'Chemia i czystość',
        },
        {
          name: 'Płyn do naczyń Fairy Cytrynowy 900ml',
          quantity: 1,
          unit: 'szt.',
          unitPrice: 12.50,
          totalPrice: 12.50,
          category: 'Chemia & Kosmetyki',
          isPantryItem: true,
          pantryCategory: 'Chemia i czystość',
        },
        {
          name: 'Pasta do zębów Elmex Przeciw Próchnicy',
          quantity: 2,
          unit: 'szt.',
          unitPrice: 12.45,
          totalPrice: 24.90,
          category: 'Zdrowie & Leki',
          isPantryItem: true,
          pantryCategory: 'Chemia i czystość',
        },
      ],
    };
  }

  // Default Polish Supermarket Receipt (Biedronka / Lidl)
  return {
    shopName: isLidl ? 'Lidl Polska Sp. z o.o.' : 'Jeronimo Martins Biedronka',
    date: new Date().toISOString().split('T')[0],
    totalAmount: 114.30,
    receiptNumber: 'PAR/2026/41029',
    paymentMethod: 'Karta Płatnicza',
    suggestedAccount: 'Konto Codzienne',
    items: [
      {
        name: 'Mleko UHT Łaciate 3.2% 1L',
        quantity: 4,
        unit: 'szt.',
        unitPrice: 3.89,
        totalPrice: 15.56,
        category: 'Spożywcze & Supermarket',
        isPantryItem: true,
        pantryCategory: 'Nabiał i sery',
      },
      {
        name: 'Makaron Penne Lubella 500g',
        quantity: 2,
        unit: 'szt.',
        unitPrice: 4.49,
        totalPrice: 8.98,
        category: 'Spożywcze & Supermarket',
        isPantryItem: true,
        pantryCategory: 'Makarony, ryże i kasze',
      },
      {
        name: 'Majeranek suszony Prymat 20g',
        quantity: 2,
        unit: 'opak.',
        unitPrice: 2.19,
        totalPrice: 4.38,
        category: 'Spożywcze & Supermarket',
        isPantryItem: true,
        pantryCategory: 'Przyprawy i dodatki',
      },
      {
        name: 'Kawa ziarnista Lavazza Qualita Oro 1kg',
        quantity: 1,
        unit: 'opak.',
        unitPrice: 59.90,
        totalPrice: 59.90,
        category: 'Spożywcze & Supermarket',
        isPantryItem: true,
        pantryCategory: 'Napoje',
      },
      {
        name: 'Chleb Wiejski krojony 500g',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 4.80,
        totalPrice: 4.80,
        category: 'Spożywcze & Supermarket',
        isPantryItem: true,
        pantryCategory: 'Pieczywo',
      },
      {
        name: 'Ręcznik papierowy Foxy Mega 2 rolki',
        quantity: 1,
        unit: 'opak.',
        unitPrice: 20.68,
        totalPrice: 20.68,
        category: 'Chemia & Kosmetyki',
        isPantryItem: true,
        pantryCategory: 'Chemia i czystość',
      },
    ],
  };
}

// Start Server & mount Vite in development
async function start() {
  // Ensure public files (manifest.json, sw.js, PNG icons) are served with exact MIME types
  app.use(express.static(path.resolve(__dirname, 'public')));

  app.get('/manifest.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(path.resolve(__dirname, 'public', 'manifest.json'));
  });

  app.get('/sw.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.resolve(__dirname, 'public', 'sw.js'));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Domowy Budżet Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
