# AI Server

A serverless AI chat API built for Vercel.

## Features

- OpenAI GPT-4o-mini integration
- Serverless functions with Vercel
- Simple REST API endpoint

## Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your OpenAI API key
4. Deploy to Vercel

## Usage

Send a POST request to `/api/chat` with:

```json
{
  "message": "Your message here"
}
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

## Deployment

Deploy to Vercel by connecting your GitHub repository or using the Vercel CLI.