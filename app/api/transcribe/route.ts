import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { headers } from 'next/headers';

// Define error types
interface OpenAIError {
  message: string;
  status?: number;
  response?: {
    data: unknown;
  };
}

interface ProcessError {
  message: string;
  stack?: string;
}

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

    // Get form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided', success: false },
        { status: 400 }
      );
    }

    try {
      // Send directly to OpenAI without saving to disk
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile, // Send the File object directly
        model: 'whisper-1',
        response_format: 'json',
        language: 'en'
      });

      return NextResponse.json({
        text: transcription.text,
        success: true
      });
    } catch (openaiError) {
      const error = openaiError as OpenAIError;
      console.error('OpenAI API error:', error);
      return NextResponse.json({
        error: 'OpenAI API error',
        details: error.message,
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    const processError = error as ProcessError;
    console.error('General error:', processError);
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
    'https://adaratranslate.com',
    'https://your-angular-app.com'
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