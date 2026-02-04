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
    deviceScaleFactor: 2, // HiDPI for crisp images
  });
  
  const page = await context.newPage();
  
  // Initial load
  console.log('Loading ClawDE...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  for (const screen of SCREENS) {
    console.log(`Capturing ${screen.title}...`);
    
    // Click sidebar nav item
    await page.click(`nav >> ${screen.selector}`);
    await page.waitForTimeout(1000); // Let animation settle
    
    const path = join(OUTPUT_DIR, `${screen.name}.png`);
    await page.screenshot({ path, type: 'png' });
    console.log(`  -> ${path}`);
  }
  
  await browser.close();
  console.log('\nAll screenshots captured!');
}

main().catch(console.error);
