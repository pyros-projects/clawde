import { NextResponse } from 'next/server';
import { getAdapterManager } from '@/lib/adapter-manager';

export async function GET() {
  try {
    const manager = getAdapterManager();
    let state = manager.getState();

    if (!state) {
      state = await manager.init();
    }

    return NextResponse.json({ tasks: state.tasks });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load tasks', details: String(error) },
      { status: 500 }
    );
  }
}
