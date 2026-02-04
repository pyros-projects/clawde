#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const BASE_URL = 'https://clawde-three.vercel.app';
const OUTPUT_DIR = '/tmp/clawde/docs/demo';

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 }
    }
  });
  
  const page = await context.newPage();
  
  console.log('Recording demo walkthrough...');
  
  // Initial load - Mission Control
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('  Mission Control loaded');
  
  // Navigate to Task Graph - THE HEART of ClawDE
  await page.click('nav >> text=Task Graph');
  await page.waitForTimeout(2500);
  console.log('  Task Graph');
  
  // Navigate to Review Queue
  await page.click('nav >> text=Review Queue');
  await page.waitForTimeout(2000);
  console.log('  Review Queue');
  
  // Navigate to Spec Studio
  await page.click('nav >> text=Spec Studio');
  await page.waitForTimeout(2000);
  console.log('  Spec Studio');
  
  // Back to Mission Control for chat demo
  await page.click('nav >> text=Mission Control');
  await page.waitForTimeout(1500);
  console.log('  Back to Mission Control');
  
  // Open Chat panel (the new v1 feature!)
  await page.click('button:has-text("Chat")');
  await page.waitForTimeout(1500);
  console.log('  Chat panel opened');
  
  // Type /status to show autocomplete
  const chatInput = page.locator('input[placeholder*="message"], input[placeholder*="command"], textarea').first();
  await chatInput.fill('/sta');
  await page.waitForTimeout(1500);
  console.log('  Showing autocomplete');
  
  // Complete the command
  await chatInput.fill('/status');
  await page.waitForTimeout(1000);
  
  // Press Enter to execute (shows the command in action)
  await chatInput.press('Enter');
  await page.waitForTimeout(2500);
  console.log('  Executed /status');
  
  // Show another command - /help
  await chatInput.fill('/help');
  await page.waitForTimeout(800);
  await chatInput.press('Enter');
  await page.waitForTimeout(2000);
  console.log('  Executed /help');
  
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
    
    console.log(`\nConverting to HQ formats...`);
    
    // High-quality MP4
    execSync(`ffmpeg -y -i "${videoPath}" -c:v libx264 -preset slow -crf 18 -an "${mp4Path}"`, { stdio: 'inherit' });
    
    // High-quality GIF (larger but crisp)
    execSync(`ffmpeg -y -i "${videoPath}" -vf "fps=12,scale=1080:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=floyd_steinberg:diff_mode=rectangle" "${gifPath}"`, { stdio: 'inherit' });
    
    console.log(`\nDemo captured:`);
    console.log(`  MP4: ${mp4Path}`);
    console.log(`  GIF: ${gifPath}`);
  }
}

main().catch(console.error);
