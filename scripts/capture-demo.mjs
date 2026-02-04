#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const BASE_URL = 'https://clawde-three.vercel.app';
const OUTPUT_DIR = '/tmp/clawde/docs/demo';

const SCREENS = [
  { selector: 'text=Mission Control', name: 'Mission Control', wait: 2000 },
  { selector: 'text=Task Graph', name: 'Task Graph', wait: 2500 },
  { selector: 'text=Review Queue', name: 'Review Queue', wait: 2500 },
  { selector: 'text=Spec Studio', name: 'Spec Studio', wait: 2000 },
  { selector: 'text=Agents', name: 'Agents', wait: 2000 },
];

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1280, height: 720 }
    }
  });
  
  const page = await context.newPage();
  
  console.log('Recording demo walkthrough...');
  
  // Initial load
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  
  for (const screen of SCREENS) {
    console.log(`  Navigating to ${screen.name}...`);
    await page.click(`nav >> ${screen.selector}`);
    await page.waitForTimeout(screen.wait);
  }
  
  // Close page to finalize video
  await page.close();
  await context.close();
  await browser.close();
  
  // Find the recorded video
  const fs = await import('fs');
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const videoPath = join(OUTPUT_DIR, files[files.length - 1]);
    const mp4Path = join(OUTPUT_DIR, 'clawde-demo.mp4');
    const gifPath = join(OUTPUT_DIR, 'clawde-demo.gif');
    
    console.log(`\nConverting ${videoPath} to MP4 and GIF...`);
    
    // Convert to MP4
    execSync(`ffmpeg -y -i "${videoPath}" -c:v libx264 -preset slow -crf 22 -an "${mp4Path}"`, { stdio: 'inherit' });
    
    // Convert to palette-optimized GIF (smaller, better colors)
    const palettePath = join(OUTPUT_DIR, 'palette.png');
    execSync(`ffmpeg -y -i "${videoPath}" -vf "fps=8,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gifPath}"`, { stdio: 'inherit' });
    
    console.log(`\nDemo captured:`);
    console.log(`  MP4: ${mp4Path}`);
    console.log(`  GIF: ${gifPath}`);
  }
}

main().catch(console.error);
