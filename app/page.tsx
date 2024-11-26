'use client';
import React, { useState } from 'react';
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Sending request to transcribe...');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log('Transcription successful:', data);
        setResult(data.text);
      } else {
        console.error('Transcription failed:', data);
        setError(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Request failed:', error);
      setError('An error occurred while processing the file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full max-w-4xl">
        <div className="w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-8 gap-4">
            <Image
              className="dark:invert"
              src="/next.svg"
              alt="Next.js logo"
              width={100}
              height={20}
              priority
            />
            <h1 className="text-3xl font-bold text-gray-800">
              Audio Transcription
            </h1>
          </div>

          <div className="space-y-6">
            {/* Upload Section */}
            <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  setFile(selectedFile || null);
                  console.log('Selected file:', selectedFile?.name);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Choose Audio File
              </label>
              
              {file && (
                <div className="mt-4 text-sm text-gray-600">
                  Selected: {file.name}
                </div>
              )}

              <button 
                onClick={handleUpload}
                disabled={isLoading || !file}
                className={`mt-4 px-6 py-2 rounded-lg text-white transition-colors ${
                  isLoading || !file 
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isLoading ? 'Transcribing...' : 'Start Transcription'}
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="animate-pulse text-blue-600">
                  Processing your audio file...
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">
                  Transcription Result
                </h3>
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <p className="whitespace-pre-wrap text-gray-700">
                    {result}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-600">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Documentation
        </a>
      </footer>
    </div>
  );
}
