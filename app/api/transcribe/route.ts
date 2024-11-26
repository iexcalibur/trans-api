import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { headers } from 'next/headers';

// Define error types
interface OpenAIError {
  message: string;
  status?: number;
  response?: {
    data: unknown;
    status?: number;
  };
}

interface ProcessError {
  message: string;
  stack?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key missing');
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
      console.error('No audio file in request');
      return NextResponse.json(
        { error: 'No audio file provided', success: false },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit for Whisper API)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file size exceeds 10MB limit', success: false },
        { status: 400 }
      );
    }

    // Convert and process file
    const audioBytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(audioBytes);
    
    // Create a File object that OpenAI can process
    const file = new File([buffer], 'audio.webm', { 
      type: audioFile.type || 'audio/webm'
    });

    console.log('Processing file:', {
      size: file.size,
      type: file.type,
      name: file.name
    });

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'json',
        language: 'en'
      });

      console.log('Transcription successful');
      return NextResponse.json({
        text: transcription.text,
        success: true
      });

    } catch (openaiError) {
      const error = openaiError as OpenAIError;
      console.error('OpenAI API error:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      // Handle specific OpenAI error cases
      if (error.status === 413) {
        return NextResponse.json({
          error: 'File too large for processing',
          success: false
        }, { status: 413 });
      }

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