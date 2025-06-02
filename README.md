# AI-Volt

A sophisticated AI agent built with VoltAgent framework, powered by Google AI (Gemini) through the Vercel AI SDK.

## Features

- **Mathematical Calculations**: Advanced calculator with support for basic arithmetic, power operations, square root, and factorial
- **Date/Time Operations**: Comprehensive date formatting, time calculations, timezone conversions, and time differences
- **System Information**: Real-time system monitoring including memory, CPU, network, and process information
- **Modular Architecture**: Clean, maintainable codebase with proper separation of concerns
- **Robust Error Handling**: Comprehensive error handling and logging throughout the application
- **TypeScript**: Full type safety with Zod schema validation

## Prerequisites

- Node.js 18+ 
- pnpm (recommended package manager)
- Google AI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AI-Volt
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Google AI API key:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## Usage

### Development
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm start
```

## Architecture

### Project Structure
```
src/
├── agents/           # Agent definitions and configurations
├── tools/            # Individual tool implementations
├── config/           # Environment and logging configuration
└── index.ts          # Main application entry point
```

### Available Tools

#### Calculator Tool
- Basic arithmetic (add, subtract, multiply, divide)
- Advanced operations (power, square root, factorial)
- Input validation and error handling

#### DateTime Tool
- Current date/time retrieval
- Date formatting in multiple formats
- Time addition/subtraction
- Time difference calculations
- Timezone conversions

#### System Info Tool
- Memory usage monitoring
- CPU information
- Network interface details
- Process information
- Environment settings

## Configuration

The application uses environment variables for configuration:

- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google AI API key (required)
- `NODE_ENV`: Environment mode (`development`, `production`, `test`)
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)

## API Reference

The AI-Volt agent exposes the following tools through natural language interactions:

### Calculator
Ask for mathematical calculations:
- "Calculate 15 + 27"
- "What's the square root of 144?"
- "Find 5 factorial"

### Date/Time
Request date and time operations:
- "What's the current date and time?"
- "Format 2024-12-03 as MM/DD/YYYY"
- "Add 3 days to today's date"
- "What's the time difference between now and tomorrow?"

### System Information
Query system details:
- "Show me memory usage"
- "What are the CPU specifications?"
- "Display all system information"

## Development

### Adding New Tools

1. Create a new tool file in `src/tools/`:
```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

export const myTool = createTool({
  name: "my_tool",
  description: "Description of what the tool does",
  parameters: z.object({
    // Define parameters with Zod schema
  }),
  execute: async (params) => {
    // Tool implementation
  },
});
```

2. Export the tool in `src/tools/index.ts`
3. Add to the `allTools` array

### Code Quality

- All functions include comprehensive TSDoc documentation
- Input validation using Zod schemas
- Robust error handling with structured logging
- TypeScript strict mode enabled
- Modular architecture for maintainability

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper tests and documentation
4. Submit a pull request

An [VoltAgent](https://github.com/vercel/voltagent) application.

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm, yarn, or pnpm

### Installation

1. Clone this repository
2. Install dependencies

```bash
npm install
# or
yarn
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Features

This project uses VoltAgent, a framework for building AI agents with the following capabilities:

- **Core** - The foundation for building and running AI agents
- **Vercel AI Provider** - Integration with Vercel AI SDK for LLM access
- **Custom Tools** - Add your own capabilities for your agents

## Project Structure

```
.
├── src/
│   └── index.ts       # Main application entry point with agent definition
├── .voltagent/        # Auto-generated folder for agent memory
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT 