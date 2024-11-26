import { NextRequest, NextResponse } from 'next/server';
import { IncomingForm, Files } from 'formidable';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured', success: false },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create temp directory
    const tmpDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    // Get form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', success: false },
        { status: 400 }
      );
    }

    // Create a temporary file path
    const filePath = path.join(tmpDir, `upload-${Date.now()}.webm`);
    
    // Write the file to disk
    const bytes = await audioFile.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    try {
      // Transcribe the audio
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-1',
        response_format: 'json',
        language: 'en'
      });

      // Clean up
      await fs.unlink(filePath).catch(console.error);

      return NextResponse.json({
        text: transcription.text,
        success: true
      });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json({
        error: 'OpenAI API error',
        details: openaiError.message,
        success: false
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('General error:', error);
    return NextResponse.json({
      error: 'Error processing audio file',
      details: error.message,
      success: false
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  const allowedOrigins = [
    'http://localhost:4200',
    'https://adaratranslate.com',  // Replace with your production domain
    'https://your-angular-app.com' // Add any other domains you need
  ];

  const headersList = await headers();
  const origin = headersList.get('origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : '*';

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}