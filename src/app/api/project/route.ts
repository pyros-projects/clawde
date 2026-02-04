// API route — only active in SSR mode (not static export)
// GH Pages deploy uses STATIC_EXPORT=true which excludes API routes

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getAdapterManager } = await import('@/lib/adapter-manager');
    const manager = getAdapterManager();
    let state = manager.getState();
    
    if (!state) {
      state = await manager.init();
      await manager.startWatching();
    }

    return NextResponse.json({
      project: state.project,
      agents: state.agents,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to discover project', details: String(error) },
      { status: 500 }
    );
  }
}
