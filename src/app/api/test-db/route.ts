import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';

export async function GET() {
  try {
    const conn = await connectDB();
    
    if (!conn.connection.db) {
      throw new Error('Database connection not established');
    }
    
    // Test the connection by getting server status
    const status = await conn.connection.db.admin().serverStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      status: {
        version: status.version,
        uptime: status.uptime,
        connections: status.connections,
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 