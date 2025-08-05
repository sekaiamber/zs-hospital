# ZS Hospital Data Analysis Project

This is a hospital data analysis project built with TypeScript and Prisma.

## Project Structure

```
zs-hospital/
├── data/           # Raw data files
│   └── articles.csv # Source CSV data file
├── output/         # Output directory
│   └── source.csv  # Source CSV data file
├── prisma/         # Prisma database configuration
│   └── schema.prisma # Database model definitions
├── src/            # Source code
│   └── test.ts     # Test program
├── package.json    # Project configuration
├── tsconfig.json   # TypeScript configuration
├── eslint.config.mjs # ESLint configuration
└── .env           # Environment variables
```

## Install Dependencies

```bash
yarn install
```

## Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Create database and run migrations
npx prisma db push
```

## Run Project

```bash
# Run tests
yarn test

```

## Code Quality

```bash
# Run ESLint checks
yarn lint

# Auto-fix ESLint issues
yarn lint:fix

# Format code
yarn format
```

## Requirements

- Node.js 18+
- Yarn package manager
- MySQL database (managed through Prisma) 