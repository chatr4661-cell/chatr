/**
 * Puppeteer Screenshot Generation Script
 * Generates demo screenshots for Grab & Browse features
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:8080';

async function generateScreenshots() {
  console.log('🚀 Starting screenshot generation...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Screenshot 1: Launcher with Gestures tile
    console.log('📸 Capturing: Launcher Home');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="quick-access"]', { timeout: 5000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-launcher-home.png'),
      fullPage: false
    });

    // Screenshot 2: Grab & Browse main page
    console.log('📸 Capturing: Grab & Browse Main');
    await page.goto(`${BASE_URL}/grab-browse`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-grab-browse-main.png'),
      fullPage: false
    });

    // Screenshot 3: Gesture overlay active
    console.log('📸 Capturing: Gesture Overlay');
    const gestureButton = await page.$('button:has-text("Gesture Screenshot")');
    if (gestureButton) {
      await gestureButton.click();
      await page.waitForTimeout(2000); // Wait for camera init
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03-gesture-overlay-active.png'),
        fullPage: false
      });
    }

    // Screenshot 4: Transfer UI
    console.log('📸 Capturing: Transfer UI');
    // Simulate screenshot capture (would need mock data)
    await page.evaluate(() => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const event = new CustomEvent('screenshot-captured', { detail: { blob: mockBlob } });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-transfer-ui.png'),
      fullPage: false
    });

    // Screenshot 5: AI Browser with results
    console.log('📸 Capturing: AI Browser');
    await page.goto(`${BASE_URL}/grab-browse`, { waitUntil: 'networkidle2' });
    const browserButton = await page.$('button:has-text("AI Browser")');
    if (browserButton) {
      await browserButton.click();
      await page.waitForTimeout(1000);
      
      // Fill search
      const searchInput = await page.$('input[placeholder*="Ask anything"]');
      if (searchInput) {
        await searchInput.type('How does quantum computing work?');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000); // Wait for results
        
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, '05-ai-browser-results.png'),
          fullPage: true
        });
      }
    }

    console.log('✅ Screenshot generation complete!');
    console.log(`📁 Saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Screenshot generation failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateScreenshots().catch(console.error);
}

export { generateScreenshots };
