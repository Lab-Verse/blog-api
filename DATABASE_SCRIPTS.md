# Database Management Scripts

## Clear Database

Clear all tables in the database:

```bash
cd blog-api
npm run db:clear
```

This will:
- Connect to the database
- Truncate all tables with CASCADE
- Preserve table structure
- Clear all data

## Reseed Database

After clearing, reseed with fresh data:

```bash
npm run seed
```

## Complete Reset

Clear and reseed in one go:

```bash
npm run db:clear && npm run seed
```

## Available Scripts

- `npm run db:clear` - Clear all database tables
- `npm run seed` - Run basic seed
- `npm run seed:comprehensive` - Run comprehensive seed
- `npm run seed:all` - Run all seeds
