import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

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

    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as Blob;

      if (!audioFile) {
        console.error('No audio file in request');
        return NextResponse.json(
          { error: 'No audio file provided', success: false },
          { status: 400 }
        );
      }

      console.log('Received audio file:', {
        size: audioFile.size,
        type: audioFile.type
      });

      if (audioFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Audio file size exceeds 10MB limit', success: false },
          { status: 400 }
        );
      }

      // Prepare form data for OpenAI API
      const formDataForApi = new FormData();
      formDataForApi.append('file', audioFile, 'audio.webm');
      formDataForApi.append('model', 'whisper-1');
      formDataForApi.append('response_format', 'verbose_json');

      // Make direct API call to OpenAI
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formDataForApi,
      });

      if (!transcriptionResponse.ok) {
        const errorData = await transcriptionResponse.json();
        console.error('Transcription API Error:', errorData);
        throw new Error(`Transcription API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const transcriptionData = await transcriptionResponse.json();
      console.log('Transcription data:', transcriptionData);

      return NextResponse.json({
        text: transcriptionData.text,
        language: transcriptionData.language,
        success: true
      });

    } catch (error: any) {
      console.error('OpenAI API error:', {
        message: error.message,
        status: error.status,
        response: error.response
      });

      return NextResponse.json({
        error: 'OpenAI API error',
        details: error.message,
        success: false
      }, { status: error.status || 500 });
    }
  } catch (error: any) {
    console.error('General error:', {
      message: error.message,
      stack: error.stack
    });

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
    'https://adaratranslate.com'
  ];

  const headersList = headers();
  const origin = (await headersList).get('origin') || '';
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
