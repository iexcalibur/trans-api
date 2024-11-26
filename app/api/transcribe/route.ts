import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { headers } from 'next/headers';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Define error types
interface OpenAIError {
  message: string;
  status?: number;
  response?: {
    data: unknown;
  };
  code?: string;
}

interface ProcessError {
  message: string;
  stack?: string;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured', success: false },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;

      if (!audioFile) {
        console.error('No audio file in request');
        return NextResponse.json(
          { error: 'No audio file provided', success: false },
          { status: 400 }
        );
      }

      console.log('Received audio file:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });

      if (audioFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Audio file size exceeds 10MB limit', success: false },
          { status: 400 }
        );
      }

      // Convert to Buffer
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create a temporary file
      const tempDir = '/tmp';
      const fileName = `audio-${Date.now()}.webm`;
      const filePath = join(tempDir, fileName);

      try {
        // Write the buffer to a temporary file
        await writeFile(filePath, buffer);
        console.log('Temporary file created:', filePath);

        // Send to OpenAI
        const transcription = await openai.audio.transcriptions.create({
          file: await import('fs').then(fs => fs.createReadStream(filePath)),
          model: 'whisper-1',
          response_format: 'json',
          language: 'en'
        });

        console.log('Transcription successful');

        return NextResponse.json({
          text: transcription.text,
          success: true
        });

      } finally {
        // Clean up
        try {
          await import('fs').then(fs => fs.promises.unlink(filePath));
        } catch (e) {
          console.error('Error cleaning up temp file:', e);
        }
      }

    } catch (openaiError) {
      const error = openaiError as OpenAIError;
      console.error('OpenAI API error:', {
        message: error.message,
        status: error.status,
        response: error.response,
        code: error.code
      });

      return NextResponse.json({
        error: 'OpenAI API error',
        details: error.message,
        success: false
      }, { status: error.status || 500 });
    }
  } catch (error) {
    const processError = error as ProcessError;
    console.error('General error:', {
      message: processError.message,
      stack: processError.stack
    });

    return NextResponse.json({
      error: 'Error processing audio file',
      details: processError.message,
      success: false
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  const allowedOrigins = [
    'http://localhost:4200',
    'https://adaratranslate.com'
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
