#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://clawde-three.vercel.app';
const OUTPUT_DIR = '/tmp/clawde/docs/screenshots';

const SCREENS = [
  { selector: 'text=Mission Control', name: '01-mission-control', title: 'Mission Control' },
  { selector: 'text=Task Graph', name: '02-task-graph', title: 'Task Graph' },
  { selector: 'text=Spec Studio', name: '03-spec-studio', title: 'Spec Studio' },
  { selector: 'text=Review Queue', name: '04-review-queue', title: 'Review Queue' },
  { selector: 'text=Agents', name: '05-agents', title: 'Agents' },
];

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  
  const page = await context.newPage();
  
  // Initial load
  console.log('Loading ClawDE...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  // Capture each screen
  for (const screen of SCREENS) {
    console.log(`Capturing ${screen.title}...`);
    await page.click(`nav >> ${screen.selector}`);
    await page.waitForTimeout(1000);
    
    const path = join(OUTPUT_DIR, `${screen.name}.png`);
    await page.screenshot({ path, type: 'png' });
    console.log(`  -> ${path}`);
  }
  
  // Now capture chat panel open on Mission Control
  console.log('Capturing Chat Panel...');
  await page.click('nav >> text=Mission Control');
  await page.waitForTimeout(500);
  
  // Open chat with Cmd+J or click the chat button
  await page.click('button:has-text("Chat")');
  await page.waitForTimeout(800);
  
  // Type a command to show autocomplete
  const chatInput = page.locator('input[placeholder*="message"], input[placeholder*="command"], textarea');
  if (await chatInput.count() > 0) {
    await chatInput.first().fill('/');
    await page.waitForTimeout(500);
  }
  
  const chatPath = join(OUTPUT_DIR, '06-chat-panel.png');
  await page.screenshot({ path: chatPath, type: 'png' });
  console.log(`  -> ${chatPath}`);
  
  // Also capture with a typed command showing autocomplete
  if (await chatInput.count() > 0) {
    await chatInput.first().fill('/sta');
    await page.waitForTimeout(500);
  }
  
  const autocompletePath = join(OUTPUT_DIR, '07-chat-autocomplete.png');
  await page.screenshot({ path: autocompletePath, type: 'png' });
  console.log(`  -> ${autocompletePath}`);
  
  await browser.close();
  console.log('\nAll screenshots captured!');
}

main().catch(console.error);
