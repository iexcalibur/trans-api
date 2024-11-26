import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, Fields } from 'formidable';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import path from 'path';

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

export const config = {
  api: {
    bodyParser: false,
  },
};

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Request received:', req.method);
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const tmpDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    console.log('Temp directory created:', tmpDir);

    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024,
      uploadDir: tmpDir,
      multiples: false,
    });

    console.log('Parsing form data...');
    const [, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          reject(err);
        }
        console.log('Form parsed successfully:', { files });
        resolve([fields, files]);
      });
    });

    const audioFiles = files.audio;
    if (!audioFiles) {
      console.error('No audio file found in request');
      return res.status(400).json({ 
        error: 'No audio file uploaded',
        success: false 
      });
    }

    const audioFile = Array.isArray(audioFiles) ? audioFiles[0] : audioFiles;
    if (!audioFile || !audioFile.filepath) {
      console.error('Invalid audio file structure:', audioFile);
      return res.status(400).json({ 
        error: 'Invalid audio file',
        success: false 
      });
    }

    console.log('Audio file details:', {
      size: audioFile.size,
      type: audioFile.mimetype,
      name: audioFile.originalFilename,
      path: audioFile.filepath
    });

    try {
      console.log('Starting OpenAI transcription...');
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioFile.filepath),
        model: 'whisper-1',
        response_format: 'json',
        language: 'en'
      });

      console.log('Transcription successful:', transcription);

      // Clean up
      await fs.unlink(audioFile.filepath).catch((err: Error) => {
        console.error('Error deleting temp file:', err);
      });

      return res.status(200).json({ 
        text: transcription.text,
        success: true 
      });
    } catch (openaiError) {
      const error = openaiError as OpenAIError;
      console.error('OpenAI API error:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      return res.status(500).json({ 
        error: 'OpenAI API error',
        details: error.message,
        response: error.response?.data,
        success: false
      });
    }
  } catch (error) {
    const processError = error as ProcessError;
    console.error('General error:', {
      message: processError.message,
      stack: processError.stack
    });
    return res.status(500).json({ 
      error: 'Error processing audio file',
      details: processError.message,
      stack: process.env.NODE_ENV === 'development' ? processError.stack : undefined,
      success: false
    });
  }
} 